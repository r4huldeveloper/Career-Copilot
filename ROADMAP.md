# 🗺️ Career Copilot — Roadmap
> This is a living document. Updated as we ship and learn from users.

---

## ✅ What We've Built (v0.1.0)
The first version — built in 1 day, shipped because someone else needed it too.

| Feature | Status |
|---------|--------|
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

## ✅ Completed (v0.2.0-final)

| Feature | Status |
|---------|--------|
| Dark mode toggle | ✅ Shipped |
| Mobile responsive layout | ✅ Shipped |
| Feedback Button | ✅ Shipped |
| `src/config.js` — centralized constants | ✅ Shipped |
| Replace `alert()` with modal UI messages | ✅ Shipped |
| Move `initFeedbackWidget()` inside `init()` | ✅ Shipped |
| Input sanitization and length-limits (`sanitize.js`) | ✅ Shipped |
| `callGroq` circuit breaker (retry/backoff) | ✅ Shipped |
| `GroqAdapter` provider interface (`src/adapters/aiProvider.js`) | ✅ Shipped |
| Prompt templates moved to `src/prompts/groqPrompts.js` | ✅ Shipped |
| Session-memory layer (`src/core/logic/sessionState.js`) | ✅ Shipped |
| `parseMarkdown` + XSS-safe HTML output | ✅ Shipped |
| `src/tests.js` expanded (sanitize + circuit breaker) | ✅ Shipped |
| AI Role Fit Analyzer | ✅ Shipped |
| Resume score tracker over time | ✅ Shipped |

---

## 📋 Planned (v0.3.0)

| Feature | Why |
|---------|-----|
| Gemini API support | Users who prefer Google's free tier |
| Resume templates download | Role-specific templates — PM, SDE, BA |
| LinkedIn optimization tool | After resume, fix LinkedIn profile too |
| Share interview score on LinkedIn | Viral loop — each share = new users |

---

## 🔭 Future Vision (v1.0.0)

| Feature | Why |
|---------|-----|
| User accounts + saved resumes | Track progress over multiple sessions |
| Resume version history | See how resume improved over time |
| Company-specific interview prep | Prep for Flipkart, Swiggy, Razorpay etc. |
| Referral system | Share → unlock premium features |
| API support — OpenAI, Claude, Mistral | More model choices |

---

## 💡 How to Contribute
See something in the roadmap you want to build?

1. Check [open issues](https://github.com/r4huldeveloper/Career-Copilot/issues) — find one labeled `good first issue`
2. Comment on the issue — "I'd like to work on this"
3. Fork → build → PR

Every contribution matters — from fixing a typo to shipping a full feature.

---

## 📊 Current Stats
- 🌟 Live at [career-copilot-seven.vercel.app](https://career-copilot-seven.vercel.app)
- 👥 Built for Indian freshers — PM, BA, SDE, Data Science, SEO, Design
- 🔒 100% private — data never leaves your browser
- 💰 Forever free — BYOK model

---

*Last updated: March 15, 2026*
*Version: v0.2.0 (final)*
*Built by [@r4huldeveloper](https://github.com/r4huldeveloper)*
