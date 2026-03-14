/**
 * storage.js — LocalStorage wrapper
 * Handles all persistent browser storage with error safety.
 * Kyun: LocalStorage directly use karna risky hai — errors
 * silently fail karte hain. Yeh wrapper safe, logged, aur consistent banata hai.
 */

import { CONFIG } from "../config.js";

const KEYS = {
  API_KEY: "cc_groq_key",
  HISTORY: "cc_interview_history",
};

/**
 * Safe localStorage wrapper with logging
 */
export const storage = {
  /**
   * Get a value from localStorage
   * @param {string} key
   * @returns {string|null}
   */
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.error("[storage] get failed:", key, err.message);
      return null;
    }
  },

  /**
   * Set a value in localStorage
   * @param {string} key
   * @param {string} value
   * @returns {boolean} - True if successful
   */
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.error("[storage] set failed:", key, err.message);
      return false;
    }
  },

  /**
   * Remove a value from localStorage
   * @param {string} key
   * @returns {boolean} - True if successful
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error("[storage] remove failed:", key, err.message);
      return false;
    }
  },
};

// ── API Key ───────────────────────────────────────────────────────────────────

/** @returns {string} Stored Groq API key or empty string */
export const getApiKey = () => storage.get(KEYS.API_KEY) || "";

/** @param {string} key - Groq API key to persist */
export const setApiKey  = (key) => storage.set(KEYS.API_KEY, key);

/** Clear stored API key */
export const clearApiKey = () => storage.remove(KEYS.API_KEY);

// ── Interview Session History ─────────────────────────────────────────────────

/**
 * Save an interview session to history
 * Caps at CONFIG.MAX_HISTORY_SESSIONS to prevent localStorage overflow
 * Kyun cap: Unlimited sessions would eventually fill localStorage (5MB limit)
 * @param {object} session - Session object with date, role, question, answer, feedback
 */
export function saveSession(session) {
  try {
    const raw = storage.get(KEYS.HISTORY);
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
 * Get all saved interview sessions, newest first
 * @returns {object[]} Array of session objects
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

/**
 * Clear all interview history from localStorage
 */
export const clearHistory = () => storage.remove(KEYS.HISTORY);
