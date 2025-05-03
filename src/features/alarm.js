export class Alarm {
  constructor() {
    this.alarms = new Map();
  }

  async createAlarm(name, delayInMinutes) {
    try {
      await chrome.alarms.create(name, {
        delayInMinutes: delayInMinutes
      });
      this.alarms.set(name, {
        delayInMinutes,
        created: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Failed to create alarm:', error);
      return false;
    }
  }

  async clearAlarm(name) {
    try {
      await chrome.alarms.clear(name);
      this.alarms.delete(name);
      return true;
    } catch (error) {
      console.error('Failed to clear alarm:', error);
      return false;
    }
  }

  async clearAllAlarms() {
    try {
      await chrome.alarms.clearAll();
      this.alarms.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear all alarms:', error);
      return false;
    }
  }

  getAlarm(name) {
    return this.alarms.get(name);
  }

  getAllAlarms() {
    return Array.from(this.alarms.entries());
  }
} 