// Constants
const IXL_ANALYTICS_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';
const IXL_MATHS_PATTERN = 'https://au.ixl.com/maths';
const IXL_ENGLISH_PATTERN = 'https://au.ixl.com/english';
const IXL_SCIENCE_PATTERN = 'https://au.ixl.com/science';
const SKILL_EXERCISE_SELECTOR = 'span.skill-tree-skill-name';
const IMPROVEMENT_CONTAINER_SELECTOR = '.improvement-container';
const SCORE_SELECTOR = '.score';

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

// Function to determine the current IXL page type
const getPageType = () => {
  const url = window.location.href;
  if (url.startsWith(IXL_ANALYTICS_PATTERN)) {
    return 'analytics';
  } else if (url.startsWith(IXL_MATHS_PATTERN) || url.startsWith(IXL_ENGLISH_PATTERN) || url.startsWith(IXL_SCIENCE_PATTERN)) {
    return 'subject_skills';
  }
  return 'unknown';
};

// Function to calculate scores from improvement containers (for analytics page)
const calculateAnalyticsScores = () => {
  const improvementContainers = document.querySelectorAll(IMPROVEMENT_CONTAINER_SELECTOR);
  let totalPoints = 0;
  let pointsGained = 0;
  let pointsLost = 0;
  
  improvementContainers.forEach(container => {
    const scores = container.querySelectorAll(SCORE_SELECTOR);
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
    type: 'score_data',
    total: totalPoints.toString(),
    gained: pointsGained.toString(),
    lost: pointsLost.toString()
  };
};

// Function to calculate total exercises (for subject pages)
const calculateTotalExercises = () => {
  const skillElements = document.querySelectorAll(SKILL_EXERCISE_SELECTOR);
  return {
    type: 'exercise_data',
    totalExercises: skillElements.length.toString()
  };
};

// Unified function to get data based on page type
const getDataForPage = () => {
  const pageType = getPageType();
  if (pageType === 'analytics') {
    return calculateAnalyticsScores();
  } else if (pageType === 'subject_skills') {
    return calculateTotalExercises();
  }
  return { type: 'error', message: 'Not an IXL analytics or subject skills page.' };
};

// Utility functions
const validateScore = (score) => {
  // Basic validation: check if it's a number between 0 and 100
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
};

const isTargetPage = () => {
  // This function is mainly for background script to check general target URLs
  // For content script, we use getPageType for more specific logic.
  const url = window.location.href;
  return url.startsWith(IXL_ANALYTICS_PATTERN) ||
         url.startsWith(IXL_MATHS_PATTERN) ||
         url.startsWith(IXL_ENGLISH_PATTERN) ||
         url.startsWith(IXL_SCIENCE_PATTERN);
};

// Function to send data to the popup (now sends different types of data)
const sendDataToPopup = (data) => {
  chrome.runtime.sendMessage({
    action: "updateDisplayData", // Renamed action for clarity
    data: data
  });
};

// Function to send data to the background script (optional, keeping for structure)
const sendDataToBackground = (data) => {
  chrome.runtime.sendMessage({
    action: "logData", // Example action
    data: data
  });
};

// Listen for messages from the popup or background script (mostly for 'ping' now)
console.log('Content script: Adding message listener.');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script: Message received:', request);

  // Handle ping request for readiness check
  if (request.action === "ping") {
    console.log('Content script: Received ping request.');
    sendResponse({ success: true, status: 'ready' });
    return true; 
  }

  // The refreshScore action will now trigger a full data re-calculation and send
  if (request.action === "refreshScore") {
    console.log('IXL Score Extension: Refresh requested. Recalculating data.');
    const data = getDataForPage();
    sendDataToPopup(data);
    sendDataToBackground(data);
    sendResponse({ success: true, data: data });
    return true; 
  }
});

// Listen for connections from the popup
chrome.runtime.onConnect.addListener((port) => {
  console.log('Content script: Port connected:', port.name);
  if (port.name === "popup") {
    console.log('Content script: Popup connected, sending initial data.');
    // Calculate current data and send it immediately through the port
    const currentData = getDataForPage();
    port.postMessage({ action: "updateDisplayData", data: currentData });
  }
});

// Initial action when content script loads on the target page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script: DOMContentLoaded fired.');
  if (isTargetPage()) {
    console.log('IXL Score Extension: Content script loaded on target page.');
    try {
      // Initial data calculation and send. This also covers the case where popup is not yet open.
      const initialData = getDataForPage();
      sendDataToPopup(initialData);
      sendDataToBackground(initialData);

      // Set up a MutationObserver to watch for changes in relevant containers
      console.log('Content script: Setting up MutationObserver.');
      const observer = new MutationObserver((mutations) => {
        console.log('Content script: DOM mutations detected. Recalculating data.');
        const newData = getDataForPage();
        sendDataToPopup(newData);
        sendDataToBackground(newData);
      });

      // Observe the body for changes (as skills/scores can appear anywhere)
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('Content script: MutationObserver started.');

    } catch (error) {
      console.error('Content script: Error during initial setup or MutationObserver callback:', error);
    }

  } else {
    console.log('IXL Score Extension: Content script loaded, but not on a target page.');
  }
}); 