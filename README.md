<div align="center">
  <img src="assets/banner.png" alt="Career Copilot Banner" width="100%"/>
</div>

<br/>

<div align="center">

# 🚀 Career Copilot

**AI-powered resume analyzer, JD matcher & mock interview — built specifically for Indian freshers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Made for India](https://img.shields.io/badge/Made%20for-India%20🇮🇳-orange)](https://github.com/r4huldeveloper/Career-Copilot)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](CONTRIBUTING.md)
[![Version](https://img.shields.io/badge/version-0.3.0-purple)](CHANGELOG.md)
[![Zero Backend](https://img.shields.io/badge/backend-zero-success)](https://github.com/r4huldeveloper/Career-Copilot)

</div>

---

## 🎬 Demo

[![Watch Demo](https://img.shields.io/badge/▶%20Watch%20Full%20Demo-FF0000?style=for-the-badge&logo=loom)](https://www.loom.com/share/d04888ab5240409cbb4ad51d5df4048c)

---

## ✨ Features

| Feature | What it does |
|---|---|
| 📄 **Resume Analyzer** | ATS score, top 3 strengths/weaknesses, rewritten bullets in role-specific language |
| 🎯 **AI Role Fit Analyzer** | Auto-runs after resume analysis — maps your resume to top 5 best-fit roles with gap analysis |
| 🎯 **JD Matcher** | Paste any JD → exact keyword gaps, match score, copy-paste ready resume rewrites |
| 🎤 **Mock Interview** | Real questions by role + type, write your answer, detailed AI feedback + expected answer structure |
| 📊 **Score Tracker** | ATS score history — track if your resume is improving over time |
| 📜 **Interview History** | All past mock sessions saved locally — review anytime |
| 📁 **PDF/DOC Upload** | Drag & drop resume upload — no copy-paste needed |
| 🔒 **100% Private** | Data never leaves your browser. No server, no tracking, no account needed |
| 🆓 **Forever Free** | Uses your own free Groq API key (2 min setup) |

---

## 🏗️ Architecture Overview

Career Copilot follows a strict **4-layer architecture**. Every layer has exactly one responsibility — nothing bleeds into another.

```
┌──────────────────────────────────────────────────────────────┐
│                        UI Shell Layer                        │
│   index.html  ·  src/styles/*  ·  src/components/*           │
│   src/app.js  (events + DOM only — zero business logic)      │
└───────────────────────────┬──────────────────────────────────┘
                            │ calls with plain data
┌───────────────────────────▼──────────────────────────────────┐
│                    Pure Logic Layer                          │
│   src/core/logic/resumeLogic.js    — Resume + Role Fit       │
│   src/core/logic/jdLogic.js        — JD Matcher             │
│   src/core/logic/interviewLogic.js — Interview flows        │
│   src/core/logic/sessionState.js   — Runtime state          │
│                                                              │
│   Zero DOM · Zero CSS · Plain data in → plain data out       │
│   Portable to React Native / Electron / Node with 0 rewrites │
└──────────┬────────────────────────────┬─────────────────────┘
           │ calls                      │ reads/writes
┌──────────▼────────────┐   ┌───────────▼──────────────────────┐
│   AI Provider Layer   │   │       Data / Utils Layer         │
│   src/adapters/       │   │   src/utils/storage.js           │
│     aiProvider.js     │   │   src/utils/sanitize.js          │
│   src/api/groq.js     │   │   src/utils/markdown.js          │
│   src/prompts/        │   │   src/utils/pdfParser.js         │
│     groqPrompts.js    │   └──────────────────────────────────┘
└───────────────────────┘
```

**Full architecture docs** → [`.docs/architecture.md`](.docs/architecture.md)
**AI coding rules** → [`.docs/AI_RULES.md`](.docs/AI_RULES.md)

---

## 🔄 Request Flow

```
User clicks button
      │
      ▼
app.js  ──── reads DOM inputs
      │
      ▼
sanitize.js  ──── cleans + clamps all input text
      │
      ▼
Pure Logic Layer  ──── validates → calls GroqAdapter
      │
      ▼
groq.js  ──── circuit breaker → Groq API → structured response
      │
      ▼
Pure Logic Layer  ──── parses output → saves to storage/sessionState
      │
      ▼
app.js  ──── parseMarkdown → renders result in DOM
```

---

## 🚀 Run Locally

### Prerequisites
- Free Groq API key → [console.groq.com](https://console.groq.com)
- VS Code + [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

### Steps

```bash
git clone https://github.com/r4huldeveloper/Career-Copilot.git
cd Career-Copilot
code .
```

Then: right-click `index.html` → **Open with Live Server**

> ⚠️ Always open via Live Server (`http://`), never by double-clicking (`file://`). ES modules require an HTTP server.

### Get Your Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up free → **API Keys** → **Create API Key**
3. Paste in the app when prompted — stored only in your browser, never sent anywhere

---

## 📁 Project Structure

```
Career-Copilot/
├── .docs/
│   ├── architecture.md          # Full architecture + data flow + diagrams
│   └── AI_RULES.md              # Coding protocol for contributors and AI agents
├── .github/                     # PR templates & GitHub configs
├── assets/                      # Banner, demo media
├── src/
│   ├── app.js                   # UI Shell — events + DOM only, zero business logic
│   ├── config.js                # App-wide constants (non-secret, safe to commit)
│   ├── tests.js                 # Unit tests — sanitize, circuit breaker, parsers
│   │
│   ├── adapters/
│   │   └── aiProvider.js        # GroqAdapter — switch AI provider in 1 file
│   │
│   ├── api/
│   │   └── groq.js              # HTTP client + circuit breaker + session cache
│   │
│   ├── components/
│   │   ├── feedback.js          # Feedback widget
│   │   ├── fileUpload.js        # Drag & drop upload handler
│   │   ├── historyList.js       # Interview history renderer
│   │   ├── modal.js             # Modal controller
│   │   ├── progressBar.js       # Progress bar animations
│   │   └── scoreTracker.js      # ATS score history renderer
│   │
│   ├── core/
│   │   └── logic/               # ← Pure Logic Layer (zero DOM, fully portable)
│   │       ├── resumeLogic.js   # runResumeAnalysis(), runRoleFitAnalysis(), parseAtsScore()
│   │       ├── jdLogic.js       # runJdMatch()
│   │       ├── interviewLogic.js # runGenerateQuestion(), runEvaluateAnswer(), runGetAnswerTips()
│   │       └── sessionState.js  # In-memory runtime state
│   │
│   ├── prompts/
│   │   └── groqPrompts.js       # Structured prompt templates — output contract enforced
│   │
│   ├── styles/
│   │   ├── variables.css        # Design tokens
│   │   ├── base.css             # Reset + globals
│   │   ├── components.css       # UI components
│   │   └── layout.css           # Page structure
│   │
│   └── utils/
│       ├── sanitize.js          # Input sanitization gate — all text passes through here
│       ├── storage.js           # localStorage wrapper + encoding + ATS scores + history
│       ├── markdown.js          # Lightweight markdown → safe HTML parser
│       └── pdfParser.js         # PDF.js text extraction
│
├── index.html                   # Entry point — structural lock, never alter IDs/classes
├── README.md
├── ROADMAP.md
├── CONTRIBUTING.md
├── LICENSE
└── vercel.json
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Vanilla JS (ES Modules) | No framework overhead, no build step, instant local dev |
| CSS Custom Properties | Full design token system, dark mode support |
| PDF.js (CDN) | Client-side PDF text extraction |
| Groq API + Llama 3.3 70B | AI inference (~2s response time) |
| Vercel | Zero-config static deployment |

---

## 🔒 Security & Privacy Model

- **BYOK (Bring Your Own Key):** Your Groq API key is stored only in your browser's localStorage, Base64-encoded. Never transmitted to any server other than Groq directly.
- **Sanitization Gate:** All user inputs pass through `src/utils/sanitize.js` before any processing. All AI output is HTML-escaped before rendering.
- **No PII on server:** Zero user data, zero analytics, zero third-party tracking.
- **Circuit Breaker:** If Groq API fails 3 times in 60s, requests are blocked for 30s — the app stays fully functional.

---

## 💡 Why This Architecture (Developer Notes)

- **Zero build step** — clone and run with Live Server. No webpack, no bundler, no `npm install`.
- **Pure Logic Layer** (`src/core/logic/`) is completely decoupled from the DOM. Move to React Native tomorrow — the business logic migrates with zero rewrites.
- **1-file provider swap** — want to add OpenAI or Gemini? Rewrite only `src/adapters/aiProvider.js`.
- **Structured prompt contracts** — every AI prompt defines exact output format. Parsers and prompts are a coupled contract documented in `architecture.md`.
- **AI_RULES.md** governs every change — human or AI agent. No tight coupling, no visual breakage, no unstructured AI output ever gets merged.

---

## 🤝 Contributing

Contributions welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) first, then check [AI_RULES.md](.docs/AI_RULES.md) — every PR must pass the Zero-Escape 5-point audit.

**Good first issues:**
- [ ] Add Gemini API support (1-file change in `aiProvider.js`)
- [ ] Add more interview question types
- [ ] Improve mobile layout
- [x] Dark mode
- [x] Save interview history locally
- [x] ATS Score Tracker
- [x] AI Role Fit Analyzer

---

## 📜 License

[MIT](LICENSE) — free to use, modify, distribute.

---

## 👨‍💻 Author

Built by **Rahul Sharma** — built the tool he wished existed when job hunting.

[![GitHub](https://img.shields.io/badge/GitHub-r4huldeveloper-181717?logo=github)](https://github.com/r4huldeveloper)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rahul%20Sharma-0A66C2?logo=linkedin)](https://linkedin.com/in/ra4hul)

---

<div align="center">

⭐ **If this helped you land a job — star the repo. Helps other Indian freshers find it.**

</div>
