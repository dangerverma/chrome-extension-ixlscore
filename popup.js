// Constants
const IXL_ANALYTICS_PATTERN = 'https://au.ixl.com/analytics/progress-and-improvement';
const IXL_MATHS_ROOT = 'https://au.ixl.com/maths';
const IXL_ENGLISH_ROOT = 'https://au.ixl.com/english';
const IXL_SCIENCE_ROOT = 'https://au.ixl.com/science';
const NOT_IXL_MESSAGE = 'This plugin only works with iXL.com website';

// DOM Elements
const totalScoreElement = document.getElementById('current-score');
const donutChartContainer = document.getElementById('donut-chart-container');
const donutChart = document.getElementById('donut-chart');
const donutTotalValue = document.getElementById('donut-total-value');
const donutTotalLabel = document.getElementById('donut-total-label');

// DOM elements for legend labels
const completedPercentageElement = document.getElementById('completed-percentage');
const inProgressPercentageElement = document.getElementById('in-progress-percentage');
const notStartedPercentageElement = document.getElementById('not-started-percentage');

// Function to animate a number count up with stronger ease-out effect
const animateNumber = (element, start, end, duration) => {
  const range = end - start;
  const startTime = performance.now();

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);

    // Apply a stronger ease-out quintic function for more dramatic slowdown
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

// Function to animate the conic gradient for the donut chart
const animateDonutGradient = (element, completedTarget, inProgressTarget, notStartedTarget, duration) => {
  const startTime = performance.now();

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);

    // Apply a stronger ease-out quintic function
    progress = 1 - Math.pow(1 - progress, 5);

    const currentCompleted = completedTarget * progress;
    const currentInProgress = inProgressTarget * progress;
    const currentNotStarted = notStartedTarget * progress;

    const gradient = `conic-gradient(
      #2ecc71 0% ${currentCompleted}%,
      #f1c40f ${currentCompleted}% ${currentCompleted + currentInProgress}%,
      #5b5b5b ${currentCompleted + currentInProgress}% ${currentCompleted + currentInProgress + currentNotStarted}%
    )`;
    element.style.background = gradient;

    if (elapsed < duration) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

// Function to update the score display or show a message
const updateDisplay = (type, value) => {
  // Get references to main display sections
  const totalScoreDisplaySection = document.getElementById('total-score-display');
  const donutLegend = document.getElementById('donut-legend');

  // Hide all main display sections initially
  totalScoreDisplaySection.classList.add('hide');
  donutChartContainer.classList.add('hide');
  donutLegend.classList.add('hide'); // Hide legend initially

  switch (type) {
    case 'score':
      const { total: scoreTotal, gained, lost } = value;

      totalScoreDisplaySection.classList.remove('hide');
      document.getElementById('current-score').textContent = parseInt(scoreTotal).toLocaleString();
      document.getElementById('total-score-label').textContent = 'Total Points';

      document.getElementById('current-score').style.color = '#2ecc71'; // Green for points
      break;

    case 'exercises':
      const { totalExercises, completedExercises, inProgressExercises, notStartedExercises } = value;

      donutChartContainer.classList.remove('hide');
      donutLegend.classList.remove('hide'); // Show legend for exercise data

      const exerciseTotal = parseInt(totalExercises);
      const completed = parseInt(completedExercises);
      const inProgress = parseInt(inProgressExercises);
      const notStarted = parseInt(notStartedExercises);

      donutTotalValue.textContent = exerciseTotal.toLocaleString();

      if (exerciseTotal === 0) {
        completedPercentageElement.textContent = `0 (0%)`;
        inProgressPercentageElement.textContent = `0 (0%)`;
        notStartedPercentageElement.textContent = `0 (0%)`;
        donutChart.style.background = 'conic-gradient(#5b5b5b 0% 100%)'; // All not started
      } else {
        const completedPercent = (completed / exerciseTotal) * 100;
        const inProgressPercent = (inProgress / exerciseTotal) * 100;
        const notStartedPercent = (notStarted / exerciseTotal) * 100;

        completedPercentageElement.textContent = `${completed.toLocaleString()} (${completedPercent.toFixed(1)}%)`;
        inProgressPercentageElement.textContent = `${inProgress.toLocaleString()} (${inProgressPercent.toFixed(1)}%)`;
        notStartedPercentageElement.textContent = `${notStarted.toLocaleString()} (${notStartedPercent.toFixed(1)}%)`;

        // Animate the donut chart segments
        animateDonutGradient(donutChart, completedPercent, inProgressPercent, notStartedPercent, 1500); // 1.5 second animation
      }
      break;

    case 'message':
      totalScoreDisplaySection.classList.remove('hide');
      document.getElementById('current-score').textContent = value;
      document.getElementById('current-score').style.color = '#bdc3c7';
      document.getElementById('total-score-label').textContent = '';
      break;

    case 'loading':
      totalScoreDisplaySection.classList.remove('hide');
      document.getElementById('current-score').textContent = 'Loading...';
      document.getElementById('current-score').style.color = '#bdc3c7';
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
    }
  });
});