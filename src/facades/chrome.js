export class ChromeAPI {
  static async getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0]);
      });
    });
  }

  static async sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  static async getCSSVariables() {
    const tab = await this.getActiveTab();
    if (!tab) return null;
    
    try {
      return await this.sendMessage(tab.id, { action: 'getCssVariables' });
    } catch (error) {
      console.warn('Failed to get CSS variables:', error);
      return null;
    }
  }

  static setBadgeText(text) {
    chrome.action.setBadgeText({ text });
  }

  static setBadgeBackgroundColor(color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }

  static onMessage(callback) {
    chrome.runtime.onMessage.addListener(callback);
  }

  static onStartup(callback) {
    chrome.runtime.onStartup.addListener(callback);
  }

  static onInstalled(callback) {
    chrome.runtime.onInstalled.addListener(callback);
  }
} 