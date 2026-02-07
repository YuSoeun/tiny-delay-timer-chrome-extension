export class TimePickerModal {
  constructor() {
    this.MIN_MODAL_HEIGHT = 260; // Configurable minimum modal height
    this.previousTime = "00:30:00"; // Remember previous time
    this.initialize();
  }

  initialize() {
    try {
      this.modal = document.getElementById('timePickerModal');
      this.modalBg = document.getElementById('timePickerBackground');
      
      if (!this.modal || !this.modalBg) {
        throw new Error('Required modal elements not found');
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.setupTimeInputs();
          this.setupEvents();
        });
      } else {
        this.setupTimeInputs();
        this.setupEvents();
      }
    } catch (err) {
      console.error('Error initializing TimePickerModal:', err);
    }
  }

  setupTimeInputs() {
    try {
      this.hours = Array(2).fill('').concat(
        Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'))
      ).concat(Array(2).fill(''));
      
      this.minutes = Array(2).fill('').concat(
        Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'))
      ).concat(Array(2).fill(''));
      
      this.seconds = Array(2).fill('').concat(
        Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'))
      ).concat(Array(2).fill(''));
      
      const hourContainer = document.getElementById('hourContainer');
      const minuteContainer = document.getElementById('minuteContainer');
      const secondContainer = document.getElementById('secondContainer');
      
      if (!hourContainer || !minuteContainer) {
        console.warn('Time picker containers missing. UI may not function correctly.');
      }
      
      if (hourContainer) {
        this.populateTimeItems(hourContainer, this.hours);
      }
      
      if (minuteContainer) {
        this.populateTimeItems(minuteContainer, this.minutes);
      }
      
      if (secondContainer) {
        this.populateTimeItems(secondContainer, this.seconds);
      }
    } catch (err) {
      console.error('Error setting up time inputs:', err);
    }
  }

  setupEvents() {
    this.hourContainer = document.getElementById('hourContainer');
    this.minuteContainer = document.getElementById('minuteContainer');
    this.secondContainer = document.getElementById('secondContainer');
    this.hourInput = document.getElementById('hourInput');
    this.minuteInput = document.getElementById('minuteInput');
    this.secondInput = document.getElementById('secondInput');

    this.itemHeight = 30;

    this.hourContainer.addEventListener("scroll", this.debounce(() => {
      this.checkScrollBounds(this.hourContainer);
      
      const selectedIndex = this.findCenterItemIndex(this.hourContainer);
      this.selectedHour = this.hours[selectedIndex]?.trim() || "00";
      
      if (this.hourInput && this.selectedHour) this.hourInput.value = this.selectedHour;
      this.updateActiveItem(this.hourContainer, this.selectedHour);
    }, 50));

    this.minuteContainer.addEventListener("scroll", this.debounce(() => {
      this.checkScrollBounds(this.minuteContainer);
      
      const selectedIndex = this.findCenterItemIndex(this.minuteContainer);
      this.selectedMinute = this.minutes[selectedIndex]?.trim() || "00";
      
      if (this.minuteInput && this.selectedMinute) this.minuteInput.value = this.selectedMinute;
      this.updateActiveItem(this.minuteContainer, this.selectedMinute);
    }, 50));

    if (this.secondContainer && this.secondInput) {
      this.secondContainer.addEventListener("scroll", this.debounce(() => {
        this.checkScrollBounds(this.secondContainer);
        
        const selectedIndex = this.findCenterItemIndex(this.secondContainer);
        this.selectedSecond = this.seconds[selectedIndex]?.trim() || "00";
        
        if (this.secondInput) this.secondInput.value = this.selectedSecond;
        this.updateActiveItem(this.secondContainer, this.selectedSecond);
      }, 50));
    }

    if (this.hourInput) {
      this.hourInput.addEventListener("change", () => {
        let value = parseInt(this.hourInput.value);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 23) value = 23;
        this.selectedHour = value.toString().padStart(2, "0");
        this.hourInput.value = this.selectedHour;
        const index = this.hours.indexOf(this.selectedHour);
        if (index > -1) {
          this.smoothScroll(this.hourContainer, index * this.itemHeight);
          this.updateActiveItem(this.hourContainer, this.selectedHour);
        }
      });

      this.hourInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          let value = parseInt(this.hourInput.value);
          if (isNaN(value)) value = 0;
          value = (value + 1) % 24;
          this.selectedHour = value.toString().padStart(2, "0");
          this.hourInput.value = this.selectedHour;
          const index = this.hours.indexOf(this.selectedHour);
          if (index > -1) {
            this.smoothScroll(this.hourContainer, index * this.itemHeight);
            this.updateActiveItem(this.hourContainer, this.selectedHour);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          let value = parseInt(this.hourInput.value);
          if (isNaN(value)) value = 0;
          value = (value - 1 + 24) % 24;
          this.selectedHour = value.toString().padStart(2, "0");
          this.hourInput.value = this.selectedHour;
          const index = this.hours.indexOf(this.selectedHour);
          if (index > -1) {
            this.smoothScroll(this.hourContainer, index * this.itemHeight);
            this.updateActiveItem(this.hourContainer, this.selectedHour);
          }
        }
      });
    }

    if (this.minuteInput) {
      this.minuteInput.addEventListener("change", () => {
        let value = parseInt(this.minuteInput.value);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 59) value = 59;
        this.selectedMinute = value.toString().padStart(2, "0");
        this.minuteInput.value = this.selectedMinute;
        const index = this.minutes.indexOf(this.selectedMinute);
        if (index > -1) {
          this.smoothScroll(this.minuteContainer, index * this.itemHeight);
          this.updateActiveItem(this.minuteContainer, this.selectedMinute);
        }
      });

      this.minuteInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          let value = parseInt(this.minuteInput.value);
          if (isNaN(value)) value = 0;
          value = (value + 1) % 60;
          this.selectedMinute = value.toString().padStart(2, "0");
          this.minuteInput.value = this.selectedMinute;
          const index = this.minutes.indexOf(this.selectedMinute);
          if (index > -1) {
            this.smoothScroll(this.minuteContainer, index * this.itemHeight);
            this.updateActiveItem(this.minuteContainer, this.selectedMinute);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          let value = parseInt(this.minuteInput.value);
          if (isNaN(value)) value = 0;
          value = (value - 1 + 60) % 60;
          this.selectedMinute = value.toString().padStart(2, "0");
          this.minuteInput.value = this.selectedMinute;
          const index = this.minutes.indexOf(this.selectedMinute);
          if (index > -1) {
            this.smoothScroll(this.minuteContainer, index * this.itemHeight);
            this.updateActiveItem(this.minuteContainer, this.selectedMinute);
          }
        }
      });
    }

    if (this.secondInput) {
      this.secondInput.addEventListener("change", () => {
        let value = parseInt(this.secondInput.value);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 59) value = 59;
        this.selectedSecond = value.toString().padStart(2, "0");
        this.secondInput.value = this.selectedSecond;
        const index = this.seconds.indexOf(this.selectedSecond);
        if (index > -1 && this.secondContainer) {
          this.smoothScroll(this.secondContainer, index * this.itemHeight);
          this.updateActiveItem(this.secondContainer, this.selectedSecond);
        }
      });

      this.secondInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          let value = parseInt(this.secondInput.value);
          if (isNaN(value)) value = 0;
          value = (value + 1) % 60;
          this.selectedSecond = value.toString().padStart(2, "0");
          this.secondInput.value = this.selectedSecond;
          const index = this.seconds.indexOf(this.selectedSecond);
          if (index > -1 && this.secondContainer) {
            this.smoothScroll(this.secondContainer, index * this.itemHeight);
            this.updateActiveItem(this.secondContainer, this.selectedSecond);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          let value = parseInt(this.secondInput.value);
          if (isNaN(value)) value = 0;
          value = (value - 1 + 60) % 60;
          this.selectedSecond = value.toString().padStart(2, "0");
          this.secondInput.value = this.selectedSecond;
          const index = this.seconds.indexOf(this.selectedSecond);
          if (index > -1 && this.secondContainer) {
            this.smoothScroll(this.secondContainer, index * this.itemHeight);
            this.updateActiveItem(this.secondContainer, this.selectedSecond);
          }
        }
      });
    }

    document.getElementById('confirmTime').addEventListener('click', () => {
      let timeStr;
      if (this.secondInput) {
        timeStr = `${this.selectedHour || '00'}:${this.selectedMinute || '00'}:${this.selectedSecond || '00'}`;
      } else {
        timeStr = `${this.selectedHour || '00'}:${this.selectedMinute || '00'}:00`;
      }
      
      const timerDisplay = document.getElementById('timerDisplay');
      const totalTimeInput = document.getElementById('total-time');
      
      if (timerDisplay) timerDisplay.textContent = timeStr;
      if (totalTimeInput) totalTimeInput.value = timeStr;
      
      window.dispatchEvent(new CustomEvent('timeSelected', { 
        detail: this.toSeconds(
          this.selectedHour || '00', 
          this.selectedMinute || '00', 
          this.selectedSecond || '00'
        ) 
      }));
      
      chrome.runtime.sendMessage({
        action: 'timeSelected',
        time: timeStr
      });

      // Remember the selected time for next use
      this.previousTime = timeStr;

      this.close();
    });

    if (this.modalBg) {
      this.modalBg.addEventListener('click', () => this.close());
    }

    window.addEventListener('resize', () => {
      if (this.modal && this.modal.style.display === 'block') {
        this.checkViewportFit();
      }
    });

    this.setupDragForContainer(this.hourContainer, (delta) => {
      const newScrollTop = this.hourContainer.scrollTop + delta;
      this.hourContainer.scrollTop = newScrollTop;
      
      this.updateSelectedTimeFromScroll(this.hourContainer, this.hours, (value) => {
        this.selectedHour = value;
        if (this.hourInput) this.hourInput.value = value;
        this.updateActiveItem(this.hourContainer, value);
      });
    });
    
    this.setupDragForContainer(this.minuteContainer, (delta) => {
      const newScrollTop = this.minuteContainer.scrollTop + delta;
      this.minuteContainer.scrollTop = newScrollTop;
      
      this.updateSelectedTimeFromScroll(this.minuteContainer, this.minutes, (value) => {
        this.selectedMinute = value;
        if (this.minuteInput) this.minuteInput.value = value;
        this.updateActiveItem(this.minuteContainer, value);
      });
    });
    
    if (this.secondContainer) {
      this.setupDragForContainer(this.secondContainer, (delta) => {
        const newScrollTop = this.secondContainer.scrollTop + delta;
        this.secondContainer.scrollTop = newScrollTop;
        
        this.updateSelectedTimeFromScroll(this.secondContainer, this.seconds, (value) => {
          this.selectedSecond = value;
          if (this.secondInput) this.secondInput.value = value;
          this.updateActiveItem(this.secondContainer, value);
        });
      });
    }

    this.setupClickableScrollAreas(this.hourContainer, (direction) => {
      let value = parseInt(this.hourInput.value);
      if (isNaN(value)) value = 0;
      
      if (direction === 'up') {
        value = (value - 1 + 24) % 24;
      } else if (direction === 'down') {
        value = (value + 1) % 24;
      }
      
      this.selectedHour = value.toString().padStart(2, "0");
      this.hourInput.value = this.selectedHour;
      const index = this.hours.indexOf(this.selectedHour);
      if (index > -1) {
        this.smoothScroll(this.hourContainer, index * this.itemHeight);
        this.updateActiveItem(this.hourContainer, this.selectedHour);
      }
    });
    
    this.setupClickableScrollAreas(this.minuteContainer, (direction) => {
      let value = parseInt(this.minuteInput.value);
      if (isNaN(value)) value = 0;
      
      if (direction === 'up') {
        value = (value - 1 + 60) % 60;
      } else if (direction === 'down') {
        value = (value + 1) % 60;
      }
      
      this.selectedMinute = value.toString().padStart(2, "0");
      this.minuteInput.value = this.selectedMinute;
      const index = this.minutes.indexOf(this.selectedMinute);
      if (index > -1) {
        this.smoothScroll(this.minuteContainer, index * this.itemHeight);
        this.updateActiveItem(this.minuteContainer, this.selectedMinute);
      }
    });
    
    if (this.secondContainer) {
      this.setupClickableScrollAreas(this.secondContainer, (direction) => {
        let value = parseInt(this.secondInput.value);
        if (isNaN(value)) value = 0;
        
        if (direction === 'up') {
          value = (value - 1 + 60) % 60;
        } else if (direction === 'down') {
          value = (value + 1) % 60;
        }
        
        this.selectedSecond = value.toString().padStart(2, "0");
        this.secondInput.value = this.selectedSecond;
        const index = this.seconds.indexOf(this.selectedSecond);
        if (index > -1) {
          this.smoothScroll(this.secondContainer, index * this.itemHeight);
          this.updateActiveItem(this.secondContainer, this.selectedSecond);
        }
      });
    }

    // Global keyboard events for the modal
    this.handleKeyDown = (e) => {
      if (!this.modal || this.modal.style.display !== 'block') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Tab') {
        // Handle tab navigation between inputs
        const inputs = [this.hourInput, this.minuteInput, this.secondInput].filter(Boolean);
        const activeElement = document.activeElement;
        const currentIndex = inputs.indexOf(activeElement);

        if (currentIndex >= 0) {
          e.preventDefault();
          const nextIndex = e.shiftKey ?
            (currentIndex - 1 + inputs.length) % inputs.length :
            (currentIndex + 1) % inputs.length;
          inputs[nextIndex].focus();
          inputs[nextIndex].select();
        }
      }
    };

    // Mouse wheel support for scroll containers
    this.addMouseWheelSupport(this.hourContainer, this.hours, (value) => {
      this.selectedHour = value;
      if (this.hourInput) this.hourInput.value = value;
      this.updateActiveItem(this.hourContainer, value);
    });

    this.addMouseWheelSupport(this.minuteContainer, this.minutes, (value) => {
      this.selectedMinute = value;
      if (this.minuteInput) this.minuteInput.value = value;
      this.updateActiveItem(this.minuteContainer, value);
    });

    if (this.secondContainer) {
      this.addMouseWheelSupport(this.secondContainer, this.seconds, (value) => {
        this.selectedSecond = value;
        if (this.secondInput) this.secondInput.value = value;
        this.updateActiveItem(this.secondContainer, value);
      });
    }
  }

  updateSelectedTimeFromScroll(container, timeArray, updateCallback) {
    if (!container) return;
    const selectedIndex = this.findCenterItemIndex(container);
    const selectedValue = timeArray[selectedIndex]?.trim() || "00";
    if (selectedValue) {
      updateCallback(selectedValue);
    }
  }

  findCenterItemIndex(container) {
    if (!container) return 0;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    let closestDistance = Infinity;
    let closestIndex = 0;
    Array.from(container.children).forEach((item, index) => {
      if (item.classList.contains('time-item-spacer')) return;
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    return closestIndex;
  }

  checkViewportFit() {
    if (!this.modal) return;
    
    const rect = this.modal.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const modalHeight = rect.height;
    
    if (modalHeight > viewportHeight * 0.85) {
      const newHeight = Math.min(viewportHeight * 0.85, this.MIN_MODAL_HEIGHT);
      this.modal.style.maxHeight = `${newHeight}px`;
      
      const topOffset = rect.top;
      if (topOffset < 10 || (topOffset + newHeight) > viewportHeight - 10) {
        if (viewportHeight < 300) {
          this.modal.style.top = '10px';
          this.modal.style.transform = 'translate(-50%, 0) scale(1)';
        } else {
          const safeTop = Math.max(10, Math.min(viewportHeight - newHeight - 10, viewportHeight / 2 - newHeight / 2));
          this.modal.style.top = `${safeTop}px`;
          this.modal.style.transform = 'translate(-50%, 0) scale(1)';
        }
      }
    }
  }

  checkScrollBounds(container) {
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (container.scrollTop < 0) {
      container.scrollTop = 0;
    } else if (container.scrollTop > maxScroll) {
      container.scrollTop = maxScroll;
    }
  }

  debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  populateTimeItems(container, items) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'time-item';
      div.textContent = item;
      if (item === '') {
        div.classList.add('time-item-spacer');
      }
      container.appendChild(div);
    });
  }

  updateActiveItem(container, selectedItem) {
    if (!container) return;
    Array.from(container.children).forEach(child => {
      child.classList.remove('active');
      child.classList.remove('semi-active');
    });
    
    Array.from(container.children).forEach((child, index, arr) => {
      if (child.textContent === selectedItem) {
        child.classList.add('active');
        if (index > 0) arr[index - 1].classList.add('semi-active');
        if (index < arr.length - 1) arr[index + 1].classList.add('semi-active');
      }
    });
  }

  toSeconds(hour, minute, second) {
    return parseInt(hour) * 3600 + parseInt(minute) * 60 + parseInt(second);
  }

  open(currentTime) {
    // Use current time if provided, otherwise use previous time, fallback to default
    const timeToUse = currentTime || this.previousTime || "00:30:00";

    let [hours, minutes, seconds] = ["00", "00", "00"];
    if (timeToUse) {
      const parts = timeToUse.split(':');
      hours = parts[0] || "00";
      minutes = parts[1] || "00";
      seconds = parts[2] || "00";
    }
    this.selectedHour = hours;
    this.selectedMinute = minutes;
    this.selectedSecond = seconds;
    
    if (this.hourInput) this.hourInput.value = this.selectedHour;
    if (this.minuteInput) this.minuteInput.value = this.selectedMinute;
    if (this.secondInput) this.secondInput.value = this.selectedSecond;
    
    const hourIndex = this.hours.indexOf(this.selectedHour);
    const minuteIndex = this.minutes.indexOf(this.selectedMinute);
    const secondIndex = this.seconds.indexOf(this.selectedSecond);
    
    if (this.modal) {
      this.modal.style.top = '';
      this.modal.style.transform = '';
      this.modal.style.maxHeight = '';
    }
    
    if (this.modal) {
      this.modal.style.display = 'block';

      // Add keyboard event listener when modal opens
      document.addEventListener('keydown', this.handleKeyDown);
      
      const viewportHeight = window.innerHeight;
      if (viewportHeight < 400) {
        this.modal.style.top = '10px';
        this.modal.style.transform = 'translate(-50%, 0) scale(0.95)';
      }
      
      setTimeout(() => {
        if (this.hourContainer && hourIndex > -1) {
          this.smoothScroll(this.hourContainer, hourIndex * this.itemHeight);
        }
        if (this.minuteContainer && minuteIndex > -1) {
          this.smoothScroll(this.minuteContainer, minuteIndex * this.itemHeight);
        }
        if (this.secondContainer && secondIndex > -1) {
          this.smoothScroll(this.secondContainer, secondIndex * this.itemHeight);
        }
        this.modal.classList.add('show');
        this.checkViewportFit();
      }, 50);
    }
    
    if (this.modalBg) {
      this.modalBg.style.display = 'block';
      setTimeout(() => {
        this.modalBg.classList.add('show');
      }, 10);
    }

    // Auto-focus on the first input field
    setTimeout(() => {
      if (this.hourInput) {
        this.hourInput.focus();
        this.hourInput.select();
      }
    }, 200);
  }

  smoothScroll(element, position) {
    if (!element) return;
    const start = element.scrollTop;
    const containerHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const maxScrollPosition = scrollHeight - containerHeight;
    const targetPosition = position - (containerHeight - this.itemHeight) / 2;
    const clampedPosition = Math.max(0, Math.min(targetPosition, maxScrollPosition));
    const change = clampedPosition - start;
    const duration = 150;
    let startTime = null;
    const animateScroll = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const val = Math.min(1, progress / duration);
      const easeVal = 1 - Math.pow(1 - val, 2);
      element.scrollTop = start + change * easeVal;
      
      if (progress < duration) {
        window.requestAnimationFrame(animateScroll);
      } else {
        element.scrollTop = clampedPosition;
        setTimeout(() => {
          const selectedIndex = this.findCenterItemIndex(element);
          if (element === this.hourContainer) {
            this.selectedHour = this.hours[selectedIndex]?.trim() || "00";
            if (this.hourInput) this.hourInput.value = this.selectedHour;
            this.updateActiveItem(element, this.selectedHour);
          } else if (element === this.minuteContainer) {
            this.selectedMinute = this.minutes[selectedIndex]?.trim() || "00";
            if (this.minuteInput) this.minuteInput.value = this.selectedMinute;
            this.updateActiveItem(element, this.selectedMinute);
          } else if (element === this.secondContainer) {
            this.selectedSecond = this.seconds[selectedIndex]?.trim() || "00";
            if (this.secondInput) this.secondInput.value = this.selectedSecond;
            this.updateActiveItem(element, this.selectedSecond);
          }
        }, 50);
      }
    };
    window.requestAnimationFrame(animateScroll);
  }

  close() {
    // Remove keyboard event listener when modal closes
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.modal) {
      this.modal.classList.remove('show');
      setTimeout(() => {
        this.modal.style.display = 'none';
      }, 300);
    }
    if (this.modalBg) {
      this.modalBg.classList.remove('show');
      setTimeout(() => {
        this.modalBg.style.display = 'none';
      }, 300);
    }
  }

  setupDragForContainer(container, callback) {
    if (!container) return;
    
    let isDragging = false;
    let startY = 0;
    let scrollStartPosition = 0;
    let lastY = 0;
    let velocity = 0;
    let animationFrameId = null;
    let lastUpdateTime = 0;
    
    const momentumScroll = () => {
      if (Math.abs(velocity) < 0.5) {
        cancelAnimationFrame(animationFrameId);
        return;
      }
      
      container.scrollTop -= velocity;
      velocity *= 0.95;
      
      const now = Date.now();
      if (now - lastUpdateTime > 50) {
        if (container === this.hourContainer) {
          this.updateSelectedTimeFromScroll(container, this.hours, (value) => {
            this.selectedHour = value;
            if (this.hourInput) this.hourInput.value = value;
            this.updateActiveItem(container, value);
          });
        } else if (container === this.minuteContainer) {
          this.updateSelectedTimeFromScroll(container, this.minutes, (value) => {
            this.selectedMinute = value;
            if (this.minuteInput) this.minuteInput.value = value;
            this.updateActiveItem(container, value);
          });
        } else if (container === this.secondContainer) {
          this.updateSelectedTimeFromScroll(container, this.seconds, (value) => {
            this.selectedSecond = value;
            if (this.secondInput) this.secondInput.value = value;
            this.updateActiveItem(container, value);
          });
        }
        lastUpdateTime = now;
      }
      
      animationFrameId = requestAnimationFrame(momentumScroll);
    };
    
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      lastY = e.clientY;
      scrollStartPosition = container.scrollTop;
      velocity = 0;
      lastUpdateTime = Date.now();
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      container.style.cursor = 'grabbing';
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const currentY = e.clientY;
      const delta = currentY - startY;
      
      velocity = 0.8 * velocity + 0.2 * (lastY - currentY);
      lastY = currentY;
      
      callback(delta / 2);
      
      startY = currentY;
      
      const now = Date.now();
      if (now - lastUpdateTime > 50) {
        if (container === this.hourContainer) {
          this.updateSelectedTimeFromScroll(container, this.hours, (value) => {
            this.selectedHour = value;
            if (this.hourInput) this.hourInput.value = value;
            this.updateActiveItem(container, value);
          });
        } else if (container === this.minuteContainer) {
          this.updateSelectedTimeFromScroll(container, this.minutes, (value) => {
            this.selectedMinute = value;
            if (this.minuteInput) this.minuteInput.value = value;
            this.updateActiveItem(container, value);
          });
        } else if (container === this.secondContainer) {
          this.updateSelectedTimeFromScroll(container, this.seconds, (value) => {
            this.selectedSecond = value;
            if (this.secondInput) this.secondInput.value = value;
            this.updateActiveItem(container, value);
          });
        }
        lastUpdateTime = now;
      }
      
      e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      
      isDragging = false;
      container.style.cursor = 'grab';
      
      if (container === this.hourContainer) {
        this.updateSelectedTimeFromScroll(container, this.hours, (value) => {
          this.selectedHour = value;
          if (this.hourInput) this.hourInput.value = value;
          this.updateActiveItem(container, value);
        });
      } else if (container === this.minuteContainer) {
        this.updateSelectedTimeFromScroll(container, this.minutes, (value) => {
          this.selectedMinute = value;
          if (this.minuteInput) this.minuteInput.value = value;
          this.updateActiveItem(container, value);
        });
      } else if (container === this.secondContainer) {
        this.updateSelectedTimeFromScroll(container, this.seconds, (value) => {
          this.selectedSecond = value;
          if (this.secondInput) this.secondInput.value = value;
          this.updateActiveItem(container, value);
        });
      }
      
      if (Math.abs(velocity) > 0.5) {
        animationFrameId = requestAnimationFrame(momentumScroll);
      }
    });
    
    container.style.cursor = 'grab';
  }

  setupClickableScrollAreas(container, callback) {
    if (!container) return;
    
    let pressTimer = null;
    let isPressing = false;
    let repeatInterval = null;
    let accelerationTimer = null;
    let initialDelay = 250;
    let fastDelay = 80;
    let currentDelay = initialDelay;
    let pressStartTime = 0;
    
    const startRepeating = (direction) => {
      callback(direction);
      
      if (repeatInterval) {
        clearInterval(repeatInterval);
      }
      
      repeatInterval = setInterval(() => {
        callback(direction);
      }, currentDelay);
      
      accelerationTimer = setTimeout(() => {
        if (repeatInterval) {
          clearInterval(repeatInterval);
        }
        
        container.classList.add('fast-scrolling');
        
        currentDelay = fastDelay;
        repeatInterval = setInterval(() => {
          callback(direction);
        }, fastDelay);
      }, 1000);
    };
    
    const stopRepeating = () => {
      if (repeatInterval) {
        clearInterval(repeatInterval);
        repeatInterval = null;
      }
      
      if (accelerationTimer) {
        clearTimeout(accelerationTimer);
        accelerationTimer = null;
      }
      
      currentDelay = initialDelay;
      
      container.classList.remove('pressing-up', 'pressing-down', 'fast-scrolling');
      
      isPressing = false;
    };
    
    container.addEventListener('mousedown', (e) => {
      const containerRect = container.getBoundingClientRect();
      const clickY = e.clientY;
      
      const topSection = containerRect.top + containerRect.height * 0.33;
      const bottomSection = containerRect.top + containerRect.height * 0.66;
      
      let direction = null;
      
      if (clickY < topSection) {
        direction = 'up';
        container.classList.add('pressing-up');
      } else if (clickY > bottomSection) {
        direction = 'down';
        container.classList.add('pressing-down');
      }
      
      if (direction) {
        isPressing = true;
        pressStartTime = Date.now();
        
        callback(direction);
        
        pressTimer = setTimeout(() => {
          if (isPressing) {
            startRepeating(direction);
          }
        }, 300);
        
        e.preventDefault();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      stopRepeating();
    });
    
    container.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      stopRepeating();
    });
  }

  addMouseWheelSupport(container, timeArray, updateCallback) {
    if (!container) return;

    container.addEventListener('wheel', (e) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? 30 : -30; // Scroll by one item height
      const newScrollTop = container.scrollTop + delta;
      container.scrollTop = newScrollTop;

      this.updateSelectedTimeFromScroll(container, timeArray, updateCallback);
    });
  }

  confirm() {
    const confirmBtn = document.getElementById('confirmTime');
    if (confirmBtn) {
      confirmBtn.click();
    }
  }
}