// Constants
const SCORE_SELECTORS = {
  // Add specific selectors for IXL score elements
  // These are placeholders - update with actual selectors
  scoreElement: '.ixl-score',
  scoreValue: '.ixl-score-value'
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const validateScore = (score) => {
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
};

const extractScoreFromPage = () => {
  try {
    // This is a placeholder - implement actual score extraction logic
    // based on IXL's DOM structure
    const scoreElement = document.querySelector(SCORE_SELECTORS.scoreElement);
    if (!scoreElement) {
      throw new Error('Score element not found');
    }

    const score = scoreElement.textContent.trim();
    if (!validateScore(score)) {
      throw new Error('Invalid score format');
    }

    return score;
  } catch (error) {
    console.error('Error extracting score:', error);
    return null;
  }
};

// Message handling
const handleMessage = async (request, sender, sendResponse) => {
  if (request.action === "refreshScore") {
    try {
      // Add a small delay to ensure the page is fully loaded
      await sleep(500);
      
      const score = extractScoreFromPage();
      if (score === null) {
        throw new Error('Failed to extract score');
      }

      // Save to storage
      await chrome.storage.local.set({ ixlScore: score });

      // Notify popup
      chrome.runtime.sendMessage({
        action: "updateScore",
        score: score
      });

      sendResponse({ success: true });
    } catch (error) {
      console.error('Error refreshing score:', error);
      chrome.runtime.sendMessage({
        action: "updateScore",
        score: '0',
        error: error.message
      });
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep the message channel open for async response
  }
};

// Mutation observer for score changes
const observeScoreChanges = () => {
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const score = extractScoreFromPage();
        if (score !== null) {
          await chrome.storage.local.set({ ixlScore: score });
          chrome.runtime.sendMessage({
            action: "updateScore",
            score: score
          });
        }
      }
    }
  });

  // Start observing the score element
  const scoreElement = document.querySelector(SCORE_SELECTORS.scoreElement);
  if (scoreElement) {
    observer.observe(scoreElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
};

// Initialize
const initialize = () => {
  try {
    // Set up message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Set up mutation observer for score changes
    observeScoreChanges();

    // Initial score check
    const score = extractScoreFromPage();
    if (score !== null) {
      chrome.storage.local.set({ ixlScore: score });
      chrome.runtime.sendMessage({
        action: "updateScore",
        score: score
      });
    }
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
};

// Start the content script
initialize(); 