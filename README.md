# IXL Score Extension

A Chrome extension for tracking IXL scores.

## Features
- Track IXL scores in real-time
- Easy-to-use popup interface
- Automatic score updates

## Installation
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory

## Development
- `manifest.json` - Extension configuration
- `popup.html/js` - Extension popup interface
- `content.js` - Script that interacts with IXL website
- `background.js` - Background service worker
- `styles.css` - Styling for the popup

## TODO
- Implement actual score extraction from IXL website
- Add score history tracking
- Add notifications for score milestones
