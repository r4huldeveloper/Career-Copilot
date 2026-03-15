/**
 * storage.js — LocalStorage wrapper
 * Single source of truth for ALL browser storage.
 * Kyun: Direct localStorage calls scattered the codebase mein —
 * theme localStorage.setItem directly app.js mein tha.
 * Ab sab storage yahan se jaata hai — consistent, logged, safe.
 */

import { CONFIG } from "../config.js";

// ── Storage Keys — ek jagah, never scattered ──────────────────────────────────
const KEYS = {
  API_KEY: "cc_groq_key",
  HISTORY: "cc_interview_history",
  SCORES:  "cc_ats_scores",
  THEME:   "theme",
};

// ── Simple Encoding Helpers (avoid cleartext at rest) ────────────────────────

/**
 * Encode a string for storage.
 * Note: Uses Base64 to avoid storing sensitive values in cleartext.
 * This is not strong cryptography, but reduces direct exposure in storage.
 * @param {string} value
 * @returns {string}
 */
function encode(value) {
  try {
    // Handle UTF-8 safely before btoa
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

/**
 * Decode a value previously encoded with encode().
 * @param {string|null} value
 * @returns {string|null}
 */
function decode(value) {
  if (value == null) return value;
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    // Not encoded or corrupt; return as-is
    return value;
  }
}

// ── Core Wrapper ──────────────────────────────────────────────────────────────

/**
 * Safe localStorage wrapper with error logging
 * Kyun wrapper: Direct localStorage throws in private/incognito mode
 * aur quota exceed pe — wrapper gracefully handle karta hai
 */
export const storage = {
  /**
   * @param {string} key
   * @returns {string|null}
   */
  get(key) {
    try { return localStorage.getItem(key); }
    catch (err) { console.error("[storage] get failed:", key, err.message); return null; }
  },

  /**
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  set(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (err) { console.error("[storage] set failed:", key, err.message); return false; }
  },

  /**
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch (err) { console.error("[storage] remove failed:", key, err.message); return false; }
  },
};

// ── API Key ───────────────────────────────────────────────────────────────────

/** @returns {string} Stored Groq API key or empty string */
export const getApiKey  = () => {
  const stored = storage.get(KEYS.API_KEY);
  const decoded = decode(stored);
  return decoded || "";
};

/** @param {string} key — Groq API key to persist */
export const setApiKey  = (key) => storage.set(KEYS.API_KEY, encode(key));

/** Remove stored API key */
export const clearApiKey = () => storage.remove(KEYS.API_KEY);

// ── Theme ─────────────────────────────────────────────────────────────────────
// Kyun yahan: app.js mein localStorage.setItem("theme") directly tha —
// inconsistent. Ab sab storage ek jagah se.

/**
 * Get saved theme preference
 * @returns {"dark"|"light"|null}
 */
export const getTheme = () => storage.get(KEYS.THEME);

/**
 * Save theme preference
 * @param {"dark"|"light"} theme
 */
export const setTheme = (theme) => storage.set(KEYS.THEME, theme);

// ── Interview Session History ─────────────────────────────────────────────────

/**
 * Save interview session — capped at CONFIG.MAX_HISTORY_SESSIONS
 * Kyun cap: Unbounded growth would hit 5MB localStorage limit
 * @param {object} session — { date, role, type, question, answer, feedback, score }
 */
export function saveSession(session) {
  try {
    const raw     = storage.get(KEYS.HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(session);
    if (history.length > CONFIG.MAX_HISTORY_SESSIONS) {
      history.splice(CONFIG.MAX_HISTORY_SESSIONS);
    }
    storage.set(KEYS.HISTORY, JSON.stringify(history));
  } catch (err) {
    console.error("[storage] saveSession failed:", err.message);
  }
}

/**
 * Get all saved sessions, newest first
 * @returns {object[]}
 */
export function getHistory() {
  try {
    const raw = storage.get(KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[storage] getHistory parse failed:", err.message);
    return [];
  }
}

/** Clear all interview history */
export const clearHistory = () => storage.remove(KEYS.HISTORY);

// ── ATS Score Tracker ─────────────────────────────────────────────────────────

/**
 * Save ATS score entry after each Resume Analyzer run
 * Capped at 100 — score trend se zyada data needed nahi
 * @param {{ date: string, role: string, atsScore: number }} entry
 */
export function saveScore(entry) {
  try {
    const raw    = storage.get(KEYS.SCORES);
    const scores = raw ? JSON.parse(raw) : [];
    scores.unshift(entry);
    if (scores.length > 100) scores.splice(100);
    storage.set(KEYS.SCORES, JSON.stringify(scores));
  } catch (err) {
    console.error("[storage] saveScore failed:", err.message);
  }
}

/**
 * Get all saved ATS scores, newest first
 * @returns {{ date: string, role: string, atsScore: number }[]}
 */
export function getScores() {
  try {
    const raw = storage.get(KEYS.SCORES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[storage] getScores parse failed:", err.message);
    return [];
  }
}

/** Clear all score history */
export const clearScores = () => storage.remove(KEYS.SCORES);
