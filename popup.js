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

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const time = btn.dataset.time;
            document.getElementById('targetTime').value = time;
            
            // Remove active class from all preset buttons
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
        });
    });

    document.getElementById('targetTime').addEventListener('input', () => {
        // Remove active class from all preset buttons when custom value is entered
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    });

    // 저장된 프리셋 불러오기
    chrome.storage.local.get(['presets'], (result) => {
        const presets = result.presets || [30, 40, 60];
        updatePresetButtons(presets);
    });

    // 설정 버튼 클릭
    document.querySelector('.settings-btn').addEventListener('click', () => {
        chrome.storage.local.get(['presets'], (result) => {
            const presets = result.presets || [30, 40, 60];
            document.getElementById('preset1').value = presets[0];
            document.getElementById('preset2').value = presets[1];
            document.getElementById('preset3').value = presets[2];
        });
        document.getElementById('presetModal').classList.add('show');
    });

    // 모달 닫기
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('cancelPresets').addEventListener('click', closeModal);

    // 프리셋 저장
    document.getElementById('savePresets').addEventListener('click', () => {
        const presets = [
            parseInt(document.getElementById('preset1').value),
            parseInt(document.getElementById('preset2').value),
            parseInt(document.getElementById('preset3').value)
        ].filter(val => !isNaN(val) && val > 0);

        if (presets.length === 3) {
            chrome.storage.local.set({ presets }, () => {
                updatePresetButtons(presets);
                closeModal();
            });
        }
    });

    function closeModal() {
        document.getElementById('presetModal').classList.remove('show');
    }

    function updatePresetButtons(presets) {
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach((btn, index) => {
            btn.dataset.time = presets[index];
            btn.textContent = `${presets[index]}m`;
        });
    }
});
