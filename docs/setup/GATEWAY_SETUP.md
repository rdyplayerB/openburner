# OpenBurner: HaLo Gateway Setup Guide

HaLo Gateway allows you to use your **smartphone as an NFC reader** for desktop web apps.

## How It Works

```
Desktop Computer (Wallet) <--WiFi--> Smartphone (Gateway App) <--NFC--> HaLo Chip
```

## Setup Steps

### 1. Install HaLo Gateway on Your Smartphone

**Android:**
- Download "HaLo Gateway" from [Arx Research](https://github.com/arx-research/libhalo/releases)
- Install the APK

**iOS:**
- Download from the App Store (if available)
- Or use TestFlight link

### 2. Connect to Same Network

- Make sure your **computer** and **smartphone** are on the **same WiFi network**
- The Gateway app will broadcast its availability via mDNS

### 3. Launch Gateway App

- Open the HaLo Gateway app on your phone
- It will show "Gateway Ready" or similar status
- Keep the app open and in the foreground

### 4. Use the Wallet

1. Open the wallet at http://localhost:3000
2. Click "Connect HaLo Chip"
3. A QR code or connection prompt will appear
4. **On your phone**, the Gateway app should detect the connection request
5. **Tap your HaLo chip** to your phone
6. The wallet will receive the data

## Alternative: Web NFC (Mobile Browser)

If you're using the wallet **directly on a mobile device** with NFC:

1. Open http://localhost:3000 (or deploy it)
2. Use Chrome on Android (iOS Safari also supports NFC)
3. Click "Connect HaLo Chip"
4. **Tap the HaLo chip** to the back of your phone
5. The browser will read it directly (no Gateway app needed)

## Troubleshooting

### Gateway Not Found
- Ensure phone and computer are on same WiFi
- Restart the Gateway app
- Check firewall settings
- Try reloading the wallet page

### Can't Read Chip
- Make sure HaLo chip is flat against phone
- Keep it there for 2-3 seconds
- Don't move the chip while reading

### Connection Timeout
- Check that Gateway app is in foreground
- Ensure NFC is enabled on your phone
- Try tapping the chip again

## Which Method Should I Use?

| Method | Best For | Requirements |
|--------|----------|--------------|
| **Gateway** | Desktop + Smartphone | WiFi, Gateway app |
| **Web NFC** | Mobile browser only | Android Chrome/iOS Safari |
| **Bridge** | Desktop + USB reader | USB NFC reader, Bridge software |

## Gateway vs Bridge

**Gateway Advantages:**
- ✅ No USB hardware needed
- ✅ Use your existing smartphone
- ✅ Works anywhere with WiFi

**Bridge Advantages:**
- ✅ Faster (USB connection)
- ✅ More reliable
- ✅ No need for phone

Choose Gateway if you don't have a USB NFC reader or prefer using your phone!

