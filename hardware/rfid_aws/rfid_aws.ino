#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <MFRC522.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "secrets.h"

// RFID Pin Definitions
#define SS_PIN    5
#define RST_PIN   16  // Using GPIO 16 for Reset

// Output Pin Definitions
#define GREEN_LED 4
#define RED_LED   2
#define BUZZER    15

// OLED Display Configuration (128x64 I2C)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

MFRC522 rfid(SS_PIN, RST_PIN);

// MQTT Objects
WiFiClientSecure net;
PubSubClient client(net);

// Target Authorized Card UID: 61 96 39 17
byte authorizedUID[4] = {0x61, 0x96, 0x39, 0x17};

void showIdleScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(15, 25);
  display.println("Tap RFID Card...");
  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Configure output pins
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  // Initialize I2C for OLED (SDA = GPIO 21, SCL = GPIO 22)
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 OLED initialization failed!"));
    for (;;);
  }

  // Initialize SPI & RC522 RFID
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);

  Serial.println("System Ready!");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");

  // Load AWS Certificates from secrets.h
  net.setCACert(root_ca);
  net.setCertificate(certificate_pem_crt);
  net.setPrivateKey(private_pem_key);

  // AWS Endpoint
  client.setServer(mqtt_server, 8883);

  // Connect to AWS IoT Core
  Serial.print("Connecting to AWS");
  while (!client.connected()) {
    if (client.connect("RFIDESP32")) {
      Serial.println("\nConnected to AWS!");
    } else {
      Serial.print(".");
      delay(1000);
    }
  }
  showIdleScreen();
}

void loop() {
  client.loop();

  // Check for new RFID cards
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Print detected UID to Serial Monitor
  Serial.print("Card Scanned: ");
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();

  // Compare scanned card UID with authorized UID
  bool match = true;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] != authorizedUID[i]) {
      match = false;
      break;
    }
  }

  if (match) {
    // --- ACCESS GRANTED ---
    Serial.println("STATUS: ACCESS GRANTED");

    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(20, 20);
    display.println("WELCOME");
    display.display();

    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER, HIGH);
    delay(150);
    digitalWrite(BUZZER, LOW);

    delay(2000);
    digitalWrite(GREEN_LED, LOW);

  } else {
    // --- ACCESS DENIED ---
    Serial.println("STATUS: ACCESS DENIED");
    bool result = client.publish(
      "rfid/alert",
      "Unauthorized access detected"
    );

    Serial.print("AWS IoT MQTT Publish Result: ");
    Serial.println(result);

    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(10, 15);
    display.println("ACCESS");
    display.setCursor(20, 35);
    display.println("DENIED");
    display.display();

    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER, HIGH);
    delay(1500);
    digitalWrite(BUZZER, LOW);
    digitalWrite(RED_LED, LOW);
  }

  showIdleScreen();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
