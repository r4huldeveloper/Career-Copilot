# Career Copilot — AI Context File (valid till v0.2.0)

> **Yeh file kisi bhi AI assistant ko Career Copilot project ka poora context deti hai.**
> Har naye session ki shuruat mein yeh file paste karo — zero context loss.

---

## 🚀 Project Overview

**Career Copilot** — Free, open-source AI career tool for Indian freshers.

| | |
|---|---|
| **Live** | https://careercopilot.in |
| **GitHub** | https://github.com/r4huldeveloper/Career-Copilot |
| **Stack** | Vanilla JS ES Modules, Groq API (llama-3.3-70b), PDF.js |
| **Deploy** | Vercel free plan — forever free (BYOK architecture) |
| **License** | MIT |
| **Twitter** | @careercopilot04 |
| **Email** | careercopilot04@gmail.com |
| **LinkedIn** | linkedin.com/company/career-copilot-official |
| **Domain** | careercopilot.in (acquired) |

---

## 🏗️ Architecture — Non-Negotiable

**Pattern: Clean Architecture + Separation of Concerns**

```
Career-Copilot/
├── assets/                        # images, icons, logos, favicons, etc.
├── docs/
│   └── architecture.md            # large-scale architecture documentation
├── src/
│   ├── app.js                     # main orchestrator: wires events, delegates to components
│   ├── config.js                  # ALL constants & configuration (no hardcoding elsewhere)
│   ├── api/
│   │   └── groq.js                # Groq API calls + elite prompts + sessionStorage caching
│   ├── components/
│   │   ├── feedback.js            # feedback widget (Web3Forms integration + rate limiting)
│   │   ├── fileUpload.js          # drag & drop file upload handler
│   │   ├── historyList.js         # renders interview/question history
│   │   ├── modal.js               # generic modal controller
│   │   ├── progressBar.js         # loading / progress animations
│   │   └── scoreTracker.js        # ATS score display & tracking renderer
│   ├── styles/
│   │   ├── variables.css          # design tokens, colors, spacing, typography
│   │   ├── base.css               # CSS reset + global styles
│   │   ├── components.css         # component-specific styles + utility classes
│   │   └── layout.css             # page layout, grid/flex, responsive breakpoints
│   └── utils/
│       ├── markdown.js            # markdown → HTML conversion + XSS escaping
│       ├── pdfParser.js           # PDF text extraction (uses pdf.js lazy-loaded)
│       └── storage.js             # localStorage / sessionStorage wrapper (theme, API key, history, scores)
├── index.html                     # main entry point – markup only, zero logic, zero inline styles
├── README.md                      # project overview, setup, usage
├── ROADMAP.md                     # feature roadmap & future plans
├── CONTRIBUTING.md                # contribution guidelines
├── LICENSE                        # license file (likely MIT or similar)
├── vercel.json                    # Vercel config + CSP headers + security settings
├── .gitignore                     # git ignore rules
└── src/tests.js                   # browser console test suite (edge cases)
```

**Key decisions:**
- No `onclick` in HTML — all event listeners in JS
- ES Modules — always use Live Server locally, never `file://`
- BYOK model — user brings own Groq key, zero server cost forever
- No framework — Vanilla JS, no build step, anyone can contribute

---

## 📋 Mandatory Coding Standards — Every Single File

Every output must follow ALL of these. No exceptions.

### 1. Clean Architecture
- One file, one responsibility
- `app.js` only orchestrates — no rendering logic
- Components only render — no business logic

### 2. Modular Code
- New feature = new file in correct folder
- Import from `config.js` — never hardcode values

### 3. Error Handling
```javascript
// CORRECT
} catch (err) {
  console.error("[ComponentName] functionName:", err.message);
  showError("element-id", err.message);
}

// WRONG — never do this
} catch { alert("error") }
} catch (e) { console.log(e) }
```

### 4. Logging
- `console.error("[context] description:", err.message)` in every catch
- `console.log` NEVER in production code
- Format: `[FileName] functionName: message`

### 5. Security
```javascript
// Input sanitization — always
value.trim().slice(0, CONFIG.MAX_NAME_LENGTH)

// XSS — all user input through escapeHtml() before DOM insertion
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 6. Scalable Structure
- All constants in `src/config.js`
- All storage in `src/utils/storage.js`
- `config.js` NEVER contains Groq API key — BYOK, user provides it
- Web3Forms key IS safe in config — public-safe by design

### 7. Performance
- Lazy load heavy libraries (PDF.js)
- sessionStorage cache in groq.js — same input = instant result
- Debounce user inputs where needed

### 8. Accessibility
- `aria-label` on all interactive elements
- `tabindex="0"` + keyboard handlers on custom clickables
- `role="alert"` on error messages
- `aria-expanded` on toggleable items
- Escape key closes modals

### 9. JSDoc
```javascript
/**
 * Short description
 * @param {string} paramName - What it does
 * @returns {Promise<string>}
 */
export async function myFunction(paramName) {
```
Every exported function must have JSDoc.

### 10. Error Boundaries
- App never shows blank screen
- Every async call has try/catch
- Graceful degradation always

### 11. No alert()
- `showError("element-id", message)` everywhere
- Errors show inline, auto-hide after 5s

### 12. Git Hygiene
```
feat: add X feature
fix: resolve Y bug
chore: update Z config
docs: add JSDoc to W
refactor: extract V component
```
Never push directly to master.

---

## 🔑 Key Constants (src/config.js)

```javascript
GROQ_ENDPOINT: "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL: "llama-3.3-70b-versatile"
GROQ_MAX_TOKENS: 3000
WEB3FORMS_URL: "https://api.web3forms.com/submit"
WEB3FORMS_KEY: "44523102-ccbe-4318-b3f5-46e8268173c8"  // public-safe
MAX_RESUME_LENGTH: 4000
MAX_JD_LENGTH: 2500
MAX_ANSWER_LENGTH: 2000
MIN_RESUME_LENGTH: 80
MAX_NAME_LENGTH: 100
MAX_MESSAGE_LENGTH: 1000
MAX_HISTORY_SESSIONS: 50
FEEDBACK_COOLDOWN_MS: 30000
MAX_FILE_SIZE_MB: 5
PDFJS_CDN: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
PDFJS_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
```

---

## ✅ What's Done (v0.2.0)

### Features
- Resume Analyzer — ATS score, role-specific rewrite, quick fixes
- JD Matcher — exact gap analysis, missing keywords, ready-to-use bullets
- Mock Interview — real questions, AI feedback, expected answers
- AI Role Fit Analyzer — top 3 best-fit roles, 90-day roadmap
- ATS Score Tracker — history of scores, auto-saved after each analysis
- Interview History — sessions saved in localStorage

### Architecture
- `src/config.js` — all constants centralized
- `scoreTracker.js` — extracted from app.js
- `historyList.js` — extracted from app.js
- `storage.js` — `getTheme/setTheme` added, direct localStorage removed
- All inline styles → CSS classes in `components.css`
- `vercel.json` — CSP, X-Frame-Options, X-Content-Type headers
- `tests.js` — 30+ edge case tests

### Security Hardening
- `escapeHtml()` on all user input
- Input sanitization `.trim().slice()`
- No `alert()` anywhere — `showError()` inline
- sessionStorage cache in `groq.js`
- Rate limiting in `feedback.js`
- Offline detection banner

### Elite Prompts (groq.js)
All 4 prompts rewritten with:
- Indian company names (Swiggy, Razorpay, CRED, Flipkart, PhonePe)
- Structured table output
- Copy-paste ready fixes
- Brutal honesty — no generic advice
- Hinglish output

---

## 🗺️ Product Roadmap

```
Phase 1 (NOW — 100 users)
  → LinkedIn outreach 10 PMs/day
  → 2 carousel posts
  → Users laao, feedback lo

Phase 2 (Month 2 — Retention)
  → Company-specific prep (Swiggy, Razorpay, Google)
  → Shareable score card (Canvas API)

Phase 3 (Month 3-4 — Community)
  → Peer review system
  → User accounts (Google login)

Phase 4 (Month 5+ — Monetization)
  → Free: everything as-is
  → Pro ₹99/mo: unlimited + company prep + priority
  → Paid features → separate PRIVATE repo (MIT only on public core)
```

---

## 🧠 Product Strategy

- **BYOK = zero server cost forever** — this is the moat
- **Prompt engineering = real IP** — not the model
- **Open Core model** — free MIT core + paid Pro private repo
- **Domain trigger** — buy premium plan at 100+ real users
- **Never fine-tune** — prompt specialization is enough
- **India-first** — Hinglish, Indian companies, Indian ATS systems

---

## ⚙️ Local Development

```bash
git clone https://github.com/r4huldeveloper/Career-Copilot.git
cd Career-Copilot
# Open with VS Code Live Server — never file://
# Get free Groq key at console.groq.com
```

---

## 🧪 Run Tests

```javascript
// In browser console on localhost:
import { runTests } from "./src/tests.js";
runTests();
```

---

## 📌 Important Rules — Always Follow

1. **Free solutions only** — no paid services unless absolutely necessary
2. **Reason batao** — every change must explain why it was done
3. **Elite output only** — production-ready, no half-done work
4. **config.js mein koi API key nahi** — open source hai
5. **Web3Forms key is public-safe** — intentional, not a security issue
6. **Groq key is BYOK** — never store it server-side
7. **No direct master push** — PR workflow
8. **No console.log in production** — only console.error in catch blocks

---

*Last updated: v0.2.0 — Career Copilot*
