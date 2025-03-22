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
      
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const delaySeconds = Math.max(elapsedSeconds - targetSeconds, 0);
        
        const badgeText = delaySeconds > 0
          ? `+${Math.floor(delaySeconds / 60)}m`
          : `${Math.ceil((targetSeconds - elapsedSeconds) / 60)}m`;
      
        const badgeColor = delaySeconds > 0 ? '#E74C3C' : '#4688F1';
      
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      
        // 타이머 지연 시간 저장
        currentDelay = delaySeconds;
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