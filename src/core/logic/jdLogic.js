/**
 * jdLogic.js — Pure Logic Layer: JD Matcher
 *
 * AI_RULES compliance:
 *   Rule 1 — Abstract Intelligence Core: zero UI coupling, zero DOM access.
 *   Rule 1 — Switch Rule: portable to any platform without rewrite.
 *   Rule 3 — Atomic Modularity: delete this file → zero footprint in system.
 *   Rule 4 — Sanitization Sandbox: all inputs sanitized before AI call.
 */

import { GroqAdapter }                      from "../../adapters/aiProvider.js";
import { sanitizeUserText, clampTextLength } from "../../utils/sanitize.js";
import { setSessionState }                   from "./sessionState.js";
import { CONFIG }                            from "../../config.js";

/**
 * Run JD-to-resume gap analysis via AI.
 *
 * @param {object} params
 * @param {string} params.jdText     - Raw job description text
 * @param {string} params.resumeText - Raw resume text
 * @param {string} params.apiKey     - Groq API key
 * @returns {Promise<string>}        - Raw AI markdown result
 * @throws {Error} on validation failure or AI error
 */
export async function runJdMatch({ jdText, resumeText, apiKey }) {
  const jd     = clampTextLength(sanitizeUserText(jdText),     CONFIG.MAX_JD_LENGTH);
  const resume = clampTextLength(sanitizeUserText(resumeText), CONFIG.MAX_RESUME_LENGTH);

  if (!jd) {
    throw new Error("Job Description paste karo!");
  }
  if (resume.length < CONFIG.MIN_RESUME_LENGTH) {
    throw new Error("Resume upload karo ya paste karo!");
  }

  const result = await new GroqAdapter(apiKey).matchJD({ jdText: jd, resumeText: resume });
  setSessionState({ jdText: jd, resumeText: resume });
  return result;
}
