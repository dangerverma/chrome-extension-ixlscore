// Constants
const TARGET_URL_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';
const NOT_IXL_MESSAGE = 'This plugin only works with iXL.com website';

// DOM Elements
const totalScoreElement = document.getElementById('current-score');
const pointsGainedElement = document.getElementById('points-gained-value');
const pointsLostElement = document.getElementById('points-lost-value');

// Function to animate a number count up with stronger ease-out effect
const animateNumber = (element, start, end, duration) => {
  const range = end - start;
  const startTime = performance.now();

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);

    // Apply a stronger ease-out quintic function for more dramatic slowdown
    // Source: https://easings.net/#easeOutQuint
    progress = 1 - Math.pow(1 - progress, 5);

    const currentValue = start + (range * progress);

    // Update text content with current value and formatting
    element.textContent = Math.floor(currentValue).toLocaleString();

    if (elapsed < duration) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

// Function to update the score display or show a message
const updateDisplay = (type, value) => {
  switch (type) {
    case 'score':
      const { total, gained, lost } = value;
      
      // Animate Total Points
      const currentTotal = parseInt(totalScoreElement.textContent.replace(/,/g, '')) || 0; // Get current displayed number, remove commas
      const targetTotal = parseInt(total);
      const animationDuration = 1500; // 1.5 seconds
      
      if (!isNaN(targetTotal)) {
         animateNumber(totalScoreElement, currentTotal, targetTotal, animationDuration);
      } else {
         totalScoreElement.textContent = total || 'N/A'; // Fallback if total is not a valid number
      }

      // Update Gained and Lost points directly (no animation for simplicity)
      pointsGainedElement.textContent = parseInt(gained).toLocaleString() || '0';
      pointsLostElement.textContent = parseInt(lost).toLocaleString() || '0';

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

// Function to send a ping to the content script to check readiness (not needed with port messaging)
// const pingContentScript = (tabId) => { /* ... */ };

// Function to send message with retry logic (can keep for other potential uses)
// const sendMessageWithRetry = (tabId, message, retries = 5, delay = 200) => { /* ... */ };

// Establish connection to content script and set up message listener
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup: DOMContentLoaded fired.');
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    console.log('Popup: chrome.tabs.query result:', tabs);
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
           // Removed: Save the updated scores to storage
           // chrome.storage.local.set({ /* ... */ });
        }
      });

      // Handle disconnection
      port.onDisconnect.addListener(() => {
        console.log('Popup: Port disconnected.');
        // You might want to update the UI to reflect disconnection if necessary
      });

      // Show loading state initially
      updateDisplay('loading');

    } else {
      console.log('Popup opened on a non-target page or active tab/URL missing.');
      // On a non-target page, hide score details and show the message
      updateDisplay('message', NOT_IXL_MESSAGE);
      document.getElementById('points-summary').style.display = 'none';
    }
  });
});

// Removed: Old chrome.runtime.onMessage.addListener
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { /* ... */ }); 