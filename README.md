<p align="center">
  <img src="https://camo.githubusercontent.com/74892fd47f89c1795cc700b6689b18c588ed37ee5920a58657c735258cfd3dc5/68747470733a2f2f6e65746669652e636f6d2f77702d636f6e74656e742f75706c6f6164732f323032352f30332f4e65746669655f5f315f2d72656d6f766562672d707265766965772d343530783137342e706e672e77656270" alt="Netfie Logo" width="380" />
</p>

# Netfie Screen Recorder Pro Studio, Real-Time Vocal Isolator & Chrome Extension

**Netfie Screen Recorder** is an advanced, 100% client-side studio recording application and official **Google Chrome Extension (Manifest V3)** designed for crystal-clear presentations, YouTube demos, tutorials, and social media reels.

Engineered with **real-time AudioWorklet spectral vocal isolation** (eliminates keyboard clatter, AC hum, fan roar, and ambient room noise on the fly), **smart click-to-zoom (up to 5.0x)**, **unthrottled background multi-tab capture**, and **Bright & Dark dashboard themes**.

---

## Key Features

### 1. 100% Offline & Zero Network Impact (No Internet Needed)
- **Completely Air-Gapped & Offline**: Functions with zero internet access. Works in airplane mode or on isolated networks.
- **Zero Outbound Traffic**: Content Security Policy strictly enforces `connect-src 'none'`. No telemetry, no external API calls, and zero bandwidth consumption.
- **Self-Contained Bundling**: All scripts, fonts, icons, NeuQuant GIF encoders, and Web Audio DSP filters run locally in-browser.

### 2. Dual Bright & Dark Dashboard Modes
- **One-Click Theme Toggle**: Instantly switch between an elegant, eye-friendly **Dark Studio** mode and a crisp, modern **Bright Light** mode.
- **Theme Memory**: Automatically saves your preference in `localStorage` across studio sessions and popup launches.
- **Refined Visuals**: Custom macOS chrome frames, gradient backdrop presets (Sunset, Nord, Cyber, Emerald), and smooth glassmorphism controls.

### 3. Real-Time Spectral Vocal Isolation (AudioWorklet)
- **Continuous Background Profiling**: Automatically listens to the background noise floor during pauses and subtracts it from the signal via spectral subtraction (Wiener filtering).
- **Speech-Band Hard Masking**: Filters out everything outside the human vocal register (85Hz - 3,500Hz) so only clean speech reaches the recording.
- **Dynamic Speech Gate & Compressor**: Eliminates low-volume room hiss and evens out loud audio spikes.
- **Dedicated Mic Route**: System/screen audio does not contaminate the vocal isolation pipeline.

### 3. Smart Focus & Auto-Zoom (Up to 5.0x)
- **Interactive Click-to-Zoom**: Click anywhere on the canvas or screen preview to zoom directly into that coordinate smoothly and automatically zoom out after a customizable hold time.
- **Zoom Level Controls**: Scale up from 1.0x to 5.0x with smooth panning and centered focus.
- **Animated Click Ripples**: Highlights mouse clicks with radiant ripple indicators.

### 4. Draggable Webcam Bubble
- **Picture-in-Picture Bubble**: Overlay your camera anywhere on the recording canvas.
- **Shapes & Sizing**: Choose between **Circle** or **Squircle (Rounded Rectangle)** with resizable dimensions and mirror toggling.

### 5. Custom Brand Logo & Watermark Overlay
- **Image Upload**: Upload any PNG, JPG, SVG, or WebP logo file directly into your recording.
- **Corner Positioning**: Snap watermark dynamically to **Top Right**, **Top Left**, **Bottom Right**, or **Bottom Left**.
- **Live Scaling & Opacity**: Adjust size slider (40px–260px) and transparency (10%–100%) in real-time with automatic drop-shadow for high contrast against any video background.
- **Hard-Baked Export**: Watermark is rendered straight into the composited canvas stream, ensuring it's included in live MP4 recordings and exported GIFs.

### 6. Multi-Tab & Background Recording Resilience
- **Unthrottled Web Worker Compositor**: Keeps pumping 60 FPS video frames into `canvas.captureStream()` even when you navigate to other browser tabs or background windows.
- No video freeze, stutter, or dropped frames when multitasking.

### 7. High-Definition Multi-Format Export
- High-bitrate 60 FPS **MP4** video output.
- **Animated GIF** creator with NeuQuant neural-net color quantization.
- **Offline Vocal Stem Separator**: Split post-recording audio into isolated speech `.wav` and background `.wav` stems.

---

## Installation as Google Chrome Extension (Manifest V3)

1. Open **Google Chrome** (or Microsoft Edge / Brave / Opera).
2. Navigate to the extensions page:
   ```
   chrome://extensions
   ```
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select this folder:
   ```
   E:\net-recoder
   ```
6. **Done!** Click the **Netfie** icon in your toolbar to launch the quick popup or press **`Ctrl+Shift+R`** anytime to launch the full studio!

---

## Running as a Standalone Web App

You can also run Netfie Screen Recorder directly in any modern browser without installing the extension:

### Option 1: Double-Click
Double-click `index.html` to run in your default browser.

### Option 2: Local HTTP Server
**Using Python:**
```bash
python -m http.server 8080
```
Then visit: `http://localhost:8080`

**Using Node:**
```bash
npx serve
```

---

## Developer & Company Details

| Detail | Information |
| :--- | :--- |
| **Agency Name** | **Netfie** (Authorized Web Development Partner) |
| **Official Website** | [https://netfie.com](https://netfie.com/) |
| **Official Android App** | [Get it on Google Play Store](https://play.google.com/store/apps/details?id=com.netfie.netfiebulksmssender.netfiebulksmssender) |
| **Email Inquiries** | [netfieofficial@gmail.com](mailto:netfieofficial@gmail.com) |
| **WhatsApp Support** | [+8801884189495](https://wa.me/8801884189495) |
| **Direct Phone Call** | 01772326146 |
| **Lead Developer** | **Debarjun Chakraborty** |
| **Developer Portfolio** | [https://boost4all.com/@debarjunofficial](https://boost4all.com/@debarjunofficial) |
| **Developer Facebook** | [Debarjun Chakraborty Profile](https://www.facebook.com/Debarjunmaharaj/) |

---

<p align="center">
  <sub>Built with care by <strong>Netfie</strong> & <strong>Debarjun Chakraborty</strong>. All rights reserved.</sub>
</p>
