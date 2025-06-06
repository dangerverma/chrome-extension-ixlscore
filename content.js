// Constants
const TARGET_URL_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';

// IMPORTANT: Replace these placeholder selectors with the actual selectors found on the IXL page.
// You can use Chrome DevTools (F12) to inspect the page elements and find their unique selectors.
const SCORE_SELECTORS = {
  // Example: A class or ID of the element containing the main score.
  // scoreContainer: '.score-container',
  // Example: A class or ID of the specific element holding the score value.
  // scoreValue: '.score-value',
  
  // Placeholder selectors - UPDATE THESE!
  progressTable: '.progress-table', // Selector for the table or container holding scores
  scoreCells: '.progress-table td.score-cell' // Selector for individual score cells within the table
};

// Function to calculate scores from improvement containers
const calculateScores = () => {
  const improvementContainers = document.querySelectorAll('.improvement-container');
  let totalPoints = 0;
  let pointsGained = 0;
  let pointsLost = 0;
  
  improvementContainers.forEach(container => {
    const scores = container.querySelectorAll('.score');
    if (scores.length === 2) {
      const startScore = parseInt(scores[0].textContent);
      const endScore = parseInt(scores[1].textContent);
      if (!isNaN(startScore) && !isNaN(endScore)) {
        const points = endScore - startScore;
        if (points > 0) {
          pointsGained += points;
        } else if (points < 0) {
          pointsLost += Math.abs(points); // Store lost points as positive number
        }
        totalPoints += points; // Total can be positive or negative
      }
    }
  });

  return {
    total: totalPoints.toString(),
    gained: pointsGained.toString(),
    lost: pointsLost.toString()
  };
};

// Utility functions
const validateScore = (score) => {
  // Basic validation: check if it's a number between 0 and 100
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
};

const isTargetPage = () => {
  return window.location.href.startsWith(TARGET_URL_PATTERN);
};

// Function to send scores to the popup
const sendScoresToPopup = (scores) => {
  chrome.runtime.sendMessage({
    action: "updateScore",
    scores: scores
  });
};

// Function to send score to the background script (optional, keeping for structure)
const sendScoresToBackground = (scores) => {
  chrome.runtime.sendMessage({
    action: "logScore", // Example action
    scores: scores
  });
};

// Listen for messages from the popup or background script
console.log('Content script: Adding message listener.');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script: Message received:', request);

  // Handle ping request for readiness check
  if (request.action === "ping") {
    console.log('Content script: Received ping request.');
    sendResponse({ success: true, status: 'ready' });
    return true; // Indicate that sendResponse will be called asynchronously
  }

  if (request.action === "refreshScore") {
    console.log('IXL Score Extension: Score refresh requested.');
    const scores = calculateScores();
    sendScoresToPopup(scores);
    sendScoresToBackground(scores);
    sendResponse({ success: true, scores: scores });
    return true; // Keep message channel open for sendResponse
  }
});

// Listen for connections from the popup
chrome.runtime.onConnect.addListener((port) => {
  console.log('Content script: Port connected:', port.name);
  // Check if the connection is from the popup
  if (port.name === "popup") {
    console.log('Content script: Popup connected, sending initial scores.');
    // Calculate current scores and send them immediately through the port
    const currentScores = calculateScores();
    port.postMessage({ action: "updateScore", scores: currentScores });

    // Optional: Add a listener for messages from the popup on this port if needed later
    // port.onMessage.addListener((msg) => { /* ... */ });

    // Optional: Handle port disconnection
    // port.onDisconnect.addListener(() => { console.log('Content script: Popup disconnected.'); });
  }
});

// Initial action when content script loads on the target page
// Removed: Automatic initial score send here. Will send on popup connection instead.
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script: DOMContentLoaded fired.');
  if (isTargetPage()) {
    console.log('IXL Score Extension: Content script loaded on target page.');
    try {
      // Removed: Initial score calculation and send on DOMContentLoaded.
      // Scores will now be sent when the popup connects.

      // Set up a MutationObserver to watch for changes in the improvement containers
      console.log('Content script: Setting up MutationObserver.');
      const observer = new MutationObserver((mutations) => {
        console.log('Content script: DOM mutations detected.');
        const scores = calculateScores();
        sendScoresToPopup(scores);
        sendScoresToBackground(scores);
      });

      // Start observing the document with the configured parameters
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('Content script: MutationObserver started.');

    } catch (error) {
      console.error('Content script: Error during initial setup or MutationObserver callback:', error);
    }

  } else {
    console.log('IXL Score Extension: Content script loaded, but not on the target page.');
  }
}); 