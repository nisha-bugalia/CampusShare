# Running NIT Campus with Expo Go on a Physical Android Phone

Follow these instructions to launch and test the application on your physical Android device.

---

## 1. Prerequisites on your Android Phone

1. Install **Expo Go** from the Google Play Store on your Android phone:
   - Play Store link: [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Ensure your computer and your Android phone are connected to the **same Wi-Fi network**.

---

## 2. Starting the Development Server

Navigate to the project directory:

```bash
cd "nit-campus"
```

Start the Expo development server:

```bash
npx expo start
```

---

## 3. Opening the App on your Phone

1. Once the server starts, a **QR code** will be displayed in your terminal.
2. Open the **Expo Go** app on your Android phone.
3. Tap **"Scan QR Code"** and scan the QR code shown in your terminal.
4. The JavaScript bundle will compile and launch the **NIT Campus** home screen directly on your device.

---

## 4. Alternative Modes

### If your Wi-Fi blocks LAN peer-to-peer traffic:
Run with the tunnel option:
```bash
npx expo start --tunnel
```
*(Requires @expo/ngrok or npx prompt to tunnel traffic across different networks/hotspots).*

### Clearing Metro Bundler Cache:
```bash
npx expo start -c
```
