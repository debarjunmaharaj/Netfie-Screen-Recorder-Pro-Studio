<p align="center">
  <img src="https://camo.githubusercontent.com/74892fd47f89c1795cc700b6689b18c588ed37ee5920a58657c735258cfd3dc5/68747470733a2f2f6e65746669652e636f6d2f77702d636f6e74656e742f75706c6f6164732f323032352f30332f4e65746669655f5f315f2d72656d6f766562672d707265766965772d343530783137342e706e672e77656270" alt="Netfie Logo" width="380" />
</p>

# Recordly Studio Pro - Browser & Chrome Extension Screen Recorder

A 100% client-side, zero-install screen recorder inspired by **Recordly** with real-time DSP background noise cleaner, offline vocal separator, smart interactive zoom, background tab multi-capture, and MP4 export.

Available as both a **standalone web app** and an installable **Google Chrome Extension (Manifest V3)**.

---

## Key Features

### 1. Presentation Canvas & Studio Effects
- **Multi-Format Canvas**: One-click switching between **16:9** (YouTube/Demos), **9:16** (TikTok/Reels/Shorts), **1:1** (Square/Social), and **4:3**.
- **Designer Backdrops**: Sunset gradient, Nordic minimal, Cyber neon, Emerald glow, blurred screen reflections, and dark studio themes.
- **macOS Window Frame**: Authentic traffic-light controls (red, yellow, green), customizable window title, adjustable rounded corners, and deep drop shadows.
- **Smart Focus & Auto-Zoom (Up to 5.0x)**: Click anywhere on the screen during recording or preview to smoothly zoom directly to that coordinate and automatically un-zoom after a customizable hold duration.
- **Click Ripple Indicators**: Sleek animated rings highlight cursor clicks for tutorials and demos.

### 2. Draggable Webcam Bubble
- Picture-in-Picture webcam overlay.
- Shapes: **Circle Bubble** or **Squircle (Rounded Square)**.
- Freely draggable across the canvas stage, resizable slider, mirror camera toggle, and border stroke.

### 3. Real-Time Web Audio DSP Noise Cleaner
- **Sub-Rumble High-Pass Filter (<85Hz)**: Cuts desk bumps, floor rumble, and AC low frequencies.
- **Speech Presence Peaking EQ (3.2kHz)**: Delivers podcast-grade vocal intelligibility and clarity.
- **Dynamic Real-Time Noise Gate**: Auto-silences background room hiss and fan noise when not speaking.
- **Dynamic Range Compressor**: Prevents microphone clipping and balances loudness.
- **Live Decibel Meter & Speech Indicator**: Real-time visual feedback for audio levels and gate activation.

### 4. Offline Vocal Separator & Stem Cleaner
- Post-recording offline speech separator that isolates human vocals into clean `.wav` audio stems.
- Background stem extraction to separate music and system audio from voice.

### 5. Multi-Tab & Background Recording Resilience
- **Unthrottled Web Worker Compositor**: Overcomes modern browser background tab throttling (`requestAnimationFrame` freeze) by driving 60 FPS compositor ticks via a dedicated background worker.
- Seamlessly record across different browser tabs, windows, and desktop applications without video freezing.

### 6. High-Definition Export
- High-bitrate 60 FPS **MP4** video output.
- Instant video preview modal with direct download.
- Separated vocal and background `.wav` stems.

---

## Installation as Google Chrome Extension (Manifest V3)

Recordly Studio Pro is fully configured as a Chrome Extension with a quick launcher popup, background service worker, and keyboard shortcuts!

1. Open **Google Chrome** (or Microsoft Edge / Brave).
2. Go to the extensions management page:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this folder: `E:\net-recoder`
6. **Done!** Click the Recordly icon in your browser toolbar to open the quick launcher popup, or press **`Ctrl+Shift+R`** anytime to launch the full studio!

---

## Running as a Standalone Web Page

You can also run Recordly directly without installing any extension:

### Option 1: Double-Click
Simply double-click `index.html` to open it in any web browser.

### Option 2: Local HTTP Server (Recommended)
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