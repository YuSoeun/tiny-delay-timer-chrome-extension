import { Timer } from '../features/timer.js';
import { Storage } from '../features/storage.js';
import { ChromeAPI } from '../facades/chrome.js';

// Activate service worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

// Default color values
let primaryColor = '#8a7bff';
let dangerColor = '#ff7eb5';

// Initialize timer
const timer = new Timer();

// Get CSS variable values from the DOM
async function getCssVariables() {
    try {
        const response = await ChromeAPI.getCSSVariables();
        if (response && response.primaryColor) {
            primaryColor = response.primaryColor;
            dangerColor = response.dangerColor;
            console.log('CSS variables loaded:', { primaryColor, dangerColor });
        }
    } catch (error) {
        console.warn(
            '[CSS Variables] Communication error with content script: ' + error.message + '\n' +
            'Using default values - primary: ' + primaryColor + ', danger: ' + dangerColor + '\n' +
            'This is expected on extension startup or if no active tabs are available.'
        );
    }
}

// Run once at initialization
getCssVariables();

// Load saved state
async function loadState() {
    const savedState = await Storage.getTimerState();
    if (savedState.isRunning) {
        timer.resume();
    }
}

// Save current state
async function saveState() {
    await Storage.saveTimerState(timer.state);
}

// Message handling
ChromeAPI.onMessage((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startTimer':
            timer.start(request.targetMinutes);
            saveState();
            sendResponse({ success: true });
            break;
        
        case 'pauseTimer':
            timer.pause();
            saveState();
            sendResponse({ success: true });
            break;
        
        case 'resumeTimer':
            timer.resume();
            saveState();
            sendResponse({ success: true });
            break;
        
        case 'resetTimer':
            timer.reset(request.targetMinutes);
            saveState();
            sendResponse({ success: true });
            break;
        
        case 'getTimerStatus':
            const remaining = timer.getRemainingTime();
            sendResponse({
                remaining,
                isRunning: timer.state.isRunning,
                targetMinutes: timer.state.activeTargetMinutes
            });
            break;
        
        case 'updateCssVariables':
            if (request.primaryColor) primaryColor = request.primaryColor;
            if (request.dangerColor) dangerColor = request.dangerColor;
            console.log('CSS variables updated:', { primaryColor, dangerColor });
            sendResponse({ success: true });
            break;
        
        case 'checkBadgeStatus':
            const isIntervalActive = timer.state.intervalId !== null;
            
            if (timer.state.isRunning && !isIntervalActive) {
                timer.startBadgeInterval();
            }
            
            sendResponse({
                isRunning: timer.state.isRunning,
                hasInterval: isIntervalActive
            });
            break;
        
        case 'getCssVariables':
            sendResponse({ primaryColor, dangerColor });
            break;
        
        default:
            sendResponse({ success: false, error: "Unknown action" });
    }
});

// Initialize on startup and install
ChromeAPI.onStartup(loadState);
ChromeAPI.onInstalled(loadState);

function getTimerStatus(savedTargetMinutes) {
    try {
        if (savedTargetMinutes && !timer.state.startTime && !timer.state.isRunning) {
            timer.state.activeTargetMinutes = savedTargetMinutes;
        }
        
        const now = Date.now();
        let elapsed = 0;
        if (timer.state.startTime) {
            elapsed = Math.floor(((timer.state.pausedTime || now) - timer.state.startTime) / 1000);
        }
        const targetSeconds = timer.state.activeTargetMinutes * 60;
        const remaining = Math.max(targetSeconds - elapsed, 0);
        const delay = Math.max(elapsed - targetSeconds, 0);

        return {
            isRunning: timer.state.isRunning,
            startTime: timer.state.startTime,
            pausedTime: timer.state.pausedTime,
            activeTargetMinutes: timer.state.activeTargetMinutes,
            elapsedAtPause: timer.state.elapsedAtPause,
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

function startBadgeInterval() {
    if (timer.state.intervalId) {
        clearInterval(timer.state.intervalId);
        timer.state.intervalId = null;
    }
    
    timer.state.intervalId = setInterval(updateBadge, 1000);
    console.log('Created new badge update interval');
    
    updateBadge();
}

function startTimer(targetMinutes) {
    console.log('startTimer called with targetMinutes:', targetMinutes);
    
    if (timer.state.isRunning) return false;

    if (timer.state.pausedTime) {
        const pausedDuration = Date.now() - timer.state.pausedTime;
        timer.state.startTime += pausedDuration;
        timer.state.pausedTime = null;
        console.log('Resuming from paused state, new startTime:', timer.state.startTime);
    } else {
        if (targetMinutes !== null && targetMinutes !== undefined) {
            timer.state.activeTargetMinutes = targetMinutes;
        } else {
            chrome.storage.local.get(['targetMinutes'], (result) => {
                if (result.targetMinutes) {
                    timer.state.activeTargetMinutes = result.targetMinutes;
                }
            });
        }
        
        timer.state.startTime = Date.now();
        console.log('Starting new timer with targetMinutes:', timer.state.activeTargetMinutes);
    }

    timer.state.isRunning = true;
    saveState();
    
    startBadgeInterval();
    return true;
}

function resumeTimer(elapsedAtPause, callback) {
    console.log('Background: trying to resume timer', { elapsedAtPause, pausedTime: timer.state.pausedTime });
    
    if (!timer.state.pausedTime && elapsedAtPause === undefined) {
        console.warn('Not in paused state or no elapsed time provided');
        if (callback) callback(false);
        return false;
    }
    
    chrome.storage.local.get(['activeTargetMinutes', 'targetMinutes'], (result) => {
        try {
            if (result.activeTargetMinutes) {
                timer.state.activeTargetMinutes = result.activeTargetMinutes;
                console.log('Restored activeTargetMinutes from storage:', timer.state.activeTargetMinutes);
            } else if (result.targetMinutes) {
                timer.state.activeTargetMinutes = result.targetMinutes;
                console.log('Using targetMinutes from storage:', timer.state.activeTargetMinutes);
            }
            
            if (elapsedAtPause !== undefined) {
                timer.state.elapsedAtPause = elapsedAtPause;
                timer.state.startTime = Date.now() - timer.state.elapsedAtPause;
                console.log('Background: resuming with elapsedAtPause', timer.state.elapsedAtPause, timer.state.startTime);
            } else if (timer.state.pausedTime && timer.state.startTime) {
                const pausedDuration = Date.now() - timer.state.pausedTime;
                timer.state.startTime += pausedDuration;
                console.log('Background: resuming with pausedDuration', pausedDuration, timer.state.startTime);
            } else {
                console.error('Missing information required to resume timer');
                if (callback) callback(false);
                return;
            }
            
            timer.state.pausedTime = null;
            timer.state.isRunning = true;
            
            saveState();
            startBadgeInterval();
            
            if (callback) callback(true);
        } catch (error) {
            console.error('Error resuming timer:', error);
            if (callback) callback(false);
        }
    });
}

function pauseTimer() {
    if (!timer.state.isRunning) return false;

    if (timer.state.startTime) {
        const now = Date.now();
        const elapsedMs = now - timer.state.startTime;
        timer.state.elapsedAtPause = elapsedMs;
        
        console.log(`Paused: Elapsed time ${elapsedMs}ms, ${elapsedMs/1000}s`);
    }

    timer.state.isRunning = false;
    timer.state.pausedTime = Date.now();
    
    if (timer.state.intervalId) {
        clearInterval(timer.state.intervalId);
        timer.state.intervalId = null;
    }
    
    updateBadge();
    saveState();
    return true;
}

function resetTimer(customTargetMinutes) {
    timer.state.isRunning = false;
    timer.state.startTime = null;
    timer.state.pausedTime = null;
    timer.state.elapsedAtPause = 0;
    
    if (customTargetMinutes !== undefined) {
        timer.state.activeTargetMinutes = customTargetMinutes;
    } else {
        chrome.storage.local.get(['targetMinutes'], (result) => {
            if (result.targetMinutes) {
                timer.state.activeTargetMinutes = result.targetMinutes;
            } else {
                timer.state.activeTargetMinutes = 30;
            }
        });
    }
    
    saveState();
    
    if (timer.state.intervalId) {
        clearInterval(timer.state.intervalId);
        timer.state.intervalId = null;
    }
    
    chrome.action.setBadgeText({ text: "" });
    return true;
}

function updateBadge() {
    let elapsed, remaining;
    const targetSeconds = timer.state.activeTargetMinutes * 60;
    
    if (timer.state.isRunning) {
        const now = Date.now();
        elapsed = Math.floor((now - timer.state.startTime) / 1000);
        
        if (elapsed % 10 === 0) {
            console.log(`Running badge: ${elapsed}s elapsed, target: ${targetSeconds}s`);
        }
    } else if (timer.state.pausedTime) {
        if (timer.state.elapsedAtPause) {
            elapsed = Math.floor(timer.state.elapsedAtPause / 1000);
            console.log(`Badge update: Using elapsedAtPause ${timer.state.elapsedAtPause}ms, ${elapsed}s`);
        } else {
            elapsed = Math.floor((timer.state.pausedTime - timer.state.startTime) / 1000);
        }
    } else {
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