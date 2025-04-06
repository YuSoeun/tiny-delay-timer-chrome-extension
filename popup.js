import { PresetModal } from './modals/preset-modal.js';
import { TimePickerModal } from './modals/time-picker-modal.js';

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
      startBtn: document.getElementById('start'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
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

    // Initialize control buttons if they exist
    if (elements.playBtn) elements.playBtn.addEventListener('click', handleStart);
    if (elements.pauseBtn) elements.pauseBtn.addEventListener('click', handlePause);
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', handleReset);

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
    
    if (elements.startBtn) {
        elements.startBtn.addEventListener('click', handleStart);
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

    const container = document.querySelector('.container');
    if (container) container.classList.remove('running');

    chrome.runtime.sendMessage({ action: 'resetTimer' });
    timerState.startTime = null;
    timerState.isRunning = false;
    timerState.pausedTime = null;
    timerState.activeTargetMinutes = timerState.targetMinutes;
    resetUI();
}

function handlePresetClick(e) {
    const time = parseInt(e.target.dataset.time, 10);
    if (!isNaN(time) && time > 0) {
        timerState.targetMinutes = time;
        const totalSeconds = time * 60;
        
        const totalTimeInput = document.getElementById('total-time');
        const timeSlider = document.getElementById('time-slider');
        
        if (totalTimeInput) totalTimeInput.value = formatTime(totalSeconds);
        if (timeSlider) timeSlider.value = totalSeconds;
        
        chrome.storage.local.set({ targetMinutes: time });
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
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
                startStatusUpdateInterval();
            } else if (timerState.pausedTime) {
                updateUIFromStatus(res.remaining, res.delay, targetSeconds);
            } else {
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

    const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
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

function openPresetModal() {
    chrome.storage.local.get(['presets'], (result) => {
        const presets = result.presets || [30, 41, 60];
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