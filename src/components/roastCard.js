/**
 * roastCard.js — Roast My Resume
 * Career Copilot v0.4.1
 * PNG via Canvas API — no html2canvas, guaranteed output
 */

import { trackFunnelEvent } from "../utils/analytics.js";

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

/* ── Poster geometry — 4:5, the ratio LinkedIn and Instagram give most feed space ── */
const CARD_W = 1080;
const CARD_H = 1350;
const PAD    = 76;
const TW     = CARD_W - PAD * 2;

const FONT = (weight, size) =>
  `${weight} ${size}px 'Geist', system-ui, -apple-system, Arial, sans-serif`;

function wrapLines(ctx, text, maxW) {
  const words = String(text||'').split(/\s+/).filter(Boolean);
  const out   = [];
  let   line  = '';
  for (const w of words) {
    const t = line ? line+' '+w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else { line = t; }
  }
  if (line) out.push(line);
  return out;
}

/** Step type down until the text fits maxLines, so the poster never overflows */
function fitText(ctx, text, maxW, weight, from, to, maxLines) {
  for (let size = from; size >= to; size -= 2) {
    ctx.font = FONT(weight, size);
    const lines = wrapLines(ctx, text, maxW);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = FONT(weight, to);
  return { size: to, lines: wrapLines(ctx, text, maxW).slice(0, maxLines) };
}

function paintLines(ctx, lines, x, baseline, lh) {
  lines.forEach((l, i) => ctx.fillText(l, x, baseline + i * lh));
}

function generatePNG({ lines, hopeL, title, targetRole, atsScore }) {
  const cv  = document.createElement('canvas');
  cv.width  = CARD_W;
  cv.height = CARD_H;
  const ctx = cv.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  /* ── Background: near-black with a warm ember glow ── */
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow = ctx.createRadialGradient(150, 40, 0, 150, 40, 1000);
  glow.addColorStop(0,    'rgba(255,94,0,0.22)');
  glow.addColorStop(0.45, 'rgba(255,26,26,0.07)');
  glow.addColorStop(1,    'rgba(255,26,26,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const topBar = ctx.createLinearGradient(0, 0, CARD_W, 0);
  topBar.addColorStop(0,   '#ff1a1a');
  topBar.addColorStop(0.5, '#ff9500');
  topBar.addColorStop(1,   '#ff1a1a');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, CARD_W, 14);

  /* ── Eyebrow + ATS pill ── */
  const EYE_Y = 156;
  ctx.font          = FONT(800, 26);
  ctx.letterSpacing = '5px';
  ctx.fillStyle     = '#ff7a33';
  ctx.fillText('RESUME ROASTED', PAD, EYE_Y);
  ctx.letterSpacing = '0px';

  if (atsScore != null) {
    const pill = `ATS ${atsScore}/10`;
    ctx.font   = FONT(800, 25);
    const pw   = ctx.measureText(pill).width + 46;
    const px   = CARD_W - PAD - pw;
    const py   = EYE_Y - 34;
    ctx.fillStyle = 'rgba(255,63,63,0.13)';
    rr(ctx, px, py, pw, 48, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,70,0.42)';
    ctx.lineWidth   = 2;
    rr(ctx, px, py, pw, 48, 24); ctx.stroke();
    ctx.fillStyle = '#ff9070';
    ctx.fillText(pill, px + 23, EYE_Y);
  }

  /* ── Title: the hook, so it gets the biggest type that still fits ── */
  const TITLE_Y = 268;
  const titleFit = fitText(ctx, `"${title}"`, TW, 900, 86, 48, 3);
  const titleLH  = Math.round(titleFit.size * 1.14);
  ctx.font          = FONT(900, titleFit.size);
  ctx.fillStyle     = '#ffffff';
  ctx.letterSpacing = '-1.5px';
  paintLines(ctx, titleFit.lines, PAD, TITLE_Y, titleLH);
  ctx.letterSpacing = '0px';
  const titleBottom = TITLE_Y + (titleFit.lines.length - 1) * titleLH;

  /* ── Footer and hope block are pinned to the bottom, body fills what is left ── */
  const FOOT_Y = CARD_H - 80;
  const DIV2_Y = FOOT_Y - 68;

  const hopeFit = fitText(ctx, hopeL, TW - 112, 500, 34, 22, 3);
  const hopeLH  = Math.round(hopeFit.size * 1.45);
  const hopeH   = hopeFit.lines.length * hopeLH + 56;
  const hopeTop = DIV2_Y - 44 - hopeH;

  const LABEL_Y = titleBottom + 74;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth   = 2;
  ctx.moveTo(PAD, LABEL_Y - 40); ctx.lineTo(CARD_W - PAD, LABEL_Y - 40);
  ctx.stroke();

  ctx.font          = FONT(700, 20);
  ctx.letterSpacing = '3.5px';
  ctx.fillStyle     = '#6b6b7a';
  ctx.fillText('THE VERDICT', PAD, LABEL_Y);
  ctx.letterSpacing = '0px';

  /* ── Roast lines ── */
  const BODY_TOP  = LABEL_Y + 62;
  const bodyAvail = hopeTop - 44 - BODY_TOP;
  const GAP       = 40;
  const TEXT_X    = PAD + 42;
  const textW     = TW - 42;

  let bodySize  = 24;
  let bodyWraps = [];
  let bodyTotal = 0;
  for (let size = 40; size >= 24; size -= 2) {
    ctx.font = FONT(500, size);
    const wraps = lines.map((l) => wrapLines(ctx, l, textW));
    const lh    = Math.round(size * 1.42);
    const total = wraps.reduce((a, w) => a + w.length * lh, 0) + GAP * (wraps.length - 1);
    if (total <= bodyAvail || size === 24) { bodySize = size; bodyWraps = wraps; bodyTotal = total; break; }
  }
  const bodyLH = Math.round(bodySize * 1.42);

  // Centre the block so short roasts don't leave a hole above the hope line
  let ly = BODY_TOP + Math.max(0, (bodyAvail - bodyTotal) / 2);
  bodyWraps.forEach((wraps) => {
    const blockH = wraps.length * bodyLH;

    const accent = ctx.createLinearGradient(0, ly - bodySize, 0, ly + blockH);
    accent.addColorStop(0, '#ff3d00');
    accent.addColorStop(1, '#ffab00');
    ctx.fillStyle = accent;
    rr(ctx, PAD, ly - bodySize, 6, blockH - (bodyLH - bodySize) + 8, 3);
    ctx.fill();

    ctx.font      = FONT(500, bodySize);
    ctx.fillStyle = '#f2f2f5';
    paintLines(ctx, wraps, TEXT_X, ly, bodyLH);

    ly += blockH + GAP;
  });

  /* ── Hope line ── */
  ctx.fillStyle = 'rgba(34,197,94,0.10)';
  rr(ctx, PAD, hopeTop, TW, hopeH, 20); ctx.fill();
  ctx.strokeStyle = 'rgba(74,222,128,0.28)';
  ctx.lineWidth   = 2;
  rr(ctx, PAD, hopeTop, TW, hopeH, 20); ctx.stroke();

  const hopeBase = hopeTop + 28 + hopeFit.size;
  ctx.font      = FONT(700, 28);
  ctx.fillStyle = '#4ade80';
  ctx.fillText('✦', PAD + 32, hopeBase);

  ctx.font      = FONT(500, hopeFit.size);
  ctx.fillStyle = '#9ff0b0';
  paintLines(ctx, hopeFit.lines, PAD + 80, hopeBase, hopeLH);

  /* ── Footer ── */
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 2;
  ctx.moveTo(PAD, DIV2_Y); ctx.lineTo(CARD_W - PAD, DIV2_Y);
  ctx.stroke();

  const role = targetRole || 'General';
  ctx.font   = FONT(600, 24);
  const rw   = ctx.measureText(role).width + 40;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  rr(ctx, PAD, FOOT_Y - 30, rw, 44, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 2;
  rr(ctx, PAD, FOOT_Y - 30, rw, 44, 22); ctx.stroke();
  ctx.fillStyle = '#a1a1b0';
  ctx.fillText(role, PAD + 20, FOOT_Y);

  ctx.font = FONT(800, 28);
  const wm = [['career', '#e7e7ee'], ['copilot', '#ff6a1f'], ['.in', '#e7e7ee']];
  let wx = CARD_W - PAD - wm.reduce((a, [t]) => a + ctx.measureText(t).width, 0);
  wm.forEach(([t, c]) => {
    ctx.fillStyle = c;
    ctx.fillText(t, wx, FOOT_Y);
    wx += ctx.measureText(t).width;
  });

  return cv;
}

const PNG_NAME = 'resume-roast-careercopilot.png';

/**
 * Sync base64 → File. toBlob() is async and Safari drops the user gesture
 * across the callback, which makes navigator.share() reject.
 */
function canvasToFile(cv) {
  const dataUrl = cv.toDataURL('image/png');
  const binary  = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], PNG_NAME, { type: 'image/png' });
}

/** Native share only on touch devices — on desktop the OS share sheet is worse than a download */
function canSharePNG() {
  if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
  try {
    return !!navigator.canShare?.({ files: [new File([new Uint8Array(1)], PNG_NAME, { type: 'image/png' })] });
  } catch { return false; }
}

function downloadPNG(cv) {
  const a = document.createElement('a');
  a.download = PNG_NAME;
  a.href     = cv.toDataURL('image/png');
  a.click();
}

function shareText(title, role, score, lines) {
  const sc   = score != null ? ` ATS ${score}/10.` : '';
  const roastLines = lines && lines.length
    ? lines.map((l,i) => `${i+1}. ${l}`).join('\n')
    : '';
  return [
    `🔥 My resume just got roasted by AI.${sc}`,
    ``,
    `"${title}"`,
    ``,
    roastLines,
    ``,
    `Get yours free → careercopilot.in`,
    ``,
    `#ResumeRoast #CareerCopilot #IndianFreshers`,
  ].join('\n');
}

function buildModal({ lines, hopeL, title, targetRole, atsScore }) {
  const sc = atsScore!=null ? `ATS ${atsScore}/10` : 'Roasted';
  return `
  <div class="rst-overlay" id="rst-overlay" role="dialog" aria-modal="true">
    <div class="rst-modal">
      <button class="rst-close" id="rst-close" aria-label="Close">&#x2715;</button>
      <div class="rst-card">
        <div class="rst-bar"></div>
        <div class="rst-glow"></div>
        <div class="rst-head">
          <div class="rst-top-row">
            <span class="rst-eyebrow">Resume Roasted</span>
            <span class="rst-chip">${esc(sc)}</span>
          </div>
          <h2 class="rst-title">"${esc(title)}"</h2>
        </div>
        <div class="rst-body">
          <p class="rst-lbl">The verdict</p>
          ${lines.map((l,i)=>`
          <div class="rst-line rst-line--${i+1}">
            <p class="rst-txt">${esc(l)}</p>
          </div>`).join('')}
        </div>
        <div class="rst-hope">
          <span class="rst-hope-ic">✦</span>
          <p class="rst-hope-txt">${esc(hopeL)}</p>
        </div>
        <div class="rst-foot">
          <span class="rst-role-val">${esc(targetRole||'General')}</span>
          <span class="rst-wm">career<b>copilot</b>.in</span>
        </div>
      </div>
      <div class="rst-btns">
        <button class="rst-btn rst-btn--main" id="rst-dl" type="button">${canSharePNG() ? '📤 Share card' : '⬇ Download card'}</button>
        <div class="rst-btn-row">
          <button class="rst-btn rst-btn--ghost" id="rst-cp" type="button">📋 Copy caption</button>
          <button class="rst-btn rst-btn--ghost" id="rst-tw" type="button">𝕏 Post on X</button>
        </div>
        <button class="rst-next" id="rst-next" type="button">Ab serious feedback bhi le lo — ATS score &amp; role fit →</button>
      </div>
    </div>
  </div>`;
}

function closeModal() {
  const o=document.getElementById('rst-overlay');
  if(!o) return;
  o.classList.add('rst-overlay--out');
  setTimeout(()=>{ o.remove(); document.body.style.overflow=''; },260);
}

export function renderRoastCard(data) {
  document.getElementById('rst-overlay')?.remove();
  const tmp=document.createElement('div'); tmp.innerHTML=buildModal(data);
  const ov=tmp.firstElementChild;
  document.body.appendChild(ov); document.body.style.overflow='hidden';
  requestAnimationFrame(()=>ov.classList.add('rst-overlay--in'));

  document.getElementById('rst-close')?.addEventListener('click',closeModal);
  ov.addEventListener('click',e=>{ if(e.target===ov) closeModal(); });
  document.addEventListener('keydown',function f(e){ if(e.key==='Escape'){closeModal();document.removeEventListener('keydown',f);} });

  document.getElementById('rst-dl')?.addEventListener('click',async e=>{
    const btn=e.currentTarget, orig=btn.innerHTML;
    btn.disabled=true; btn.textContent='Generating...';
    try {
      // Canvas measures with the fallback font until Geist is actually loaded
      await document.fonts?.ready;
      const cv = generatePNG(data);

      if (canSharePNG()) {
        try {
          await navigator.share({ files: [canvasToFile(cv)], text: shareText(data.title,data.targetRole,data.atsScore,data.lines) });
          trackFunnelEvent("share_clicked", { method: "native" });
          return;
        } catch (shareErr) {
          if (shareErr?.name === 'AbortError') return;   // user dismissed the sheet
          console.warn('[roastCard] share failed, downloading instead', shareErr);
        }
      }

      downloadPNG(cv);
      trackFunnelEvent("share_clicked", { method: "download" });
    }
    catch(err){ console.error('[roastCard]',err); }
    finally { btn.disabled=false; btn.innerHTML=orig; }
  });

  document.getElementById('rst-cp')?.addEventListener('click',async e=>{
    const btn=e.currentTarget, orig=btn.innerHTML;
    const txt=shareText(data.title,data.targetRole,data.atsScore,data.lines);
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta=document.createElement('textarea');
      ta.value=txt;
      ta.style.cssText='position:fixed;top:0;left:0;opacity:0;width:2px;height:2px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    trackFunnelEvent("share_clicked", { method: "copy" });
    btn.textContent='✓ Copied!'; setTimeout(()=>{ btn.innerHTML=orig; },2000);
  });

  document.getElementById('rst-next')?.addEventListener('click',()=>{
    trackFunnelEvent("next_action_clicked", { from: "roast", destination: "resume_analysis" });
    closeModal();
    // Wait out the close animation — body scroll is locked until the overlay is gone
    setTimeout(()=>{
      const target=document.getElementById('resume-btn');
      target?.scrollIntoView({ behavior:'smooth', block:'center' });
      target?.focus({ preventScroll:true });
    },300);
  });

  document.getElementById('rst-tw')?.addEventListener('click',()=>{
    trackFunnelEvent("share_clicked", { method: "x" });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(data.title,data.targetRole,data.atsScore,data.lines))}`,'_blank','noopener,width=600,height=400');
  });
}

export function destroyRoastCard() { closeModal(); }
