document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["lastResult"], (data) => {
        const result = data.lastResult;
        const content = document.getElementById("content");

        if (!result || result.error) {
            content.innerHTML = `<p>Error: ${result ? result.error : "No result found"}</p>`;
            return;
        }

        let html = `
            <div class="overall ${result.prediction.toLowerCase()}">
                <h2>Overall Prediction: ${result.prediction}</h2>
                <p class="confidence">Confidence: ${(result.confidence * 100).toFixed(2)}%</p>
            </div>
            <div class="media-container">
        `;

        if (result.mediaType === "image") {
            // For single image
            html += `
                <div class="media-item">
                    <div class="overlay">
                        <img src="${result.srcUrl}" alt="Analyzed Image" />
                        <img src="${result.frameResults[0].heatmap}" class="heatmap" alt="Heatmap" />
                    </div>
                    <p class="prediction">Prediction: ${result.frameResults[0].prediction}</p>
                    <p class="confidence-small">Confidence: ${(result.frameResults[0].confidence * 100).toFixed(2)}%</p>
                </div>
            `;
        } else if (result.mediaType === "video") {
            // For video frames
            result.frameResults.forEach((frame, index) => {
                const frameSrc = result.frameImages ? result.frameImages[index] : result.srcUrl;
                html += `
                    <div class="media-item">
                        <div class="overlay">
                            <img src="${frameSrc}" alt="Frame ${index + 1}" />
                            <img src="${frame.heatmap}" class="heatmap" alt="Heatmap" />
                        </div>
                        <p class="prediction">Frame ${index + 1}: ${frame.prediction}</p>
                        <p class="confidence-small">Confidence: ${(frame.confidence * 100).toFixed(2)}%</p>
                    </div>
                `;
            });
        }

        html += `</div>`;
        content.innerHTML = html;
    });
});