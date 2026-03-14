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

    <div class="score-tracker__list">
      ${scores.map((s, i) => `
        <div class="score-tracker__item">
          <div class="score-tracker__badge"
               style="background:${_scoreBg(s.atsScore)};color:${_scoreColor(s.atsScore)}">
            ${s.atsScore}
          </div>
          <div class="score-tracker__info">
            <div class="score-tracker__role">${_escape(s.role)}</div>
            <div class="score-tracker__date">
              ${new Date(s.date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </div>
          </div>
          <div class="score-tracker__right">
            <span class="score-tracker__label tag"
                  style="background:${_scoreBg(s.atsScore)};color:${_scoreColor(s.atsScore)};border-color:${_scoreColor(s.atsScore)}">
              ${_scoreLabel(s.atsScore)}
            </span>
            ${i === 0
              ? '<span class="score-tracker__latest-badge">LATEST</span>'
              : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}
