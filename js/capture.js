/**
 * StreamCapture - Manages DisplayMedia (Screen), UserMedia (Microphone & Webcam)
 */
class StreamCapture {
  constructor() {
    this.screenStream = null;
    this.micStream = null;
    this.webcamStream = null;
    this.screenVideoElement = document.createElement('video');
    this.screenVideoElement.muted = true;
    this.screenVideoElement.playsInline = true;

    this.webcamVideoElement = document.createElement('video');
    this.webcamVideoElement.muted = true;
    this.webcamVideoElement.playsInline = true;

    this.onStreamEnded = null;
  }

  /**
   * Request screen capture with system audio
   */
  async startScreenCapture(fps = 60) {
    const displayMediaOptions = {
      video: {
        cursor: "always",
        frameRate: { ideal: fps, max: 60 },
        displaySurface: "monitor"
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      this.screenVideoElement.srcObject = this.screenStream;
      await this.screenVideoElement.play();

      const screenTrack = this.screenStream.getVideoTracks()[0];
      screenTrack.onended = () => {
        if (this.onStreamEnded) this.onStreamEnded();
      };

      return this.screenStream;
    } catch (err) {
      console.error("Screen capture error:", err);
      throw err;
    }
  }

  /**
   * Request microphone stream
   */
  async startMicCapture(deviceId = null) {
    const audioOptions = {
      echoCancellation: true,
      noiseSuppression: false, // Let our DSP handle noise cleanly
      autoGainControl: true
    };
    if (deviceId) {
      audioOptions.deviceId = { exact: deviceId };
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: audioOptions });
      return this.micStream;
    } catch (err) {
      console.error("Microphone capture error:", err);
      throw err;
    }
  }

  /**
   * Request webcam stream
   */
  async startWebcamCapture(deviceId = null) {
    const videoOptions = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    };
    if (deviceId) {
      videoOptions.deviceId = { exact: deviceId };
    }

    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: videoOptions });
      this.webcamVideoElement.srcObject = this.webcamStream;
      await this.webcamVideoElement.play();
      return this.webcamStream;
    } catch (err) {
      console.error("Webcam capture error:", err);
      throw err;
    }
  }

  stopScreen() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this.screenVideoElement.srcObject = null;
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(t => t.stop());
      this.webcamStream = null;
    }
    this.webcamVideoElement.srcObject = null;
  }

  stopAll() {
    this.stopScreen();
    this.stopMic();
    this.stopWebcam();
  }

  async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput')
      };
    } catch (e) {
      return { audioInputs: [], videoInputs: [] };
    }
  }
}

window.StreamCapture = StreamCapture;
