/**
 * groq.js — Groq API client
 * Single source of truth for all AI calls.
 * Kyun separate file: Agar API change ho (e.g. OpenAI se Groq),
 * sirf yeh ek file change karni padegi — baaki code untouched rahega.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 2000;

/**
 * Core Groq API call
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {string} apiKey
 * @returns {Promise<string>} - AI response text
 */
async function callGroq(userPrompt, systemPrompt, apiKey) {
  if (!apiKey) throw new Error('API key missing');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Prompts ─────────────────────────────────────────────────────────────────
// Each function = one AI feature. Clean separation of concerns.

/**
 * Analyze a resume for a given role
 */
export async function analyzeResume({ resumeText, targetRole, apiKey }) {
  const system = `Tu ek expert career coach hai jo Indian freshers ki help karta hai ${targetRole} roles ke liye.

Resume ka detailed analysis de in sections mein:

## ✅ Top 3 Strengths
Kya acha hai is resume mein — specific cheezein batao

## ⚠️ Top 3 Issues
Kya weak hai — honest feedback do

## 📊 ATS Score: X/10
Score aur 2 line explanation kyun

## ⚡ 3 Quick Fixes
Aaj hi ye 3 cheezein change karo — exact suggestions do

## ✍️ Rewritten Bullets
Koi bhi 2 bullets lo — before/after format mein strong PM/BA language mein rewrite karo

Hinglish mein jawab de. Direct aur actionable rakh. No fluff.`;

  return callGroq(`Resume:\n${resumeText.slice(0, 3500)}`, system, apiKey);
}

/**
 * Match resume against a job description
 */
export async function matchJD({ jdText, resumeText, apiKey }) {
  const system = `Tu ek expert ATS specialist aur career coach hai Indian job market ke liye.
Sirf resume aur JD ke beech ke gaps pe focus kar.

## ❌ Issues Found (JD ke hisaab se)
JD se compare karke specific problems — kya missing hai, kya galat hai

## 🔧 Corrections Required
Har issue ke liye exact fix — copy-paste ready wording

## 🔑 Missing Keywords
JD ke important keywords jo resume mein nahi hain — priority order mein

## 📝 Ready-to-Use Resume Lines
3-4 bullet points jo seedha resume mein paste kar sako — JD ki language mein

## 🎯 Match Score: XX%
Honest score — last mein

Hinglish mein, laser focused. Koi extra cheez nahi.`;

  return callGroq(
    `JOB DESCRIPTION:\n${jdText.slice(0, 2000)}\n\nRESUME:\n${resumeText.slice(0, 2500)}`,
    system,
    apiKey
  );
}

/**
 * Generate a single interview question
 */
export async function generateInterviewQuestion({ role, type, forceNew, count, apiKey }) {
  const newText = forceNew ? `\nIMPORTANT: Pichle se BILKUL alag question do. Count: ${count}` : '';

  const system = `Tu ek experienced interviewer hai — ${role}, Indian startup. Type: ${type}.
Sirf yeh 3 lines do:
QUESTION: [specific real question]
DIFFICULTY: [Easy/Medium/Hard]
FOCUS: [kya assess — 4 words]`;

  return callGroq(`Role: ${role}\nType: ${type}${newText}`, system, apiKey);
}

/**
 * Evaluate candidate's answer and provide feedback + expected answer
 */
export async function evaluateAnswer({ question, answer, role, type, apiKey }) {
  const system = `Tu ek strict but helpful interviewer hai — ${role}, ${type}.

## 📊 Score: X/10
Honest score + ek line reason

## ✅ Kya Acha Tha
Specific strong points

## ⚠️ Kya Miss Hua
Specific weaknesses — actionable

## 💡 Expected Answer (Full Format)
- Framework used (STAR/CIRCLES/etc.)
- Key points jo cover hone chahiye the
- Complete sample answer — 5-7 sentences — ready to memorize

## 🔑 Power Line
Ek line jo answer ko memorable banati hai

Hinglish mein, honest aur helpful.`;

  return callGroq(
    `Question: ${question}\n\nCandidate Answer: ${answer}`,
    system,
    apiKey
  );
}

/**
 * Get ideal answer tips without candidate's answer
 */
export async function getAnswerTips({ question, role, type, apiKey }) {
  const system = `Tu ek expert interview coach hai — ${role}, ${type}.

## ❓ Question Breakdown
Interviewer exactly kya dhundh raha hai

## 📋 Ideal Structure
Step-by-step framework — STAR ya jo bhi best fit ho

## ✍️ Complete Sample Answer
Ideal answer — 6-8 sentences, specific examples, PM/BA language, numbers where possible

## ⚠️ 3 Common Mistakes
Freshers jo galtiyan karte hain

## 🔑 Power Phrase
Ek memorable line

Hinglish mein, complete aur actionable.`;

  return callGroq(`Question: ${question}`, system, apiKey);
}
