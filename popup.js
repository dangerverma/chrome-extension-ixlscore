// Constants
const IXL_ANALYTICS_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';
const IXL_MATHS_ROOT = 'https://au.ixl.com/maths';
const IXL_ENGLISH_ROOT = 'https://au.ixl.com/english';
const IXL_SCIENCE_ROOT = 'https://au.ixl.com/science';
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
      const currentTotal = parseInt(totalScoreElement.textContent.replace(/,/g, '')) || 0;
      const targetTotal = parseInt(total);
      const animationDuration = 1500;
      
      if (!isNaN(targetTotal)) {
         animateNumber(totalScoreElement, currentTotal, targetTotal, animationDuration);
      } else {
         totalScoreElement.textContent = total || 'N/A';
      }

      // Update Gained and Lost points directly (no animation for simplicity)
      pointsGainedElement.textContent = parseInt(gained).toLocaleString() || '0';
      pointsLostElement.textContent = parseInt(lost).toLocaleString() || '0';

      document.getElementById('total-score-display').style.display = '';
      document.getElementById('points-summary').style.display = '';
      totalScoreElement.style.fontSize = '3.5em';
      totalScoreElement.style.color = '#2ecc71';
      document.getElementById('total-score-label').textContent = 'Total Points';
      break;
    case 'exercises':
      const { totalExercises } = value;
      
      // Animate Total Exercises (similar to Total Points)
      const currentExercises = parseInt(totalScoreElement.textContent.replace(/,/g, '')) || 0;
      const targetExercises = parseInt(totalExercises);
      const exerciseAnimationDuration = 1500;

      if (!isNaN(targetExercises)) {
        animateNumber(totalScoreElement, currentExercises, targetExercises, exerciseAnimationDuration);
      } else {
        totalScoreElement.textContent = totalExercises || 'N/A';
      }

      // Hide points summary as it's not relevant for exercises
      document.getElementById('points-summary').style.display = 'none';
      document.getElementById('total-score-display').style.display = '';
      totalScoreElement.style.fontSize = '3.5em';
      totalScoreElement.style.color = '#3498db';
      document.getElementById('total-score-label').textContent = 'Total Exercises';
      break;
    case 'message':
      totalScoreElement.textContent = value;
      totalScoreElement.style.fontSize = '1em';
      totalScoreElement.style.color = '#bdc3c7';
      document.getElementById('total-score-display').style.display = '';
      document.getElementById('points-summary').style.display = 'none';
      document.getElementById('total-score-label').textContent = '';
      break;
    case 'loading':
       totalScoreElement.textContent = 'Loading...';
       totalScoreElement.style.fontSize = '1em';
       totalScoreElement.style.color = '#bdc3c7';
       document.getElementById('points-summary').style.display = 'none';
       document.getElementById('total-score-label').textContent = '';
       break;
  }
};

// Utility function to check if the URL is a target page for the popup
const isTargetPage = (url) => {
  return url && (
    url.startsWith(IXL_ANALYTICS_PATTERN) ||
    url.startsWith(IXL_MATHS_ROOT) ||
    url.startsWith(IXL_ENGLISH_ROOT) ||
    url.startsWith(IXL_SCIENCE_ROOT)
  );
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

    // Check if we are on a target page AND if the tab has a valid ID
    if (activeTab && activeTab.id && activeTab.url && isTargetPage(activeTab.url)) {
      console.log('Popup opened on a target IXL page. Attempting to connect to content script.');

      // Connect to the content script in the active tab
      const port = chrome.tabs.connect(activeTab.id, { name: "popup" });
      console.log('Popup: Initiated port connection.', port);

      // Listen for messages on the port
      port.onMessage.addListener((request) => {
        console.log('Popup: Received message on port:', request);
        if (request.action === "updateDisplayData") {
          console.log('Popup: Processing updateDisplayData message.', request.data);
          if (request.data.type === 'score_data') {
            updateDisplay('score', request.data);
          } else if (request.data.type === 'exercise_data') {
            updateDisplay('exercises', request.data);
          } else if (request.data.type === 'error') {
             updateDisplay('message', request.data.message);
          } else {
            console.warn('Popup: Received unknown data type:', request.data.type);
            updateDisplay('message', 'Unknown data format.');
          }
        }
      });

      // Handle disconnection
      port.onDisconnect.addListener(() => {
        console.log('Popup: Port disconnected.');
        // You might want to update the UI to reflect disconnection if necessary
        updateDisplay('message', 'Connection lost. Re-open popup.');
      });

      // Show loading state initially while waiting for data from content script
      updateDisplay('loading');

    } else {
      console.log('Popup opened on a non-target IXL page or active tab/URL missing.');
      // On a non-target page, hide score details and show the message
      updateDisplay('message', NOT_IXL_MESSAGE);
      document.getElementById('points-summary').style.display = 'none';
    }
  });
});

// Removed: Old chrome.runtime.onMessage.addListener
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { /* ... */ }); 