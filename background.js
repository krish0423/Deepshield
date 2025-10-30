const OFFSCREEN_DOCUMENT_PATH = "/offscreen.html";

// The main click handler (No changes needed here)
async function analyzeMedia(info, tab) {
  try {
    let finalResult;

    if (info.mediaType === "image") {
      const response = await fetch(info.srcUrl);
      const mediaBlob = await response.blob();
      finalResult = await sendBlobsToApi([mediaBlob]);
      finalResult.srcUrl = info.srcUrl;
      finalResult.mediaType = info.mediaType;
    } else if (info.mediaType === "video") {
      const dataUrls = await extractFramesViaOffscreen(info.srcUrl);
      const blobs = await Promise.all(
        dataUrls.map((url) => fetch(url).then((res) => res.blob()))
      );
      finalResult = await sendBlobsToApi(blobs);
      finalResult.srcUrl = info.srcUrl;
      finalResult.mediaType = info.mediaType;
      finalResult.frameImages = dataUrls;
    }

    // Save to history
    const historyItem = {
      prediction: finalResult.prediction,
      confidence: finalResult.confidence,
      timestamp: Date.now(),
      imageUrl: info.srcUrl || (finalResult.frameImages && finalResult.frameImages[0]) || null
    };
    chrome.storage.local.get(["analysisHistory"], (data) => {
      const history = data.analysisHistory || [];
      history.unshift(historyItem);
      // Keep only last 50
      chrome.storage.local.set({ analysisHistory: history.slice(0, 50) });
    });
    await chrome.storage.local.set({ lastResult: finalResult });
    chrome.action.openPopup();
  } catch (error) {
    console.error("Error in analyzeMedia:", error);
  await chrome.storage.local.set({ lastResult: { error: error.message } });
  chrome.action.openPopup();
  }
}

// *** UPDATED: This function now sends all blobs in a single, efficient request ***
async function sendBlobsToApi(blobs) {
  const formData = new FormData();
  blobs.forEach((blob) => {
    formData.append("file", blob, "media.jpg");
  });

  // Get API endpoint from settings
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (data) => resolve(data.settings || {}));
  });
  const apiEndpoint = settings.apiEndpoint || "http://127.0.0.1:5000/predict";
  // Pass thresholds as query params
  const real = settings.realThreshold ?? 0.98;
  const fake = settings.fakeThreshold ?? 0.90;
  const url = `${apiEndpoint}?real=${encodeURIComponent(real)}&fake=${encodeURIComponent(fake)}`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return await response.json();
}

// Offscreen document logic (No changes needed here)
async function extractFramesViaOffscreen(videoUrl) {
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["DOM_PARSER"],
    justification: "To extract multiple frames from a video file.",
  });

  const result = await chrome.runtime.sendMessage({
    type: "extract-frames",
    target: "offscreen",
    videoUrl: videoUrl,
  });

  await chrome.offscreen.closeDocument();
  if (result.error) throw new Error(result.error);
  return result.dataUrls;
}

// Context Menu Setup (No changes needed here)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove("lastResult");
  chrome.contextMenus.create({
    id: "analyzeImage",
    title: "Analyze Image with DeepShield",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "analyzeVideo",
    title: "Analyze Video with DeepShield",
    contexts: ["video"],
  });
});

chrome.contextMenus.onClicked.addListener(analyzeMedia);
