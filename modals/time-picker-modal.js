class TimePickerModal {
  constructor() {
    this.modal = document.getElementById('timePickerModal');
    this.modalBg = document.getElementById('timePickerBackground');
    this.setupTimeInputs();
    this.setupEvents();
    
    // 디버깅용 로그
    console.log('TimePickerModal initialized:', {
      modal: this.modal,
      modalBg: this.modalBg
    });
  }

  setupTimeInputs() {
    this.hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    this.minutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
    
    const hourContainer = document.getElementById('hourContainer');
    const minuteContainer = document.getElementById('minuteContainer');
    
    this.populateTimeItems(hourContainer, this.hours);
    this.populateTimeItems(minuteContainer, this.minutes);
  }

  setupEvents() {
    // Timer display click handler 수정
    const timerDisplayContainer = document.getElementById('timerDisplayContainer');
    if (timerDisplayContainer) {
      timerDisplayContainer.addEventListener('click', (e) => {
        console.log('Timer container clicked'); // 디버깅용
        const timerDisplay = document.getElementById('timerDisplay');
        const currentTime = timerDisplay.textContent;
        this.open(currentTime);
        e.stopPropagation();
      });
    } else {
      console.error('Timer display container not found');
    }

    // Add scroll event listeners
    this.hourContainer = document.getElementById('hourContainer');
    this.minuteContainer = document.getElementById('minuteContainer');
    this.hourInput = document.getElementById('hourInput');
    this.minuteInput = document.getElementById('minuteInput');

    this.hourContainer.addEventListener("scroll", () => {
      const index = Math.round(this.hourContainer.scrollTop / 40);
      this.selectedHour = this.hours[index] || "00";
      this.hourInput.value = this.selectedHour;
      this.updateActiveItem(this.hourContainer, this.selectedHour);
    });

    this.minuteContainer.addEventListener("scroll", () => {
      const index = Math.round(this.minuteContainer.scrollTop / 40);
      this.selectedMinute = this.minutes[index] || "00";
      this.minuteInput.value = this.selectedMinute;
      this.updateActiveItem(this.minuteContainer, this.selectedMinute);
    });

    // Add input change handlers
    this.hourInput.addEventListener("change", () => {
      let value = parseInt(this.hourInput.value);
      if (isNaN(value) || value < 0) value = 0;
      if (value > 23) value = 23;
      this.selectedHour = value.toString().padStart(2, "0");
      this.hourInput.value = this.selectedHour;
      const index = this.hours.indexOf(this.selectedHour);
      this.hourContainer.scrollTop = index * 40;
      this.updateActiveItem(this.hourContainer, this.selectedHour);
    });

    this.minuteInput.addEventListener("change", () => {
      let value = parseInt(this.minuteInput.value);
      if (isNaN(value) || value < 0) value = 0;
      if (value > 59) value = 59;
      this.selectedMinute = value.toString().padStart(2, "0");
      this.minuteInput.value = this.selectedMinute;
      const index = this.minutes.indexOf(this.selectedMinute);
      this.minuteContainer.scrollTop = index * 40;
      this.updateActiveItem(this.minuteContainer, this.selectedMinute);
    });

    // Add confirm button handler
    document.getElementById('confirmTime').addEventListener('click', () => {
      const timeStr = `${this.selectedHour}:${this.selectedMinute}:00`;
      document.getElementById('timerDisplay').textContent = timeStr;
      window.dispatchEvent(new CustomEvent('timeSelected', { 
        detail: this.toSeconds(this.selectedHour, this.selectedMinute, 0) 
      }));
      this.close();
    });

    // Background click handler
    if (this.modalBg) {
      this.modalBg.addEventListener('click', () => this.close());
    }
  }

  populateTimeItems(container, items) {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'time-item';
      div.textContent = item;
      container.appendChild(div);
    });
  }

  updateActiveItem(container, selectedItem) {
    Array.from(container.children).forEach(child => {
      child.classList.toggle('active', child.textContent === selectedItem);
    });
  }

  toSeconds(hour, minute, second) {
    return parseInt(hour) * 3600 + parseInt(minute) * 60 + parseInt(second);
  }

  open(currentTime = "00:00:00") {
    console.log('Opening modal with time:', currentTime); // 디버깅용
    const [hours, minutes] = currentTime.split(':');
    this.selectedHour = hours;
    this.selectedMinute = minutes;
    
    this.hourInput.value = this.selectedHour;
    this.minuteInput.value = this.selectedMinute;
    
    const hourIndex = this.hours.indexOf(this.selectedHour);
    const minuteIndex = this.minutes.indexOf(this.selectedMinute);
    
    this.hourContainer.scrollTop = hourIndex * 40;
    this.minuteContainer.scrollTop = minuteIndex * 40;
    
    this.updateActiveItem(this.hourContainer, this.selectedHour);
    this.updateActiveItem(this.minuteContainer, this.selectedMinute);
    
    this.modal.style.display = 'block';
    this.modalBg.style.display = 'block';
  }

  close() {
    this.modal.style.display = 'none';
    this.modalBg.style.display = 'none';
  }
}

export { TimePickerModal };
