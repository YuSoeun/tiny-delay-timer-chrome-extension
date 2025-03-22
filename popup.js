// 전역 상태 보완
let timerState = {
    targetMinutes: 30,
    startTime: null,
    pauseStartTime: null,
    totalPauseDuration: 0,
    elapsedInterval: null,
    delayInterval: null,
    activeTargetMinutes: 30  // 현재 실행 중인 타이머의 목표 시간
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 초기 상태 로드
        const targetTimeInput = document.getElementById('targetTime');
        const result = await chrome.storage.local.get(['targetMinutes']);
        timerState.targetMinutes = result.targetMinutes || 30;
        if (targetTimeInput) {
            targetTimeInput.value = result.targetMinutes || 30;
            // 초기 total time 설정
            document.getElementById('total-time').textContent = formatTime((result.targetMinutes || 30) * 60);
        }

        // delay 시간 불러오기
        const delayResult = await chrome.storage.local.get(['delaySeconds']);
        const delay = delayResult.delaySeconds || 0;
        updateDelayDisplay(delay);

        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 초기 상태 확인 및 업데이트
        initializeTimerState();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

function setupEventListeners() {
    const elements = {
        targetTime: document.getElementById('targetTime'),
        start: document.getElementById('start'),
        pause: document.getElementById('pause'),
        reset: document.getElementById('reset'),
        settingsBtn: document.querySelector('.settings-btn'),
        closeBtn: document.querySelector('.close-btn'),
        cancelPresets: document.getElementById('cancelPresets'),
        savePresets: document.getElementById('savePresets')
    };

    // 각 요소가 존재하는지 확인 후 이벤트 리스너 추가
    if (elements.targetTime) {
        elements.targetTime.addEventListener('input', handleTargetTimeChange);
    }

    if (elements.start) {
        elements.start.addEventListener('click', handleStart);
    }

    if (elements.pause) {
        elements.pause.addEventListener('click', handlePause);
    }

    if (elements.reset) {
        elements.reset.addEventListener('click', handleReset);
    }

    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', handleSettings);
    }

    if (elements.closeBtn) {
        elements.closeBtn.addEventListener('click', closeModal);
    }

    if (elements.cancelPresets) {
        elements.cancelPresets.addEventListener('click', closeModal);
    }

    if (elements.savePresets) {
        elements.savePresets.addEventListener('click', handleSavePresets);
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', handlePresetClick);
    });
}

function handleTargetTimeChange(e) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
        // 값을 저장하되 실행 중인 타이머에는 영향을 주지 않음
        timerState.targetMinutes = value;
        chrome.storage.local.set({ targetMinutes: value });
        
        // 타이머가 실행 중이지 않을 때만 total-time 업데이트
        if (!timerState.startTime) {
            document.getElementById('total-time').textContent = formatTime(value * 60);
        }
    }
}

function handleStart() {
    const now = Date.now();
    
    if (timerState.pauseStartTime) {
        // 일시정지 상태에서 재시작하는 경우
        timerState.totalPauseDuration += (now - timerState.pauseStartTime);
        timerState.pauseStartTime = null;
    } else if (!timerState.startTime) {
        // 처음 시작하는 경우
        timerState.startTime = now;
        timerState.totalPauseDuration = 0;
        // 시작할 때 현재 설정된 목표 시간을 활성 목표 시간으로 설정
        timerState.activeTargetMinutes = timerState.targetMinutes;
        document.getElementById('total-time').textContent = formatTime(timerState.activeTargetMinutes * 60);
    }

    updateElapsed(now);
    startDelayUpdate();
    chrome.runtime.sendMessage({ action: 'startTimer' });
}

// 전역 변수로 일시정지 시간 추적
let timerPausedDuration = 0;
let pausedTime = null;

function handlePause() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
    clearInterval(timerState.elapsedInterval);
    clearInterval(timerState.delayInterval);
    timerState.pauseStartTime = Date.now();
}

function handleReset() {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
    clearInterval(timerState.elapsedInterval);
    clearInterval(timerState.delayInterval);
    timerState = {
        ...timerState,
        startTime: null,
        pauseStartTime: null,
        totalPauseDuration: 0
    };
    timerState.activeTargetMinutes = timerState.targetMinutes;  // 리셋 시 목표 시간 동기화
    document.getElementById('total-time').textContent = formatTime(timerState.targetMinutes * 60);
    updateDelayDisplay(0);
    document.getElementById('elapsed').textContent = '00:00';
    document.getElementById('elapsed-progress').style.width = '0%';
    document.getElementById('delay-progress').style.width = '0%';
}

function handleSettings() {
    chrome.storage.local.get(['presets'], (result) => {
        const presets = result.presets || [30, 40, 60];
        document.getElementById('preset1').value = presets[0];
        document.getElementById('preset2').value = presets[1];
        document.getElementById('preset3').value = presets[2];
    });
    document.getElementById('presetModal').classList.add('show');
}

function handleSavePresets() {
    const presets = [
        parseInt(document.getElementById('preset1').value),
        parseInt(document.getElementById('preset2').value),
        parseInt(document.getElementById('preset3').value)
    ].filter(val => !isNaN(val) && val > 0);

    if (presets.length === 3) {
        chrome.storage.local.set({ presets }, () => {
            updatePresetButtons(presets);
            closeModal();
        });
    }
}

function handlePresetClick() {
    const time = this.dataset.time;
    document.getElementById('targetTime').value = time;
    // 프리셋 버튼 클릭 시에도 total time은 업데이트하지 않고 저장만 함
    chrome.storage.local.set({ targetMinutes: parseInt(time, 10) });

    // Remove active class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    this.classList.add('active');
}

function closeModal() {
    document.getElementById('presetModal').classList.remove('show');
}

function updatePresetButtons(presets) {
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach((btn, index) => {
        btn.dataset.time = presets[index];
        btn.textContent = `${presets[index]}m`;
    });
}

function updateElapsed(now) {
    clearInterval(timerState.elapsedInterval);

    function update() {
        const currentTime = Date.now();
        const effectiveElapsed = currentTime - timerState.startTime - timerState.totalPauseDuration;
        const elapsedSec = Math.floor(effectiveElapsed / 1000);
        // 활성 목표 시간 사용
        const targetSeconds = timerState.activeTargetMinutes * 60;
        const remainingSec = Math.max(targetSeconds - elapsedSec, 0);
        
        document.getElementById('elapsed').textContent = formatTime(remainingSec);
        const progress = Math.max((remainingSec / targetSeconds) * 100, 0);
        document.getElementById('elapsed-progress').style.width = `${progress}%`;
    }

    update();
    timerState.elapsedInterval = setInterval(update, 1000);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateDelayDisplay(delaySeconds) {
    const delayEl = document.getElementById('delay');
    const delayText = delaySeconds > 0 ? `+${formatTime(delaySeconds)}` : '00:00';
    delayEl.textContent = delayText;
    delayEl.classList.toggle('delayed', delaySeconds > 0);

    chrome.storage.local.get(['targetMinutes'], (result) => {
        const targetSeconds = (result.targetMinutes || 30) * 60;
        // 딜레이는 왼쪽에서 오른쪽으로 증가
        const progress = delaySeconds > 0 ? Math.min((delaySeconds / targetSeconds) * 100, 100) : 0;
        document.getElementById('delay-progress').style.width = `${progress}%`;
    });
}

// 딜레이 업데이트를 위한 인터벌 설정
let delayInterval = null;

function startDelayUpdate() {
    clearInterval(timerState.delayInterval);
    timerState.delayInterval = setInterval(() => {
        chrome.storage.local.get(['delaySeconds'], (result) => {
            updateDelayDisplay(result.delaySeconds || 0);
        });
    }, 1000);
}

// 초기 상태 확인 및 업데이트 시작
function initializeTimerState() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
        if (res?.isRunning && res?.startTime) {
            timerState.startTime = res.startTime;
            // activeTargetMinutes 복원
            chrome.storage.local.get(['targetMinutes'], (result) => {
                timerState.activeTargetMinutes = result.targetMinutes || 30;
                updateElapsed(Date.now());
                startDelayUpdate();
            });
        } else if (res?.pausedTime) {
            // 일시 정지 상태일 때는 마지막 시간을 표시
            const elapsedSec = Math.floor((res.pausedTime) / 1000);
            chrome.storage.local.get(['targetMinutes', 'delaySeconds'], (result) => {
                timerState.activeTargetMinutes = result.targetMinutes || 30;
                const targetSeconds = timerState.activeTargetMinutes * 60;
                document.getElementById('elapsed').textContent = formatTime(Math.max(targetSeconds - elapsedSec, 0));
                document.getElementById('total-time').textContent = formatTime(targetSeconds);

                const elapsedProgress = Math.min((elapsedSec / targetSeconds) * 100, 100);
                document.getElementById('elapsed-progress').style.width = `${Math.max(100 - elapsedProgress, 0)}%`;

                const delay = result.delaySeconds || 0;
                const delayProgress = Math.min((delay / targetSeconds) * 100, 100);
                document.getElementById('delay-progress').style.width = `${delayProgress}%`;
                document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '00:00';
            });
        }
    });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'timerStarted') {
        timerState.startTime = message.startTime;
        updateElapsed(Date.now());
        startDelayUpdate();
    }
});