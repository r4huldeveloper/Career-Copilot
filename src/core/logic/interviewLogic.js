/**
 * interviewLogic.js — Pure Logic Layer: Mock Interview (Question + Feedback + Tips)
 *
 * AI_RULES compliance:
 *   Rule 1 — Abstract Intelligence Core: zero UI coupling, zero DOM access.
 *   Rule 1 — Switch Rule: portable to React Native / Electron without rewrite.
 *   Rule 3 — Atomic Modularity: delete this file → zero footprint in system.
 *   Rule 4 — Sanitization Sandbox: all inputs sanitized before AI call.
 *
 * Returns plain data objects — the UI shell decides how to render them.
 */

import { GroqAdapter }                      from "../../adapters/aiProvider.js";
import { sanitizeUserText, clampTextLength } from "../../utils/sanitize.js";
import { saveSession }                       from "../../utils/storage.js";
import { updateLastInterview }               from "./sessionState.js";
import { CONFIG }                            from "../../config.js";

// ── Question Generator ────────────────────────────────────────────────────────

/**
 * @typedef {object} ParsedQuestion
 * @property {string} question   - The interview question text
 * @property {string} difficulty - Easy / Medium / Hard
 * @property {string} focus      - Core skill being tested
 */

/**
 * Generate a fresh interview question and parse the structured AI response.
 *
 * @param {object} params
 * @param {string}  params.role      - Target role string
 * @param {string}  params.type      - Interview type string
 * @param {boolean} params.forceNew  - Whether to force a different topic
 * @param {number}  params.count     - Running question counter (for uniqueness)
 * @param {string}  params.apiKey    - Groq API key
 * @returns {Promise<ParsedQuestion>}
 * @throws {Error} on AI error
 */
export async function runGenerateQuestion({ role, type, forceNew, count, apiKey }) {
  const cleanRole = sanitizeUserText(role);
  const cleanType = sanitizeUserText(type);

  const raw = await new GroqAdapter(apiKey).generateInterviewQuestion({
    role: cleanRole,
    type: cleanType,
    forceNew,
    count,
  });

  // Parse structured output from prompt contract
  let question = "", difficulty = "Medium", focus = "";
  raw.split("\n").forEach((line) => {
    if (line.startsWith("QUESTION:"))   question   = line.replace("QUESTION:", "").trim();
    if (line.startsWith("DIFFICULTY:")) difficulty = line.replace("DIFFICULTY:", "").trim();
    if (line.startsWith("FOCUS:"))      focus      = line.replace("FOCUS:", "").trim();
  });
  // Fallback: if AI didn't follow structure, use raw text
  if (!question) question = raw.trim();

  updateLastInterview({ role: cleanRole, type: cleanType, question });

  return { question, difficulty, focus };
}

// ── Answer Evaluator ──────────────────────────────────────────────────────────

/**
 * @typedef {object} FeedbackResult
 * @property {string} rawMarkdown - AI feedback as raw markdown
 */

/**
 * Evaluate a candidate's answer and persist the session to history.
 *
 * @param {object} params
 * @param {string} params.question        - The interview question
 * @param {string} params.answer          - Candidate's raw answer text
 * @param {string} params.role            - Target role
 * @param {string} params.type            - Interview type
 * @param {string} params.apiKey          - Groq API key
 * @param {Function} params.parseMarkdown - Markdown renderer (injected to keep logic UI-free)
 * @returns {Promise<FeedbackResult>}
 * @throws {Error} if answer is empty or AI fails
 */
export async function runEvaluateAnswer({ question, answer, role, type, apiKey, parseMarkdown }) {
  const cleanAnswer = clampTextLength(sanitizeUserText(answer), CONFIG.MAX_ANSWER_LENGTH);
  const cleanRole   = sanitizeUserText(role);
  const cleanType   = sanitizeUserText(type);

  if (!cleanAnswer) {
    throw new Error("Pehle apna jawab likho!");
  }

  const rawMarkdown = await new GroqAdapter(apiKey).evaluateAnswer({
    question,
    answer:   cleanAnswer,
    role:     cleanRole,
    type:     cleanType,
  });

  updateLastInterview({ role: cleanRole, type: cleanType, question });

  // Persist to interview history — pure storage op, no UI side effect
  saveSession({
    date:     new Date().toISOString(),
    role:     cleanRole,
    type:     cleanType,
    question,
    answer:   cleanAnswer,
    feedback: parseMarkdown(rawMarkdown),
    score:    "N/A",
  });

  return { rawMarkdown };
}

// ── Answer Tips ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} TipsResult
 * @property {string} rawMarkdown - AI tips as raw markdown
 */

/**
 * Get ideal answer tips and expected answer structure.
 *
 * @param {object} params
 * @param {string} params.question - The interview question
 * @param {string} params.role     - Target role
 * @param {string} params.type     - Interview type
 * @param {string} params.apiKey   - Groq API key
 * @returns {Promise<TipsResult>}
 * @throws {Error} on AI error
 */
export async function runGetAnswerTips({ question, role, type, apiKey }) {
  const rawMarkdown = await new GroqAdapter(apiKey).getAnswerTips({
    question,
    role:  sanitizeUserText(role),
    type:  sanitizeUserText(type),
  });

  return { rawMarkdown };
}
