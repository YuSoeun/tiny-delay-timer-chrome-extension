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
    elapsedAtPause: 0,
    hasTriggeredCompletion: false,
    notificationsEnabled: true,
    repeatNotificationInterval: null,
    notificationCount: 0
};

// Load saved state
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('Notification clicked:', notificationId);

    // Stop repeat notifications when user clicks
    if (notificationId.startsWith('timer-complete')) {
        stopRepeatNotifications();

        // Clear the notification
        chrome.notifications.clear(notificationId);

        // Optionally open the popup
        chrome.action.openPopup().catch(() => {
            // If popup can't be opened, just log it
            console.log('Could not open popup after notification click');
        });
    }
});

// Handle notification close
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    if (byUser && notificationId.startsWith('timer-complete')) {
        // User manually closed the notification, stop repeating
        stopRepeatNotifications();
    }
});

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
            resumeTimer(message.elapsedAtPause, (result) => {
                sendResponse({ success: result });
            });
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
        } else if (message.action === 'setNotificationEnabled') {
            timerState.notificationsEnabled = message.enabled;
            chrome.storage.local.set({ notificationsEnabled: message.enabled });
            sendResponse({ success: true });
        } else if (message.action === 'getNotificationStatus') {
            sendResponse({ enabled: timerState.notificationsEnabled });
        } else if (message.action === 'dismissNotifications') {
            stopRepeatNotifications();
            sendResponse({ success: true });
        } else if (message.action === 'themeChanged') {
            // Update badge colors based on theme
            updateBadgeColorsForTheme(message.theme);
            sendResponse({ success: true });
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
            'targetMinutes', // Default target time
            'notificationsEnabled',
            'hasTriggeredCompletion',
            'theme'
        ]);

        console.log('Loaded state:', state);

        // Set default timer time if available
        if (state.targetMinutes) {
            timerState.activeTargetMinutes = state.targetMinutes;
        }

        if (state.elapsedAtPause) {
            timerState.elapsedAtPause = state.elapsedAtPause;
        }

        // Load notification settings
        if (state.notificationsEnabled !== undefined) {
            timerState.notificationsEnabled = state.notificationsEnabled;
        }

        // Load theme settings and update badge colors
        if (state.theme) {
            updateBadgeColorsForTheme(state.theme);
        }

        // Load completion state
        if (state.hasTriggeredCompletion !== undefined) {
            timerState.hasTriggeredCompletion = state.hasTriggeredCompletion;

            // If timer was already completed, restart repeat notifications
            if (state.hasTriggeredCompletion && state.isRunning && state.startTime) {
                console.log('Timer was completed before restart - restarting repeat notifications');
                startRepeatNotifications();
            }
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
        timerState.hasTriggeredCompletion = false; // Reset completion flag for new timer
        stopRepeatNotifications(); // Stop any ongoing repeat notifications
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

function resumeTimer(elapsedAtPause, callback) {
    console.log('Background: trying to resume timer', { elapsedAtPause, pausedTime: timerState.pausedTime });
    
    // Try recovery even if not paused when elapsedAtPause is provided
    if (!timerState.pausedTime && elapsedAtPause === undefined) {
        console.warn('Not in paused state or no elapsed time provided');
        if (callback) callback(false);
        return false;
    }
    
    // First make sure we have the correct target time from storage
    chrome.storage.local.get(['activeTargetMinutes', 'targetMinutes'], (result) => {
        try {
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
                if (callback) callback(false);
                return;
            }
            
            timerState.pausedTime = null;
            timerState.isRunning = true;
            
            saveState();
            startBadgeInterval();
            
            if (callback) callback(true);
        } catch (error) {
            console.error('Error resuming timer:', error);
            if (callback) callback(false);
        }
    });
    
    // Don't return anything here since the actual result depends on the async operation
    // The callback will be used instead
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
    timerState.hasTriggeredCompletion = false; // Reset completion flag
    stopRepeatNotifications(); // Stop any ongoing repeat notifications
    
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

// Timer completion notification functions
function showCompletionNotification() {
    if (!timerState.notificationsEnabled) return;

    // Reset notification count and start repeat notifications
    timerState.notificationCount = 0;

    // Show initial notification
    showSingleNotification();

    // Start repeat notification system
    startRepeatNotifications();

    // Skip icon flashing to avoid CSP issues - just show badge notification
    console.log('Timer completion notification sent');
}

function showSingleNotification() {
    timerState.notificationCount++;

    // Calculate current delay
    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTime) / 1000);
    const targetSeconds = timerState.activeTargetMinutes * 60;
    const delay = Math.max(elapsed - targetSeconds, 0);

    let message;
    if (delay < 10) {
        // Timer completed on time (within 10 seconds tolerance)
        message = "Time's up! You've worked hard :)";
    } else {
        // Timer is delayed - show delay in 10-second units
        const delayIn10s = Math.floor(delay / 10) * 10;
        const targetMinutes = timerState.activeTargetMinutes;

        let delayText;
        if (delayIn10s < 60) {
            delayText = `${delayIn10s} sec`;
        } else {
            const minutes = Math.floor(delayIn10s / 60);
            const seconds = delayIn10s % 60;
            if (seconds === 0) {
                delayText = `${minutes} min`;
            } else {
                delayText = `${minutes} min ${seconds} sec`;
            }
        }

        let targetText;
        if (targetMinutes < 1) {
            targetText = `${Math.round(targetMinutes * 60)} sec`;
        } else if (targetMinutes === Math.floor(targetMinutes)) {
            targetText = `${Math.floor(targetMinutes)} min`;
        } else {
            const mins = Math.floor(targetMinutes);
            const secs = Math.round((targetMinutes - mins) * 60);
            targetText = secs === 0 ? `${mins} min` : `${mins} min ${secs} sec`;
        }

        message = `${delayText} late (Target was ${targetText})`;
    }

    // Don't show repeat count indicator

    // Clear previous notification first
    chrome.notifications.clear('timer-complete', () => {
        // Create new notification
        try {
            const notificationId = `timer-complete-${Date.now()}`;
            chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '⏰ Tiny Delay Timer',
                message: message,
                priority: 2,
                requireInteraction: false
            }, (createdNotificationId) => {
                if (chrome.runtime.lastError) {
                    console.warn('Browser notification failed, using alternative method:', chrome.runtime.lastError);
                    // Try focused popup as secondary option
                    showFocusedNotification();
                } else {
                    console.log('Timer completion notification shown:', createdNotificationId);
                    // Still show a subtle visual indicator
                    showSubtleCompletion();
                }
            });
        } catch (error) {
            console.error('Failed to show notification:', error);
            showFocusedNotification();
        }
    });
}

function startRepeatNotifications() {
    // Clear any existing repeat interval
    if (timerState.repeatNotificationInterval) {
        clearInterval(timerState.repeatNotificationInterval);
    }

    // Start repeat notifications every 10 minutes, up to 6 times
    timerState.repeatNotificationInterval = setInterval(() => {
        console.log(`Repeat notification check: count=${timerState.notificationCount}, enabled=${timerState.notificationsEnabled}, completed=${timerState.hasTriggeredCompletion}`);

        if (timerState.notificationCount >= 6) {
            // Stop repeating after 6 notifications (60 minutes total)
            console.log('Stopping repeat notifications - maximum count reached');
            stopRepeatNotifications();
            return;
        }

        // Only repeat if notifications are still enabled and timer has completed
        if (timerState.notificationsEnabled && timerState.hasTriggeredCompletion && timerState.startTime) {
            console.log('Sending repeat notification...');
            showSingleNotification();
        } else {
            console.log('Stopping repeat notifications - conditions not met:', {
                enabled: timerState.notificationsEnabled,
                completed: timerState.hasTriggeredCompletion,
                hasStartTime: !!timerState.startTime
            });
            stopRepeatNotifications();
        }
    }, 600000); // 10 minutes interval (600,000ms)
}

function stopRepeatNotifications() {
    if (timerState.repeatNotificationInterval) {
        clearInterval(timerState.repeatNotificationInterval);
        timerState.repeatNotificationInterval = null;
    }
    // Don't reset notification count here - let it accumulate for proper tracking
}

function showFocusedNotification() {
    // Only show popup if user is actively using the extension
    chrome.action.setPopup({
        popup: 'popup.html?completed=true'
    }, () => {
        // Briefly highlight the extension icon
        setTimeout(() => {
            chrome.action.setPopup({ popup: 'popup.html' });
        }, 5000);
    });
}

function showSubtleCompletion() {
    // Just update the badge to indicate completion without opening anything
    try {
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

        // Reset badge after 10 seconds
        setTimeout(() => {
            updateBadge();
        }, 10000);
    } catch (error) {
        console.error('Failed to show subtle completion indicator:', error);
    }
}

function showCompletionPopup() {
    try {
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html') + '?completed=true',
            type: 'popup',
            width: 400,
            height: 300,
            focused: true,
            top: 100,
            left: 100
        }, (window) => {
            if (chrome.runtime.lastError) {
                console.error('Popup creation failed:', chrome.runtime.lastError);
            } else {
                console.log('Timer completion popup shown:', window.id);
                // Auto-close after 10 seconds
                setTimeout(() => {
                    try {
                        chrome.windows.remove(window.id);
                    } catch (e) {
                        console.log('Popup already closed or removed');
                    }
                }, 10000);
            }
        });
    } catch (error) {
        console.error('Failed to show completion popup:', error);
    }
}

// Visual attention effects for timer completion
let flashingInterval = null;
let isFlashing = false;

function startIconFlashing() {
    if (isFlashing) return; // Already flashing

    isFlashing = true;
    let flashCount = 0;
    const maxFlashes = 10; // Flash 10 times

    flashingInterval = setInterval(() => {
        if (flashCount >= maxFlashes) {
            stopIconFlashing();
            return;
        }

        // Alternate between completion icon and normal icon
        const iconPath = flashCount % 2 === 0 ?
            {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            } :
            {
                16: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA50lEQVQ4T6WTuxHCQAxEn0pIA2lAHagDdUAdqAN1oA7UgTpQB+pAHaAD0gFpgDRAGmACJzNn+5CwzNg/Gml3pX1PQsjMzMyMMSYzs7XWfvJMKSVmZmZ2d3c3xhhj7Hs/XOuJzCIi2traajKzs7MzIiLyXC4nVVVhZkpJIWIvl5eXfD6fExE98+fz+VJKycxkZmJm+76HiGiapi+llJhZay3GGJlZay0zM7OZqbUWImJmaq2FiJiZWmshImam1lqIiJmptRYiYma11kJEaq2FiJhZrbUQkVprISJmVmstRMTMaq2FiJhZrbUQkVprISJm1n8APgDuAP4CfQMAAAABJRU5ErkJggg==',
                48: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                128: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            };

        try {
            chrome.action.setIcon({ path: iconPath });
        } catch (error) {
            console.error('Failed to set icon:', error);
        }

        flashCount++;
    }, 500);
}

function stopIconFlashing() {
    if (flashingInterval) {
        clearInterval(flashingInterval);
        flashingInterval = null;
    }

    isFlashing = false;

    // Reset to original icon
    try {
        chrome.action.setIcon({
            path: {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            }
        });
    } catch (error) {
        console.error('Failed to reset icon:', error);
    }
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

    // Check for timer completion and trigger notification
    if (remaining <= 0 && !timerState.hasTriggeredCompletion && timerState.isRunning) {
        timerState.hasTriggeredCompletion = true;
        console.log('Timer completed! Triggering notification...');
        showCompletionNotification();

        // Save the completion state
        chrome.storage.local.set({
            hasTriggeredCompletion: true
        });
    }

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

// Theme support for badge colors
function updateBadgeColorsForTheme(theme) {
    if (theme === 'dark') {
        primaryColor = '#9d8cff';
        dangerColor = '#ff85a3';
    } else {
        primaryColor = '#8a7bff';
        dangerColor = '#ff7eb5';
    }

    console.log(`Badge colors updated for ${theme} theme:`, {primaryColor, dangerColor});

    // Update current badge if timer is active
    if (timerState.isRunning || timerState.pausedTime) {
        updateBadge();
    }
}