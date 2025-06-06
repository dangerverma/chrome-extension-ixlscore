// Constants
const STORAGE_KEY_TOTAL = 'ixlTotalScore';
const STORAGE_KEY_GAINED = 'ixlPointsGained';
const STORAGE_KEY_LOST = 'ixlPointsLost';
const TARGET_URL_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';
const NOT_IXL_MESSAGE = 'This plugin only works with iXL.com website';

// DOM Elements
const totalScoreElement = document.getElementById('current-score');
const pointsGainedElement = document.getElementById('points-gained-value');
const pointsLostElement = document.getElementById('points-lost-value');

// Function to update the score display or show a message
const updateDisplay = (type, value) => {
  switch (type) {
    case 'score':
      const { total, gained, lost } = value;
      // Format numbers for human readability
      const formattedTotal = parseInt(total).toLocaleString() || 'N/A';
      const formattedGained = parseInt(gained).toLocaleString() || '0';
      const formattedLost = parseInt(lost).toLocaleString() || '0';

      totalScoreElement.textContent = formattedTotal;
      pointsGainedElement.textContent = formattedGained;
      pointsLostElement.textContent = formattedLost;

      document.getElementById('total-score-display').style.display = '';
      document.getElementById('points-summary').style.display = '';
      totalScoreElement.style.fontSize = '48px'; // Restore score font size
      totalScoreElement.style.color = '#98c379'; // Restore score color
      break;
    case 'message':
      totalScoreElement.textContent = value;
      totalScoreElement.style.fontSize = '16px'; // Adjust font size for message
      totalScoreElement.style.color = '#abb2bf'; // Adjust color for message
      document.getElementById('total-score-display').style.display = ''; // Keep the main display area
      document.getElementById('points-summary').style.display = 'none'; // Hide detailed scores
      break;
    case 'loading':
       totalScoreElement.textContent = 'Loading...';
       totalScoreElement.style.fontSize = '16px';
       totalScoreElement.style.color = '#abb2bf';
       document.getElementById('points-summary').style.display = 'none';
       break;
  }
};

// Utility function to check if the URL is the target page
const isTargetPage = (url) => {
  return url && url.startsWith(TARGET_URL_PATTERN);
};

// Function to send a ping to the content script to check readiness (not needed with port messaging for initial load)
// const pingContentScript = (tabId) => { /* ... */ };

// Function to send message with retry logic (can keep for other potential uses, but not initial score load)
// const sendMessageWithRetry = (tabId, message, retries = 5, delay = 200) => { /* ... */ };

// Load initial scores from storage and establish connection to content script
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup: DOMContentLoaded fired.'); // Log at the start of the listener
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    console.log('Popup: chrome.tabs.query result:', tabs); // Log the result of the query
    const activeTab = tabs[0];

    // Check if we are on the target page
    if (activeTab && activeTab.id && activeTab.url && isTargetPage(activeTab.url)) {
      console.log('Popup opened on target IXL page. Attempting to connect to content script.');

      // Connect to the content script in the active tab
      const port = chrome.tabs.connect(activeTab.id, { name: "popup" });
      console.log('Popup: Initiated port connection.', port);

      // Listen for messages on the port
      port.onMessage.addListener((request) => {
        console.log('Popup: Received message on port:', request);
        if (request.action === "updateScore") {
          console.log('Popup: Processing updateScore message.', request.scores);
           const { total, gained, lost } = request.scores;
           updateDisplay('score', { total, gained, lost });
           // Save the updated scores to storage
           chrome.storage.local.set({
             [STORAGE_KEY_TOTAL]: total,
             [STORAGE_KEY_GAINED]: gained,
             [STORAGE_KEY_LOST]: lost
           });
        }
      });

      // Handle disconnection
      port.onDisconnect.addListener(() => {
        console.log('Popup: Port disconnected.');
        // You might want to update the UI to reflect disconnection if necessary
      });

      // Always try to load from storage first for quicker initial display
      chrome.storage.local.get([STORAGE_KEY_TOTAL, STORAGE_KEY_GAINED, STORAGE_KEY_LOST], (result) => {
        const total = result[STORAGE_KEY_TOTAL] || 'N/A'; // Show N/A if no stored score
        const gained = result[STORAGE_KEY_GAINED] || '0';
        const lost = result[STORAGE_KEY_LOST] || '0';
        // Only update if there's stored data, otherwise show loading initially
        if (result[STORAGE_KEY_TOTAL] !== undefined) {
             updateDisplay('score', { total, gained, lost });
        } else {
             // Show loading state if no stored data
            updateDisplay('loading');
        }
      });

    } else {
      console.log('Popup opened on a non-target page or active tab/URL missing.');
      // On a non-target page, hide score details and show the message
      updateDisplay('message', NOT_IXL_MESSAGE);
      document.getElementById('points-summary').style.display = 'none';
    }
  });
});

// Removed: Old chrome.runtime.onMessage.addListener for updateScore. Now using port messaging.
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { /* ... */ }); 