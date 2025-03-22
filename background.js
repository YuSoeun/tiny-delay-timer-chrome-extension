// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

const timerState = {
    startTime: null,
    isRunning: false,
    pausedTime: 0,
    intervalId: null
};

// 저장된 상태 로드
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

async function loadState() {
    try {
        const state = await chrome.storage.local.get([
            'isRunning',
            'startTime',
            'pausedTime',
            'targetMinutes'
        ]);

        if (state.isRunning && state.startTime) {
            timerState.startTime = state.startTime;
            timerState.isRunning = true;
            timerState.pausedTime = 0;
            startTimer(true); // true: 저장된 상태에서 시작
        } else if (state.pausedTime) {
            timerState.startTime = state.startTime;
            timerState.pausedTime = state.pausedTime;
            timerState.isRunning = false;
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
        pausedTime: timerState.pausedTime
    });
}

function startTimer(fromSavedState = false) {
    if (timerState.isRunning) return;
    
    timerState.isRunning = true;
    if (!fromSavedState) {
        timerState.startTime = Date.now() - timerState.pausedTime;
    }
    
    saveState();

    timerState.intervalId = setInterval(() => {
        chrome.storage.local.get(['targetMinutes'], (result) => {
            const targetMinutes = result.targetMinutes || 30;
            const targetSeconds = targetMinutes * 60;
            const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            const remaining = targetSeconds - elapsed;

            let badgeText = '';
            let badgeColor = '#4688F1';

            if (remaining >= 0) {
                if (remaining >= 60) {
                    badgeText = `${Math.ceil(remaining / 60)}m`;
                } else {
                    badgeText = `${remaining}s`;
                }
                // 남은 시간이 있을 때는 딜레이를 0으로 설정
                chrome.storage.local.set({ delaySeconds: 0 });
            } else {
                const delaySeconds = Math.abs(remaining);
                badgeColor = '#E74C3C';

                if (delaySeconds >= 60) {
                    badgeText = `+${Math.floor(delaySeconds / 60)}m`;
                } else {
                    badgeText = `+${delaySeconds}s`;
                }
                // 초과 시간일 때만 딜레이 설정
                chrome.storage.local.set({ delaySeconds });
            }

            chrome.action.setBadgeText({ text: badgeText });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });

            // Send update to content script
            chrome.tabs.query({url: "https://www.acmicpc.net/*"}, (tabs) => {
                tabs.forEach(tab => {
                    const progress = Math.min((elapsed / targetSeconds) * 100, 100);
                    const delayProgress = remaining < 0 ? Math.min((Math.abs(remaining) / targetSeconds) * 100, 100) : 0;
                    
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'timerUpdate',
                        elapsed: formatTime(elapsed),
                        delay: remaining < 0 ? Math.abs(remaining) : 0,
                        progress,
                        delayProgress
                    });
                });
            });
        });
    }, 1000);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function pauseTimer() {
    if (!timerState.isRunning) return;
    timerState.isRunning = false;
    clearInterval(timerState.intervalId);
    timerState.pausedTime = Date.now() - timerState.startTime;
    saveState();
}

function resetTimer() {
    timerState.isRunning = false;
    timerState.startTime = null;
    timerState.pausedTime = 0;
    clearInterval(timerState.intervalId);
    chrome.action.setBadgeText({ text: "" });
    saveState();
}

// 메시지 수신 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTimer') startTimer();
    else if (message.action === 'pauseTimer') pauseTimer();
    else if (message.action === 'resetTimer') resetTimer();
    else if (message.action === 'getStatus') {
        sendResponse({
            isRunning: timerState.isRunning,
            startTime: timerState.startTime,
            pausedTime: !timerState.isRunning && timerState.startTime ? Date.now() - timerState.startTime : null
        });
    }
    return true; // sendResponse 비동기 응답을 위해 필요
});