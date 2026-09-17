/**
 * MediaRecorder & File Exporter
 * Handles recording from Canvas & Web Audio stream,
 * Generating MP4/WebM files, and saving to disk
 */
class MediaExporter {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.recordStartTime = 0;
    this.recordDuration = 0;
    this.isRecording = false;
    this.isPaused = false;
  }

  startRecording(compositeCanvas, audioStream = null, options = {}) {
    this.recordedChunks = [];
    this.recordedBlob = null;

    // Get 60fps stream from canvas
    const canvasStream = compositeCanvas.captureStream(60);
    const combinedTracks = [...canvasStream.getVideoTracks()];

    if (audioStream && audioStream.getAudioTracks().length > 0) {
      audioStream.getAudioTracks().forEach(track => combinedTracks.push(track));
    }

    const combinedStream = new MediaStream(combinedTracks);

    // Pick best supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];

    let selectedMime = '';
    for (let mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    const recorderOptions = {
      mimeType: selectedMime || undefined,
      videoBitsPerSecond: options.videoBitrate || 8000000 // 8 Mbps high-clarity
    };

    this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      this.isPaused = false;
      this.recordDuration = (performance.now() - this.recordStartTime) / 1000;
      this.recordedBlob = new Blob(this.recordedChunks, { type: selectedMime || 'video/webm' });
    };

    this.mediaRecorder.start(1000); // 1-second chunks for reliability
    this.recordStartTime = performance.now();
    this.isRecording = true;
    this.isPaused = false;
    this.selectedMime = selectedMime;

    return this.mediaRecorder;
  }

  pause() {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(this.recordedBlob);
        return;
      }
      this.mediaRecorder.addEventListener('stop', () => {
        resolve(this.recordedBlob);
      }, { once: true });
      this.mediaRecorder.stop();
    });
  }

  /**
   * Helper to trigger download of Blob
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
  }
}

window.MediaExporter = MediaExporter;
