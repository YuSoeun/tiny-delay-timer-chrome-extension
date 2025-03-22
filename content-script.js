// Create overlay element
function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'boj-timer-overlay';
    overlay.innerHTML = `
        <div class="boj-timer-content">
            <div class="boj-timer-time">
                <span class="boj-timer-elapsed">--:--</span>
                <span class="boj-timer-delay">00:00</span>
            </div>
        </div>
        <button class="boj-timer-toggle" title="Toggle Timer">
            <span class="boj-timer-icon">⏱️</span>
        </button>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

// Initialize overlay
const overlay = createOverlay();
const timerContent = overlay.querySelector('.boj-timer-content');
const toggleButton = overlay.querySelector('.boj-timer-toggle');

// Make overlay draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

overlay.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    if (e.target === toggleButton) return;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    xOffset = currentX;
    yOffset = currentY;
    setTranslate(currentX, currentY, overlay);
}

function dragEnd() {
    isDragging = false;
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

// Toggle overlay visibility
toggleButton.addEventListener('click', () => {
    timerContent.classList.toggle('hidden');
    chrome.storage.local.set({ 
        overlayVisible: !timerContent.classList.contains('hidden')
    });
});

// Load visibility state
chrome.storage.local.get(['overlayVisible'], (result) => {
    if (result.overlayVisible === false) {
        timerContent.classList.add('hidden');
    }
});

// Listen for timer updates
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'timerUpdate') {
        const elapsedEl = overlay.querySelector('.boj-timer-elapsed');
        const delayEl = overlay.querySelector('.boj-timer-delay');
        
        elapsedEl.textContent = message.elapsed || '--:--';
        delayEl.textContent = message.delay > 0 ? 
            `+${formatTime(message.delay)}` : '00:00';
        
        delayEl.classList.toggle('delayed', message.delay > 0);
    }
});
