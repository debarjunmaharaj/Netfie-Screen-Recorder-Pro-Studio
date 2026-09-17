/**
 * CanvasCompositor - 60FPS Recordly-Style Presentation Engine
 * Features:
 * - Canvas Aspect Ratios (16:9, 9:16 Shorts, 1:1 Square, 4:3)
 * - Designer Gradients, Wallpapers, Blurred backdrop
 * - Framed Screen with Rounded Corners and Drop Shadow
 * - macOS / Modern Window Titlebar with buttons
 * - Draggable & Resizable Camera Bubble (Circle, Squircle, Rounded Rect)
 * - Click Ripple animations & Cursor highlighter
 * - Smooth Auto-Zoom / Pan to focus area
 */
class CanvasCompositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Canvas resolution presets
    this.aspectRatios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1':  { width: 1080, height: 1080 },
      '4:3':  { width: 1440, height: 1080 }
    };

    // Active presentation settings
    this.config = {
      aspectRatio: '16:9',
      padding: 60,            // Padding around the screen
      borderRadius: 18,       // Screen corner roundness
      shadowBlur: 45,         // Shadow blur
      shadowOpacity: 0.4,
      backgroundStyle: 'gradient-sunset', // or 'gradient-nord', 'gradient-neon', 'blur', 'mesh', 'color'
      bgColor: '#111827',
      showWindowFrame: true,  // macOS style bar
      windowTitle: 'Recordly Studio Demo',

      // Camera Bubble
      showWebcam: false,
      webcamShape: 'circle',  // 'circle', 'rounded'
      webcamSize: 220,
      webcamX: 0.85,          // Relative X (0 to 1)
      webcamY: 0.80,          // Relative Y (0 to 1)
      webcamMirrored: true,
      webcamBorder: true,

      // Cursor & Zoom
      highlightClicks: true,
      smoothZoom: 1.0,        // Zoom factor (1.0 to 2.5)
      targetZoom: 1.0,
      zoomTargetX: 0.5,
      zoomTargetY: 0.5,
      currentPanX: 0.5,
      currentPanY: 0.5
    };

    this.ripples = [];
    this.isRunning = false;
    this.animId = null;

    // References to source video elements
    this.screenVideo = null;
    this.webcamVideo = null;

    // Set initial size
    this.updateResolution();
  }

  updateResolution() {
    const res = this.aspectRatios[this.config.aspectRatio] || this.aspectRatios['16:9'];
    this.canvas.width = res.width;
    this.canvas.height = res.height;
  }

  setScreenSource(videoEl) {
    this.screenVideo = videoEl;
  }

  setWebcamSource(videoEl) {
    this.webcamVideo = videoEl;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const render = () => {
      if (!this.isRunning) return;
      this.drawFrame();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  addClickRipple(normalizedX, normalizedY) {
    if (!this.config.highlightClicks) return;
    this.ripples.push({
      x: normalizedX,
      y: normalizedY,
      radius: 5,
      maxRadius: 40,
      alpha: 0.85,
      birth: performance.now()
    });
  }

  drawFrame() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // 1. Draw Recordly Designer Background
    this.drawBackground(ctx, W, H);

    // 2. Compute Screen Layout with Zoom & Padding
    if (this.screenVideo && this.screenVideo.videoWidth > 0) {
      this.drawScreen(ctx, W, H);
    } else {
      this.drawPlaceholder(ctx, W, H);
    }

    // 3. Draw Camera Bubble
    if (this.config.showWebcam && this.webcamVideo && this.webcamVideo.videoWidth > 0) {
      this.drawWebcam(ctx, W, H);
    }

    // 4. Draw Click Ripples
    this.drawRipples(ctx, W, H);
  }

  drawBackground(ctx, W, H) {
    const style = this.config.backgroundStyle;

    if (style === 'gradient-sunset') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.5, '#ec4899');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'gradient-nord') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#2e3440');
      grad.addColorStop(0.5, '#3b4252');
      grad.addColorStop(1, '#434c5e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'gradient-neon') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'gradient-emerald') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#059669');
      grad.addColorStop(1, '#10b981');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'blur' && this.screenVideo && this.screenVideo.videoWidth > 0) {
      // Blurred screen background
      ctx.save();
      ctx.filter = 'blur(40px) brightness(0.7)';
      ctx.drawImage(this.screenVideo, -50, -50, W + 100, H + 100);
      ctx.restore();
    } else {
      ctx.fillStyle = this.config.bgColor || '#0f172a';
      ctx.fillRect(0, 0, W, H);
    }

    // Subtle mesh radial highlight on top
    const radial = ctx.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H / 2, Math.max(W, H) * 0.7);
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);
  }

  drawScreen(ctx, W, H) {
    const vid = this.screenVideo;
    const vidW = vid.videoWidth;
    const vidH = vid.videoHeight;

    // Calculate maximum bounding box for screen accounting for padding
    const pad = this.config.padding;
    const titleBarH = this.config.showWindowFrame ? 38 : 0;
    const availW = W - pad * 2;
    const availH = H - pad * 2 - titleBarH;

    // Aspect fit inside available space
    const scale = Math.min(availW / vidW, availH / vidH);
    const renderW = vidW * scale;
    const renderH = vidH * scale;

    const frameW = renderW;
    const frameH = renderH + titleBarH;
    const frameX = (W - frameW) / 2;
    const frameY = (H - frameH) / 2;

    const radius = this.config.borderRadius;

    ctx.save();

    // Shadow
    ctx.shadowColor = `rgba(0, 0, 0, ${this.config.shadowOpacity})`;
    ctx.shadowBlur = this.config.shadowBlur;
    ctx.shadowOffsetY = 15;

    // Draw container frame shape
    this.roundRect(ctx, frameX, frameY, frameW, frameH, radius);
    ctx.fillStyle = '#1e1e24';
    ctx.fill();

    // Reset shadow so inside elements don't multiply shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Clip to rounded container
    this.roundRect(ctx, frameX, frameY, frameW, frameH, radius);
    ctx.clip();

    // Draw macOS Window Title Bar if enabled
    if (this.config.showWindowFrame) {
      ctx.fillStyle = 'rgba(30, 32, 40, 0.95)';
      ctx.fillRect(frameX, frameY, frameW, titleBarH);

      // Traffic light dots
      const dotY = frameY + titleBarH / 2;
      const dotRadius = 6;
      const startX = frameX + 20;

      // Close (Red)
      ctx.fillStyle = '#ff5f56';
      ctx.beginPath(); ctx.arc(startX, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
      // Minimize (Yellow)
      ctx.fillStyle = '#ffbd2e';
      ctx.beginPath(); ctx.arc(startX + 18, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();
      // Maximize (Green)
      ctx.fillStyle = '#27c93f';
      ctx.beginPath(); ctx.arc(startX + 36, dotY, dotRadius, 0, Math.PI * 2); ctx.fill();

      // Title Text
      ctx.fillStyle = '#9ca3af';
      ctx.font = '500 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.config.windowTitle, frameX + frameW / 2, dotY);
    }

    // Smooth Zoom interpolation
    this.config.smoothZoom += (this.config.targetZoom - this.config.smoothZoom) * 0.12;
    this.config.currentPanX += (this.config.zoomTargetX - this.config.currentPanX) * 0.12;
    this.config.currentPanY += (this.config.zoomTargetY - this.config.currentPanY) * 0.12;

    const zoom = this.config.smoothZoom;
    const panX = this.config.currentPanX;
    const panY = this.config.currentPanY;

    // Screen video content area
    const contentY = frameY + titleBarH;
    const contentH = renderH;

    ctx.save();
    // Sub-clip to screen display bounds
    ctx.beginPath();
    ctx.rect(frameX, contentY, renderW, contentH);
    ctx.clip();

    if (zoom > 1.01) {
      // Apply zoom & pan transformation
      const cropW = vidW / zoom;
      const cropH = vidH / zoom;
      const cropX = Math.max(0, Math.min(vidW - cropW, (panX * vidW) - cropW / 2));
      const cropY = Math.max(0, Math.min(vidH - cropH, (panY * vidH) - cropH / 2));

      ctx.drawImage(vid, cropX, cropY, cropW, cropH, frameX, contentY, renderW, contentH);
    } else {
      ctx.drawImage(vid, 0, 0, vidW, vidH, frameX, contentY, renderW, contentH);
    }
    ctx.restore();

    // Inner subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, frameX, frameY, frameW, frameH, radius);
    ctx.stroke();

    ctx.restore();

    // Cache computed frame area for mouse tracking
    this.lastFrameBounds = { x: frameX, y: contentY, w: renderW, h: renderH };
  }

  drawPlaceholder(ctx, W, H) {
    const pad = this.config.padding;
    const frameW = W - pad * 2;
    const frameH = H - pad * 2;
    const frameX = pad;
    const frameY = pad;

    ctx.save();
    this.roundRect(ctx, frameX, frameY, frameW, frameH, this.config.borderRadius);
    ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select Screen / Tab to Start Preview', W / 2, H / 2 - 10);

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('Click "Select Screen" in the bottom dock to start', W / 2, H / 2 + 25);

    ctx.restore();
  }

  drawWebcam(ctx, W, H) {
    const vid = this.webcamVideo;
    const size = this.config.webcamSize;
    const posX = this.config.webcamX * W;
    const posY = this.config.webcamY * H;
    const isCircle = this.config.webcamShape === 'circle';

    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;

    // Create webcam bubble path
    ctx.beginPath();
    if (isCircle) {
      ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
    } else {
      this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
    }
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Clip for video
    ctx.save();
    ctx.beginPath();
    if (isCircle) {
      ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
    } else {
      this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
    }
    ctx.clip();

    // Mirroring & Drawing
    if (this.config.webcamMirrored) {
      ctx.translate(posX, posY);
      ctx.scale(-1, 1);
      ctx.translate(-posX, -posY);
    }

    const vW = vid.videoWidth;
    const vH = vid.videoHeight;
    const minDim = Math.min(vW, vH);
    const sx = (vW - minDim) / 2;
    const sy = (vH - minDim) / 2;

    ctx.drawImage(vid, sx, sy, minDim, minDim, posX - size / 2, posY - size / 2, size, size);
    ctx.restore();

    // Elegant Border ring
    if (this.config.webcamBorder) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (isCircle) {
        ctx.arc(posX, posY, size / 2, 0, Math.PI * 2);
      } else {
        this.roundRect(ctx, posX - size / 2, posY - size / 2, size, size, 24);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  drawRipples(ctx, W, H) {
    if (!this.ripples.length) return;
    const now = performance.now();
    const activeRipples = [];

    for (let r of this.ripples) {
      const age = (now - r.birth) / 550; // 550ms lifetime
      if (age < 1.0) {
        const radius = r.radius + (r.maxRadius - r.radius) * Math.sin(age * Math.PI / 2);
        const alpha = r.alpha * (1.0 - age);

        const px = r.x * W;
        const py = r.y * H;

        ctx.save();
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.lineWidth = 3 * (1 - age);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(96, 165, 250, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        activeRipples.push(r);
      }
    }
    this.ripples = activeRipples;
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
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

window.CanvasCompositor = CanvasCompositor;
