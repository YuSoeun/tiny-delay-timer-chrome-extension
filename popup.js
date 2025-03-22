document.addEventListener('DOMContentLoaded', () => {
    // 타겟 시간 불러오기
    chrome.storage.local.get(['targetMinutes'], (result) => {
        const input = document.getElementById('targetTime');
        input.value = result.targetMinutes || 30;
    });

    // delay 시간 불러오기
    chrome.storage.local.get(['delaySeconds'], (result) => {
        const delay = result.delaySeconds || 0;
        document.getElementById('delay').textContent = delay > 0 ? `+${delay}s` : '0s';
    });

    // 타겟 시간 변경 시 저장
    document.getElementById('targetTime').addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            chrome.storage.local.set({ targetMinutes: value });
        }
    });

    // 버튼 이벤트 연결
    document.getElementById('start').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startTimer' });
    });

    document.getElementById('pause').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'pauseTimer' });
    });

    document.getElementById('reset').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'resetTimer' });
    });
});
