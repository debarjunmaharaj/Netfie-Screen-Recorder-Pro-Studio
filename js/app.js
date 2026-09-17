/**
 * Main Application Logic
 * Ties UI, Capture, DSP Audio Processor, Compositor, and Exporters together
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
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

  // Modals & Export elements
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

  // Core Components
  const capture = new StreamCapture();
  const compositor = new CanvasCompositor(canvas);
  const audioProcessor = new StudioAudioProcessor();
  const vocalSeparator = new VocalSeparator();
  const exporter = new MediaExporter();

  let cleanAudioStream = null;
  let timerInterval = null;
  let isCapturingScreen = false;
  let isCapturingWebcam = false;
  let currentRecordingBlob = null;
  let separatedAudioResult = null;

  // Initialize Compositor Frame Loop
  compositor.start();

  // Tab switching logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Background style presets
  document.querySelectorAll('.bg-thumbnail').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.bg-thumbnail').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      compositor.config.backgroundStyle = card.dataset.style;
    });
  });

  // Aspect ratio chips in header
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      compositor.config.aspectRatio = chip.dataset.aspect;
      compositor.updateResolution();
    });
  });

  const rangePadding = document.getElementById('rangePadding');
  rangePadding.addEventListener('input', (e) => {
    compositor.config.padding = parseInt(e.target.value);
    document.getElementById('valPadding').textContent = `${e.target.value}px`;
  });

  const rangeRadius = document.getElementById('rangeRadius');
  rangeRadius.addEventListener('input', (e) => {
    compositor.config.borderRadius = parseInt(e.target.value);
    document.getElementById('valRadius').textContent = `${e.target.value}px`;
  });

  const rangeShadow = document.getElementById('rangeShadow');
  rangeShadow.addEventListener('input', (e) => {
    compositor.config.shadowBlur = parseInt(e.target.value);
    document.getElementById('valShadow').textContent = `${e.target.value}px`;
  });

  document.getElementById('toggleWindowFrame').addEventListener('change', (e) => {
    compositor.config.showWindowFrame = e.target.checked;
  });

  document.getElementById('inputWindowTitle').addEventListener('input', (e) => {
    compositor.config.windowTitle = e.target.value;
  });

  // Camera settings
  document.getElementById('selectWebcamShape').addEventListener('change', (e) => {
    compositor.config.webcamShape = e.target.value;
  });

  document.getElementById('rangeWebcamSize').addEventListener('input', (e) => {
    compositor.config.webcamSize = parseInt(e.target.value);
    document.getElementById('valWebcamSize').textContent = `${e.target.value}px`;
  });

  document.getElementById('toggleWebcamMirror').addEventListener('change', (e) => {
    compositor.config.webcamMirrored = e.target.checked;
  });

  // Audio DSP & Noise Cleaner Controls
  const toggleNoiseCleaner = document.getElementById('toggleNoiseCleaner');
  toggleNoiseCleaner.addEventListener('change', (e) => {
    audioProcessor.setNoiseCleaner(e.target.checked);
  });

  const rangeGateThreshold = document.getElementById('rangeGateThreshold');
  rangeGateThreshold.addEventListener('input', (e) => {
    audioProcessor.setGateThreshold(e.target.value);
    document.getElementById('valGateThreshold').textContent = `${e.target.value} dB`;
  });

  const rangeMicVolume = document.getElementById('rangeMicVolume');
  rangeMicVolume.addEventListener('input', (e) => {
    audioProcessor.setMicVolume(e.target.value);
    document.getElementById('valMicVolume').textContent = `${Math.round(e.target.value * 100)}%`;
  });

  // Click Ripples, Draggable Camera & Cursor interaction on Canvas
  let isDraggingWebcam = false;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    // Check if clicking inside webcam bubble to drag it
    if (compositor.config.showWebcam) {
      const W = canvas.width;
      const H = canvas.height;
      const clickX = nx * W;
      const clickY = ny * H;
      const camX = compositor.config.webcamX * W;
      const camY = compositor.config.webcamY * H;
      const radius = compositor.config.webcamSize / 2;

      const dist = Math.hypot(clickX - camX, clickY - camY);
      if (dist <= radius + 15) {
        isDraggingWebcam = true;
        return;
      }
    }

    compositor.addClickRipple(nx, ny);

    // Zoom focus target
    compositor.config.zoomTargetX = nx;
    compositor.config.zoomTargetY = ny;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingWebcam) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height));
    compositor.config.webcamX = nx;
    compositor.config.webcamY = ny;
  });

  window.addEventListener('mouseup', () => {
    isDraggingWebcam = false;
  });

  // Zoom controls
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    compositor.config.targetZoom = Math.min(2.5, compositor.config.targetZoom + 0.35);
  });

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    compositor.config.targetZoom = Math.max(1.0, compositor.config.targetZoom - 0.35);
  });

  document.getElementById('btnZoomReset').addEventListener('click', () => {
    compositor.config.targetZoom = 1.0;
    compositor.config.zoomTargetX = 0.5;
    compositor.config.zoomTargetY = 0.5;
  });

  // Audio Visualizer Meter Loop
  const micBar1 = document.getElementById('micBar1');
  const micBar2 = document.getElementById('micBar2');
  const micBar3 = document.getElementById('micBar3');

  function startMeterLoop() {
    function updateMeter() {
      const { level, peak, isGated } = audioProcessor.getAudioLevels();
      if (micMeterFill) {
        micMeterFill.style.width = `${Math.min(100, Math.round(level * 250))}%`;
      }
      if (micBar1 && micBar2 && micBar3) {
        const lvl = Math.min(1, level * 3);
        micBar1.style.height = `${Math.max(3, Math.round(lvl * 12))}px`;
        micBar2.style.height = `${Math.max(4, Math.round(lvl * 16))}px`;
        micBar3.style.height = `${Math.max(3, Math.round(lvl * 10))}px`;
      }
      if (gateActiveBadge) {
        if (isGated) {
          gateActiveBadge.textContent = 'GATED';
          gateActiveBadge.className = 'dsp-indicator';
        } else {
          gateActiveBadge.textContent = 'SPEECH';
          gateActiveBadge.className = 'dsp-indicator open';
        }
      }
      requestAnimationFrame(updateMeter);
    }
    requestAnimationFrame(updateMeter);
  }
  startMeterLoop();

  // Screen Capture Button Handler
  btnStartCapture.addEventListener('click', async () => {
    try {
      if (!isCapturingScreen) {
        const stream = await capture.startScreenCapture();
        compositor.setScreenSource(capture.screenVideoElement);
        isCapturingScreen = true;
        btnStartCapture.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          Change Screen / Tab
        `;

        // Automatically start Mic capture and initialize audio processor
        try {
          const mic = await capture.startMicCapture();
          cleanAudioStream = await audioProcessor.init(mic, stream);
        } catch (micErr) {
          console.warn("Microphone not available, proceeding with system audio only:", micErr);
          cleanAudioStream = await audioProcessor.init(null, stream);
        }

        btnRecord.disabled = false;

        capture.onStreamEnded = () => {
          isCapturingScreen = false;
          btnStartCapture.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            Select Screen / Window
          `;
          if (exporter.isRecording) {
            btnStop.click();
          }
        };
      } else {
        await capture.startScreenCapture();
        compositor.setScreenSource(capture.screenVideoElement);
      }
    } catch (err) {
      alert("Screen capture was cancelled or failed: " + err.message);
    }
  });

  // Webcam Button Handler
  btnToggleWebcam.addEventListener('click', async () => {
    try {
      if (!isCapturingWebcam) {
        await capture.startWebcamCapture();
        compositor.setWebcamSource(capture.webcamVideoElement);
        compositor.config.showWebcam = true;
        isCapturingWebcam = true;
        btnToggleWebcam.classList.add('btn-primary');
        btnToggleWebcam.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          Webcam Active
        `;
      } else {
        capture.stopWebcam();
        compositor.config.showWebcam = false;
        isCapturingWebcam = false;
        btnToggleWebcam.classList.remove('btn-primary');
        btnToggleWebcam.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          Toggle Webcam
        `;
      }
    } catch (err) {
      alert("Webcam access error: " + err.message);
    }
  });

  // Recording Controls
  btnRecord.addEventListener('click', () => {
    if (!isCapturingScreen) {
      alert("Please select a screen or tab first before recording!");
      return;
    }

    exporter.startRecording(canvas, cleanAudioStream);

    btnRecord.style.display = 'none';
    btnPause.style.display = 'flex';
    btnStop.style.display = 'flex';
    recordingPill.classList.add('active');

    let seconds = 0;
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      recDurationEl.textContent = `${m}:${s}`;
    }, 1000);
  });

  btnPause.addEventListener('click', () => {
    if (exporter.isPaused) {
      exporter.resume();
      btnPause.textContent = 'Pause';
    } else {
      exporter.pause();
      btnPause.textContent = 'Resume';
    }
  });

  btnStop.addEventListener('click', async () => {
    clearInterval(timerInterval);
    recordingPill.classList.remove('active');
    btnRecord.style.display = 'flex';
    btnPause.style.display = 'none';
    btnStop.style.display = 'none';
    recDurationEl.textContent = '00:00';

    currentRecordingBlob = await exporter.stop();
    if (currentRecordingBlob) {
      openReviewModal(currentRecordingBlob);
    }
  });

  function openReviewModal(blob) {
    const videoUrl = URL.createObjectURL(blob);
    previewVideo.src = videoUrl;
    reviewModal.classList.add('open');

    // Reset vocal separation states
    separatedAudioResult = null;
    btnDownloadVocal.style.display = 'none';
    btnDownloadBg.style.display = 'none';
    vocalStatusText.textContent = 'Ready to clean & isolate vocals';
    gifProgressText.textContent = '';
  }

  btnCloseModal.addEventListener('click', () => {
    reviewModal.classList.remove('open');
    previewVideo.pause();
    previewVideo.src = '';
  });

  // Download Video
  btnDownloadVideo.addEventListener('click', () => {
    if (!currentRecordingBlob) return;
    const isMp4 = exporter.selectedMime && exporter.selectedMime.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    exporter.downloadBlob(currentRecordingBlob, `Recordly-Video-${Date.now()}.${ext}`);
  });

  // Vocal Separator and Background Noise Stripper
  btnSeparateVocals.addEventListener('click', async () => {
    if (!currentRecordingBlob) return;
    vocalStatusText.innerHTML = '<span style="color:#f59e0b">Processing DSP Vocal Separation...</span>';
    btnSeparateVocals.disabled = true;

    try {
      separatedAudioResult = await vocalSeparator.processAudio(currentRecordingBlob, { vocalStrength: 0.9 });

      vocalStatusText.innerHTML = '<span style="color:#10b981">✓ Vocals Separated & Background Isolated!</span>';
      btnDownloadVocal.style.display = 'inline-flex';
      btnDownloadBg.style.display = 'inline-flex';
    } catch (e) {
      console.error(e);
      vocalStatusText.innerHTML = `<span style="color:#ef4444">Separation Error: ${e.message}</span>`;
    } finally {
      btnSeparateVocals.disabled = false;
    }
  });

  btnDownloadVocal.addEventListener('click', () => {
    if (separatedAudioResult && separatedAudioResult.vocalBlob) {
      exporter.downloadBlob(separatedAudioResult.vocalBlob, `Recordly-Clean-Vocals-${Date.now()}.wav`);
    }
  });

  btnDownloadBg.addEventListener('click', () => {
    if (separatedAudioResult && separatedAudioResult.backgroundBlob) {
      exporter.downloadBlob(separatedAudioResult.backgroundBlob, `Recordly-Background-Track-${Date.now()}.wav`);
    }
  });

  // GIF Export
  btnExportGif.addEventListener('click', async () => {
    if (!previewVideo.duration) {
      alert("Video not ready for GIF export.");
      return;
    }

    btnExportGif.disabled = true;
    gifProgressText.textContent = 'Generating high-quality GIF...';

    try {
      const vid = previewVideo;
      const originalTime = vid.currentTime;
      const targetW = 640;
      const targetH = Math.round(targetW * (canvas.height / canvas.width));
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetW;
      offscreenCanvas.height = targetH;
      const ctx = offscreenCanvas.getContext('2d');

      const encoder = new GifEncoder(targetW, targetH);
      encoder.setDelay(100); // 10 fps
      encoder.start();

      const duration = Math.min(vid.duration, 10); // Cap at 10 seconds for reasonable GIF file size
      const totalFrames = Math.floor(duration * 10);

      for (let i = 0; i < totalFrames; i++) {
        vid.currentTime = (i / 10);
        await new Promise(res => vid.addEventListener('seeked', res, { once: true }));

        ctx.drawImage(vid, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        encoder.addFrame(imgData, 100);

        gifProgressText.textContent = `Rendering GIF: ${Math.round(((i + 1) / totalFrames) * 100)}%`;
      }

      const gifBytes = encoder.finish();
      const gifBlob = new Blob([gifBytes], { type: 'image/gif' });
      exporter.downloadBlob(gifBlob, `Recordly-Demo-${Date.now()}.gif`);
      gifProgressText.textContent = '✓ GIF Downloaded!';
    } catch (e) {
      console.error("GIF export failed:", e);
      gifProgressText.textContent = 'GIF export failed: ' + e.message;
    } finally {
      btnExportGif.disabled = false;
    }
  });
});
