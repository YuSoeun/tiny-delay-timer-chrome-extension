document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 초기 상태 로드
        const targetTimeInput = document.getElementById('targetTime');
        const result = await chrome.storage.local.get(['targetMinutes']);
        if (targetTimeInput) {
            targetTimeInput.value = result.targetMinutes || 30;
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
        chrome.storage.local.set({ targetMinutes: value });
    }
}

function handleStart() {
    // 타이머 시작 요청과 동시에 UI 즉시 업데이트
    const now = Date.now();
    updateElapsed(now);
    startDelayUpdate();
    chrome.runtime.sendMessage({ action: 'startTimer' });
}

function handlePause() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
    clearInterval(elapsedInterval);
    clearInterval(delayInterval);
}

function handleReset() {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
    clearInterval(elapsedInterval);
    clearInterval(delayInterval);
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

let elapsedInterval = null;

function updateElapsed(startTime) {
    clearInterval(elapsedInterval);

    function format(sec) {
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function update() {
        const now = Date.now();
        const elapsedSec = Math.floor((now - startTime) / 1000);
        document.getElementById('elapsed').textContent = format(elapsedSec);

        // 프로그레스 바 업데이트 로직 추가
        chrome.storage.local.get(['targetMinutes'], (result) => {
            const targetSeconds = (result.targetMinutes || 30) * 60;
            const progress = Math.min((elapsedSec / targetSeconds) * 100, 100);
            document.getElementById('elapsed-progress').style.width = `${progress}%`;
        });
    }

    update(); // 즉시 표시
    elapsedInterval = setInterval(update, 1000);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateDelayDisplay(delaySeconds) {
    // 딜레이가 0이거나 undefined일 때는 '00:00' 표시
    const delayText = delaySeconds > 0 ? `+${formatTime(delaySeconds)}` : '00:00';
    document.getElementById('delay').textContent = delayText;

    // 딜레이 프로그레스 바 업데이트
    chrome.storage.local.get(['targetMinutes'], (result) => {
        const targetSeconds = (result.targetMinutes || 30) * 60;
        // 딜레이가 0이면 프로그레스바도 0
        const progress = delaySeconds > 0 ? Math.min((delaySeconds / targetSeconds) * 100, 100) : 0;
        document.getElementById('delay-progress').style.width = `${progress}%`;
    });
}

// 딜레이 업데이트를 위한 인터벌 설정
let delayInterval = null;

function startDelayUpdate() {
    clearInterval(delayInterval);
    delayInterval = setInterval(() => {
        chrome.storage.local.get(['delaySeconds'], (result) => {
            updateDelayDisplay(result.delaySeconds || 0);
        });
    }, 1000);
}

// 초기 상태 확인 및 업데이트 시작
function initializeTimerState() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
        if (res?.isRunning && res?.startTime) {
            updateElapsed(res.startTime);
            startDelayUpdate();
        } else if (res?.pausedTime) {
            // 일시 정지 상태일 때는 마지막 시간을 표시
            const elapsedSec = Math.floor((res.pausedTime) / 1000);
            document.getElementById('elapsed').textContent = formatTime(elapsedSec);
            
            // 프로그레스 바도 마지막 상태로 유지
            chrome.storage.local.get(['targetMinutes', 'delaySeconds'], (result) => {
                const targetSeconds = (result.targetMinutes || 30) * 60;
                const elapsedProgress = Math.min((elapsedSec / targetSeconds) * 100, 100);
                document.getElementById('elapsed-progress').style.width = `${elapsedProgress}%`;

                const delay = result.delaySeconds || 0;
                const delayProgress = Math.min((delay / targetSeconds) * 100, 100);
                document.getElementById('delay-progress').style.width = `${delayProgress}%`;
                document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '00:00';
            });
        } else {
            document.getElementById('elapsed').textContent = '00:00';
            document.getElementById('elapsed-progress').style.width = '0%';
            document.getElementById('delay-progress').style.width = '0%';
        }
    });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'timerStarted') {
        updateElapsed(message.startTime);
        startDelayUpdate();
    }
});