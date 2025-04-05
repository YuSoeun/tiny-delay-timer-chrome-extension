let timerState = {
    targetMinutes: 30,
    startTime: null,
    isRunning: false,
    pausedTime: null,
    activeTargetMinutes: 30
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const result = await chrome.storage.local.get(['targetMinutes', 'presets']);
        timerState.targetMinutes = result.targetMinutes || 30;
        document.getElementById('targetTime').value = timerState.targetMinutes;

        const presets = result.presets || [30, 40, 60];
        updatePresetButtons(presets);

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

    // 프리셋 버튼 클릭 이벤트 추가
    document.querySelectorAll('.preset-btn').forEach(button => {
        button.addEventListener('click', handlePresetClick);
    });

    // 설정 버튼 클릭 이벤트 추가
    document.querySelector('.settings-btn').addEventListener('click', openPresetModal);

    // 모달 닫기 및 저장 버튼 이벤트 추가
    document.getElementById('cancelPresets').addEventListener('click', closePresetModal);
    document.getElementById('savePresets').addEventListener('click', savePresetChanges);
    document.querySelector('.close-btn').addEventListener('click', closePresetModal);
}

function handleTargetTimeChange(e) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
        timerState.targetMinutes = value;
        chrome.storage.local.set({ targetMinutes: value });
    }
}

function handleStart() {
    const targetMinutes = timerState.isRunning || timerState.pausedTime
        ? timerState.activeTargetMinutes // 기존 값을 유지
        : parseInt(document.getElementById('targetTime').value, 10); // 리셋 후 targetTime 값 사용

    if (!isNaN(targetMinutes) && targetMinutes > 0) {
        if (!timerState.isRunning && !timerState.pausedTime) {
            // 리셋 후 처음 실행 시 targetTime 값을 activeTargetMinutes에 설정
            timerState.activeTargetMinutes = targetMinutes;
        }

        chrome.runtime.sendMessage({
            action: 'startTimer',
            targetMinutes: timerState.activeTargetMinutes // 항상 activeTargetMinutes 사용
        });

        // total-time을 activeTargetMinutes 값으로 업데이트
        const targetSeconds = timerState.activeTargetMinutes * 60;
        document.getElementById('total-time').textContent = formatTime(targetSeconds);
    }
}

function handlePause() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
}

function handleReset() {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
    timerState.startTime = null;
    timerState.isRunning = false;
    timerState.pausedTime = null;
    timerState.activeTargetMinutes = timerState.targetMinutes; // targetTime 값으로 초기화
    resetUI();
}

function handlePresetClick(e) {
    const time = parseInt(e.target.dataset.time, 10);
    if (!isNaN(time) && time > 0) {
        timerState.targetMinutes = time;
        document.getElementById('targetTime').value = time; // 입력 필드에 반영
        chrome.storage.local.set({ targetMinutes: time });
    }
}

function resetUI() {
    const totalSeconds = timerState.activeTargetMinutes * 60; // 현재 설정된 총 시간
    updateUIFromStatus(0, 0, totalSeconds); // remaining time을 0으로 설정
    document.getElementById('elapsed-progress').style.width = '0%';
    document.getElementById('delay-progress').style.width = '0%';
    document.getElementById('total-time').textContent = formatTime(totalSeconds);
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
            } else if (timerState.pausedTime) {
                // 일시정지 상태에서는 최신 remaining, delay 값을 유지
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            } else {
                // 초기 상태
                updateUIFromStatus(0, 0, targetSeconds);
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
    const totalSeconds = timerState.activeTargetMinutes * 60;
    document.getElementById('elapsed').textContent = formatTime(remaining);
    document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '';

    // 총 소요 시간 계산 및 표시 (elapsed + delay)
    const totalElapsed = (totalSeconds - remaining) + delay;
    document.getElementById('total-elapsed').textContent = formatTime(totalElapsed);

    // 프로그레스 바 업데이트
    const progress = Math.max((remaining / totalSeconds) * 100, 0);
    document.getElementById('elapsed-progress').style.width = `${Math.floor(progress)}%`;

    const delayProgress = Math.min((delay / totalSeconds) * 100, 100);
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

function openPresetModal() {
    chrome.storage.local.get(['presets'], (result) => {
        const presets = result.presets || [30, 40, 60];
        document.getElementById('preset1').value = presets[0];
        document.getElementById('preset2').value = presets[1];
        document.getElementById('preset3').value = presets[2];
    });
    document.getElementById('presetModal').classList.add('show');
}

function closePresetModal() {
    document.getElementById('presetModal').classList.remove('show');
}

function savePresetChanges() {
    const presets = [
        parseInt(document.getElementById('preset1').value, 10),
        parseInt(document.getElementById('preset2').value, 10),
        parseInt(document.getElementById('preset3').value, 10)
    ].filter(val => !isNaN(val) && val > 0);

    if (presets.length === 3) {
        // 크롬 스토리지에 프리셋 저장
        chrome.storage.local.set({ presets }, () => {
            updatePresetButtons(presets); // 버튼 업데이트
            closePresetModal(); // 모달 닫기
        });
    } else {
        alert('Please enter valid preset values (greater than 0).');
    }
}

function updatePresetButtons(presets) {
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach((button, index) => {
        button.textContent = `${presets[index]}m`;
        button.dataset.time = presets[index];
    });
}