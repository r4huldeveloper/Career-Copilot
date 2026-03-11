/**
 * storage.js — LocalStorage wrapper
 * Handles all persistent browser storage with error safety.
 * Kyun: LocalStorage directly use karna risky hai — errors
 * silently fail karte hain. Yeh wrapper safe aur consistent banata hai.
 */

const KEYS = {
  API_KEY: "cc_groq_key",
};

export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

export const getApiKey = () => storage.get(KEYS.API_KEY) || "";
export const setApiKey = (key) => storage.set(KEYS.API_KEY, key);
export const clearApiKey = () => storage.remove(KEYS.API_KEY);

// Interview Session History
const HISTORY_KEY = "cc_interview_history";

export const saveSession = (session) => {
  const history = JSON.parse(storage.get(HISTORY_KEY) || "[]");
  history.unshift(session); // newest first
  storage.set(HISTORY_KEY, JSON.stringify(history));
};

export const getHistory = () => JSON.parse(storage.get(HISTORY_KEY) || "[]");

export const clearHistory = () => storage.remove(HISTORY_KEY);
