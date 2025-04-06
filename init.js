import { PresetModal } from './modals/preset-modal.js';
import { TimePickerModal } from './modals/time-picker-modal.js';

document.addEventListener('DOMContentLoaded', () => {
  window.presetModal = new PresetModal();
  window.timePickerModal = new TimePickerModal();
});
