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
    const state = {
        isRunning: timerState.isRunning,
        startTime: timerState.startTime,
        pausedTime: timerState.pausedTime,
        // 타이머 상태와 함께 targetMinutes도 저장
        targetMinutes: timerState.targetMinutes
    };
    chrome.storage.local.set(state);
}

function startTimer(fromSavedState = false) {
    if (timerState.isRunning) return;
    
    timerState.isRunning = true;
    if (!fromSavedState) {
        // 이미 저장된 pausedTime이 있다면 그만큼 시작 시간을 조정
        if (timerState.pausedTime > 0) {
            timerState.startTime = Date.now() - timerState.pausedTime;
        } else {
            timerState.startTime = Date.now();
        }
        chrome.storage.local.set({ delaySeconds: 0 });
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
            } else {
                const delaySeconds = Math.abs(remaining);
                badgeColor = '#E74C3C';

                if (delaySeconds >= 60) {
                    badgeText = `+${Math.floor(delaySeconds / 60)}m`;
                } else {
                    badgeText = `+${delaySeconds}s`;
                }
                // 딜레이가 있을 때만 delaySeconds 업데이트
                chrome.storage.local.set({ delaySeconds });
            }

            chrome.action.setBadgeText({ text: badgeText });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });
        });
    }, 1000);
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