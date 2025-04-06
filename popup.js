import { PresetModal } from './modals/preset-modal.js';
import { TimePickerModal } from './modals/time-picker-modal.js';

// Define the timer state constants at the top level so they're accessible everywhere
const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
};

// Keep track of current state
let currentState = TimerState.IDLE;

let timerState = {
    targetMinutes: 30,
    startTime: null,
    isRunning: false,
    pausedTime: null,
    activeTargetMinutes: 30
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const elements = await initializeUI();
    if (!elements) {
      throw new Error('Failed to initialize UI elements');
    }

    // Initialize event listeners after UI elements are ready
    await setupEventListeners(elements);
    await initializeTimerState();

    // Set initial state
    document.body.classList.add('state-idle');

    // Initialize time previews when the preset modal is opened
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        setTimeout(() => {
          updateTimePreview();
          setupPresetInputs();
        }, 100); // Update after modal is displayed
      });
    }
  } catch (err) {
    console.error('Error initializing popup:', err);
  }
});

async function initializeUI() {
  try {
    const timePickerModal = new TimePickerModal();
    window.timePickerModal = timePickerModal;

    // Define all potential elements we might use
    const elements = {
      timerDisplay: document.getElementById('timerDisplay'),
      elapsed: document.getElementById('elapsed'),
      delay: document.getElementById('delay'),
      totalElapsed: document.getElementById('total-elapsed'),
      elapsedProgress: document.getElementById('elapsed-progress'),
      delayProgress: document.getElementById('delay-progress'),
      playBtn: document.getElementById('playBtn'),
      pauseBtn: document.getElementById('pauseBtn'),
      resetBtn: document.getElementById('resetBtn'),
      totalTimeInput: document.getElementById('total-time'),
      targetTime: document.getElementById('targetTime'),
      timeSlider: document.getElementById('time-slider'),
      settingsBtn: document.querySelector('.settings-btn')
    };

    // Only verify critical elements and log warnings for missing non-critical ones
    const criticalElements = ['elapsed', 'delay', 'totalElapsed', 'elapsedProgress', 'delayProgress', 'totalTimeInput'];
    let hasAllCriticalElements = true;
    
    criticalElements.forEach(name => {
      if (!elements[name]) {
        console.error(`Critical element #${name} not found!`);
        hasAllCriticalElements = false;
      }
    });

    if (!hasAllCriticalElements) {
      throw new Error('One or more critical elements are missing');
    }

    // Initialize click handlers for elements that exist
    if (elements.timerDisplay) {
      elements.timerDisplay.addEventListener('click', () => {
        try {
          timePickerModal.open(elements.timerDisplay.textContent);
        } catch (err) {
          console.error('Error opening time picker:', err);
        }
      });
    }

    // 버튼 이벤트 리스너는 setupEventListeners에서만 설정하도록 수정
    // 여기서는 요소만 확인하고 반환

    return elements;
  } catch (err) {
    console.error('Error in initializeUI:', err);
    return null;
  }
}

function setupEventListeners(elements) {
    if (!elements) {
        console.error('No UI elements provided to setupEventListeners');
        return;
    }

    // Check if critical totalTimeInput element exists
    if (!elements.totalTimeInput) {
        console.error('Critical element #total-time not found');
        return;
    }

    // Setup event listeners for elements that exist
    if (elements.targetTime) {
        elements.targetTime.addEventListener('input', handleTargetTimeChange);
    }
    
    // playBtn, pauseBtn, resetBtn 이벤트 리스너 설정
    if (elements.playBtn) {
        elements.playBtn.addEventListener('click', handleStart);
    }
    
    if (elements.pauseBtn) {
        elements.pauseBtn.addEventListener('click', handlePause);
    }
    
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', handleReset);
    }

    // 프리셋 버튼 클릭 이벤트 추가
    const presetButtons = document.querySelectorAll('.preset-btn');
    if (presetButtons.length > 0) {
        presetButtons.forEach(button => {
            button.addEventListener('click', handlePresetClick);
        });
    }

    // 설정 버튼 클릭 이벤트 추가
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openPresetModal);
    }

    // 모달 닫기 및 저장 버튼 이벤트 추가
    const cancelPresetsBtn = document.getElementById('cancelPresets');
    if (cancelPresetsBtn) {
        cancelPresetsBtn.addEventListener('click', closePresetModal);
    }
    
    const savePresetsBtn = document.getElementById('savePresets');
    if (savePresetsBtn) {
        savePresetsBtn.addEventListener('click', savePresetChanges);
    }
    
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePresetModal);
    }

    const totalTimeInput = document.getElementById('total-time');
    if (!totalTimeInput) {
        console.error('Critical element #total-time not found');
        return;
    }

    let isDragging = false;
    let startY = 0;
    let selectedPart = '';
    let selectedStart = 0;
    let originalValue = 0;

    totalTimeInput.addEventListener('click', (e) => {
        const pos = e.target.selectionStart;
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
        
        switch(selectedPart) {
            case 'hours':
                newValue = Math.min(Math.max(newValue, 0), 23);
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
        const [hours, minutes, seconds] = totalTimeInput.value.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        timerState.targetMinutes = Math.ceil(totalSeconds / 60);
        chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
    });

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
        
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            selectedStart = e.key === 'ArrowLeft' ? 
                (selectedStart === 0 ? 6 : selectedStart - 3) : 
                (selectedStart === 6 ? 0 : selectedStart + 3);
            selectedPart = selectedStart === 0 ? 'hours' : selectedStart === 3 ? 'minutes' : 'seconds';
            totalTimeInput.setSelectionRange(selectedStart, selectedStart + 2);
        }
    });

    const timeSlider = document.getElementById('time-slider');
    if (timeSlider) {
        timeSlider.addEventListener('input', (e) => {
            if (totalTimeInput) {
                const seconds = parseInt(e.target.value);
                totalTimeInput.value = formatTime(seconds);
            }
        });

        timeSlider.addEventListener('change', (e) => {
            const seconds = parseInt(e.target.value);
            timerState.targetMinutes = Math.ceil(seconds / 60);
            chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
        });
    }

    if (totalTimeInput) {
        totalTimeInput.addEventListener('click', function(e) {
            if (!timerState.isRunning && window.timePickerModal) {
                window.timePickerModal.open(this.value);
            }
        });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'timeSelected') {
            const totalTimeInput = document.getElementById('total-time');
            if (totalTimeInput) {
                totalTimeInput.value = message.time;
                const [hours, minutes] = message.time.split(':');
                const totalSeconds = hours * 3600 + minutes * 60;
                timerState.targetMinutes = Math.ceil(totalSeconds / 60);
                chrome.storage.local.set({ targetMinutes: timerState.targetMinutes });
            }
        }
    });
}

function isValidTime(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 3) return false;
    
    const [hours, minutes, seconds] = parts;
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return false;
    if (hours < 0 || hours > 23) return false;
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

// 타이머 상태 업데이트 함수
function updateTimerState(newState) {
  // Remove all state classes
  document.body.classList.remove('state-idle', 'state-running', 'state-paused');
  
  // Add the new state class
  document.body.classList.add(`state-${newState}`);
  
  // DOM 요소 참조
  const idleState = document.getElementById('idle-state');
  const runningState = document.getElementById('running-state');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  // 버튼 상태 초기화
  [playBtn, pauseBtn, resetBtn].forEach(btn => btn.classList.remove('enabled'));
  
  // 새 상태에 따른 UI 업데이트
  switch(newState) {
    case TimerState.IDLE:
      // IDLE 상태에서는 타이머 표시(idle-state)를 보여주고 running-state는 숨김
      idleState.classList.add('active');
      runningState.classList.remove('active');
      
      // 재생 버튼만 활성화
      playBtn.classList.add('enabled');
      break;
      
    case TimerState.RUNNING:
      // RUNNING 상태에서는 타이머 표시(idle-state)를 숨기고 running-state만 보여줌
      idleState.classList.remove('active');
      runningState.classList.add('active');
      
      // 일시정지 및 리셋 버튼 활성화
      pauseBtn.classList.add('enabled');
      resetBtn.classList.add('enabled');
      break;
      
    case TimerState.PAUSED:
      // PAUSED 상태에서도 타이머 표시(idle-state)를 숨기고 running-state만 보여줌
      idleState.classList.remove('active');
      runningState.classList.add('active');
      
      // 재생 및 리셋 버튼 활성화
      playBtn.classList.add('enabled');
      resetBtn.classList.add('enabled');
      break;
  }
  
  // 현재 상태 업데이트
  currentState = newState;
}

function handleStart() {
    const timeValue = document.getElementById('total-time').value;
    
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    // 일시정지 상태에서 다시 시작하는 경우
    if (timerState.pausedTime !== null) {
        console.log('Resuming from paused state');
        
        // 일시정지 상태에서 경과한 시간만큼 startTime을 조정
        const pausedDuration = Date.now() - timerState.pausedTime;
        timerState.startTime += pausedDuration;
        timerState.pausedTime = null;
        timerState.isRunning = true;

        // UI 상태 업데이트
        updateTimerState(TimerState.RUNNING);
        
        // background 서비스에 타이머 재시작 메시지 전송
        chrome.runtime.sendMessage({
            action: 'resumeTimer',
            pausedDuration: pausedDuration
        });
        
        startStatusUpdateInterval();
        return;
    }

    // 새 타이머 시작
    const [hours, minutes, seconds] = timeValue.split(':').map(Number);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    timerState.activeTargetMinutes = Math.ceil(totalSeconds / 60);
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    timerState.pausedTime = null;

    const container = document.querySelector('.container');
    if (container) container.classList.add('running');

    const elapsedElement = document.getElementById('elapsed');
    if (elapsedElement) elapsedElement.textContent = formatTime(totalSeconds);

    chrome.runtime.sendMessage({
        action: 'startTimer',
        targetMinutes: timerState.activeTargetMinutes,
        totalSeconds: totalSeconds
    });

    updateTimerState(TimerState.RUNNING);
    startStatusUpdateInterval();
}

function handlePause() {
    // 유효한 시간 형식인지 확인
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    // 타이머가 실행 중이 아니면 일시정지할 수 없음
    if (!timerState.isRunning) {
        console.log('Timer is not running, cannot pause');
        return;
    }
    
    // 로컬 타이머 상태 업데이트
    timerState.isRunning = false;
    timerState.pausedTime = Date.now();
    
    // background 서비스에 일시정지 메시지 전송
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
    
    // UI 상태 업데이트
    updateTimerState(TimerState.PAUSED);
    
    // 진행 중이던 interval 정리
    clearInterval(timerState.elapsedInterval);
    
    console.log('Timer paused successfully');
}

function handleReset() {
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    // 타이머 상태 로컬 업데이트
    timerState.startTime = null;
    timerState.isRunning = false;
    timerState.pausedTime = null;
    timerState.activeTargetMinutes = timerState.targetMinutes;

    // 백그라운드에 리셋 메시지 전송
    chrome.runtime.sendMessage({ action: 'resetTimer' }, (response) => {
        // 응답을 기다릴 필요는 없지만, 로그 목적으로 첨가
        console.log('Timer reset successfully');
    });
    
    // 실행 중 interval 정리
    clearInterval(timerState.elapsedInterval);
    
    // UI 업데이트
    const container = document.querySelector('.container');
    if (container) container.classList.remove('running');
    
    resetUI();
    updateTimerState(TimerState.IDLE);
}

function handlePresetClick(e) {
    const time = parseInt(e.target.dataset.time, 10);
    if (!isNaN(time) && time > 0) {
        timerState.targetMinutes = time;
        const totalSeconds = time * 60;

        const totalTimeInput = document.getElementById('total-time');
        const timeSlider = document.getElementById('time-slider');
        const timerDisplay = document.getElementById('timerDisplay');

        if (totalTimeInput) {
            totalTimeInput.value = formatTime(totalSeconds);
        }
        if (timeSlider) {
            timeSlider.value = totalSeconds;
        }
        // IDLE 상태에서 타이머 디스플레이도 업데이트
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(totalSeconds);
        }

        chrome.storage.local.set({ targetMinutes: time });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Ensure the timer state is updated even in IDLE state
        if (currentState === TimerState.IDLE) {
            updateUIFromStatus(totalSeconds, 0, totalSeconds);
        }
    }
}

function resetUI() {
    const totalSeconds = timerState.activeTargetMinutes * 60;
    updateUIFromStatus(0, 0, totalSeconds);
    
    const elapsedProgress = document.getElementById('elapsed-progress');
    const delayProgress = document.getElementById('delay-progress');
    const totalTime = document.getElementById('total-time');
    
    if (elapsedProgress) elapsedProgress.style.width = '0%';
    if (delayProgress) delayProgress.style.width = '0%';
    if (totalTime) {
        if (totalTime.tagName === 'INPUT') {
            totalTime.value = formatTime(totalSeconds);
        } else {
            totalTime.textContent = formatTime(totalSeconds);
        }
    }
}

function initializeTimerState() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
        if (res) {
            timerState.startTime = res.startTime;
            timerState.isRunning = res.isRunning;
            timerState.pausedTime = res.pausedTime;
            timerState.activeTargetMinutes = res.activeTargetMinutes;

            const targetSeconds = timerState.activeTargetMinutes * 60;
            const container = document.querySelector('.container');

            if (container) {
                if (timerState.isRunning || timerState.pausedTime) {
                    container.classList.add('running');
                } else {
                    container.classList.remove('running');
                }
            }

            if (timerState.isRunning) {
                updateTimerState(TimerState.RUNNING);
                startStatusUpdateInterval();
            } else if (timerState.pausedTime) {
                updateTimerState(TimerState.PAUSED);
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            } else {
                updateTimerState(TimerState.IDLE);
                const elapsedElement = document.getElementById('elapsed');
                if (elapsedElement) {
                    elapsedElement.textContent = '00:00:00';
                }
                updateUIFromStatus(0, 0, targetSeconds);
            }

            const totalTimeElement = document.getElementById('total-time');
            if (totalTimeElement) {
                if (totalTimeElement.tagName === 'INPUT') {
                    totalTimeElement.value = formatTime(targetSeconds);
                } else {
                    totalTimeElement.textContent = formatTime(targetSeconds);
                }
            }
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
  try {
    const elements = {
      elapsed: document.getElementById('elapsed'),
      delay: document.getElementById('delay'),
      totalElapsed: document.getElementById('total-elapsed'),
      elapsedProgress: document.getElementById('elapsed-progress'),
      delayProgress: document.getElementById('delay-progress')
    };

    if (elements.elapsed) {
      elements.elapsed.textContent = formatTime(remaining);
    }
    
    if (elements.delay) {
      elements.delay.textContent = delay > 0 ? `+${formatTime(delay)}` : '';
    }
    
    if (elements.totalElapsed) {
      const total = (totalSeconds - remaining) + delay;
      elements.totalElapsed.textContent = formatTime(total);
    }

    // 남은 시간에 따라 progress bar를 줄어들게 (remaining / totalSeconds)
    const progress = (remaining / totalSeconds) * 100;
    const delayProgress = (delay / totalSeconds) * 100;
    
    if (elements.elapsedProgress) {
      elements.elapsedProgress.style.width = `${Math.floor(progress)}%`;
    }
    
    if (elements.delayProgress) {
      elements.delayProgress.style.width = `${Math.floor(delayProgress)}%`;
    }
  } catch (err) {
    console.error('Error updating UI:', err);
  }
}

function formatTime(seconds) {
    seconds = Math.ceil(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setupPresetInputs() {
  const presetInputs = document.querySelectorAll('.preset-edit .time-input-wrapper .main-input');
  
  presetInputs.forEach(input => {
    const wrapper = input.closest('.time-input-wrapper');
    const hourInput = wrapper.querySelector('.hour-input');
    const minuteInput = wrapper.querySelector('.minute-input');
    const secondInput = wrapper.querySelector('.second-input');
    
    if (!hourInput || !minuteInput || !secondInput) return;
    
    // Format inputs with leading zeros
    formatTimeInput(hourInput);
    formatTimeInput(minuteInput);
    formatTimeInput(secondInput);
    
    // Add input event listeners
    [hourInput, minuteInput, secondInput].forEach(input => {
      // Handle input changes
      input.addEventListener('input', () => {
        const maxVal = input === hourInput ? 23 : 59;
        let val = parseInt(input.value) || 0;
        
        // Enforce max value
        if (val > maxVal) {
          val = maxVal;
          input.value = val;
        }
        
        updateMainInputFromTimeInputs(wrapper);
      });
      
      // Format value when input loses focus
      input.addEventListener('blur', () => {
        formatTimeInput(input);
      });
      
      // Select all text when focused
      input.addEventListener('focus', () => {
        input.select();
      });
      
      // Handle keyboard navigation
      input.addEventListener('keydown', (e) => {
        const maxVal = input === hourInput ? 23 : 59;
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          let val = parseInt(input.value) || 0;
          val = (val + 1) % (maxVal + 1);
          input.value = String(val).padStart(2, '0');
          updateMainInputFromTimeInputs(wrapper);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          let val = parseInt(input.value) || 0;
          val = (val - 1 + (maxVal + 1)) % (maxVal + 1);
          input.value = String(val).padStart(2, '0');
          updateMainInputFromTimeInputs(wrapper);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // Navigate between inputs
          e.preventDefault();
          const inputs = [hourInput, minuteInput, secondInput];
          const currentIndex = inputs.indexOf(input);
          const nextIndex = currentIndex + (e.key === 'ArrowLeft' ? -1 : 1);
          
          if (nextIndex >= 0 && nextIndex < inputs.length) {
            inputs[nextIndex].focus();
            inputs[nextIndex].select();
          }
        }
      });
    });
  });
}

// Helper function to format time inputs with leading zeros
function formatTimeInput(input) {
  const maxVal = input.classList.contains('hour-input') ? 23 : 59;
  let val = parseInt(input.value) || 0;
  if (val < 0) val = 0;
  if (val > maxVal) val = maxVal;
  input.value = String(val).padStart(2, '0');
}

function updateMainInputFromTimeInputs(wrapper) {
  const hourInput = wrapper.querySelector('.hour-input');
  const minuteInput = wrapper.querySelector('.minute-input');
  const secondInput = wrapper.querySelector('.second-input');
  const mainInput = wrapper.querySelector('.main-input');
  
  if (!hourInput || !minuteInput || !secondInput || !mainInput) return;
  
  const h = parseInt(hourInput.value) || 0;
  const m = parseInt(minuteInput.value) || 0;
  const s = parseInt(secondInput.value) || 0;
  
  // Format inputs with leading zeros
  formatTimeInput(hourInput);
  formatTimeInput(minuteInput);
  formatTimeInput(secondInput);
  
  // Convert to total minutes, rounding up if there are seconds
  const totalMinutes = h * 60 + m + (s > 0 ? 1 : 0);
  mainInput.value = totalMinutes;
}

function openPresetModal() {
  chrome.storage.local.get(['presets'], (result) => {
    const presets = result.presets || [30, 41, 60];
    
    // Setup each preset
    document.querySelectorAll('.preset-edit').forEach((preset, index) => {
      const minutes = presets[index] || 30;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      const hourInput = preset.querySelector('.hour-input');
      const minuteInput = preset.querySelector('.minute-input');
      const secondInput = preset.querySelector('.second-input');
      const mainInput = preset.querySelector('.main-input');
      
      if (hourInput) hourInput.value = String(hours).padStart(2, '0');
      if (minuteInput) minuteInput.value = String(mins).padStart(2, '0');
      if (secondInput) secondInput.value = String(mins).padStart(2, '0');
      if (mainInput) mainInput.value = minutes;
    });
    
    // Setup input handlers
    setupPresetInputs();
  });
  
  // Show modal with animation
  const modal = document.getElementById('presetModal');
  if (modal) {
    modal.classList.add('show');
    // Focus on the first hour input for immediate editing
    setTimeout(() => {
      const firstHourInput = modal.querySelector('.hour-input');
      if (firstHourInput) firstHourInput.focus();
    }, 300);
  }
}

function closePresetModal() {
    document.getElementById('presetModal').classList.remove('show');
}

// Updated function to save preset changes
function savePresetChanges() {
  const presets = [];
  
  document.querySelectorAll('.preset-edit .time-input-wrapper').forEach(wrapper => {
    const hourInput = wrapper.querySelector('.hour-input');
    const minuteInput = wrapper.querySelector('.minute-input');
    const secondInput = wrapper.querySelector('.second-input');
    
    if (hourInput && minuteInput && secondInput) {
      const h = parseInt(hourInput.value) || 0;
      const m = parseInt(minuteInput.value) || 0;
      const s = parseInt(secondInput.value) || 0;
      
      // Convert to total minutes, rounding up if there are seconds
      const totalMinutes = h * 60 + m + (s > 0 ? 1 : 0);
      presets.push(totalMinutes);
    }
  });
  
  // Ensure we have exactly 3 presets
  while (presets.length < 3) {
    presets.push(30); // Default value
  }
  
  // Update all presets
  if (presets.every(val => !isNaN(val) && val > 0)) {
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
        button.textContent = formatTime(totalSeconds);
        button.dataset.time = minutes;
    });
}

function setupTimerSlider() {
    const modal = document.getElementById('timerSliderModal');
    const modalBackground = document.getElementById('timerSliderBackground');
    const timerSlider = document.getElementById('timerSlider');
    const timerTime = document.getElementById('timerTime');
    const modalHeader = document.getElementById('timerSliderHeader');
    let isDragging = false;
    let offsetX, offsetY;

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

    timerSlider.addEventListener('input', function() {
        const totalSeconds = parseInt(timerSlider.value);
        timerTime.textContent = formatTime(totalSeconds);
        document.getElementById('total-time').value = formatTime(totalSeconds);
    });

    modalBackground.addEventListener('click', function() {
        modal.style.display = 'none';
        modalBackground.style.display = 'none';
    });

    document.getElementById('total-time').addEventListener('click', function(e) {
        if (!timerState.isRunning) {
            modal.style.display = 'block';
            modalBackground.style.display = 'block';
            const currentTime = this.value.split(':').map(Number);
            const totalSeconds = currentTime[0] * 3600 + currentTime[1] * 60 + currentTime[2];
            timerSlider.value = totalSeconds;
            timerTime.textContent = formatTime(totalSeconds);
            e.stopPropagation();
        }
    });
}

function updateTimePreview() {
  const presetEdits = document.querySelectorAll('.preset-edit');
  
  presetEdits.forEach(presetEdit => {
    const hourInput = presetEdit.querySelector('.hour-input');
    const minuteInput = presetEdit.querySelector('.minute-input');
    const secondInput = presetEdit.querySelector('.second-input');
    const timePreview = presetEdit.querySelector('.time-preview');
    
    if (hourInput && minuteInput && secondInput && timePreview) {
      const h = parseInt(hourInput.value) || 0;
      const m = parseInt(minuteInput.value) || 0;
      const s = parseInt(secondInput.value) || 0;
      timePreview.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  });
}