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

function startTimer() {
    if (timerState.isRunning) return;
    timerState.isRunning = true;
    timerState.startTime = Date.now() - timerState.pausedTime;

    // 팝업에 타이머 시작 알림
    chrome.runtime.sendMessage({
        action: 'timerStarted',
        startTime: timerState.startTime
    });

    timerState.intervalId = setInterval(() => {
        chrome.storage.local.get(['targetMinutes'], (result) => {
            const targetMinutes = result.targetMinutes || 30;
            const targetSeconds = targetMinutes * 60;
            const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            const remaining = targetSeconds - elapsed;

            let badgeText = '';
            let badgeColor = '#4688F1';
            let delaySeconds = 0;

            if (remaining >= 0) {
                if (remaining >= 60) {
                    badgeText = `${Math.ceil(remaining / 60)}m`;
                } else {
                    badgeText = `${remaining}s`;
                }
            } else {
                delaySeconds = Math.abs(remaining);
                badgeColor = '#E74C3C';

                if (delaySeconds >= 60) {
                    badgeText = `+${Math.floor(delaySeconds / 60)}m`;
                } else {
                    badgeText = `+${delaySeconds}s`;
                }
            }

            chrome.action.setBadgeText({ text: badgeText });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });
            chrome.storage.local.set({ delaySeconds });
        });
    }, 1000);
}

function pauseTimer() {
    if (!timerState.isRunning) return;
    timerState.isRunning = false;
    clearInterval(timerState.intervalId);
    timerState.pausedTime = Date.now() - timerState.startTime;
}

function resetTimer() {
    timerState.isRunning = false;
    timerState.startTime = null;
    timerState.pausedTime = 0;
    clearInterval(timerState.intervalId);
    chrome.action.setBadgeText({ text: "" });
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