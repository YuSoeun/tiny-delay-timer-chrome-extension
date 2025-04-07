// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

const timerState = {
    startTime: null,
    isRunning: false,
    pausedTime: null,
    activeTargetMinutes: 30, // 실행 중인 타이머의 목표 시간
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
            'activeTargetMinutes'
        ]);

        if (state.isRunning && state.startTime) {
            timerState.startTime = state.startTime;
            timerState.isRunning = true;
            timerState.pausedTime = null;
            timerState.activeTargetMinutes = state.activeTargetMinutes || 30;
            startTimer(true); // true: 저장된 상태에서 시작
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
        // 일시정지 상태에서 재시작
        timerState.startTime += Date.now() - timerState.pausedTime;
        timerState.pausedTime = null;
    } else {
        // 새 타이머 시작
        
        // targetMinutes가 유효하면 사용, 아니면 저장된 값이나 기본값 사용
        if (targetMinutes !== null && targetMinutes !== undefined) {
            timerState.activeTargetMinutes = targetMinutes;
        } else {
            // 저장된 값이 없으면 storage에서 확인
            chrome.storage.local.get(['targetMinutes'], (result) => {
                if (result.targetMinutes) {
                    timerState.activeTargetMinutes = result.targetMinutes;
                }
                // 아무 값도 없으면 기본값 유지 (30분)
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
    
    // 매개변수로 전달된 사용자 지정 시간이 있으면 사용
    if (customTargetMinutes !== undefined) {
        timerState.activeTargetMinutes = customTargetMinutes;
        saveState();
    } else {
        // 저장된 targetMinutes 값 불러오기
        chrome.storage.local.get(['targetMinutes'], (result) => {
            if (result.targetMinutes) {
                timerState.activeTargetMinutes = result.targetMinutes;
            } else {
                timerState.activeTargetMinutes = 30; // 기본값
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
    let badgeColor = '#4688F1';

    if (remaining >= 0) {
        badgeText = remaining >= 60 ? `${Math.ceil(remaining / 60)}m` : `${Math.ceil(remaining)}s`; // 반올림
    } else {
        const delaySeconds = Math.abs(remaining);
        badgeText = delaySeconds >= 60 ? `+${Math.ceil(delaySeconds / 60)}m` : `+${Math.ceil(delaySeconds)}s`; // 반올림
        badgeColor = '#E74C3C';
    }

    console.log('Updating badge:', { badgeText, badgeColor }); // 디버그 로그 추가

    try {
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    } catch (error) {
        console.error('Failed to update badge:', error);
    }
}

// 메시지 수신 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTimer') {
        startTimer(message.targetMinutes);
    } else if (message.action === 'resumeTimer') {
        // 일시정지 후 재개 처리
        if (timerState.pausedTime) {
            // 일시정지 상태에서 경과한 시간만큼 startTime 조정
            const pausedDuration = message.pausedDuration || (Date.now() - timerState.pausedTime);
            timerState.startTime += pausedDuration;
            timerState.pausedTime = null;
            timerState.isRunning = true;
            
            // 상태 저장 및 타이머 업데이트 시작
            saveState();
            timerState.intervalId = setInterval(updateBadge, 1000);
        }
    } else if (message.action === 'pauseTimer') {
        pauseTimer();
    } else if (message.action === 'resetTimer') {
        // message.targetMinutes 값을 resetTimer 함수에 전달
        resetTimer(message.targetMinutes);
    } else if (message.action === 'getStatus') {
        // 현재 상태를 요청하기 전에 저장된 targetMinutes 값 확인
        chrome.storage.local.get(['targetMinutes'], (result) => {
            // 저장된 값이 있고 아직 설정되지 않았다면 적용
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
        
        return true; // 비동기 응답을 위해 true 반환
    }
    
    return true; // sendResponse 비동기 응답을 위해 필요
});