import io
import cv2
import torch
import base64
import numpy as np
from PIL import Image
import torch.nn as nn
from pytorch_grad_cam import GradCAM
from flask import Flask, request, jsonify
from flask_cors import CORS
from torchvision import models, transforms
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

# --- 1. Define Your Model Architecture (No changes) ---
class DeepfakeDetector(nn.Module):
    def __init__(self, num_classes=2):
        super(DeepfakeDetector, self).__init__()
        self.backbone = models.resnet50()
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
    def forward(self, x):
        return self.backbone(x)

# --- 2. Initialize Flask App and Load Model (No changes) ---
app = Flask(__name__)
CORS(app)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = DeepfakeDetector(num_classes=2)
model_path = 'my_trained_model.pth'
checkpoint = torch.load(model_path, map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])
model.to(device)
model.eval()

# --- 3. Define Image Transformation (No changes) ---
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# --- Thresholds (No changes) ---
REAL_THRESHOLD = 0.98
FAKE_THRESHOLD = 0.90

# --- 4. UPDATED Prediction API Endpoint for Batching ---
@app.route("/predict", methods=["POST"])
def predict():
    # --- NEW: Use getlist to accept multiple files ---
    files = request.files.getlist("file")
    if not files:
        return jsonify({"error": "No file(s) provided"}), 400

    # Allow thresholds to be overridden by query params
    real_threshold = float(request.args.get('real', REAL_THRESHOLD))
    fake_threshold = float(request.args.get('fake', FAKE_THRESHOLD))

    frame_results = []
    try:
        # --- NEW: Loop through each file ---
        for file in files:
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            orig_w, orig_h = image.size
            # For model input
            image_resized = image.resize((224, 224))
            image_np = np.array(image_resized) / 255.0
            image_tensor = val_transform(image).unsqueeze(0).to(device)

            with torch.no_grad():
                output = model(image_tensor)
                probabilities = torch.softmax(output, dim=1)
                confidence, predicted_class_idx = torch.max(probabilities, 1)

            # Generate Grad-CAM heatmap
            target_layers = [model.backbone.layer4[-1]]
            cam = GradCAM(model=model, target_layers=target_layers)
            targets = [ClassifierOutputTarget(predicted_class_idx.item())]
            grayscale_cam = cam(input_tensor=image_tensor, targets=targets)[0, :]
            cam_image = show_cam_on_image(image_np, grayscale_cam, use_rgb=True)
            # Resize heatmap back to original image size
            cam_pil = Image.fromarray(cam_image).resize((orig_w, orig_h), resample=Image.BILINEAR)
            buffer = io.BytesIO()
            cam_pil.save(buffer, format="PNG")
            heatmap_base64 = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode('utf-8')

            # Also return the original image as base64
            orig_buffer = io.BytesIO()
            image.save(orig_buffer, format="PNG")
            orig_image_base64 = "data:image/png;base64," + base64.b64encode(orig_buffer.getvalue()).decode('utf-8')

            class_names = ['Real', 'Fake']
            raw_prediction = class_names[predicted_class_idx.item()]
            confidence_score = confidence.item()

            # Apply thresholding to each frame individually
            frame_prediction = "Uncertain"
            if raw_prediction == 'Fake' and confidence_score >= fake_threshold:
                frame_prediction = 'Fake'
            elif raw_prediction == 'Real' and confidence_score >= real_threshold:
                frame_prediction = 'Real'

            # Store the individual frame result
            frame_results.append({
                "prediction": frame_prediction,
                "confidence": confidence_score,
                "heatmap": heatmap_base64,
                "original": orig_image_base64
            })

        # --- NEW: Aggregate the results on the server ---
        fake_count = sum(1 for r in frame_results if r['prediction'] == 'Fake')
        is_fake = fake_count > 0
        
        # Calculate overall confidence
        if is_fake:
            # If any frame is fake, find the highest confidence among the fake frames
            overall_confidence = max(r['confidence'] for r in frame_results if r['prediction'] == 'Fake')
        else:
            # If all are real or uncertain, average their confidences
            overall_confidence = sum(r['confidence'] for r in frame_results) / len(frame_results)

        # --- NEW: Return a detailed JSON response ---
        return jsonify({
            "prediction": 'Fake' if is_fake else 'Real', # Final verdict
            "confidence": overall_confidence,
            "frameCount": len(frame_results),
            "frameResults": frame_results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 5. Run the Flask App (No changes) ---
if __name__ == "__main__":
    print("Starting Flask server... Your API will be available at http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)