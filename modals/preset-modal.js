export class PresetModal {
    constructor() {
        this.modal = document.getElementById('presetModal');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const cancelBtn = document.getElementById('cancelPresets');
        const saveBtn = document.getElementById('savePresets');
        
        // 선택적으로 이벤트 리스너 추가 (요소가 있을 경우에만)
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
        
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    open() {
        chrome.storage.local.get(['presets'], (result) => {
            const presets = result.presets || [30, 41, 60];
            document.getElementById('preset1').value = presets[0];
            document.getElementById('preset2').value = presets[1];
            document.getElementById('preset3').value = presets[2];
        });
        this.modal.classList.add('show');
    }

    close() {
        this.modal.classList.remove('show');
    }

    save() {
        const presets = [
            parseInt(document.getElementById('preset1').value, 10),
            parseInt(document.getElementById('preset2').value, 10),
            parseInt(document.getElementById('preset3').value, 10)
        ].filter(val => !isNaN(val) && val > 0);

        if (presets.length === 3) {
            chrome.storage.local.set({ presets }, () => {
                // 저장 성공 후 이벤트 발생 - popup.js에서 처리하도록
                window.dispatchEvent(new CustomEvent('presetsUpdated', { detail: presets }));
                this.close();
            });
        } else {
            alert('Please enter valid preset values (greater than 0).');
        }
    }
}
