/**
 * resumeLogic.js — Pure Logic Layer: Resume Analyzer + Role Fit Analyzer
 *
 * AI_RULES compliance:
 *   Rule 1 — Abstract Intelligence Core: zero UI coupling, zero DOM access.
 *   Rule 1 — Switch Rule: move to Swift/Kotlin/Rust — rewrite = 0 lines.
 *   Rule 3 — Atomic Modularity: delete this file tomorrow → zero footprint.
 *   Rule 4 — Sanitization Sandbox: all inputs sanitized before AI call.
 *
 * This file knows nothing about: DOM, buttons, CSS classes, HTML IDs.
 * It receives plain data, returns plain data. That is its entire contract.
 */

import { GroqAdapter }                   from "../../adapters/aiProvider.js";
import { sanitizeUserText, clampTextLength } from "../../utils/sanitize.js";
import { saveScore }                     from "../../utils/storage.js";
import { setSessionState }               from "./sessionState.js";
import { CONFIG }                        from "../../config.js";

// ── ATS Score Parser ──────────────────────────────────────────────────────────
// Kept here — it is resume business logic, not UI logic.

/**
 * Extract numeric ATS score from AI markdown output.
 * Three fallback patterns to handle any prompt format variation.
 * @param {string} text
 * @returns {number|null}
 */
export function parseAtsScore(text) {
  if (!text) return null;
  const m1 = text.match(/ATS\s*SCORE\s*[:\-]\s*(\d+)\s*\/\s*10/im);
  if (m1) return Math.min(10, Math.max(1, parseInt(m1[1], 10)));
  const m2 = text.match(/score\s*[:\-]\s*(\d+)\s*\/\s*10/im);
  if (m2) return Math.min(10, Math.max(1, parseInt(m2[1], 10)));
  const m3 = text.match(/\b([1-9]|10)\s*\/\s*10\b/);
  if (m3) return parseInt(m3[1], 10);
  return null;
}

// ── Resume Analyzer ───────────────────────────────────────────────────────────

/**
 * Run resume analysis via AI.
 * Sanitizes input, calls AI, auto-saves ATS score to storage.
 *
 * @param {object} params
 * @param {string} params.resumeText   - Raw resume text (from paste or PDF parse)
 * @param {string} params.targetRole   - Selected role string
 * @param {string} params.apiKey       - Groq API key from storage
 * @returns {Promise<{ result: string, atsScore: number|null }>}
 * @throws {Error} on validation failure or AI error
 */
export async function runResumeAnalysis({ resumeText, targetRole, apiKey }) {
  const text = clampTextLength(sanitizeUserText(resumeText), CONFIG.MAX_RESUME_LENGTH);
  const role = sanitizeUserText(targetRole);

  if (!text || text.length < CONFIG.MIN_RESUME_LENGTH) {
    throw new Error("Resume upload karo ya paste karo pehle!");
  }

  const result = await new GroqAdapter(apiKey).analyzeResume({
    resumeText: text,
    targetRole: role,
  });

  // Side effect: persist session state + ATS score — pure data ops, no UI.
  setSessionState({ resumeText: text, lastRole: role });

  const atsScore = parseAtsScore(result);
  if (atsScore !== null) {
    saveScore({ date: new Date().toISOString(), role, atsScore });
  }

  return { result, atsScore };
}

// ── Role Fit Analyzer ─────────────────────────────────────────────────────────

/**
 * Run AI Role Fit analysis on an already-uploaded resume.
 *
 * @param {object} params
 * @param {string} params.resumeText - Sanitized resume text
 * @param {string} params.apiKey     - Groq API key
 * @returns {Promise<string>}        - Raw AI markdown result
 * @throws {Error} on validation failure or AI error
 */
export async function runRoleFitAnalysis({ resumeText, apiKey }) {
  const text = clampTextLength(sanitizeUserText(resumeText), CONFIG.MAX_RESUME_LENGTH);

  if (!text || text.length < CONFIG.MIN_RESUME_LENGTH) {
    throw new Error("Pehle resume analyze karo upar se!");
  }

  const result = await new GroqAdapter(apiKey).analyzeRoleFit({ resumeText: text });
  setSessionState({ resumeText: text });
  return result;
}
