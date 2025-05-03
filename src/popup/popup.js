import { TimerState } from '../features/timer.js';
import { Storage } from '../features/storage.js';
import { ChromeAPI } from '../facades/chrome.js';
import { formatTime, formatTimeInput, isValidTime, parseTimeToMinutes, formatMinutesToTime } from '../utils/format.js';
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
    const elements = await initializeUI();
    if (!elements) {
      throw new Error('Failed to initialize UI elements');
    }

    const presets = await Storage.getPresets();
    updatePresetButtons(presets);
    
    const targetMinutes = await Storage.getTargetMinutes();
    const hours = Math.floor(targetMinutes / 60);
    const minutes = Math.floor(targetMinutes % 60);
    const seconds = Math.round((targetMinutes - Math.floor(targetMinutes)) * 60);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    elements.hourInput.value = String(hours).padStart(2, '0');
    elements.minuteInput.value = String(minutes).padStart(2, '0');
    elements.secondInput.value = String(seconds).padStart(2, '0');
    elements.mainInput.value = formatMinutesToTime(targetMinutes);
    
    setupEventListeners(elements);
    setupTimerSlider(elements);
    startStatusUpdateInterval();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
});

async function initializeUI() {
  const elements = {
    hourInput: document.getElementById('hour-input'),
    minuteInput: document.getElementById('minute-input'),
    secondInput: document.getElementById('second-input'),
    mainInput: document.getElementById('main-input'),
    startButton: document.getElementById('start-button'),
    pauseButton: document.getElementById('pause-button'),
    resetButton: document.getElementById('reset-button'),
    timerSlider: document.getElementById('timer-slider'),
    presetButtons: document.querySelectorAll('.preset-button'),
    presetModal: new PresetModal(),
    timePickerModal: new TimePickerModal()
  };

  return elements;
}

function setupEventListeners(elements) {
  // Time input handlers
  elements.hourInput.addEventListener('input', () => formatTimeInput(elements.hourInput));
  elements.minuteInput.addEventListener('input', () => formatTimeInput(elements.minuteInput));
  elements.secondInput.addEventListener('input', () => formatTimeInput(elements.secondInput));
  
  // Main input handler
  elements.mainInput.addEventListener('change', handleTargetTimeChange);
  
  // Button handlers
  elements.startButton.addEventListener('click', handleStart);
  elements.pauseButton.addEventListener('click', handlePause);
  elements.resetButton.addEventListener('click', handleReset);
  
  // Preset handlers
  elements.presetButtons.forEach(button => {
    button.addEventListener('click', handlePresetClick);
  });
  
  // Modal handlers
  elements.presetModal.setupEventListeners();
  elements.timePickerModal.setupEventListeners();
}

async function handleStart() {
  const targetMinutes = parseTimeToMinutes(document.getElementById('main-input').value);
  await ChromeAPI.sendMessage({ action: 'startTimer', targetMinutes });
  updateTimerState(TimerState.RUNNING);
}

async function handlePause() {
  await ChromeAPI.sendMessage({ action: 'pauseTimer' });
  updateTimerState(TimerState.PAUSED);
}

async function handleReset() {
  const targetMinutes = parseTimeToMinutes(document.getElementById('main-input').value);
  await ChromeAPI.sendMessage({ action: 'resetTimer', targetMinutes });
  updateTimerState(TimerState.IDLE);
}

function updateTimerState(newState) {
  currentState = newState;
  const elements = {
    startButton: document.getElementById('start-button'),
    pauseButton: document.getElementById('pause-button'),
    resetButton: document.getElementById('reset-button'),
    mainInput: document.getElementById('main-input')
  };

  switch (newState) {
    case TimerState.RUNNING:
      elements.startButton.style.display = 'none';
      elements.pauseButton.style.display = 'block';
      elements.resetButton.style.display = 'block';
      elements.mainInput.disabled = true;
      break;
    case TimerState.PAUSED:
      elements.startButton.style.display = 'block';
      elements.pauseButton.style.display = 'none';
      elements.resetButton.style.display = 'block';
      elements.mainInput.disabled = true;
      break;
    case TimerState.IDLE:
      elements.startButton.style.display = 'block';
      elements.pauseButton.style.display = 'none';
      elements.resetButton.style.display = 'none';
      elements.mainInput.disabled = false;
      break;
  }
}

function startStatusUpdateInterval() {
  setInterval(async () => {
    const status = await ChromeAPI.sendMessage({ action: 'getTimerStatus' });
    if (status) {
      updateUIFromStatus(status.remaining, status.delay, status.totalSeconds);
    }
  }, 1000);
}

function updateUIFromStatus(remaining, delay, totalSeconds) {
  const elements = {
    mainInput: document.getElementById('main-input'),
    hourInput: document.getElementById('hour-input'),
    minuteInput: document.getElementById('minute-input'),
    secondInput: document.getElementById('second-input')
  };

  if (remaining > 0) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);
    
    elements.mainInput.value = formatTime(remaining);
    elements.hourInput.value = String(hours).padStart(2, '0');
    elements.minuteInput.value = String(minutes).padStart(2, '0');
    elements.secondInput.value = String(seconds).padStart(2, '0');
  } else {
    elements.mainInput.value = formatTime(0);
    elements.hourInput.value = '00';
    elements.minuteInput.value = '00';
    elements.secondInput.value = '00';
  }
}

function handleTargetTimeChange(e) {
  if (!isValidTime(e.target.value)) {
    e.target.value = '00:30';
  }
}

function setupTimerSlider(elements) {
  elements.timerSlider.addEventListener('input', () => {
    const minutes = parseInt(elements.timerSlider.value);
    elements.mainInput.value = formatMinutesToTime(minutes);
    updateTimePreview();
  });
}

function updateTimePreview() {
  const minutes = parseInt(document.getElementById('timer-slider').value);
  const preview = document.getElementById('time-preview');
  preview.textContent = formatMinutesToTime(minutes);
}

function handlePresetClick(e) {
  const minutes = parseInt(e.target.dataset.minutes);
  document.getElementById('main-input').value = formatMinutesToTime(minutes);
  document.getElementById('timer-slider').value = minutes;
  updateTimePreview();
}

async function updatePresetButtons(presets = [30, 41, 60]) {
  const container = document.getElementById('preset-buttons');
  container.innerHTML = '';
  
  presets.forEach(minutes => {
    const button = document.createElement('button');
    button.className = 'preset-button';
    button.dataset.minutes = minutes;
    button.textContent = formatMinutesToTime(minutes);
    container.appendChild(button);
  });
}