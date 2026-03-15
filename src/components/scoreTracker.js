/**
 * scoreTracker.js — ATS Score Tracker Component
 * Renders score history panel from localStorage data.
 * Kyun alag file: app.js mein tha — single responsibility
 * violate ho rahi thi. Har component ka ek kaam hona chahiye.
 */

import { getScores } from "../utils/storage.js";

/**
 * Get color token based on ATS score value
 * @param {number} score
 * @returns {string} CSS variable string
 */
function _scoreColor(score) {
  if (score >= 8) return "var(--color-green)";
  if (score >= 6) return "var(--color-yellow)";
  return "var(--color-red)";
}

/**
 * Get background color token based on ATS score value
 * @param {number} score
 * @returns {string} CSS variable string
 */
function _scoreBg(score) {
  if (score >= 8) return "var(--color-green-light)";
  if (score >= 6) return "var(--color-yellow-light)";
  return "var(--color-red-light)";
}

/**
 * Get human-readable label for score
 * @param {number} score
 * @returns {string}
 */
function _scoreLabel(score) {
  if (score >= 8) return "Strong";
  if (score >= 6) return "Average";
  return "Needs Work";
}

/**
 * Escape HTML to prevent XSS in stored data
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
 * Render Score Tracker into the given container element
 * Shows summary stats + chronological score history
 * @param {HTMLElement} container - DOM element to render into
 * @returns {void}
 */
export function renderScoreTracker(container) {
  if (!container) return;

  const scores = getScores();

  if (scores.length === 0) {
    container.innerHTML = `
      <div class="score-tracker__empty">
        <div class="score-tracker__empty-icon">📊</div>
        <p class="score-tracker__empty-title">Abhi koi score nahi hai</p>
        <p class="score-tracker__empty-sub">
          Resume Analyzer use karo — ATS score automatically yahan save hoga.
        </p>
      </div>`;
    return;
  }

  const best    = Math.max(...scores.map((s) => s.atsScore));
  const latest  = scores[0].atsScore;
  const total   = scores.length;

  // Static shell via innerHTML (no untrusted text injected here)
  container.innerHTML = `
    <div class="score-tracker__stats">
      <div class="card score-tracker__stat-card">
        <div class="card__body score-tracker__stat-body">
          <div class="score-tracker__stat-num" style="color:var(--color-accent)">${total}</div>
          <div class="score-tracker__stat-lbl">Total Analyses</div>
        </div>
      </div>
      <div class="card score-tracker__stat-card">
        <div class="card__body score-tracker__stat-body">
          <div class="score-tracker__stat-num" style="color:${_scoreColor(best)}">${best}/10</div>
          <div class="score-tracker__stat-lbl">Best Score</div>
        </div>
      </div>
      <div class="card score-tracker__stat-card">
        <div class="card__body score-tracker__stat-body">
          <div class="score-tracker__stat-num" style="color:${_scoreColor(latest)}">${latest}/10</div>
          <div class="score-tracker__stat-lbl">Latest Score</div>
        </div>
      </div>
    </div>
    <div class="score-tracker__list"></div>
  `;

  const listEl = container.querySelector(".score-tracker__list");
  if (!listEl) return;

  scores.forEach((s, i) => {
    const itemEl = document.createElement("div");
    itemEl.className = "score-tracker__item";

    const badgeEl = document.createElement("div");
    badgeEl.className = "score-tracker__badge";
    badgeEl.style.background = _scoreBg(s.atsScore);
    badgeEl.style.color = _scoreColor(s.atsScore);
    badgeEl.textContent = String(s.atsScore);

    const infoEl = document.createElement("div");
    infoEl.className = "score-tracker__info";

    const roleEl = document.createElement("div");
    roleEl.className = "score-tracker__role";
    // Use textContent so any HTML in role is treated as text
    roleEl.textContent = s.role != null ? String(s.role) : "";

    const dateEl = document.createElement("div");
    dateEl.className = "score-tracker__date";
    dateEl.textContent = new Date(s.date).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

    infoEl.appendChild(roleEl);
    infoEl.appendChild(dateEl);

    const rightEl = document.createElement("div");
    rightEl.className = "score-tracker__right";

    const labelEl = document.createElement("span");
    labelEl.className = "score-tracker__label tag";
    labelEl.style.background = _scoreBg(s.atsScore);
    labelEl.style.color = _scoreColor(s.atsScore);
    labelEl.style.borderColor = _scoreColor(s.atsScore);
    labelEl.textContent = _scoreLabel(s.atsScore);

    rightEl.appendChild(labelEl);

    if (i === 0) {
      const latestBadge = document.createElement("span");
      latestBadge.className = "score-tracker__latest-badge";
      latestBadge.textContent = "LATEST";
      rightEl.appendChild(latestBadge);
    }

    itemEl.appendChild(badgeEl);
    itemEl.appendChild(infoEl);
    itemEl.appendChild(rightEl);

    listEl.appendChild(itemEl);
  });
}
