export class PresetModal {
    constructor() {
        this.modal = document.getElementById('presetModal');
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('cancelPresets').addEventListener('click', () => this.close());
        document.getElementById('savePresets').addEventListener('click', () => this.save());
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.close());
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
                this.updatePresetButtons(presets);
                this.close();
            });
        } else {
            alert('Please enter valid preset values (greater than 0).');
        }
    }

    updatePresetButtons(presets = [30, 41, 60]) {
        if (!Array.isArray(presets) || presets.length !== 3) {
            presets = [30, 41, 60];
        }
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach((button, index) => {
            const minutes = presets[index] || 30;
            const totalSeconds = minutes * 60;
            button.textContent = formatTime(totalSeconds);
            button.dataset.time = minutes;
        });
    }
}
