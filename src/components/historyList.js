/**
 * historyList.js — Interview History Component
 * Renders past interview sessions from localStorage.
 * Kyun alag file: renderHistory app.js mein thi —
 * UI rendering logic app orchestrator mein nahi honi chahiye.
 */

import { getHistory } from "../utils/storage.js";

/**
 * Escape HTML to prevent XSS on stored user data
 * @param {string} str
 * @returns {string}
 */
function _escape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Render interview history into the given container element
 * Each item is keyboard-accessible and toggles details on click
 * @param {HTMLElement} container - DOM element to render into
 * @returns {void}
 */
export function renderHistoryList(container) {
  if (!container) return;

  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="history-list__empty">
        <p class="history-list__empty-text">
          No sessions yet. Mock Interview use karo — sessions yahan save honge.
        </p>
      </div>`;
    return;
  }

  container.innerHTML = history.map((s, i) => `
    <div
      class="history-item"
      tabindex="0"
      role="button"
      aria-expanded="false"
      aria-label="Interview session ${i + 1} — ${_escape(s.role)}"
    >
      <div class="history-item__summary">
        <div class="history-item__meta">
          <strong class="history-item__date">
            ${_escape(new Date(s.date).toLocaleString())}
          </strong>
          <span class="history-item__role">— ${_escape(s.role)}</span>
        </div>
        <span class="history-item__chevron" aria-hidden="true">▼</span>
      </div>
      <div class="history-item__details" hidden>
        <p class="history-item__detail-row">
          <strong>Question:</strong> ${_escape(s.question)}
        </p>
        <p class="history-item__detail-row">
          <strong>Answer:</strong> ${_escape(s.answer)}
        </p>
        <div class="history-item__detail-row">
          <strong>Feedback:</strong>
          <div class="prose">${s.feedback}</div>
        </div>
      </div>
    </div>
  `).join("");

  // Attach toggle handlers — keyboard + click
  container.querySelectorAll(".history-item").forEach((item) => {
    const toggle = () => {
      const details  = item.querySelector(".history-item__details");
      const chevron  = item.querySelector(".history-item__chevron");
      const expanded = item.getAttribute("aria-expanded") === "true";

      item.setAttribute("aria-expanded", String(!expanded));
      details.hidden = expanded;
      if (chevron) chevron.style.transform = expanded ? "" : "rotate(180deg)";
    };

    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}
