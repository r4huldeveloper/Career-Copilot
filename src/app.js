/**
 * app.js — Main Application Controller
 * Responsibility: Wire events, manage state, delegate to components.
 * Kyun: Rendering logic components mein — app.js sirf orchestrate karta hai.
 */

import { initFeedbackWidget }          from "./components/feedback.js";
import { renderScoreTracker }          from "./components/scoreTracker.js";
import { renderHistoryList }           from "./components/historyList.js";
import {
  saveSession, getApiKey, setApiKey,
  saveScore, clearHistory, clearScores,
  getTheme, setTheme,
}                                       from "./utils/storage.js";
import { parseMarkdown }               from "./utils/markdown.js";
import { startProgress, setProgressStep } from "./components/progressBar.js";
import { initDropZone }                from "./components/fileUpload.js";
import { createModal }                 from "./components/modal.js";
import {
  analyzeResume, analyzeRoleFit,
  matchJD, generateInterviewQuestion,
  evaluateAnswer, getAnswerTips,
}                                       from "./api/groq.js";
import { CONFIG }                      from "./config.js";

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  apiKey:          "",
  resumeText:      "",
  jdResumeText:    "",
  currentQuestion: "",
  questionCount:   0,
};

// ── DOM Helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $v = (id) => $(id)?.value?.trim() || "";

/**
 * Escape HTML — prevents XSS on any user-supplied string
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Show inline error — no alert() anywhere in codebase
 * Auto-hides after 5s. Adds role=alert for screen readers.
 * @param {string} elementId
 * @param {string} message
 */
function showError(elementId, message) {
  const el = $(elementId);
  if (!el) return;
  el.textContent = "⚠️ " + message;
  el.classList.remove("hidden");
  el.setAttribute("role", "alert");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

/**
 * Render AI result into result-box
 * @param {string} boxId
 * @param {string} contentId
 * @param {string} html
 */
function showResult(boxId, contentId, html) {
  const box = $(boxId);
  if (!box) return;
  $(contentId).innerHTML = `<div class="prose">${html}</div>`;
  box.classList.add("result-box--visible");
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Append chat message to interview container
 * @param {string} containerId
 * @param {"ai"|"user"} role
 * @param {string} html
 */
function addChatMsg(containerId, role, html) {
  const container = $(containerId);
  if (!container) return;
  const isAI = role === "ai";
  container.insertAdjacentHTML("beforeend", `
    <div class="chat__msg chat__msg--${isAI ? "ai" : "user"}">
      <div class="chat__avatar">${isAI ? "🤖" : "👤"}</div>
      <div class="chat__bubble prose">${html}</div>
    </div>
  `);
  container.lastElementChild.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Toggle button loading/idle state
 * @param {string} id
 * @param {boolean} disabled
 * @param {string} [text]
 */
function setBtn(id, disabled, text) {
  const btn = $(id);
  if (!btn) return;
  btn.disabled = disabled;
  if (text) btn.textContent = text;
}

/**
 * Switch visible panel + active nav state
 * @param {string} name
 */
function showPanel(name) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("panel--active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("nav-item--active"));
  $("panel-" + name)?.classList.add("panel--active");
  $("nav-" + name)?.classList.add("nav-item--active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const apiModal = createModal("setup-overlay");

/**
 * Update topbar Groq connection indicator
 * @param {boolean} connected
 */
function updateConnectionStatus(connected) {
  const dot    = $("api-dot");
  const status = $("api-status");
  const card   = $("sidebar-api-card");
  if (connected) {
    dot?.classList.add("topbar__status-dot--connected");
    if (status) { status.textContent = "Groq connected"; status.style.color = "var(--color-green)"; }
    card?.classList.add("hidden");
  } else {
    dot?.classList.remove("topbar__status-dot--connected");
    if (status) { status.textContent = "API not connected"; status.style.color = ""; }
    card?.classList.remove("hidden");
  }
}

/**
 * Validate and persist Groq API key
 */
function saveApiKey() {
  const key = $v("api-key-input");
  if (!key.startsWith("gsk_")) {
    showError("api-key-error", 'Valid Groq API key "gsk_" se shuru hoti hai.');
    return;
  }
  state.apiKey = key;
  setApiKey(key);
  apiModal.hide();
  updateConnectionStatus(true);
}

// ── ATS Score Parser ──────────────────────────────────────────────────────────

/**
 * Extract numeric ATS score from AI markdown output
 * @param {string} resultText
 * @returns {number|null}
 */
function parseAtsScore(resultText) {
  const match = resultText.match(/ATS\s*SCORE[:\s]*(\d+)\s*\/\s*10/i);
  return match ? parseInt(match[1], 10) : null;
}

// ── Offline Detection ─────────────────────────────────────────────────────────

/**
 * Show or hide offline warning banner
 * Kyun: Without this, user waited 30s for timeout with no feedback
 * @param {boolean} offline
 */
function setOfflineBanner(offline) {
  let banner = $("offline-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "assertive");
    banner.style.cssText = [
      "display:none", "position:fixed", "top:var(--topbar-height)",
      "left:0", "right:0", "z-index:500",
      "background:var(--color-yellow-light)",
      "border-bottom:1px solid var(--color-yellow-border)",
      "color:#92400e", "text-align:center",
      "padding:var(--space-2) var(--space-4)",
      "font-size:var(--text-sm)", "font-weight:var(--weight-medium)",
    ].join(";");
    banner.textContent = "⚠️ Internet nahi hai — AI features kaam nahi karenge";
    document.body.prepend(banner);
  }
  banner.style.display = offline ? "block" : "none";
}

/** Initialize online/offline listeners */
function initOfflineDetection() {
  setOfflineBanner(!navigator.onLine);
  window.addEventListener("online",  () => setOfflineBanner(false));
  window.addEventListener("offline", () => setOfflineBanner(true));
}

// ── Dark Mode ─────────────────────────────────────────────────────────────────

/**
 * Apply theme to document and persist via storage.js
 * Kyun storage.js: Direct localStorage.setItem tha — inconsistent
 * @param {boolean} dark
 */
function applyTheme(dark) {
  const themeIcon = $("theme-icon");
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeIcon) themeIcon.textContent = "☀️";
    setTheme("dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIcon) themeIcon.textContent = "🌙";
    setTheme("light");
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

/**
 * Open mobile sidebar drawer
 * @param {HTMLElement} sidebar
 * @param {HTMLElement} overlay
 */
function openSidebar(sidebar, overlay) {
  sidebar?.classList.add("sidebar--open");
  overlay?.classList.add("sidebar-overlay--visible");
}

/**
 * Close mobile sidebar drawer
 * @param {HTMLElement} sidebar
 * @param {HTMLElement} overlay
 */
function closeSidebar(sidebar, overlay) {
  sidebar?.classList.remove("sidebar--open");
  overlay?.classList.remove("sidebar-overlay--visible");
}

// ── Feature Handlers ──────────────────────────────────────────────────────────

/**
 * Resume Analyzer — auto-saves ATS score, reveals Role Fit section
 */
async function handleAnalyzeResume() {
  const text = state.resumeText || $v("resume-text");
  const role = $v("resume-role");

  if (!text || text.length < CONFIG.MIN_RESUME_LENGTH) {
    showError("resume-error", "Resume upload karo ya paste karo pehle!");
    return;
  }

  setBtn("resume-btn", true, "Analyzing...");
  setProgressStep(["rs-1", "rs-2", "rs-3", "rs-4"], 2);
  const stop = startProgress("resume-bar", "resume-progress", 3000);

  try {
    const result = await analyzeResume({ resumeText: text, targetRole: role, apiKey: state.apiKey });
    stop();
    setProgressStep(["rs-1", "rs-2", "rs-3", "rs-4"], 4);
    showResult("resume-result", "resume-result-content", parseMarkdown(result));

    // Auto-save ATS score — feeds Score Tracker without any user action
    const atsScore = parseAtsScore(result);
    if (atsScore !== null) {
      saveScore({ date: new Date().toISOString(), role, atsScore });
      renderScoreTracker($("score-tracker-list"));
    }

    // Reveal Role Fit section — only after analysis complete
    $("role-fit-section")?.style.setProperty("display", "block");

  } catch (err) {
    stop();
    console.error("[app] handleAnalyzeResume:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("resume-btn", false, "🔍 Analyze Resume");
}

/**
 * AI Role Fit Analyzer — reuses already-uploaded resume text
 */
async function handleAnalyzeRoleFit() {
  const text = state.resumeText || $v("resume-text");

  if (!text || text.length < CONFIG.MIN_RESUME_LENGTH) {
    showError("resume-error", "Pehle resume analyze karo upar se!");
    return;
  }

  setBtn("role-fit-btn", true, "Finding Best Roles...");
  const stop = startProgress("role-fit-bar", "role-fit-progress", 4000);

  try {
    const result = await analyzeRoleFit({ resumeText: text, apiKey: state.apiKey });
    stop();
    showResult("role-fit-result", "role-fit-result-content", parseMarkdown(result));
  } catch (err) {
    stop();
    console.error("[app] handleAnalyzeRoleFit:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("role-fit-btn", false, "🎯 Find My Best Roles");
}

/**
 * JD Matcher
 */
async function handleMatchJD() {
  const jd     = $v("jd-text");
  const resume = state.jdResumeText || $v("jd-resume-text");

  if (!jd)                                   { showError("jd-error", "Job Description paste karo!"); return; }
  if (resume.length < CONFIG.MIN_RESUME_LENGTH) { showError("jd-error", "Resume upload karo ya paste karo!"); return; }

  setBtn("jd-btn", true, "Matching...");
  const stop = startProgress("jd-bar", "jd-progress", 3000);

  try {
    const result = await matchJD({ jdText: jd, resumeText: resume, apiKey: state.apiKey });
    stop();
    showResult("jd-result", "jd-result-content", parseMarkdown(result));
  } catch (err) {
    stop();
    console.error("[app] handleMatchJD:", err.message);
    showError("jd-error", err.message);
  }

  setBtn("jd-btn", false, "🎯 Match Karo & Analyze");
}

/**
 * Generate interview question
 * @param {boolean} forceNew
 */
async function handleGenerateQuestion(forceNew = false) {
  const role = $v("int-role");
  const type = $v("int-type");

  $("chat-container").innerHTML = "";
  $("user-answer").value = "";
  $("answer-section").style.display = "none";
  $("question-box").classList.remove("question-box--visible");
  setBtn("gen-btn", true, "Thinking...");

  try {
    const raw = await generateInterviewQuestion({
      role, type, forceNew, count: ++state.questionCount, apiKey: state.apiKey,
    });

    let question = "", difficulty = "Medium", focus = "";
    raw.split("\n").forEach((line) => {
      if (line.startsWith("QUESTION:"))   question   = line.replace("QUESTION:", "").trim();
      if (line.startsWith("DIFFICULTY:")) difficulty = line.replace("DIFFICULTY:", "").trim();
      if (line.startsWith("FOCUS:"))      focus      = line.replace("FOCUS:", "").trim();
    });
    if (!question) question = raw.trim();

    state.currentQuestion = question;
    $("question-text").textContent = question;
    $("question-tags").innerHTML = `
      <span class="tag tag--blue">${escapeHtml(type.split("—")[0].trim())}</span>
      <span class="tag tag--yellow">${escapeHtml(difficulty)}</span>
      ${focus ? `<span class="tag tag--purple">${escapeHtml(focus)}</span>` : ""}
    `;
    $("question-box").classList.add("question-box--visible");
    $("answer-section").style.display = "block";
    $("answer-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("[app] handleGenerateQuestion:", err.message);
    showError("int-error", err.message);
  }

  setBtn("gen-btn", false, "❓ Generate Question");
}

/**
 * Evaluate interview answer
 */
async function handleGetFeedback() {
  const answer = $v("user-answer");
  if (!answer) { showError("int-error", "Pehle apna jawab likho!"); return; }

  const role = $v("int-role");
  const type = $v("int-type");

  setBtn("feedback-btn", true, "Evaluating...");
  const stop = startProgress("int-bar", "int-progress", 2500);
  $("chat-container").innerHTML = "";
  addChatMsg("chat-container", "user", escapeHtml(answer));

  try {
    const result = await evaluateAnswer({
      question: state.currentQuestion, answer, role, type, apiKey: state.apiKey,
    });
    stop();
    addChatMsg("chat-container", "ai", parseMarkdown(result));
    saveSession({
      date: new Date().toISOString(), role, type,
      question: state.currentQuestion, answer,
      feedback: parseMarkdown(result), score: "N/A",
    });
    renderHistoryList($("history-list"));
  } catch (err) {
    stop();
    console.error("[app] handleGetFeedback:", err.message);
    showError("int-error", err.message);
  }

  setBtn("feedback-btn", false, "💬 Get AI Feedback");
}

/**
 * Get expected answer tips
 */
async function handleGetTips() {
  const role = $v("int-role");
  const type = $v("int-type");

  setBtn("tips-btn", true, "Loading...");
  const stop = startProgress("int-bar", "int-progress", 2500);
  $("chat-container").innerHTML = "";

  try {
    const result = await getAnswerTips({
      question: state.currentQuestion, role, type, apiKey: state.apiKey,
    });
    stop();
    addChatMsg("chat-container", "ai", parseMarkdown(result));
  } catch (err) {
    stop();
    console.error("[app] handleGetTips:", err.message);
    showError("int-error", err.message);
  }

  setBtn("tips-btn", false, "📋 Expected Answer");
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Bootstrap application after DOMContentLoaded
 */
function init() {
  // API Key
  state.apiKey = getApiKey();
  updateConnectionStatus(!!state.apiKey);
  if (!state.apiKey) apiModal.show();

  // Panel navigation
  document.querySelectorAll("[data-panel]").forEach((el) =>
    el.addEventListener("click", () => showPanel(el.dataset.panel))
  );

  // API Key modal
  $("save-api-btn")?.addEventListener("click", saveApiKey);
  $("skip-api-btn")?.addEventListener("click", () => apiModal.hide());
  $("api-key-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") saveApiKey(); });
  document.querySelectorAll('[data-action="show-setup"]').forEach((el) =>
    el.addEventListener("click", () => apiModal.show())
  );

  // Feature buttons
  $("resume-btn")?.addEventListener("click", handleAnalyzeResume);
  $("role-fit-btn")?.addEventListener("click", handleAnalyzeRoleFit);
  $("jd-btn")?.addEventListener("click", handleMatchJD);
  $("gen-btn")?.addEventListener("click", () => handleGenerateQuestion(false));
  $("new-q-btn")?.addEventListener("click", () => handleGenerateQuestion(true));
  $("feedback-btn")?.addEventListener("click", handleGetFeedback);
  $("tips-btn")?.addEventListener("click", handleGetTips);

  // Drop zones
  initDropZone({ zoneId: "resume-drop-zone", inputId: "resume-file-input", fileNameId: "resume-file-name", onExtract: (text) => { state.resumeText = text; } });
  initDropZone({ zoneId: "jd-drop-zone",     inputId: "jd-file-input",     fileNameId: "jd-file-name",     onExtract: (text) => { state.jdResumeText = text; } });

  // History + Score Tracker
  $("clear-history-btn")?.addEventListener("click", () => {
    clearHistory();
    renderHistoryList($("history-list"));
  });
  $("clear-scores-btn")?.addEventListener("click", () => {
    clearScores();
    renderScoreTracker($("score-tracker-list"));
  });

  renderHistoryList($("history-list"));
  renderScoreTracker($("score-tracker-list"));

  // Sidebar
  const hamburger      = $("hamburger-btn");
  const sidebar        = document.querySelector(".sidebar");
  const sidebarOverlay = $("sidebar-overlay");

  hamburger?.addEventListener("click", () => {
    sidebar?.classList.contains("sidebar--open")
      ? closeSidebar(sidebar, sidebarOverlay)
      : openSidebar(sidebar, sidebarOverlay);
  });
  sidebarOverlay?.addEventListener("click", () => closeSidebar(sidebar, sidebarOverlay));
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) closeSidebar(sidebar, sidebarOverlay);
    });
  });

  // Theme — reads from storage.js, not direct localStorage
  applyTheme(getTheme() === "dark");
  $("theme-toggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
  });

  // Offline detection + Feedback widget
  initOfflineDetection();
  initFeedbackWidget();
}

document.addEventListener("DOMContentLoaded", init);
