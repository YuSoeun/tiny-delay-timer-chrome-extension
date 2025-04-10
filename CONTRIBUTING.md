# 🤝 Contributing Guide

Thank you for considering contributing to **Tiny Delay Timer**!  
We welcome bug reports, feature suggestions, and pull requests from the community.

---

## 🧩 How to Contribute

1. **Fork this repository**
2. **Create a new branch** (use naming like `feat/issue-number`, `fix/issue-number`)
3. **Make your changes** with clear, readable code
4. **Test locally** before submitting
5. **Submit a Pull Request** using the PR template

---

## 📝 PR Title Convention

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format:

- `feat[#12]: Add new feature`
- `fix[#24]: Fix a bug`
- `docs[#97]: Update documentation`
- `refactor[#28]: Code cleanup`

---

## ✅ PR Checklist

- [ ] Follows coding style and naming conventions
- [ ] PR title follows the conventional format
- [ ] Related issue is referenced in the PR
- [ ] Tested and verified changes locally

---

## 📂 Project Structure

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

## 🚀 Development Setup

1. Clone your forked repository
2. Navigate to `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top-right corner)
4. Click "Load unpacked" and select your local repository folder
5. Make your changes and reload the extension to test

---

## 💬 Questions?

If you have any questions, feel free to open an issue or start a discussion.  
We appreciate every contribution, big or small!

---