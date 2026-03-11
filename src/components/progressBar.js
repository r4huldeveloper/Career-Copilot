/**
 * progressBar.js — Animated loading bar component
 * Returns a controller to start/stop animation.
 */

/**
 * Animate a loading bar from 0 → 90%, then snap to 100% on complete
 * @param {string} barId - ID of .loading-bar__fill element
 * @param {string} wrapperId - ID of .loading-bar wrapper element
 * @param {number} duration - Time (ms) to reach 90%
 * @returns {function} stop — call to complete the animation
 */
export function startProgress(barId, wrapperId, duration = 2500) {
  const bar    = document.getElementById(barId);
  const wrapper = document.getElementById(wrapperId);

  if (!bar || !wrapper) return () => {};

  wrapper.classList.add('loading-bar--visible');
  bar.style.width = '0%';

  let start = null;
  let rafId = null;

  function tick(timestamp) {
    if (!start) start = timestamp;
    const elapsed  = timestamp - start;
    const progress = Math.min((elapsed / duration) * 90, 90);
    bar.style.width = `${progress}%`;
    if (progress < 90) rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // Return a stop function — call this when API response arrives
  return function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    bar.style.transition = 'width 0.3s ease';
    bar.style.width = '100%';
    setTimeout(() => {
      wrapper.classList.remove('loading-bar--visible');
      bar.style.width = '0%';
      bar.style.transition = 'width 0.4s ease';
    }, 500);
  };
}

/**
 * Update progress step indicators
 * @param {string[]} stepIds - Array of step element IDs
 * @param {number} activeIndex - Current active step (0-based)
 */
export function setProgressStep(stepIds, activeIndex) {
  stepIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'progress-step';
    if (i < activeIndex)  el.classList.add('progress-step--done');
    if (i === activeIndex) el.classList.add('progress-step--active');
  });
}
