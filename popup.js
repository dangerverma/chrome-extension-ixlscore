console.log('Popup: Script loaded!');

// Constants for IXL URLs
const IXL_ANALYTICS_PATTERN = '/analytics/progress-and-improvement';
const IXL_MATHS_ROOT = '/maths';
const IXL_ENGLISH_ROOT = '/english';
const IXL_SCIENCE_ROOT = '/science';
const NOT_IXL_MESSAGE = 'This plugin only works with iXL.com website';

// DOM Elements
const totalScoreDisplay = document.getElementById('total-score-display');
const currentScore = document.getElementById('current-score');
const scoreLabel = document.getElementById('total-score-label');
const donutChartContainer = document.getElementById('donut-chart-container');
const donutChart = document.getElementById('donut-chart');
const ixlNavigationContainer = document.getElementById('ixl-navigation-container');
const goToIxlButton = document.getElementById('go-to-ixl-button');
const copyrightFooter = document.getElementById('copyright-footer');

// Initialize ECharts instance
let chart = null;

// Function to update copyright footer with hardcoded version
function updateCopyrightFooter() {
    console.log('Popup: Updating copyright footer with hardcoded version...');
    
    const version = '1.3'; // Hardcoded version from manifest.json
    console.log('Popup: Version from hardcoded value:', version);
    const footerText = copyrightFooter.querySelector('p');
    footerText.innerHTML = `License: GPL v3 | v${version} | <a href="https://github.com/dangerverma/chrome-extension-ixlscore" target="_blank">Source Code</a>`;
    console.log('Popup: Footer updated with version:', version);
}

function initDonutChart() {
    console.log('Popup: Initializing donut chart...');
    
    // Check if ECharts is available
    if (typeof echarts === 'undefined') {
        console.error('Popup: ECharts library not loaded!');
        return;
    }
    
    // Check if the chart element exists
    if (!donutChart) {
        console.error('Popup: Chart element not found!');
        return;
    }
    
    if (chart) {
        chart.dispose();
    }
    
    console.log('Popup: Creating ECharts instance...');
    chart = echarts.init(donutChart);
    console.log('Popup: Chart instance created:', chart);
    
    // Default empty state
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                return params.name + ': ' + params.value + ' (' + Math.round(params.percent) + '%)';
            }
        },
        series: [{
            name: 'Exercises',
            type: 'pie',
            radius: ['50%', '80%'], /* Increased radius for larger chart */
            center: ['50%', '50%'], /* Centered chart for full chart space, as legend is now integrated */
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 4,
                borderColor: '#2c3e50',
                borderWidth: 2
            },
            label: {
                show: true,
                position: 'inside',
                formatter: function(params) {
                    return params.name + '\n' + params.value + ' (' + Math.round(params.percent) + '%)';
                },
                color: '#fff',
                textBorderColor: '#000',
                textBorderWidth: 2
            },
            labelLine: {
                show: false
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold',
                    formatter: function(params) {
                        return params.name + '\n' + params.value + ' (' + Math.round(params.percent) + '%)';
                    }
                },
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            data: []
        }],
        title: {
            text: '', // Placeholder for total exercises
            left: 'center',
            top: '48%',
            textStyle: {
                fontSize: 20,
                fontWeight: 'bold',
                color: '#ccc'
            }
        }
    };
    
    chart.setOption(option);
    console.log('Popup: Initial chart option set');
    
    // Handle window resize
    window.addEventListener('resize', function() {
        chart.resize();
    });
}

// Function to animate number counting
function animateNumber(element, start, end, duration = 1500) {
    const startTime = performance.now();
    const easeOutQuint = t => 1 - Math.pow(1 - t, 5); // Stronger ease-out effect
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuint(progress);
        const current = Math.floor(start + (end - start) * easedProgress);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Function to update the display based on message type
function updateDisplay(data) {
    console.log('Popup: updateDisplay called with data:', data);
    console.log('Popup: Data type:', data.type);
    if (data.type === 'score_data') {
        // Show score display, hide donut chart
        totalScoreDisplay.classList.remove('hide');
        donutChartContainer.classList.add('hide');
        
        // Update the h1 title for analytics pages
        const scoreDisplayH1 = totalScoreDisplay.querySelector('h1');
        if (scoreDisplayH1) {
            scoreDisplayH1.textContent = 'Progress & Improvement Score';
        }
        
        // Update score with animation
        const currentValue = parseInt(currentScore.textContent.replace(/,/g, '')) || 0;
        animateNumber(currentScore, currentValue, parseInt(data.total));
        
        // Update label
        scoreLabel.textContent = 'Total Points';
    } else if (data.type === 'exercise_data') {
        console.log('Popup: Processing exercise data');
        // Hide score display, show donut chart
        totalScoreDisplay.classList.add('hide');
        donutChartContainer.classList.remove('hide');
        console.log('Popup: Chart container should now be visible');
        console.log('Popup: Chart container element:', donutChartContainer);
        console.log('Popup: Chart container classes:', donutChartContainer.className);
        console.log('Popup: Chart container display style:', window.getComputedStyle(donutChartContainer).display);
        console.log('Popup: Chart container visibility:', window.getComputedStyle(donutChartContainer).visibility);
        console.log('Chart element children:', donutChart.children.length);
        
        // Update the h1 title with subject name
        const donutChartH1 = donutChartContainer.querySelector('h1');
        if (donutChartH1 && data.subjectName) {
            // Convert to title case and add " Score" at the end
            const titleCaseSubject = data.subjectName
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            donutChartH1.textContent = titleCaseSubject + ' Score';
        } else if (donutChartH1) {
            donutChartH1.textContent = 'Exercises Score'; // Fallback
        }
        
        // Calculate percentages
        const total = parseInt(data.totalExercises);
        const completed = parseInt(data.completedExercises);
        const inProgress = parseInt(data.inProgressExercises);
        const notStarted = parseInt(data.notStartedExercises);
        
        const completedPercentage = ((completed / total) * 100).toFixed(0);
        const inProgressPercentage = ((inProgress / total) * 100).toFixed(0);
        const notStartedPercentage = ((notStarted / total) * 100).toFixed(0);
        
        // Update chart data
        const chartData = [
            {
                value: completed,
                name: 'Completed',
                percentage: completedPercentage,
                itemStyle: { color: '#2ecc71' }
            },
            {
                value: inProgress,
                name: 'In Progress',
                percentage: inProgressPercentage,
                itemStyle: { color: '#f1c40f' }
            },
            {
                value: notStarted,
                name: 'Not Started',
                percentage: notStartedPercentage,
                itemStyle: { color: '#5b5b5b' }
            }
        ];
        
        console.log('Popup: Updating chart with data:', JSON.stringify(chartData, null, 2));
        
        // Set the new data (no animation)
        chart.setOption({
            title: {
                text: total.toLocaleString(), // Update total exercises in the center
            },
            series: [{
                data: chartData
            }]
        });
        
        console.log('Popup: Chart updated successfully');
        
        console.log('Popup: Chart updated successfully');
    } else if (data.type === 'message') {
        // Handle message display
        totalScoreDisplay.classList.remove('hide');
        donutChartContainer.classList.add('hide');
        currentScore.textContent = data.message;
        scoreLabel.textContent = '';
    } else if (data.type === 'loading') {
        // Handle loading state
        totalScoreDisplay.classList.remove('hide');
        donutChartContainer.classList.add('hide');
        currentScore.textContent = 'Loading...';
        scoreLabel.textContent = '';
    }
}

// Utility function to check if current page is a target page
function isTargetPage(url) {
    console.log('Popup: isTargetPage - Checking URL:', url);
    const isAnalytics = url.includes(IXL_ANALYTICS_PATTERN);
    const isMaths = url.includes(IXL_MATHS_ROOT);
    const isEnglish = url.includes(IXL_ENGLISH_ROOT);
    const isScience = url.includes(IXL_SCIENCE_ROOT);
    
    console.log(`Popup: isTargetPage - Analytics match: ${isAnalytics}, Maths match: ${isMaths}, English match: ${isEnglish}, Science match: ${isScience}`);

    return isAnalytics || isMaths || isEnglish || isScience;
    }

// Function to check if the extension is ready to score/count progress
function isExtensionReady(tabUrl) {
    console.log('Popup: Checking if extension is ready for URL:', tabUrl);
    
    // Check if we're on a target IXL page
    if (!isTargetPage(tabUrl)) {
        console.log('Popup: Not on a target IXL page - extension not ready');
        return false;
    }
    
    // Additional checks can be added here in the future
    // For example, checking if the page has loaded completely
    // or if specific elements are present
    
    console.log('Popup: Extension is ready for scoring/counting progress');
    return true;
}

// Function to check if the extension is actively working (has data)
function isExtensionActive() {
    // Check if we have any valid data displayed
    const scoreDisplay = document.getElementById('total-score-display');
    const chartContainer = document.getElementById('donut-chart-container');
    
    // If either display is visible and not showing loading/error, extension is active
    if (!scoreDisplay.classList.contains('hide')) {
        const currentScore = document.getElementById('current-score');
        if (currentScore && currentScore.textContent !== 'Loading...' && currentScore.textContent !== '0') {
            return true;
        }
    }
    
    if (!chartContainer.classList.contains('hide')) {
        // Chart is visible, check if it has data
        if (chart && chart.getOption().series[0].data.length > 0) {
            return true;
        }
    }
    
    return false;
}

// Function to update button state based on readiness
function updateButtonState(isReady) {
    console.log('Popup: Updating button state, isReady:', isReady);
    
    // Check if extension is actually active (has data)
    const isActive = isExtensionActive();
    const finalReadyState = isReady && isActive;
    
    if (finalReadyState) {
        // Extension is ready and active - show active state
        goToIxlButton.textContent = 'Extension Active - Viewing IXL Data';
        goToIxlButton.disabled = true;
        goToIxlButton.classList.add('disabled');
        goToIxlButton.classList.remove('ready');
    } else {
        // Extension is not ready or not active - show inactive state
        goToIxlButton.textContent = 'Go to IXL.com Website now';
        goToIxlButton.disabled = false;
        goToIxlButton.classList.remove('disabled');
        goToIxlButton.classList.remove('ready');
    }
}

// Function to update status message based on readiness
function updateStatusMessage(isReady) {
    const statusMessage = document.querySelector('.status-message');
    if (statusMessage) {
        // Check if extension is actually active (has data)
        const isActive = isExtensionActive();
        const finalReadyState = isReady && isActive;
        
        if (finalReadyState) {
            statusMessage.textContent = 'Extension is active and tracking your progress!';
            statusMessage.style.color = '#28a745'; // Green for active state
            statusMessage.style.borderLeftColor = '#28a745';
            statusMessage.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        } else {
            statusMessage.textContent = 'Click the button below to navigate to IXL.com and start tracking your progress!';
            statusMessage.style.color = '#f39c12'; // Orange for inactive state
            statusMessage.style.borderLeftColor = '#f39c12';
            statusMessage.style.backgroundColor = 'rgba(243, 156, 18, 0.1)';
        }
    }
}

// Function to navigate to IXL.com
function navigateToIxl() {
    // Only navigate if the button is not disabled (i.e., extension is not ready)
    if (!goToIxlButton.disabled) {
        chrome.tabs.create({ url: 'https://www.ixl.com' });
    }
}

// Add event listener for the IXL button
goToIxlButton.addEventListener('click', navigateToIxl);

// Initialize chart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup: DOMContentLoaded fired.');
    
    // Initialize the chart
    initDonutChart();
    
    // Update copyright footer with version from manifest
    updateCopyrightFooter();
    
    // Query for the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        console.log('Popup: Active tab queried:', activeTab);
        console.log('Popup: Tab URL:', activeTab.url);
        
        // Check if the extension is ready
        const isReady = isExtensionReady(activeTab.url);
        
        // Update button state based on readiness
        updateButtonState(isReady);
        updateStatusMessage(isReady);
        
        // Check if we're on a target page
        if (isTargetPage(activeTab.url)) {
            console.log('Popup: On a target page.', activeTab.url);
            // Set up connection to content script
            const port = chrome.tabs.connect(activeTab.id, {name: 'popup'});
            console.log('Popup: Port connected.', port);
            
            // Listen for messages from content script
            port.onMessage.addListener(function(message) {
                console.log('Popup: Message received from content script:', message);
                if (message.data) {
                    console.log('Popup: Processing data:', message.data);
                    updateDisplay(message.data);
                    
                    // If we received valid data, the extension is definitely ready
                    if (message.data.type === 'score_data' || message.data.type === 'exercise_data') {
                        updateButtonState(true);
                        updateStatusMessage(true);
                    }
                } else {
                    console.log('Popup: No data in message');
                }
            });
            
            // Request initial data
            port.postMessage({action: 'getData'});
            console.log('Popup: Requested initial data from content script.');
            
            // Set up periodic state check to keep button and status in sync
            const stateCheckInterval = setInterval(() => {
                if (port.onDisconnect) {
                    // Port is still connected, update state
                    const currentReady = isExtensionReady(activeTab.url);
                    updateButtonState(currentReady);
                    updateStatusMessage(currentReady);
                } else {
                    // Port disconnected, clear interval
                    clearInterval(stateCheckInterval);
                }
            }, 2000); // Check every 2 seconds
            
            // Also listen for port disconnection
            port.onDisconnect.addListener(function() {
                console.log('Popup: Port disconnected');
                // Clear the state check interval
                clearInterval(stateCheckInterval);
                // If port disconnects, extension might not be ready
                updateButtonState(false);
                updateStatusMessage(false);
            });
        } else {
            console.log('Popup: Not on a target page.', activeTab.url);
            // Not on a target page - show navigation container
            totalScoreDisplay.classList.add('hide');
            donutChartContainer.classList.add('hide');
            ixlNavigationContainer.classList.remove('hide');
        }
    });
}); 