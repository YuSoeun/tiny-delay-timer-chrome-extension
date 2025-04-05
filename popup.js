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
        const totalTimeInput = document.getElementById('total-time');
        totalTimeInput.value = formatTime(timerState.targetMinutes * 60);
        
        // 입력란에 포커스 및 커서 위치 설정
        totalTimeInput.focus();
        totalTimeInput.setSelectionRange(totalTimeInput.value.length, totalTimeInput.value.length);

        const presets = result.presets || [30, 41, 60];  // 기본값 3개로 수정
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

    // total-time 입력 처리
    const totalTimeInput = document.getElementById('total-time');

    totalTimeInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9:]/g, ''); // 숫자와 콜론만 허용
        const parts = value.split(':');
        
        // 콜론이 2개 이상이면 처음 3부분만 사용
        if (parts.length > 3) {
            parts.length = 3;
            value = parts.join(':');
        }

        // 각 부분의 유효성 검사 및 수정
        if (parts.length === 3) {
            let [hours, minutes, seconds] = parts.map(part => parseInt(part) || 0);
            
            hours = Math.min(Math.max(hours, 0), 99);
            minutes = Math.min(Math.max(minutes, 0), 59);
            seconds = Math.min(Math.max(seconds, 0), 59);

            value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        e.target.value = value;
    });

    totalTimeInput.addEventListener('blur', (e) => {
        let value = e.target.value;
        const parts = value.split(':');
        
        // 올바른 HH:MM:SS 형식이 아니면 기본값으로 설정
        if (parts.length !== 3) {
            value = '00:00:00';
        }
        
        const [hours, minutes, seconds] = value.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        e.target.value = formatTime(totalSeconds);
    });
}

// 시간 유효성 검사 함수 추가
function isValidTime(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 3) return false;
    
    const [hours, minutes, seconds] = parts;
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return false;
    if (hours < 0 || hours > 99) return false;
    if (minutes < 0 || minutes >= 60) return false;
    if (seconds < 0 || seconds >= 60) return false;
    
    return true;
}

function handleTargetTimeChange(e) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
        timerState.targetMinutes = value;
        chrome.storage.local.set({ targetMinutes: value });
    }
}

function handleStart() {
    // 입력된 시간 가져오기
    const timeValue = document.getElementById('total-time').value;
    
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    // HH:MM:SS를 초로 변환
    const [hours, minutes, seconds] = timeValue.split(':').map(Number);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    const totalMinutes = Math.ceil(totalSeconds / 60); // 초 단위 올림으로 분 계산

    timerState.activeTargetMinutes = totalMinutes;
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    timerState.pausedTime = null;

    // UI 상태 변경
    document.querySelector('.container').classList.add('running');

    // 타이머 시작 메시지 전송
    chrome.runtime.sendMessage({
        action: 'startTimer',
        targetMinutes: totalMinutes
    });

    // 상태 업데이트 인터벌 시작
    startStatusUpdateInterval();
}

function handlePause() {
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    chrome.runtime.sendMessage({ action: 'pauseTimer' });
}

function handleReset() {
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    document.querySelector('.container').classList.remove('running');

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
        // total-time을 업데이트하고 포맷팅
        const totalTimeInput = document.getElementById('total-time');
        totalTimeInput.value = formatTime(time * 60);
        
        // 스토리지 업데이트
        chrome.storage.local.set({ targetMinutes: time });
        
        // active 상태 업데이트
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
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

            if (timerState.isRunning || timerState.pausedTime) {
                document.querySelector('.container').classList.add('running');
            } else {
                document.querySelector('.container').classList.remove('running');
            }

            if (timerState.isRunning) {
                startStatusUpdateInterval();
            } else if (timerState.pausedTime) {
                // 일시정지 상태에서는 최신 remaining, delay 값을 유지
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            } else {
                // 초기 상태
                document.getElementById('elapsed').textContent = '00:00:00';
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
    document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '00:00:00';

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
    seconds = Math.ceil(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // 항상 HH:MM:SS 형식으로 표시
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function openPresetModal() {
    chrome.storage.local.get(['presets'], (result) => {
        const presets = result.presets || [30, 41, 60];  // 기본값 3개로 수정
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

    if (presets.length === 3) {  // 3개 모두 유효한지 확인
        chrome.storage.local.set({ presets }, () => {
            updatePresetButtons(presets);
            closePresetModal();
        });
    } else {
        alert('Please enter valid preset values (greater than 0).');
    }
}

function updatePresetButtons(presets = [30, 41, 60]) {
    if (!Array.isArray(presets) || presets.length !== 3) {
        presets = [30, 41, 60];
    }
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach((button, index) => {
        const minutes = presets[index] || 30;
        const totalSeconds = minutes * 60;
        button.textContent = formatTime(totalSeconds);  // 분을 HH:MM:SS 형식으로 변환
        button.dataset.time = minutes;
    });
}