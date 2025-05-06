console.log("✅ content.js wurde geladen");
let lastClickPosition = { x: 0, y: 0 };
let ignoreNextMouseup = false;

document.addEventListener("mouseup", (event) => {
  // 👉 Wenn das Klickziel das Menü ist → abbrechen
  if (event.target.closest("#gpt-menu")) return;

  if (ignoreNextMouseup) {
    ignoreNextMouseup = false;
    return;
  }

  const selection = window.getSelection().toString().trim();
  if (selection.length > 0) {
    showMenu(selection, event);
  } else {
    removeMenu();
  }
});


function showMenu(selectedText, event) {
  removeMenu();

  const range = window.getSelection().getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "gpt-menu";
  menu.innerText = "💬 Explain";
  menu.style.position = "absolute";
  menu.style.top = `${window.scrollY + rect.top + 30}px`; // oberhalb der Markierung
  menu.style.left = `${window.scrollX + rect.left}px`;
  menu.style.zIndex = 9999;
  menu.className = "gpt-menu";

  menu.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  menu.addEventListener("click", (e) => {
    console.log("👉 Menü wurde geklickt.");
    ignoreNextMouseup = true;
    lastClickPosition = {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.bottom
    }; // Chatfenster knapp unterhalb
    openChatWindow(selectedText);
    removeMenu();
  });

  document.body.appendChild(menu);
  console.log("📍 Menü wurde dem DOM hinzugefügt:", selectedText);
}


function removeMenu() {
  const oldMenu = document.getElementById("gpt-menu");
  if (oldMenu) oldMenu.remove();
}

function openChatWindow(selectedText) {
  console.log("💬 Chatfenster öffnen für:", selectedText);

  const chatWindow = document.createElement("iframe");
  const src = chrome.runtime.getURL("chat.html") + `?q=${encodeURIComponent(selectedText)}`;
  chatWindow.src = src;
  chatWindow.className = "gpt-chat-frame";

  // 🧭 Positioniere anhand der letzten Klickposition
  chatWindow.style.position = "absolute";
  chatWindow.style.left = `${lastClickPosition.x}px`;
  chatWindow.style.top = `${lastClickPosition.y + 25}px`; // etwas Abstand unter Menü
  chatWindow.style.width = "400px";
  chatWindow.style.height = "400px";
  chatWindow.style.zIndex = "10000";
  chatWindow.style.border = "2px solid black";
  chatWindow.style.background = "white";
  chatWindow.style.borderRadius = "8px";
  chatWindow.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

  chatWindow.onload = () => console.log("✅ iframe geladen mit src:", src);
  chatWindow.onerror = (e) => console.error("❌ iframe-Fehler:", e);

  document.body.appendChild(chatWindow);
  console.log("📦 iframe wurde dem Body hinzugefügt");
}


document.addEventListener("click", (event) => {
  const chatFrame = document.querySelector(".gpt-chat-frame");
  const menu = document.getElementById("gpt-menu");

  if (chatFrame && !chatFrame.contains(event.target) && event.target !== menu) {
    chatFrame.remove();
    console.log("🧹 Chatfenster geschlossen durch Outside-Klick");
  }
}, true);
