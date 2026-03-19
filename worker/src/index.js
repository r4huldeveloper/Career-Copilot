/**
 * worker/src/index.js — Career Copilot API
 * Cloudflare Worker + D1
 *
 * Endpoints:
 *   POST /track  — increments counter + logs anonymous event
 *   GET  /stats  — returns global counters + recent activity feed
 *
 * Zero PII stored:
 *   - No resume text
 *   - No API keys
 *   - No IP addresses
 *   - No user identifiers
 *   Only: tool type, role name, model name, timestamp
 *
 * AI_RULES.md compliance:
 *   Rule 3 — Zero server cost at scale (Cloudflare free tier)
 *   Rule 4 — Zero PII, zero data leakage vectors
 *   Rule 1 — Pure logic, no UI concerns
 */

// ── CORS headers ──────────────────────────────────────────────────────────────

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGIN || '*';

  const isAllowed =
    !origin ||                              // non-browser / curl
    allowed === '*' ||
    origin === allowed ||
    origin === 'https://careercopilot.in' ||
    origin === 'https://www.careercopilot.in' ||    
    origin?.endsWith('.vercel.app') ||
    origin?.endsWith('.workers.dev') ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||   // any localhost port
    /^http:\/\/localhost:\d+$/.test(origin);          // any localhost port

  return {
    'Access-Control-Allow-Origin' : isAllowed ? (origin || '*') : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age'      : '86400',
  };
}

function json(data, status = 200, origin = '*', env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, env),
    },
  });
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_TOOLS  = new Set(['resume', 'jd', 'interview']);
const VALID_MODELS = new Set([
  'Groq', 'Mistral Small', 'Mixtral 8x7B',
  'Mistral Medium', 'Mistral Large', 'OpenAI', 'Gemini',
]);

function sanitizeRole(role) {
  if (!role || typeof role !== 'string') return 'General';
  // Strip anything that's not alphanumeric, space, slash, hyphen
  return role.replace(/[^a-zA-Z0-9 /\-]/g, '').slice(0, 60).trim() || 'General';
}

function sanitizeModel(model) {
  if (VALID_MODELS.has(model)) return model;
  return 'Groq'; // safe fallback
}

// ── Rate limiting — simple KV-based per-IP window ────────────────────────────
// Prevents counter inflation from abuse. No IP stored permanently.

async function isRateLimited(env, ip) {
  if (!env.KV) return false; // KV not bound — skip rate limit
  const key     = `rl:${ip}`;
  const current = parseInt(await env.KV.get(key) || '0', 10);
  if (current >= 30) return true; // max 30 track calls per minute per IP
  await env.KV.put(key, String(current + 1), { expirationTtl: 60 });
  return false;
}

// ── POST /track ───────────────────────────────────────────────────────────────

async function handleTrack(request, env) {
  const origin = request.headers.get('Origin') || '';
  const ip     = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limit check
  if (await isRateLimited(env, ip)) {
    return json({ error: 'Too many requests' }, 429, origin, env);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin, env);
  }

  const { tool, role, model } = body;

  // Validate tool
  if (!VALID_TOOLS.has(tool)) {
    return json({ error: 'Invalid tool' }, 400, origin, env);
  }

  const safeRole  = sanitizeRole(role);
  const safeModel = sanitizeModel(model);

  // Map tool to counter key
  const counterKey = tool === 'resume' ? 'resumes'
    : tool === 'jd'        ? 'jd_matches'
    : 'interviews';

  const now = Date.now();

  // Atomic increment counter + insert event in one transaction
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1'
    ).bind(counterKey),

    env.DB.prepare(
      'INSERT INTO events (tool, role, model, created_at) VALUES (?, ?, ?, ?)'
    ).bind(tool, safeRole, safeModel, now),

    // Prune events older than latest 100
    env.DB.prepare(
      'DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY created_at DESC LIMIT 100)'
    ),
  ]);

  return json({ ok: true }, 200, origin, env);
}

// ── GET /stats ────────────────────────────────────────────────────────────────

async function handleStats(request, env) {
  const origin = request.headers.get('Origin') || '';

  // Fetch counters + recent events in parallel
  const [countersResult, eventsResult] = await Promise.all([
    env.DB.prepare('SELECT key, value FROM counters').all(),
    env.DB.prepare(
      'SELECT tool, role, model, created_at FROM events ORDER BY created_at DESC LIMIT 8'
    ).all(),
  ]);

  // Build counters object
  const counters = { resumes: 0, jd_matches: 0, interviews: 0 };
  for (const row of countersResult.results) {
    counters[row.key] = row.value;
  }

  // Build model usage from recent events
  const modelTally = {};
  for (const ev of eventsResult.results) {
    modelTally[ev.model] = (modelTally[ev.model] || 0) + 1;
  }
  const modelUsage = Object.entries(modelTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));

  // Recent activity feed — role + tool + model + relative time
  const recentActivity = eventsResult.results.map(ev => ({
    tool     : ev.tool,
    role     : ev.role,
    model    : ev.model,
    timestamp: ev.created_at,
  }));

  return json({
    counters,        // { resumes, jd_matches, interviews }
    modelUsage,      // [{ name, count }]
    recentActivity,  // [{ tool, role, model, timestamp }]
    cachedAt: Date.now(),
  }, 200, origin, env);
}

// ── Router ────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env),
      });
    }

    if (url.pathname === '/track' && request.method === 'POST') {
      return handleTrack(request, env);
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      return handleStats(request, env);
    }

    return json({ error: 'Not found' }, 404, origin, env);
  },
};
