# 🧠 ChatGPT Sidebar Extension

This is a Chrome extension that adds an intelligent ChatGPT-powered sidebar to any website.  
When you highlight a word or phrase, a small 💬 button appears. Clicking it opens a floating window that explains the term — context-aware and medical-professional level.

---

## ✨ Features

- ✅ Works on any website
- 🧠 Uses ChatGPT (via OpenAI API)
- 💬 Inline mini chat interface
- 🔒 API Key stored securely via `chrome.storage.local`
- 👨‍⚕️ Optimized for clinicians and medical professionals
- ⌨️ Follow-up questions possible via integrated chat
- 📦 No hardcoded secrets – GitHub-safe

---

## 🛠 Setup Instructions

1. Clone this repository or download the ZIP  
   ```bash
   git clone https://github.com/your-username/chatgpt-sidebar-extension.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode**

4. Click **"Load unpacked"** and select this project folder

5. Click the extension icon → **"Options"**  
   → Enter your OpenAI `API Key` and `Project ID`  
   (Only stored locally via `chrome.storage.local`)

---

## 🔐 Where is my API Key stored?

Keys are stored safely in `chrome.storage.local` and are **never committed** to the repository.  
You can verify this in DevTools using:

```js
chrome.storage.local.get(null, console.log)
```

---

## 🔎 Screenshots

_You can add screenshots here if you want_

---

## 📄 License

MIT License – free to use, fork, and adapt.  
This project is not affiliated with OpenAI.