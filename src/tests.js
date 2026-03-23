/**
 * tests.js — Edge Case Test Suite
 * Run in browser console or Node with jsdom.
 * Kyun tests: Elite codebase mein untested code nahi hota.
 * Yeh tests regressions rokenge jab contributors changes karein.
 *
 * Usage (browser):
 *   import { runTests } from "./tests.js";
 *   runTests();
 *
 * Usage (check in console):
 *   All passing tests log green ✅, failures log red ❌
 */

// ── Test Runner ───────────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;

/**
 * Assert a condition is truthy
 * @param {string} name - Test name
 * @param {boolean} condition
 */
function assert(name, condition) {
  if (condition) {
    console.log(`%c✅ ${name}`, "color: green");
    _passed++;
  } else {
    console.error(`❌ ${name}`);
    _failed++;
  }
}

/**
 * Assert two values are strictly equal
 * @param {string} name
 * @param {*} actual
 * @param {*} expected
 */
function assertEqual(name, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`%c✅ ${name}`, "color: green");
    _passed++;
  } else {
    console.error(`❌ ${name} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
    _failed++;
  }
}

// ── markdown.js tests ─────────────────────────────────────────────────────────

import { parseMarkdown } from "./utils/markdown.js";
import { sanitizeUserText, clampTextLength } from "./utils/sanitize.js";
import { callAI } from "./adapters/aiProvider.js";

function testMarkdown() {
  console.group("📝 markdown.js");

  // XSS prevention — most critical
  const xssInput  = '<script>alert("xss")</script>';
  const xssOutput = parseMarkdown(xssInput);
  assert("XSS: script tag escaped", !xssOutput.includes("<script>"));
  assert("XSS: &lt; present", xssOutput.includes("&lt;"));

  // Headings
  const h2 = parseMarkdown("## Hello World");
  assert("H2 renders", h2.includes("<h2>Hello World</h2>"));

  const h3 = parseMarkdown("### Sub heading");
  assert("H3 renders", h3.includes("<h3>Sub heading</h3>"));

  // Bold
  const bold = parseMarkdown("**important**");
  assert("Bold renders", bold.includes("<strong>important</strong>"));

  // List items
  const list = parseMarkdown("- item one\n- item two");
  assert("List items render", list.includes("<li>item one</li>"));
  assert("List wrapped in ul", list.includes("<ul>"));

  // Empty input
  assertEqual("Empty string returns empty", parseMarkdown(""), "");
  assertEqual("Null-ish returns empty", parseMarkdown(null), "");

  // No double-wrapping of lists
  const multiList = parseMarkdown("- a\n- b\n- c");
  const ulCount = (multiList.match(/<ul>/g) || []).length;
  assertEqual("Single ul wrap for consecutive items", ulCount, 1);

  console.groupEnd();
}

// ── storage.js tests ──────────────────────────────────────────────────────────

import {
  getApiKey, setApiKey, clearApiKey,
  saveSession, getHistory, clearHistory,
  saveScore, getScores, clearScores,
  getTheme, setTheme,
  getProvider, setProvider,
  getModel, setModel,
} from "./utils/storage.js";

function testStorage() {
  console.group("💾 storage.js");

  // Cleanup before tests
  clearApiKey();
  clearHistory();
  clearScores();

  // API Key
  assertEqual("getApiKey empty initially", getApiKey(), "");
  setApiKey("gsk_testkey123");
  assertEqual("setApiKey + getApiKey round-trip", getApiKey(), "gsk_testkey123");
  clearApiKey();
  assertEqual("clearApiKey resets to empty", getApiKey(), "");

  // Theme
  setTheme("dark");
  assertEqual("setTheme dark", getTheme(), "dark");
  setTheme("light");
  assertEqual("setTheme light", getTheme(), "light");

  // History
  assertEqual("getHistory empty initially", getHistory().length, 0);

  saveSession({ date: new Date().toISOString(), role: "APM", type: "Behavioral", question: "Q1", answer: "A1", feedback: "F1", score: "N/A" });
  assertEqual("saveSession adds 1", getHistory().length, 1);

  saveSession({ date: new Date().toISOString(), role: "BA", type: "Case", question: "Q2", answer: "A2", feedback: "F2", score: "N/A" });
  assertEqual("saveSession adds 2", getHistory().length, 2);

  // Newest first
  assertEqual("Newest session first", getHistory()[0].role, "BA");

  // History cap at MAX_HISTORY_SESSIONS
  clearHistory();
  for (let i = 0; i < 55; i++) {
    saveSession({ date: new Date().toISOString(), role: `Role ${i}`, type: "T", question: "Q", answer: "A", feedback: "F", score: "N/A" });
  }
  assert("History capped at 50", getHistory().length <= 50);

  clearHistory();
  assertEqual("clearHistory empties", getHistory().length, 0);

  // Scores
  assertEqual("getScores empty initially", getScores().length, 0);

  saveScore({ date: new Date().toISOString(), role: "APM", atsScore: 7 });
  assertEqual("saveScore adds 1", getScores().length, 1);

  saveScore({ date: new Date().toISOString(), role: "BA", atsScore: 9 });
  assertEqual("saveScore adds 2", getScores().length, 2);
  assertEqual("Latest score first", getScores()[0].atsScore, 9);

  clearScores();
  assertEqual("clearScores empties", getScores().length, 0);

  console.groupEnd();
}

// ── provider + model storage tests ───────────────────────────────────────────

function testProviderStorage() {
  console.group("🔌 provider + model storage");

  // Default provider
  localStorage.removeItem("cc_provider");
  localStorage.removeItem("cc_model");
  assertEqual("getProvider default is groq", getProvider(), "groq");

  // setProvider / getProvider round-trip
  setProvider("openai");
  assertEqual("setProvider openai", getProvider(), "openai");

  setProvider("gemini");
  assertEqual("setProvider gemini", getProvider(), "gemini");

  setProvider("mistral");
  assertEqual("setProvider mistral", getProvider(), "mistral");

  // Reset to groq for model tests
  setProvider("groq");

  // getModel falls back to provider defaultModel when nothing saved
  localStorage.removeItem("cc_model");
  const defaultModel = getModel();
  assert("getModel returns non-empty default", defaultModel.length > 0);

  // setModel / getModel round-trip
  setModel("llama-3.1-8b-instant");
  assertEqual("setModel + getModel round-trip", getModel(), "llama-3.1-8b-instant");

  // Cross-provider bleed prevention — saved Groq model should NOT
  // be returned when provider is switched to OpenAI
  setProvider("openai");
  const modelAfterSwitch = getModel();
  assert(
    "Cross-provider bleed: groq model not returned for openai",
    modelAfterSwitch !== "llama-3.1-8b-instant"
  );
  assert("OpenAI default model returned instead", modelAfterSwitch.length > 0);

  // Cleanup
  localStorage.removeItem("cc_provider");
  localStorage.removeItem("cc_model");

  console.groupEnd();
}

// ── v0.2.0 → v0.3.1 migration test ───────────────────────────────────────────

function testV02Migration() {
  console.group("🔄 v0.2.0 → v0.3.1 migration");

  // Simulate v0.2.0 state: key stored under old name
  localStorage.removeItem("cc_api_key");
  localStorage.removeItem("cc_provider");
  localStorage.setItem("cc_groq_key", btoa(unescape(encodeURIComponent("gsk_migrated_key"))));

  // Re-import won't re-run, so manually invoke the migration logic here
  try {
    const oldKey = localStorage.getItem("cc_groq_key");
    if (oldKey && !localStorage.getItem("cc_api_key")) {
      localStorage.setItem("cc_api_key", oldKey);
      if (!localStorage.getItem("cc_provider")) {
        localStorage.setItem("cc_provider", "groq");
      }
    }
    localStorage.removeItem("cc_groq_key");
  } catch { /* silent */ }

  assert("Old cc_groq_key removed after migration", !localStorage.getItem("cc_groq_key"));
  assert("New cc_api_key present after migration",  !!localStorage.getItem("cc_api_key"));
  assertEqual("Provider set to groq after migration", localStorage.getItem("cc_provider"), "groq");
  assertEqual("getApiKey returns migrated key", getApiKey(), "gsk_migrated_key");

  // Cleanup
  clearApiKey();
  localStorage.removeItem("cc_provider");

  console.groupEnd();
}
// Tests for parseAtsScore logic (inline — not exported, so we replicate logic)

function parseAtsScore(text) {
  const match = text.match(/ATS\s*SCORE[:\s]*(\d+)\s*\/\s*10/i);
  return match ? parseInt(match[1], 10) : null;
}

function testAtsScoreParser() {
  console.group("📊 ATS Score Parser");

  assertEqual("Standard format", parseAtsScore("## 📊 ATS SCORE: 7/10"), 7);
  assertEqual("With spaces", parseAtsScore("ATS SCORE : 8 / 10"), 8);
  assertEqual("Lowercase", parseAtsScore("ats score: 6/10"), 6);
  assertEqual("Score 10", parseAtsScore("ATS SCORE: 10/10"), 10);
  assertEqual("Score 1", parseAtsScore("ATS SCORE: 1/10"), 1);
  assertEqual("No score returns null", parseAtsScore("No score here"), null);
  assertEqual("Empty string returns null", parseAtsScore(""), null);

  console.groupEnd();
}

// ── sanitize.js tests ─────────────────────────────────────────────────────────

function testSanitizeUserText() {
  console.group("🧹 sanitize.js");

  assertEqual("Remove control chars", sanitizeUserText("abc\x00\x1Fdef"), "abcdef");
  assertEqual("Trim spaces", sanitizeUserText("  hello  "), "hello");
  assertEqual("Non-string returns empty", sanitizeUserText(123), "");
  assertEqual("No change when clean", sanitizeUserText("fine text"), "fine text");

  assertEqual("clampTextLength caps length", clampTextLength("123456", 4), "1234");
  assertEqual("clampTextLength no change if short", clampTextLength("abc", 10), "abc");

  console.groupEnd();
}

// ── callGroq circuit breaker tests ─────────────────────────────────────────────

async function testCircuitBreaker() {
  console.group("🛡️ Circuit breaker (aiProvider)");

  const originalFetch = window.fetch;
  let attempts = 0;

  window.fetch = async () => {
    attempts += 1;
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: { message: "Service unavailable" } }),
    };
  };

  let firstError = false;
  try {
    await callAI("x", "y", "gsk_test");
  } catch (err) {
    firstError = true;
  }
  assert("First failure throws", firstError);

  // Hit failure threshold (5 failures)
  for (let i = 0; i < 5; i++) {
    try { await callAI("x", "y", "gsk_test"); } catch (e) { /* noop */ }
  }

  let breakerTriggered = false;
  try {
    await callAI("x", "y", "gsk_test");
  } catch (err) {
    breakerTriggered = err.message.includes("mein available hoga");
  }
  assert("Circuit breaker opens after repeated failures", breakerTriggered);

  window.fetch = originalFetch;
  console.groupEnd();
}

// ── escapeHtml tests ──────────────────────────────────────────────────────────
// Tests for XSS prevention (inline — replicate logic)

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function testEscapeHtml() {
  console.group("🔒 escapeHtml (XSS prevention)");

  assertEqual("& escaped",  escapeHtml("a & b"),     "a &amp; b");
  assertEqual("< escaped",  escapeHtml("<script>"),   "&lt;script&gt;");
  assertEqual("> escaped",  escapeHtml(">div<"),      "&gt;div&lt;");
  assertEqual('" escaped',  escapeHtml('"value"'),    "&quot;value&quot;");
  assertEqual("' escaped",  escapeHtml("it's"),       "it&#039;s");
  assertEqual("Full XSS",   escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assertEqual("Numbers pass through", escapeHtml("123"), "123");
  assertEqual("Empty string", escapeHtml(""), "");
  // Non-string coerced
  assertEqual("Number coerced", escapeHtml(42), "42");

  console.groupEnd();
}

// ── scoreTracker.js tests ─────────────────────────────────────────────────────

import { renderScoreTracker } from "./components/scoreTracker.js";

function testScoreTracker() {
  console.group("📈 scoreTracker.js");

  clearScores();

  // Empty state
  const emptyDiv = document.createElement("div");
  renderScoreTracker(emptyDiv);
  assert("Empty state renders empty message", emptyDiv.innerHTML.includes("score-tracker__empty"));

  // With scores
  saveScore({ date: new Date().toISOString(), role: "APM", atsScore: 8 });
  saveScore({ date: new Date().toISOString(), role: "BA",  atsScore: 6 });

  const filledDiv = document.createElement("div");
  renderScoreTracker(filledDiv);
  assert("Stats section renders", filledDiv.innerHTML.includes("score-tracker__stats"));
  assert("List renders", filledDiv.innerHTML.includes("score-tracker__list"));
  assert("Latest badge on first", filledDiv.innerHTML.includes("LATEST"));
  assert("Role name present", filledDiv.innerHTML.includes("APM") || filledDiv.innerHTML.includes("BA"));

  // XSS in stored role name
  clearScores();
  saveScore({ date: new Date().toISOString(), role: '<script>alert("xss")</script>', atsScore: 5 });
  const xssDiv = document.createElement("div");
  renderScoreTracker(xssDiv);
  assert("XSS in role name escaped", !xssDiv.innerHTML.includes("<script>"));

  // Null container — should not throw
  let threw = false;
  try { renderScoreTracker(null); } catch { threw = true; }
  assert("Null container does not throw", !threw);

  clearScores();
  console.groupEnd();
}

// ── historyList.js tests ──────────────────────────────────────────────────────

import { renderHistoryList } from "./components/historyList.js";

function testHistoryList() {
  console.group("📜 historyList.js");

  clearHistory();

  // Empty state
  const emptyDiv = document.createElement("div");
  renderHistoryList(emptyDiv);
  assert("Empty state renders message", emptyDiv.innerHTML.includes("history-list__empty"));

  // With sessions
  saveSession({ date: new Date().toISOString(), role: "APM", type: "Behavioral", question: "Q?", answer: "My answer", feedback: "<p>Good</p>", score: "N/A" });

  const filledDiv = document.createElement("div");
  renderHistoryList(filledDiv);
  assert("History item renders", filledDiv.innerHTML.includes("history-item"));
  assert("Role shown", filledDiv.innerHTML.includes("APM"));
  assert("Details hidden by default", filledDiv.innerHTML.includes('hidden'));
  assert("Keyboard tabindex set", filledDiv.innerHTML.includes('tabindex="0"'));
  assert("Aria-expanded set", filledDiv.innerHTML.includes('aria-expanded="false"'));

  // XSS in stored question
  clearHistory();
  saveSession({ date: new Date().toISOString(), role: "BA", type: "T", question: '<img src=x onerror="xss">', answer: "ans", feedback: "fb", score: "N/A" });
  const xssDiv = document.createElement("div");
  renderHistoryList(xssDiv);
  assert("XSS in question escaped", !xssDiv.innerHTML.includes('<img src=x onerror'));

  // Null container — should not throw
  let threw = false;
  try { renderHistoryList(null); } catch { threw = true; }
  assert("Null container does not throw", !threw);

  clearHistory();
  console.groupEnd();
}

// ── statsPanel.js tests ───────────────────────────────────────────────────────

import { stripRelativeTime } from "./components/statsPanel.js";

function testStatsPanel() {
  console.group("📊 statsPanel.js");

  // stripRelativeTime
  assertEqual("just now under 60s",    stripRelativeTime(Date.now() - 30_000),    'just now');
  assertEqual("2m ago",                stripRelativeTime(Date.now() - 120_000),   '2m ago');
  assertEqual("1h ago",                stripRelativeTime(Date.now() - 3_600_000), '1h ago');
  assertEqual("2h ago",                stripRelativeTime(Date.now() - 7_200_000), '2h ago');

  console.groupEnd();
}

// ── roastLogic.js tests ───────────────────────────────────────────────────────

import { parseRoast } from "./core/logic/roastLogic.js";

function testRoastParser() {
  console.group("🔥 roastLogic.js — parseRoast()");

  // Happy path — all 5 fields present
  const full = `
ROAST_LINE_1: Team player likha hai — bhai, sab likhte hain.
ROAST_LINE_2: "Managed 100+ projects" — ek saath 100 Netflix series bhi dekhi kya?
ROAST_LINE_3: Skills mein MS Word likha hai — bhai, 2024 mein yeh flex nahi hai.
HOPE_LINE: Par seriously, tu yahan hai — yahi cheez tujhe alag karti hai!
ROAST_TITLE: The Copy-Paste King
  `.trim();

  const r1 = parseRoast(full);
  assertEqual("Happy path: 3 lines parsed",   r1.lines.length, 3);
  assert("Happy path: line 1 non-empty",       r1.lines[0].length > 0);
  assert("Happy path: line 2 non-empty",       r1.lines[1].length > 0);
  assert("Happy path: line 3 non-empty",       r1.lines[2].length > 0);
  assert("Happy path: hopeL non-empty",        r1.hopeL.length > 0);
  assert("Happy path: title non-empty",        r1.title.length > 0);
  assert("Happy path: title correct",          r1.title.includes('Copy-Paste'));

  // Missing fields — graceful degradation, must not throw
  let threw = false;
  let r2;
  try { r2 = parseRoast("No labels here at all"); } catch { threw = true; }
  assert("Malformed input does not throw",     !threw);
  assert("Malformed: lines array returned",    Array.isArray(r2?.lines));

  // Null / empty input — must not throw
  let r3, r4;
  try { r3 = parseRoast(null); }  catch { threw = true; }
  try { r4 = parseRoast(''); }    catch { threw = true; }
  assert("Null input does not throw",          !threw);
  assert("Empty string does not throw",        !threw);
  assertEqual("Null returns empty lines",      r3?.lines?.length ?? 0, 0);
  assertEqual("Empty returns empty lines",     r4?.lines?.length ?? 0, 0);

  // Partial output — only 1 line present
  const partial = `ROAST_LINE_1: Only one roast line here.`;
  const r5 = parseRoast(partial);
  assertEqual("Partial: 1 line parsed",        r5.lines.length, 1);
  assertEqual("Partial: hopeL empty",          r5.hopeL, '');
  assertEqual("Partial: title empty",          r5.title, '');

  // Fallback pattern — lowercase labels
  const lower = `
roast_line_1: lowercase label test
hope_line: lowercase hope
roast_title: lowercase title
  `.trim();
  const r6 = parseRoast(lower);
  assert("Fallback: lowercase label parsed",   r6.lines.length >= 1);

  console.groupEnd();
}

// ── Main Runner ───────────────────────────────────────────────────────────────

/**
 * Run all tests and print summary
 * @returns {{ passed: number, failed: number }}
 */
export async function runTests() {
  _passed = 0;
  _failed = 0;

  console.group("🧪 Career Copilot — Test Suite");
  console.log("Running edge case tests...\n");

  testMarkdown();
  testStorage();
  testProviderStorage();
  testV02Migration();
  testAtsScoreParser();
  testSanitizeUserText();
  await testCircuitBreaker();
  testEscapeHtml();
  testScoreTracker();
  testHistoryList();
  testStatsPanel();
  testRoastParser();

  console.groupEnd();

  const total = _passed + _failed;
  if (_failed === 0) {
    console.log(`%c\n✅ All ${total} tests passed`, "color: green; font-weight: bold; font-size: 14px");
  } else {
    console.error(`\n❌ ${_failed} failed, ${_passed} passed (${total} total)`);
  }

  return { passed: _passed, failed: _failed };
}
