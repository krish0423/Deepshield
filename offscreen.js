chrome.runtime.onMessage.addListener(handleMessages);

function handleMessages(message, sender, sendResponse) {
  if (message.target !== "offscreen") return true;

  if (message.type === "extract-frames") {
    extractFramesFromVideo(message.videoUrl)
      .then((dataUrls) => sendResponse({ dataUrls }))
      .catch((error) => sendResponse({ error: error.toString() }));
  }
  return true; // Indicates an asynchronous response.
}

// This function now extracts 3 frames: start, middle, and end.
async function extractFramesFromVideo(videoUrl) {
  const positions = [0.1, 0.5, 0.9]; // 10%, 50%, and 90% marks
  const dataUrls = [];

  for (const pos of positions) {
    const dataUrl = await getFrameAtPosition(videoUrl, pos);
    dataUrls.push(dataUrl);
  }
  return dataUrls;
}

function getFrameAtPosition(videoUrl, position) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = video.duration * position;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg"));
    });

    video.addEventListener("error", (e) => reject("Error loading video."));
  });
}
