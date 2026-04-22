#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <LiquidCrystal.h> // Changed to standard Parallel LCD Library

// --- Network & Server Credentials ---
const char* ssid = "Nazis";
const char* password = "n@Z!s107";

// Put your PC's local IP Address here (e.g., 192.168.1.10)
const char* websocket_server = "192.168.0.192"; 
const uint16_t websocket_port = 3000;

WebSocketsClient webSocket;

// --- Hardware Setup ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// 1. OLED I2C Pins (Remapped because 21/22 are used by LCD)
#define OLED_SDA 14
#define OLED_SCL 27
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// 2. LCD 16x2 Parallel Pins
const int rs = 21, en = 22, d4 = 18, d5 = 19, d6 = 23, d7 = 5;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

// 3. Sensors and Outputs
const int TOUCH_PIN = 4;

// WARNING: GPIO 35 is INPUT ONLY on ESP32. tone() will not work here! 
// Please physically change this to GPIO 32 and update the line below.
const int BUZZER_PIN = 32; 

// RGB LED Pins
const int LED_R = 26;
const int LED_G = 25;
const int LED_B = 33;

String currentMood = "idle";
String currentWeather = "Unknown";
bool isTouched = false;
bool isRainAlertActive = false;

// --- Audio Engine Variables ---
unsigned long lastAudioTick = 0;
unsigned long nextAudioTickDelay = 500;

// --- Eye Animation Variables ---
unsigned long lastBlinkTime = 0;
unsigned long lastWanderTime = 0;
int eyeOffsetX = 0;
int eyeOffsetY = 0;
bool isBlinking = false;

void setup() {
  Serial.begin(115200);

  // Initialize Remapped I2C for OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  
  if(!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
  }
  oled.clearDisplay();
  
  // Initialize Parallel LCD
  lcd.begin(16, 2);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Booting Muon...");

  pinMode(TOUCH_PIN, INPUT);
  
  // Only try to set pinMode if it's not an input-only pin, to avoid esp32 panics 
  // (Though standard ESP32 core just ignores it, it's good practice)
  if(BUZZER_PIN != 35 && BUZZER_PIN != 34 && BUZZER_PIN != 36 && BUZZER_PIN != 39){
      pinMode(BUZZER_PIN, OUTPUT);
  }

  // LED PWM Setup (ESP32 Core v3.x API)
  ledcAttach(LED_R, 5000, 8);
  ledcAttach(LED_G, 5000, 8);
  ledcAttach(LED_B, 5000, 8);
  
  // -- RGB LED BOOT TEST --
  // This will flash Red, Green, Blue on startup to verify hardware wiring
  ledcWrite(LED_R, 255); delay(300); ledcWrite(LED_R, 0);
  ledcWrite(LED_G, 255); delay(300); ledcWrite(LED_G, 0);
  ledcWrite(LED_B, 255); delay(300); ledcWrite(LED_B, 0);

  // WiFi Setup
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // WebSocket Setup
  webSocket.begin(websocket_server, websocket_port, "/esp32");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
  
  // Touch Sensor Logic
  int touchState = digitalRead(TOUCH_PIN);
  if (touchState == HIGH && !isTouched) {
    isTouched = true;
    StaticJsonDocument<200> doc;
    doc["type"] = "TOUCH_EVENT";
    doc["action"] = "patted";
    String jsonString;
    serializeJson(doc, jsonString);
    webSocket.sendTXT(jsonString);
  } else if (touchState == LOW) {
    isTouched = false;
  }

  // Draw Muon based on state
  drawMuonFace();

  // Audio Engine
  updateBuzzer();
}

void updateBuzzer() {
  if (BUZZER_PIN == 35 || BUZZER_PIN == 34 || BUZZER_PIN == 36 || BUZZER_PIN == 39) return;

  unsigned long currentMillis = millis();
  
  // 0. Rain Alert Pattern (High Priority Alarm)
  if (isRainAlertActive) {
    static int rainStep = 0;
    static unsigned long lastStepTime = 0;
    if (currentMillis - lastStepTime > 150) {
      if (rainStep == 0) tone(BUZZER_PIN, 1000, 80);
      else if (rainStep == 2) tone(BUZZER_PIN, 1200, 80);
      else if (rainStep == 4) tone(BUZZER_PIN, 1400, 150);
      
      rainStep = (rainStep + 1) % 20; // Alert every ~3 seconds (20 * 150ms)
      lastStepTime = currentMillis;
    }
    // Note: We don't return here so other moods can still have background ticks if needed, 
    // but usually alerts should dominate.
  }

  if (currentMood == "vibing") {
    if (currentMillis - lastAudioTick >= nextAudioTickDelay) {
      // Small "heartbeat" style drum for vibing, louder than before
      int beatType = random(0, 2);
      if (beatType == 0) {
        tone(BUZZER_PIN, 400, 30); 
        nextAudioTickDelay = 300; 
      } else {
        tone(BUZZER_PIN, 300, 40);
        nextAudioTickDelay = 600; 
      }
      lastAudioTick = currentMillis;
    }
  } 
  else if (currentMood == "thinking") {
    if (currentMillis - lastAudioTick >= nextAudioTickDelay) {
       tone(BUZZER_PIN, 1500, 10); // quiet high pitch click
       lastAudioTick = currentMillis;
       nextAudioTickDelay = random(100, 800);
    }
  }
  else if (currentMood == "talking") {
    if (currentMillis - lastAudioTick >= nextAudioTickDelay) {
       tone(BUZZER_PIN, random(500, 800), 10); // animal crossing blips
       lastAudioTick = currentMillis;
       nextAudioTickDelay = random(80, 250);
    }
  }
  else if (currentMood == "happy") {
    // Purring ("parr") and occasional happy chirps
    if (currentMillis - lastAudioTick >= nextAudioTickDelay) {
       if (random(0, 8) == 0) {
          // Occasional happy chirp
          tone(BUZZER_PIN, random(1500, 2500), 40);
          lastAudioTick = currentMillis;
          nextAudioTickDelay = random(300, 800);
       } else {
          // Purring (rapid, low-pitched rumble)
          tone(BUZZER_PIN, random(120, 160), 20);
          lastAudioTick = currentMillis;
          nextAudioTickDelay = random(40, 70); 
       }
    }
  }
}

// --- WebSocket Event Handler ---
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected!");
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("Disconnected :(");
      break;
    case WStype_CONNECTED:
      Serial.println("Connected to Brain!");
      lcd.clear();
      lcd.print("Online & Ready");
      break;
    case WStype_TEXT:
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        const char* msgType = doc["type"];
        
        if (strcmp(msgType, "MOOD_CHANGE") == 0) {
          currentMood = doc["mood"].as<String>();
        } 
        else if (strcmp(msgType, "WEATHER_UPDATE") == 0) {
          currentWeather = doc["desc"].as<String>();
        }
        else if (strcmp(msgType, "DISPLAY_TEXT") == 0) {
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print(doc["line1"].as<const char*>());
          lcd.setCursor(0, 1);
          lcd.print(doc["line2"].as<const char*>());
        }
        else if (strcmp(msgType, "RAIN_ALERT") == 0) {
          isRainAlertActive = doc["active"].as<bool>();
        }
        else if (strcmp(msgType, "BUZZER_ALERT") == 0) {
          // Will only beep if you moved the buzzer off pin 35
          if(BUZZER_PIN != 35 && BUZZER_PIN != 34 && BUZZER_PIN != 36 && BUZZER_PIN != 39){
            tone(BUZZER_PIN, 1000, 200); 
          }
        }
        else if (strcmp(msgType, "MUSIC_SYNC") == 0) {
          int r = doc["rgb"][0];
          int g = doc["rgb"][1];
          int b = doc["rgb"][2];
          Serial.printf("Received RGB: R:%d G:%d B:%d\n", r, g, b);
          ledcWrite(LED_R, r);
          ledcWrite(LED_G, g);
          ledcWrite(LED_B, b);
        }
      }
      break;
  }
}

// --- Muon Animation Engine ---
void drawMuonFace() {
  oled.clearDisplay();
  
  unsigned long currentMillis = millis();

  // 1. Autonomous Idle Behavior (Blinking & Wandering)
  if (currentMood == "idle") {
     // Random Blink Logic
     if (!isBlinking && currentMillis - lastBlinkTime > random(2000, 6000)) {
        isBlinking = true;
        lastBlinkTime = currentMillis;
     }
     if (isBlinking && currentMillis - lastBlinkTime > 150) { // Blink lasts 150ms
        isBlinking = false;
        lastBlinkTime = currentMillis;
     }
     
     // Random Eye Wandering Logic
     if (currentMillis - lastWanderTime > random(1500, 4000)) {
        eyeOffsetX = random(-8, 9); // Look left/right
        eyeOffsetY = random(-4, 5); // Look slightly up/down
        lastWanderTime = currentMillis;
     }
  } else {
     // Reset idle animations when feeling a specific mood
     isBlinking = false; 
     eyeOffsetX = 0;
     eyeOffsetY = 0;
  }

  // Base eye coordinates (Centered for 128x64 display)
  int leftEyeX = 36 + eyeOffsetX;
  int rightEyeX = 92 + eyeOffsetX;
  int eyeY = 32 + eyeOffsetY;

  // 2. Shape Rendering based on Mood
  if (currentMood == "idle") {
    // Weather decorations drawn beneath or around eyes
    if (currentWeather == "Clear") {
       // Draw sunglasses top bar
       oled.drawLine(leftEyeX - 18, eyeY - 20, rightEyeX + 18, eyeY - 20, SSD1306_WHITE); 
    } else if (currentWeather.indexOf("Cloud") >= 0) {
       // fluffy cloud above eyes
       oled.fillCircle(64, 10, 6, SSD1306_WHITE);
       oled.fillCircle(58, 14, 5, SSD1306_WHITE);
       oled.fillCircle(70, 14, 5, SSD1306_WHITE);
    } else if (currentWeather.indexOf("Rain") >= 0 || currentWeather.indexOf("Drizzle") >= 0) {
       // rain drops falling
       int fallOffset = (millis() / 50) % 10;
       oled.drawLine(16, 5 + fallOffset, 14, 9 + fallOffset, SSD1306_WHITE);
       oled.drawLine(108, 10 + fallOffset, 106, 14 + fallOffset, SSD1306_WHITE);
       oled.drawLine(64, 2 + fallOffset, 62, 6 + fallOffset, SSD1306_WHITE);
    } else if (currentWeather.indexOf("Snow") >= 0) {
       // snowflakes
       int fallOffset = (millis() / 150) % 10;
       oled.setCursor(16, 5 + fallOffset); oled.print("*");
       oled.setCursor(108, 10 + fallOffset); oled.print("*");
    }

    if (isBlinking) {
       // Eyes closed (thin horizontal lines)
       oled.fillRect(leftEyeX - 14, eyeY - 2, 28, 4, SSD1306_WHITE);
       oled.fillRect(rightEyeX - 14, eyeY - 2, 28, 4, SSD1306_WHITE);
    } else {
       if (currentWeather == "Clear") {
          // Sunglasses lenses
          oled.fillRoundRect(leftEyeX - 16, eyeY - 14, 32, 20, 6, SSD1306_WHITE);
          oled.fillRoundRect(rightEyeX - 16, eyeY - 14, 32, 20, 6, SSD1306_WHITE);
       } else {
          // Normal RoboEyes
          oled.fillRoundRect(leftEyeX - 14, eyeY - 16, 28, 32, 8, SSD1306_WHITE);
          oled.fillRoundRect(rightEyeX - 14, eyeY - 16, 28, 32, 8, SSD1306_WHITE);
          
          if (isRainAlertActive) {
            // Worried eyebrows / \
            oled.drawLine(leftEyeX - 16, eyeY - 22, leftEyeX + 6, eyeY - 18, SSD1306_WHITE);
            oled.drawLine(rightEyeX - 6, eyeY - 18, rightEyeX + 16, eyeY - 22, SSD1306_WHITE);
          }
       }
    }
  } 
  else if (currentMood == "happy") {
    // Happy Eyes ^ ^ (Arch shapes)
    oled.fillCircle(leftEyeX, eyeY, 16, SSD1306_WHITE);
    oled.fillCircle(rightEyeX, eyeY, 16, SSD1306_WHITE);
    oled.fillRect(0, eyeY + 2, 128, 32, SSD1306_BLACK);
  }
  else if (currentMood == "vibing") {
    // Sub-states changing every 3 seconds for dynamic vibing
    int subState = (millis() / 3000) % 3;
    
    if (subState == 0) { // Bouncing
      int bounce = (millis() / 150) % 2 == 0 ? -6 : 6;
      oled.fillRoundRect(leftEyeX - 12, eyeY - 14 + bounce, 24, 28, 6, SSD1306_WHITE);
      oled.fillRoundRect(rightEyeX - 12, eyeY - 14 + bounce, 24, 28, 6, SSD1306_WHITE);
    } else if (subState == 1) { // Winking
      int bounce = (millis() / 300) % 2 == 0 ? -4 : 4;
      oled.fillRoundRect(leftEyeX - 12, eyeY - 14 + bounce, 24, 28, 6, SSD1306_WHITE);
      oled.fillRect(rightEyeX - 12, eyeY - 2 + bounce, 24, 4, SSD1306_WHITE); // wink right eye
    } else { // Headbanging (Wide and squished)
      int squish = (millis() / 150) % 2 == 0 ? 10 : 0;
      oled.fillRoundRect(leftEyeX - 18 + squish/2, eyeY - 14 + squish, 36 - squish, 28 - squish*2, 6, SSD1306_WHITE);
      oled.fillRoundRect(rightEyeX - 18 + squish/2, eyeY - 14 + squish, 36 - squish, 28 - squish*2, 6, SSD1306_WHITE);
    }
  }
  else if (currentMood == "thinking") {
    int phase = (millis() / 200) % 3;
    int hL = phase == 0 ? 10 : 32;
    int hR = phase == 2 ? 10 : 32;
    oled.fillRoundRect(leftEyeX - 14, eyeY - hL/2, 28, hL, 8, SSD1306_WHITE);
    oled.fillRoundRect(rightEyeX - 14, eyeY - hR/2, 28, hR, 8, SSD1306_WHITE);
  }
  else if (currentMood == "talking") {
     int subState = (millis() / 2000) % 2; 
     int talkHeight = random(12, 32);
     if (subState == 0) {
         // normal talking
         oled.fillRoundRect(leftEyeX - 14, eyeY - talkHeight/2, 28, talkHeight, 8, SSD1306_WHITE);
         oled.fillRoundRect(rightEyeX - 14, eyeY - talkHeight/2, 28, talkHeight, 8, SSD1306_WHITE);
     } else {
         // happy talking with open mouth illusion
         oled.fillCircle(leftEyeX, eyeY - talkHeight/4, 16, SSD1306_WHITE);
         oled.fillCircle(rightEyeX, eyeY - talkHeight/4, 16, SSD1306_WHITE);
         oled.fillRect(0, eyeY + 2, 128, 32, SSD1306_BLACK); 
         oled.fillCircle(64, eyeY + talkHeight/2, talkHeight/3 + 4, SSD1306_WHITE);
     }
  }

  oled.display();
}