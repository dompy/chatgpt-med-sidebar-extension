// content.js
// Listens for text selection and opens a ChatGPT popup iframe with mode=short|long

console.log("✅ content.js loaded");

let lastClickPosition = { x: 0, y: 0 };
let ignoreNextMouseup = false;
let chatWindow = null;

function openChatWindow(selectedText, mode = "long") {
  console.log("💬 Opening chat for:", selectedText, "mode:", mode);

  if (chatWindow) {
    chatWindow.remove();
    chatWindow = null;
  }

  chatWindow = document.createElement("iframe");
  chatWindow.className = "gpt-chat-frame";
  chatWindow.style.position = "absolute";
  chatWindow.style.width = "400px";
  chatWindow.style.height = "500px";
  chatWindow.style.zIndex = "10000";
  chatWindow.style.border = "2px solid #ccc";
  chatWindow.style.borderRadius = "8px";
  chatWindow.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  chatWindow.style.background = "white";

  const src = chrome.runtime.getURL("chat.html") + `?q=${encodeURIComponent(selectedText)}&mode=${encodeURIComponent(mode)}`;
  chatWindow.src = src;

  document.body.appendChild(chatWindow);

  chatWindow.style.left = `${lastClickPosition.x}px`;
  chatWindow.style.top = `${lastClickPosition.y + 10}px`;

  console.log("✅ iframe loaded with src:", src);
}

function removeMenu() {
  const old = document.getElementById("gpt-menu");
  if (old) old.remove();
}

function showMenu(selectedText, event) {
  removeMenu();

  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "gpt-menu";
  menu.className = "gpt-menu";
  menu.style.position = "absolute";
  menu.style.top = `${window.scrollY + rect.top - 40}px`;
  menu.style.left = `${window.scrollX + rect.left}px`;
  menu.style.zIndex = "9999";
  menu.style.display = "flex";
  menu.style.gap = "6px";
  menu.style.padding = "6px";
  menu.style.border = "1px solid #ccc";
  menu.style.borderRadius = "8px";
  menu.style.background = "#fff";
  menu.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
  menu.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  const btnShort = document.createElement("button");
  btnShort.textContent = "⚡ Kurz";
  btnShort.style.cursor = "pointer";
  btnShort.style.padding = "4px 8px";
  btnShort.style.border = "1px solid #ddd";
  btnShort.style.borderRadius = "6px";
  btnShort.style.background = "#f8f8f8";

  const btnLong = document.createElement("button");
  btnLong.textContent = "🧠 Lang";
  btnLong.style.cursor = "pointer";
  btnLong.style.padding = "4px 8px";
  btnLong.style.border = "1px solid #ddd";
  btnLong.style.borderRadius = "6px";
  btnLong.style.background = "#f8f8f8";

  // Prevent re-trigger on mousedown
  [btnShort, btnLong, menu].forEach(el => {
    el.addEventListener("mousedown", e => {
      e.stopPropagation();
      e.preventDefault();
    });
  });

  btnShort.addEventListener("click", () => {
    ignoreNextMouseup = true;
    lastClickPosition = { x: window.scrollX + rect.left, y: window.scrollY + rect.bottom };
    openChatWindow(selectedText, "short");
    removeMenu();
  });

  btnLong.addEventListener("click", () => {
    ignoreNextMouseup = true;
    lastClickPosition = { x: window.scrollX + rect.left, y: window.scrollY + rect.bottom };
    openChatWindow(selectedText, "long");
    removeMenu();
  });

  menu.appendChild(btnShort);
  menu.appendChild(btnLong);
  document.body.appendChild(menu);
  console.log("📍 Menu added for:", selectedText);
}

document.addEventListener("mouseup", event => {
  if (event.target.closest("#gpt-menu")) return;

  if (ignoreNextMouseup) {
    ignoreNextMouseup = false;
    return;
  }

  const selected = window.getSelection().toString().trim();
  if (selected) {
    showMenu(selected, event);
  } else {
    removeMenu();
  }
});

// Close chat iframe when clicking outside
document.addEventListener("click", event => {
  const frame = document.querySelector(".gpt-chat-frame");
  const menu = document.getElementById("gpt-menu");
  if (frame && !frame.contains(event.target) && event.target !== menu && !menu?.contains(event.target)) {
    frame.remove();
    chatWindow = null;
    console.log("🧹 Chat window closed");
  }
}, true);
