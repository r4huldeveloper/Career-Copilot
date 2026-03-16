/**
 * config.js — App-wide constants
 * Non-secret values only — safe to commit.
 * Kyun: Hardcoded values multiple files mein scattered the.
 * Ek jagah se sab control hoga — change once, update everywhere.
 *
 * NEVER put any API key here — BYOK model, user provides it.
 * Web3Forms key is public-safe by design (frontend-only service).
 */

export const CONFIG = {

  // ── AI Providers ──────────────────────────────────────────
  // Single source of truth for all provider metadata.
  // Adding a new provider = add one entry here only.
  PROVIDERS: {
    groq: {
      id:          "groq",
      name:        "Groq",
      tagline:     "Fastest inference — recommended",
      logoUrl:     "https://cdn.brandfetch.io/idmJWF3N06/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEyhd-twjqVd",
      keyPrefix:   "gsk_",
      keyLink:     "https://console.groq.com/keys",
      keyLinkText: "console.groq.com",
      placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      endpoint:    "https://api.groq.com/openai/v1/chat/completions",
      apiFormat:   "openai",   // request/response format
      models: [
        { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B",      tier: "free",    context: "128K" },
        { id: "llama-3.1-8b-instant",    name: "Llama 3.1 8B",       tier: "free",    context: "128K" },
        { id: "gemma2-9b-it",            name: "Gemma 2 9B",          tier: "free",    context: "8K"   },
        { id: "mixtral-8x7b-32768",      name: "Mixtral 8x7B",        tier: "free",    context: "32K"  },
      ],
      defaultModel: "llama-3.3-70b-versatile",
    },

    openai: {
      id:          "openai",
      name:        "OpenAI",
      tagline:     "GPT-4o, GPT-4o Mini",
      logoUrl:     "https://cdn.brandfetch.io/idR3duQxYl/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEyhd-twjqVd",
      keyPrefix:   "sk-",
      keyLink:     "https://platform.openai.com/api-keys",
      keyLinkText: "platform.openai.com",
      placeholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      endpoint:    "https://api.openai.com/v1/chat/completions",
      apiFormat:   "openai",
      models: [
        { id: "gpt-4o-mini",  name: "GPT-4o Mini",  tier: "free",    context: "128K" },
        { id: "gpt-4o",       name: "GPT-4o",        tier: "premium", context: "128K" },
        { id: "gpt-4-turbo",  name: "GPT-4 Turbo",   tier: "premium", context: "128K" },
        { id: "o1-mini",      name: "o1 Mini",        tier: "premium", context: "128K" },
      ],
      defaultModel: "gpt-4o-mini",
    },

    gemini: {
      id:          "gemini",
      name:        "Gemini",
      tagline:     "Google AI — free tier available",
      keyPrefix:   "AIza",
      keyLink:     "https://aistudio.google.com/app/apikey",
      keyLinkText: "aistudio.google.com",
      placeholder: "AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      // Google's OpenAI-compatible endpoint — no CORS issues, same format as Groq/OpenAI
      endpoint:    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiFormat:   "openai",
      models: [
        { id: "gemini-2.0-flash",    name: "Gemini 2.0 Flash",   tier: "free",    context: "1M"  },
        { id: "gemini-1.5-flash",    name: "Gemini 1.5 Flash",   tier: "free",    context: "1M"  },
        { id: "gemini-1.5-flash-8b", name: "Gemini Flash 8B",    tier: "free",    context: "1M"  },
        { id: "gemini-1.5-pro",      name: "Gemini 1.5 Pro",     tier: "premium", context: "2M"  },
      ],
      defaultModel: "gemini-2.0-flash",
    },

    mistral: {
      id:          "mistral",
      name:        "Mistral",
      tagline:     "European AI — privacy focused",
      logoUrl:     "https://cdn.brandfetch.io/idpMM3rFPs/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEyhd-twjqVd",
      keyPrefix:   "",          // Mistral keys have no fixed prefix
      keyLink:     "https://console.mistral.ai/api-keys",
      keyLinkText: "console.mistral.ai",
      placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      endpoint:    "https://api.mistral.ai/v1/chat/completions",
      apiFormat:   "openai",
      models: [
        { id: "mistral-small-latest",  name: "Mistral Small",   tier: "free",    context: "32K" },
        { id: "open-mixtral-8x7b",     name: "Mixtral 8x7B",    tier: "free",    context: "32K" },
        { id: "mistral-medium-latest", name: "Mistral Medium",  tier: "premium", context: "32K" },
        { id: "mistral-large-latest",  name: "Mistral Large",   tier: "premium", context: "128K"},
      ],
      defaultModel: "mistral-small-latest",
    },
  },

  // Default provider on first visit
  DEFAULT_PROVIDER: "groq",

  // ── Shared AI params ──────────────────────────────────────
  AI_MAX_TOKENS:   3000,
  AI_TEMPERATURE:  0.7,

  // ── Web3Forms ─────────────────────────────────────────────
  WEB3FORMS_URL: "https://api.web3forms.com/submit",
  WEB3FORMS_KEY: "44523102-ccbe-4318-b3f5-46e8268173c8",

  // ── Input Limits ──────────────────────────────────────────
  MAX_RESUME_LENGTH:  4000,
  MAX_JD_LENGTH:      2500,
  MAX_ANSWER_LENGTH:  2000,
  MIN_RESUME_LENGTH:  80,
  MAX_NAME_LENGTH:    100,
  MAX_MESSAGE_LENGTH: 1000,

  // ── History ───────────────────────────────────────────────
  MAX_HISTORY_SESSIONS: 50,

  // ── Feedback Widget ───────────────────────────────────────
  FEEDBACK_COOLDOWN_MS: 30000,

  // ── File Upload ───────────────────────────────────────────
  MAX_FILE_SIZE_MB: 5,

  // ── PDF.js CDN ────────────────────────────────────────────
  PDFJS_CDN:    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  PDFJS_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
};
