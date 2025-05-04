const apiInput = document.getElementById("apiKey");
const projectInput = document.getElementById("projectId");
const saveBtn = document.getElementById("save");

chrome.storage.local.get(["apiKey", "projectId"], (res) => {
  apiInput.value = res.apiKey || "";
  projectInput.value = res.projectId || "";
});

saveBtn.onclick = () => {
  chrome.storage.local.set({
    apiKey: apiInput.value,
    projectId: projectInput.value
  }, () => {
    alert("✅ Gespeichert!");
  });
};