/**
 * groq.js — Groq API client
 * Single source of truth for all AI calls.
 * Kyun: Sab AI logic ek jagah — easy to update prompts,
 * model, or endpoint without touching other files.
 */

import { CONFIG } from "../config.js";

// ── Session Cache ─────────────────────────────────────────────────────────────
// Kyun sessionStorage: Same resume/JD dobara analyze karne pe
// Groq API call waste hoti thi. Cache se instant result milta hai.
// sessionStorage tab tak rehta hai jab tak browser tab open ho —
// fresh session mein fresh results milenge.

/**
 * Generate a short cache key from input strings
 * @param {string} prefix - Feature name e.g. "resume", "jd"
 * @param {...string} parts - Input strings to hash
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

/**
 * Get cached result from sessionStorage
 * @param {string} key
 * @returns {string|null}
 */
function _cacheGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Save result to sessionStorage cache
 * @param {string} key
 * @param {string} value
 */
function _cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (err) {
    // sessionStorage full ya disabled — silently skip, not critical
    console.error("[groq] Cache set failed:", err.message);
  }
}

// ── Core API Caller ───────────────────────────────────────────────────────────

/**
 * Core Groq API caller — all AI functions use this
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
async function callGroq(userPrompt, systemPrompt, apiKey) {
  if (!apiKey) throw new Error("API key missing — pehle Groq key set karo");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

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
    throw new Error("Network error — internet connection check karo");
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      errMsg = errData?.error?.message || errMsg;
    } catch {
      // JSON parse failed — use status code message
    }
    console.error("[groq] API error:", res.status, errMsg);

    if (res.status === 401) throw new Error("Invalid API key — Groq dashboard se check karo");
    if (res.status === 429) throw new Error("Rate limit — thodi der baad try karo");
    if (res.status === 503) throw new Error("Groq service unavailable — baad mein try karo");
    throw new Error(errMsg);
  }

  try {
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("[groq] Response parse error:", err.message);
    throw new Error("AI response parse nahi hua — dobara try karo");
  }
}

// ── Resume Analyzer ───────────────────────────────────────────────────────────

/**
 * Analyze resume for a target role
 * Caches result per resume+role combination for the session
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

  const system = `Tu ek world-class career coach aur ATS expert hai jo specifically Indian job market ke liye ${targetRole} roles mein specialize karta hai.

Tere paas yeh deep knowledge hai:
- Indian startup aur MNC hiring patterns 2024-25
- ATS systems jo Indian companies use karti hain (Naukri, LinkedIn, Workday, Greenhouse)
- ${targetRole} ke liye exact skills, keywords, aur experience jo recruiters dhundhte hain
- Indian fresher resumes ki common mistakes

Resume ko ek senior hiring manager ki tarah read kar jo ${targetRole} ke liye 100+ resumes dekh chuka ho. Har section mein SPECIFIC aur ACTIONABLE feedback de — generic advice bilkul mat de.

## ✅ Top 3 Strengths
Exactly kya strong hai — specific lines quote karke batao. Kyun yeh ${targetRole} ke liye valuable hai.

## ⚠️ Top 3 Critical Issues
Sabse badi weaknesses jo rejection ka reason ban sakti hain. Specific section ka reference do.

## 📊 ATS Score: X/10
Score + exact reasons — kaunse keywords missing hain, formatting issues, section names jo ATS parse nahi kar sakta.

## ⚡ 3 Quick Fixes (Aaj Karo)
Exact changes — copy-paste ready. "Yeh line hatao, yeh add karo" level ki specificity.

## ✍️ Rewritten Bullets (Before → After)
Resume se 3 weakest bullets lo aur ${targetRole} ke liye powerful metric-driven bullets mein rewrite karo.
❌ Before: [original]
✅ After: [action verb + metric + impact]

## 🎯 ${targetRole} — Role-Specific Gaps
Is specific role ke liye kya missing hai — skills, tools, certifications, project types.

Hinglish mein jawab de. Depth rakh — surface level advice mat de.`;

  const result = await callGroq(
    `Target Role: ${targetRole}\n\nResume:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
    system,
    apiKey
  );

  _cacheSet(cacheKey, result);
  return result;
}

// ── JD Matcher ────────────────────────────────────────────────────────────────

/**
 * Match resume against a job description
 * Caches result per jd+resume combination for the session
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

  const system = `Tu ek expert ATS specialist aur recruiter hai jo Indian companies ke liye hiring karta hai.

JD aur Resume ko line-by-line compare kar. Sirf gaps aur fixes pe focus kar.

## ❌ Critical Mismatches
JD mein explicitly maanga gaya hai lekin resume mein nahi — specific lines quote karo dono se.

## 🔧 Exact Corrections Required
Har mismatch ke liye exact wording jo resume mein add/change karni hai. Copy-paste ready.

## 🔑 Missing Keywords (Priority Order)
JD ke high-frequency keywords jo resume mein absent hain. ATS mein yeh reject karega.

## 📝 3 Ready-to-Use Resume Lines
JD ki exact language use karke 3 powerful bullets — seedha resume mein paste kar sako.

## 🎯 Match Score: XX%
Honest score + ek line — main gap kya hai.

Hinglish mein. Laser focused — sirf JD vs Resume comparison. No generic advice.`;

  const result = await callGroq(
    `JOB DESCRIPTION:\n${jdText.slice(0, CONFIG.MAX_JD_LENGTH)}\n\nRESUME:\n${resumeText.slice(0, CONFIG.MAX_RESUME_LENGTH)}`,
    system,
    apiKey
  );

  _cacheSet(cacheKey, result);
  return result;
}

// ── Interview Question Generator ──────────────────────────────────────────────

/**
 * Generate an interview question for a role and type
 * Note: Questions NOT cached — forceNew flag needs fresh results always
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
    ? `\nIMPORTANT: Pichle se BILKUL alag question do. Count: ${count}`
    : "";

  const system = `Tu ek senior interviewer hai jo ${role} ke liye Indian startups aur MNCs mein hiring karta hai. Type: ${type}.

Real interviews mein jo questions actually pooche jaate hain woh do — not textbook questions.

Sirf yeh 3 lines do, kuch extra nahi:
QUESTION: [specific real-world question jo ${role} interviews mein commonly poochha jaata hai]
DIFFICULTY: [Easy/Medium/Hard]
FOCUS: [exactly kya assess ho raha hai — 4 words max]`;

  return callGroq(`Role: ${role}\nInterview Type: ${type}${newText}`, system, apiKey);
}

// ── Answer Evaluator ──────────────────────────────────────────────────────────

/**
 * Evaluate a candidate's interview answer
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {string} params.role
 * @param {string} params.type
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function evaluateAnswer({ question, answer, role, type, apiKey }) {
  const system = `Tu ek strict but helpful ${role} interviewer hai jo Indian job market ke liye candidates evaluate karta hai.

Candidate ka jawab honest aur deep analysis kar. Interviewer ki tarah soch — kya yeh candidate hire karna chahoge?

## 📊 Score: X/10
Honest score + ek line reason. 7+ = Strong, 5-6 = Average, below 5 = Needs work.

## ✅ Kya Acha Tha
Specific strong points — exact lines quote karo candidate ke answer se.

## ⚠️ Critical Gaps
Kya miss hua jo ${role} interviewer expect karta hai. Specific aur actionable.

## 💡 Ideal Answer (Complete Format)
- Framework: [STAR/CIRCLES/MECE/jo bhi best fit ho]
- Must-cover points: [3-4 key elements jo answer mein hone chahiye the]
- Sample Answer: [Complete 6-8 sentence answer jo top candidate deta — ready to memorize]

## 🔑 Power Line
Ek memorable closing line jo answer ko standout banati hai.

Hinglish mein. Honest reh — false praise mat de.`;

  return callGroq(
    `Role: ${role}\nInterview Type: ${type}\n\nQuestion: ${question}\n\nCandidate Answer: ${answer.slice(0, CONFIG.MAX_ANSWER_LENGTH)}`,
    system,
    apiKey
  );
}

// ── Answer Tips ───────────────────────────────────────────────────────────────

/**
 * Get tips and ideal answer for an interview question
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.role
 * @param {string} params.type
 * @param {string} params.apiKey
 * @returns {Promise<string>}
 */
export async function getAnswerTips({ question, role, type, apiKey }) {
  const system = `Tu ek expert ${role} interview coach hai jo Indian freshers ko top companies mein place karta hai.

Is question ka complete breakdown de — jaise ek mentor apne student ko samjhata hai.

## ❓ Question Ka Asli Matlab
Interviewer exactly kya assess kar raha hai — surface pe kya dikh raha hai vs. actually kya dhundha ja raha hai.

## 📋 Ideal Structure
Step-by-step framework — STAR, CIRCLES, MECE — jo bhi best fit ho explain karo kyun.

## ✍️ Complete Sample Answer
7-8 sentences ka ideal answer — specific examples ke saath, numbers jahan possible ho, ${role} ke liye relevant context.

## ⚠️ 3 Common Mistakes
Indian freshers yeh galtiyan karte hain is question mein — specific aur real.

## 🔑 Power Phrase
Ek line jo answer ko memorable banaye — interviewer ke mind mein stick kare.

Hinglish mein. Depth rakh — yeh student ki job lag sakti hai is answer se.`;

  return callGroq(`Role: ${role}\nInterview Type: ${type}\n\nQuestion: ${question}`, system, apiKey);
}
