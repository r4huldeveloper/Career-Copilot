/**
 * groq.js — Groq API client
 * Single source of truth for all AI calls.
 * Elite prompts engineered specifically for Indian job market 2024-25.
 * Kyun: Generic prompts dete hain generic output. Yeh prompts
 * Indian hiring context, ATS systems, aur fresher pain points
 * ke liye specifically tuned hain — koi tool yeh nahi deta.
 */

import { CONFIG } from "../config.js";
import {
  resumeSystemPrompt,
  roleFitSystemPrompt,
  jdMatchSystemPrompt,
  interviewQuestionSystemPrompt,
  evaluateAnswerSystemPrompt,
  answerTipsSystemPrompt,
} from "../prompts/groqPrompts.js";

// ── Session Cache ─────────────────────────────────────────────────────────────
// Kyun: Same resume dobara analyze karne pe API quota waste hota tha.
// sessionStorage tab tak rehta hai jab tak tab open ho.

/**
 * Generate cache key from inputs
 * @param {string} prefix
 * @param {...string} parts
 * @returns {string}
 */
function _cacheKey(prefix, ...parts) {
  const raw = parts.join("|").slice(0, 500);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `cc_cache_${prefix}_${hash}`;
}

/** @param {string} key @returns {string|null} */
function _cacheGet(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

/** @param {string} key @param {string} value */
function _cacheSet(key, value) {
  try { sessionStorage.setItem(key, value); }
  catch (err) { console.error("[groq] Cache set failed:", err.message); }
}

// ── Core API Caller ───────────────────────────────────────────────────────────

/**
 * Core Groq API caller — all AI functions route through here
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
const CIRCUIT_BREAKER = {
  failureCount: 0,
  windowStart: 0,
  openUntil: 0,
  MAX_FAILURES: 3,
  WINDOW_MS: 60_000,
  OPEN_MS: 30_000,
};

function sanitizeForAi(text) {
  if (!text) return "";
  // preserve simple whitespace and content, remove dangerous control chars
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.slice(0, CONFIG.MAX_RESUME_LENGTH || 4000);
}

async function callGroq(userPrompt, systemPrompt, apiKey) {
  if (!apiKey) throw new Error("API key missing — pehle Groq key set karo");

  const now = Date.now();
  if (now < CIRCUIT_BREAKER.openUntil) {
    throw new Error("AI service temporarily unavailable, thoda baad try karein");
  }

  if (now - CIRCUIT_BREAKER.windowStart > CIRCUIT_BREAKER.WINDOW_MS) {
    CIRCUIT_BREAKER.failureCount = 0;
    CIRCUIT_BREAKER.windowStart = now;
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: sanitizeForAi(userPrompt) });

  let res;
  try {
    res = await fetch(CONFIG.GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CONFIG.GROQ_MODEL,
        messages,
        max_tokens: CONFIG.GROQ_MAX_TOKENS,
        temperature: CONFIG.GROQ_TEMPERATURE,
      }),
    });
  } catch (err) {
    console.error("[groq] Network error:", err.message);
    CIRCUIT_BREAKER.failureCount += 1;
    if (CIRCUIT_BREAKER.failureCount >= CIRCUIT_BREAKER.MAX_FAILURES) {
      CIRCUIT_BREAKER.openUntil = Date.now() + CIRCUIT_BREAKER.OPEN_MS;
    }
    throw new Error("Network error — internet connection check karo");
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      errMsg = errData?.error?.message || errMsg;
    } catch { /* JSON parse failed */ }
    console.error("[groq] API error:", res.status, errMsg);
    if (res.status === 401) throw new Error("Invalid API key — Groq dashboard se verify karo");
    if (res.status === 429) throw new Error("Rate limit hit — 30 seconds baad try karo");
    if (res.status === 503) throw new Error("Groq service down — 2 min baad try karo");
    throw new Error(errMsg);
  }

  try {
    const data = await res.json();
    // success -> reset circuit breaker
    CIRCUIT_BREAKER.failureCount = 0;
    CIRCUIT_BREAKER.openUntil = 0;
    return data.choices[0].message.content;
  } catch (err) {
    console.error("[groq] Response parse error:", err.message);
    CIRCUIT_BREAKER.failureCount += 1;
    if (CIRCUIT_BREAKER.failureCount >= CIRCUIT_BREAKER.MAX_FAILURES) {
      CIRCUIT_BREAKER.openUntil = Date.now() + CIRCUIT_BREAKER.OPEN_MS;
    }
    throw new Error("AI response parse nahi hua — dobara try karo");
  }
}

// ── ELITE PROMPT SYSTEM ───────────────────────────────────────────────────────
// Har prompt mein 3 layers hain:
// 1. PERSONA — AI ko exact role deta hai
// 2. CONTEXT — Indian market specific knowledge inject karta hai
// 3. STRUCTURE — Exact output format force karta hai
// Yeh combination generic AI responses ko eliminate karta hai.

// ── Resume Analyzer ───────────────────────────────────────────────────────────

/**
 * Analyze resume with elite Indian-market prompting
 * Caches per resume+role combination for session
 * @param {object} params
 * @param {string} params.resumeText
 * @param {string} params.targetRole
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function analyzeResume({ resumeText, targetRole, apiKey }) {
  const cacheKey = _cacheKey("resume", resumeText, targetRole);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const result = await callGroq(
    `Target Role: ${targetRole}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
    resumeSystemPrompt(targetRole),
    apiKey
  );

  _cacheSet(cacheKey, result);
  return result;
}

// ── AI Role Fit Analyzer ──────────────────────────────────────────────────────

/**
 * Analyze which roles best fit this resume — NEW FEATURE
 * Caches per resume for session
 * @param {object} params
 * @param {string} params.resumeText
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function analyzeRoleFit({ resumeText, apiKey }) {
  const cacheKey = _cacheKey("rolefit", resumeText);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const result = await callGroq(
    `Resume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
    roleFitSystemPrompt(),
    apiKey
  );

  _cacheSet(cacheKey, result);
  return result;
}

// ── JD Matcher ────────────────────────────────────────────────────────────────

/**
 * Match resume against JD with elite gap analysis
 * Caches per jd+resume for session
 * @param {object} params
 * @param {string} params.jdText
 * @param {string} params.resumeText
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function matchJD({ jdText, resumeText, apiKey }) {
  const cacheKey = _cacheKey("jd", jdText, resumeText);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const result = await callGroq(
    `JD:\n${jdText.slice(0, CONFIG.MAX_JD_LENGTH)}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
    jdMatchSystemPrompt(),
    apiKey
  );

  _cacheSet(cacheKey, result);
  return result;
}

// ── Interview Question Generator ──────────────────────────────────────────────

/**
 * Generate a real-world interview question
 * Not cached — fresh question needed every time
 * @param {object} params
 * @param {string} params.role
 * @param {string} params.type
 * @param {boolean} params.forceNew
 * @param {number} params.count
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function generateInterviewQuestion({ role, type, forceNew, count, apiKey }) {
  const newText = forceNew
    ? `\nCRITICAL: Pichle question se completely alag topic aur angle lo. Count: ${count}`
    : "";

  return callGroq(
    `Role: ${role}\nInterview Type: ${type}${newText}`,
    interviewQuestionSystemPrompt(),
    apiKey
  );
}

// ── Answer Evaluator ──────────────────────────────────────────────────────────

/**
 * Evaluate interview answer with brutal honesty
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {string} params.role
 * @param {string} params.type
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function evaluateAnswer({ question, answer, role, type, apiKey }) {
  return callGroq(
    `Role: ${role}\nInterview Type: ${type}\n\nQuestion: ${question}\n\nCandidate Answer: ${answer.slice(0, CONFIG.MAX_ANSWER_LENGTH)}`,
    evaluateAnswerSystemPrompt(),
    apiKey
  );
}

// ── Answer Tips ───────────────────────────────────────────────────────────────

/**
 * Get expert tips and ideal answer breakdown
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.role
 * @param {string} params.type
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function getAnswerTips({ question, role, type, apiKey }) {
  return callGroq(
    `Question: ${question}\nRole: ${role}\nType: ${type}`,
    answerTipsSystemPrompt(),
    apiKey
  );
}

export { callGroq };

