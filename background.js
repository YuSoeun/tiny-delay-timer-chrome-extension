let startTime = null;
let isRunning = false;
let pausedTime = 0;
let intervalId = null;

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  startTime = Date.now() - pausedTime;

  intervalId = setInterval(() => {
    chrome.storage.local.get(['targetMinutes'], (result) => {
      const targetMinutes = result.targetMinutes || 30;
      const targetSeconds = targetMinutes * 60;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = targetSeconds - elapsed;
  
      let badgeText = '';
      let badgeColor = '#4688F1';
  
      if (remaining >= 0) {
        if (remaining >= 60) {
          badgeText = `${Math.ceil(remaining / 60)}m`;
        } else {
          badgeText = `${remaining}s`;
        }
      } else {
        const overtime = Math.abs(remaining);
        badgeColor = '#E74C3C';
  
        if (overtime >= 60) {
          badgeText = `+${Math.floor(overtime / 60)}m`;
        } else {
          badgeText = `+${overtime}s`;
        }
      }
  
      chrome.action.setBadgeText({ text: badgeText });
      chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  
      // delay 상태 저장
      chrome.storage.local.set({ delaySeconds: Math.max(-remaining, 0) });
    });
  }, 1000);  
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(intervalId);
  pausedTime = Date.now() - startTime;
}

function resetTimer() {
  isRunning = false;
  startTime = null;
  pausedTime = 0;
  clearInterval(intervalId);
  chrome.action.setBadgeText({ text: "" });
}

// 메시지 수신 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTimer') startTimer();
  else if (message.action === 'pauseTimer') pauseTimer();
  else if (message.action === 'resetTimer') resetTimer();
});