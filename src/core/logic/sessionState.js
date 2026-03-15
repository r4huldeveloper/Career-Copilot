/**
 * sessionState.js — lightweight user session memory for app state migration.
 * Aligns with AI_RULES: dedicated memory layer (zero coupling w/ UI).
 */

const DEFAULT_STATE = {
  resumeText: "",
  jdText: "",
  lastRole: "",
  lastInterview: {
    role: "",
    type: "",
    question: "",
  },
};

let sessionState = { ...DEFAULT_STATE };

export function getSessionState() {
  return { ...sessionState };
}

export function setSessionState(values) {
  sessionState = { ...sessionState, ...values };
}

export function resetSessionState() {
  sessionState = { ...DEFAULT_STATE };
}

export function updateLastInterview({ role, type, question }) {
  sessionState.lastInterview = { role, type, question };
  sessionState.lastRole = role || sessionState.lastRole;
}
