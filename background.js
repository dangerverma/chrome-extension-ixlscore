// Constants
const STORAGE_KEY = 'ixlScore';
const DEFAULT_SCORE = '0';

// Utility functions
const logError = (error, context) => {
  console.error(`Error in ${context}:`, error);
  // Here you could add error reporting service integration
};

// Storage operations
const initializeStorage = async () => {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (!(STORAGE_KEY in result)) {
      await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SCORE });
    }
  } catch (error) {
    logError(error, 'storage initialization');
  }
};

// Message handling
const handleMessage = async (request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'logScore':
        console.log('Score updated:', request.score);
        // Here you could add analytics or logging service integration
        break;
      
      case 'getScore':
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        sendResponse({ score: result[STORAGE_KEY] || DEFAULT_SCORE });
        break;
      
      default:
        console.warn('Unknown action:', request.action);
    }
  } catch (error) {
    logError(error, 'message handling');
    sendResponse({ error: error.message });
  }
  return true; // Keep the message channel open for async response
};

// Tab management
const handleTabUpdate = async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('ixl.com')) {
    try {
      // Reset score when navigating to a new IXL page
      await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SCORE });
      
      // Notify content script
      await chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' });
    } catch (error) {
      logError(error, 'tab update handling');
    }
  }
};

// Initialize
const initialize = async () => {
  try {
    // Initialize storage
    await initializeStorage();

    // Set up message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Set up tab update listener
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    // Log successful initialization
    console.log('Background service worker initialized successfully');
  } catch (error) {
    logError(error, 'background initialization');
  }
};

// Start the background service worker
initialize(); 