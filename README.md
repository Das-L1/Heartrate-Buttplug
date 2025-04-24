```markdown
https://discord.gg/gwnvrSYtjp Check out our Discord Server
# ❤️ Heart Rate-Actuated Vibrator Control System

A Node.js system that connects heart rate monitoring from OBS to vibrator control via the Buttplug protocol. Automatically adjusts vibration intensity based on real-time heart rate data, with a web UI for manual control and monitoring.

## 🚀 Features

- 🩺 Real-time heart rate monitoring via OBS WebSocket  
- 📈 Automatic vibrator control based on configurable HR threshold  
- 🕹 Web-based control panel with manual override  
- 🔌 Supports any Buttplug-compatible device via Intiface Central  
- 🛠 Graceful shutdown and error handling  
- 📱 Mobile-friendly UI  

## 🔧 Prerequisites

1. [Node.js v18+](https://nodejs.org/)
2. [Intiface Central](https://intiface.com/central/) (v2.3.0+)
3. [HeartRateOnStream for OBS](https://play.google.com/store/apps/details?id=com.pezcraft.myapplication)

## 📦 Installation

```bash
git clone https://github.com/Das-L1/Heartrate-Buttplug.git
cd hr-a
npm install
```

## ⚙️ Configuration

### Intiface Central Setup

- Launch Intiface Central  
- Enable WebSocket Server in Settings  
- Keep default port (12345)

## ▶️ Usage

### 1. Start the system

```bash
npm start
```

### 2. Device Connection Flow

1. Ensure Intiface Central is running  
2. Turn on your Bluetooth device  
3. The web UI will auto-connect to the first available device  

### 3. Web Interface

- Access at `http://localhost:3000`  
- Real-time heart rate display  
- Manual override switch  
- Connection status monitoring  

## 🎥 OBS Setup with HeartRateOnStream

### Android App

1. Install **HeartRateOnStream** on your Android device  
2. Pair with your heart rate sensor  
3. Set OBS WebSocket URL in app to `ws://your-pc-ip:4456`  
4. Start broadcasting HR data  


## 🛠 Troubleshooting

| Issue                | Solution                                                      |
|---------------------|---------------------------------------------------------------|
| No device found     | Ensure Intiface Central is running and the device is paired   |
| WebSocket errors    | Check firewall settings for port 4456                         |
| HR data not updating| Verify HeartRateOnStream connection in OBS                    |
| Connection retries  | Restart Intiface Central and the system                       |

## 📄 License

ISC License. See [LICENSE](LICENSE) for details.

---

**Note**: Always ensure proper consent and safety measures when using physiological data for actuation systems.
```
