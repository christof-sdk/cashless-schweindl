// Kopiere diese Datei zu config.h und trage echte Werte ein.
// config.h ist in .gitignore und wird nie eingecheckt.
//
// WLAN-SSID/Passwort gehoeren bewusst NICHT hierher - die werden zur
// Laufzeit per Captive Portal (WiFiManager) eingegeben und intern im
// Flash gespeichert, siehe oggy-firmware.ino.

#pragma once

// Firebase-Projekteinstellungen (Firebase Console -> Projekteinstellungen)
#define FIREBASE_API_KEY   "AIzaSy..."
#define FIREBASE_DATABASE_URL "https://<projekt>-default-rtdb.<region>.firebasedatabase.app/"

// Die jarId aus der Web-App-URL (/jar/{jarId})
#define JAR_ID "demo"
