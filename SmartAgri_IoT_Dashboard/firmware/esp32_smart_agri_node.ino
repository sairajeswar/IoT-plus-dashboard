/**
 * AGRI-SYNAPSE ESP32 IoT Node Firmware
 * Target: ESP32-WROOM-32 / NodeMCU-32S
 * Sensors: Capacitive Soil Moisture v1.2, DHT22 (Temp & Humidity), NPK RS485 Modbus, Relay Modules
 * Communication: WiFi + MQTT / HTTP JSON Telemetry
 */

#include <WiFi.h>
#include <HTTPClient.h>

// WiFi Configuration
const char* WIFI_SSID = "AGRI_IOT_NETWORK";
const char* WIFI_PASS = "IoT_Secure_2026";

// Dashboard Server Endpoint (Update with your server IP)
const char* SERVER_URL = "http://192.168.1.100:3000/api/telemetry";

// Pinout Definitions
#define PIN_SOIL_ANALOG      34  // ADC1_CH6 Capacitive Soil Moisture Sensor
#define PIN_DHT_DATA         4   // DHT22 Temperature & Humidity Data
#define PIN_RELAY_PUMP       18  // Main Irrigation Solenoid / Pump Relay
#define PIN_RELAY_MISTER     19  // Misting Nozzle Solenoid Relay
#define PIN_RELAY_VALVE_A    21  // Zone A Solenoid
#define PIN_STATUS_LED       2   // Onboard Blue Status LED

// Calibration constants for Capacitive Soil Moisture Sensor v1.2
const int AIR_VALUE = 3200;    // Dry sensor reading in air
const int WATER_VALUE = 1350;  // Immersed sensor reading in water

// Timing
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // 3 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[AGRI-SYNAPSE] Initializing ESP32 Smart Agriculture Node...");

  // Configure Relays (Active LOW for standard optocoupler relay boards)
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_RELAY_MISTER, OUTPUT);
  pinMode(PIN_RELAY_VALVE_A, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  digitalWrite(PIN_RELAY_PUMP, HIGH); // Off
  digitalWrite(PIN_RELAY_MISTER, HIGH);
  digitalWrite(PIN_RELAY_VALVE_A, HIGH);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize WiFi
  Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected! IP Address: " + WiFi.localIP().toString());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n[WIFI] Warning: Remote network unavailable. Running in Autonomous Offline Mode.");
  }
}

float readSoilMoisturePercentage() {
  int rawValue = analogRead(PIN_SOIL_ANALOG);
  // Map raw ADC to 0-100% moisture
  int moisturePct = map(rawValue, AIR_VALUE, WATER_VALUE, 0, 100);
  moisturePct = constrain(moisturePct, 0, 100);
  return (float)moisturePct;
}

void loop() {
  unsigned long now = millis();

  if (now - lastTelemetryMillis >= TELEMETRY_INTERVAL) {
    lastTelemetryMillis = now;

    float soilMoisture = readSoilMoisturePercentage();
    float ambientTemp = 26.5; // In production, read from dht.readTemperature()
    float ambientHum = 61.2;  // In production, read from dht.readHumidity()
    int rssi = WiFi.RSSI();

    Serial.printf("[SENSOR] Soil Moisture: %.1f%% | Temp: %.1f C | Hum: %.1f%%\n", 
                  soilMoisture, ambientTemp, ambientHum);

    // Autonomous Closed-Loop Safeguard: Auto-water if moisture dips below 30%
    if (soilMoisture < 30.0) {
      Serial.println("[AUTOPILOT] Soil dry! Actuating pump.");
      digitalWrite(PIN_RELAY_PUMP, LOW); // Turn pump ON
      digitalWrite(PIN_RELAY_VALVE_A, LOW);
    } else if (soilMoisture > 55.0) {
      digitalWrite(PIN_RELAY_PUMP, HIGH); // Turn pump OFF
      digitalWrite(PIN_RELAY_VALVE_A, HIGH);
    }

    // Transmit JSON payload to Dashboard Server if WiFi connected
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      String jsonPayload = String("{\"nodeId\":\"ESP32-FIELD-01\",\"soilMoisture\":") + soilMoisture +
                           String(",\"ambientTemperature\":") + ambientTemp +
                           String(",\"ambientHumidity\":") + ambientHum +
                           String(",\"rssi\":") + rssi + String("}");

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        Serial.printf("[HTTP] Telemetry transmitted successfully (HTTP %d)\n", httpResponseCode);
      } else {
        Serial.printf("[HTTP] Transmission failed. Error: %s\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    }
  }
}
