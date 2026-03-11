/**
 * fileUpload.js — Drag & drop file upload component
 * Handles file selection, drag events, and extraction feedback.
 */

import { extractText } from '../utils/pdfParser.js';

/**
 * Initialize a drop zone
 * @param {object} config
 * @param {string}   config.zoneId      - Drop zone element ID
 * @param {string}   config.inputId     - Hidden file input ID
 * @param {string}   config.fileNameId  - Element to show filename
 * @param {function} config.onExtract   - Callback(text, error)
 */
export function initDropZone({ zoneId, inputId, fileNameId, onExtract }) {
  const zone      = document.getElementById(zoneId);
  const input     = document.getElementById(inputId);
  const nameEl    = document.getElementById(fileNameId);

  if (!zone || !input) return;

  // Click to open file picker
  zone.addEventListener('click', () => input.click());

  // Drag events
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drop-zone--drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drop-zone--drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drop-zone--drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  });

  // Input change
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) processFile(file);
  });

  async function processFile(file) {
    // Show loading state
    setZoneState(zone, 'loading', file.name);

    const { text, error } = await extractText(file);

    if (error || !text) {
      setZoneState(zone, 'error', 'Extraction failed');
      if (nameEl) {
        nameEl.textContent = error || 'Error — neeche paste karo';
        nameEl.style.display = 'block';
        nameEl.style.color = 'var(--color-red)';
      }
      onExtract('', error);
    } else {
      const wordCount = Math.round(text.split(/\s+/).length);
      setZoneState(zone, 'success', file.name, `${wordCount} words extracted`);
      if (nameEl) nameEl.style.display = 'none';
      onExtract(text, null);
    }
  }
}

function setZoneState(zone, state, title, sub = '') {
  const icon  = zone.querySelector('.drop-zone__icon');
  const titleEl = zone.querySelector('.drop-zone__title');
  const subEl   = zone.querySelector('.drop-zone__sub');

  zone.classList.remove('drop-zone--success', 'drop-zone--drag-over');

  if (state === 'loading') {
    if (icon)  icon.textContent  = '⏳';
    if (titleEl) titleEl.textContent = 'Reading...';
    if (subEl)   subEl.textContent   = title;
  } else if (state === 'success') {
    zone.classList.add('drop-zone--success');
    if (icon)    icon.textContent    = '✅';
    if (titleEl) titleEl.textContent = title;
    if (subEl)   subEl.textContent   = sub;
  } else if (state === 'error') {
    if (icon)    icon.textContent    = '❌';
    if (titleEl) titleEl.textContent = 'Upload failed';
    if (subEl)   subEl.textContent   = 'PDF try karo ya paste karo';
  }
}
