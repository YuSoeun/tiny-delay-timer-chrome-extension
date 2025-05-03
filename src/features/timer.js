// Timer state constants
export const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
};

export class Timer {
  constructor() {
    this.state = {
      startTime: null,
      isRunning: false,
      pausedTime: null,
      activeTargetMinutes: 30,
      intervalId: null,
      elapsedAtPause: 0
    };
  }

  start(targetMinutes) {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.state.startTime = Date.now();
    this.state.activeTargetMinutes = targetMinutes;
    
    this.state.intervalId = setInterval(() => {
      this.updateBadge();
    }, 1000);
    
    return this.state;
  }

  pause() {
    if (!this.state.isRunning) return;
    
    this.state.isRunning = false;
    this.state.pausedTime = Date.now();
    this.state.elapsedAtPause = this.getElapsedTime();
    
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
    
    return this.state;
  }

  resume() {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.state.startTime = Date.now() - this.state.elapsedAtPause;
    this.state.pausedTime = null;
    
    this.state.intervalId = setInterval(() => {
      this.updateBadge();
    }, 1000);
    
    return this.state;
  }

  reset(targetMinutes = 30) {
    this.state.isRunning = false;
    this.state.startTime = null;
    this.state.pausedTime = null;
    this.state.activeTargetMinutes = targetMinutes;
    this.state.elapsedAtPause = 0;
    
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
    
    return this.state;
  }

  getElapsedTime() {
    if (!this.state.startTime) return 0;
    
    if (this.state.isRunning) {
      return Date.now() - this.state.startTime;
    } else if (this.state.pausedTime) {
      return this.state.elapsedAtPause;
    }
    
    return 0;
  }

  getRemainingTime() {
    const elapsed = this.getElapsedTime();
    const targetMilliseconds = this.state.activeTargetMinutes * 60 * 1000;
    return Math.max(0, targetMilliseconds - elapsed);
  }

  updateBadge() {
    const remaining = this.getRemainingTime();
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    chrome.action.setBadgeText({
      text: `${minutes}:${seconds.toString().padStart(2, '0')}`
    });
  }
} 