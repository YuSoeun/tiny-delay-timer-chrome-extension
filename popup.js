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
        setupTimerSlider();
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

    const totalTimeInput = document.getElementById('total-time');
    let isDragging = false;
    let startY = 0;
    let selectedPart = '';
    let selectedStart = 0;
    let originalValue = 0;

    totalTimeInput.addEventListener('click', (e) => {
        const pos = e.target.selectionStart;
        // 클릭 위치에 따라 시/분/초 선택
        if (pos <= 2) {
            selectedPart = 'hours';
            selectedStart = 0;
        } else if (pos <= 5) {
            selectedPart = 'minutes';
            selectedStart = 3;
        } else {
            selectedPart = 'seconds';
            selectedStart = 6;
        }
        e.target.setSelectionRange(selectedStart, selectedStart + 2);
    });

    totalTimeInput.addEventListener('mousedown', (e) => {
        if (timerState.isRunning) return;
        
        isDragging = true;
        startY = e.clientY;
        const [hours, minutes, seconds] = totalTimeInput.value.split(':').map(Number);
        
        switch(selectedPart) {
            case 'hours': originalValue = hours; break;
            case 'minutes': originalValue = minutes; break;
            case 'seconds': originalValue = seconds; break;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || timerState.isRunning) return;
        
        const delta = Math.round((startY - e.clientY) / 5);
        let newValue = originalValue + delta;
        const [hours, minutes, seconds] = totalTimeInput.value.split(':').map(Number);
        
        // 범위 제한
        switch(selectedPart) {
            case 'hours':
                newValue = Math.min(Math.max(newValue, 0), 99);
                totalTimeInput.value = formatTime(newValue * 3600 + minutes * 60 + seconds);
                break;
            case 'minutes':
                newValue = Math.min(Math.max(newValue, 0), 59);
                totalTimeInput.value = formatTime(hours * 3600 + newValue * 60 + seconds);
                break;
            case 'seconds':
                newValue = Math.min(Math.max(newValue, 0), 59);
                totalTimeInput.value = formatTime(hours * 3600 + minutes * 60 + newValue);
                break;
        }
        totalTimeInput.setSelectionRange(selectedStart, selectedStart + 2);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        // 변경된 값을 저장
        const [hours, minutes, seconds] = totalTimeInput.value.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        timerState.targetMinutes = Math.ceil(totalSeconds / 60);
        chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
    });

    // 키보드 입력 처리
    totalTimeInput.addEventListener('keydown', (e) => {
        if (timerState.isRunning) return;
        
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const [hours, minutes, seconds] = totalTimeInput.value.split(':').map(Number);
            let newValue = parseInt(e.key);
            
            switch(selectedPart) {
                case 'hours':
                    totalTimeInput.value = formatTime(newValue * 3600 + minutes * 60 + seconds);
                    break;
                case 'minutes':
                    totalTimeInput.value = formatTime(hours * 3600 + newValue * 60 + seconds);
                    break;
                case 'seconds':
                    totalTimeInput.value = formatTime(hours * 3600 + minutes * 60 + newValue);
                    break;
            }
            totalTimeInput.setSelectionRange(selectedStart, selectedStart + 2);
        }
        
        // 방향키로 이동
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            selectedStart = e.key === 'ArrowLeft' ? 
                (selectedStart === 0 ? 6 : selectedStart - 3) : 
                (selectedStart === 6 ? 0 : selectedStart + 3);
            selectedPart = selectedStart === 0 ? 'hours' : selectedStart === 3 ? 'minutes' : 'seconds';
            totalTimeInput.setSelectionRange(selectedStart, selectedStart + 2);
        }
    });

    // 슬라이더 이벤트 리스너 추가
    const timeSlider = document.getElementById('time-slider');

    timeSlider.addEventListener('input', (e) => {
        const seconds = parseInt(e.target.value);
        totalTimeInput.value = formatTime(seconds);
    });

    timeSlider.addEventListener('change', (e) => {
        const seconds = parseInt(e.target.value);
        timerState.targetMinutes = Math.ceil(seconds / 60);
        chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
    });

    // total-time 클릭 시 타임피커 모달 표시
    document.getElementById('total-time').addEventListener('click', function(e) {
        if (!timerState.isRunning) {
            window.timePickerModal.open(this.value);
        }
    });

    // 메시지 리스너 추가
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'timeSelected') {
            const totalTimeInput = document.getElementById('total-time');
            totalTimeInput.value = message.time;
            
            // 타이머 상태 업데이트
            const [hours, minutes] = message.time.split(':');
            const totalSeconds = hours * 3600 + minutes * 60;
            timerState.targetMinutes = Math.ceil(totalSeconds / 60);
            chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
        }
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
    const timeValue = document.getElementById('total-time').value;
    
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    // HH:MM:SS를 초로 변환
    const [hours, minutes, seconds] = timeValue.split(':').map(Number);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    timerState.activeTargetMinutes = Math.ceil(totalSeconds / 60);
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    timerState.pausedTime = null;

    // UI 상태 변경
    document.querySelector('.container').classList.add('running');
    document.getElementById('elapsed').textContent = formatTime(totalSeconds);

    // 타이머 시작 메시지 전송
    chrome.runtime.sendMessage({
        action: 'startTimer',
        targetMinutes: timerState.activeTargetMinutes,
        totalSeconds: totalSeconds
    });

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
        const totalSeconds = time * 60;
        
        // total-time과 slider 모두 업데이트
        const totalTimeInput = document.getElementById('total-time');
        const timeSlider = document.getElementById('time-slider');
        
        totalTimeInput.value = formatTime(totalSeconds);
        timeSlider.value = totalSeconds;
        
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
        if (!timerState.isRunning) return;

        const now = Date.now();
        const elapsed = Math.floor((now - timerState.startTime) / 1000);
        const totalSeconds = timerState.activeTargetMinutes * 60;
        const remaining = Math.max(totalSeconds - elapsed, 0);
        const delay = Math.max(elapsed - totalSeconds, 0);

        updateUIFromStatus(remaining, delay, totalSeconds);
    }, 1000);
}

function updateUIFromStatus(remaining, delay, totalSeconds) {
    // 남은 시간 표시
    document.getElementById('elapsed').textContent = formatTime(remaining);
    
    // 지연 시간 표시
    document.getElementById('delay').textContent = delay > 0 ? `+${formatTime(delay)}` : '';

    // 총 소요 시간 계산 및 표시
    const totalElapsed = (totalSeconds - remaining) + delay;
    document.getElementById('total-elapsed').textContent = formatTime(totalElapsed);

    // 프로그레스 바 업데이트
    const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
    const delayProgress = (delay / totalSeconds) * 100;
    
    document.getElementById('elapsed-progress').style.width = `${Math.floor(progress)}%`;
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

// 타이머 슬라이더 모달 관련 코드 추가
function setupTimerSlider() {
    const modal = document.getElementById('timerSliderModal');
    const modalBackground = document.getElementById('timerSliderBackground');
    const timerSlider = document.getElementById('timerSlider');
    const timerTime = document.getElementById('timerTime');
    const modalHeader = document.getElementById('timerSliderHeader');
    let isDragging = false;
    let offsetX, offsetY;

    // 드래그 기능 구현
    modalHeader.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - modal.offsetLeft;
        offsetY = e.clientY - modal.offsetTop;
        modal.style.cursor = 'move';
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            modal.style.left = e.clientX - offsetX + 'px';
            modal.style.top = e.clientY - offsetY + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        modal.style.cursor = 'default';
    });

    // 슬라이더 값 변경 시 시간 업데이트
    timerSlider.addEventListener('input', function() {
        const totalSeconds = parseInt(timerSlider.value);
        timerTime.textContent = formatTime(totalSeconds);
        document.getElementById('total-time').value = formatTime(totalSeconds);
    });

    // 모달 닫기
    modalBackground.addEventListener('click', function() {
        modal.style.display = 'none';
        modalBackground.style.display = 'none';
    });

    // total-time 클릭 시 슬라이더 모달 표시
    document.getElementById('total-time').addEventListener('click', function(e) {
        if (!timerState.isRunning) {
            modal.style.display = 'block';
            modalBackground.style.display = 'block';
            // 현재 설정된 시간을 슬라이더에 반영
            const currentTime = this.value.split(':').map(Number);
            const totalSeconds = currentTime[0] * 3600 + currentTime[1] * 60 + currentTime[2];
            timerSlider.value = totalSeconds;
            timerTime.textContent = formatTime(totalSeconds);
            e.stopPropagation();
        }
    });
}