# IXL Score Extension

A Chrome extension for tracking IXL scores on various pages.

![See your score in real-time (2)](https://github.com/user-attachments/assets/8b5f003e-7ee4-423f-9f24-5da79c62a9c1)
![Untitled design (3)](https://github.com/user-attachments/assets/e09c85ce-bdf4-421a-9cc8-4945f9531468)
![Untitled (1280 x 800 px)](https://github.com/user-attachments/assets/3989c239-5a03-4183-9dc0-df7cddd3c8ad)

## Features
- Provides Completed, In Progress and Not Started scores for:
  - Maths page
  - English page
  - Science page
- Provides a total count of points accumulated on the Analytics > In Progress page


## Installation
1. Clone this repository or download the latest dist <a href="dist/ixl-score-extension-latest.zip">here</a>
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory

## Development
- `manifest.json` - Extension configuration
- `popup.html/js` - Extension popup interface
- `content.js` - Script that interacts with IXL website
- `background.js` - Background service worker
- `styles.css` - Styling for the popup

## Building New Versions

To create a distribution package for a new version:

1. **Update the version** in `manifest.json`:
   ```json
   {
     "version": "1.2"
   }
   ```

2. **Run the build script**:
   ```bash
   python3 build.py
   ```

3. **Find your distribution** in the `dist/` folder:
   ```
   dist/ixl-score-extension-latest.zip
   ```

The build script will:
- ✅ Read the version from `manifest.json`
- ✅ Create a clean zip file with all necessary files
- ✅ Exclude development files (`.git`, `.DS_Store`, etc.)
- ✅ Include documentation (`README.md`, `LICENSE`)
- ✅ Generate a timestamped filename for easy versioning

