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
    if (message.action === 'updateCssVariables') {
        if (message.primaryColor) primaryColor = message.primaryColor;
        if (message.dangerColor) dangerColor = message.dangerColor;
        console.log('CSS variables updated:', {primaryColor, dangerColor});
        return true;
    } else if (message.action === 'startTimer') {
        startTimer(message.targetMinutes);
    } else if (message.action === 'resumeTimer') {
        if (timerState.pausedTime) {
            if (message.elapsedAtPause !== undefined) {
                timerState.elapsedAtPause = message.elapsedAtPause;
                timerState.startTime = Date.now() - timerState.elapsedAtPause;
            } else {
                const pausedDuration = message.pausedDuration || (Date.now() - timerState.pausedTime);
                timerState.startTime += pausedDuration;
            }
            
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
                // 올바른 계산: 먼저 밀리초 차이를 구한 다음 초 단위로 변환 후 내림
                elapsed = Math.floor(((timerState.pausedTime || now) - timerState.startTime) / 1000);
            }
            const targetSeconds = timerState.activeTargetMinutes * 60;
            const remaining = Math.max(targetSeconds - elapsed, 0);
            const delay = Math.max(elapsed - targetSeconds, 0);

            sendResponse({
                isRunning: timerState.isRunning,
                startTime: timerState.startTime,
                pausedTime: timerState.pausedTime,
                activeTargetMinutes: timerState.activeTargetMinutes,
                elapsedAtPause: timerState.elapsedAtPause,
                remaining,
                delay
            });
        });
        
        return true;
    }
    
    return true;
});

async function loadState() {
    try {
        const state = await chrome.storage.local.get([
            'isRunning',
            'startTime',
            'pausedTime',
            'activeTargetMinutes',
            'elapsedAtPause',
            'timerStatus'  // 추가: 명시적 타이머 상태 저장
        ]);

        if (state.elapsedAtPause) {
            timerState.elapsedAtPause = state.elapsedAtPause;
        }

        // 명시적으로 저장된 상태가 있으면 그대로 복원
        if (state.timerStatus === 'paused' && state.pausedTime) {
            timerState.startTime = state.startTime;
            timerState.pausedTime = state.pausedTime;
            timerState.isRunning = false;
            timerState.activeTargetMinutes = state.activeTargetMinutes || 30;
            updateBadge();
        } else if (state.isRunning && state.startTime) {
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
            updateBadge();
        }
    } catch (error) {
        console.error('Failed to load state:', error);
        resetTimer();
    }
}

function saveState() {
    // 현재 타이머 상태를 명시적으로 저장
    let timerStatus = 'idle';
    if (timerState.isRunning) {
        timerStatus = 'running';
    } else if (timerState.pausedTime) {
        timerStatus = 'paused';
    }
    
    chrome.storage.local.set({
        isRunning: timerState.isRunning,
        startTime: timerState.startTime,
        pausedTime: timerState.pausedTime,
        activeTargetMinutes: timerState.activeTargetMinutes,
        elapsedAtPause: timerState.elapsedAtPause,
        timerStatus: timerStatus
    });
}

function startTimer(targetMinutes) {
    if (timerState.isRunning) return;

    if (timerState.pausedTime) {
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

    if (timerState.startTime) {
        // 정확한 밀리초 단위 경과 시간 저장 - 정밀도 유지
        const now = Date.now();
        const elapsedMs = now - timerState.startTime;
        timerState.elapsedAtPause = elapsedMs;
        
        // 디버깅용 로그 추가
        console.log(`Paused: Elapsed time ${elapsedMs}ms, ${elapsedMs/1000}s`);
    }

    timerState.isRunning = false;
    timerState.pausedTime = Date.now();
    clearInterval(timerState.intervalId);
    
    updateBadge();
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
                timerState.activeTargetMinutes = 30;
            }
            saveState();
        });
    }
    
    clearInterval(timerState.intervalId);
    chrome.action.setBadgeText({ text: "" });
}

function updateBadge() {
    let elapsed, remaining;
    const targetSeconds = timerState.activeTargetMinutes * 60;
    
    if (timerState.isRunning) {
        // 실행 중인 상태에서는 현재 시간 기준으로 계산
        const now = Date.now();
        // 밀리초 차이를 먼저 계산하고 초 단위로 변환 후 내림 처리
        elapsed = Math.floor((now - timerState.startTime) / 1000);
    } else if (timerState.pausedTime) {
        // 일시정지 상태에서는 저장된 경과 시간 사용
        if (timerState.elapsedAtPause) {
            // 밀리초를 초로 변환 시 정확하게 내림
            elapsed = Math.floor(timerState.elapsedAtPause / 1000);
            // 디버깅용 로그
            console.log(`Badge update: Using elapsedAtPause ${timerState.elapsedAtPause}ms, ${elapsed}s`);
        } else {
            elapsed = Math.floor((timerState.pausedTime - timerState.startTime) / 1000);
        }
    } else {
        // 타이머가 실행 중이지 않고 일시정지 상태도 아님
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