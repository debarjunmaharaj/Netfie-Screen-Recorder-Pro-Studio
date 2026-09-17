# 🎙️ Recordly Studio (Web Client Edition)

A 100% client-side, zero-install screen recorder inspired by **Recordly** with real-time background noise cleaner and offline vocal separator.

Runs directly inside any modern web browser (Google Chrome, Microsoft Edge, Brave, etc.) on Windows, Mac, or Linux without installing any software or native binaries.

---

## ✨ Features Included

### 1. 🎨 Recordly Presentation Canvas Engine
- **Canvas Aspect Ratios**: Switch between **16:9** (Landscape YouTube/Demo), **9:16** (TikTok/Reels/Shorts), **1:1** (Square), or **4:3**.
- **Designer Backdrops**: Sunset gradient, Nordic minimal, Cyber neon, Emerald, Blurred screen backdrop, or custom dark themes.
- **Window Framing**: macOS-style traffic light window header, customizable title, rounded corners, and customizable drop shadow depths.
- **Auto-Zoom & Pan**: Smooth zoom-in controls with focus coordinate centering.
- **Click Ripples**: Animated visual click indicators when clicking on the presentation canvas.

### 2. 📹 Webcam Bubble Overlay
- Picture-in-Picture webcam overlay.
- Shapes: **Circle Bubble** or **Rounded Square**.
- Resizable slider, horizontal mirroring toggle, and sleek white border ring.

### 3. 🧹 Real-Time DSP Background Noise Cleaner
- **Butterworth High-Pass Filter (85Hz)**: Cuts desk bumps, floor rumble, and AC hum.
- **Low-Pass Filter (13.5kHz)**: Eliminates high-frequency coil whine and squeaks.
- **Speech Presence Peaking EQ (3kHz)**: Delivers broadcast podcast clarity and intelligibility.
- **Real-Time Noise Gate**: Auto-silences fan hum and room silence when you're not speaking.
- **Dynamic Range Compressor**: Smooths out volume spikes.
- **Live Input Meter**: Visual decibel level bar with live gate status indicators.

### 4. ⚡ Offline Vocal Separator & Stem Cleaner
- Isolate human speech vocals from background audio into an isolated `.wav` vocal track.
- Inverse background separation to isolate music and system audio without voice leakage.

### 5. 💾 Multi-Format Export
- High-bitrate 60FPS **WebM / MP4** video.
- **Animated GIF** generator with neural-net color quantization and LZW encoding.
- Separated audio **WAV** stems.

---

## 🚀 How to Run

### Option 1: Just Double-Click
Simply open `index.html` in your favorite web browser (Google Chrome, Microsoft Edge, Brave, etc.).

### Option 2: Run via Local HTTP Server (Recommended for full Web Audio permissions)
If you have Python or Node installed, you can launch a local server:

**Using Python:**
```bash
python -m http.server 8080
```
Then visit: `http://localhost:8080`

**Using Node / npx:**
```bash
npx serve
```
