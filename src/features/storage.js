export class Storage {
  static async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  static async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  static async getPresets() {
    return this.get('presets') || [30, 41, 60];
  }

  static async savePresets(presets) {
    return this.set('presets', presets);
  }

  static async getTargetMinutes() {
    return this.get('targetMinutes') || 30;
  }

  static async saveTargetMinutes(minutes) {
    return this.set('targetMinutes', minutes);
  }

  static async getTimerState() {
    return this.get('timerState') || {
      startTime: null,
      isRunning: false,
      pausedTime: null,
      activeTargetMinutes: 30,
      elapsedAtPause: 0
    };
  }

  static async saveTimerState(state) {
    return this.set('timerState', state);
  }
} 