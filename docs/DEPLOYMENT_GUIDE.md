# 🚀 DEPLOYMENT GUIDE: Launching Mochi

Follow these steps to bring Mochi to life on your local machine and hardware.

## 1. Prerequisites
- **Node.js:** v18+ 
- **Ollama:** Installed and running locally.
- **Hardware:** ESP32 (WROOM), 16x2 LCD, SSD1306 OLED, Sensors.

## 2. Environment Configuration
Create a `.env` file in the `backend/` directory with the following keys:
```env
SPOTIFY_CLIENT_ID=your_id_here
SPOTIFY_CLIENT_SECRET=your_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
OPENWEATHER_API_KEY=your_key_here
OLLAMA_URL=http://127.0.0.1:11434/api/generate
```

## 3. Running the Gateway (Backend)
```bash
cd backend
npm install
node server.js
```
The server will start on [http://127.0.0.1:3000].

## 4. Running the Dashboard (Frontend)
```bash
cd frontend
npm install
npm run dev
```
Access the dashboard at [http://localhost:3001] (or the Next.js default port).

## 5. Setting up the Brain (Ollama)
Mochi uses the `llama3.2:1b` model for low-latency responses.
```bash
ollama run llama3.2:1b
```

## 6. Flashing the Hardware (ESP32)
1. Open `esp32_mochi/esp32_mochi.ino` in Arduino IDE.
2. Ensure you have the following libraries installed:
    - `WebSocketsClient`
    - `ArduinoJson`
    - `LiquidCrystal`
    - `Adafruit SSD1306`
3. Update the `websocket_server` variable in the code to your PC's local IP (Current: `192.168.0.192`).
4. Select board **ESP32 DEVKIT Module**.
5. Upload the code.

## 7. Spotify Authentication
Once the backend is running, visit:
[http://127.0.0.1:3000/login]
Log in with your Spotify account to grant playback permissions. Mochi will store tokens in `spotify_tokens.json` automatically for future use.

---
> [!CAUTION]
> Ensure the ESP32 and the Backend are on the **same WiFi network**. If Mochi is silent, check the `websocket_server` IP address in the Arduino code.
