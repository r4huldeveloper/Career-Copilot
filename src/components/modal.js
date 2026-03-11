/**
 * modal.js — Generic modal controller
 */

/**
 * @param {string} overlayId - Overlay element ID
 * @returns {{ show, hide }}
 */
export function createModal(overlayId) {
  const overlay = document.getElementById(overlayId);

  function show() {
    overlay?.classList.remove('overlay--hidden');
  }

  function hide() {
    overlay?.classList.add('overlay--hidden');
  }

  // Close on backdrop click
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  return { show, hide };
}
