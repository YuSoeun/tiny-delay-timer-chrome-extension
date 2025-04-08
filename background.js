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
    activeTargetMinutes: 30,
    intervalId: null,
    elapsedAtPause: 0
};

// Load saved state
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

// Message handler for timer actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === 'updateCssVariables') {
            if (message.primaryColor) primaryColor = message.primaryColor;
            if (message.dangerColor) dangerColor = message.dangerColor;
            console.log('CSS variables updated:', {primaryColor, dangerColor});
            sendResponse({ success: true });
        } else if (message.action === 'startTimer') {
            const result = startTimer(message.targetMinutes);
            sendResponse({ success: result });
        } else if (message.action === 'resumeTimer') {
            const result = resumeTimer(message.elapsedAtPause);
            sendResponse({ success: result });
        } else if (message.action === 'pauseTimer') {
            const result = pauseTimer();
            sendResponse({ success: result });
        } else if (message.action === 'resetTimer') {
            const result = resetTimer(message.targetMinutes);
            sendResponse({ success: result });
        } else if (message.action === 'getStatus') {
            // Handle immediately without async operations to avoid message port closure
            const status = getTimerStatus(message.savedTargetMinutes);
            sendResponse(status);
        } else if (message.action === 'checkBadgeStatus') {
            // Check badge update interval and recover if needed
            const isIntervalActive = timerState.intervalId !== null;
            
            // Create new interval if timer is running but interval is missing
            if (timerState.isRunning && !isIntervalActive) {
                startBadgeInterval();
            }
            
            sendResponse({
                isRunning: timerState.isRunning,
                hasInterval: isIntervalActive
            });
        } else if (message.action === 'getCssVariables') {
            // Simple responses should be sent immediately
            sendResponse({ primaryColor, dangerColor });
        } else {
            sendResponse({ success: false, error: "Unknown action" });
        }
    } catch (error) {
        console.error('Error handling message:', error, message);
        sendResponse({ success: false, error: error.message });
    }
    
    // Always return false to indicate we're not using sendResponse asynchronously
    return false;
});

// Separated into its own function for synchronous call in message handler
function getTimerStatus(savedTargetMinutes) {
    try {
        if (savedTargetMinutes && !timerState.startTime && !timerState.isRunning) {
            timerState.activeTargetMinutes = savedTargetMinutes;
        }
        
        const now = Date.now();
        let elapsed = 0;
        if (timerState.startTime) {
            // Calculate elapsed time in ms first, then convert to seconds with floor
            elapsed = Math.floor(((timerState.pausedTime || now) - timerState.startTime) / 1000);
        }
        const targetSeconds = timerState.activeTargetMinutes * 60;
        const remaining = Math.max(targetSeconds - elapsed, 0);
        const delay = Math.max(elapsed - targetSeconds, 0);

        return {
            isRunning: timerState.isRunning,
            startTime: timerState.startTime,
            pausedTime: timerState.pausedTime,
            activeTargetMinutes: timerState.activeTargetMinutes,
            elapsedAtPause: timerState.elapsedAtPause,
            remaining,
            delay
        };
    } catch (error) {
        console.error('Error getting timer status:', error);
        return {
            isRunning: false,
            error: error.message
        };
    }
}

async function loadState() {
    try {
        const state = await chrome.storage.local.get([
            'isRunning',
            'startTime',
            'pausedTime',
            'activeTargetMinutes',
            'elapsedAtPause',
            'timerStatus',  // Explicit timer state flag
            'targetMinutes' // Default target time
        ]);

        console.log('Loaded state:', state);

        // Set default timer time if available
        if (state.targetMinutes) {
            timerState.activeTargetMinutes = state.targetMinutes;
        }

        if (state.elapsedAtPause) {
            timerState.elapsedAtPause = state.elapsedAtPause;
        }

        // Restore explicit saved state if available
        if (state.timerStatus === 'paused' && state.pausedTime) {
            timerState.startTime = state.startTime;
            timerState.pausedTime = state.pausedTime;
            timerState.isRunning = false;
            timerState.activeTargetMinutes = state.activeTargetMinutes || state.targetMinutes || 30;
            updateBadge();
        } else if (state.isRunning && state.startTime) {
            timerState.startTime = state.startTime;
            timerState.isRunning = true;
            timerState.pausedTime = null;
            timerState.activeTargetMinutes = state.activeTargetMinutes || state.targetMinutes || 30;
            if (timerState.intervalId) {
                clearInterval(timerState.intervalId);
            }
            timerState.intervalId = setInterval(updateBadge, 1000);
            updateBadge();
        } else if (state.pausedTime) {
            timerState.startTime = state.startTime;
            timerState.pausedTime = state.pausedTime;
            timerState.isRunning = false;
            timerState.activeTargetMinutes = state.activeTargetMinutes || state.targetMinutes || 30;
            updateBadge();
        }
    } catch (error) {
        console.error('Failed to load state:', error);
        resetTimer();
    }
}

function saveState() {
    // Save explicit timer state flag
    let timerStatus = 'idle';
    if (timerState.isRunning) {
        timerStatus = 'running';
    } else if (timerState.pausedTime) {
        timerStatus = 'paused';
    }
    
    const stateToSave = {
        isRunning: timerState.isRunning,
        startTime: timerState.startTime,
        pausedTime: timerState.pausedTime,
        activeTargetMinutes: timerState.activeTargetMinutes,
        elapsedAtPause: timerState.elapsedAtPause,
        timerStatus: timerStatus
    };
    
    console.log('Saving state:', stateToSave);
    
    chrome.storage.local.set(stateToSave);
}

function startBadgeInterval() {
    // Clean up existing interval before creating a new one
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    // Start new interval
    timerState.intervalId = setInterval(updateBadge, 1000);
    console.log('Created new badge update interval');
    
    // Update badge immediately
    updateBadge();
}

function startTimer(targetMinutes) {
    console.log('startTimer called with targetMinutes:', targetMinutes);
    
    if (timerState.isRunning) return false;

    if (timerState.pausedTime) {
        // Resume from paused state
        const pausedDuration = Date.now() - timerState.pausedTime;
        timerState.startTime += pausedDuration;
        timerState.pausedTime = null;
        console.log('Resuming from paused state, new startTime:', timerState.startTime);
    } else {
        // Start new timer
        if (targetMinutes !== null && targetMinutes !== undefined) {
            timerState.activeTargetMinutes = targetMinutes;
        } else {
            // Use saved target time if available
            chrome.storage.local.get(['targetMinutes'], (result) => {
                if (result.targetMinutes) {
                    timerState.activeTargetMinutes = result.targetMinutes;
                }
            });
        }
        
        timerState.startTime = Date.now();
        console.log('Starting new timer with targetMinutes:', timerState.activeTargetMinutes);
    }

    timerState.isRunning = true;
    saveState();
    
    startBadgeInterval();
    return true;
}

function resumeTimer(elapsedAtPause) {
    console.log('Background: trying to resume timer', { elapsedAtPause, pausedTime: timerState.pausedTime });
    
    // Try recovery even if not paused when elapsedAtPause is provided
    if (!timerState.pausedTime && elapsedAtPause === undefined) {
        console.warn('Not in paused state or no elapsed time provided');
        return false;
    }
    
    // First make sure we have the correct target time from storage
    chrome.storage.local.get(['activeTargetMinutes', 'targetMinutes'], (result) => {
        // Use activeTargetMinutes first, then targetMinutes, then keep current value as last resort
        if (result.activeTargetMinutes) {
            timerState.activeTargetMinutes = result.activeTargetMinutes;
            console.log('Restored activeTargetMinutes from storage:', timerState.activeTargetMinutes);
        } else if (result.targetMinutes) {
            timerState.activeTargetMinutes = result.targetMinutes;
            console.log('Using targetMinutes from storage:', timerState.activeTargetMinutes);
        }
        
        // Calculate correct start time based on elapsed time
        if (elapsedAtPause !== undefined) {
            // Use exact elapsed time from popup
            timerState.elapsedAtPause = elapsedAtPause;
            timerState.startTime = Date.now() - timerState.elapsedAtPause;
            console.log('Background: resuming with elapsedAtPause', timerState.elapsedAtPause, timerState.startTime);
        } else if (timerState.pausedTime && timerState.startTime) {
            // Calculate new start time by adding paused duration
            const pausedDuration = Date.now() - timerState.pausedTime;
            timerState.startTime += pausedDuration;
            console.log('Background: resuming with pausedDuration', pausedDuration, timerState.startTime);
        } else {
            console.error('Missing information required to resume timer');
            return;
        }
        
        timerState.pausedTime = null;
        timerState.isRunning = true;
        
        saveState();
        startBadgeInterval();
    });
    
    return true;
}

function pauseTimer() {
    if (!timerState.isRunning) return false;

    if (timerState.startTime) {
        // Store precise elapsed time in milliseconds
        const now = Date.now();
        const elapsedMs = now - timerState.startTime;
        timerState.elapsedAtPause = elapsedMs;
        
        console.log(`Paused: Elapsed time ${elapsedMs}ms, ${elapsedMs/1000}s`);
    }

    timerState.isRunning = false;
    timerState.pausedTime = Date.now();
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    updateBadge();
    saveState();
    return true;
}

function resetTimer(customTargetMinutes) {
    timerState.isRunning = false;
    timerState.startTime = null;
    timerState.pausedTime = null;
    timerState.elapsedAtPause = 0;
    
    if (customTargetMinutes !== undefined) {
        timerState.activeTargetMinutes = customTargetMinutes;
    } else {
        // Get default value from storage
        chrome.storage.local.get(['targetMinutes'], (result) => {
            if (result.targetMinutes) {
                timerState.activeTargetMinutes = result.targetMinutes;
            } else {
                timerState.activeTargetMinutes = 30;
            }
        });
    }
    
    saveState();
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    chrome.action.setBadgeText({ text: "" });
    return true;
}

function updateBadge() {
    let elapsed, remaining;
    const targetSeconds = timerState.activeTargetMinutes * 60;
    
    if (timerState.isRunning) {
        // Calculate elapsed time from current time when running
        const now = Date.now();
        // Convert to seconds with floor for consistency
        elapsed = Math.floor((now - timerState.startTime) / 1000);
        
        // Log every 10 seconds for debugging
        if (elapsed % 10 === 0) {
            console.log(`Running badge: ${elapsed}s elapsed, target: ${targetSeconds}s`);
        }
    } else if (timerState.pausedTime) {
        // Use saved elapsed time when paused
        if (timerState.elapsedAtPause) {
            elapsed = Math.floor(timerState.elapsedAtPause / 1000);
            console.log(`Badge update: Using elapsedAtPause ${timerState.elapsedAtPause}ms, ${elapsed}s`);
        } else {
            elapsed = Math.floor((timerState.pausedTime - timerState.startTime) / 1000);
        }
    } else {
        // Clear badge when neither running nor paused
        chrome.action.setBadgeText({ text: "" });
        return;
    }
    
    remaining = targetSeconds - elapsed;

    let badgeText = '';
    let badgeColor = primaryColor;

    if (remaining >= 0) {
        if (remaining >= 3600) {
            const hours = Math.floor(remaining / 3600);
            badgeText = `${hours}h`;
        } else if (remaining >= 60) {
            badgeText = `${Math.floor(remaining / 60)}m`;
        } else {
            badgeText = `${Math.floor(remaining)}s`;
        }
    } else {
        const delaySeconds = Math.abs(remaining);
        if (delaySeconds >= 3600) {
            const hours = Math.floor(delaySeconds / 3600);
            badgeText = `+${hours}h`;
        } else if (delaySeconds >= 60) {
            badgeText = `+${Math.floor(delaySeconds / 60)}m`;
        } else {
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