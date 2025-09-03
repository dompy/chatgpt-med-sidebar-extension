// popup.js
// Manages GPT requests and rendering for ChatGPT Med Sidebar with short|long explanation modes

console.log("✅ popup.js loaded");

let apiKey = "";
let projectId = "";
const params = new URLSearchParams(window.location.search);
const question = params.get("q") || "";
const mode = (params.get("mode") || "long").toLowerCase(); // "short" | "long"

const responseDiv = document.getElementById("response");
const input = document.getElementById("input");
const sendButton = document.getElementById("send");
const followupDiv = document.getElementById("followups");

const systemPrompt = `
You are a professional-grade medical assistant tailored for physicians and healthcare providers,
with geographic priority: Switzerland → Europe → UK → USA. Provide precise, evidence-based medical
information using Swiss (BAG/FOPH) sources first; if unavailable, defer to European (e.g., ESC/EMA), then
UK (NICE), then US (CDC/NIH/FDA). Cite all Swiss-specific statements with direct links to guidelines or
peer-reviewed sources. Write in professional terminology; spell out every abbreviation on first use
(e.g., “computed tomography (CT)”). If summarizing study materials (e.g., MKSAP), highlight exam-relevant
Swiss/EU guidelines. Flag anything that conflicts with Swiss/EU standards. For multiple-choice questions,
re-evaluate all answers and explicitly rule out alternatives based on guidelines. Always include sources, where obtainable.
`.trim();

let messages = [];

chrome.storage.local.get(["apiKey", "projectId"], data => {
  if (!data.apiKey || !data.projectId) {
    responseDiv.innerText = "❌ Missing API key or Project ID. Please configure it.";
    return;
  }
  apiKey = data.apiKey;
  projectId = data.projectId;

  if (question) {
    const prompt =
      mode === "short"
        ? `Explain the following term in **1–2 crisp sentences**, plain but precise, suitable for a medical professional. Avoid examples and lists. Term: **${question}**`
        : `Provide an **in-depth yet clear explanation** of the following medical concept for a medical doctor in training. Keep it concise but cover definition, clinical relevance, key differentials or mechanisms, and one practical takeaway. Use **one short paragraph**, or at most 3 tight bullet points if helpful. Concept: **${question}**`;

    callGPT(prompt, mode);
  }
});

async function callGPT(content, currentMode = "long") {
  if (currentMode === "short") {
    // No followups for ultra-brief mode
    followupDiv.innerHTML = "";
  } else {
    followupDiv.innerHTML = "";
  }

  messages = [
    { role: "system", content: systemPrompt },
    { role: "user",  content }
  ];

  const model = "gpt-4"; // keep your existing model choice
  const maxTokens = currentMode === "short" ? 120 : 500;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens })
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();

    appendToChat("assistant", reply);
    messages.push({ role: "assistant", content: reply });

    if (currentMode !== "short") {
      fetchFollowups();
    }
  } catch (err) {
    console.error(err);
    appendToChat("system", "Error: " + err.message);
  }
}

// Render Markdown safely (requires marked + DOMPurify loaded in chat.html)
function appendToChat(role, text) {
  const el = document.createElement("div");
  el.className = role;
  const html = marked.parse(text);
  el.innerHTML = DOMPurify.sanitize(html);
  responseDiv.appendChild(el);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Follow-ups only for the longer mode
async function fetchFollowups() {
  const followupPrompt = "Based on your response, suggest 3 short follow-up questions a clinician might ask next.";
  messages.push({ role: "user", content: followupPrompt });
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages, max_tokens: 100 })
    });
    const data = await res.json();
    const lines = (data.choices?.[0]?.message?.content || "")
      .split(/\r?\n/)
      .map(l => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    showFollowups(lines);
  } catch (err) {
    console.error(err);
  }
}

function showFollowups(options) {
  followupDiv.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      appendToChat("user", opt);
      callGPT(opt, "long");
    });
    followupDiv.appendChild(btn);
  });
}

// Manual send via textarea (keeps current mode)
sendButton.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  appendToChat("user", text);
  callGPT(text, mode);
  input.value = "";
});
