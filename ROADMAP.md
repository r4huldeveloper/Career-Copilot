# 🗺️ Career Copilot — Roadmap
> Living document. Updated as we ship and learn from users.

---

## ✅ Shipped — v0.1.0

| Feature | Status |
|---|---|
| Resume Analyzer — ATS score, rewritten bullets | ✅ Shipped |
| JD Matcher — exact gaps & corrections | ✅ Shipped |
| Mock Interview — questions, AI feedback, expected answers | ✅ Shipped |
| PDF/DOC upload via PDF.js | ✅ Shipped |
| BYOK model — Groq API, free forever | ✅ Shipped |
| 15+ job roles — PM, BA, SDE, Data Science, SEO, Design | ✅ Shipped |
| Interview session history (localStorage) | ✅ Shipped |
| Open source — MIT License | ✅ Shipped |
| GitHub — branch protection, PR template, issue templates | ✅ Shipped |
| Floating Feedback Widget | ✅ Shipped |

---

## ✅ Shipped — v0.2.0

| Feature | Status |
|---|---|
| Dark mode toggle | ✅ Shipped |
| Mobile responsive layout | ✅ Shipped |
| `src/config.js` — centralized constants | ✅ Shipped |
| Replace `alert()` with inline UI error messages | ✅ Shipped |
| Input sanitization + length limits (`sanitize.js`) | ✅ Shipped |
| Circuit breaker in `groq.js` (retry / backoff) | ✅ Shipped |
| `GroqAdapter` provider interface (`src/adapters/aiProvider.js`) | ✅ Shipped |
| Prompt templates moved to `src/prompts/groqPrompts.js` | ✅ Shipped |
| Session memory layer (`src/core/logic/sessionState.js`) | ✅ Shipped |
| `parseMarkdown` + XSS-safe HTML output | ✅ Shipped |
| `src/tests.js` — sanitize + circuit breaker unit tests | ✅ Shipped |
| AI Role Fit Analyzer | ✅ Shipped |
| ATS Score Tracker over time | ✅ Shipped |

---

## ✅ Shipped — v0.3.0 (current)

| Feature | Status |
|---|---|
| Pure Logic Layer — `src/core/logic/resumeLogic.js` | ✅ Shipped |
| Pure Logic Layer — `src/core/logic/jdLogic.js` | ✅ Shipped |
| Pure Logic Layer — `src/core/logic/interviewLogic.js` | ✅ Shipped |
| `app.js` reduced to UI Shell — zero business logic | ✅ Shipped |
| Structured prompt output contracts — all 6 prompts | ✅ Shipped |
| `parseAtsScore` — 3-pattern fallback regex | ✅ Shipped |
| Role Fit section show/hide bug fixed | ✅ Shipped |
| Mock Interview feedback + tips display bug fixed | ✅ Shipped |
| `AI_RULES.md` — Output Contract + Test Mandate rules added | ✅ Shipped |
| `architecture.md` — full data flow + layer map updated | ✅ Shipped |

---

## 📋 Planned — v0.4.0

| Feature | Why |
|---|---|
| More models added from groq | ✅ Shipped |
| Mistral support | ✅ Shipped |
| Resume templates download | Role-specific templates — PM, SDE, BA ready to fill |
| LinkedIn optimization tool | After resume, fix LinkedIn profile too |

---

## 🔭 Future Vision — v1.0.0

| Feature | Why |
|---|---|
| User accounts + saved resumes | Track progress across sessions |
| Resume version history | See improvement over time |
| Company-specific interview prep | Prep for Flipkart, Swiggy, Razorpay etc. |
| Share interview score on LinkedIn | Viral loop — each share = new users |
| Referral system | Share → unlock premium features |

---

*Last updated: March 15, 2026*
*Version: v0.3.0*
*Built by [@r4huldeveloper](https://github.com/r4huldeveloper)*
