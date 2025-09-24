import { PresetModal } from './modals/preset-modal.js';
import { TimePickerModal } from './modals/time-picker-modal.js';

// Helper function to format time inputs with leading zeros
export function formatTimeInput(input) {
  const maxVal = input.classList.contains('hour-input') ? 23 : 59;
  let val = parseInt(input.value) || 0;
  if (val < 0) val = 0;
  if (val > maxVal) val = maxVal;
  input.value = String(val).padStart(2, '0');
}

// Define the timer state constants at the top level so they're accessible everywhere
const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
};

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
    sendCssVariablesToBackground();
    
    const elements = await initializeUI();
    if (!elements) {
      throw new Error('Failed to initialize UI elements');
    }

    chrome.storage.local.get(['targetMinutes', 'presets'], (result) => {
      if (result.presets) {
        updatePresetButtons(result.presets);
      }
      
      if (result.targetMinutes) {
        const targetMinutes = result.targetMinutes;
        const hours = Math.floor(targetMinutes / 60);
        const minutes = Math.floor(targetMinutes % 60);
        const seconds = Math.round((targetMinutes - Math.floor(targetMinutes)) * 60);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        timerState.targetMinutes = targetMinutes;
        timerState.activeTargetMinutes = targetMinutes;
        
        const totalTimeInput = document.getElementById('total-time');
        const timerDisplay = document.getElementById('timerDisplay');
        
        if (totalTimeInput) {
          totalTimeInput.value = formatTime(totalSeconds);
        }
        
        if (timerDisplay) {
          timerDisplay.textContent = formatTime(totalSeconds);
        }
      }
    });

    await setupEventListeners(elements);
    await initializeTimerState();

    document.body.classList.add('state-idle');

    // Check if popup was opened due to timer completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('completed') === 'true') {
      showCompletionNotificationModal();
    }

    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        setTimeout(() => {
          updateTimePreview();
          setupPresetInputs();
          setupNotificationSettings();
        }, 100);
      });
    }
    
    window.addEventListener('presetsUpdated', (event) => {
      if (event.detail && Array.isArray(event.detail)) {
        updatePresetButtons(event.detail);
      }
    });
    
  } catch (err) {
    console.error('Error initializing popup:', err);
  }
});

function sendCssVariablesToBackground() {
  try {
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
    const dangerColor = computedStyle.getPropertyValue('--danger-color').trim();
    
    chrome.runtime.sendMessage({
      action: 'updateCssVariables',
      primaryColor: primaryColor,
      dangerColor: dangerColor
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Could not update CSS variables in background script, might not be ready yet');
        return;
      }
      
      console.log('Sent CSS variables to background');
    });
  } catch (error) {
    console.error('Error sending CSS variables:', error);
  }
}

async function initializeUI() {
  try {
    const timePickerModal = new TimePickerModal();
    window.timePickerModal = timePickerModal;

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

    if (elements.timerDisplay) {
      elements.timerDisplay.addEventListener('click', () => {
        try {
          timePickerModal.open(elements.timerDisplay.textContent);
        } catch (err) {
          console.error('Error opening time picker:', err);
        }
      });
    }

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

    if (!elements.totalTimeInput) {
        console.error('Critical element #total-time not found');
        return;
    }

    if (elements.targetTime) {
        elements.targetTime.addEventListener('input', handleTargetTimeChange);
    }
    
    if (elements.playBtn) {
        elements.playBtn.addEventListener('click', handleStart);
    }
    
    if (elements.pauseBtn) {
        elements.pauseBtn.addEventListener('click', handlePause);
    }
    
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', handleReset);
    }

    const presetButtons = document.querySelectorAll('.preset-btn');
    if (presetButtons.length > 0) {
        presetButtons.forEach(button => {
            button.addEventListener('click', handlePresetClick);
        });
    }

    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openPresetModal);
    }

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
        } else if (message.action === 'getCssVariables') {
            try {
                const computedStyle = getComputedStyle(document.documentElement);
                const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
                const dangerColor = computedStyle.getPropertyValue('--danger-color').trim();
                
                sendResponse({ primaryColor, dangerColor });
            } catch (error) {
                console.error('Error getting CSS variables:', error);
                sendResponse({});
            }
            return true;
        }
    });
}

function updateTimerState(newState) {
  document.body.classList.remove('state-idle', 'state-running', 'state-paused');
  
  document.body.classList.add(`state-${newState}`);
  
  const idleState = document.getElementById('idle-state');
  const runningState = document.getElementById('running-state');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  [playBtn, pauseBtn, resetBtn].forEach(btn => btn.classList.remove('enabled'));
  
  switch(newState) {
    case TimerState.IDLE:
      idleState.classList.add('active');
      runningState.classList.remove('active');
      
      playBtn.classList.add('enabled');
      break;
      
    case TimerState.RUNNING:
      idleState.classList.remove('active');
      runningState.classList.add('active');
      
      pauseBtn.classList.add('enabled');
      resetBtn.classList.add('enabled');
      break;
      
    case TimerState.PAUSED:
      idleState.classList.remove('active');
      runningState.classList.add('active');
      
      playBtn.classList.add('enabled');
      resetBtn.classList.add('enabled');
      break;
  }
  
  currentState = newState;
}

function handleStart() {
    const timeValue = document.getElementById('total-time').value;
    
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    if (timerState.pausedTime !== null) {
        console.log('Resuming from paused state');
        
        timerState.elapsedAtPause = timerState.elapsedAtPause || 0;
        timerState.startTime = Date.now() - timerState.elapsedAtPause;
        timerState.pausedTime = null;
        timerState.isRunning = true;

        updateTimerState(TimerState.RUNNING);
        
        // Send resume request to background script
        chrome.runtime.sendMessage({
            action: 'resumeTimer',
            elapsedAtPause: timerState.elapsedAtPause
        }, function(response) {
            if (!response || !response.success) {
                console.error('Failed to resume timer in background, retrying');
                // Retry if initial attempt fails
                setTimeout(function() {
                    verifyTimerWithBackground();
                }, 500);
            } else {
                console.log('Timer resumed successfully');
            }
        });
        
        // Restart UI update interval
        clearInterval(timerState.elapsedInterval);
        startStatusUpdateInterval();
        
        // Verify badge update is working after a delay
        setTimeout(verifyTimerWithBackground, 3000);
        return;
    }

    const [hours, minutes, seconds] = timeValue.split(':').map(Number);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    const targetMinutesExact = totalSeconds / 60;
    
    timerState.targetMinutes = targetMinutesExact;
    timerState.activeTargetMinutes = targetMinutesExact;
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    timerState.pausedTime = null;
    timerState.elapsedAtPause = 0;

    // Save both target time values to prevent reset to default
    chrome.storage.local.set({ 
        targetMinutes: targetMinutesExact,
        activeTargetMinutes: targetMinutesExact
    });

    const container = document.querySelector('.container');
    if (container) container.classList.add('running');

    const elapsedElement = document.getElementById('elapsed');
    if (elapsedElement) elapsedElement.textContent = formatTime(totalSeconds);

    const targetTimeElement = document.getElementById('target-time');
    if (targetTimeElement) targetTimeElement.textContent = formatTime(totalSeconds);

    chrome.runtime.sendMessage({
        action: 'startTimer',
        targetMinutes: targetMinutesExact,
        totalSeconds: totalSeconds
    }, function(response) {
        if (!response || !response.success) {
            console.error('Failed to start timer in background, retrying');
            // Retry if initial attempt fails
            setTimeout(function() {
                verifyTimerWithBackground();
            }, 500);
        }
    });

    updateTimerState(TimerState.RUNNING);
    startStatusUpdateInterval();
}

function handlePause() {
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    if (!timerState.isRunning) {
        console.log('Timer is not running, cannot pause');
        return;
    }
    
    const elapsedMs = Date.now() - timerState.startTime;
    timerState.elapsedAtPause = elapsedMs;
    
    timerState.isRunning = false;
    timerState.pausedTime = Date.now();
    
    chrome.runtime.sendMessage({ 
        action: 'pauseTimer',
        elapsedAtPause: elapsedMs
    });
    
    // Save complete timer state to ensure it's properly restored later
    chrome.storage.local.set({
        timerStatus: 'paused',
        pausedTime: timerState.pausedTime,
        startTime: timerState.startTime,
        elapsedAtPause: elapsedMs,
        activeTargetMinutes: timerState.activeTargetMinutes,
        // Save targetMinutes too as a backup
        targetMinutes: timerState.activeTargetMinutes
    });
    
    const targetSeconds = timerState.activeTargetMinutes * 60;
    const elapsed = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(targetSeconds - elapsed, 0);
    const delay = Math.max(elapsed - targetSeconds, 0);
    updateUIFromStatus(remaining, delay, targetSeconds);
    
    updateTimerState(TimerState.PAUSED);
    clearInterval(timerState.elapsedInterval);
}

function handleReset() {
    const timeValue = document.getElementById('total-time').value;
    if (!isValidTime(timeValue)) {
        alert('Invalid time format. Please use HH:MM:SS format.');
        return;
    }

    const [hours, minutes, seconds] = timeValue.split(':').map(Number);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    const targetMinutesExact = totalSeconds / 60;

    timerState.startTime = null;
    timerState.isRunning = false;
    timerState.pausedTime = null;
    timerState.targetMinutes = targetMinutesExact;
    timerState.activeTargetMinutes = targetMinutesExact;

    chrome.runtime.sendMessage({ 
        action: 'resetTimer',
        targetMinutes: targetMinutesExact
    }, (response) => {
        console.log('Timer reset successfully');
    });
    
    chrome.storage.local.set({ targetMinutes: targetMinutesExact });
    
    clearInterval(timerState.elapsedInterval);
    
    const container = document.querySelector('.container');
    if (container) container.classList.remove('running');
    
    resetUI();
    updateTimerState(TimerState.IDLE);
}

function handlePresetClick(e) {
    const timeValue = parseFloat(e.target.dataset.time || 30);
    if (!isNaN(timeValue) && timeValue > 0) {
        const minutes = Math.floor(timeValue);
        const seconds = Math.round((timeValue - minutes) * 60);
        const totalSeconds = (minutes * 60) + seconds;
        
        timerState.targetMinutes = timeValue;

        const totalTimeInput = document.getElementById('total-time');
        const timeSlider = document.getElementById('time-slider');
        const timerDisplay = document.getElementById('timerDisplay');

        if (totalTimeInput) {
            totalTimeInput.value = formatTime(totalSeconds);
        }
        if (timeSlider) {
            timeSlider.value = totalSeconds;
        }
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(totalSeconds);
        }

        chrome.storage.local.set({ targetMinutes: timeValue });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

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
    const timerDisplay = document.getElementById('timerDisplay');
    
    if (elapsedProgress) elapsedProgress.style.width = '0%';
    if (delayProgress) delayProgress.style.width = '0%';
    
    if (totalTime) {
        totalTime.value = formatTime(totalSeconds);
    }
    
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(totalSeconds);
    }
}

function initializeTimerState() {
    chrome.storage.local.get(['targetMinutes', 'timerStatus', 'pausedTime', 'startTime', 'elapsedAtPause', 'activeTargetMinutes'], (storedData) => {
        if (storedData.targetMinutes) {
            timerState.targetMinutes = storedData.targetMinutes;
            timerState.activeTargetMinutes = storedData.targetMinutes;
            
            const totalSeconds = timerState.activeTargetMinutes * 60;
            const totalTimeInput = document.getElementById('total-time');
            const timerDisplay = document.getElementById('timerDisplay');
            
            if (totalTimeInput) {
                totalTimeInput.value = formatTime(totalSeconds);
            }
            
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(totalSeconds);
            }
        }
        
        if (storedData.timerStatus === 'paused' && storedData.pausedTime) {
            timerState.isRunning = false;
            timerState.startTime = storedData.startTime;
            timerState.pausedTime = storedData.pausedTime;
            timerState.elapsedAtPause = storedData.elapsedAtPause;
            timerState.activeTargetMinutes = storedData.activeTargetMinutes || storedData.targetMinutes;

            const targetSeconds = timerState.activeTargetMinutes * 60;
            
            let elapsed = 0;
            if (timerState.elapsedAtPause) {
                elapsed = Math.floor(timerState.elapsedAtPause / 1000);
            } else if (timerState.startTime) {
                elapsed = Math.floor((timerState.pausedTime - timerState.startTime) / 1000);
            }
            
            const remaining = Math.max(targetSeconds - elapsed, 0);
            const delay = Math.max(elapsed - targetSeconds, 0);

            const container = document.querySelector('.container');
            if (container) container.classList.add('running');

            updateTimerState(TimerState.PAUSED);
            updateUIFromStatus(remaining, delay, targetSeconds);
            
            return;
        }
        
        chrome.runtime.sendMessage({ 
            action: 'getStatus',
            savedTargetMinutes: storedData.targetMinutes
        }, (res) => {
            if (res) {
                timerState.startTime = res.startTime;
                timerState.isRunning = res.isRunning;
                timerState.pausedTime = res.pausedTime;
                
                if (res.elapsedAtPause) {
                    timerState.elapsedAtPause = res.elapsedAtPause;
                }
                
                if (!res.isRunning && !res.pausedTime) {
                    timerState.activeTargetMinutes = storedData.targetMinutes || res.activeTargetMinutes;
                } else {
                    timerState.activeTargetMinutes = res.activeTargetMinutes;
                }

                const targetSeconds = timerState.activeTargetMinutes * 60;
                const container = document.querySelector('.container');

                if (container) {
                    if (timerState.isRunning || timerState.pausedTime) {
                        container.classList.add('running');
                    } else {
                        container.classList.remove('running');
                    }
                }

                const targetTimeElement = document.getElementById('target-time');
                if (targetTimeElement) {
                    targetTimeElement.textContent = formatTime(targetSeconds);
                }

                if (timerState.isRunning) {
                    updateTimerState(TimerState.RUNNING);
                    startStatusUpdateInterval();
                } else if (res.pausedTime) {
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
    });
}

function startStatusUpdateInterval() {
    clearInterval(timerState.elapsedInterval);

    timerState.elapsedInterval = setInterval(() => {
        if (!timerState.isRunning) return;

        const now = Date.now();
        const elapsedMs = now - timerState.startTime;
        const elapsed = Math.floor(elapsedMs / 1000);
        
        const totalSeconds = timerState.activeTargetMinutes * 60;
        const remaining = Math.max(totalSeconds - elapsed, 0);
        const delay = Math.max(elapsed - totalSeconds, 0);

        updateUIFromStatus(remaining, delay, totalSeconds);
    }, 1000);
    
    if (timerState.isRunning) {
        const now = Date.now();
        const elapsedMs = now - timerState.startTime;
        const elapsed = Math.floor(elapsedMs / 1000);
        const totalSeconds = timerState.activeTargetMinutes * 60;
        const remaining = Math.max(totalSeconds - elapsed, 0);
        const delay = Math.max(elapsed - totalSeconds, 0);
        
        updateUIFromStatus(remaining, delay, totalSeconds);
    }
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
      if (remaining === 0 && delay > 0) {
        elements.elapsed.textContent = `+${formatTime(delay)}`;
        elements.elapsed.style.color = 'var(--danger-color)';
      } else {
        elements.elapsed.textContent = formatTime(remaining);
        elements.elapsed.style.color = 'var(--text-primary)';
      }
    }
    
    if (elements.delay) {
      elements.delay.textContent = delay > 0 ? `+${formatTime(delay)}` : '';
    }
    
    if (elements.totalElapsed) {
      const total = (totalSeconds - remaining) + delay;
      elements.totalElapsed.textContent = formatTime(total);
    }

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
    seconds = Math.ceil(seconds); // Use Math.ceil instead of Math.floor to avoid showing one second less
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
    
    formatTimeInput(hourInput);
    formatTimeInput(minuteInput);
    formatTimeInput(secondInput);
    
    [hourInput, minuteInput, secondInput].forEach(input => {
      input.addEventListener('input', () => {
        const maxVal = input === hourInput ? 23 : 59;
        let val = parseInt(input.value) || 0;
        
        if (val > maxVal) {
          val = maxVal;
          input.value = val;
        }
        
        formatTimeInput(input);
        updateMainInputFromTimeInputs(wrapper);
      });
      
      input.addEventListener('blur', () => {
        formatTimeInput(input);
      });
      
      input.addEventListener('focus', () => {
        input.select();
      });
    });
  });
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
  
  formatTimeInput(hourInput);
  formatTimeInput(minuteInput);
  formatTimeInput(secondInput);
  
  const totalSeconds = h * 3600 + m * 60 + s;
  mainInput.value = totalSeconds / 60;
}

function openPresetModal() {
  chrome.storage.local.get(['presets'], (result) => {
    const presets = result.presets || [30, 41, 60];
    
    document.querySelectorAll('.preset-edit').forEach((preset, index) => {
      const timeValue = presets[index] || 30;
      
      const hours = Math.floor(timeValue / 60);
      const minutes = Math.floor(timeValue % 60);
      const seconds = Math.round((timeValue - Math.floor(timeValue)) * 60);
      
      const hourInput = preset.querySelector('.hour-input');
      const minuteInput = preset.querySelector('.minute-input');
      const secondInput = preset.querySelector('.second-input');
      const mainInput = preset.querySelector('.main-input');
      
      if (hourInput) hourInput.value = String(hours).padStart(2, '0');
      if (minuteInput) minuteInput.value = String(minutes).padStart(2, '0');
      if (secondInput) secondInput.value = String(seconds).padStart(2, '0');
      if (mainInput) mainInput.value = timeValue;
    });
    
    setupPresetInputs();
  });
  
  const modal = document.getElementById('presetModal');
  if (modal) {
    modal.classList.add('show');
    setTimeout(() => {
      const firstHourInput = modal.querySelector('.hour-input');
      if (firstHourInput) firstHourInput.focus();
    }, 300);
  }
}

function closePresetModal() {
    document.getElementById('presetModal').classList.remove('show');
}

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
      
      const totalSeconds = h * 3600 + m * 60 + s;
      presets.push(totalSeconds / 60);
    }
  });
  
  while (presets.length < 3) {
    presets.push(30);
  }
  
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
        const timeValue = presets[index] || 30;
        const minutes = Math.floor(timeValue);
        const seconds = Math.round((timeValue - minutes) * 60);
        const totalSeconds = (minutes * 60) + seconds;
        
        button.textContent = formatTime(totalSeconds);
        button.dataset.time = timeValue;
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

function verifyTimerWithBackground() {
    chrome.runtime.sendMessage({ 
        action: 'checkBadgeStatus'
    }, (response) => {
        if (response) {
            console.log('Badge status check:', response);
            
            if (response.isRunning && !response.hasInterval) {
                console.log('Timer is running but badge update interval is missing, attempting recovery');
                
                if (timerState.elapsedAtPause) {
                    chrome.runtime.sendMessage({
                        action: 'resumeTimer',
                        elapsedAtPause: timerState.elapsedAtPause
                    });
                }
            }
        }
    });
}

// Timer Completion Notification Functions
function showCompletionNotificationModal() {
    const background = document.getElementById('completionNotificationBackground');
    const modal = document.getElementById('completionNotificationModal');

    if (background && modal) {
        background.classList.add('show');
        modal.classList.add('show');

        // Setup event listeners for buttons
        setupCompletionModalEventListeners();

        // Auto-dismiss after 15 seconds if not interacted with (non-intrusive)
        setTimeout(() => {
            if (modal.classList.contains('show')) {
                hideCompletionNotificationModal();
            }
        }, 15000);

        // Play sound effect (if available)
        playCompletionSound();

        // Add shake effect to grab attention
        addShakeEffect();

        // Flash the page title
        flashPageTitle();
    }
}

function hideCompletionNotificationModal() {
    const background = document.getElementById('completionNotificationBackground');
    const modal = document.getElementById('completionNotificationModal');

    if (background && modal) {
        background.classList.remove('show');
        modal.classList.remove('show');
    }
}

function setupCompletionModalEventListeners() {
    const dismissBtn = document.getElementById('dismissNotification');
    const resetBtn = document.getElementById('resetTimerFromNotification');

    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            hideCompletionNotificationModal();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            hideCompletionNotificationModal();
            // Reset and start timer again with the same target time
            const targetMinutes = timerState.targetMinutes || timerState.activeTargetMinutes;
            if (targetMinutes) {
                try {
                    await chrome.runtime.sendMessage({
                        action: 'resetTimer',
                        targetMinutes: targetMinutes
                    });

                    // Start the timer immediately
                    await chrome.runtime.sendMessage({
                        action: 'startTimer',
                        targetMinutes: targetMinutes
                    });

                    // Update UI state
                    updateTimerState(TimerState.RUNNING);
                } catch (error) {
                    console.error('Failed to restart timer:', error);
                }
            }
        });
    }

    // Close modal when clicking background
    const background = document.getElementById('completionNotificationBackground');
    if (background) {
        background.addEventListener('click', (e) => {
            if (e.target === background) {
                hideCompletionNotificationModal();
            }
        });
    }

    // Close modal with ESC key for better accessibility
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            hideCompletionNotificationModal();
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    document.addEventListener('keydown', handleKeyPress);
}

function playCompletionSound() {
    // Use Web Audio API to create a simple completion sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a pleasant notification sound (two-tone chime)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

    } catch (error) {
        console.log('Audio playback not available:', error);
    }
}

// Notification Settings Functions
async function setupNotificationSettings() {
    const notificationToggle = document.getElementById('notificationToggle');

    if (!notificationToggle) {
        console.error('Notification toggle element not found');
        return;
    }

    // Load current notification setting
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getNotificationStatus'
        });

        if (response && typeof response.enabled === 'boolean') {
            notificationToggle.checked = response.enabled;
        } else {
            notificationToggle.checked = true; // Default to enabled
        }
    } catch (error) {
        console.error('Failed to load notification settings:', error);
        notificationToggle.checked = true; // Default to enabled
    }

    // Setup toggle event listener
    notificationToggle.addEventListener('change', async () => {
        const isEnabled = notificationToggle.checked;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'setNotificationEnabled',
                enabled: isEnabled
            });

            if (response && response.success) {
                console.log('Notification setting updated:', isEnabled);

                // Show brief feedback
                showNotificationSettingFeedback(isEnabled);
            } else {
                console.error('Failed to save notification setting');
                // Revert toggle state
                notificationToggle.checked = !isEnabled;
            }
        } catch (error) {
            console.error('Error updating notification setting:', error);
            // Revert toggle state
            notificationToggle.checked = !isEnabled;
        }
    });
}

function showNotificationSettingFeedback(isEnabled) {
    const settingDescription = document.querySelector('.notification-setting .setting-description');

    if (settingDescription) {
        const originalText = settingDescription.textContent;
        const feedbackText = isEnabled ?
            '✅ 알림이 활성화되었습니다.' :
            '🔕 알림이 비활성화되었습니다.';

        settingDescription.textContent = feedbackText;
        settingDescription.style.color = isEnabled ? 'var(--success-color)' : 'var(--text-secondary)';

        setTimeout(() => {
            settingDescription.textContent = originalText;
            settingDescription.style.color = 'var(--text-secondary)';
        }, 2000);
    }
}

// Additional visual attention effects
function addShakeEffect() {
    const modal = document.getElementById('completionNotificationModal');
    if (modal) {
        modal.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), shake 0.5s ease-in-out 0.6s';
    }
}

let originalTitle = '';
let titleFlashInterval = null;

function flashPageTitle() {
    if (titleFlashInterval) return; // Already flashing

    originalTitle = document.title;
    let flashCount = 0;
    const maxFlashes = 6;

    titleFlashInterval = setInterval(() => {
        if (flashCount >= maxFlashes) {
            document.title = originalTitle;
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
            return;
        }

        document.title = flashCount % 2 === 0 ?
            '⏰ 타이머 완료!' :
            '🔔 Time\'s Up!';

        flashCount++;
    }, 800);
}

function createVisualPulse() {
    // Create a full-screen pulse overlay for extra attention
    const pulseOverlay = document.createElement('div');
    pulseOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, transparent 40%, rgba(255, 215, 0, 0.1) 70%);
        pointer-events: none;
        z-index: 999;
        animation: pulseFade 1.5s ease-out;
    `;

    document.body.appendChild(pulseOverlay);

    // Remove after animation
    setTimeout(() => {
        if (pulseOverlay.parentNode) {
            pulseOverlay.parentNode.removeChild(pulseOverlay);
        }
    }, 1500);

    // Add CSS for pulse animation if not exists
    if (!document.getElementById('pulseStyles')) {
        const style = document.createElement('style');
        style.id = 'pulseStyles';
        style.textContent = `
            @keyframes pulseFade {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: scale(1.5);
                }
            }
        `;
        document.head.appendChild(style);
    }
}