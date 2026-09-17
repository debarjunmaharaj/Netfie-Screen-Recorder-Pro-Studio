/**
 * AudioProcessor - Studio Noise Cleaner & DSP Enhancement Pipeline
 * Provides:
 * - High-pass filter (cuts low rumble < 80Hz)
 * - Low-pass filter (cuts high hiss > 14kHz)
 * - Peaking EQ (Speech clarity / presence boost at 2.8kHz - 3.5kHz)
 * - Real-time noise gate (threshold with soft envelope to silence room noise / fan hum)
 * - Dynamic range compressor (smooth broadcast podcast volume)
 * - Real-time audio analyzer for visualizer meters
 */
class StudioAudioProcessor {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.cleanDestination = null;
    this.analyzer = null;
    
    // DSP Nodes
    this.highPass = null;
    this.lowPass = null;
    this.clarityEQ = null;
    this.compressor = null;
    this.gateGain = null;
    this.masterGain = null;

    // Settings
    this.settings = {
      noiseCleanerEnabled: true,
      gateThreshold: -50, // dB
      gateAttack: 0.02,   // seconds
      gateRelease: 0.15,  // seconds
      clarityBoost: 3.5,  // dB
      compressorEnabled: true,
      micVolume: 1.0,
      systemVolume: 1.0
    };

    this.gateEnvelope = 0;
    this.isGatingActive = false;
    this.animFrameId = null;
  }

  async init(micStream, sysStream = null) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.cleanDestination = this.audioCtx.createMediaStreamDestination();

    // Setup DSP chain
    this.setupNodes();

    // Connect Microphone
    if (micStream && micStream.getAudioTracks().length > 0) {
      this.micSource = this.audioCtx.createMediaStreamSource(micStream);
      this.micGainNode = this.audioCtx.createGain();
      this.micGainNode.gain.value = this.settings.micVolume;

      // Connect: Mic -> MicGain -> DSP Chain -> Output
      this.micSource.connect(this.micGainNode);
      this.micGainNode.connect(this.highPass);
    }

    // Connect System Audio (if available) directly to master output with its own volume
    if (sysStream && sysStream.getAudioTracks().length > 0) {
      this.sysSource = this.audioCtx.createMediaStreamSource(sysStream);
      this.sysGainNode = this.audioCtx.createGain();
      this.sysGainNode.gain.value = this.settings.systemVolume;
      this.sysSource.connect(this.sysGainNode);
      this.sysGainNode.connect(this.masterGain);
    }

    // Start background gate monitoring loop
    this.startNoiseGateLoop();

    return this.cleanDestination.stream;
  }

  setupNodes() {
    const ctx = this.audioCtx;

    // 1. High Pass (Remove desk thumps, AC rumble, sub-bass noise)
    this.highPass = ctx.createBiquadFilter();
    this.highPass.type = 'highpass';
    this.highPass.frequency.value = 85; // Hz
    this.highPass.Q.value = 0.707;

    // 2. Low Pass (Remove high-frequency squeaks, coil whine > 14kHz)
    this.lowPass = ctx.createBiquadFilter();
    this.lowPass.type = 'lowpass';
    this.lowPass.frequency.value = 13500; // Hz
    this.lowPass.Q.value = 0.707;

    // 3. Speech Presence Peaking Filter (Brings warmth & vocal intelligibility)
    this.clarityEQ = ctx.createBiquadFilter();
    this.clarityEQ.type = 'peaking';
    this.clarityEQ.frequency.value = 3000; // Hz
    this.clarityEQ.gain.value = this.settings.clarityBoost;
    this.clarityEQ.Q.value = 1.0;

    // 4. Noise Gate Gain Node
    this.gateGain = ctx.createGain();
    this.gateGain.gain.value = 1.0;

    // 5. Broadcast Compressor (Evens out loud yells and quiet whispers)
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24; // dB
    this.compressor.knee.value = 12;      // dB
    this.compressor.ratio.value = 3.5;    // 3.5:1
    this.compressor.attack.value = 0.003; // 3ms
    this.compressor.release.value = 0.18; // 180ms

    // 6. Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // 7. Analyzer for Visual Meter
    this.analyzer = ctx.createAnalyser();
    this.analyzer.fftSize = 512;
    this.analyzer.smoothingTimeConstant = 0.8;

    // Wire DSP Filter Chain:
    // HighPass -> LowPass -> ClarityEQ -> GateGain -> Compressor -> MasterGain -> Destination & Analyzer
    this.highPass.connect(this.lowPass);
    this.lowPass.connect(this.clarityEQ);
    this.clarityEQ.connect(this.gateGain);
    this.gateGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.cleanDestination);
    this.masterGain.connect(this.analyzer);
  }

  startNoiseGateLoop() {
    if (!this.analyzer) return;
    const buffer = new Float32Array(this.analyzer.fftSize);

    const updateGate = () => {
      if (!this.audioCtx || this.audioCtx.state === 'closed') return;

      if (this.settings.noiseCleanerEnabled && this.gateGain) {
        this.analyzer.getFloatTimeDomainData(buffer);

        // Compute RMS
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;

        const threshold = this.settings.gateThreshold;
        const now = this.audioCtx.currentTime;

        if (db > threshold) {
          // Voice detected -> open gate smoothly
          this.gateGain.gain.setTargetAtTime(1.0, now, this.settings.gateAttack);
          this.isGatingActive = false;
        } else {
          // Below threshold (noise/silence) -> attenuate smoothly by 36dB (almost silent)
          this.gateGain.gain.setTargetAtTime(0.015, now, this.settings.gateRelease);
          this.isGatingActive = true;
        }
      } else if (this.gateGain) {
        // Disabled -> pass through
        this.gateGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
        this.isGatingActive = false;
      }

      this.animFrameId = requestAnimationFrame(updateGate);
    };

    this.animFrameId = requestAnimationFrame(updateGate);
  }

  setNoiseCleaner(enabled) {
    this.settings.noiseCleanerEnabled = enabled;
    if (!enabled && this.gateGain && this.audioCtx) {
      this.gateGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      if (this.highPass) this.highPass.frequency.setValueAtTime(10, this.audioCtx.currentTime);
      if (this.lowPass) this.lowPass.frequency.setValueAtTime(22000, this.audioCtx.currentTime);
    } else if (enabled && this.audioCtx) {
      if (this.highPass) this.highPass.frequency.setValueAtTime(85, this.audioCtx.currentTime);
      if (this.lowPass) this.lowPass.frequency.setValueAtTime(13500, this.audioCtx.currentTime);
    }
  }

  setGateThreshold(dbValue) {
    this.settings.gateThreshold = parseFloat(dbValue);
  }

  setMicVolume(vol) {
    this.settings.micVolume = parseFloat(vol);
    if (this.micGainNode && this.audioCtx) {
      this.micGainNode.gain.setValueAtTime(this.settings.micVolume, this.audioCtx.currentTime);
    }
  }

  setSystemVolume(vol) {
    this.settings.systemVolume = parseFloat(vol);
    if (this.sysGainNode && this.audioCtx) {
      this.sysGainNode.gain.setValueAtTime(this.settings.systemVolume, this.audioCtx.currentTime);
    }
  }

  getAudioLevels() {
    if (!this.analyzer) return { level: 0, peak: 0, isGated: false };
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(dataArray);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = dataArray[i];
      sum += val;
      if (val > peak) peak = val;
    }
    const avg = sum / dataArray.length;

    return {
      level: avg / 255,
      peak: peak / 255,
      isGated: this.isGatingActive
    };
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {
        console.warn('AudioContext close error:', e);
      }
    }
  }
}

window.StudioAudioProcessor = StudioAudioProcessor;
