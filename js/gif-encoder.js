/**
 * Lightweight in-browser GIF encoder
 * Uses NeuQuant color quantization and LZW compression
 */
(function(global) {
  function NeuQuant(pixels, samplefac) {
    var network = [];
    var netindex = new Int32Array(256);
    var bias = new Int32Array(256);
    var freq = new Int32Array(256);
    var radpower = new Int32Array(32);
    
    var netbiasshift = 4;
    var intbiasshift = 16;
    var intbias = (1 << intbiasshift);
    var gammashift = 10;
    var betashift = 10;
    var beta = (intbias >> betashift);
    var betagamma = (intbias << (gammashift - betashift));
    var initrad = (256 >> 3);
    var radiusbiasshift = 6;
    var radiusbias = (1 << radiusbiasshift);
    var initradius = (initrad * radiusbias);
    var radiusdec = 30;
    var alphabiasshift = 10;
    var initalpha = (1 << alphabiasshift);
    var alphadec;
    var lengthcount = pixels.length;
    var samplepixels = samplefac;

    for (var i = 0; i < 256; i++) {
      network[i] = new Float64Array(4);
      var p = network[i];
      p[0] = p[1] = p[2] = (i << (netbiasshift + 8)) / 256;
      freq[i] = intbias / 256;
      bias[i] = 0;
    }

    function init() {
      alphadec = 30 + ((samplepixels - 1) / 3);
      var pix = pixels;
      var lim = lengthcount;
      var samplefac_step = 4 * samplepixels;
      var step = samplefac_step;
      var rad = initradius >> radiusbiasshift;
      if (rad <= 1) rad = 0;
      for (var i = 0; i < rad; i++) radpower[i] = Math.floor(initalpha * (((rad * rad - i * i) * 256) / (rad * rad)));
      var alpha = initalpha;
      var cursor = 0;
      var delta = Math.floor(lengthcount / (samplefac * 4 * 100)) || 1;
      
      for (var k = 0; k < 100; k++) {
        for (var j = 0; j < delta; j++) {
          if (cursor >= lim) cursor = 0;
          var b = pix[cursor] << netbiasshift;
          var g = pix[cursor + 1] << netbiasshift;
          var r = pix[cursor + 2] << netbiasshift;
          
          var bestd = 1000000000;
          var best = -1;
          var bestbiasd = bestd;
          var bestbiaspos = -1;
          
          for (var i = 0; i < 256; i++) {
            var np = network[i];
            var dist = Math.abs(np[0] - b) + Math.abs(np[1] - g) + Math.abs(np[2] - r);
            if (dist < bestd) { bestd = dist; best = i; }
            var biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
            if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = i; }
            var betafreq = freq[i] >> betashift;
            freq[i] -= betafreq;
            bias[i] += (betafreq << gammashift);
          }
          freq[best] += beta;
          bias[best] -= betagamma;
          
          var a = alpha >> alphabiasshift;
          var qp = network[bestbiaspos];
          qp[0] -= Math.floor((a * (qp[0] - b)) / initalpha);
          qp[1] -= Math.floor((a * (qp[1] - g)) / initalpha);
          qp[2] -= Math.floor((a * (qp[2] - r)) / initalpha);
          cursor += step;
        }
        alpha -= Math.floor(alpha / alphadec);
        rad = rad - Math.floor(rad / radiusdec);
        if (rad <= 1) rad = 0;
        for (var i = 0; i < rad; i++) radpower[i] = Math.floor(alpha * (((rad * rad - i * i) * 256) / (rad * rad)));
      }
      
      var previouscol = 0;
      var startpos = 0;
      for (var i = 0; i < 256; i++) {
        var p = network[i];
        var smallpos = i;
        var smallval = p[1];
        for (var j = i + 1; j < 256; j++) {
          var q = network[j];
          if (q[1] < smallval) { smallpos = j; smallval = q[1]; }
        }
        var q = network[smallpos];
        if (i != smallpos) {
          var x = p[0]; p[0] = q[0]; q[0] = x;
          x = p[1]; p[1] = q[1]; q[1] = x;
          x = p[2]; p[2] = q[2]; q[2] = x;
          x = p[3]; p[3] = q[3]; q[3] = x;
        }
        if (smallval != previouscol) {
          netindex[previouscol] = (startpos + i) >> 1;
          for (var j = previouscol + 1; j < smallval; j++) netindex[j] = i;
          previouscol = smallval;
          startpos = i;
        }
      }
      netindex[previouscol] = (startpos + 255) >> 1;
      for (var j = previouscol + 1; j < 256; j++) netindex[j] = 255;
    }

    function map(b, g, r) {
      var bestd = 1000;
      var best = -1;
      var i = netindex[g];
      var j = i - 1;
      while ((i < 256) || (j >= 0)) {
        if (i < 256) {
          var p = network[i];
          var dist = p[1] - g;
          if (dist >= bestd) i = 256;
          else {
            i++;
            if (dist < 0) dist = -dist;
            var a = p[0] - b; if (a < 0) a = -a; dist += a;
            if (dist < bestd) {
              a = p[2] - r; if (a < 0) a = -a; dist += a;
              if (dist < bestd) { bestd = dist; best = p[3]; }
            }
          }
        }
        if (j >= 0) {
          var p = network[j];
          var dist = g - p[1];
          if (dist >= bestd) j = -1;
          else {
            j--;
            if (dist < 0) dist = -dist;
            var a = p[0] - b; if (a < 0) a = -a; dist += a;
            if (dist < bestd) {
              a = p[2] - r; if (a < 0) a = -a; dist += a;
              if (dist < bestd) { bestd = dist; best = p[3]; }
            }
          }
        }
      }
      return best;
    }

    function process() {
      init();
      for (var i = 0; i < 256; i++) network[i][3] = i;
      var mapArray = new Uint8Array(256 * 3);
      var k = 0;
      for (var i = 0; i < 256; i++) {
        mapArray[k++] = Math.round(network[i][0] >> netbiasshift);
        mapArray[k++] = Math.round(network[i][1] >> netbiasshift);
        mapArray[k++] = Math.round(network[i][2] >> netbiasshift);
      }
      return mapArray;
    }

    return { process: process, map: map };
  }

  function LZWEncoder(width, height, pixels, colorDepth) {
    var initCodeSize = Math.max(2, colorDepth);
    var accum = new Uint8Array(256);
    var htab = new Int32Array(5003);
    var codetab = new Int32Array(5003);
    var cur_accum = 0;
    var cur_bits = 0;
    var masks = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF];

    function writeOutput(out) {
      var n_bits = initCodeSize + 1;
      var maxcode = (1 << n_bits);
      var clear_flg = false;
      var g_init_bits = n_bits;
      var ClearCode = 1 << initCodeSize;
      var EOFCode = ClearCode + 1;
      var free_ent = ClearCode + 2;
      var a_count = 0;

      function char_out(c) {
        accum[a_count++] = c;
        if (a_count >= 254) flush_char();
      }

      function flush_char() {
        if (a_count > 0) {
          out.push(a_count);
          for (var i = 0; i < a_count; i++) out.push(accum[i]);
          a_count = 0;
        }
      }

      function output(code) {
        cur_accum &= masks[cur_bits];
        if (cur_bits > 0) cur_accum |= (code << cur_bits);
        else cur_accum = code;
        cur_bits += n_bits;
        while (cur_bits >= 8) {
          char_out(cur_accum & 0xff);
          cur_accum >>= 8;
          cur_bits -= 8;
        }
        if (free_ent > maxcode || clear_flg) {
          if (clear_flg) {
            maxcode = (1 << (n_bits = g_init_bits));
            clear_flg = false;
          } else {
            ++n_bits;
            if (n_bits == 12) maxcode = 1 << 12;
            else maxcode = (1 << n_bits);
          }
        }
        if (code == EOFCode) {
          while (cur_bits > 0) {
            char_out(cur_accum & 0xff);
            cur_accum >>= 8;
            cur_bits -= 8;
          }
          flush_char();
        }
      }

      out.push(initCodeSize);
      for (var i = 0; i < 5003; ++i) htab[i] = -1;
      output(ClearCode);

      var cur_pixel = 0;
      var ent = pixels[cur_pixel++];
      var remaining = pixels.length - 1;

      while (remaining > 0) {
        var c = pixels[cur_pixel++];
        remaining--;
        var fcode = (c << 12) + ent;
        var i = (c << 4) ^ ent;
        if (htab[i] === fcode) {
          ent = codetab[i];
          continue;
        } else if (htab[i] >= 0) {
          var disp = 5003 - i;
          if (i === 0) disp = 1;
          do {
            if ((i -= disp) < 0) i += 5003;
            if (htab[i] === fcode) {
              ent = codetab[i];
              break;
            }
          } while (htab[i] >= 0);
          if (htab[i] === fcode) continue;
        }
        output(ent);
        ent = c;
        if (free_ent < (1 << 12)) {
          codetab[i] = free_ent++;
          htab[i] = fcode;
        } else {
          for (var clr = 0; clr < 5003; ++clr) htab[clr] = -1;
          free_ent = ClearCode + 2;
          clear_flg = true;
          output(ClearCode);
        }
      }
      output(ent);
      output(EOFCode);
      out.push(0);
    }

    return { encode: writeOutput };
  }

  function GifEncoder(width, height) {
    var out = [];
    var delay = 100; // ms
    var repeat = 0;
    var started = false;

    function writeByte(val) { out.push(val & 0xFF); }
    function writeShort(val) { writeByte(val); writeByte(val >> 8); }
    function writeString(str) { for (var i = 0; i < str.length; i++) writeByte(str.charCodeAt(i)); }

    function start() {
      writeString("GIF89a");
      writeShort(width);
      writeShort(height);
      writeByte(0xF7); // color table flag + 256 colors
      writeByte(0);
      writeByte(0);
      started = true;
    }

    function addFrame(imageData, frameDelay) {
      if (!started) start();
      var data = imageData.data;
      var nq = NeuQuant(data, 10);
      var palette = nq.process();

      if (out.length === 13) {
        for (var i = 0; i < palette.length; i++) writeByte(palette[i]);
        if (repeat >= 0) {
          writeByte(0x21); writeByte(0xFF); writeByte(11);
          writeString("NETSCAPE2.0");
          writeByte(3); writeByte(1); writeShort(repeat); writeByte(0);
        }
      }

      var indexedPixels = new Uint8Array(width * height);
      var k = 0;
      for (var i = 0; i < data.length; i += 4) {
        indexedPixels[k++] = nq.map(data[i], data[i + 1], data[i + 2]);
      }

      writeByte(0x21); writeByte(0xF9); writeByte(4);
      writeByte(0);
      writeShort(Math.round((frameDelay || delay) / 10));
      writeByte(0);
      writeByte(0);

      writeByte(0x2C);
      writeShort(0); writeShort(0);
      writeShort(width); writeShort(height);
      writeByte(0x87);
      for (var i = 0; i < palette.length; i++) writeByte(palette[i]);

      var encoder = LZWEncoder(width, height, indexedPixels, 8);
      encoder.encode(out);
    }

    function finish() {
      writeByte(0x3B);
      return new Uint8Array(out);
    }

    return {
      start: start,
      addFrame: addFrame,
      finish: finish,
      setDelay: function(d) { delay = d; },
      setRepeat: function(r) { repeat = r; }
    };
  }

  global.GifEncoder = GifEncoder;
})(window);
