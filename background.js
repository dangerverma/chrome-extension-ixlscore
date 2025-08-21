// Minimal background service worker
console.log('IXL Score Extension background service worker active.');

// Target URL pattern for the IXL analytics, maths, english, and science pages
const TARGET_URL_PATTERN = 'https://.*\\.ixl\\.com/(analytics/progress-and-improvement|maths|english|science)';

// Icon states - using different icons for active and inactive states
const ICON_STATES = {
  active: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  inactive: {
    "16": "icons/icon16_greyscale.png",
    "48": "icons/icon48_greyscale.png",
    "128": "icons/icon128_greyscale.png"
  }
};

// Function to update extension icon
function updateExtensionIcon(tabId, isActive) {
  if (isActive) {
    // Set active icon (normal colored)
    chrome.action.setIcon({
      path: ICON_STATES.active,
      tabId: tabId
    }).then(() => {
      // Clear any badge when active
      chrome.action.setBadgeText({
        text: "",
        tabId: tabId
      });
      console.log(`Background script: Icon set to ACTIVE (colored) for tab ${tabId}`);
    }).catch(err => {
      console.error(`Background script: Failed to set active icon for tab ${tabId}:`, err);
    });
  } else {
    // Set inactive icon (greyscale)
    chrome.action.setIcon({
      path: ICON_STATES.inactive,
      tabId: tabId
    }).then(() => {
      // Clear any badge when using greyscale icon
      chrome.action.setBadgeText({
        text: "",
        tabId: tabId
      });
      console.log(`Background script: Icon set to INACTIVE (greyscale) for tab ${tabId}`);
    }).catch(err => {
      console.error(`Background script: Failed to set inactive icon for tab ${tabId}:`, err);
    });
  }
}

// Function to check if a page can calculate scores
function canCalculateScores(url) {
  return url && url.match(new RegExp(TARGET_URL_PATTERN));
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Handle loading state
  if (changeInfo.status === 'loading') {
    console.log(`Background script: Tab ${tabId} is loading...`);
    // Set icon to loading state (could add a loading indicator here)
    return;
  }
  
  // Check if the tab has finished loading and the URL matches the target pattern
  if (changeInfo.status === 'complete' && tab.url) {
    const canScore = canCalculateScores(tab.url);
    
    if (canScore) {
      console.log(`Background script: Tab ${tabId} updated to target page. Injecting content script.`);
      
      // Inject the content script into the updated tab
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      })
      .then(() => {
        console.log(`Background script: Injected content.js into tab ${tabId}.`);
        // Set icon to active state initially
        updateExtensionIcon(tabId, true);
      })
      .catch(err => {
        console.error(`Background script: Failed to inject content script into tab ${tabId}:`, err);
        // If injection fails, set icon to inactive
        updateExtensionIcon(tabId, false);
      });
    } else {
      // Not a target page, set icon to inactive
      console.log(`Background script: Tab ${tabId} is not a target page. Setting icon to inactive.`);
      updateExtensionIcon(tabId, false);
    }
  }
  
  // Handle URL changes (navigation)
  if (changeInfo.url) {
    const canScore = canCalculateScores(changeInfo.url);
    console.log(`Background script: Tab ${tabId} navigated to ${changeInfo.url}, canScore: ${canScore}`);
    
    if (canScore) {
      // New URL can score, set icon to active
      updateExtensionIcon(tabId, true);
    } else {
      // New URL cannot score, set icon to inactive
      updateExtensionIcon(tabId, false);
    }
  }
});

// Listen for messages from content script about scoring capability
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateIconState") {
    const tabId = sender.tab.id;
    const canScore = request.canScore;
    
    console.log(`Background script: Received icon state update for tab ${tabId}, canScore: ${canScore}`);
    updateExtensionIcon(tabId, canScore);
    
    sendResponse({ success: true });
    return true;
  }
});

// Listen for tab activation to update icon state
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      const canScore = canCalculateScores(tab.url);
      updateExtensionIcon(tab.id, canScore);
    }
  });
});

// Listen for tab removal to clean up
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`Background script: Tab ${tabId} removed, cleaning up.`);
});

// Set default icon state when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Background script: Extension installed/updated, setting default icon state.');
  
  // Get all current tabs and set their icon states
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url) {
        const canScore = canCalculateScores(tab.url);
        updateExtensionIcon(tab.id, canScore);
      }
    });
  });
});

// Listen for extension action clicks to ensure icon state is correct
chrome.action.onClicked.addListener((tab) => {
  console.log('Background script: Extension action clicked on tab:', tab.id);
  
  // Check if this tab can calculate scores and update icon accordingly
  if (tab.url) {
    const canScore = canCalculateScores(tab.url);
    updateExtensionIcon(tab.id, canScore);
  }
});

// Service workers typically listen for events like installation or messages
// chrome.runtime.onInstalled.addListener(() => { ... }); 