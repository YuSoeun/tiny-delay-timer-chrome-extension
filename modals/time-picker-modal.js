export class TimePickerModal {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      this.modal = document.getElementById('timePickerModal');
      this.modalBg = document.getElementById('timePickerBackground');
      
      if (!this.modal || !this.modalBg) {
        throw new Error('Required modal elements not found');
      }

      this.setupTimeInputs();
      this.setupEvents();
    } catch (err) {
      console.error('Error initializing TimePickerModal:', err);
    }
  }

  setupTimeInputs() {
    // Use only necessary buffer items to stay within bounds
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
    
    this.populateTimeItems(hourContainer, this.hours);
    this.populateTimeItems(minuteContainer, this.minutes);
    
    // Only populate seconds if the container exists
    if (secondContainer) {
      this.populateTimeItems(secondContainer, this.seconds);
    }
  }

  setupEvents() {
    this.hourContainer = document.getElementById('hourContainer');
    this.minuteContainer = document.getElementById('minuteContainer');
    this.secondContainer = document.getElementById('secondContainer');
    this.hourInput = document.getElementById('hourInput');
    this.minuteInput = document.getElementById('minuteInput');
    this.secondInput = document.getElementById('secondInput');

    // Update item height to match CSS
    this.itemHeight = 40;

    this.hourContainer.addEventListener("scroll", this.debounce(() => {
      // Ensure scrolling stays within bounds
      this.checkScrollBounds(this.hourContainer);
      
      // Find the selected hour by determining which item is closest to center
      const selectedIndex = this.findCenterItemIndex(this.hourContainer);
      this.selectedHour = this.hours[selectedIndex]?.trim() || "00";
      
      // Update input field and highlight selected item
      if (this.hourInput && this.selectedHour) this.hourInput.value = this.selectedHour;
      this.updateActiveItem(this.hourContainer, this.selectedHour);
    }, 50));

    this.minuteContainer.addEventListener("scroll", this.debounce(() => {
      // Ensure scrolling stays within bounds
      this.checkScrollBounds(this.minuteContainer);
      
      // Find the selected minute by determining which item is closest to center
      const selectedIndex = this.findCenterItemIndex(this.minuteContainer);
      this.selectedMinute = this.minutes[selectedIndex]?.trim() || "00";
      
      // Update input field and highlight selected item
      if (this.minuteInput && this.selectedMinute) this.minuteInput.value = this.selectedMinute;
      this.updateActiveItem(this.minuteContainer, this.selectedMinute);
    }, 50));

    // Setup second container if it exists
    if (this.secondContainer && this.secondInput) {
      this.secondContainer.addEventListener("scroll", this.debounce(() => {
        // Ensure scrolling stays within bounds
        this.checkScrollBounds(this.secondContainer);
        
        // Find the selected second by determining which item is closest to center
        const selectedIndex = this.findCenterItemIndex(this.secondContainer);
        this.selectedSecond = this.seconds[selectedIndex]?.trim() || "00";
        
        // Update input field and highlight selected item
        if (this.secondInput) this.secondInput.value = this.selectedSecond;
        this.updateActiveItem(this.secondContainer, this.selectedSecond);
      }, 50));
    }

    // Add input change and keyboard navigation handlers
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

    // Similar handlers for minutes
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

    // Similar handlers for seconds
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

    // Add confirm button handler
    document.getElementById('confirmTime').addEventListener('click', () => {
      // Create the time string based on available inputs
      let timeStr;
      if (this.secondInput) {
        timeStr = `${this.selectedHour || '00'}:${this.selectedMinute || '00'}:${this.selectedSecond || '00'}`;
      } else {
        timeStr = `${this.selectedHour || '00'}:${this.selectedMinute || '00'}:00`;
      }
      
      // Update both the display and the hidden input
      const timerDisplay = document.getElementById('timerDisplay');
      const totalTimeInput = document.getElementById('total-time');
      
      if (timerDisplay) timerDisplay.textContent = timeStr;
      if (totalTimeInput) totalTimeInput.value = timeStr;
      
      // Dispatch a custom event
      window.dispatchEvent(new CustomEvent('timeSelected', { 
        detail: this.toSeconds(
          this.selectedHour || '00', 
          this.selectedMinute || '00', 
          this.selectedSecond || '00'
        ) 
      }));
      
      // Also notify with a message (for backward compatibility)
      chrome.runtime.sendMessage({
        action: 'timeSelected',
        time: timeStr
      });
      
      this.close();
    });

    // Background click handler
    if (this.modalBg) {
      this.modalBg.addEventListener('click', () => this.close());
    }

    // Handle window resize to ensure modal stays in viewport
    window.addEventListener('resize', () => {
      if (this.modal && this.modal.style.display === 'block') {
        // Ensure time picker fits within the viewport
        this.checkViewportFit();
      }
    });

    // Add mouse drag functionality to scroll containers
    this.setupDragForContainer(this.hourContainer, (delta) => {
      // Invert the delta direction for natural feel - dragging up shows lower numbers
      const newScrollTop = this.hourContainer.scrollTop + delta; // Changed from - to + to invert direction
      this.hourContainer.scrollTop = newScrollTop;
      
      // Update the selected hour based on the scroll position
      this.updateSelectedTimeFromScroll(this.hourContainer, this.hours, (value) => {
        this.selectedHour = value;
        if (this.hourInput) this.hourInput.value = value;
        this.updateActiveItem(this.hourContainer, value);
      });
    });
    
    this.setupDragForContainer(this.minuteContainer, (delta) => {
      // Invert the delta direction for natural feel - dragging up shows lower numbers
      const newScrollTop = this.minuteContainer.scrollTop + delta; // Changed from - to + to invert direction
      this.minuteContainer.scrollTop = newScrollTop;
      
      // Update the selected minute based on the scroll position
      this.updateSelectedTimeFromScroll(this.minuteContainer, this.minutes, (value) => {
        this.selectedMinute = value;
        if (this.minuteInput) this.minuteInput.value = value;
        this.updateActiveItem(this.minuteContainer, value);
      });
    });
    
    if (this.secondContainer) {
      this.setupDragForContainer(this.secondContainer, (delta) => {
        // Invert the delta direction for natural feel - dragging up shows lower numbers
        const newScrollTop = this.secondContainer.scrollTop + delta; // Changed from - to + to invert direction
        this.secondContainer.scrollTop = newScrollTop;
        
        // Update the selected second based on the scroll position
        this.updateSelectedTimeFromScroll(this.secondContainer, this.seconds, (value) => {
          this.selectedSecond = value;
          if (this.secondInput) this.secondInput.value = value;
          this.updateActiveItem(this.secondContainer, value);
        });
      });
    }

    // Setup click handlers for scroll containers
    this.setupClickableScrollAreas(this.hourContainer, (direction) => {
      let value = parseInt(this.hourInput.value);
      if (isNaN(value)) value = 0;
      
      if (direction === 'up') {
        value = (value - 1 + 24) % 24; // Decrease value (move up)
      } else if (direction === 'down') {
        value = (value + 1) % 24; // Increase value (move down)
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
        value = (value - 1 + 60) % 60; // Decrease value (move up)
      } else if (direction === 'down') {
        value = (value + 1) % 60; // Increase value (move down)
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
          value = (value - 1 + 60) % 60; // Decrease value (move up)
        } else if (direction === 'down') {
          value = (value + 1) % 60; // Increase value (move down)
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
  }

  updateSelectedTimeFromScroll(container, timeArray, updateCallback) {
    if (!container) return;
    // Find the index of the centered item
    const selectedIndex = this.findCenterItemIndex(container);
    // Get the time value and update
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
    // If modal is too tall for the viewport, reduce its size
    if (modalHeight > viewportHeight * 0.9) {
      this.modal.style.maxHeight = `${viewportHeight * 0.9}px`;
    }
  }

  checkScrollBounds(container) {
    if (!container) return;
    // Get the maximum scroll position
    const maxScroll = container.scrollHeight - container.clientHeight;
    // Clamp the current scroll position
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
    // Clear existing items
    container.innerHTML = '';
    // Add items with improved styling for empty spaces
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'time-item';
      div.textContent = item;
      // Add a special class for empty items
      if (item === '') {
        div.classList.add('time-item-spacer');
      }
      container.appendChild(div);
    });
  }

  updateActiveItem(container, selectedItem) {
    if (!container) return;
    // First remove all active classes
    Array.from(container.children).forEach(child => {
      child.classList.remove('active');
      child.classList.remove('semi-active');
    });
    // Find the selected item and add active class
    // Also add semi-active class to items right before and after
    Array.from(container.children).forEach((child, index, arr) => {
      if (child.textContent === selectedItem) {
        child.classList.add('active');
        // Add semi-active class to adjacent items for visual guidance
        if (index > 0) arr[index - 1].classList.add('semi-active');
        if (index < arr.length - 1) arr[index + 1].classList.add('semi-active');
      }
    });
  }

  toSeconds(hour, minute, second) {
    return parseInt(hour) * 3600 + parseInt(minute) * 60 + parseInt(second);
  }

  open(currentTime = "00:00:00") {
    // Parse the current time
    let [hours, minutes, seconds] = ["00", "00", "00"];
    if (currentTime) {
      const parts = currentTime.split(':');
      hours = parts[0] || "00";
      minutes = parts[1] || "00";
      seconds = parts[2] || "00";
    }
    this.selectedHour = hours;
    this.selectedMinute = minutes;
    this.selectedSecond = seconds;
    // Update input fields
    if (this.hourInput) this.hourInput.value = this.selectedHour;
    if (this.minuteInput) this.minuteInput.value = this.selectedMinute;
    if (this.secondInput) this.secondInput.value = this.selectedSecond;
    // Find the indexes with extra padding items considered
    const hourIndex = this.hours.indexOf(this.selectedHour);
    const minuteIndex = this.minutes.indexOf(this.selectedMinute);
    const secondIndex = this.seconds.indexOf(this.selectedSecond);
    // Show modal first so we can get proper container dimensions
    if (this.modal) {
      this.modal.style.display = 'block';
      setTimeout(() => {
        // Scroll to position each item (considering padding)
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
  }

  smoothScroll(element, position) {
    if (!element) return;
    const start = element.scrollTop;
    const containerHeight = element.clientHeight;
    // Calculate the maximum scrollable position
    const scrollHeight = element.scrollHeight;
    const maxScrollPosition = scrollHeight - containerHeight;
    // Calculate the offset needed to center the item in the container
    const targetPosition = position - (containerHeight - this.itemHeight) / 2;
    // Clamp the target position to prevent scrolling out of bounds
    const clampedPosition = Math.max(0, Math.min(targetPosition, maxScrollPosition));
    const change = clampedPosition - start;
    const duration = 150;
    let startTime = null;
    const animateScroll = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      // Easing function for smooth animation
      const val = Math.min(1, progress / duration);
      const easeVal = 1 - Math.pow(1 - val, 2);
      element.scrollTop = start + change * easeVal;
      
      if (progress < duration) {
        window.requestAnimationFrame(animateScroll);
      } else {
        // After animation completes, snap to the exact position
        element.scrollTop = clampedPosition;
        // Re-check which item is centered and update the selection
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
    // Apply fade-out animation
    if (this.modal) {
      this.modal.classList.remove('show');
      setTimeout(() => {
        this.modal.style.display = 'none';
      }, 300); // Match the CSS transition duration
    }
    if (this.modalBg) {
      this.modalBg.classList.remove('show');
      setTimeout(() => {
        this.modalBg.style.display = 'none';
      }, 300); // Match the CSS transition duration
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
    
    // Helper function for momentum scrolling
    const momentumScroll = () => {
      if (Math.abs(velocity) < 0.5) {
        cancelAnimationFrame(animationFrameId);
        return;
      }
      
      // Invert velocity direction for natural movement
      container.scrollTop -= velocity; // Changed from + to - to invert direction
      velocity *= 0.95; // Deceleration factor
      
      // Update selected time during momentum scrolling
      const now = Date.now();
      if (now - lastUpdateTime > 50) { // Update at most every 50ms to avoid too frequent updates
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
      
      // Change cursor to indicate dragging
      container.style.cursor = 'grabbing';
      
      // Prevent default behavior to avoid text selection
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const currentY = e.clientY;
      const delta = currentY - startY;
      
      // Calculate velocity for momentum scrolling
      // Invert velocity for natural movement
      velocity = 0.8 * velocity + 0.2 * (lastY - currentY); // Inverted velocity calculation
      lastY = currentY;
      
      callback(delta / 2); // Pass the delta to the callback
      
      // Update start position for next move
      startY = currentY;
      
      // Update selected time during dragging
      const now = Date.now();
      if (now - lastUpdateTime > 50) { // Throttle updates to improve performance
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
      
      // Do a final update of the selected time
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
      
      // Apply momentum scrolling if velocity is significant
      if (Math.abs(velocity) > 0.5) {
        animationFrameId = requestAnimationFrame(momentumScroll);
      }
    });
    
    // Add visual cue for draggable items
    container.style.cursor = 'grab';
  }

  setupClickableScrollAreas(container, callback) {
    if (!container) return;
    
    container.addEventListener('click', (e) => {
      // Determine which part of the container was clicked
      const containerRect = container.getBoundingClientRect();
      const clickY = e.clientY;
      
      // Divide container into three sections
      const topSection = containerRect.top + containerRect.height * 0.33;
      const bottomSection = containerRect.top + containerRect.height * 0.66;
      
      if (clickY < topSection) {
        // Clicked in the top third - scroll up
        callback('up');
      } else if (clickY > bottomSection) {
        // Clicked in the bottom third - scroll down
        callback('down');
      }
      // Clicked in the middle - do nothing
    });
  }
}