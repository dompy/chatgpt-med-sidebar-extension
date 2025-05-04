document.addEventListener("DOMContentLoaded", () => {
  const messages = [];
  let firstPromptDone = false;

  const params = new URLSearchParams(window.location.search);
  const question = params.get("q") || "";

  const responseDiv = document.getElementById("response");
  const input = document.getElementById("input");
  const sendButton = document.getElementById("send");

  let apiKey = "";
  let projectId = "";

  chrome.storage.local.get(["apiKey", "projectId"], (result) => {
    apiKey = result.apiKey;
    projectId = result.projectId;
    console.log("🌐 Speicherwerte geladen:", result);

    if (!apiKey || !projectId) {
      responseDiv.innerHTML = "<p class='error'>❌ API key or project ID not set. Please go to the extension settings to configure them.</p>";
      return;
    }

    initializeChat();
  });

  function initializeChat() {
    if (question && !firstPromptDone) {
      messages.push({
        role: "system",
        content: "You are a clinically experienced assistant trained to support medical professionals. The user is a practicing physician (resident level) and does not require general health disclaimers or 'consult a doctor' advice. Use direct, technical, and professional language, as appropriate for peer-level communication in a clinical setting."
      });
      firstPromptDone = true;
      callGPT(question);
    }

    sendButton.addEventListener("click", () => {
      const followup = input.value.trim();
      if (followup) {
        callGPT(followup);
        input.value = "";
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    });
  }

  async function callGPT(userInput) {
    if (!userInput) return;

    responseDiv.innerHTML += `<p class="user-message">${userInput}</p>`;
    messages.push({ role: "user", content: userInput });

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
          messages: messages,
          max_tokens: 800
        })
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "No response.";

      messages.push({ role: "assistant", content: reply });

      responseDiv.innerHTML += `<p class="ai-message">${reply.replace(/\n/g, "<br>")}</p>`;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    } catch (err) {
      console.error("❌ API error:", err);
      responseDiv.innerHTML += `<p class="error">Error: ${err.message}</p>`;
    }
  }
});