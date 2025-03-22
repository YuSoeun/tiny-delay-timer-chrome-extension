document.getElementById('start').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startTimer' });
});

document.getElementById('pause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
});

document.getElementById('reset').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
});