// Constants for IXL URLs
const IXL_ANALYTICS_PATTERN = 'https://au.ixl.com/analytics/';
const IXL_MATHS_ROOT = 'https://au.ixl.com/maths';
const IXL_ENGLISH_ROOT = 'https://au.ixl.com/english';
const IXL_SCIENCE_ROOT = 'https://au.ixl.com/science';
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

// Function to update copyright footer with version from manifest
function updateCopyrightFooter() {
    console.log('Popup: Updating copyright footer with version from manifest...');
    
    // Try to get version from management API
    if (chrome.management && chrome.management.getSelf) {
        chrome.management.getSelf((extensionInfo) => {
            console.log('Popup: Extension info received:', extensionInfo);
            if (extensionInfo && extensionInfo.version) {
                const version = extensionInfo.version;
                console.log('Popup: Version from manifest:', version);
                const footerText = copyrightFooter.querySelector('p');
                footerText.innerHTML = `License: GPL v3 | v${version} | <a href="https://github.com/dangerverma/chrome-extension-ixlscore" target="_blank">Source Code</a>`;
                console.log('Popup: Footer updated with version:', version);
            } else {
                console.warn('Popup: No version info received from management API');
                setDefaultFooter();
            }
        });
    } else {
        console.warn('Popup: Management API not available, using default footer');
        setDefaultFooter();
    }
}

// Fallback function to set default footer
function setDefaultFooter() {
    const footerText = copyrightFooter.querySelector('p');
    footerText.innerHTML = `License: GPL v3 | <a href="https://github.com/dangerverma/chrome-extension-ixlscore" target="_blank">Source Code</a>`;
}

function initDonutChart() {
    if (chart) {
        chart.dispose();
    }
    
    chart = echarts.init(donutChart);
    
    // Default empty state
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        series: [{
            name: 'Exercises',
            type: 'pie',
            radius: ['40%', '70%'], /* Adjusted radius for full chart space, as legend is now integrated */
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
                formatter: '{b}\n{c} ({d}%)',
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
                    formatter: '{b}\n{c} ({d}%)'
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
    if (data.type === 'score_data') {
        // Show score display, hide donut chart
        totalScoreDisplay.classList.remove('hide');
        donutChartContainer.classList.add('hide');
        
        // Update score with animation
        const currentValue = parseInt(currentScore.textContent.replace(/,/g, '')) || 0;
        animateNumber(currentScore, currentValue, parseInt(data.total));
        
        // Update label
        scoreLabel.textContent = 'Total Points';
    } else if (data.type === 'exercise_data') {
        // Hide score display, show donut chart
        totalScoreDisplay.classList.add('hide');
        donutChartContainer.classList.remove('hide');
        
        // Calculate percentages
        const total = parseInt(data.totalExercises);
        const completed = parseInt(data.completedExercises);
        const inProgress = parseInt(data.inProgressExercises);
        const notStarted = parseInt(data.notStartedExercises);
        
        const completedPercentage = ((completed / total) * 100).toFixed(1);
        const inProgressPercentage = ((inProgress / total) * 100).toFixed(1);
        const notStartedPercentage = ((notStarted / total) * 100).toFixed(1);
        
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
        
        chart.setOption({
            title: {
                text: total.toLocaleString(), // Update total exercises in the center
            },
            series: [{
                data: chartData
            }]
        });
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
    const isAnalytics = url.startsWith(IXL_ANALYTICS_PATTERN);
    const isMaths = url.startsWith(IXL_MATHS_ROOT);
    const isEnglish = url.startsWith(IXL_ENGLISH_ROOT);
    const isScience = url.startsWith(IXL_SCIENCE_ROOT);
    
    console.log(`Popup: isTargetPage - Analytics match: ${isAnalytics}, Maths match: ${isMaths}, English match: ${isEnglish}, Science match: ${isScience}`);

    return isAnalytics || isMaths || isEnglish || isScience;
}

// Function to navigate to IXL.com
function navigateToIxl() {
    chrome.tabs.create({ url: 'https://www.ixl.com' });
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
        
        // Check if we're on a target page
        if (isTargetPage(activeTab.url)) {
            console.log('Popup: On a target page.', activeTab.url);
            // Set up connection to content script
            const port = chrome.tabs.connect(activeTab.id, {name: 'popup'});
            console.log('Popup: Port connected.', port);
            
            // Listen for messages from content script
            port.onMessage.addListener(function(message) {
                console.log('Popup: Message received from content script:', message);
                updateDisplay(message.data);
            });
            
            // Request initial data
            port.postMessage({action: 'getData'});
            console.log('Popup: Requested initial data from content script.');
        } else {
            console.log('Popup: Not on a target page.', activeTab.url);
            // Not on a target page - show navigation container
            totalScoreDisplay.classList.add('hide');
            donutChartContainer.classList.add('hide');
            ixlNavigationContainer.classList.remove('hide');
        }
    });
});