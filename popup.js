document.addEventListener("DOMContentLoaded", () => {
  const resultContainer = document.getElementById("result-container");

  chrome.storage.local.get(["lastResult"], (data) => {
    const result = data.lastResult;

    if (result && result.prediction) {
      renderFinalResult(result, resultContainer);
    } else if (result && result.error) {
      resultContainer.innerHTML = `<p class="result-fake">Error: ${result.error}</p>`;
    } else {
      resultContainer.innerHTML = `<p>Right-click an image or video to start an analysis.</p>`;
    }
  });

    const openSettingsBtn = document.getElementById("open-settings");
    const openHistoryBtn = document.getElementById("open-history");

    if (openSettingsBtn) {
      openSettingsBtn.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
      });
    }
    if (openHistoryBtn) {
      openHistoryBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("history.html") });
      });
    }
});

function renderFinalResult(result, container) {
  let predictionClass = `result-${result.prediction.toLowerCase()}`;

  // Back button
  let html = `<button id="back-home" style="float:left;margin-bottom:10px;">&#8592; Back</button>`;

  // Main verdict
  html += `
    <div class="overall-verdict">
      <p class="${predictionClass}">${result.prediction}</p>
      <p class="confidence">Overall Confidence: ${(result.confidence * 100).toFixed(2)}%</p>
    </div>
  `;

  // Show image + heatmap overlay for single image
  if (result.frameCount === 1 && result.frameResults && result.frameResults[0].original && result.frameResults[0].heatmap) {
    html += `
      <div class="image-overlay-container">
        <div class="image-overlay-wrapper">
          <img src="${result.frameResults[0].original}" class="original-image" alt="Original" />
          <img src="${result.frameResults[0].heatmap}" class="heatmap-image" alt="Heatmap" style="filter:none;" />
        </div>
        <div class="prediction-details">
          <span class="prediction-label">Prediction: ${result.frameResults[0].prediction}</span><br/>
          <span class="confidence-label">Confidence: ${(result.frameResults[0].confidence * 100).toFixed(2)}%</span>
        </div>
      </div>
    `;
  }

  // If it was a video (frameCount > 1), add frame-by-frame overlays
  if (result.frameCount > 1 && result.frameResults) {
    html += `<div class="frame-analysis">
      <h2>Frame-by-Frame Analysis</h2>
      <div class="frame-list-overlay">`;
    result.frameResults.forEach((frame, index) => {
      html += `
        <div class="image-overlay-container">
          <div class="image-overlay-wrapper">
            <img src="${frame.original}" class="original-image" alt="Frame ${index + 1}" />
            <img src="${frame.heatmap}" class="heatmap-image" alt="Heatmap" style="filter:none;" />
          </div>
          <div class="prediction-details">
            <span class="prediction-label">Frame ${index + 1}: ${frame.prediction}</span><br/>
            <span class="confidence-label">Confidence: ${(frame.confidence * 100).toFixed(2)}%</span>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;

  // Back button event
  const backBtn = document.getElementById("back-home");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      renderHome(container);
    });
  }
}

function renderHome(container) {
  // Get history and show summary cards
  chrome.storage.local.get(["analysisHistory"], (data) => {
    const history = data.analysisHistory || [];
    const total = history.length;
    const deepfakes = history.filter(h => h.prediction === 'Fake').length;
    const reals = history.filter(h => h.prediction === 'Real').length;
    container.innerHTML = `
      <div class="summary-cards">
        <div class="summary-card"><div class="summary-title">Deepfakes</div><div class="summary-value">${deepfakes}</div></div>
        <div class="summary-card"><div class="summary-title">Reals</div><div class="summary-value">${reals}</div></div>
        <div class="summary-card"><div class="summary-title">Total</div><div class="summary-value">${total}</div></div>
      </div>
      <div style="margin-top:18px;color:#444;">Right-click an image or video to start an analysis.</div>
    `;
  });
}
