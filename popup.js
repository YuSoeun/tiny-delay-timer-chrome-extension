let timerState = {
    targetMinutes: 30,
    startTime: null,
    isRunning: false,
    pausedTime: null,
    activeTargetMinutes: 30
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const result = await chrome.storage.local.get(['targetMinutes']);
        timerState.targetMinutes = result.targetMinutes || 30;
        document.getElementById('targetTime').value = timerState.targetMinutes;

        setupEventListeners();
        initializeTimerState();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

function setupEventListeners() {
    document.getElementById('targetTime').addEventListener('input', handleTargetTimeChange);
    document.getElementById('start').addEventListener('click', handleStart);
    document.getElementById('pause').addEventListener('click', handlePause);
    document.getElementById('reset').addEventListener('click', handleReset);
}

function handleTargetTimeChange(e) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
        timerState.targetMinutes = value;
        chrome.storage.local.set({ targetMinutes: value });
    }
}

function handleStart() {
    chrome.runtime.sendMessage({
        action: 'startTimer',
        targetMinutes: timerState.targetMinutes
    });
}

function handlePause() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
}

function handleReset() {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
    resetUI();
}

function resetUI() {
    const targetSeconds = timerState.activeTargetMinutes * 60;
    updateUIFromStatus(targetSeconds, 0, targetSeconds);
    document.getElementById('elapsed-progress').style.width = '0%';
    document.getElementById('delay-progress').style.width = '0%';
    document.getElementById('total-time').textContent = formatTime(timerState.activeTargetMinutes * 60);
}

function initializeTimerState() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
        if (res) {
            timerState.startTime = res.startTime;
            timerState.isRunning = res.isRunning;
            timerState.pausedTime = res.pausedTime;
            timerState.activeTargetMinutes = res.activeTargetMinutes;

            const targetSeconds = timerState.activeTargetMinutes * 60;

            if (timerState.isRunning) {
                startStatusUpdateInterval();
            } else {
                // 일시정지 상태 또는 초기 상태
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            }

            // Update total time display
            document.getElementById('total-time').textContent = formatTime(targetSeconds);
        }
    });
}

function startStatusUpdateInterval() {
    clearInterval(timerState.elapsedInterval);

    timerState.elapsedInterval = setInterval(() => {
        chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
            if (res) {
                const targetSeconds = timerState.activeTargetMinutes * 60;
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            }
        });
    }, 1000);
}

function updateUIFromStatus(remaining, delay, targetSeconds) {
    document.getElementById('elapsed').textContent = formatTime(remaining);
    document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '00:00';

    const progress = Math.max((remaining / targetSeconds) * 100, 0);
    document.getElementById('elapsed-progress').style.width = `${Math.floor(progress)}%`;

    const delayProgress = Math.min((delay / targetSeconds) * 100, 100);
    document.getElementById('delay-progress').style.width = `${Math.floor(delayProgress)}%`;
}

function updateElapsedUI(elapsed, targetSeconds) {
    const remaining = Math.max(targetSeconds - elapsed, 0);
    const delay = Math.max(elapsed - targetSeconds, 0);

    document.getElementById('elapsed').textContent = formatTime(remaining);
    document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '00:00';

    const progress = Math.max((remaining / targetSeconds) * 100, 0);
    document.getElementById('elapsed-progress').style.width = `${progress}%`;

    const delayProgress = Math.min((delay / targetSeconds) * 100, 100);
    document.getElementById('delay-progress').style.width = `${delayProgress}%`;
}

function updateElapsed() {
    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTime) / 1000);
    const targetSeconds = timerState.activeTargetMinutes * 60;
    const remaining = Math.max(targetSeconds - elapsed, 0);

    document.getElementById('elapsed').textContent = formatTime(remaining);
    const progress = Math.max((remaining / targetSeconds) * 100, 0);
    document.getElementById('elapsed-progress').style.width = `${progress}%`;
}

function updatePausedState() {
    const elapsed = Math.floor((timerState.pausedTime - timerState.startTime) / 1000);
    const targetSeconds = timerState.activeTargetMinutes * 60;
    const remaining = Math.max(targetSeconds - elapsed, 0);

    document.getElementById('elapsed').textContent = formatTime(remaining);
    const progress = Math.max((remaining / targetSeconds) * 100, 0);
    document.getElementById('elapsed-progress').style.width = `${progress}%`;
}

function formatTime(seconds) {
    seconds = Math.ceil(seconds); // 반올림하여 아이콘과 동일하게 표시
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}