// content.js
// Listens for text selection and opens a ChatGPT popup iframe with ChatGPT Med Sidebar

console.log("✅ content.js loaded");

let lastClickPosition = { x: 0, y: 0 };
let ignoreNextMouseup = false;
let chatWindow = null;

// Hoisted function declaration for opening chat iframe
function openChatWindow(selectedText) {
  console.log("💬 Opening chat for:", selectedText);

  // Remove existing iframe if any
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

  const src = chrome.runtime.getURL("chat.html") + `?q=${encodeURIComponent(selectedText)}`;
  chatWindow.src = src;

  document.body.appendChild(chatWindow);

  // Position iframe just below last click position
  chatWindow.style.left = `${lastClickPosition.x}px`;
  chatWindow.style.top = `${lastClickPosition.y + 10}px`;

  console.log("✅ iframe loaded with src:", src);
}

// Remove context menu if present
function removeMenu() {
  const old = document.getElementById("gpt-menu");
  if (old) old.remove();
}

// Show custom "Explain" button near text selection
function showMenu(selectedText, event) {
  removeMenu();

  const range = window.getSelection().getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "gpt-menu";
  menu.innerText = "💬 Explain";
  menu.className = "gpt-menu";
  menu.style.position = "absolute";
  menu.style.top = `${window.scrollY + rect.top - 30}px`;
  menu.style.left = `${window.scrollX + rect.left}px`;
  menu.style.zIndex = "9999";

  // Prevent re-trigger on mousedown
  menu.addEventListener("mousedown", e => {
    e.stopPropagation();
    e.preventDefault();
  });

  menu.addEventListener("click", e => {
    console.log("👉 Menu clicked");
    ignoreNextMouseup = true;
    lastClickPosition = {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.bottom
    };
    openChatWindow(selectedText);
    removeMenu();
  });

  document.body.appendChild(menu);
  console.log("📍 Menu added for:", selectedText);
}

// Listen for text selection (mouseup)
document.addEventListener("mouseup", event => {
  // If clicking the menu itself, skip
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
  if (frame && !frame.contains(event.target) && event.target !== menu) {
    frame.remove();
    chatWindow = null;
    console.log("🧹 Chat window closed");
  }
}, true);
