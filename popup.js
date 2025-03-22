const input = document.getElementById('targetTime');

// 로드 시 저장된 타겟 시간 불러오기
chrome.storage.local.get(['targetMinutes'], (result) => {
  input.value = result.targetMinutes || 30;
});

// 값이 바뀌면 저장
input.addEventListener('input', (e) => {
  const value = parseInt(e.target.value, 10);
  if (!isNaN(value) && value > 0) {
    chrome.storage.local.set({ targetMinutes: value });
  }
});

document.getElementById('start').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startTimer' });
});
document.getElementById('pause').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pauseTimer' });
});
document.getElementById('reset').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetTimer' });
});