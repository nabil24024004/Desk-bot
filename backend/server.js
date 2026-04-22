// --- backend/server.js ---
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// --- State Management ---
let esp32Client = null;
let webClients = new Set(); // Changed to a Set to handle multiple tabs/reloads safely
let currentMood = 'idle';
let currentTrackStr = 'Silence';
let rainWarning = false;

// --- Spotify Setup ---
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const fs = require('fs');
const TOKEN_PATH = './spotify_tokens.json';

if (fs.existsSync(TOKEN_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    console.log('✅ Loaded Spotify tokens from file. Refreshing...');

    spotifyApi.refreshAccessToken().then(data => {
      spotifyApi.setAccessToken(data.body['access_token']);
      tokens.access_token = data.body['access_token'];
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

      setInterval(() => {
        spotifyApi.refreshAccessToken().then(data => {
          spotifyApi.setAccessToken(data.body['access_token']);
          tokens.access_token = data.body['access_token'];
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        }).catch(err => console.error("Spotify Refresh Error:", err.message));
      }, data.body['expires_in'] * 1000 - 60000);
    }).catch(err => console.error("⚠️ Saved Spotify token expired, please visit http://127.0.0.1:3000/login"));
  } catch (err) { }
}

// Spotify OAuth Flow
app.get('/login', (req, res) => {
  const scopes = ['user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) return res.send(`Callback Error: ${error}`);

  spotifyApi.authorizationCodeGrant(code).then(data => {
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    // Save to file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({
      access_token: data.body['access_token'],
      refresh_token: data.body['refresh_token']
    }));

    // Auto-refresh token mechanism
    setInterval(() => {
      spotifyApi.refreshAccessToken().then(updateData => {
        spotifyApi.setAccessToken(updateData.body['access_token']);
        try {
          const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
          tokens.access_token = updateData.body['access_token'];
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        } catch (e) { }
      }).catch(err => console.error("Spotify Refresh Error:", err.message)); // Crash protection
    }, data.body['expires_in'] * 1000 - 60000);

    res.send('Spotify Successfully Authenticated! You can close this tab and return to the Muon Hub.');
  }).catch(err => res.send(`Error getting Tokens: ${err}`));
});

// --- WebSocket Handling ---
wss.on('connection', (ws, req) => {
  const isESP32 = req.url.includes('esp32');

  if (isESP32) {
    esp32Client = ws;
    console.log('🤖 ESP32 Muon Connected!');
    broadcastToWeb({ type: 'BOT_STATUS', connected: true });
  } else {
    webClients.add(ws);
    console.log(`💻 Muon Hub Connected! (Active: ${webClients.size})`);

    // Hydrate new clients with current state
    ws.send(JSON.stringify({ type: 'BOT_STATUS', connected: esp32Client !== null }));
    ws.send(JSON.stringify({ type: 'MOOD_UPDATE', mood: currentMood }));
    ws.send(JSON.stringify({ type: 'WEATHER_UPDATE', temp: currentTemp, desc: currentDesc }));
    ws.send(JSON.stringify({ type: 'SPOTIFY_UPDATE', track: currentTrackStr }));
  }

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);

    // Handle Muon Touch Sensor
    if (data.type === 'TOUCH_EVENT') {
      currentMood = 'happy';
      sendToESP32({ type: 'MOOD_CHANGE', mood: 'happy' });
      sendToESP32({ type: 'BUZZER_ALERT', pattern: 'chirp' });
      broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'happy' });

      setTimeout(() => {
        currentMood = 'idle';
        sendToESP32({ type: 'MOOD_CHANGE', mood: 'idle' });
        broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'idle' });
      }, 5000);
    }

    // Handle Chat from Web UI sent to Ollama
    if (data.type === 'CHAT_REQUEST') {
      currentMood = 'thinking';
      sendToESP32({ type: 'MOOD_CHANGE', mood: 'thinking' });
      broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'thinking' });

      try {
        const muonPersonality = `Role: You are Muon, a physical AI desk companion created by Abrar.
Capabilities: Spotify sync, weather tracking, facial expressions, and rhythmic humming.
Current Muon Hub Status:
- Mood: ${currentMood}
- Weather: ${currentDesc}, ${currentTemp}°C
- Spotify: Playing ${currentTrackStr}
Instruction: Speak directly to the user. DO NOT use asterisks (*) or narrate your actions (e.g., do not say "*winks*" or "*flickers*"). Use the Current Muon Hub Status to answer questions directly.
Style: Cute, helpful, slightly robotic, but very direct. Maximum 1 sentence.
User Query: ${data.text}`;

        const response = await axios.post(process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate', {
          model: 'llama3.2:1b', // MUST match downloaded model
          prompt: muonPersonality,
          stream: false
        }, { timeout: 15000 }); // 15-second timeout so it doesn't hang forever

        broadcastToWeb({ type: 'CHAT_RESPONSE', text: response.data.response });

        currentMood = 'talking';
        sendToESP32({ type: 'MOOD_CHANGE', mood: 'talking' });
        broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'talking' });

        // Split text to show on the 16x2 LCD
        const lcdText = response.data.response.substring(0, 32).padEnd(32, ' ');
        sendToESP32({
          type: 'DISPLAY_TEXT',
          line1: lcdText.substring(0, 16),
          line2: lcdText.substring(16, 32)
        });

        // Revert to idle after speaking
        setTimeout(() => {
          currentMood = 'idle';
          sendToESP32({ type: 'MOOD_CHANGE', mood: 'idle' });
          broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'idle' });
          updateLCD(true);
        }, 3000);

      } catch (err) {
        console.error('Ollama Error:', err.message);
        let errorMsg = "Sorry, I can't reach my AI brain right now.";
        if (err.response && err.response.status === 404) {
          errorMsg = "Error: Please run 'ollama run llama3.2:1b' in your terminal first!";
        }
        broadcastToWeb({ type: 'CHAT_RESPONSE', text: errorMsg });

        currentMood = 'idle';
        sendToESP32({ type: 'MOOD_CHANGE', mood: 'idle' });
        broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'idle' });
        updateLCD(true);
      }
    }

    if (data.type === 'SPOTIFY_CONTROL') {
      try {
        if (data.action === 'play') await spotifyApi.play();
        if (data.action === 'pause') await spotifyApi.pause();
        if (data.action === 'next') await spotifyApi.skipToNext();
        if (data.action === 'previous') await spotifyApi.skipToPrevious();
        console.log(`🎵 Spotify Action: ${data.action}`);
      } catch (err) {
        console.error("Spotify Control Error:", err.message);
      }
    }
  });

  ws.on('close', () => {
    if (isESP32) {
      if (esp32Client === ws) esp32Client = null;
      console.log('🤖 ESP32 Muon Disconnected!');
      broadcastToWeb({ type: 'BOT_STATUS', connected: false });
    } else {
      webClients.delete(ws);
      console.log(`💻 Muon Hub Disconnected! (Active: ${webClients.size})`);
    }
  });
});

// --- Helper Functions ---
let lastLine1 = '';
let lastLine2 = '';

function updateLCD(force = false) {
  if (currentMood === 'talking') return;

  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12;
  hours = hours ? hours : 12;

  const timeStr = `${hours}:${minutes}${ampm}`; // e.g. "12:45p" (6 chars)
  let weatherStr = '';
  if (currentTemp !== '--') {
    let descShort = currentDesc.length > 5 ? currentDesc.substring(0, 5) : currentDesc;
    weatherStr = `${descShort} ${currentTemp}C`; // e.g. "Cloud 25C" (9 chars)
  }
  let padding = 16 - timeStr.length - weatherStr.length;
  if (padding < 1) padding = 1;
  const timeString = (timeStr + ' '.repeat(padding) + weatherStr).substring(0, 16);

  let line2 = currentTrackStr === 'Silence' ? '                ' : currentTrackStr;
  line2 = line2.substring(0, 16).padEnd(16, ' ');

  if (force || timeString !== lastLine1 || line2 !== lastLine2) {
    lastLine1 = timeString;
    lastLine2 = line2;
    sendToESP32({ type: 'DISPLAY_TEXT', line1: timeString, line2: line2 });
  }
}
setInterval(() => updateLCD(), 60000);

let lastRgb = [-1, -1, -1];
function updateLED() {
  let r = 0, g = 0, b = 0;
  if (currentMood === 'vibing') {
    const t = Date.now() / 500;
    // max RGB around 30 to make it dim but dynamic
    r = Math.floor((Math.sin(t) * 0.5 + 0.5) * 30);
    g = Math.floor((Math.sin(t + 2) * 0.5 + 0.5) * 30);
    b = Math.floor((Math.sin(t + 4) * 0.5 + 0.5) * 40);
  } else if (currentMood === 'thinking') {
    r = 0; g = 15; b = 30; // dim teal
  } else if (currentMood === 'talking') {
    const pulse = Math.floor((Math.sin(Date.now() / 150) * 0.5 + 0.5) * 30);
    r = pulse; g = pulse; b = 0; // pulsing dim yellow
  } else if (currentMood === 'happy') {
    const pulse = Math.floor((Math.sin(Date.now() / 300) * 0.5 + 0.5) * 40);
    r = pulse; g = 10; b = 20; // pulsing dim pinkish
  } else {
    // idle or other
    r = 0; g = 0; b = 0;
  }

  if (r !== lastRgb[0] || g !== lastRgb[1] || b !== lastRgb[2]) {
    lastRgb = [r, g, b];
    sendToESP32({ type: 'MUSIC_SYNC', rgb: [r, g, b] });
  }
}
setInterval(updateLED, 200);

function sendToESP32(data) {
  if (esp32Client && esp32Client.readyState === WebSocket.OPEN) {
    esp32Client.send(JSON.stringify(data));
  }
}

function broadcastToWeb(data) {
  const msg = JSON.stringify(data);
  for (const client of webClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// --- Routine Tasks (Weather & Spotify Polling) ---
async function fetchWeather() {
  if (!process.env.OPENWEATHER_API_KEY) return;
  try {
    const weather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    const temp = Math.round(weather.data.main.temp);
    const desc = weather.data.weather[0].main;

    currentTemp = temp;
    currentDesc = desc;

    // Check forecast for "upcoming" rain (next 3-6 hours)
    let upcomingRain = false;
    try {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${process.env.LAT}&lon=${process.env.LON}&appid=${process.env.OPENWEATHER_API_KEY}&cnt=3&units=metric`;
      const forecast = await axios.get(forecastUrl);
      upcomingRain = forecast.data.list.some(item =>
        ['Rain', 'Thunderstorm', 'Drizzle'].includes(item.weather[0].main)
      );
    } catch (err) {
      console.log("Forecast fetch failed:", err.message);
    }

    // If rain is starting or upcoming, and we haven't warned recently
    if ((upcomingRain || ['Rain', 'Thunderstorm', 'Drizzle'].includes(desc)) && !rainWarning) {
      console.log("🌦️ RAIN WARNING TRIGGERED!");
      sendToESP32({ type: 'RAIN_ALERT', active: true });
    } else if (!upcomingRain && !['Rain', 'Thunderstorm', 'Drizzle'].includes(desc) && rainWarning) {
      // Rain has passed
      sendToESP32({ type: 'RAIN_ALERT', active: false });
    }

    rainWarning = upcomingRain || ['Rain', 'Thunderstorm', 'Drizzle'].includes(desc);

    broadcastToWeb({ type: 'WEATHER_UPDATE', temp, desc, rainWarning });
    sendToESP32({ type: 'WEATHER_UPDATE', desc });
    updateLCD(); // Immediately show weather on LCD

    // Weather no longer overrides LCD entirely, just updates top line
  } catch (e) {
    console.log("Weather fetch failed:", e.message);
  }
}

// Call weather immediately on boot, then every 15 minutes
fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);

setInterval(async () => {
  // Fetch Spotify every 5 seconds if authenticated
  if (spotifyApi.getAccessToken()) {
    try {
      const currentTrack = await spotifyApi.getMyCurrentPlaybackState();
      // Added check for currentTrack.body.item to prevent Podcast/Ad crashes
      if (currentTrack.body && currentTrack.body.is_playing && currentTrack.body.item) {
        const trackName = currentTrack.body.item.name || 'Unknown Audio';
        currentTrackStr = trackName;
        broadcastToWeb({ type: 'SPOTIFY_UPDATE', track: trackName });

        // Only override mood to vibing if Muon isn't talking or being patted
        if (currentMood === 'idle') {
          currentMood = 'vibing';
          sendToESP32({ type: 'MOOD_CHANGE', mood: 'vibing' });
          broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'vibing' }); // Sync Web UI
        }
        updateLCD(); // Update LCD with new track info
      } else {
        currentTrackStr = 'Silence';
        broadcastToWeb({ type: 'SPOTIFY_UPDATE', track: 'Silence' });
        if (currentMood === 'vibing') {
          currentMood = 'idle';
          sendToESP32({ type: 'MOOD_CHANGE', mood: 'idle' });
          broadcastToWeb({ type: 'MOOD_UPDATE', mood: 'idle' }); // Sync Web UI
        }
        updateLCD(); // Update LCD to clear track info
      }
    } catch (e) {
      // Silent catch for 204 No Content or temporary server errors, log others
      if (e.statusCode && ![204, 401, 429, 502, 503].includes(e.statusCode)) {
        console.log("Spotify Polling Error:", e.message);
      }
    }
  }
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🧠 Local Brain running on http://127.0.0.1:${PORT}`);
  console.log(`🎵 Authenticate Spotify at http://127.0.0.1:${PORT}/login`);
});