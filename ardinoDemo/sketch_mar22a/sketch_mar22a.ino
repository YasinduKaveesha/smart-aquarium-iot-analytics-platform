/*
 * ESP32 Aquarium Telemetry Publisher
 * Sends DS18B20 + TDS + Turbidity data to MQTT as JSON
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------------- WiFi / MQTT ----------------
const char* WIFI_SSID     = "Yasindus phone";
const char* WIFI_PASSWORD = "12345678";

const char* MQTT_SERVER   = "10.182.46.49";
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "aquarium/telemetry";

// ---------------- Sensor Pins ----------------
#define DS18B20_PIN 4
#define TDS_PIN     25
#define TURB_PIN    34

// ---------------- Constants ----------------
#define VREF           3.3
#define ADC_RESOLUTION 4095.0
#define TDS_FACTOR     0.5
#define NUM_SAMPLES    30

WiFiClient espClient;
PubSubClient client(espClient);

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensor(&oneWire);

// ---------- Helpers ----------
float readAverageVoltage(int pin, int samples, int &rawValue) {
  long total = 0;
  for (int i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(20);
  }
  rawValue = total / samples;
  return rawValue * VREF / ADC_RESOLUTION;
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT... ");

    String clientId = "ESP32-Aquarium-" + String((uint32_t)ESP.getEfuseMac(), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 2 seconds");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  sensor.begin();

  connectWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);

  Serial.println();
  Serial.println("Aquarium Telemetry Publisher Started");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!client.connected()) {
    connectMQTT();
  }

  client.loop();

  // ----- Temperature -----
  sensor.requestTemperatures();
  float tempC = sensor.getTempCByIndex(0);
  bool tempValid = !(tempC == -127.0 || tempC == 85.0);

  // ----- TDS -----
  int tdsRaw = 0;
  float tdsVoltage = readAverageVoltage(TDS_PIN, NUM_SAMPLES, tdsRaw);

  float compVoltage = tdsVoltage;
  if (tempValid) {
    compVoltage = tdsVoltage / (1.0 + 0.02 * (tempC - 25.0));
  }

  float tdsValue = (133.42 * compVoltage * compVoltage * compVoltage
                  - 255.86 * compVoltage * compVoltage
                  + 857.39 * compVoltage) * TDS_FACTOR;
  if (tdsValue < 0) tdsValue = 0;

  // ----- Turbidity -----
  int turbRaw = 0;
  float turbVoltage = readAverageVoltage(TURB_PIN, NUM_SAMPLES, turbRaw);

  // ----- Build JSON -----
  String payload = "{";
  payload += "\"device_id\":\"esp32_aquarium_01\",";
  payload += "\"timestamp_ms\":";
  payload += String((unsigned long)millis());
  payload += ",";

  payload += "\"temperature_c\":";
  if (tempValid) {
    payload += String(tempC, 2);
  } else {
    payload += "null";
  }
  payload += ",";

  payload += "\"tds_raw\":";
  payload += String(tdsRaw);
  payload += ",";

  payload += "\"tds_voltage\":";
  payload += String(tdsVoltage, 3);
  payload += ",";

  payload += "\"tds_ppm\":";
  payload += String(tdsValue, 2);
  payload += ",";

  payload += "\"turbidity_raw\":";
  payload += String(turbRaw);
  payload += ",";

  payload += "\"turbidity_voltage\":";
  payload += String(turbVoltage, 3);

  payload += "}";

  // ----- Publish -----
  bool ok = client.publish(MQTT_TOPIC, payload.c_str());

  Serial.println("----------------------------------------");
  Serial.print("Published: ");
  Serial.println(ok ? "YES" : "NO");
  Serial.println(payload);

  delay(5000);
}