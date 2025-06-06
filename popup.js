// Constants
const STORAGE_KEY = 'ixlScore';
const STATUS_MESSAGE_TIMEOUT = 3000;

// DOM Elements
const elements = {
  currentScore: document.getElementById('current-score'),
  refreshButton: document.getElementById('refresh-score'),
  statusMessage: document.getElementById('status-message')
};

// Utility functions
const showStatusMessage = (message, isError = false) => {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status ${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    elements.statusMessage.textContent = '';
    elements.statusMessage.className = 'status';
  }, STATUS_MESSAGE_TIMEOUT);
};

const updateScoreDisplay = (score) => {
  elements.currentScore.textContent = score || '0';
  elements.currentScore.setAttribute('aria-label', `Current IXL score: ${score || '0'}`);
};

// Storage operations
const getStoredScore = async () => {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || '0';
  } catch (error) {
    console.error('Error reading from storage:', error);
    showStatusMessage('Error reading score from storage', true);
    return '0';
  }
};

const setStoredScore = async (score) => {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: score });
  } catch (error) {
    console.error('Error writing to storage:', error);
    showStatusMessage('Error saving score to storage', true);
  }
};

// Message handling
const handleMessage = (request, sender, sendResponse) => {
  if (request.action === "updateScore") {
    updateScoreDisplay(request.score);
    setStoredScore(request.score);
    showStatusMessage('Score updated successfully');
  }
};

// Event handlers
const handleRefreshClick = async () => {
  try {
    elements.refreshButton.disabled = true;
    showStatusMessage('Refreshing score...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    await chrome.tabs.sendMessage(tab.id, { action: "refreshScore" });
  } catch (error) {
    console.error('Error refreshing score:', error);
    showStatusMessage('Error refreshing score', true);
  } finally {
    elements.refreshButton.disabled = false;
  }
};

// Initialize
const initialize = async () => {
  try {
    // Load initial score
    const initialScore = await getStoredScore();
    updateScoreDisplay(initialScore);

    // Set up event listeners
    elements.refreshButton.addEventListener('click', handleRefreshClick);
    chrome.runtime.onMessage.addListener(handleMessage);

    // Check if we're on an IXL page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes('ixl.com')) {
      showStatusMessage('Please navigate to an IXL page to use this extension', true);
      elements.refreshButton.disabled = true;
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showStatusMessage('Error initializing extension', true);
  }
};

// Start the extension
document.addEventListener('DOMContentLoaded', initialize); 