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

// ── Circuit Breaker ───────────────────────────────────────────────────────────

const CIRCUIT_BREAKER = {
  failureCount: 0,
  windowStart:  0,
  openUntil:    0,
  MAX_FAILURES: 3,
  WINDOW_MS:    60_000,
  OPEN_MS:      30_000,
};

function _breakerCheck() {
  const now = Date.now();
  if (now < CIRCUIT_BREAKER.openUntil) {
    throw new Error("AI service temporarily unavailable — thoda baad try karein");
  }
  if (now - CIRCUIT_BREAKER.windowStart > CIRCUIT_BREAKER.WINDOW_MS) {
    CIRCUIT_BREAKER.failureCount = 0;
    CIRCUIT_BREAKER.windowStart  = now;
  }
}

function _breakerSuccess() {
  CIRCUIT_BREAKER.failureCount = 0;
  CIRCUIT_BREAKER.openUntil    = 0;
}

function _breakerFailure() {
  CIRCUIT_BREAKER.failureCount += 1;
  if (CIRCUIT_BREAKER.failureCount >= CIRCUIT_BREAKER.MAX_FAILURES) {
    CIRCUIT_BREAKER.openUntil = Date.now() + CIRCUIT_BREAKER.OPEN_MS;
  }
}

// ── Input Sanitizer ───────────────────────────────────────────────────────────

function _sanitize(text) {
  if (!text) return "";
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim()
             .slice(0, CONFIG.MAX_RESUME_LENGTH || 4000);
}

// ── OpenAI-compatible call (Groq, OpenAI, Mistral) ────────────────────────────

async function _callOpenAI({ endpoint, model, apiKey, systemPrompt, userPrompt }) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: _sanitize(userPrompt) });

  let res;
  try {
    res = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens:  CONFIG.AI_MAX_TOKENS,
        temperature: CONFIG.AI_TEMPERATURE,
      }),
    });
  } catch (err) {
    _breakerFailure();
    throw new Error("Network error — internet connection check karo");
  }

  if (!res.ok) {
    _breakerFailure();
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d?.error?.message || msg; } catch {}
    if (res.status === 401) throw new Error("Invalid API key — provider dashboard se verify karo");
    if (res.status === 429) throw new Error("Rate limit — thodi der baad try karo");
    if (res.status === 503) throw new Error("Service down — 2 min baad try karo");
    throw new Error(msg);
  }

  try {
    const data = await res.json();
    _breakerSuccess();
    return data.choices[0].message.content;
  } catch (err) {
    _breakerFailure();
    throw new Error("AI response parse nahi hua — dobara try karo");
  }
}

// ── Universal Dispatcher ──────────────────────────────────────────────────────
// All providers now use OpenAI-compatible format.
// Gemini uses Google's /v1beta/openai/ endpoint — same request/response as OpenAI.
// Adding a new provider: add to CONFIG.PROVIDERS in config.js. If apiFormat="openai" → works automatically.

async function _call({ systemPrompt, userPrompt, apiKey }) {
  _breakerCheck();

  const providerId = getProvider();
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
  };

  if (provider.apiFormat === "gemini") return _callOpenAI(params); // gemini uses openai-compat endpoint
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
}
