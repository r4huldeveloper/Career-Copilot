/**
 * aiProvider.js — Universal AI Provider Adapter
 *
 * AI_RULES Rule 1 — Adapter Pattern:
 *   Switching provider = user changes selection in Settings.
 *   Zero changes needed in Logic Layer or app.js.
 *
 * Supports: Groq, OpenAI, Gemini, Mistral
 *   - Groq, OpenAI, Mistral → OpenAI-compatible format
 *   - Gemini → Google format (different request/response structure)
 *
 * Adding a new provider:
 *   1. Add entry to CONFIG.PROVIDERS in config.js
 *   2. If apiFormat is "openai" → works automatically
 *   3. If new format → add a _call{Format} private method here only
 */

import { CONFIG }  from "../config.js";
import { getProvider, getModel } from "../utils/storage.js";
import {
  resumeSystemPrompt,
  roleFitSystemPrompt,
  jdMatchSystemPrompt,
  interviewQuestionSystemPrompt,
  evaluateAnswerSystemPrompt,
  answerTipsSystemPrompt,
  roastSystemPrompt,
} from "../prompts/groqPrompts.js";

// ── Session Cache ─────────────────────────────────────────────────────────────
// Same resume + same role + same provider = return cached result instantly.
// sessionStorage clears on tab close — no stale results across sessions.

function _cacheKey(prefix, ...parts) {
  const providerId = getProvider();
  const modelId    = getModel();
  const raw = [providerId, modelId, ...parts].join("|").slice(0, 600);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `cc_cache_${prefix}_${hash}`;
}

function _cacheGet(key) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function _cacheSet(key, value) {
  try { sessionStorage.setItem(key, value); }
  catch (err) { console.error("[adapter] cache set failed:", err.message); }
}

// ── Circuit Breaker — per provider ───────────────────────────────────────────
// Per-provider breaker — Gemini failing doesn't block Groq.
// Threshold raised: 5 failures (was 3) — one-off bugs don't trip it.
// Block time reduced: 15s (was 30s) — user doesn't wait long.

const _breakers = {};

function _getBreaker(providerId) {
  if (!_breakers[providerId]) {
    _breakers[providerId] = {
      failureCount: 0,
      windowStart:  0,
      openUntil:    0,
      MAX_FAILURES: 5,
      WINDOW_MS:    60_000,
      OPEN_MS:      15_000,
    };
  }
  return _breakers[providerId];
}

function _breakerCheck(providerId) {
  const b   = _getBreaker(providerId);
  const now = Date.now();
  if (now < b.openUntil) {
    const secsLeft = Math.ceil((b.openUntil - now) / 1000);
    throw new Error(`AI service ${secsLeft}s mein available hoga — thoda ruko`);
  }
  if (now - b.windowStart > b.WINDOW_MS) {
    b.failureCount = 0;
    b.windowStart  = now;
  }
}

function _breakerSuccess(providerId) {
  const b = _getBreaker(providerId);
  b.failureCount = 0;
  b.openUntil    = 0;
}

function _breakerFailure(providerId) {
  const b = _getBreaker(providerId);
  b.failureCount += 1;
  if (b.failureCount >= b.MAX_FAILURES) {
    b.openUntil = Date.now() + b.OPEN_MS;
    console.warn(`[aiProvider] Circuit breaker OPEN for ${providerId} — ${b.MAX_FAILURES} failures`);
  }
}

/** Reset breaker for a provider — called after user changes provider or reconnects */
export function resetBreaker(providerId) {
  if (_breakers[providerId]) {
    _breakers[providerId].failureCount = 0;
    _breakers[providerId].openUntil    = 0;
  }
}

// ── Input Sanitizer ───────────────────────────────────────────────────────────

function _sanitize(text) {
  if (!text) return "";
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim()
             .slice(0, CONFIG.MAX_RESUME_LENGTH || 4000);
}

// ── OpenAI-compatible call (Groq, OpenAI, Mistral) ────────────────────────────

async function _callOpenAI({ endpoint, model, apiKey, systemPrompt, userPrompt, isGemini, providerId }) {
  const messages = [];

  // Both Groq/OpenAI/Mistral AND Gemini support system role in OpenAI-compat mode
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: _sanitize(userPrompt) });

  // Gemini OpenAI-compat: use max_tokens (same as others) — temperature supported too
  // Only avoid unknown/unsupported fields
  const body = {
    model,
    messages,
    max_tokens:  CONFIG.AI_MAX_TOKENS,
    temperature: CONFIG.AI_TEMPERATURE,
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    _breakerFailure(providerId);
    console.error("[aiProvider] fetch failed:", err.message, "endpoint:", endpoint);
    throw new Error(`Connection failed — ${err.message}`);
  }

  if (!res.ok) {
    _breakerFailure(providerId);
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      msg = d?.error?.message || d?.message || msg;
      console.error("[aiProvider] API error:", res.status, msg, "provider:", endpoint);
    } catch { /* json parse failed */ }
    if (res.status === 401 || res.status === 403) throw new Error("Invalid API key — provider dashboard se verify karo");
    if (res.status === 429) throw new Error("Rate limit — thodi der baad try karo");
    if (res.status === 503) throw new Error("Service down — 2 min baad try karo");
    if (res.status === 400) throw new Error(`Bad request — ${msg}`);
    throw new Error(msg);
  }

  try {
    const data = await res.json();
    _breakerSuccess(providerId);
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");
    return content;
  } catch (err) {
    _breakerFailure(providerId);
    console.error("[aiProvider] response parse failed:", err.message);
    throw new Error("AI response parse nahi hua — dobara try karo");
  }
}

// ── Universal Dispatcher ──────────────────────────────────────────────────────
// All providers now use OpenAI-compatible format.
// Gemini uses Google's /v1beta/openai/ endpoint — same request/response as OpenAI.
// Adding a new provider: add to CONFIG.PROVIDERS in config.js. If apiFormat="openai" → works automatically.

async function _call({ systemPrompt, userPrompt, apiKey }) {
  const providerId = getProvider();
  _breakerCheck(providerId);
  const modelId    = getModel();
  const provider   = CONFIG.PROVIDERS[providerId];

  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!apiKey)   throw new Error("API key missing — Settings mein jaake key add karo");

  const params = {
    endpoint:     provider.endpoint,
    model:        modelId || provider.defaultModel,
    apiKey,
    systemPrompt,
    userPrompt,
    isGemini:     providerId === "gemini",
    providerId,
  };

  return _callOpenAI(params);
}

// ── Public Adapter Class ──────────────────────────────────────────────────────
// Same interface as before — Logic Layer needs zero changes.

export class GroqAdapter {
  constructor(apiKey) {
    if (!apiKey) throw new Error("API key missing — Settings mein jaake key add karo");
    this.apiKey = apiKey;
  }

  async analyzeResume({ resumeText, targetRole }) {
    const cacheKey = _cacheKey("resume", resumeText, targetRole);
    const cached   = _cacheGet(cacheKey);
    if (cached) return cached;

    const result = await _call({
      systemPrompt: resumeSystemPrompt(targetRole),
      userPrompt:   `Target Role: ${targetRole}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      apiKey:       this.apiKey,
    });
    _cacheSet(cacheKey, result);
    return result;
  }

  async analyzeRoleFit({ resumeText }) {
    const cacheKey = _cacheKey("rolefit", resumeText);
    const cached   = _cacheGet(cacheKey);
    if (cached) return cached;

    const result = await _call({
      systemPrompt: roleFitSystemPrompt(),
      userPrompt:   `Resume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      apiKey:       this.apiKey,
    });
    _cacheSet(cacheKey, result);
    return result;
  }

  async matchJD({ jdText, resumeText }) {
    const cacheKey = _cacheKey("jd", jdText, resumeText);
    const cached   = _cacheGet(cacheKey);
    if (cached) return cached;

    const result = await _call({
      systemPrompt: jdMatchSystemPrompt(),
      userPrompt:   `JD:\n${jdText.slice(0, CONFIG.MAX_JD_LENGTH)}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      apiKey:       this.apiKey,
    });
    _cacheSet(cacheKey, result);
    return result;
  }

  async generateInterviewQuestion({ role, type, forceNew, count }) {
    const newText = forceNew
      ? `\nCRITICAL: Pichle question se completely alag topic lo. Count: ${count}`
      : "";
    return _call({
      systemPrompt: interviewQuestionSystemPrompt(),
      userPrompt:   `Role: ${role}\nInterview Type: ${type}${newText}`,
      apiKey:       this.apiKey,
    });
  }

  async evaluateAnswer({ question, answer, role, type }) {
    return _call({
      systemPrompt: evaluateAnswerSystemPrompt(),
      userPrompt:   `Role: ${role}\nInterview Type: ${type}\n\nQuestion: ${question}\n\nCandidate Answer: ${answer.slice(0, CONFIG.MAX_ANSWER_LENGTH)}`,
      apiKey:       this.apiKey,
    });
  }

  async getAnswerTips({ question, role, type }) {
    return _call({
      systemPrompt: answerTipsSystemPrompt(),
      userPrompt:   `Question: ${question}\nRole: ${role}\nType: ${type}`,
      apiKey:       this.apiKey,
    });
  }

  async roastResume({ resumeText, targetRole }) {
    // No cache — roast should feel fresh every time
    return _call({
      systemPrompt: roastSystemPrompt(targetRole),
      userPrompt:   `Target Role: ${targetRole}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
      apiKey:       this.apiKey,
    });
  }
}


/**
 * callAI — exported for groq.js shim and tests.js
 * Same as _call but exported. Routes through per-provider circuit breaker.
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function callAI(userPrompt, systemPrompt, apiKey) {
  return _call({ userPrompt, systemPrompt, apiKey });
}
