# 🤖 Desk Bot (Muon)

Desk Bot is an intelligent desk companion combining **Hardware**, **Backend**, and **Frontend** to create a seamless interactive experience. Featuring an ESP32-powered robot (Muon) that reacts to music and system states via the Muon Hub.

---

## 🚀 Overview

This project is split into three main components:
1.  **Frontend**: The Muon Hub, a modern Next.js interface for controlling and visualizing Muon's state.
2.  **Backend**: A Node.js Express server handling real-time WebSocket communication and Spotify integration.
3.  **Hardware (ESP32)**: The firmware for the Muon droid, managing OLED displays and movement.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Real-time**: WebSockets (`ws`)
- **APIs**: Spotify Web API

### Hardware
- **Controller**: ESP32
- **Language**: C++ (Arduino Framework)
- **Features**: OLED Display, Wi-Fi Connectivity

---

## 📂 Project Structure

```text
.
├── backend/            # Express server & Spotify integration
├── frontend/           # Next.js web application
├── esp32_muon/         # ESP32 Arduino firmware
├── docs/               # Project documentation (FULL GUIDELINE IS HERE)
├── LICENSE             # MIT License
└── README.md           # Project guide
```

---

## ⚡ Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your .env with Spotify credentials
node server.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Hardware Setup
- Open `esp32_muon/esp32_muon.ino` in Arduino IDE or VS Code (PIIO).
- Update Wi-Fi and Server IP credentials.
- Flash to your ESP32.
- READ THE docs FOLDER FOR GUIDELINES

---

## ✨ Features
- **Spotify Integration**: Real-time music synchronization.
- **WebSocket Communication**: Low-latency control between the Muon Hub and Muon.
- **Pixel Art Aesthetics**: A beautiful "Bento" style Muon Hub with retro vibes.
- **Modular Hardware**: Easily extensible ESP32 firmware.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
