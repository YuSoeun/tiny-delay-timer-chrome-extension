// Activate service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

// Default color values
let primaryColor = '#8a7bff';
let dangerColor = '#ff7eb5';

// Get CSS variable values from the DOM
function getCssVariables() {
    try {
        chrome.runtime.sendMessage({action: 'getCssVariables'}, function(response) {
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                console.warn(
                    '[CSS Variables] Communication error with content script: ' + errorMessage + '\n' +
                    'Using default values - primary: ' + primaryColor + ', danger: ' + dangerColor + '\n' +
                    'This is expected on extension startup or if no active tabs are available.'
                );
                return;
            }
            
            if (response && response.primaryColor) {
                primaryColor = response.primaryColor;
                dangerColor = response.dangerColor;
                console.log('CSS variables loaded:', {primaryColor, dangerColor});
            }
        });
    } catch (error) {
        console.error('Error while getting CSS variables:', error);
    }
}

// Run once at initialization
getCssVariables();

const timerState = {
    startTime: null,
    isRunning: false,
    pausedTime: null,
    activeTargetMinutes: 30, // Target time for the running timer
    intervalId: null
};

// Load saved state
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

// Message handler for timer actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateCssVariables') {
        if (message.primaryColor) primaryColor = message.primaryColor;
        if (message.dangerColor) dangerColor = message.dangerColor;
        console.log('CSS variables updated:', {primaryColor, dangerColor});
        return true;
    } else if (message.action === 'startTimer') {
        startTimer(message.targetMinutes);
    } else if (message.action === 'resumeTimer') {
        if (timerState.pausedTime) {
            const pausedDuration = message.pausedDuration || (Date.now() - timerState.pausedTime);
            timerState.startTime += pausedDuration;
            timerState.pausedTime = null;
            timerState.isRunning = true;
            
            saveState();
            timerState.intervalId = setInterval(updateBadge, 1000);
        }
    } else if (message.action === 'pauseTimer') {
        pauseTimer();
    } else if (message.action === 'resetTimer') {
        resetTimer(message.targetMinutes);
    } else if (message.action === 'getStatus') {
        chrome.storage.local.get(['targetMinutes'], (result) => {
            if (result.targetMinutes && !timerState.startTime && !timerState.isRunning) {
                timerState.activeTargetMinutes = result.targetMinutes;
            }
            
            const now = Date.now();
            let elapsed = 0;
            if (timerState.startTime) {
                elapsed = Math.floor((timerState.pausedTime || now) - timerState.startTime) / 1000;
            }
            const targetSeconds = timerState.activeTargetMinutes * 60;
            const remaining = Math.max(Math.ceil(targetSeconds - elapsed), 0);
            const delay = Math.max(Math.ceil(elapsed - targetSeconds), 0);

            sendResponse({
                isRunning: timerState.isRunning,
                startTime: timerState.startTime,
                pausedTime: timerState.pausedTime,
                activeTargetMinutes: timerState.activeTargetMinutes,
                remaining,
                delay
            });
        });
        
        return true; // Required for async response
    }
    
    return true;
});

async function loadState() {
    try {
        const state = await chrome.storage.local.get([
            'isRunning',
            'startTime',
            'pausedTime',
            'activeTargetMinutes'
        ]);

        if (state.isRunning && state.startTime) {
            timerState.startTime = state.startTime;
            timerState.isRunning = true;
            timerState.pausedTime = null;
            timerState.activeTargetMinutes = state.activeTargetMinutes || 30;
            startTimer(true);
        } else if (state.pausedTime) {
            timerState.startTime = state.startTime;
            timerState.pausedTime = state.pausedTime;
            timerState.isRunning = false;
            timerState.activeTargetMinutes = state.activeTargetMinutes || 30;
        }
    } catch (error) {
        console.error('Failed to load state:', error);
        resetTimer();
    }
}

function saveState() {
    chrome.storage.local.set({
        isRunning: timerState.isRunning,
        startTime: timerState.startTime,
        pausedTime: timerState.pausedTime,
        activeTargetMinutes: timerState.activeTargetMinutes
    });
}

function startTimer(targetMinutes) {
    if (timerState.isRunning) return;

    if (timerState.pausedTime) {
        // Restart from paused state
        timerState.startTime += Date.now() - timerState.pausedTime;
        timerState.pausedTime = null;
    } else {
        if (targetMinutes !== null && targetMinutes !== undefined) {
            timerState.activeTargetMinutes = targetMinutes;
        } else {
            chrome.storage.local.get(['targetMinutes'], (result) => {
                if (result.targetMinutes) {
                    timerState.activeTargetMinutes = result.targetMinutes;
                }
            });
        }
        
        timerState.startTime = Date.now();
    }

    timerState.isRunning = true;
    saveState();

    timerState.intervalId = setInterval(updateBadge, 1000);
}

function pauseTimer() {
    if (!timerState.isRunning) return;

    timerState.isRunning = false;
    timerState.pausedTime = Date.now();
    clearInterval(timerState.intervalId);
    saveState();
}

function resetTimer(customTargetMinutes) {
    timerState.isRunning = false;
    timerState.startTime = null;
    timerState.pausedTime = null;
    
    if (customTargetMinutes !== undefined) {
        timerState.activeTargetMinutes = customTargetMinutes;
        saveState();
    } else {
        chrome.storage.local.get(['targetMinutes'], (result) => {
            if (result.targetMinutes) {
                timerState.activeTargetMinutes = result.targetMinutes;
            } else {
                timerState.activeTargetMinutes = 30; // Default value
            }
            saveState();
        });
    }
    
    clearInterval(timerState.intervalId);
    chrome.action.setBadgeText({ text: "" });
}

function updateBadge() {
    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTime) / 1000);
    const targetSeconds = timerState.activeTargetMinutes * 60;
    const remaining = targetSeconds - elapsed;

    let badgeText = '';
    let badgeColor = primaryColor;

    if (remaining >= 0) {
        if (remaining >= 3600) {
            // Display in hours
            const hours = Math.floor(remaining / 3600);
            badgeText = `${hours}h`;
        } else if (remaining >= 60) {
            // Display in minutes
            badgeText = `${Math.floor(remaining / 60)}m`;
        } else {
            // Display in seconds
            badgeText = `${Math.floor(remaining)}s`;
        }
    } else {
        const delaySeconds = Math.abs(remaining);
        if (delaySeconds >= 3600) {
            // Display delay in hours
            const hours = Math.floor(delaySeconds / 3600);
            badgeText = `+${hours}h`;
        } else if (delaySeconds >= 60) {
            // Display delay in minutes
            badgeText = `+${Math.floor(delaySeconds / 60)}m`;
        } else {
            // Display delay in seconds
            badgeText = `+${Math.floor(delaySeconds)}s`;
        }
        badgeColor = dangerColor;
    }

    try {
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    } catch (error) {
        console.error('Failed to update badge:', error);
    }
}