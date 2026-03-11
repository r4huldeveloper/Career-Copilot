# Career Copilot
> AI-powered career assistant for Indian PM/BA freshers

## Project Structure
```
career-copilot/
├── index.html                  # Entry point only — no logic here
├── public/
│   └── favicon.ico
├── src/
│   ├── styles/
│   │   ├── variables.css       # Design tokens (colors, fonts, spacing)
│   │   ├── base.css            # Reset + global styles
│   │   ├── components.css      # Reusable UI components
│   │   └── layout.css          # Page layout & structure
│   ├── utils/
│   │   ├── pdfParser.js        # PDF.js text extraction
│   │   ├── markdown.js         # Markdown → HTML parser
│   │   └── storage.js          # LocalStorage wrapper (API key etc)
│   ├── api/
│   │   └── groq.js             # All Groq API calls
│   ├── components/
│   │   ├── fileUpload.js       # File upload drop zone component
│   │   ├── progressBar.js      # Animated progress bar
│   │   └── modal.js            # Modal (API key setup)
│   └── app.js                  # Main app — routing, state, init
└── index.html
```

## Tech Stack
- Vanilla JS (ES6 modules) — no framework needed for this scale
- CSS custom properties — design tokens
- PDF.js — PDF text extraction
- Groq API — LLM inference (llama-3.3-70b)

## Setup
1. Open `index.html` in browser
2. Enter Groq API key (get free at console.groq.com)
3. Done — no build step needed
