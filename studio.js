/* 1. GIF ENCODER */
  (function(global) {
    function NeuQuant(pixels, samplefac) {
      var network = [], netindex = new Int32Array(256), bias = new Int32Array(256), freq = new Int32Array(256), radpower = new Int32Array(32);
      var netbiasshift = 4, intbiasshift = 16, intbias = (1 << intbiasshift), gammashift = 10, betashift = 10, beta = (intbias >> betashift), betagamma = (intbias << (gammashift - betashift));
      var initrad = (256 >> 3), radiusbiasshift = 6, radiusbias = (1 << radiusbiasshift), initradius = (initrad * radiusbias), radiusdec = 30, alphabiasshift = 10, initalpha = (1 << alphabiasshift), alphadec;
      var lengthcount = pixels.length, samplepixels = samplefac;

      for (var i = 0; i < 256; i++) {
        network[i] = new Float64Array(4);
        network[i][0] = network[i][1] = network[i][2] = (i << (netbiasshift + 8)) / 256;
        freq[i] = intbias / 256;
        bias[i] = 0;
      }

      function init() {
        alphadec = 30 + ((samplepixels - 1) / 3);
        var pix = pixels, lim = lengthcount, samplefac_step = 4 * samplepixels, step = samplefac_step;
        var rad = initradius >> radiusbiasshift;
        if (rad <= 1) rad = 0;
        for (var i = 0; i < rad; i++) radpower[i] = Math.floor(initalpha * (((rad * rad - i * i) * 256) / (rad * rad)));
        var alpha = initalpha, cursor = 0, delta = Math.floor(lengthcount / (samplefac * 4 * 100)) || 1;
        
        for (var k = 0; k < 100; k++) {
          for (var j = 0; j < delta; j++) {
            if (cursor >= lim) cursor = 0;
            var b = pix[cursor] << netbiasshift, g = pix[cursor + 1] << netbiasshift, r = pix[cursor + 2] << netbiasshift;
            var bestd = 1000000000, best = -1, bestbiasd = bestd, bestbiaspos = -1;
            for (var i = 0; i < 256; i++) {
              var np = network[i], dist = Math.abs(np[0] - b) + Math.abs(np[1] - g) + Math.abs(np[2] - r);
              if (dist < bestd) { bestd = dist; best = i; }
              var biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
              if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = i; }
              var betafreq = freq[i] >> betashift;
              freq[i] -= betafreq;
              bias[i] += (betafreq << gammashift);
            }
            freq[best] += beta; bias[best] -= betagamma;
            var a = alpha >> alphabiasshift, qp = network[bestbiaspos];
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
        
        var previouscol = 0, startpos = 0;
        for (var i = 0; i < 256; i++) {
          var p = network[i], smallpos = i, smallval = p[1];
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
            previouscol = smallval; startpos = i;
          }
        }
        netindex[previouscol] = (startpos + 255) >> 1;
        for (var j = previouscol + 1; j < 256; j++) netindex[j] = 255;
      }

      function map(b, g, r) {
        var bestd = 1000, best = -1, i = netindex[g], j = i - 1;
        while ((i < 256) || (j >= 0)) {
          if (i < 256) {
            var p = network[i], dist = p[1] - g;
            if (dist >= bestd) i = 256;
            else {
              i++; if (dist < 0) dist = -dist;
              var a = p[0] - b; if (a < 0) a = -a; dist += a;
              if (dist < bestd) { a = p[2] - r; if (a < 0) a = -a; dist += a; if (dist < bestd) { bestd = dist; best = p[3]; } }
            }
          }
          if (j >= 0) {
            var p = network[j], dist = g - p[1];
            if (dist >= bestd) j = -1;
            else {
              j--; if (dist < 0) dist = -dist;
              var a = p[0] - b; if (a < 0) a = -a; dist += a;
              if (dist < bestd) { a = p[2] - r; if (a < 0) a = -a; dist += a; if (dist < bestd) { bestd = dist; best = p[3]; } }
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
      var initCodeSize = Math.max(2, colorDepth), accum = new Uint8Array(256), htab = new Int32Array(5003), codetab = new Int32Array(5003);
      var cur_accum = 0, cur_bits = 0, masks = [0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];

      function writeOutput(out) {
        var n_bits = initCodeSize + 1, maxcode = (1 << n_bits), clear_flg = false, g_init_bits = n_bits;
        var ClearCode = 1 << initCodeSize, EOFCode = ClearCode + 1, free_ent = ClearCode + 2, a_count = 0;

        function char_out(c) { accum[a_count++] = c; if (a_count >= 254) flush_char(); }
        function flush_char() { if (a_count > 0) { out.push(a_count); for (var i = 0; i < a_count; i++) out.push(accum[i]); a_count = 0; } }

        function output(code) {
          cur_accum &= masks[cur_bits];
          if (cur_bits > 0) cur_accum |= (code << cur_bits); else cur_accum = code;
          cur_bits += n_bits;
          while (cur_bits >= 8) { char_out(cur_accum & 0xff); cur_accum >>= 8; cur_bits -= 8; }
          if (free_ent > maxcode || clear_flg) {
            if (clear_flg) { maxcode = (1 << (n_bits = g_init_bits)); clear_flg = false; }
            else { ++n_bits; if (n_bits == 12) maxcode = 1 << 12; else maxcode = (1 << n_bits); }
          }
          if (code == EOFCode) {
            while (cur_bits > 0) { char_out(cur_accum & 0xff); cur_accum >>= 8; cur_bits -= 8; }
            flush_char();
          }
        }

        out.push(initCodeSize);
        for (var i = 0; i < 5003; ++i) htab[i] = -1;
        output(ClearCode);

        var cur_pixel = 0, ent = pixels[cur_pixel++], remaining = pixels.length - 1;
        while (remaining > 0) {
          var c = pixels[cur_pixel++]; remaining--;
          var fcode = (c << 12) + ent, i = (c << 4) ^ ent;
          if (htab[i] === fcode) { ent = codetab[i]; continue; }
          else if (htab[i] >= 0) {
            var disp = 5003 - i; if (i === 0) disp = 1;
            do { if ((i -= disp) < 0) i += 5003; if (htab[i] === fcode) { ent = codetab[i]; break; } } while (htab[i] >= 0);
            if (htab[i] === fcode) continue;
          }
          output(ent); ent = c;
          if (free_ent < (1 << 12)) { codetab[i] = free_ent++; htab[i] = fcode; }
          else { for (var clr = 0; clr < 5003; ++clr) htab[clr] = -1; free_ent = ClearCode + 2; clear_flg = true; output(ClearCode); }
        }
        output(ent); output(EOFCode); out.push(0);
      }
      return { encode: writeOutput };
    }

    function GifEncoder(width, height) {
      var out = [], delay = 100, repeat = 0, started = false;
      function writeByte(val) { out.push(val & 0xFF); }
      function writeShort(val) { writeByte(val); writeByte(val >> 8); }
      function writeString(str) { for (var i = 0; i < str.length; i++) writeByte(str.charCodeAt(i)); }

      function start() {
        writeString("GIF89a"); writeShort(width); writeShort(height);
        writeByte(0xF7); writeByte(0); writeByte(0); started = true;
      }

      function addFrame(imageData, frameDelay) {
        if (!started) start();
        var data = imageData.data, nq = NeuQuant(data, 10), palette = nq.process();
        if (out.length === 13) {
          for (var i = 0; i < palette.length; i++) writeByte(palette[i]);
          if (repeat >= 0) { writeByte(0x21); writeByte(0xFF); writeByte(11); writeString("NETSCAPE2.0"); writeByte(3); writeByte(1); writeShort(repeat); writeByte(0); }
        }
        var indexedPixels = new Uint8Array(width * height);
        var k = 0;
        for (var i = 0; i < data.length; i += 4) { indexedPixels[k++] = nq.map(data[i], data[i + 1], data[i + 2]); }
        writeByte(0x21); writeByte(0xF9); writeByte(4); writeByte(0); writeShort(Math.round((frameDelay || delay) / 10)); writeByte(0); writeByte(0);
        writeByte(0x2C); writeShort(0); writeShort(0); writeShort(width); writeShort(height); writeByte(0x87);
        for (var i = 0; i < palette.length; i++) writeByte(palette[i]);
        var encoder = LZWEncoder(width, height, indexedPixels, 8); encoder.encode(out);
      }

      function finish() { writeByte(0x3B); return new Uint8Array(out); }
      return { start: start, addFrame: addFrame, finish: finish, setDelay: function(d) { delay = d; }, setRepeat: function(r) { repeat = r; } };
    }
    global.GifEncoder = GifEncoder;
  })(window);

  /* 2. STUDIO AUDIO PROCESSOR — Real-Time Spectral Vocal Isolation */
  class StudioAudioProcessor {
    constructor() {
      this.audioCtx = null;
      this.cleanDestination = null;
      this.analyzer = null;
      this.workletNode = null;
      this.micGainNode = null;
      this.micSource = null;
      this.sysSource = null;
      this.masterGain = null;
      this.isGatingActive = false;
      this.settings = {
        noiseCleanerEnabled: true,
        gateThreshold: -50,
        clarityBoost: 3.5,
        micVolume: 1.0,
        systemVolume: 1.0
      };
      this._levelCache = { level: 0, isGated: false };
    }

    async init(micStream, sysStream = null) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 48000 });
      }
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      this.cleanDestination = this.audioCtx.createMediaStreamDestination();
      const ctx = this.audioCtx;

      // ── Spectral Vocal Isolation WorkletProcessor (inline blob) ──────────────
      // Uses FFT-based Wiener filtering: estimates noise floor during silence,
      // then subtracts it from each FFT bin, retaining only vocal energy (85–3500 Hz).
      const workletCode = `
class VocalIsolationProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._fftSize = 2048;
    this._hopSize = 512;
    this._inputBuf = new Float32Array(this._fftSize);
    this._inputPos = 0;
    this._noiseFloor = new Float32Array(this._fftSize / 2 + 1).fill(1e-6);
    this._noiseAlpha = 0.98;       // how fast noise floor adapts (higher = slower)
    this._vocalLo = 85;            // Hz — low vocal boundary
    this._vocalHi = 3500;          // Hz — high vocal boundary  
    this._enabled = true;
    this._threshold = -50;         // dB gate threshold
    this.port.onmessage = (e) => {
      if (e.data.enabled !== undefined) this._enabled = e.data.enabled;
      if (e.data.threshold !== undefined) this._threshold = e.data.threshold;
    };
  }

  // Hann window
  _hann(n, N) { return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))); }

  // Real FFT (Cooley-Tukey, radix-2, in-place) on Float32Array of length N (power of 2)
  _fft(re, im) {
    const N = re.length;
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wRe = Math.cos(ang), wIm = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let curRe = 1, curIm = 0;
        for (let j = 0; j < len / 2; j++) {
          const uRe = re[i+j], uIm = im[i+j];
          const vRe = re[i+j+len/2]*curRe - im[i+j+len/2]*curIm;
          const vIm = re[i+j+len/2]*curIm + im[i+j+len/2]*curRe;
          re[i+j] = uRe+vRe; im[i+j] = uIm+vIm;
          re[i+j+len/2] = uRe-vRe; im[i+j+len/2] = uIm-vIm;
          const tmp = curRe*wRe - curIm*wIm;
          curIm = curRe*wIm + curIm*wRe; curRe = tmp;
        }
      }
    }
  }

  // IFFT: conjugate → FFT → conjugate → divide by N
  _ifft(re, im) {
    const N = re.length;
    for (let i = 0; i < N; i++) im[i] = -im[i];
    this._fft(re, im);
    for (let i = 0; i < N; i++) { re[i] /= N; im[i] = -im[i]/N; }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) return true;
    const inCh = input[0];
    const outCh = output[0];

    if (!this._enabled) {
      outCh.set(inCh);
      return true;
    }

    const N = this._fftSize;
    const sr = sampleRate;
    const bins = N / 2 + 1;
    const hzPerBin = sr / N;
    const loIdx = Math.max(1, Math.floor(this._vocalLo / hzPerBin));
    const hiIdx = Math.min(bins - 1, Math.ceil(this._vocalHi / hzPerBin));

    // Accumulate input samples
    for (let i = 0; i < inCh.length; i++) {
      this._inputBuf[this._inputPos++] = inCh[i];
      if (this._inputPos >= N) this._inputPos = 0;
    }

    // Build windowed frame
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const idx = (this._inputPos + i) % N;
      re[i] = this._inputBuf[idx] * this._hann(i, N);
    }

    // Forward FFT
    this._fft(re, im);

    // Compute magnitude spectrum
    const mag = new Float32Array(bins);
    let energy = 0;
    for (let k = 0; k < bins; k++) {
      mag[k] = Math.sqrt(re[k]*re[k] + im[k]*im[k]);
      energy += mag[k];
    }

    // Check signal level (dB RMS) to detect speech vs silence
    let rms = 0;
    for (let i = 0; i < inCh.length; i++) rms += inCh[i]*inCh[i];
    rms = Math.sqrt(rms / inCh.length);
    const db = rms > 1e-5 ? 20 * Math.log10(rms) : -100;
    const isSpeech = db > this._threshold;

    // Update noise floor estimate during silence (Wiener-style)
    if (!isSpeech) {
      for (let k = 0; k < bins; k++) {
        this._noiseFloor[k] = this._noiseAlpha * this._noiseFloor[k]
                            + (1 - this._noiseAlpha) * mag[k];
      }
      // If below gate, output silence
      for (let i = 0; i < outCh.length; i++) outCh[i] = 0;
      this.port.postMessage({ gated: true, level: rms });
      return true;
    }

    // Spectral subtraction + vocal band masking
    for (let k = 0; k < bins; k++) {
      // Subtract noise estimate (over-subtraction factor 1.5 for cleaner result)
      let cleanMag = mag[k] - 1.5 * this._noiseFloor[k];
      if (cleanMag < 0) cleanMag = 0;

      // Hard mask: zero out everything outside vocal band
      if (k < loIdx || k > hiIdx) cleanMag = 0;

      // Apply gain ratio to complex spectrum
      const gain = mag[k] > 1e-8 ? cleanMag / mag[k] : 0;
      re[k] *= gain;
      im[k] *= gain;

      // Mirror for conjugate symmetry (IFFT requirement)
      if (k > 0 && k < N/2) {
        re[N - k] = re[k];
        im[N - k] = -im[k];
      }
    }

    // Inverse FFT → back to time domain
    this._ifft(re, im);

    // Write output (just take real part; use overlap-add scaled by hop ratio)
    const scale = this._hopSize / N * 2;
    for (let i = 0; i < outCh.length; i++) {
      outCh[i] = Math.max(-1, Math.min(1, re[i % N] * scale * 3.0));
    }

    this.port.postMessage({ gated: false, level: rms });
    return true;
  }
}
registerProcessor('vocal-isolation-processor', VocalIsolationProcessor);
`;

      // Register the worklet from a blob URL
      const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(workletBlob);

      try {
        await ctx.audioWorklet.addModule(workletUrl);
        this.workletNode = new AudioWorkletNode(ctx, 'vocal-isolation-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1]
        });
        this.workletNode.port.onmessage = (e) => {
          this.isGatingActive = e.data.gated;
          this._levelCache = { level: Math.min(1, e.data.level * 8), isGated: e.data.gated };
        };
        // Send initial settings
        this.workletNode.port.postMessage({
          enabled: this.settings.noiseCleanerEnabled,
          threshold: this.settings.gateThreshold
        });
      } catch (err) {
        console.warn('AudioWorklet failed, falling back to biquad chain:', err);
        this.workletNode = null;
      }

      // ── Compressor + Master Gain + Analyser (always present) ─────────────────
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 1.2;

      this.analyzer = ctx.createAnalyser();
      this.analyzer.fftSize = 512;
      this.analyzer.smoothingTimeConstant = 0.75;

      this.cleanDestination = ctx.createMediaStreamDestination();

      // ── Connect mic through worklet → compressor → master → output ───────────
      if (micStream && micStream.getAudioTracks().length > 0) {
        this.micSource = ctx.createMediaStreamSource(micStream);
        this.micGainNode = ctx.createGain();
        this.micGainNode.gain.value = this.settings.micVolume;
        this.micSource.connect(this.micGainNode);

        if (this.workletNode) {
          this.micGainNode.connect(this.workletNode);
          this.workletNode.connect(compressor);
        } else {
          // Fallback: biquad vocal band-pass
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
          const eq = ctx.createBiquadFilter(); eq.type = 'peaking'; eq.frequency.value = 2800; eq.gain.value = 4;
          const gate = ctx.createGain(); gate.gain.value = 1.0;
          this.micGainNode.connect(hp); hp.connect(lp); lp.connect(eq); eq.connect(gate); gate.connect(compressor);
          this._fallbackGate = gate;
          this._startFallbackGate(ctx);
        }

        compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyzer);
        this.masterGain.connect(this.cleanDestination);
      }

      // ── System audio is intentionally excluded from clean vocal stream ────────
      // (background music / app sounds go through unprocessed only if user wants it)
      // System audio is NOT routed to cleanDestination — only pure mic vocals are.

      return this.cleanDestination.stream;
    }

    _startFallbackGate(ctx) {
      if (!this._fallbackGate || !this.analyzer) return;
      const buf = new Float32Array(512);
      const tick = () => {
        if (!ctx || ctx.state === 'closed') return;
        this.analyzer.getFloatTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const db = Math.sqrt(sum / buf.length) > 1e-5 ? 20 * Math.log10(Math.sqrt(sum / buf.length)) : -100;
        const t = ctx.currentTime;
        if (db > this.settings.gateThreshold) {
          this._fallbackGate.gain.setTargetAtTime(1.0, t, 0.02);
          this.isGatingActive = false;
        } else {
          this._fallbackGate.gain.setTargetAtTime(0.0, t, 0.1);
          this.isGatingActive = true;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    setNoiseCleaner(enabled) {
      this.settings.noiseCleanerEnabled = enabled;
      if (this.workletNode) {
        this.workletNode.port.postMessage({ enabled });
      }
    }

    setGateThreshold(dbValue) {
      this.settings.gateThreshold = parseFloat(dbValue);
      if (this.workletNode) {
        this.workletNode.port.postMessage({ threshold: parseFloat(dbValue) });
      }
    }

    setMicVolume(vol) {
      this.settings.micVolume = parseFloat(vol);
      if (this.micGainNode && this.audioCtx) {
        this.micGainNode.gain.setValueAtTime(this.settings.micVolume, this.audioCtx.currentTime);
      }
    }

    getAudioLevels() {
      if (!this.analyzer) return { level: 0, isGated: false };
      if (this.workletNode) return this._levelCache;
      const data = new Uint8Array(this.analyzer.frequencyBinCount);
      this.analyzer.getByteFrequencyData(data);
      let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i];
      return { level: (sum / data.length) / 255, isGated: this.isGatingActive };
    }
  }


  /* 3. VOCAL SEPARATOR */
  class VocalSeparator {
    async processAudio(audioData, options = {}) {
      const vocalStrength = options.vocalStrength !== undefined ? options.vocalStrength : 0.85;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const offlineCtx = new AudioContextClass();
      let arrayBuffer = audioData instanceof Blob ? await audioData.arrayBuffer() : audioData;
      const originalBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
      const numChannels = originalBuffer.numberOfChannels, sampleRate = originalBuffer.sampleRate, length = originalBuffer.length;
      const vocalBuffer = offlineCtx.createBuffer(numChannels, length, sampleRate);
      const bgBuffer = offlineCtx.createBuffer(numChannels, length, sampleRate);

      for (let c = 0; c < numChannels; c++) {
        const src = originalBuffer.getChannelData(c), vOut = vocalBuffer.getChannelData(c), bOut = bgBuffer.getChannelData(c);
        const dt = 1.0 / sampleRate, alphaLow = dt / (1.0 / (2 * Math.PI * 120) + dt), alphaHigh = dt / (1.0 / (2 * Math.PI * 3800) + dt);
        let lowPassState = 0, highCutState = 0, currentEnergy = 0;
        for (let i = 0; i < length; i++) {
          const s = src[i];
          lowPassState += alphaLow * (s - lowPassState);
          highCutState += alphaHigh * ((s - lowPassState) - highCutState);
          const speechBandSample = highCutState;
          currentEnergy = (0.995 * currentEnergy) + (0.005 * Math.abs(speechBandSample));
          const isVocal = currentEnergy > 0.008;
          const vocalWeight = isVocal ? Math.min(1.0, (currentEnergy / 0.03) * vocalStrength) : 0.05;
          const vocalSample = (speechBandSample * 1.15) * vocalWeight;
          vOut[i] = Math.max(-1, Math.min(1, vocalSample));
          bOut[i] = Math.max(-1, Math.min(1, s - (vocalSample * 0.95)));
        }
      }
      return { vocalBlob: this.audioBufferToWav(vocalBuffer), backgroundBlob: this.audioBufferToWav(bgBuffer) };
    }

    audioBufferToWav(buffer) {
      const numChannels = buffer.numberOfChannels, sampleRate = buffer.sampleRate, blockAlign = numChannels * 2;
      let length = buffer.length * blockAlign, wavBuffer = new ArrayBuffer(44 + length), view = new DataView(wavBuffer);
      function writeString(offset, string) { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); }
      writeString(0, 'RIFF'); view.setUint32(4, 36 + length, true); writeString(8, 'WAVE');
      writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, length, true);
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          let sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }
      return new Blob([wavBuffer], { type: 'audio/wav' });
    }
  }

  /* 4. STREAM CAPTURE */
  class StreamCapture {
    constructor() {
      this.screenStream = null; this.micStream = null; this.webcamStream = null;
      this.screenVideoElement = document.createElement('video'); this.screenVideoElement.muted = true; this.screenVideoElement.playsInline = true;
      this.webcamVideoElement = document.createElement('video'); this.webcamVideoElement.muted = true; this.webcamVideoElement.playsInline = true;
      this.onStreamEnded = null;
    }

    async startScreenCapture(fps = 60) {
      const displayMediaOptions = {
        video: {
          cursor: "always",
          frameRate: { ideal: fps, max: 60 },
          displaySurface: "monitor"
        },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "include",
        surfaceSwitching: "include"
      };

      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      } catch (e) {
        // Fallback for older browser engines that reject newer getDisplayMedia dictionary keys
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always", frameRate: { ideal: fps, max: 60 } },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      }

      this.screenVideoElement.srcObject = this.screenStream;
      await this.screenVideoElement.play();
      this.screenStream.getVideoTracks()[0].onended = () => { if (this.onStreamEnded) this.onStreamEnded(); };
      return this.screenStream;
    }

    async startMicCapture() {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
      return this.micStream;
    }

    async startWebcamCapture() {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
      this.webcamVideoElement.srcObject = this.webcamStream;
      await this.webcamVideoElement.play();
      return this.webcamStream;
    }

    stopWebcam() {
      if (this.webcamStream) { this.webcamStream.getTracks().forEach(t => t.stop()); this.webcamStream = null; }
      this.webcamVideoElement.srcObject = null;
    }
  }

  /* 5. CANVAS COMPOSITOR */
  class CanvasCompositor {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.aspectRatios = { '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 }, '1:1': { width: 1080, height: 1080 }, '4:3': { width: 1440, height: 1080 } };
      this.config = {
        aspectRatio: '16:9', padding: 60, borderRadius: 18, shadowBlur: 45, shadowOpacity: 0.4,
        backgroundStyle: 'gradient-sunset', bgColor: '#111827', showWindowFrame: true, windowTitle: 'Netfie Studio Demo',
        showWebcam: false, webcamShape: 'circle', webcamSize: 220, webcamX: 0.85, webcamY: 0.80, webcamMirrored: true, webcamBorder: true,
        highlightClicks: true, smoothZoom: 1.0, targetZoom: 1.0, zoomTargetX: 0.5, zoomTargetY: 0.5, currentPanX: 0.5, currentPanY: 0.5
      };
      this.ripples = []; this.isRunning = false; this.screenVideo = null; this.webcamVideo = null;
      this.bgWorker = null;
      this.updateResolution();
    }

    updateResolution() {
      const res = this.aspectRatios[this.config.aspectRatio] || this.aspectRatios['16:9'];
      this.canvas.width = res.width; this.canvas.height = res.height;
    }

    setScreenSource(videoEl) { this.screenVideo = videoEl; }
    setWebcamSource(videoEl) { this.webcamVideo = videoEl; }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;

      // 1. requestAnimationFrame loop for smooth 60fps when active
      const render = () => {
        if (!this.isRunning) return;
        if (!document.hidden) {
          this.drawFrame();
        }
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);

      // 2. Unthrottled Web Worker ticker for background tab recording (Chrome/Edge/Firefox freeze rAF when tab is hidden)
      try {
        const workerBlob = new Blob([
          `let timer = null;
           self.onmessage = function(e) {
             if (e.data === 'start') {
               if (!timer) timer = setInterval(function() { postMessage('tick'); }, 16);
             } else if (e.data === 'stop') {
               if (timer) { clearInterval(timer); timer = null; }
             }
           };`
        ], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        this.bgWorker = new Worker(workerUrl);
        this.bgWorker.onmessage = () => {
          if (!this.isRunning) return;
          // When the recorder tab is in the background or visiting other tabs, drive compositor frames via Worker
          if (document.hidden) {
            this.drawFrame();
          }
        };
        this.bgWorker.postMessage('start');
      } catch (err) {
        console.warn("Background worker fallback to setInterval:", err);
        // Fallback interval if Worker creation is restricted
        setInterval(() => {
          if (this.isRunning && document.hidden) {
            this.drawFrame();
          }
        }, 16);
      }
    }

    addClickRipple(normalizedX, normalizedY) {
      if (!this.config.highlightClicks) return;
      this.ripples.push({ x: normalizedX, y: normalizedY, radius: 5, maxRadius: 40, birth: performance.now() });
    }

    drawFrame() {
      const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
      this.drawBackground(ctx, W, H);
      if (this.screenVideo && this.screenVideo.videoWidth > 0) this.drawScreen(ctx, W, H);
      else this.drawPlaceholder(ctx, W, H);
      if (this.config.showWebcam && this.webcamVideo && this.webcamVideo.videoWidth > 0) this.drawWebcam(ctx, W, H);
      this.drawRipples(ctx, W, H);
    }

    drawBackground(ctx, W, H) {
      const style = this.config.backgroundStyle;
      if (style === 'gradient-sunset') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#f97316'); grad.addColorStop(0.5, '#ec4899'); grad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (style === 'gradient-nord') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#2e3440'); grad.addColorStop(0.5, '#3b4252'); grad.addColorStop(1, '#434c5e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (style === 'gradient-neon') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0f172a'); grad.addColorStop(0.5, '#06b6d4'); grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (style === 'gradient-emerald') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#064e3b'); grad.addColorStop(0.5, '#059669'); grad.addColorStop(1, '#10b981');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (style === 'blur' && this.screenVideo && this.screenVideo.videoWidth > 0) {
        ctx.save(); ctx.filter = 'blur(40px) brightness(0.7)'; ctx.drawImage(this.screenVideo, -50, -50, W + 100, H + 100); ctx.restore();
      } else {
        ctx.fillStyle = this.config.bgColor || '#0f172a'; ctx.fillRect(0, 0, W, H);
      }
    }

    drawScreen(ctx, W, H) {
      const vid = this.screenVideo, vidW = vid.videoWidth, vidH = vid.videoHeight;
      const pad = this.config.padding, titleBarH = this.config.showWindowFrame ? 38 : 0;
      const availW = W - pad * 2, availH = H - pad * 2 - titleBarH;
      const scale = Math.min(availW / vidW, availH / vidH);
      const renderW = vidW * scale, renderH = vidH * scale;
      const frameW = renderW, frameH = renderH + titleBarH;
      const frameX = (W - frameW) / 2, frameY = (H - frameH) / 2;
      const radius = this.config.borderRadius;

      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${this.config.shadowOpacity})`;
      ctx.shadowBlur = this.config.shadowBlur;
      ctx.shadowOffsetY = 15;
      this.roundRect(ctx, frameX, frameY, frameW, frameH, radius);
      ctx.fillStyle = '#1e1e24'; ctx.fill();

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      this.roundRect(ctx, frameX, frameY, frameW, frameH, radius); ctx.clip();

      if (this.config.showWindowFrame) {
        ctx.fillStyle = 'rgba(30, 32, 40, 0.95)';
        ctx.fillRect(frameX, frameY, frameW, titleBarH);
        const dotY = frameY + titleBarH / 2, dotRadius = 6, startX = frameX + 20;
        ctx.fillStyle = '#ff5f56'; ctx.beginPath(); ctx.arc(startX, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffbd2e'; ctx.beginPath(); ctx.arc(startX + 18, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#27c93f'; ctx.beginPath(); ctx.arc(startX + 36, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9ca3af'; ctx.font = '500 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.config.windowTitle, frameX + frameW / 2, dotY);
      }

      this.config.smoothZoom += (this.config.targetZoom - this.config.smoothZoom) * 0.18;
      this.config.currentPanX += (this.config.zoomTargetX - this.config.currentPanX) * 0.18;
      this.config.currentPanY += (this.config.zoomTargetY - this.config.currentPanY) * 0.18;

      const zoom = this.config.smoothZoom, panX = this.config.currentPanX, panY = this.config.currentPanY;
      const contentY = frameY + titleBarH, contentH = renderH;

      ctx.save();
      ctx.beginPath(); ctx.rect(frameX, contentY, renderW, contentH); ctx.clip();
      if (zoom > 1.005) {
        const cropW = vidW / zoom;
        const cropH = vidH / zoom;
        const halfW = cropW / 2;
        const halfH = cropH / 2;
        const desiredCenterX = panX * vidW;
        const desiredCenterY = panY * vidH;
        const cropX = Math.max(0, Math.min(vidW - cropW, desiredCenterX - halfW));
        const cropY = Math.max(0, Math.min(vidH - cropH, desiredCenterY - halfH));
        ctx.drawImage(vid, cropX, cropY, cropW, cropH, frameX, contentY, renderW, contentH);
      } else {
        ctx.drawImage(vid, 0, 0, vidW, vidH, frameX, contentY, renderW, contentH);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1.5;
      this.roundRect(ctx, frameX, frameY, frameW, frameH, radius); ctx.stroke();
      ctx.restore();

      this.lastFrameBounds = { x: frameX, y: contentY, w: renderW, h: renderH };
    }

    drawPlaceholder(ctx, W, H) {
      const pad = this.config.padding, frameW = W - pad * 2, frameH = H - pad * 2;
      ctx.save();
      this.roundRect(ctx, pad, pad, frameW, frameH, this.config.borderRadius);
      ctx.fillStyle = 'rgba(17, 24, 39, 0.8)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.font = '600 24px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Select Screen / Window to Start', W / 2, H / 2 - 15);
      ctx.fillStyle = '#6b7280'; ctx.font = '400 15px system-ui, sans-serif';
      ctx.fillText('Click "Select Screen" below • Choose "Entire Screen" to record other tabs seamlessly', W / 2, H / 2 + 18);
      ctx.restore();
    }

    drawWebcam(ctx, W, H) {
      const vid = this.webcamVideo, size = this.config.webcamSize, posX = this.config.webcamX * W, posY = this.config.webcamY * H;
      const isCircle = this.config.webcamShape === 'circle';
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 8;
      ctx.beginPath();
      if (isCircle) ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
      else this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
      ctx.fillStyle = '#111827'; ctx.fill();

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.save(); ctx.beginPath();
      if (isCircle) ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
      else this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
      ctx.clip();

      if (this.config.webcamMirrored) { ctx.translate(posX, posY); ctx.scale(-1, 1); ctx.translate(-posX, -posY); }
      const minDim = Math.min(vid.videoWidth, vid.videoHeight);
      ctx.drawImage(vid, (vid.videoWidth - minDim) / 2, (vid.videoHeight - minDim) / 2, minDim, minDim, posX - size / 2, posY - size / 2, size, size);
      ctx.restore();

      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.beginPath();
      if (isCircle) ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
      else this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
      ctx.stroke(); ctx.restore();
    }

    drawRipples(ctx, W, H) {
      if (!this.ripples.length) return;
      const now = performance.now(), active = [];
      for (let r of this.ripples) {
        const age = (now - r.birth) / 550;
        if (age < 1.0) {
          const radius = r.radius + (r.maxRadius - r.radius) * Math.sin(age * Math.PI / 2);
          ctx.save();
          ctx.strokeStyle = `rgba(99, 102, 241, ${1 - age})`; ctx.lineWidth = 3 * (1 - age);
          ctx.beginPath(); ctx.arc(r.x * W, r.y * H, radius, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          active.push(r);
        }
      }
      this.ripples = active;
    }

    roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  /* 6. MEDIA EXPORTER */
  class MediaExporter {
    constructor() { this.recordedChunks = []; this.recordedBlob = null; this.isRecording = false; this.isPaused = false; }
    startRecording(compositeCanvas, audioStream = null) {
      this.recordedChunks = [];
      const canvasStream = compositeCanvas.captureStream(60);
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream && audioStream.getAudioTracks().length > 0) audioStream.getAudioTracks().forEach(t => tracks.push(t));
      const combined = new MediaStream(tracks);

      const mimeTypes = [
        'video/mp4',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264,aac',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      let selectedMime = '';
      for (let m of mimeTypes) { if (MediaRecorder.isTypeSupported(m)) { selectedMime = m; break; } }

      this.mediaRecorder = new MediaRecorder(combined, { mimeType: selectedMime || undefined, videoBitsPerSecond: 8000000 });
      this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.recordedChunks.push(e.data); };
      this.mediaRecorder.onstop = () => { this.recordedBlob = new Blob(this.recordedChunks, { type: selectedMime || 'video/mp4' }); };
      this.mediaRecorder.start(1000);
      this.isRecording = true; this.isPaused = false; this.selectedMime = selectedMime;
      return this.mediaRecorder;
    }
    pause() { if (this.mediaRecorder && this.isRecording) { this.mediaRecorder.pause(); this.isPaused = true; } }
    resume() { if (this.mediaRecorder && this.isRecording) { this.mediaRecorder.resume(); this.isPaused = false; } }
    stop() {
      return new Promise((resolve) => {
        if (!this.mediaRecorder || !this.isRecording) return resolve(this.recordedBlob);
        this.mediaRecorder.addEventListener('stop', () => resolve(this.recordedBlob), { once: true });
        this.mediaRecorder.stop();
        this.isRecording = false;
      });
    }
    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.style.display = 'none'; a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 1000);
    }
  }

  /* 7. APP COORDINATION */
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const btnStartCapture = document.getElementById('btnStartCapture');
    const btnToggleWebcam = document.getElementById('btnToggleWebcam');
    const btnRecord = document.getElementById('btnRecord');
    const btnPause = document.getElementById('btnPause');
    const btnStop = document.getElementById('btnStop');
    const recordingPill = document.getElementById('recordingPill');
    const recDurationEl = document.getElementById('recDuration');
    const micMeterFill = document.getElementById('micMeterFill');
    const gateActiveBadge = document.getElementById('gateActiveBadge');
    const micBar1 = document.getElementById('micBar1'), micBar2 = document.getElementById('micBar2'), micBar3 = document.getElementById('micBar3');

    const reviewModal = document.getElementById('reviewModal');
    const previewVideo = document.getElementById('previewVideo');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnDownloadVideo = document.getElementById('btnDownloadVideo');
    const btnExportGif = document.getElementById('btnExportGif');
    const btnSeparateVocals = document.getElementById('btnSeparateVocals');
    const btnDownloadVocal = document.getElementById('btnDownloadVocal');
    const btnDownloadBg = document.getElementById('btnDownloadBg');
    const vocalStatusText = document.getElementById('vocalStatusText');
    const gifProgressText = document.getElementById('gifProgressText');

    const capture = new StreamCapture();
    const compositor = new CanvasCompositor(canvas);
    const audioProcessor = new StudioAudioProcessor();
    const vocalSeparator = new VocalSeparator();
    const exporter = new MediaExporter();

    let cleanAudioStream = null, timerInterval = null, isCapturingScreen = false, isCapturingWebcam = false, currentRecordingBlob = null, separatedAudioResult = null;
    compositor.start();

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`tab-${btn.dataset.tab}`);
        if (target) target.classList.add('active');
      });
    });

    // Background presets
    document.querySelectorAll('.bg-thumbnail').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.bg-thumbnail').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        compositor.config.backgroundStyle = card.dataset.style;
      });
    });

    // Aspect ratio chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        compositor.config.aspectRatio = chip.dataset.aspect;
        compositor.updateResolution();
      });
    });

    // Dimension sliders
    document.getElementById('rangePadding').addEventListener('input', (e) => {
      compositor.config.padding = parseInt(e.target.value);
      document.getElementById('valPadding').textContent = `${e.target.value}px`;
    });
    document.getElementById('rangeRadius').addEventListener('input', (e) => {
      compositor.config.borderRadius = parseInt(e.target.value);
      document.getElementById('valRadius').textContent = `${e.target.value}px`;
    });
    document.getElementById('rangeShadow').addEventListener('input', (e) => {
      compositor.config.shadowBlur = parseInt(e.target.value);
      document.getElementById('valShadow').textContent = `${e.target.value}px`;
    });
    document.getElementById('toggleWindowFrame').addEventListener('change', (e) => compositor.config.showWindowFrame = e.target.checked);
    document.getElementById('inputWindowTitle').addEventListener('input', (e) => compositor.config.windowTitle = e.target.value);

    // Webcam Controls
    document.getElementById('selectWebcamShape').addEventListener('change', (e) => compositor.config.webcamShape = e.target.value);
    document.getElementById('rangeWebcamSize').addEventListener('input', (e) => {
      compositor.config.webcamSize = parseInt(e.target.value);
      document.getElementById('valWebcamSize').textContent = `${e.target.value}px`;
    });
    document.getElementById('toggleWebcamMirror').addEventListener('change', (e) => compositor.config.webcamMirrored = e.target.checked);

    // Audio DSP Controls
    document.getElementById('toggleNoiseCleaner').addEventListener('change', (e) => audioProcessor.setNoiseCleaner(e.target.checked));
    document.getElementById('rangeGateThreshold').addEventListener('input', (e) => {
      audioProcessor.setGateThreshold(e.target.value);
      document.getElementById('valGateThreshold').textContent = `${e.target.value} dB`;
    });
    document.getElementById('rangeMicVolume').addEventListener('input', (e) => {
      audioProcessor.setMicVolume(e.target.value);
      document.getElementById('valMicVolume').textContent = `${Math.round(e.target.value * 100)}%`;
    });

    // Smart Focus & Auto-Zoom Settings
    let smartZoomTimeout = null;
    const toggleSmartZoom = document.getElementById('toggleSmartZoom');
    const rangeZoomLevel = document.getElementById('rangeZoomLevel');
    const rangeZoomHold = document.getElementById('rangeZoomHold');

    rangeZoomLevel.addEventListener('input', (e) => {
      document.getElementById('valZoomLevel').textContent = `${e.target.value}x`;
    });
    rangeZoomHold.addEventListener('input', (e) => {
      document.getElementById('valZoomHold').textContent = `${e.target.value}s`;
    });

    // Draggable camera & Canvas interaction
    let isDraggingWebcam = false;
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width, ny = (e.clientY - rect.top) / rect.height;
      if (compositor.config.showWebcam) {
        const W = canvas.width, H = canvas.height;
        const dist = Math.hypot((nx * W) - (compositor.config.webcamX * W), (ny * H) - (compositor.config.webcamY * H));
        if (dist <= compositor.config.webcamSize / 2 + 15) { isDraggingWebcam = true; return; }
      }

      // Add visual click ripple indicator
      compositor.addClickRipple(nx, ny);

      // Smart Focus & Auto-Zoom
      if (toggleSmartZoom && toggleSmartZoom.checked) {
        // Map click precisely into screen frame coordinates
        const W = canvas.width, H = canvas.height;
        const px = nx * W, py = ny * H;
        const bounds = compositor.lastFrameBounds;

        let targetX = nx;
        let targetY = ny;

        if (bounds) {
          // Normalized relative to inner screen video content
          targetX = Math.max(0.1, Math.min(0.9, (px - bounds.x) / bounds.w));
          targetY = Math.max(0.1, Math.min(0.9, (py - bounds.y) / bounds.h));
        }

        compositor.config.zoomTargetX = targetX;
        compositor.config.zoomTargetY = targetY;

        // Smoothly zoom in to the clicked place
        const zoomPower = parseFloat(rangeZoomLevel.value) || 2.5;
        compositor.config.targetZoom = zoomPower;

        // Clear any previous unzoom timer
        if (smartZoomTimeout) clearTimeout(smartZoomTimeout);

        // Automatically un-zoom smoothly back to normal view after hold duration
        const holdSeconds = parseFloat(rangeZoomHold.value) || 2.5;
        smartZoomTimeout = setTimeout(() => {
          compositor.config.targetZoom = 1.0;
          compositor.config.zoomTargetX = 0.5;
          compositor.config.zoomTargetY = 0.5;
        }, holdSeconds * 1000);
      } else {
        compositor.config.zoomTargetX = nx;
        compositor.config.zoomTargetY = ny;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingWebcam) return;
      const rect = canvas.getBoundingClientRect();
      compositor.config.webcamX = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
      compositor.config.webcamY = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height));
    });
    window.addEventListener('mouseup', () => isDraggingWebcam = false);

    // Zoom buttons
    document.getElementById('btnZoomIn').addEventListener('click', () => {
      if (smartZoomTimeout) clearTimeout(smartZoomTimeout);
      compositor.config.targetZoom = Math.min(5.0, compositor.config.targetZoom + 0.5);
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      if (smartZoomTimeout) clearTimeout(smartZoomTimeout);
      compositor.config.targetZoom = Math.max(1.0, compositor.config.targetZoom - 0.5);
    });
    document.getElementById('btnZoomReset').addEventListener('click', () => {
      if (smartZoomTimeout) clearTimeout(smartZoomTimeout);
      compositor.config.targetZoom = 1.0; compositor.config.zoomTargetX = 0.5; compositor.config.zoomTargetY = 0.5;
    });

    // Live Audio Meter
    function updateMeter() {
      const { level, isGated } = audioProcessor.getAudioLevels();
      if (micMeterFill) micMeterFill.style.width = `${Math.min(100, Math.round(level * 250))}%`;
      if (micBar1 && micBar2 && micBar3) {
        const lvl = Math.min(1, level * 3);
        micBar1.style.height = `${Math.max(3, Math.round(lvl * 12))}px`;
        micBar2.style.height = `${Math.max(4, Math.round(lvl * 16))}px`;
        micBar3.style.height = `${Math.max(3, Math.round(lvl * 10))}px`;
      }
      if (gateActiveBadge) {
        if (isGated) { gateActiveBadge.textContent = 'GATED'; gateActiveBadge.className = 'dsp-indicator'; }
        else { gateActiveBadge.textContent = 'SPEECH'; gateActiveBadge.className = 'dsp-indicator open'; }
      }
      requestAnimationFrame(updateMeter);
    }
    requestAnimationFrame(updateMeter);

    // Start Screen Capture
    btnStartCapture.addEventListener('click', async () => {
      try {
        if (!isCapturingScreen) {
          const stream = await capture.startScreenCapture();
          compositor.setScreenSource(capture.screenVideoElement);
          isCapturingScreen = true;
          btnStartCapture.innerHTML = `Change Screen`;
          try {
            const mic = await capture.startMicCapture();
            cleanAudioStream = await audioProcessor.init(mic, stream);
          } catch (micErr) {
            cleanAudioStream = await audioProcessor.init(null, stream);
          }
          btnRecord.disabled = false;
          capture.onStreamEnded = () => {
            isCapturingScreen = false;
            btnStartCapture.innerHTML = `Select Screen`;
            if (exporter.isRecording) btnStop.click();
          };
        } else {
          await capture.startScreenCapture();
          compositor.setScreenSource(capture.screenVideoElement);
        }
      } catch (err) {
        alert("Screen capture error: " + err.message);
      }
    });

    // Webcam
    btnToggleWebcam.addEventListener('click', async () => {
      try {
        if (!isCapturingWebcam) {
          await capture.startWebcamCapture();
          compositor.setWebcamSource(capture.webcamVideoElement);
          compositor.config.showWebcam = true;
          isCapturingWebcam = true;
          btnToggleWebcam.classList.add('btn-primary');
        } else {
          capture.stopWebcam();
          compositor.config.showWebcam = false;
          isCapturingWebcam = false;
          btnToggleWebcam.classList.remove('btn-primary');
        }
      } catch (err) {
        alert("Webcam error: " + err.message);
      }
    });

    // Recording Controls
    btnRecord.addEventListener('click', () => {
      if (!isCapturingScreen) return alert("Please select screen first.");
      exporter.startRecording(canvas, cleanAudioStream);
      btnRecord.style.display = 'none'; btnPause.style.display = 'flex'; btnStop.style.display = 'flex';
      recordingPill.classList.add('active');
      let seconds = 0;
      timerInterval = setInterval(() => {
        seconds++;
        recDurationEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }, 1000);
    });

    btnPause.addEventListener('click', () => {
      if (exporter.isPaused) { exporter.resume(); btnPause.textContent = 'Pause'; }
      else { exporter.pause(); btnPause.textContent = 'Resume'; }
    });

    btnStop.addEventListener('click', async () => {
      clearInterval(timerInterval);
      recordingPill.classList.remove('active');
      btnRecord.style.display = 'flex'; btnPause.style.display = 'none'; btnStop.style.display = 'none';
      recDurationEl.textContent = '00:00';
      currentRecordingBlob = await exporter.stop();
      if (currentRecordingBlob) {
        previewVideo.src = URL.createObjectURL(currentRecordingBlob);
        reviewModal.classList.add('open');
        separatedAudioResult = null;
        btnDownloadVocal.style.display = 'none'; btnDownloadBg.style.display = 'none';
        vocalStatusText.textContent = 'Ready to process'; gifProgressText.textContent = '';
      }
    });

    btnCloseModal.addEventListener('click', () => {
      reviewModal.classList.remove('open');
      previewVideo.pause(); previewVideo.src = '';
    });

    btnDownloadVideo.addEventListener('click', () => {
      if (!currentRecordingBlob) return;
      exporter.downloadBlob(currentRecordingBlob, `Netfie-Video-${Date.now()}.mp4`);
    });

    btnSeparateVocals.addEventListener('click', async () => {
      if (!currentRecordingBlob) return;
      vocalStatusText.textContent = 'Processing DSP Vocal Separation...';
      btnSeparateVocals.disabled = true;
      try {
        separatedAudioResult = await vocalSeparator.processAudio(currentRecordingBlob);
        vocalStatusText.innerHTML = '<span style="color:#10b981">✓ Vocals Separated!</span>';
        btnDownloadVocal.style.display = 'inline-flex'; btnDownloadBg.style.display = 'inline-flex';
      } catch (e) {
        vocalStatusText.innerHTML = `<span style="color:#ef4444">Error: ${e.message}</span>`;
      } finally {
        btnSeparateVocals.disabled = false;
      }
    });

    btnDownloadVocal.addEventListener('click', () => {
      if (separatedAudioResult) exporter.downloadBlob(separatedAudioResult.vocalBlob, `Netfie-Vocals-${Date.now()}.wav`);
    });
    btnDownloadBg.addEventListener('click', () => {
      if (separatedAudioResult) exporter.downloadBlob(separatedAudioResult.backgroundBlob, `Netfie-Background-${Date.now()}.wav`);
    });

    btnExportGif.addEventListener('click', async () => {
      if (!previewVideo.duration) return alert("Video not ready.");
      btnExportGif.disabled = true;
      gifProgressText.textContent = 'Rendering GIF...';
      try {
        const vid = previewVideo, targetW = 640, targetH = Math.round(targetW * (canvas.height / canvas.width));
        const offscreen = document.createElement('canvas'); offscreen.width = targetW; offscreen.height = targetH;
        const ctx = offscreen.getContext('2d'), encoder = new GifEncoder(targetW, targetH);
        encoder.setDelay(100); encoder.start();
        const duration = Math.min(vid.duration, 8), total = Math.floor(duration * 10);
        for (let i = 0; i < total; i++) {
          vid.currentTime = i / 10;
          await new Promise(r => vid.addEventListener('seeked', r, { once: true }));
          ctx.drawImage(vid, 0, 0, targetW, targetH);
          encoder.addFrame(ctx.getImageData(0, 0, targetW, targetH), 100);
          gifProgressText.textContent = `Rendering: ${Math.round(((i + 1) / total) * 100)}%`;
        }
        const gifBlob = new Blob([encoder.finish()], { type: 'image/gif' });
        exporter.downloadBlob(gifBlob, `Netfie-Demo-${Date.now()}.gif`);
        gifProgressText.textContent = '✓ GIF Downloaded!';
      } catch (e) {
        gifProgressText.textContent = 'GIF Failed: ' + e.message;
      } finally {
        btnExportGif.disabled = false;
      }
    });

    // Theme Switcher (Bright / Dark Mode)
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeIconLight = document.getElementById('themeIconLight');
    const themeIconDark = document.getElementById('themeIconDark');
    const savedTheme = localStorage.getItem('netfie_theme') || 'dark';

    function applyTheme(theme) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIconLight) themeIconLight.style.display = 'none';
        if (themeIconDark) themeIconDark.style.display = 'inline-block';
        if (btnThemeToggle) btnThemeToggle.title = 'Switch to Dark Mode';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIconLight) themeIconLight.style.display = 'inline-block';
        if (themeIconDark) themeIconDark.style.display = 'none';
        if (btnThemeToggle) btnThemeToggle.title = 'Switch to Bright Light Mode';
      }
      localStorage.setItem('netfie_theme', theme);
    }

    applyTheme(savedTheme);

    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
      });
    }
  });