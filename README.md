# DeepShield - Deepfake Detection Browser Extension

DeepShield is a Chrome extension that helps users detect potential deepfake content in images and videos while browsing the web.

## Features

### 🔍 Media Analysis
- Right-click any image or video to analyze it for potential deepfake manipulation
- Supports both single images and video frame analysis
- Generates heatmaps showing areas of potential manipulation
- Real-time analysis with confidence scores

### 📊 Results Display
- Clear verdict (Real/Fake/Uncertain) with confidence percentage
- Visual heatmap overlay showing suspicious regions
- Frame-by-frame analysis for videos
- Detailed view of individual frame results

### 📜 History Tracking
- Maintains history of all analyses
- Search and filter previous results
- Export history in JSON or CSV format
- Import previously exported history
- View detailed analysis results from history

### ⚙️ Customizable Settings
- Configurable API endpoint
- Adjustable confidence thresholds for Real/Fake detection
- Clear history option
- Default and custom threshold settings

## Technical Architecture

### Frontend (Chrome Extension)
- Popup interface for quick results viewing
- Settings page for configuration
- History page for past analyses
- Results page for detailed analysis view

### Backend (Python Flask Server)
- Deep learning model integration
- Image/video frame processing
- Grad-CAM heatmap generation
- Batch processing support

## Setup Instructions

1. **Install Dependencies**
```sh
pip install -r requirements.txt
```

2. **Start the Backend Server**
```sh
python app.py
```

3. **Load the Extension in Chrome**
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the extension directory

## API Configuration

The default API endpoint is `http://127.0.0.1:5000/predict`. You can modify this in the extension settings.

### API Parameters
- `real`: Confidence threshold for "Real" classification (default: 0.98)
- `fake`: Confidence threshold for "Fake" classification (default: 0.90)

## Model Information

- Based on ResNet50 architecture
- Trained for binary classification (Real/Fake)
- Includes Grad-CAM visualization
- Uses PyTorch framework

## Files Structure
```
├── app.py                 # Flask backend server
├── background.js          # Extension background script
├── history.html/js/css    # Analysis history interface
├── offscreen.html/js      # Video frame extraction
├── popup.html/js/css      # Main extension popup
├── results.html/js        # Detailed results view
├── settings.html/js/css   # Extension settings
└── manifest.json          # Extension configuration
```

## Development

### Prerequisites
- Python 3.8+
- PyTorch
- Flask
- Chrome Browser

### Key Components
- `background.js`: Handles context menu integration and API communication
- `app.py`: Manages model inference and image processing
- `popup.js`: Handles result display and user interface
- `history.js`: Manages analysis history and exports

## License

This project is licensed under the MIT License.
