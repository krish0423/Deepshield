document.addEventListener("DOMContentLoaded", () => {
  const apiInput = document.getElementById("api-endpoint");
  const realInput = document.getElementById("real-threshold");
  const fakeInput = document.getElementById("fake-threshold");
  const form = document.getElementById("settings-form");
  const resetBtn = document.getElementById("reset-settings");
  const openHistoryBtn = document.getElementById("open-history");
  const clearHistoryBtn = document.getElementById("clear-history");

  // Load settings
  chrome.storage.local.get(["settings"], (data) => {
    const settings = data.settings || {};
    apiInput.value = settings.apiEndpoint || "http://127.0.0.1:5000/predict";
    realInput.value = settings.realThreshold ?? 0.98;
    fakeInput.value = settings.fakeThreshold ?? 0.90;
  });

  // Save settings
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      apiEndpoint: apiInput.value,
      realThreshold: parseFloat(realInput.value),
      fakeThreshold: parseFloat(fakeInput.value)
    };
    chrome.storage.local.set({ settings });
    alert("Settings saved!");
  });

  // Reset settings
  resetBtn.addEventListener("click", () => {
    apiInput.value = "http://127.0.0.1:5000/predict";
    realInput.value = 0.98;
    fakeInput.value = 0.90;
    chrome.storage.local.set({ settings: {
      apiEndpoint: "http://127.0.0.1:5000/predict",
      realThreshold: 0.98,
      fakeThreshold: 0.90
    }});
    alert("Settings reset to default.");
  });

  // Open history page
  openHistoryBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("history.html") });
  });

  // Clear history
  clearHistoryBtn.addEventListener("click", () => {
    chrome.storage.local.set({ analysisHistory: [] });
    alert("History cleared.");
  });
});
