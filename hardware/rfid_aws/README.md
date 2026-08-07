# RFID AWS IoT Hardware Login Authenticator

This module provides hardware-based login authentication and physical security monitoring for the FRIDAY web platform using an ESP32 microcontroller, MFRC522 RFID reader, SSD1306 OLED display, visual/audible feedback, and AWS IoT Core integration.

---

## 🚀 Overview & Workflow

1. **Tap RFID Card**: User scans their physical RFID card/tag on the MFRC522 reader.
2. **UID Verification**:
   - **Access Granted (Authorized UID `61 96 39 17`)**:
     - Displays **"WELCOME"** on the 128x64 OLED display.
     - Green LED lights up.
     - Buzzer produces an authentication chirp.
     - Web application logs the user into the homepage.
   - **Access Denied (Unauthorized UID)**:
     - Displays **"ACCESS DENIED"** on the OLED display.
     - Red LED lights up.
     - Buzzer sounds an intrusion warning tone.
     - ESP32 publishes an MQTT alert payload to AWS IoT Core topic: `rfid/alert`.
     - **AWS IoT Rule + AWS SNS**: Triggers an automated security alert email: *"Unauthorised access detected"*.

---

## 🛠️ Hardware Pinouts (ESP32)

| Component | Pin / Feature | ESP32 GPIO |
| :--- | :--- | :--- |
| **MFRC522 RFID** | SS (SDA) | GPIO 5 |
| | SCK | GPIO 18 (SPI) |
| | MOSI | GPIO 23 (SPI) |
| | MISO | GPIO 19 (SPI) |
| | RST | GPIO 16 |
| **SSD1306 OLED** | SDA | GPIO 21 (I2C) |
| | SCL | GPIO 22 (I2C) |
| **Status LEDs** | Green LED | GPIO 4 |
| | Red LED | GPIO 2 |
| **Audio Alert** | Buzzer | GPIO 15 |

---

## 🔒 Security & Credentials Setup

> **IMPORTANT**: Never commit your WiFi credentials, AWS endpoints, device certificates, or private keys to source control.

1. Copy `secrets.h.example` to `secrets.h`:
   ```bash
   cp secrets.h.example secrets.h
   ```
2. Populate `secrets.h` with your WiFi SSID, Password, AWS IoT Endpoint URL, Root CA, Device Certificate, and Private Key.
3. `secrets.h` is configured in `.gitignore` to prevent accidental credential leaks.

---

## ☁️ AWS IoT Core & SNS Configuration

1. **AWS IoT Core Policy**: Allow `iot:Connect` and `iot:Publish` on topic `rfid/alert`.
2. **AWS IoT Rule**:
   - SQL Statement: `SELECT * FROM 'rfid/alert'`
   - Action: Send a message to an **Amazon SNS Topic**.
3. **AWS SNS Topic**: Subscribed via Email to send real-time security alerts upon unauthorized access attempts.
