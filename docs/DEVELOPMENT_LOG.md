# 📜 DEVELOPMENT LOG: Muon's Evolution

A timeline of key updates and "pixel-perfect" breakthroughs.

## v1.0.4 - [Current] "Context Awareness & UI Polish"
- **AI Brain Upgrade:** Muon's Ollama brain now receives real-time snapshots of the Muon Hub (Weather, Song, Mood). It can now answer "What is playing?" or "How is the weather?" without hallucinations.
- **UI Scaling:** All bento cards scaled down by ~10% to prevent overflow and improve the "tight" layout on smaller screens.
- **Simplified Branding:** Branding transitioned from Mochi to **Muon**. Interface renamed to **Muon Hub** for a cleaner, modern feel.

## v1.0.3 - "The Control Center"
- **Spotify Integration:** Added full interactive playback controls (Play, Pause, Skip) directly to the Web UI.
- **8-Bit Icon Pack:** Standardized all Muon Hub icons to a custom-drawn 16x16-style SVG pack. No more generic icons.
- **Buzzer Patterns:** Refined the firmware patterns for "chirp" and "alert" to make them sound less aggressive and more robotic.

## v1.0.2 - "Atmosphere Awareness"
- **Rain Warning:** Implemented the `WEATHER_UPDATE` logic to detect approaching rain and trigger a blue RGB flash + buzzer chirp.
- **WebSocket Gateway:** Introduced the Node.js backend to replace direct client-to-ESP32 connections, allowing for state orchestration.

## v1.0.1 - "The Physical Soul"
- **Eye Animations:** Initial blink and wander logic added to the SSD1306 OLED via the ESP32 firmware.
- **Touch Interaction:** Integrated the capacitive touch sensor on GPIO 4 to trigger "Happy" reactions.

---
> "Version 1.0.4 is the most stable and visual version to date."
