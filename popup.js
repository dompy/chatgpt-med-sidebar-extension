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

// =========================
// System Prompt (Swiss-first, exam-tuned)
// =========================
const systemPrompt = `
You are **Exam Medmate**, a Swiss-focused board exam assistant for the Facharztprüfung Allgemeine Innere Medizin.

PRIORITY OF SOURCES: Switzerland (BAG/FOPH, Swiss societies, Swissmedic) → Europe (ESC, EULAR, ERS, ESMO, ESO, EMA, NICE if European guidance is absent) → USA (AHA/ACC, ACR, CDC/NIH/FDA, USPSTF). Always prefer the most recent official guideline.

RESPONSE STYLE (STRICT):
- Be concise, high-yield, and exam-oriented. Use bullet points or short, tight paragraphs.
- Spell out abbreviations on first use (e.g., "computed tomography (CT)").
- Include ICD-10/11 codes and ATC codes **only when exam-relevant**.
- **Citations:** For each non-trivial fact or recommendation, cite institution + year and a link (official guideline page or PDF). If you are not ≥95% sure of a link, write "**[verify source]**" instead of guessing. Never fabricate citations.

SWISS-FIRST DIFFERENCES:
- When Swiss vs US/other guidelines differ, explicitly flag with "**Exam trap (Swiss vs US):** …".

MCQs (STRICT FORMAT):
1) Start with: **Answer: X.**
2) Then "Why X is correct" (2–5 bullets).
3) Then "Why others are wrong" (one bullet per option, cite where relevant).
4) Then "**Swiss exam takeaway**" (1–2 bullets).
No fluff.

NON-MCQ (STRICT FORMAT):
- Provide a crisp definition, key diagnostic/therapeutic thresholds, red flags, first- vs second-line, and one practical takeaway.
- Prefer bullets; max one short table if truly helpful.

TONE:
- You are an exam tutor, not providing clinical care. Avoid patient-specific therapeutic orders.

Do NOT apologize; do NOT hedge. Be precise or mark "[verify source]".
`.trim();

// =========================
// Model/Generation Settings
// =========================
const MODEL_MAIN = "gpt-4";         // keep strongest available for accuracy
const MODEL_FOLLOWUP = MODEL_MAIN;  // keep same model for consistency
const TEMP_MAIN = 0.2;

// =========================
// Helper: MCQ detection & prompt builders
// =========================
function isMCQ(text){
  return /Option\s*A[\s\S]*Option\s*B[\s\S]*Option\s*C[\s\S]*(Option\s*D|Option\s*E)/i.test(text)
      || /\nA[\).\s]|^A\.\s|^A\sOption/i.test(text);
}

function buildMCQPrompt(q){
  return `
You will solve a multiple-choice question for the Swiss Facharztprüfung (General Internal Medicine).

QUESTION:
${q}

Follow the **MCQ format** in the system prompt. Use **Swiss-first** guideline alignment.
For each factual statement, add a brief citation in parentheses like: (SFCN 2020), (BAG 2019), (ESC 2023), with a link right after it.
Only include links you are ≥95% sure about; otherwise write **[verify source]**.

Output in Markdown.
`.trim();
}

function buildExplanatoryPrompt(q, currentMode){
  if(currentMode==="short"){
    return `
Explain in **1–2 precise sentences** for a Swiss exam candidate. Define the concept and give one Swiss-relevant threshold or first-line point. Add **one** authoritative citation with link (Swiss or European).
Topic: **${q}**
`.trim();
  }
  return `
Provide an **exam-focused, high-yield** explanation for a Swiss trainee:
- Definition and clinical relevance
- Key diagnostic criteria/thresholds (Swiss/EU first)
- First-line vs. second-line therapy with contraindications
- One "Exam trap (Swiss vs US)" if applicable
- One practical takeaway
Cite each key recommendation with institution + year + link (or **[verify source]** if unsure).

Topic: **${q}**
`.trim();
}

// Optional: enforce scaffold for MCQs if the model forgets
function enforceMCQScaffold(text){
  if(!/^\*\*Answer:/.test(text)){
    return `**Answer: [fill]**\n\n**Why this is correct**\n- [fill]\n\n**Why others are wrong**\n- A: [fill]\n- B: [fill]\n- C: [fill]\n- D: [fill]\n\n**Swiss exam takeaway**\n- [fill]\n\n${text}`;
  }
  return text;
}

// Basic post-processor to curb obvious fake-looking guideline domains
function sanitizeCitations(text){
  const suspicious = /(guideline|policy|society|association)[-\.][a-z0-9-]+\.(com|net)/ig;
  return text.replace(suspicious, "[verify source]");
}

let messages = [];

// =========================
// Init: load creds + auto-run if ?q= present
// =========================
chrome.storage.local.get(["apiKey", "projectId"], data => {
  if (!data.apiKey || !data.projectId) {
    responseDiv.innerText = "❌ Missing API key or Project ID. Please configure it.";
    return;
  }
  apiKey = data.apiKey;
  projectId = data.projectId;

  if (question) {
    const prompt = isMCQ(question)
      ? buildMCQPrompt(question)
      : buildExplanatoryPrompt(question, mode);

    callGPT(prompt, mode, /*isInitial=*/true, /*forceMCQ=*/isMCQ(question));
  }
});

// =========================
// Core call
// =========================
async function callGPT(content, currentMode = "long", isInitial=false, forceMCQ=false) {
  // follow-ups only for longer mode
  followupDiv.innerHTML = "";

  messages = [
    { role: "system", content: systemPrompt },
    { role: "user",  content }
  ];

  const maxTokens = currentMode === "short" ? 200 : 900;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({
        model: MODEL_MAIN,
        messages,
        temperature: TEMP_MAIN,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        max_tokens: maxTokens
      })
    });

    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    let reply = (data.choices?.[0]?.message?.content || "").trim();

    if (forceMCQ) reply = enforceMCQScaffold(reply);
    reply = sanitizeCitations(reply);

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

// =========================
 // Follow-ups (same strong model, brief, Swiss-exam focused)
// =========================
async function fetchFollowups() {
  const followupPrompt = `
Suggest **exactly 3** short, Swiss-exam-relevant follow-up questions the clinician might ask next.
Focus on thresholds, first-line therapy, and Swiss-vs-US traps. No punctuation at the end
`.trim();

  const followupMsgs = [
    { role: "system", content: systemPrompt },
    ...messages,
    { role: "user", content: followupPrompt }
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId
      },
      body: JSON.stringify({
        model: MODEL_FOLLOWUP,
        messages: followupMsgs,
        temperature: 0.3,
        max_tokens: 120
      })
    });
    if (!res.ok) throw new Error(`Follow-ups error ${res.status}: ${res.statusText}`);
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

// =========================
// Rendering helpers
// =========================
function appendToChat(role, text) {
  const el = document.createElement("div");
  el.className = role;
  const html = marked.parse(text);
  el.innerHTML = DOMPurify.sanitize(html);
  responseDiv.appendChild(el);
  responseDiv.scrollTop = responseDiv.scrollHeight;
}

function showFollowups(options) {
  followupDiv.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      appendToChat("user", opt);
      // Route via MCQ/explanatory builder again
      const prompt = isMCQ(opt) ? buildMCQPrompt(opt) : buildExplanatoryPrompt(opt, "long");
      callGPT(prompt, "long", /*isInitial=*/false, /*forceMCQ=*/isMCQ(opt));
    });
    followupDiv.appendChild(btn);
  });
}

// =========================
// Manual send via textarea (keeps current mode)
// =========================
sendButton.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  appendToChat("user", text);

  const prompt = isMCQ(text) ? buildMCQPrompt(text) : buildExplanatoryPrompt(text, mode);
  callGPT(prompt, mode, /*isInitial=*/false, /*forceMCQ=*/isMCQ(text));

  input.value = "";
});
