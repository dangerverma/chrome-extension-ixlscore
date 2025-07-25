// Minimal background service worker
console.log('IXL Score Extension background service worker active.');

// Target URL pattern for the IXL analytics, maths, english, and science pages
const TARGET_URL_PATTERN = 'https://.*\\.ixl\\.com/(analytics/progress-and-improvement|maths|english|science)';

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has finished loading and the URL matches the target pattern
  if (changeInfo.status === 'complete' && tab.url && tab.url.match(new RegExp(TARGET_URL_PATTERN))) {
    console.log(`Background script: Tab ${tabId} updated to target page. Injecting content script.`);

    // Inject the content script into the updated tab
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    })
    .then(() => console.log(`Background script: Injected content.js into tab ${tabId}.`))
    .catch(err => console.error(`Background script: Failed to inject content script into tab ${tabId}:`, err));
  }
});

// Service workers typically listen for events like installation or messages
// chrome.runtime.onInstalled.addListener(() => { ... });
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { ... }); 