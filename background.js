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
        const target = result.targetMinutes || 30;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = target * 60 - elapsed;
      
        if (remaining >= 0) {
          const min = Math.floor(remaining / 60);
          chrome.action.setBadgeText({ text: `${min}m` });
          chrome.action.setBadgeBackgroundColor({ color: "#4688F1" }); // normal
        } else {
          const overtime = Math.abs(Math.floor(remaining / 60));
          chrome.action.setBadgeText({ text: `+${overtime}m` });
          chrome.action.setBadgeBackgroundColor({ color: "#E74C3C" }); // overtime
        }
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