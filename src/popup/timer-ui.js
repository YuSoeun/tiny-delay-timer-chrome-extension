import { formatTime, formatMinutesToTime } from '../utils/format.js';

export class TimerUI {
  constructor(elements) {
    this.elements = elements;
  }

  updateTimerDisplay(remaining) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);
    
    this.elements.mainInput.value = formatTime(remaining);
    this.elements.hourInput.value = String(hours).padStart(2, '0');
    this.elements.minuteInput.value = String(minutes).padStart(2, '0');
    this.elements.secondInput.value = String(seconds).padStart(2, '0');
  }

  updateTimerState(state) {
    switch (state) {
      case 'running':
        this.elements.startButton.style.display = 'none';
        this.elements.pauseButton.style.display = 'block';
        this.elements.resetButton.style.display = 'block';
        this.elements.mainInput.disabled = true;
        break;
      case 'paused':
        this.elements.startButton.style.display = 'block';
        this.elements.pauseButton.style.display = 'none';
        this.elements.resetButton.style.display = 'block';
        this.elements.mainInput.disabled = true;
        break;
      case 'idle':
        this.elements.startButton.style.display = 'block';
        this.elements.pauseButton.style.display = 'none';
        this.elements.resetButton.style.display = 'none';
        this.elements.mainInput.disabled = false;
        break;
    }
  }

  updateTimePreview(minutes) {
    const preview = document.getElementById('time-preview');
    preview.textContent = formatMinutesToTime(minutes);
  }

  updatePresetButtons(presets) {
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
} 