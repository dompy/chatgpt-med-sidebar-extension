let apiKey = "";
let projectId = "";

const params = new URLSearchParams(window.location.search);
const question = params.get("q") || "";

const responseDiv = document.getElementById("response");
const input = document.getElementById("input");
const sendButton = document.getElementById("send");
const followupDiv = document.getElementById("followups");

let messages = [];

chrome.storage.local.get(["apiKey", "projectId"], (data) => {
  if (data.apiKey && data.projectId) {
    apiKey = data.apiKey;
    projectId = data.projectId;

    if (question) {
      callGPT(`Explain the following medical concept in concise, precise, high-level clinical detail for a medical doctor in training or advanced practice. Use appropriate terminology and do not simplify: ${question}`);
    }
  } else {
    responseDiv.innerText = "❌ Missing API key or Project ID. Please configure it.";
  }
});

async function callGPT(prompt) {
  followupDiv.innerHTML = "";
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 350
      })
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    messages.push({ role: "assistant", content: reply });

    appendToChat("assistant", reply);
    await fetchFollowups();
  } catch (err) {
    console.error("❌ API error:", err);
    appendToChat("system", "Error: " + err.message);
  }
}

function appendToChat(role, text) {
  const el = document.createElement("div");
  el.className = role;
  el.style.marginBottom = "10px";
  el.textContent = text;
  responseDiv.appendChild(el);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

async function fetchFollowups() {
  messages.push({
    role: "user",
    content: "Based on your last answer, generate 3 specific follow-up questions a medical doctor might ask next to deepen their understanding. Only list the questions, one per line."
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 150
      })
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const followups = extractFollowupOptions(text);
    showFollowups(followups);
    messages.pop(); // clean up followup request
  } catch (err) {
    console.error("❌ Follow-up fetch error:", err);
  }
}

function extractFollowupOptions(text) {
  return text
    .split(/(?:\n|^)[\-•\d]+[\.\)]?\s+/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function showFollowups(options) {
  followupDiv.innerHTML = "";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.style.margin = "5px";
    btn.addEventListener("click", () => {
      input.value = option;
      sendButton.click();
    });
    followupDiv.appendChild(btn);
  });
}

sendButton.addEventListener("click", () => {
  const followup = input.value.trim();
  if (followup) {
    appendToChat("user", followup);
    callGPT(followup);
    input.value = "";
  }
});