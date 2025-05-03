export class Overlay {
  constructor() {
    this.overlayElement = null;
  }

  createOverlay() {
    if (this.overlayElement) return;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'timer-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      z-index: 10000;
    `;

    document.body.appendChild(this.overlayElement);
  }

  updateTime(remaining) {
    if (!this.overlayElement) this.createOverlay();
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    this.overlayElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  removeOverlay() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  setPosition(x, y) {
    if (!this.overlayElement) return;
    
    this.overlayElement.style.top = `${y}px`;
    this.overlayElement.style.right = `${x}px`;
  }
} 