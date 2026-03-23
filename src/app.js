/**
 * app.js — Application Shell / Orchestrator
 *
 * AI_RULES compliance:
 *   Rule 1 — UI Shell only: wires events, manages DOM state, delegates all
 *             business logic to Pure Logic Layer (src/core/logic/*).
 *   Rule 2 — Structural Lock: zero CSS class / HTML ID changes ever made here.
 *   Rule 3 — Atomic: each handler is a thin bridge — logic lives elsewhere.
 *
 * This file's only job:
 *   1. Listen for user events.
 *   2. Read DOM inputs.
 *   3. Call Pure Logic Layer with plain data.
 *   4. Render returned data into the DOM.
 *   5. Handle loading/error states.
 *
 * Business rules, validation thresholds, AI calls, storage writes —
 * none of these live here anymore.
 */

import { initFeedbackWidget }               from "./components/feedback.js";
import { initStatsPanel, trackEvent }       from "./components/statsPanel.js";
import { renderRoastCard }                  from "./components/roastCard.js";
import { renderScoreTracker }               from "./components/scoreTracker.js";
import { renderHistoryList }                from "./components/historyList.js";
import {
  getApiKey, setApiKey, clearApiKey,
  getProvider, setProvider,
  getModel, setModel,
  clearHistory, clearScores,
  getTheme, setTheme,
}                                           from "./utils/storage.js";
import { parseMarkdown }                    from "./utils/markdown.js";
import { sanitizeUserText }                 from "./utils/sanitize.js";
import { startProgress, setProgressStep }   from "./components/progressBar.js";
import { initDropZone }                     from "./components/fileUpload.js";
import { initProviderPage }                 from "./components/providerPage.js";
import { resetBreaker }                     from "./adapters/aiProvider.js";
import { CONFIG }                           from "./config.js";

// Pure Logic Layer imports (AI_RULES Rule 1 — Abstract Intelligence Core)
import { runResumeAnalysis, runRoleFitAnalysis } from "./core/logic/resumeLogic.js";
import { runJdMatch }                            from "./core/logic/jdLogic.js";
import { runRoastAnalysis }                      from "./core/logic/roastLogic.js";
import {
  runGenerateQuestion,
  runEvaluateAnswer,
  runGetAnswerTips,
}                                                from "./core/logic/interviewLogic.js";

// UI-only state — no business data, no AI results stored here
const state = {
  apiKey:          "",
  provider:        "",
  model:           "",
  resumeText:      "",
  jdResumeText:    "",
  currentQuestion: "",
  questionCount:   0,
};

// DOM Helpers
const $ = (id) => document.getElementById(id);
const $v = (id) => $(id)?.value?.trim() || "";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(elementId, message) {
  const el = $(elementId);
  if (!el) return;
  el.textContent = "⚠️ " + message;
  el.classList.remove("hidden");
  el.setAttribute("role", "alert");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function showResult(boxId, contentId, html) {
  const box = $(boxId);
  if (!box) return;
  $(contentId).innerHTML = `<div class="prose">${html}</div>`;
  box.classList.add("result-box--visible");
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setBtn(id, disabled, text) {
  const btn = $(id);
  if (!btn) return;
  btn.disabled = disabled;
  if (text) btn.textContent = text;
}

function showPanel(name) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("panel--active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("nav-item--active"));
  $("panel-" + name)?.classList.add("panel--active");
  $("nav-" + name)?.classList.add("nav-item--active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

// API Key + Provider
function updateConnectionStatus(connected) {
  const dot      = $("api-dot");
  const statusEl = $("api-status");
  const card     = $("sidebar-api-card");

  if (connected) {
    const provider = CONFIG.PROVIDERS[getProvider()];
    const label    = provider ? `${provider.name} Connected` : "Connected";
    dot?.classList.add("topbar__status-dot--connected");
    if (statusEl) {
      statusEl.textContent = label;
      statusEl.classList.add("topbar__status--connected");
    }
    card?.classList.add("hidden");
  } else {
    dot?.classList.remove("topbar__status-dot--connected");
    if (statusEl) {
      statusEl.textContent = "API not connected";
      statusEl.classList.remove("topbar__status--connected");
    }
    card?.classList.remove("hidden");
  }
}

function initApiSettingsPage() {
  const providerGrid = $("provider-grid");
  const modelGrid    = $("model-grid");
  const keyPanel     = $("key-panel");

  if (!providerGrid || !modelGrid || !keyPanel) return;

  initProviderPage({
    providerGrid,
    modelGrid,
    keyPanel,
    onSave(providerId, modelId, apiKey) {
      setProvider(providerId);
      setModel(modelId);
      setApiKey(apiKey);
      state.apiKey   = apiKey;
      state.provider = providerId;
      state.model    = modelId;
      resetBreaker(providerId);
      updateConnectionStatus(true);
    },
    onDisconnect() {
      clearApiKey();
      state.apiKey = "";
      updateConnectionStatus(false);
    },
  });
}

// Offline Banner
function setOfflineBanner(offline) {
  let banner = $("offline-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "assertive");
    banner.className = "offline-banner";
    banner.textContent = "⚠️ Internet nahi hai — AI features kaam nahi karenge";
    document.body.prepend(banner);
  }
  if (offline) {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function initOfflineDetection() {
  setOfflineBanner(!navigator.onLine);
  window.addEventListener("online",  () => setOfflineBanner(false));
  window.addEventListener("offline", () => setOfflineBanner(true));
}

// Dark Mode
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

// Sidebar
function openSidebar(sidebar, overlay) {
  sidebar?.classList.add("sidebar--open");
  overlay?.classList.add("sidebar-overlay--visible");
}
function closeSidebar(sidebar, overlay) {
  sidebar?.classList.remove("sidebar--open");
  overlay?.classList.remove("sidebar-overlay--visible");
}

// Feature Handlers — thin UI bridges to Pure Logic Layer

async function handleAnalyzeResume() {
  const rawText = state.resumeText || $v("resume-text");
  const role    = sanitizeUserText($v("resume-role"));

  setBtn("resume-btn", true, "Analyzing...");
  setProgressStep(["rs-1", "rs-2", "rs-3", "rs-4"], 2);
  const stop = startProgress("resume-bar", "resume-progress", 3000);

  try {
    const { result } = await runResumeAnalysis({
      resumeText: rawText,
      targetRole: role,
      apiKey:     state.apiKey,
    });
    stop();
    setProgressStep(["rs-1", "rs-2", "rs-3", "rs-4"], 4);

    // Hide role-fit result, show only resume result
    $("role-fit-result")?.classList.add("hidden");
    $("role-fit-result")?.classList.remove("result-box--visible");
    showResult("resume-result", "resume-result-content", parseMarkdown(result));
    renderScoreTracker($("score-tracker-list"));
    initStatsPanel();
    trackEvent('resume', sanitizeUserText($v("resume-role")), getModel());
    // Reveal roast button after analysis
    const roastRow = $("roast-trigger-row");
    if (roastRow) { roastRow.style.display = "block"; roastRow.classList.remove("hidden"); }

  } catch (err) {
    stop();
    console.error("[app] handleAnalyzeResume:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("resume-btn", false, "🔍 Analyze Resume");
}

async function handleAnalyzeRoleFit() {
  const rawText = state.resumeText || $v("resume-text");

  setBtn("role-fit-btn", true, "Finding Best Roles...");
  const stop = startProgress("role-fit-bar", "role-fit-progress", 4000);

  try {
    const result = await runRoleFitAnalysis({
      resumeText: rawText,
      apiKey:     state.apiKey,
    });
    stop();

    // Hide resume result, show only role-fit result
    $("resume-result")?.classList.remove("result-box--visible");
    $("role-fit-result")?.classList.remove("hidden");
    showResult("role-fit-result", "role-fit-result-content", parseMarkdown(result));

  } catch (err) {
    stop();
    console.error("[app] handleAnalyzeRoleFit:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("role-fit-btn", false, "🎯 Find Best Roles");
}

async function handleRoastResume() {
  const rawText = state.resumeText || $v("resume-text");
  const role    = sanitizeUserText($v("resume-role"));

  setBtn("roast-btn", true, "🔥 Roasting...");

  try {
    const roastData = await runRoastAnalysis({
      resumeText: rawText,
      targetRole: role,
      apiKey    : state.apiKey,
    });
    const scores   = (await import("./utils/storage.js")).getScores();
    const atsScore = scores.length ? scores[0].atsScore : null;
    renderRoastCard({ ...roastData, targetRole: role, atsScore });
  } catch (err) {
    console.error("[app] handleRoastResume:", err.message);
    showError("resume-error", err.message);
  }

  setBtn("roast-btn", false, "🔥 Roast My Resume");
}

async function handleMatchJD() {
  const jdText     = $v("jd-text");
  const resumeText = state.jdResumeText || $v("jd-resume-text");

  setBtn("jd-btn", true, "Matching...");
  const stop = startProgress("jd-bar", "jd-progress", 3000);

  try {
    const result = await runJdMatch({ jdText, resumeText, apiKey: state.apiKey });
    stop();
    showResult("jd-result", "jd-result-content", parseMarkdown(result));
    trackEvent('jd', 'JD Match', getModel());
  } catch (err) {
    stop();
    console.error("[app] handleMatchJD:", err.message);
    showError("jd-error", err.message);
  }

  setBtn("jd-btn", false, "🎯 Match Karo & Analyze");
}

async function handleGenerateQuestion(forceNew = false) {
  const role = $v("int-role");
  const type = $v("int-type");

  $("chat-container").innerHTML = "";
  $("user-answer").value = "";
  $("answer-section").classList.add("hidden");
  $("question-box").classList.remove("question-box--visible");
  setBtn("gen-btn", true, "Thinking...");

  try {
    const { question, difficulty, focus } = await runGenerateQuestion({
      role, type, forceNew, count: ++state.questionCount, apiKey: state.apiKey,
    });

    state.currentQuestion = question;
    $("question-text").textContent = question;
    $("question-tags").innerHTML = `
      <span class="tag tag--blue">${escapeHtml(type.split("—")[0].trim())}</span>
      <span class="tag tag--yellow">${escapeHtml(difficulty)}</span>
      ${focus ? `<span class="tag tag--purple">${escapeHtml(focus)}</span>` : ""}
    `;
    $("question-box").classList.add("question-box--visible");
    $("answer-section").classList.remove("hidden");
    $("answer-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("[app] handleGenerateQuestion:", err.message);
    showError("int-error", err.message);
  }

  setBtn("gen-btn", false, "❓ Generate Question");
}

async function handleGetFeedback() {
  const answer = $v("user-answer");
  const role   = $v("int-role");
  const type   = $v("int-type");

  setBtn("feedback-btn", true, "Evaluating...");
  const stop = startProgress("int-bar", "int-progress", 2500);
  $("chat-container").innerHTML = "";
  addChatMsg("chat-container", "user", escapeHtml(answer));

  try {
    const { rawMarkdown } = await runEvaluateAnswer({
      question: state.currentQuestion, answer, role, type,
      apiKey: state.apiKey,
      parseMarkdown,
    });
    stop();
    addChatMsg("chat-container", "ai", parseMarkdown(rawMarkdown));
    renderHistoryList($("history-list"));
    trackEvent('interview', $v("int-role"), getModel());
  } catch (err) {
    stop();
    console.error("[app] handleGetFeedback:", err.message);
    showError("int-error", err.message);
  }

  setBtn("feedback-btn", false, "💬 Get AI Feedback");
}

async function handleGetTips() {
  const role = $v("int-role");
  const type = $v("int-type");

  setBtn("tips-btn", true, "Loading...");
  const stop = startProgress("int-bar", "int-progress", 2500);
  $("chat-container").innerHTML = "";

  try {
    const { rawMarkdown } = await runGetAnswerTips({
      question: state.currentQuestion, role, type, apiKey: state.apiKey,
    });
    stop();
    addChatMsg("chat-container", "ai", parseMarkdown(rawMarkdown));
  } catch (err) {
    stop();
    console.error("[app] handleGetTips:", err.message);
    showError("int-error", err.message);
  }

  setBtn("tips-btn", false, "📋 Expected Answer");
}

// Init
function init() {
  state.apiKey   = getApiKey();
  state.provider = getProvider();

  updateConnectionStatus(!!state.apiKey);

  // Panel navigation
  document.querySelectorAll("[data-panel]").forEach((el) =>
    el.addEventListener("click", () => {
      showPanel(el.dataset.panel);
      if (el.dataset.panel === "apikey") initApiSettingsPage();
    })
  );

  // data-action="show-setup" → go to API & Provider page
  document.querySelectorAll('[data-action="show-setup"]').forEach((el) =>
    el.addEventListener("click", () => {
      showPanel("apikey");
      initApiSettingsPage();
    })
  );

  // Topbar status click → API & Provider page
  $("api-status")?.addEventListener("click", () => { showPanel("apikey"); initApiSettingsPage(); });
  $("api-dot")?.addEventListener("click",    () => { showPanel("apikey"); initApiSettingsPage(); });

  // Feature buttons
  $("resume-btn")?.addEventListener("click", handleAnalyzeResume);
  $("role-fit-btn")?.addEventListener("click", handleAnalyzeRoleFit);
  $("roast-btn")?.addEventListener("click", handleRoastResume);
  $("jd-btn")?.addEventListener("click", handleMatchJD);
  $("gen-btn")?.addEventListener("click", () => handleGenerateQuestion(false));
  $("new-q-btn")?.addEventListener("click", () => handleGenerateQuestion(true));
  $("feedback-btn")?.addEventListener("click", handleGetFeedback);
  $("tips-btn")?.addEventListener("click", handleGetTips);

  initDropZone({ zoneId: "resume-drop-zone", inputId: "resume-file-input", fileNameId: "resume-file-name", onExtract: (text) => { state.resumeText = text; } });
  initDropZone({ zoneId: "jd-drop-zone",     inputId: "jd-file-input",     fileNameId: "jd-file-name",     onExtract: (text) => { state.jdResumeText = text; } });

  $("clear-history-btn")?.addEventListener("click", () => { clearHistory(); renderHistoryList($("history-list")); });
  $("clear-scores-btn")?.addEventListener("click",  () => { clearScores();  renderScoreTracker($("score-tracker-list")); });

  renderHistoryList($("history-list"));
  renderScoreTracker($("score-tracker-list"));
  initStatsPanel();

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

  applyTheme(getTheme() === "dark");
  $("theme-toggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") !== "dark");
  });

  initOfflineDetection();
  initFeedbackWidget();

  // New user (no API key) → show a subtle banner, NOT force redirect.
  // User lands on Home first — if they want to connect, sidebar "API & Models" is right there.
  // initApiSettingsPage() is called lazily only when user navigates to panel-apikey.
  if (!state.apiKey) {
    // Sidebar API missing card is already visible (HTML default) — no extra action needed.
    // Do NOT redirect away from home. User should see what the app does first.
  }
}

document.addEventListener("DOMContentLoaded", init);
