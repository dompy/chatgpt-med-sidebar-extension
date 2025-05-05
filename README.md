# ChatGPT Sidebar Extension

This is a Chrome extension that allows you to select text on any website and open a floating ChatGPT assistant, which:

- 🧠 Explains the selected term or sentence in a compact overlay
- 💬 Lets you chat further in a floating iframe
- 🤖 Generates smart follow-up questions based on context
- 🩺 Is optimized for clinical and medical professionals (precise, technical answers)

---

## 💻 Features

- Context-aware GPT-3.5 chat in a sidebar overlay
- Professional-level responses for medical users
- Automatically generates follow-up question buttons
- Chat history shown inline (user/assistant layout)
- Clean design with floating UI and full keyboard input
- Uses your own `sk-proj-...` API key and project ID via `options.html`

---

## 🔧 Setup

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **"Load unpacked"**, select this folder
5. Click the puzzle icon → pin the extension

Then:
- Visit any website
- Select text → 💬 button appears → click it
- ChatGPT iframe opens at the bottom right

---

## 🔐 API Key Setup

You must provide your own OpenAI API Key and Project ID:

1. Click on the extension options
2. Paste your `sk-proj-...` API key and project ID
3. Save → reload the extension

---

## 📦 Files

- `popup.js` – chat logic
- `content.js` – injects explain button
- `chat.html` – the embedded UI
- `styles.css` – layout and chat styling
- `options.html` / `save.js` – manage API key

---

## 📘 License

MIT – use freely & responsibly.