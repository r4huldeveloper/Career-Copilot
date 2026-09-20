/**
 * storage.js — LocalStorage wrapper
 * Single source of truth for ALL browser storage.
 * All keys defined once here — never scattered across files.
 */

import { CONFIG } from "../config.js";

// ── Backward Compatibility — v0.2.0 → v0.3.1 migration ──────────────────────
// v0.2.0 stored API key under "cc_groq_key".
// v0.3.1 changed to "cc_api_key" (provider-agnostic).
// On first load after upgrade: migrate old key silently, then delete old key.
// This runs once — after migration cc_groq_key is gone.

function _migrateV02Key() {
  try {
    const oldKey = localStorage.getItem("cc_groq_key");
    if (!oldKey) return;
    const newKey = localStorage.getItem("cc_api_key");
    if (!newKey) {
      // Migrate old key to new location
      localStorage.setItem("cc_api_key", oldKey);
      // Also set provider to groq since that's what they were using
      if (!localStorage.getItem("cc_provider")) {
        localStorage.setItem("cc_provider", "groq");
      }
    }
    // Always remove old key after migration attempt
    localStorage.removeItem("cc_groq_key");
  } catch { /* silent — private mode */ }
}

// Run migration immediately on module load
_migrateV02Key();

// ── Storage Keys ──────────────────────────────────────────────────────────────
const KEYS = {
  API_KEY:  "cc_api_key",      // encoded API key (provider-agnostic)
  PROVIDER: "cc_provider",     // selected provider id e.g. "groq"
  MODEL:    "cc_model",        // selected model id e.g. "openai/gpt-oss-120b"
  HISTORY:  "cc_interview_history",
  SCORES:   "cc_ats_scores",
  THEME:    "theme",
};

// ── Encoding Helpers ──────────────────────────────────────────────────────────
// Base64 to avoid cleartext API keys at rest. Not cryptography — just obfuscation.

function encode(value) {
  try { return btoa(unescape(encodeURIComponent(value))); }
  catch { return value; }
}

function decode(value) {
  if (value == null) return value;
  try { return decodeURIComponent(escape(atob(value))); }
  catch { return value; }
}

// ── Core Wrapper ──────────────────────────────────────────────────────────────
// Gracefully handles private/incognito mode and quota exceed errors.

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); }
    catch (err) { console.error("[storage] get failed:", key, err.message); return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (err) { console.error("[storage] set failed:", key, err.message); return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch (err) { console.error("[storage] remove failed:", key, err.message); return false; }
  },
};

// ── API Key ───────────────────────────────────────────────────────────────────

/** @returns {string} Stored API key or empty string */
export const getApiKey   = () => decode(storage.get(KEYS.API_KEY)) || "";

/** @param {string} key — API key to persist (encoded) */
export const setApiKey   = (key) => storage.set(KEYS.API_KEY, encode(key));

/** Remove stored API key */
export const clearApiKey = () => storage.remove(KEYS.API_KEY);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Get saved provider id
 * @returns {string} e.g. "groq" | "openai" | "gemini" | "mistral"
 */
export const getProvider = () => storage.get(KEYS.PROVIDER) || CONFIG.DEFAULT_PROVIDER;

/**
 * Save provider id
 * @param {string} providerId
 */
export const setProvider = (providerId) => storage.set(KEYS.PROVIDER, providerId);

// ── Model ─────────────────────────────────────────────────────────────────────

/**
 * Get saved model id for current provider
 * Falls back to provider's defaultModel if not set
 * @returns {string}
 */
export function getModel() {
  const provider  = getProvider();
  const saved     = storage.get(KEYS.MODEL);
  const providerCfg = CONFIG.PROVIDERS[provider];
  if (!providerCfg) return "";
  // Validate saved model belongs to current provider — prevents cross-provider bleed
  const validIds = providerCfg.models.map((m) => m.id);
  if (saved && validIds.includes(saved)) return saved;
  return providerCfg.defaultModel || "";
}

/**
 * Save model id
 * @param {string} modelId
 */
export const setModel = (modelId) => storage.set(KEYS.MODEL, modelId);

// ── Theme ─────────────────────────────────────────────────────────────────────

/** @returns {"dark"|"light"|null} */
export const getTheme = () => storage.get(KEYS.THEME);

/** @param {"dark"|"light"} theme */
export const setTheme = (theme) => storage.set(KEYS.THEME, theme);

// ── Interview Session History ─────────────────────────────────────────────────

/**
 * Save interview session — capped at CONFIG.MAX_HISTORY_SESSIONS
 * @param {object} session
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

/** @returns {object[]} All sessions, newest first */
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
 * Save ATS score entry — capped at 100
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

/** @returns {{ date: string, role: string, atsScore: number }[]} */
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
