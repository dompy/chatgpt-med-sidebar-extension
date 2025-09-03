// popup.js
// Manages GPT requests and rendering for ChatGPT Med Sidebar

console.log("✅ popup.js loaded");

let apiKey = "";
let projectId = "";
const params = new URLSearchParams(window.location.search);
const question = params.get("q") || "";

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
`;

let messages = [];

// Load API credentials and trigger initial GPT call
chrome.storage.local.get(["apiKey", "projectId"], data => {
  if (!data.apiKey || !data.projectId) {
    responseDiv.innerText = "❌ Missing API key or Project ID. Please configure it.";
    return;
  }
  apiKey = data.apiKey;
  projectId = data.projectId;

  if (question) {
    // Single-definition prompt: enforce one concise paragraph explanation
    const prompt = `Provide a concise explanation of the following medical concept in a single paragraph, focusing on high-level clinical details for a medical doctor in training or advanced practice, without simplifying: **${question}**.`;
    callGPT(prompt);
  }
});

// Core request to OpenAI Chat
async function callGPT(content) {
  followupDiv.innerHTML = "";
  messages = [
    { role: "system", content: systemPrompt.trim() },
    { role: "user",  content: content }
  ];
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({ model: "gpt-4", messages, max_tokens: 300 })
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const reply = data.choices[0].message.content.trim();

    appendToChat("assistant", reply);
    messages.push({ role: "assistant", content: reply });
    fetchFollowups();
  } catch (err) {
    console.error(err);
    appendToChat("system", "Error: " + err.message);
  }
}

// Render Markdown safely
function appendToChat(role, text) {
  const el = document.createElement("div");
  el.className = role;
  const html = marked.parse(text);
  el.innerHTML = DOMPurify.sanitize(html);
  responseDiv.appendChild(el);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Fetch 3 follow-up questions
async function fetchFollowups() {
  const followupPrompt = "Based on your response, suggest 3 follow-up questions a clinician might ask next.";
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
    const lines = data.choices[0].message.content
      .split(/\r?\n/)    
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    showFollowups(lines);
  } catch (err) {
    console.error(err);
  }
}

// Display follow-up buttons
function showFollowups(options) {
  followupDiv.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      appendToChat("user", opt);
      callGPT(opt);
    });
    followupDiv.appendChild(btn);
  });
}

// Manual send via textarea
sendButton.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  appendToChat("user", text);
  callGPT(text);
  input.value = "";
});
