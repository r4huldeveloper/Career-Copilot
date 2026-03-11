# 🚀 Career Copilot

> AI-powered resume analyzer, JD matcher & mock interview tool — built specifically for Indian freshers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Made for India](https://img.shields.io/badge/Made%20for-India%20🇮🇳-orange)](https://github.com/r4huldeveloper/Career-Copilot)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](CONTRIBUTING.md)

---

**[👉 Live Demo](https://career-copilot-seven.vercel.app)**

## ✨ Features

- **📄 Resume Analyzer** — ATS score, strengths/weaknesses, rewritten bullets in PM/BA language
- **🎯 JD Matcher** — Paste any JD → exact gaps, missing keywords & ready-to-use resume lines
- **🎤 Mock Interview** — Real questions, write your answer, detailed AI feedback + full expected answer
- **📁 PDF/DOC Upload** — Upload resume directly — no copy-paste needed
- **🔒 100% Private** — Data never leaves your browser. No server, no tracking.
- **🆓 Forever Free** — Uses your own free Groq API key (2 min setup)

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

Then: right click `index.html` → **Open with Live Server**

> ⚠️ Always open via Live Server (`http://`), never by double-clicking (`file://`).

### Get Your Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up free → **API Keys** → **Create API Key**
3. Paste in the app when prompted

---

## 📁 Project Structure

```
Career-Copilot/
├── index.html              # Entry point — markup only, zero logic
├── README.md
└── src/
    ├── app.js              # Main orchestrator
    ├── api/
    │   └── groq.js         # All AI API calls
    ├── components/
    │   ├── fileUpload.js   # Drag & drop upload
    │   ├── modal.js        # Modal controller
    │   └── progressBar.js  # Progress animations
    ├── styles/
    │   ├── variables.css   # Design tokens
    │   ├── base.css        # Reset + globals
    │   ├── components.css  # UI components
    │   └── layout.css      # Page structure
    └── utils/
        ├── pdfParser.js    # PDF.js extraction
        ├── markdown.js     # Markdown → HTML
        └── storage.js      # LocalStorage wrapper
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| Vanilla JS (ES Modules) | No framework overhead |
| CSS Custom Properties | Design token system |
| PDF.js | PDF text extraction |
| Groq API + Llama 3.3 70B | AI inference (~2s) |

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

**Good first issues:**
- [ ] Add dark mode
- [ ] Add Gemini API support  
- [ ] Save interview history locally
- [ ] Add Hindi UI option
- [ ] Improve mobile layout

---

## 📜 License

[MIT](LICENSE) — free to use, modify, distribute.

---

## 👨‍💻 Author

Built by **Rahul Sharma** — built the tool he wished existed when job hunting.

- GitHub: [@r4huldeveloper](https://github.com/r4huldeveloper)
- LinkedIn: [@Rahul Sharma](https://linkedin.com/in/ra4hul)

---

⭐ If this helped you — star the repo. Helps other Indian freshers find it.
