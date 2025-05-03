export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatTimeInput(input) {
  const maxVal = input.classList.contains('hour-input') ? 23 : 59;
  let val = parseInt(input.value) || 0;
  if (val < 0) val = 0;
  if (val > maxVal) val = maxVal;
  input.value = String(val).padStart(2, '0');
}

export function isValidTime(timeStr) {
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const match = timeStr.match(timeRegex);
  
  if (!match) return false;
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function parseTimeToMinutes(timeStr) {
  if (!isValidTime(timeStr)) return 0;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
} 