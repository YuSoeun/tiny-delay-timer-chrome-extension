export class PresetModal {
    constructor() {
        this.modal = document.getElementById('presetModal');
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // 저장 버튼 이벤트 리스너
        const saveBtn = document.getElementById('savePresets');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
        
        // 닫기 버튼 이벤트 리스너
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    handleKeydown(event) {
        // 타겟이 시간 입력 필드가 아니면 처리하지 않음
        if (!event.target.matches('.hour-input, .minute-input, .second-input')) {
            return;
        }
        
        // 위/아래 화살표 키가 아니면 처리하지 않음
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();
        
        const input = event.target;
        const min = 0;
        const max = input.classList.contains('hour-input') ? 23 : 59;
        
        // 현재 값 가져오기
        let value = parseInt(input.value, 10) || 0;
        
        // 값 증감 (1씩만 변경)
        if (event.key === 'ArrowUp') {
            value = value >= max ? min : value + 1;
        } else {
            value = value <= min ? max : value - 1;
        }
        
        // 값 업데이트 (2자리 숫자로 패딩)
        input.value = String(value).padStart(2, '0');
        
        // 메인 입력 필드 업데이트
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
            
            // 분 단위로 계산 (시간은 60을 곱하고, 초는 60으로 나눔)
            const totalMinutes = hours * 60 + minutes + (seconds / 60);
            
            // 메인 입력 필드 업데이트
            mainInput.value = totalMinutes;
        }
    }
    
    attachEventListeners() {
        // 이미 리스너가 있다면 제거
        this.detachEventListeners();
        // 새로운 리스너 추가
        this.modal.addEventListener('keydown', this.boundKeydownHandler);
        console.log('[PresetModal] 이벤트 리스너 추가');
    }
    
    detachEventListeners() {
        this.modal.removeEventListener('keydown', this.boundKeydownHandler);
        console.log('[PresetModal] 이벤트 리스너 제거');
    }

    open() {
        // 기존 리스너 모두 제거
        this.detachEventListeners();
        
        // 프리셋 값 불러오기 및 표시
        chrome.storage.local.get(['presets'], (result) => {
            const presets = result.presets || [30, 41, 60];
            
            // 각 프리셋 별로 값 설정
            for (let i = 1; i <= 3; i++) {
                const presetValue = presets[i-1];
                const mainInput = document.getElementById(`preset${i}`);
                if (!mainInput) continue;
                
                const presetEdit = mainInput.closest('.preset-edit');
                if (!presetEdit) continue;
                
                // 메인 입력 값 설정
                mainInput.value = presetValue;
                
                // 시간 입력 필드 업데이트
                const hourInput = presetEdit.querySelector('.hour-input');
                const minuteInput = presetEdit.querySelector('.minute-input');
                const secondInput = presetEdit.querySelector('.second-input');
                
                // 분 단위 값을 시:분:초로 변환
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
            
            // 새로운 이벤트 리스너 추가
            this.attachEventListeners();
        });
        
        this.modal.classList.add('show');
    }

    close() {
        // 모달을 닫을 때 이벤트 리스너 제거
        this.detachEventListeners();
        this.modal.classList.remove('show');
    }

    save() {
        const presets = [
            parseFloat(document.getElementById('preset1').value) || 30,
            parseFloat(document.getElementById('preset2').value) || 41,
            parseFloat(document.getElementById('preset3').value) || 60
        ];

        if (presets.every(val => !isNaN(val) && val > 0)) {
            chrome.storage.local.set({ presets }, () => {
                // 저장 성공 후 이벤트 발생
                window.dispatchEvent(new CustomEvent('presetsUpdated', { detail: presets }));
                this.close();
            });
        } else {
            alert('Please enter valid preset values (greater than 0).');
        }
    }
}
