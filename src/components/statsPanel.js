/**
 * statsPanel.js — Career Copilot v0.4.0
 * Modern full-width stats panel
 * AI_RULES.md: Rule 1,2,3,4,6 compliant
 */

const WORKER_URL    = 'https://career-copilot-api.carrercopilot.workers.dev';
const POLL_INTERVAL = 30_000;

export function stripRelativeTime(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000)   return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

const ROLE_COLORS = {
  'PM'        : { bg:'#F5F3FF', text:'#5B21B6' },
  'BA'        : { bg:'#F0FDF4', text:'#166534' },
  'SDE'       : { bg:'#EFF6FF', text:'#1D4ED8' },
  'Frontend'  : { bg:'#EFF6FF', text:'#1D4ED8' },
  'Backend'   : { bg:'#EFF6FF', text:'#1D4ED8' },
  'Full Stack': { bg:'#EFF6FF', text:'#1D4ED8' },
  'Data'      : { bg:'#FFFBEB', text:'#92400E' },
  'SEO'       : { bg:'#FFF1F2', text:'#9F1239' },
  'Marketing' : { bg:'#FFF1F2', text:'#9F1239' },
  'Design'    : { bg:'#F5F3FF', text:'#5B21B6' },
  'DevOps'    : { bg:'#F0F9FF', text:'#0C4A6E' },
};
const FB_COLOR = { bg:'#F9FAFB', text:'#6B7280' };

function getRoleColor(role) {
  if (!role) return FB_COLOR;
  const k = Object.keys(ROLE_COLORS).find(k => role.toLowerCase().includes(k.toLowerCase()));
  return ROLE_COLORS[k] || FB_COLOR;
}

const MODEL_COLORS = {
  'Groq'          : '#E24B4A',
  'Mistral Small' : '#1D9E75',
  'Mixtral 8x7B'  : '#378ADD',
  'Mistral Medium': '#BA7517',
  'Mistral Large' : '#7F77DD',
  'OpenAI'        : '#639922',
  'Gemini'        : '#D4537E',
};
function getMC(m) { return MODEL_COLORS[m] || '#888780'; }

const TOOL_LABELS = {
  resume   : 'Resume analyzed',
  jd       : 'JD matched',
  interview: 'Mock interview',
};

// ── Counter accent colours ────────────────────────────────────────────────────
const COUNTER_ACC = [
  'var(--color-green)',
  'var(--color-accent)',
  'var(--color-purple)',
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function renderSkeleton() {
  const skCounter = () => `
    <div class="stp-counter" style="--stp-i:0s">
      <div class="stp-sk stp-sk--num"></div>
      <div class="stp-sk stp-sk--lbl"></div>
      <div class="stp-sk stp-sk--bar"></div>
    </div>`;
  const skRow = () => `<div class="stp-sk stp-sk--row"></div>`;
  return `
    <div class="stp-panel">
      <div class="stp-live-row">
        <span class="stp-live-dot"></span>
        <span class="stp-live-label">Live activity</span>
      </div>
      <div class="stp-counters">${skCounter()}${skCounter()}${skCounter()}</div>
      <div class="stp-bottom">
        <div class="stp-card" style="--stp-i:0s">${skRow()}${skRow()}${skRow()}</div>
        <div class="stp-card" style="--stp-i:0s">${skRow()}${skRow()}${skRow()}${skRow()}</div>
      </div>
    </div>`;
}

// ── Full panel ────────────────────────────────────────────────────────────────
function renderPanel({ counters, modelUsage, recentActivity }) {
  const maxM   = modelUsage.length ? Math.max(...modelUsage.map(m => m.count)) : 1;
  const totalM = modelUsage.reduce((a,b) => a + b.count, 0) || 1;
  const maxC   = Math.max(counters.resumes, counters.jd_matches, counters.interviews, 1);
  const bw     = n => `${Math.max(Math.round((n/maxC)*100), n>0?6:0)}%`;

  const countersData = [
    { num:counters.resumes,    label:'Resumes analyzed', acc:COUNTER_ACC[0], bd:'.3s', i:'.05s' },
    { num:counters.jd_matches, label:'JD matches run',   acc:COUNTER_ACC[1], bd:'.4s', i:'.12s' },
    { num:counters.interviews, label:'Mock interviews',  acc:COUNTER_ACC[2], bd:'.5s', i:'.19s' },
  ];

  return `
    <div class="stp-panel">

      <div class="stp-live-row">
        <span class="stp-live-dot" aria-hidden="true"></span>
        <span class="stp-live-label">Live activity</span>
      </div>

      <div class="stp-counters">
        ${countersData.map(c => `
        <div class="stp-counter" style="--stp-i:${c.i};--stp-ac:${c.acc}">
          <div class="stp-counter__num" data-stp-target="${c.num}">0</div>
          <div class="stp-counter__label">${c.label}</div>
          <div class="stp-counter__bar">
            <div class="stp-counter__fill" style="--stp-w:${bw(c.num)};--stp-bd:${c.bd}"></div>
          </div>
        </div>`).join('')}
      </div>

      <div class="stp-bottom">

        <div class="stp-card" style="--stp-i:.28s">
          <div class="stp-card__head">Model usage</div>
          <div class="stp-models">
            ${modelUsage.length ? modelUsage.map((m,i) => `
            <div class="stp-model-row">
              <div class="stp-model-dot" style="--stp-mc:${getMC(m.name)}"></div>
              <span class="stp-model-name">${m.name}</span>
              <div class="stp-model-track">
                <div class="stp-model-fill" style="--stp-mc:${getMC(m.name)};--stp-w:${Math.round((m.count/maxM)*100)}%;--stp-bd:${.55+i*.1}s"></div>
              </div>
              <span class="stp-model-pct">${Math.round((m.count/totalM)*100)}%</span>
            </div>`).join('')
            : `<p class="stp-empty-msg">Analyze a resume to see model stats</p>`}
          </div>
        </div>

        <div class="stp-card" style="--stp-i:.36s">
          <div class="stp-card__head">Recent activity</div>
          <div class="stp-feed">
            ${recentActivity.length ? recentActivity.slice(0,4).map((ev,i) => {
              const c       = getRoleColor(ev.role);
              const mColor  = getMC(ev.model);
              const label   = TOOL_LABELS[ev.tool] || ev.tool;
              const initials= ev.role.split(/[\s\/\-()+]+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');
              return `
              <div class="stp-feed-row" style="--stp-i:${.44+i*.07}s">
                <div class="stp-avatar" style="background:${c.bg};color:${c.text}">${initials}</div>
                <div class="stp-feed-info">
                  <div class="stp-feed-role" title="${ev.role}">${ev.role}</div>
                  <div class="stp-feed-action">${label}</div>
                </div>
                <span class="stp-badge" style="background:${mColor}18;color:${mColor};border:1px solid ${mColor}44">${ev.model}</span>
                <span class="stp-time">${stripRelativeTime(ev.timestamp)}</span>
              </div>`;
            }).join('')
            : `<p class="stp-empty-msg">Be the first to analyze your resume!</p>`}
          </div>
        </div>

      </div>
    </div>`;
}

// ── Animations ────────────────────────────────────────────────────────────────
function attachAnimations(root) {
  // Count-up
  root.querySelectorAll('[data-stp-target]').forEach(el => {
    const target = parseInt(el.dataset.stpTarget, 10);
    const card   = el.closest('.stp-counter');
    const delay  = card ? parseFloat(card.style.getPropertyValue('--stp-i')||'0')*1000 : 0;
    if (target === 0) { el.textContent = '0'; return; }
    setTimeout(() => {
      const dur = Math.min(600 + target * 3, 2000);
      const s   = performance.now();
      const tick = now => {
        const t = Math.min((now-s)/dur, 1);
        const e = 1 - Math.pow(1-t, 3);
        el.textContent = Math.round(e*target).toLocaleString('en-IN');
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay + 80);
  });

  // Counter bars
  root.querySelectorAll('.stp-counter__fill').forEach(bar => {
    const delay = parseFloat(bar.style.getPropertyValue('--stp-bd')||'.3')*1000;
    setTimeout(() => bar.classList.add('stp-counter__fill--go'), delay);
  });

  // Model bars
  root.querySelectorAll('.stp-model-fill').forEach(bar => {
    const delay = parseFloat(bar.style.getPropertyValue('--stp-bd')||'.5')*1000;
    setTimeout(() => bar.classList.add('stp-model-fill--go'), delay);
  });
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchStats() {
  try {
    const res = await fetch(`${WORKER_URL}/stats`, { signal:AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch(err) {
    console.warn('[statsPanel] fetch failed:', err.message);
    return null;
  }
}

// ── Polling ───────────────────────────────────────────────────────────────────
let _timer = null;
function startPolling(root) {
  if (_timer) clearInterval(_timer);
  _timer = setInterval(async () => {
    const data = await fetchStats();
    if (!data) return;
    root.innerHTML = renderPanel(data);
    attachAnimations(root);
  }, POLL_INTERVAL);
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function initStatsPanel() {
  const root = document.getElementById('stats-panel-root');
  if (!root) return;

  root.innerHTML = renderSkeleton();
  const data = await fetchStats();

  if (!data) {
    root.innerHTML = `
      <div class="stp-no-data">
        <div class="stp-no-data__ring"></div>
        <p class="stp-no-data__title">Activity loading...</p>
        <p class="stp-no-data__sub">Stats appear as people use Career Copilot.</p>
      </div>`;
    return;
  }

  root.innerHTML = renderPanel(data);
  attachAnimations(root);
  startPolling(root);
}

export async function trackEvent(tool, role, model) {
  try {
    await fetch(`${WORKER_URL}/track`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ tool, role, model }),
      signal:AbortSignal.timeout(3000),
    });
  } catch { /* silent */ }
}
