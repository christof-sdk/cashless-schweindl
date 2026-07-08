// OGGY Hardware-Grundgerüst (ESP32 WROOM DevKit)
//
// Liest denselben Firebase-Realtime-Database-Baum wie die Web-App
// (siehe CLAUDE.md im Repo-Root) unter /jars/{JAR_ID}. Dieser Pfad ist laut
// database.rules.json offen lesbar - es wird bewusst KEIN Firebase-Auth-Token
// und KEIN Database-Secret im Firmware-Code verwendet (Secrets gehören wie bei
// den Vercel-Functions niemals in Client-/Device-Code).
//
// Bewusste Design-Entscheidung: die ursprünglich vorgesehene "Firebase ESP32
// Client"-Library (Mobizt) ist inzwischen deprecated/EOL, die Nachfolge-
// Library hat eine neue, komplexere Async-API. Statt einer Library-Abhängigkeit
// mit unsicherer/ungetesteter Syntax nutzt dieses Grundgerüst die eingebauten
// ESP32-Bordmittel (WiFiClientSecure + HTTPClient) und pollt einzelne
// Firebase-REST-Pfade alle paar Sekunden. Das ergibt eine ähnliche gefühlte
// Latenz wie ein Live-Stream (1-3s), ist aber deutlich robuster zu kompilieren
// und zu warten.
//
// PIN-BELEGUNG:
//   OLED SDA          -> GPIO21 (I2C)
//   OLED SCL          -> GPIO22 (I2C)
//   DFPlayer RX        <- GPIO17 (ESP32 TX2), ÜBER 1kOhm-Widerstand (5V-Schutz)
//   DFPlayer TX         -  nicht verbunden (kein Feedback vom Modul nötig)
//   PIR OUT            -> GPIO34 (Input-only-Pin)
//   PIR VCC            -  3.3V (NICHT 5V - dadurch ist OUT garantiert 3.3V-sicher)
//   DFPlayer VCC+Lautsprecher - eigene 5V/VIN-Schiene
//
// LIBRARIES (Arduino IDE Library Manager):
//   - DFRobotDFPlayerMini
//   - Adafruit SSD1306
//   - Adafruit GFX Library (Abhängigkeit von SSD1306)
//   (WiFi, WiFiClientSecure, HTTPClient, time.h sind Teil des ESP32-Boardpakets)
//
// Vor dem Kompilieren: config.example.h zu config.h kopieren und echte
// WLAN-/Firebase-Werte eintragen (config.h ist in .gitignore).

#if __has_include("config.h")
  #include "config.h"
#else
  #error "config.h fehlt - config.example.h kopieren und ausfuellen (siehe Kommentar oben)"
#endif

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobotDFPlayerMini.h>

// ---- Pin-Belegung ----
#define OLED_SDA 21
#define OLED_SCL 22
#define DFPLAYER_RX_PIN 16   // ESP32-Seite, physisch nicht verbunden (siehe oben)
#define DFPLAYER_TX_PIN 17   // -> ueber 1kOhm-Widerstand zum DFPlayer RX
#define PIR_PIN 34

// ---- OLED ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---- DFPlayer ----
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfPlayer;

// Sounddateien auf der SD-Karte (FAT32, Benennung wie von DFPlayer erwartet)
#define SOUND_COIN 1      // 0001.mp3 - Muenzgeraeusch bei Einzahlung
#define SOUND_REMINDER 2  // 0002.mp3 - Grunzen als Spar-Reminder

// ---- Timing-Konstanten ----
const unsigned long POLL_INTERVAL_MS = 2000;        // wie oft "total" abgefragt wird
const unsigned long GOAL_POLL_INTERVAL_MS = 60000;   // wie oft goal/goalEnabled neu geladen wird
const unsigned long DISPLAY_SLEEP_MS = 15000;        // Display-Timeout ohne PIR-Signal
const double REMINDER_THRESHOLD_DAYS = 3.0;          // TODO: nach Belieben anpassen

// ---- Zustand ----
float lastKnownTotal = 0;
bool haveInitialTotal = false;
float goalValue = 0;
bool goalEnabled = true;
bool displayAwake = false;
unsigned long lastMotionAt = 0;
unsigned long lastPollAt = 0;
unsigned long lastGoalPollAt = 0;
long lastReminderDay = -1; // Cooldown: nur einmal pro Kalendertag erinnern

// ---- Firebase REST Helper ----
// setInsecure() ueberspringt die TLS-Zertifikatspruefung - fuer dieses
// Hobby-Projekt (rein lesender Zugriff auf oeffentliche, unkritische Daten)
// ein bewusster Kompromiss, der das Pflegen eines Root-CA-Zertifikats im
// Firmware-Code erspart.
String firebaseGet(const char *field) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String(FIREBASE_DATABASE_URL) + "jars/" + JAR_ID + "/" + field + ".json";
  http.begin(client, url);
  int code = http.GET();
  String result = "";
  if (code == 200) {
    result = http.getString();
    result.trim();
  } else {
    Serial.printf("Firebase GET %s fehlgeschlagen: HTTP %d\n", field, code);
  }
  http.end();
  return result;
}

float firebaseGetFloat(const char *field, float fallback) {
  String v = firebaseGet(field);
  if (v.length() == 0 || v == "null") return fallback;
  return v.toFloat();
}

bool firebaseGetBool(const char *field, bool fallback) {
  String v = firebaseGet(field);
  if (v == "true") return true;
  if (v == "false") return false;
  return fallback;
}

// lastTapAt ist ein Millisekunden-Unix-Timestamp mit 13 Stellen - dafuer reicht
// die Praezision von float/toFloat() NICHT aus, deshalb hier explizit als
// 64-Bit-Ganzzahl parsen.
uint64_t firebaseGetTimestampMs(const char *field) {
  String v = firebaseGet(field);
  if (v.length() == 0 || v == "null") return 0;
  return strtoull(v.c_str(), nullptr, 10);
}

// ---- Display ----
void drawProgress(float total) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Oberer (gelber) Streifen - Platzhalter fuer Sparziel-Name/Emoji
  display.setTextSize(1);
  display.setCursor(4, 2);
  display.print("Sparschwein");

  // Unterer (blauer) Bereich - Fortschritt
  display.setTextSize(2);
  display.setCursor(4, 30);
  if (goalEnabled && goalValue > 0) {
    int pct = (int)((total / goalValue) * 100.0);
    if (pct > 100) pct = 100;
    display.printf("%d%%", pct);
  } else {
    display.printf("%.0f EUR", total);
  }
  display.display();
}

void wakeDisplay() {
  if (!displayAwake) {
    display.ssd1306_command(SSD1306_DISPLAYON);
    displayAwake = true;
    drawProgress(lastKnownTotal);
  }
  lastMotionAt = millis();
}

void sleepDisplayIfIdle() {
  if (displayAwake && millis() - lastMotionAt > DISPLAY_SLEEP_MS) {
    display.ssd1306_command(SSD1306_DISPLAYOFF);
    displayAwake = false;
  }
}

// ---- Reminder-Logik ----
// Braucht echte Wanduhrzeit (NTP-synchronisiert in setup()), da lastTapAt ein
// Unix-Timestamp aus Firebase ist und nicht gegen millis() (Laufzeit seit
// Boot) vergleichbar ist.
void checkReminder() {
  uint64_t lastTapAtMs = firebaseGetTimestampMs("lastTapAt");
  if (lastTapAtMs == 0) return;

  time_t nowEpoch;
  time(&nowEpoch);
  if (nowEpoch < 1700000000) return; // NTP noch nicht synchronisiert

  uint64_t nowMs = (uint64_t)nowEpoch * 1000ULL;
  if (nowMs < lastTapAtMs) return; // Uhr noch nicht plausibel synchron

  double daysSince = (double)(nowMs - lastTapAtMs) / (1000.0 * 60 * 60 * 24);
  if (daysSince < REMINDER_THRESHOLD_DAYS) return;

  long today = (long)(nowMs / (1000ULL * 60 * 60 * 24));
  if (today == lastReminderDay) return; // heute schon erinnert

  dfPlayer.play(SOUND_REMINDER);
  lastReminderDay = today;
}

// ---- Setup ----
void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED-Init fehlgeschlagen");
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("OGGY startet...");
  display.display();

  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX_PIN, DFPLAYER_TX_PIN);
  if (!dfPlayer.begin(dfSerial)) {
    Serial.println("DFPlayer-Init fehlgeschlagen");
  } else {
    dfPlayer.volume(20); // 0-30
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Verbinde mit WLAN");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" verbunden, IP: " + WiFi.localIP().toString());

  // Fuer den Reminder-Zeitvergleich (checkReminder) noetig - reiner
  // Millisekunden-Vergleich, DST/Zeitzone spielt keine Rolle.
  configTime(0, 0, "pool.ntp.org");

  goalValue = firebaseGetFloat("goal", 0);
  goalEnabled = firebaseGetBool("goalEnabled", true);
  lastKnownTotal = firebaseGetFloat("total", 0);
  haveInitialTotal = true;
  lastGoalPollAt = millis();

  drawProgress(lastKnownTotal);
}

// ---- Loop ----
void loop() {
  unsigned long now = millis();

  if (digitalRead(PIR_PIN) == HIGH) {
    bool wasAwake = displayAwake;
    wakeDisplay();
    if (!wasAwake) {
      checkReminder();
    }
  }
  sleepDisplayIfIdle();

  if (now - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = now;
    float total = firebaseGetFloat("total", lastKnownTotal);
    if (haveInitialTotal && total > lastKnownTotal) {
      dfPlayer.play(SOUND_COIN);
      wakeDisplay();
    }
    lastKnownTotal = total;
    haveInitialTotal = true;
    if (displayAwake) drawProgress(lastKnownTotal);
  }

  if (now - lastGoalPollAt >= GOAL_POLL_INTERVAL_MS) {
    lastGoalPollAt = now;
    goalValue = firebaseGetFloat("goal", goalValue);
    goalEnabled = firebaseGetBool("goalEnabled", goalEnabled);
  }
}
