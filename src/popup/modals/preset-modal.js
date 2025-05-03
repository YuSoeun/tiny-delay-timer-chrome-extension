export class PresetModal {
    static NUM_PRESETS = 3; // Configurable number of presets

    constructor() {
        this.modal = document.getElementById('presetModal');
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const saveBtn = document.getElementById('savePresets');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
        
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    handleKeydown(event) {
        if (!event.target.matches('.hour-input, .minute-input, .second-input')) {
            return;
        }
        
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();
        
        const input = event.target;
        const min = 0;
        const max = input.classList.contains('hour-input') ? 23 : 59;
        
        let value = parseInt(input.value, 10) || 0;
        
        if (event.key === 'ArrowUp') {
            value = value >= max ? min : value + 1;
        } else {
            value = value <= min ? max : value - 1;
        }
        
        input.value = String(value).padStart(2, '0');
        
        this.updateMainInput(input);
    }
    
    updateMainInput(changedInput) {
        const presetEdit = changedInput.closest('.preset-edit');
        if (!presetEdit) return;
        
        const hourInput = presetEdit.querySelector('.hour-input');
        const minuteInput = presetEdit.querySelector('.minute-input');
        const secondInput = presetEdit.querySelector('.second-input');
        const mainInput = presetEdit.querySelector('.main-input');
        
        if (hourInput && minuteInput && secondInput && mainInput) {
            const hours = parseInt(hourInput.value, 10) || 0;
            const minutes = parseInt(minuteInput.value, 10) || 0;
            const seconds = parseInt(secondInput.value, 10) || 0;
            
            const totalMinutes = hours * 60 + minutes + (seconds / 60);
            
            mainInput.value = totalMinutes;
        }
    }
    
    attachEventListeners() {
        this.detachEventListeners();
        this.modal.addEventListener('keydown', this.boundKeydownHandler);
    }
    
    detachEventListeners() {
        this.modal.removeEventListener('keydown', this.boundKeydownHandler);
    }

    open() {
        this.detachEventListeners();
        
        chrome.storage.local.get(['presets'], (result) => {
            const presets = result.presets || Array(PresetModal.NUM_PRESETS).fill(30);
            
            for (let i = 1; i <= PresetModal.NUM_PRESETS; i++) {
                const presetValue = presets[i-1];
                const mainInput = document.getElementById(`preset${i}`);
                if (!mainInput) continue;
                
                const presetEdit = mainInput.closest('.preset-edit');
                if (!presetEdit) continue;
                
                mainInput.value = presetValue;
                
                const hourInput = presetEdit.querySelector('.hour-input');
                const minuteInput = presetEdit.querySelector('.minute-input');
                const secondInput = presetEdit.querySelector('.second-input');
                
                if (hourInput && minuteInput && secondInput) {
                    const totalMinutes = presetValue;
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = Math.floor(totalMinutes % 60);
                    const seconds = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
                    
                    hourInput.value = String(hours).padStart(2, '0');
                    minuteInput.value = String(minutes).padStart(2, '0');
                    secondInput.value = String(seconds).padStart(2, '0');
                }
            }
            
            this.attachEventListeners();
        });
        
        this.modal.classList.add('show');
    }

    close() {
        this.detachEventListeners();
        this.modal.classList.remove('show');
    }

    save() {
        const presets = [];
        for (let i = 1; i <= PresetModal.NUM_PRESETS; i++) {
            presets.push(parseFloat(document.getElementById(`preset${i}`).value) || 30);
        }

        if (presets.every(val => !isNaN(val) && val > 0)) {
            chrome.storage.local.set({ presets }, () => {
                window.dispatchEvent(new CustomEvent('presetsUpdated', { detail: presets }));
                this.close();
            });
        } else {
            alert('Please enter valid preset values (greater than 0).');
        }
    }
}
