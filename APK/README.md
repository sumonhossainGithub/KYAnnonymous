# KYAnonymous — Official Android App (APK)

**KYAnonymous** is the native Android application package for the KYAnonymous live chat and anonymous community platform ([https://kyanonymous.hiddencurrency.com](https://kyanonymous.hiddencurrency.com)).

---

## 📱 Quick Download & Installation

The ready-to-install Android package is located directly in this folder:

- **File:** `KYAnonymous.apk`
- **Package Name:** `com.kyanonymous.app`
- **Version:** `1.0.0` (Build `1`)
- **Compatibility:** Android 7.0+ (API 24 to Android 15+)
- **Architecture:** Universal (Supports all ARM, ARM64, x86 devices)
- **Signature:** Release Signed (v2 + v3 Scheme)

### How to Install on Android

1. Transfer `KYAnonymous.apk` to your Android device via USB, Telegram, WhatsApp, Google Drive, or Bluetooth.
2. Tap the `KYAnonymous.apk` file on your phone.
3. If prompted with **"For your security, your phone is not allowed to install unknown apps from this source"**:
   - Tap **Settings**.
   - Toggle **"Allow from this source"** to **ON**.
   - Tap **Back** and select **Install**.
4. Tap **Open** to launch KYAnonymous!

---

## 🚀 App Features & Capabilities

- **Real-Time Live Chat:** Fast, reactive anonymous messaging with automatic reconnection.
- **Telegram-Style 24-Hour Polls:**
  - Compact message-bubble format.
  - Live vote tallies, percentage fill bars, and option checkmarks.
  - Messenger-style **bump-to-latest** on active votes.
  - Option retract vote and 24-hour countdown timer.
- **Butterfly Magic Reactions:** Real-time visual butterfly animations and perched butterfly counters.
- **Full File & Image Uploads:** Native integration with Android's system file picker for photos, camera snaps, PDFs, and documents up to 10 MB.
- **Android Download Manager:** One-tap downloads for chat attachments directly to your phone's `Downloads` folder with system notifications.
- **Offline & Reconnection Handling:** Displays an elegant dark-mode recovery screen with a "Retry Connection" button if internet drops.
- **Smart Back Navigation:** Hardware back button navigates web history, with a double-tap confirmation to exit the app.
- **Deep Dark Theme:** Custom-tailored dark emerald aesthetic (`#030C0E` / `#10B981`) matching the web app.

---

## 🛠️ Rebuilding the APK

You can rebuild the APK at any time with a single command from PowerShell:

```powershell
cd c:\Users\sumon\Desktop\KYAnonymous\APK
.\build_apk.ps1
```

The script will automatically compile resources, link with `android.jar`, compile the Java source code, convert bytecode to Dalvik dex, zipalign, sign the APK, and verify the signature.

---

## 📂 Source Code Structure

```text
APK/
├── KYAnonymous.apk                # Production installable APK
├── ic_launcher_512.png            # 512x512 High-res app logo
├── build_apk.ps1                  # One-click build script
├── README.md                      # Documentation & instructions
└── src/
    ├── AndroidManifest.xml        # App permissions & activity declaration
    ├── res/
    │   ├── drawable/              # Custom themes, progress bars, buttons
    │   ├── layout/activity_main.xml
    │   ├── values/                # Colors, strings, themes
    │   └── mipmap-*/ic_launcher.png # App icons (mdpi to xxxhdpi)
    └── java/com/kyanonymous/app/
        └── MainActivity.java      # Native WebView, FileChooser, DownloadManager
```
