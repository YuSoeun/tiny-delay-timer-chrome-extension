![Mini Promotion](./assets/background_with_logo.png)

# Tiny Delay Timer – Chrome Extension

A minimal Chrome extension timer for Baekjoon with delay time tracking.  
Shows elapsed and overtime directly on the icon badge.

---

## 🙋‍♂️ Why?

I made this to track how long I spend on solving Baekjoon problems — and to push myself to finish before the time's up.  
It's a personal timer, made simple and useful. Hope it helps you too.

---

## ✨ Features

- Start a simple timer when solving Baekjoon problems
- Set a **target time** (e.g., 30 minutes)
- Track **elapsed time** in real-time
- Highlight **delay time** when exceeding the target
- Show timer info **directly on the Chrome toolbar icon**
- Lightweight, no distractions

![Extension Features](./assets/capture2.png)

---

## 🚀 Getting Started

1. **Download the extension** from the [Chrome Web Store](https://chromewebstore.google.com/detail/tiny-delay-timer/kngnojoglfamijphdoohcikoncebebdj)

2. After installing, click the timer icon on your Chrome toolbar

3. Set your target time using one of these methods:
   - Click the time presets (30min, 41min, 60min)
   - Click on the time display to open the time picker
   - Edit time presets by clicking the settings icon

4. Start the timer and begin solving your Baekjoon problem!

5. The extension will:
   - Show remaining time while solving
   - Display delay time in red if you exceed your target
   - Track total elapsed time

*Time badge will appear on the extension icon showing progress at a glance*

## 📷 Screenshots

### Main Timer Interface
![Main Timer](./assets/capture1.png)

### Running Timer
![Running Timer](./assets/capture2.png)

### Preset Settings
![Preset Settings](./assets/capture3.png)

### Time Picker
![Time Picker](./assets/capture4.png)


### Badge Display
![Badge Display](./assets/capture5.png)

---

## 🛠️ Project Structure

```plaintext
boj-delay-timer-chrome-extension/
├── manifest.json         # Chrome extension config (Manifest V3)
├── background.js         # Core timer & badge update logic
├── popup.html            # Main popup UI with timer controls
├── popup.js              # Timer logic and UI interactions
├── styles.css            # Main stylesheet
├── styles/               # Additional CSS files
│   ├── layout.css        # Layout styling
│   ├── preset-modal.css  # Preset editor modal styling
│   └── timepicker.css    # Time picker styling
├── modals/               # Modal component modules
│   ├── preset-modal.js   # Preset editor functionality
│   └── time-picker-modal.js  # Time picker functionality
└── icons/                # Toolbar icons
```

---

## 📌 Roadmap / To-do

- [x] Add popup interface for target time input
- [x] Customizable timer formats (e.g., mm:ss)
- [x] Option to disable badge display
- [ ] In-page overlay mode (optional)

---

## 🎨 Design Reference

Interface design inspired by [Pinterest](https://pin.it/Xf7slxE6V).

---
## 📄 License

This project is licensed under the MIT License.

---

## 🙋‍♀️ Author

[![YuSoeun's GitHub](https://github.com/YuSoeun.png?size=100)](https://github.com/YuSoeun)

Developed by [YuSoeun](https://github.com/YuSoeun)  
Always trying to build something minimal, useful, and user-friendly.

![Background](./assets/background.png)
