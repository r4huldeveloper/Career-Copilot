/**
 * config.js — App-wide constants
 * Non-secret values only — safe to commit.
 * NEVER put any API key here — BYOK model, user provides it.
 */

export const CONFIG = {

  PROVIDERS: {

    groq: {
      id:          "groq",
      name:        "Groq",
      tagline:     "Free · Fastest inference — recommended",
      logo:        "groq favicon.ico",
      keyPrefix:   "gsk_",
      keyLink:     "https://console.groq.com/keys",
      keyLinkText: "console.groq.com",
      placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      endpoint:    "https://api.groq.com/openai/v1/chat/completions",
      apiFormat:   "openai",
      models: [
        {
          id: "llama-3.3-70b-versatile",
          name: "Llama 3.3 70B",
          context: "128K",
          tags: ["Recommended", "Best Quality"],
        },
        {
          id: "openai/gpt-oss-120b",
          name: "GPT OSS 120B",
          context: "128K",
          tags: ["High Accuracy", "OSS"],
        },
        {
          id: "llama-3.1-8b-instant",
          name: "Llama 3.1 8B",
          context: "8K",
          tags: ["Fast"],
        },
      ],
      defaultModel: "gpt-oss-120b",
    },

    mistral: {
      id:          "mistral",
      name:        "Mistral",
      tagline:     "Free · European AI — privacy focused",
      logo:        "mistral favicon.ico",
      keyPrefix:   "",
      keyLink:     "https://console.mistral.ai/api-keys",
      keyLinkText: "console.mistral.ai",
      placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      endpoint:    "https://api.mistral.ai/v1/chat/completions",
      apiFormat:   "openai",
      models: [
        {
          id: "mistral-small-latest",
          name: "Mistral Small",
          context: "32K",
          tags: ["Free", "Fast"],
        },
        {
          id: "open-mixtral-8x7b",
          name: "Mixtral 8x7B",
          context: "32K",
          tags: ["Free", "Balanced"],
        },
        {
          id: "mistral-medium-latest",
          name: "Mistral Medium",
          context: "32K",
          tags: ["Premium"],
        },
        {
          id: "mistral-large-latest",
          name: "Mistral Large",
          context: "128K",
          tags: ["Premium", "Best Quality"],
        },
      ],
      defaultModel: "mistral-small-latest",
    },

  },

  DEFAULT_PROVIDER: "groq",

  AI_MAX_TOKENS:   6000,
  AI_TEMPERATURE:  0.7,

  WEB3FORMS_URL: "https://api.web3forms.com/submit",
  WEB3FORMS_KEY: "44523102-ccbe-4318-b3f5-46e8268173c8",

  MAX_RESUME_LENGTH:  4000,
  MAX_JD_LENGTH:      2500,
  MAX_ANSWER_LENGTH:  2000,
  MIN_RESUME_LENGTH:  80,
  MAX_NAME_LENGTH:    100,
  MAX_MESSAGE_LENGTH: 1000,

  MAX_HISTORY_SESSIONS: 50,
  FEEDBACK_COOLDOWN_MS: 30000,
  MAX_FILE_SIZE_MB: 5,

  PDFJS_CDN:    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  PDFJS_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
};
