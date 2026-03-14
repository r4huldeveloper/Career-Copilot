/**
 * app.js — Main Application Controller
 * Kyun: Single orchestrator — sab UI events, state, aur
 * component wiring yahan hoti hai. Logic components mein,
 * wiring yahan.
 */

import { initFeedbackWidget } from "./components/feedback.js";
import {
  saveSession,
  getHistory,
  clearHistory,
  getApiKey,
  setApiKey,
} from "./utils/storage.js";
import { parseMarkdown } from "./utils/markdown.js";
import { startProgress, setProgressStep } from "./components/progressBar.js";
import { initDropZone } from "./components/fileUpload.js";
import { createModal } from "./components/modal.js";
import {
  analyzeResume,
  matchJD,
  generateInterviewQuestion,
  evaluateAnswer,
  getAnswerTips,
} from "./api/groq.js";
import { CONFIG } from "./config.js";

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  apiKey: "",
  resumeText: "",
  jdResumeText: "",
  currentQuestion: "",
  questionCount: 0,
};

// ── DOM Helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $v = (id) => $(id)?.value?.trim() || "";

/**
 * Escape HTML to prevent XSS — all user input must pass through this
 * @param {string} str - Raw user input
 * @returns {string} - Safe HTML string
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
 * Show inline error message — replaces all alert() usage
 * Kyun: alert() blocks UI thread, breaks UX. Inline errors are non-blocking.
 * @param {string} elementId - ID of error display element
 * @param {string} message - Error message to display
 */
function showError(elementId, message) {
  const el = $(elementId);
  if (el) {
    el.textContent = "⚠️ " + message;
    el.classList.remove("hidden");
    el.setAttribute("role", "alert");
    setTimeout(() => el.classList.add("hidden"), 5000);
  }
}

/**
 * Show result box with parsed markdown content
 * @param {string} boxId - Result container ID
 * @param {string} contentId - Inner content element ID
 * @param {string} html - Parsed HTML to display
 */
function showResult(boxId, contentId, html) {
  const box = $(boxId);
  $(contentId).innerHTML = `<div class="prose">${html}</div>`;
  box.classList.add("result-box--visible");
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Add a chat message to the interview chat container
 * @param {string} containerId - Chat container element ID
 * @param {"ai"|"user"} role - Message sender role
 * @param {string} html - Already-escaped or AI-trusted HTML
 */
function addChatMsg(containerId, role, html) {
  const container = $(containerId);
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
 * Set button loading/idle state
 * @param {string} id - Button element ID
 * @param {boolean} disabled - Whether to disable the button
 * @param {string} [text] - Optional button label
 */
function setBtn(id, disabled, text) {
  const btn = $(id);
  if (!btn) return;
  btn.disabled = disabled;
  if (text) btn.textContent = text;
}

/**
 * Switch active panel and reset scroll
 * @param {string} name - Panel name matching data-panel attribute
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
 * Update topbar Groq connection status indicator
 * @param {boolean} connected - Whether API key is set
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
 * Validate and persist Groq API key to localStorage
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

// ── Offline Detection ─────────────────────────────────────────────────────────
// Kyun: Agar user offline hai aur AI call kare, toh network error aata tha
// bina kisi proper message ke. Ab instant feedback milta hai.

/**
 * Show or hide the offline warning banner
 * @param {boolean} offline - True if user is currently offline
 */
function setOfflineBanner(offline) {
  let banner = $("offline-banner");

  if (!banner) {
    // Create banner if not in HTML — graceful degradation
    banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "assertive");
    banner.style.cssText = `
      display:none; position:fixed; top:var(--topbar-height); left:0; right:0;
      z-index:500; background:var(--color-yellow-light);
      border-bottom:1px solid var(--color-yellow-border);
      color:#92400e; text-align:center;
      padding:var(--space-2) var(--space-4);
      font-size:var(--text-sm); font-weight:var(--weight-medium);
    `;
    banner.textContent = "⚠️ Internet nahi hai — AI features kaam nahi karenge";
    document.body.prepend(banner);
  }

  banner.style.display = offline ? "block" : "none";
}

/**
 * Initialize offline/online event listeners
 */
function initOfflineDetection() {
  setOfflineBanner(!navigator.onLine);
  window.addEventListener("online",  () => setOfflineBanner(false));
  window.addEventListener("offline", () => setOfflineBanner(true));
}

// ── Feature Handlers ──────────────────────────────────────────────────────────

/**
 * Handle Resume Analyzer button click
 */
async function handleAnalyzeResume() {
  const pastedText = $v("resume-text");
  const text = state.resumeText || pastedText;
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
  } catch (err) {
    stop();
    console.error("[app] handleAnalyzeResume:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("resume-btn", false, "🔍 Analyze Resume");
}

/**
 * Handle JD Matcher button click
 */
async function handleMatchJD() {
  const jd     = $v("jd-text");
  const resume = state.jdResumeText || $v("jd-resume-text");

  if (!jd) { showError("jd-error", "Job Description paste karo!"); return; }
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
 * Handle Generate Question button click
 * @param {boolean} [forceNew=false] - Force a different question
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
 * Handle Get AI Feedback button click
 */
async function handleGetFeedback() {
  const answer = $v("user-answer");
  if (!answer) { showError("int-error", "Pehle apna jawab likho!"); return; }

  const role = $v("int-role");
  const type = $v("int-type");

  setBtn("feedback-btn", true, "Evaluating...");
  const stop = startProgress("int-bar", "int-progress", 2500);
  $("chat-container").innerHTML = "";

  // XSS-safe — user input escaped before DOM insertion
  addChatMsg("chat-container", "user", escapeHtml(answer));

  try {
    const result = await evaluateAnswer({
      question: state.currentQuestion, answer, role, type, apiKey: state.apiKey,
    });
    stop();
    addChatMsg("chat-container", "ai", parseMarkdown(result));

    const session = {
      date: new Date().toISOString(),
      role, type,
      question: state.currentQuestion,
      answer,
      feedback: parseMarkdown(result),
      score: "N/A",
    };
    saveSession(session);
    renderHistory();
  } catch (err) {
    stop();
    console.error("[app] handleGetFeedback:", err.message);
    showError("int-error", err.message);
  }

  setBtn("feedback-btn", false, "💬 Get AI Feedback");
}

/**
 * Handle Expected Answer (Tips) button click
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

/**
 * Render interview history from localStorage
 * Uses escapeHtml on all stored user data before DOM insertion
 */
function renderHistory() {
  const container = $("history-list");
  if (!container) return;

  const history = getHistory();
  if (history.length === 0) {
    container.innerHTML = "<p>No sessions yet.</p>";
    return;
  }

  container.innerHTML = history.map((s) => `
    <div class="history-item" style="border:1px solid var(--color-border);padding:var(--space-3);margin-bottom:var(--space-3);cursor:pointer;border-radius:var(--radius);">
      <div><strong>${escapeHtml(new Date(s.date).toLocaleString())}</strong> — ${escapeHtml(s.role)}</div>
      <div class="history-details" style="display:none;margin-top:var(--space-2);">
        <p><strong>Question:</strong> ${escapeHtml(s.question)}</p>
        <p><strong>Answer:</strong> ${escapeHtml(s.answer)}</p>
        <div><strong>Feedback:</strong> ${s.feedback}</div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => {
      const details = item.querySelector(".history-details");
      if (details) details.style.display = details.style.display === "none" ? "block" : "none";
    });

    // Keyboard nav — Enter/Space to toggle history item
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.click();
      }
    });
  });
}

// ── Dark Mode ─────────────────────────────────────────────────────────────────

/**
 * Apply light or dark theme to the document
 * @param {boolean} dark - True for dark mode
 */
function applyTheme(dark) {
  const themeIcon = $("theme-icon");
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeIcon) themeIcon.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIcon) themeIcon.textContent = "🌙";
    localStorage.setItem("theme", "light");
  }
}

// ── Mobile Sidebar ────────────────────────────────────────────────────────────

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

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Bootstrap the application — runs after DOMContentLoaded
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

  // API Key modal events
  $("save-api-btn")?.addEventListener("click", saveApiKey);
  $("skip-api-btn")?.addEventListener("click", () => apiModal.hide());
  $("api-key-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") saveApiKey(); });
  document.querySelectorAll('[data-action="show-setup"]').forEach((el) =>
    el.addEventListener("click", () => apiModal.show())
  );

  // Feature buttons
  $("resume-btn")?.addEventListener("click", handleAnalyzeResume);
  $("jd-btn")?.addEventListener("click", handleMatchJD);
  $("gen-btn")?.addEventListener("click", () => handleGenerateQuestion(false));
  $("new-q-btn")?.addEventListener("click", () => handleGenerateQuestion(true));
  $("feedback-btn")?.addEventListener("click", handleGetFeedback);
  $("tips-btn")?.addEventListener("click", handleGetTips);

  // Drop zones
  initDropZone({
    zoneId: "resume-drop-zone", inputId: "resume-file-input",
    fileNameId: "resume-file-name", onExtract: (text) => { state.resumeText = text; },
  });
  initDropZone({
    zoneId: "jd-drop-zone", inputId: "jd-file-input",
    fileNameId: "jd-file-name", onExtract: (text) => { state.jdResumeText = text; },
  });

  // History
  $("clear-history-btn")?.addEventListener("click", () => { clearHistory(); renderHistory(); });
  renderHistory();

  // ── Mobile Hamburger ──────────────────────────────────
  const hamburger = $("hamburger-btn");
  const sidebar   = document.querySelector(".sidebar");
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

  // ── Dark Mode ─────────────────────────────────────────
  applyTheme(localStorage.getItem("theme") === "dark");
  $("theme-toggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
  });

  // ── Offline Detection ─────────────────────────────────
  initOfflineDetection();

  // ── Feedback Widget ───────────────────────────────────
  initFeedbackWidget();
}

document.addEventListener("DOMContentLoaded", init);
