// Constants
const IXL_ANALYTICS_PATTERN = '/analytics/progress-and-improvement';
const IXL_MATHS_PATTERN = '/maths';
const IXL_ENGLISH_PATTERN = '/english';
const IXL_SCIENCE_PATTERN = '/science';
const SKILL_EXERCISE_SELECTOR = 'span.skill-tree-skill-name';
const IMPROVEMENT_CONTAINER_SELECTOR = '.improvement-container';
const SCORE_SELECTOR = '.score';

// Global variable to store the active popup port
let popupPort = null;

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
  console.log('Content script: Current URL:', url);
  if (url.includes(IXL_ANALYTICS_PATTERN)) {
    console.log('Content script: Page type: analytics');
    return 'analytics';
  } else if (url.includes(IXL_MATHS_PATTERN) || url.includes(IXL_ENGLISH_PATTERN) || url.includes(IXL_SCIENCE_PATTERN)) {
    console.log('Content script: Page type: subject_skills');
    return 'subject_skills';
  }
  console.log('Content script: Page type: unknown');
  return 'unknown';
};

// Function to calculate scores from improvement containers (for analytics page)
const calculateAnalyticsScores = () => {
  console.log('Content script: Calculating analytics scores...');
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
  console.log('Content script: Analytics scores calculated:', { totalPoints, pointsGained, pointsLost });

  return {
    type: 'score_data',
    total: totalPoints.toString(),
    gained: pointsGained.toString(),
    lost: pointsLost.toString()
  };
};

// Function to get subject name from page h1 element
const getSubjectName = () => {
  console.log('Content script: Getting subject name from page...');
  
  // Try to find h1 element under header or in common locations
  let subjectName = '';
  
  // Method 1: Look for h1 under header element
  const headerH1 = document.querySelector('header h1');
  if (headerH1) {
    subjectName = headerH1.textContent.trim();
    console.log('Content script: Found subject name in header h1:', subjectName);
  }
  
  // Method 2: Look for h1 with common subject-related classes
  if (!subjectName) {
    const subjectH1 = document.querySelector('h1[class*="subject"], h1[class*="title"], h1[class*="page-title"]');
    if (subjectH1) {
      subjectName = subjectH1.textContent.trim();
      console.log('Content script: Found subject name in subject h1:', subjectName);
    }
  }
  
  // Method 3: Look for any h1 that might contain subject name
  if (!subjectName) {
    const allH1s = document.querySelectorAll('h1');
    for (let h1 of allH1s) {
      const text = h1.textContent.trim();
      if (text && text.length > 0 && text.length < 50) { // Reasonable length for a subject name
        subjectName = text;
        console.log('Content script: Found subject name in general h1:', subjectName);
        break;
      }
    }
  }
  
  // Fallback: Use URL to determine subject
  if (!subjectName) {
    const url = window.location.href;
    if (url.includes('/maths')) {
      subjectName = 'Mathematics';
    } else if (url.includes('/english')) {
      subjectName = 'English';
    } else if (url.includes('/science')) {
      subjectName = 'Science';
    }
    console.log('Content script: Using fallback subject name:', subjectName);
  }
  
  return subjectName;
};

// Function to calculate total exercises (for subject pages)
const calculateTotalExercises = () => {
  console.log('Content script: Calculating total exercises...');
  const skillElements = document.querySelectorAll(SKILL_EXERCISE_SELECTOR);
  let completedExercises = 0;
  let inProgressExercises = 0;

  // Count completed exercises by score = 100
  let scoreElements = document.querySelectorAll('a.skill-tree-skill-score.yui3-tooltip-trigger');
  console.log('Content script: Found score elements with combined selector:', scoreElements.length);
  
  // If no elements found, try alternative selectors
  if (scoreElements.length === 0) {
    scoreElements = document.querySelectorAll('a[class*="skill-tree-skill-score"]');
    console.log('Content script: Found score elements with partial class selector:', scoreElements.length);
  }
  
  if (scoreElements.length === 0) {
    scoreElements = document.querySelectorAll('.skill-tree-skill-score');
    console.log('Content script: Found score elements with class selector:', scoreElements.length);
  }
  
  scoreElements.forEach((element, index) => {
    const scoreText = element.textContent.trim();
    const elementClasses = element.className;
    console.log(`Content script: Score element ${index}: "${scoreText}" (classes: "${elementClasses}")`);
    // Extract number from parentheses, e.g., (85) or (100)
    const match = scoreText.match(/\((\d+)\)/);
    if (match && match[1]) {
      const score = parseInt(match[1]);
      console.log(`Content script: Extracted score: ${score}`);
      if (!isNaN(score)) {
        if (score === 100) {
          completedExercises++;
          console.log(`Content script: Added to completed. Total: ${completedExercises}`);
        } else if (score < 100) {
          inProgressExercises++;
          console.log(`Content script: Added to in-progress. Total: ${inProgressExercises}`);
        }
      }
    }
  });
  const notStartedExercises = (skillElements.length - completedExercises - inProgressExercises);
  console.log('Content script: Exercise data calculated:', { totalExercises: skillElements.length, completedExercises, inProgressExercises, notStartedExercises });

  // Get subject name from the page
  const subjectName = getSubjectName();
  console.log('Content script: Subject name:', subjectName);

  return {
    type: 'exercise_data',
    subjectName: subjectName,
    totalExercises: skillElements.length.toString(),
    completedExercises: completedExercises.toString(),
    inProgressExercises: inProgressExercises.toString(),
    notStartedExercises: notStartedExercises.toString()
  };
};

// Unified function to get data based on page type
const getDataForPage = () => {
  console.log('Content script: Getting data for page...');
  const pageType = getPageType();
  if (pageType === 'analytics') {
    const data = calculateAnalyticsScores();
    console.log('Content script: Data for analytics page:', data);
    return data;
  } else if (pageType === 'subject_skills') {
    const data = calculateTotalExercises();
    console.log('Content script: Data for subject skills page:', data);
    return data;
  }
  console.log('Content script: Not an IXL analytics or subject skills page.');
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
  console.log('Content script: isTargetPage - Checking URL:', url);
  const isAnalytics = url.includes(IXL_ANALYTICS_PATTERN);
  const isMaths = url.includes(IXL_MATHS_PATTERN);
  const isEnglish = url.includes(IXL_ENGLISH_PATTERN);
  const isScience = url.includes(IXL_SCIENCE_PATTERN);
  
  console.log(`Content script: isTargetPage - Analytics match: ${isAnalytics}, Maths match: ${isMaths}, English match: ${isEnglish}, Science match: ${isScience}`);

  return isAnalytics || isMaths || isEnglish || isScience;
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
    if (popupPort) {
        console.log('Content script: Sending refreshScore data to popup:', data);
        popupPort.postMessage({ action: "updateDisplayData", data: data });
    }
    sendDataToBackground(data);
    sendResponse({ success: true, data: data });
    return true; 
  }
});

// Listen for connections from the popup
chrome.runtime.onConnect.addListener((port) => {
  console.log('Content script: Port connected:', port.name);
  if (port.name === "popup") {
    popupPort = port; // Store the port reference
    console.log('Content script: Popup connected, sending initial data.');
    // Calculate current data and send it immediately through the port
    const currentData = getDataForPage();
    popupPort.postMessage({ action: "updateDisplayData", data: currentData });

    // Handle disconnection of the popup
    popupPort.onDisconnect.addListener(() => {
        console.log('Content script: Popup disconnected.');
        popupPort = null; // Clear the port reference on disconnect
    });
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
      // Only send initial data via port if popup is already connected
      if (popupPort) {
          console.log('Content script: Sending initial data via port to popup:', initialData);
          popupPort.postMessage({ action: "updateDisplayData", data: initialData });
      }
      sendDataToBackground(initialData);

      // Set up a MutationObserver to watch for changes in relevant containers
      console.log('Content script: Setting up MutationObserver.');
      const observer = new MutationObserver((mutations) => {
        console.log('Content script: DOM mutations detected. Recalculating data.');
        const newData = getDataForPage();
        // Only send updated data via port if popup is connected
        if (popupPort) {
            console.log('Content script: Sending updated data via port to popup:', newData);
            popupPort.postMessage({ action: "updateDisplayData", data: newData });
        }
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