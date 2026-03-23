/**
 * roastCard.js — Roast My Resume
 * Career Copilot v0.4.1
 * PNG via Canvas API — no html2canvas, guaranteed output
 */

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

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const t = line ? line+' '+w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line,x,y); y+=lh; line=w; }
    else { line=t; }
  }
  if (line) { ctx.fillText(line,x,y); y+=lh; }
  return y;
}

function countLines(ctx, text, maxW) {
  const words = text.split(' '); let line=''; let n=0;
  for (const w of words) {
    const t = line ? line+' '+w : w;
    if (ctx.measureText(t).width > maxW && line) { n++; line=w; } else { line=t; }
  }
  return line ? n+1 : n;
}

function generatePNG({ lines, hopeL, title, targetRole, atsScore }) {
  const cv  = document.createElement('canvas');
  const W   = 760;
  const PAD = 48;
  const TW  = W - PAD * 2;
  const SF  = 'system-ui,-apple-system,Arial,sans-serif';
  cv.width  = W;

  const ctx = cv.getContext('2d');

  // ── measure total height first ──────────────────────────────────────────
  function countW(text, font, maxW) {
    ctx.font = font;
    const words = text.split(' '); let line = ''; let n = 0;
    for (const w of words) {
      const t = line ? line+' '+w : w;
      if (ctx.measureText(t).width > maxW && line) { n++; line=w; } else { line=t; }
    }
    return line ? n+1 : n;
  }

  const titleLines = countW(`"${title}"`, `800 32px ${SF}`, TW);
  let   bodyH = 0;
  lines.forEach(l => { bodyH += countW(l, `400 22px ${SF}`, TW-52)*32+44; });
  const hopeLines = countW(hopeL, `500 20px ${SF}`, TW-48);
  const hopeH     = hopeLines * 30 + 48;

  // LAYOUT constants — measured from top
  const TOP_PAD    = 32;   // space above eyebrow
  const BAR_H      = 6;
  const EYEBROW_Y  = BAR_H + TOP_PAD + 14;   // 52
  const TITLE_Y    = EYEBROW_Y + 28;
  const TITLE_H    = titleLines * 44;
  const DIV1_Y     = TITLE_Y + TITLE_H + 8;
  const VERDICT_Y  = DIV1_Y + 24;
  const BODY_Y     = VERDICT_Y + 20;
  const HOPE_Y     = BODY_Y + bodyH + 8;
  const DIV2_Y     = HOPE_Y + hopeH + 20;
  const FOOT_Y     = DIV2_Y + 28;
  cv.height        = FOOT_Y + 24;

  // ── BACKGROUND — off-white light theme ──────────────────────────────────
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, cv.height);

  // subtle card border
  ctx.strokeStyle = '#e2e2e6';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0, 0, W, cv.height);

  // ── TOP BAR — bold red-orange ────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   '#ff1a1a');
  grad.addColorStop(0.5, '#ff5500');
  grad.addColorStop(1,   '#ff1a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, BAR_H);

  // ── EYEBROW ──────────────────────────────────────────────────────────────
  ctx.font      = `700 11px ${SF}`;
  ctx.fillStyle = '#cc2200';
  ctx.letterSpacing = '2.5px';
  ctx.fillText('RESUME ROASTED', PAD, EYEBROW_Y);
  ctx.letterSpacing = '0px';

  // ATS chip — top right
  if (atsScore != null) {
    const chip = `ATS ${atsScore}/10`;
    ctx.font   = `700 12px ${SF}`;
    const cw   = ctx.measureText(chip).width + 24;
    const cx   = W - PAD - cw;
    const cy   = EYEBROW_Y - 15;
    ctx.fillStyle   = '#fff0f0';
    rr(ctx, cx, cy, cw, 24, 12); ctx.fill();
    ctx.strokeStyle = '#ffaaaa';
    ctx.lineWidth   = 1;
    rr(ctx, cx, cy, cw, 24, 12); ctx.stroke();
    ctx.fillStyle = '#cc2200';
    ctx.fillText(chip, cx + 12, EYEBROW_Y);
  }

  // ── TITLE ────────────────────────────────────────────────────────────────
  ctx.font         = `900 32px ${SF}`;
  ctx.fillStyle    = '#111111';
  ctx.letterSpacing = '-0.5px';
  let ty = TITLE_Y;
  const titleWords = `"${title}"`.split(' ');
  let   tLine = '';
  for (const w of titleWords) {
    const test = tLine ? tLine+' '+w : w;
    if (ctx.measureText(test).width > TW && tLine) {
      ctx.fillText(tLine, PAD, ty); ty += 44; tLine = w;
    } else { tLine = test; }
  }
  if (tLine) ctx.fillText(tLine, PAD, ty);
  ctx.letterSpacing = '0px';

  // ── DIVIDER 1 ────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#e0e0e4';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(PAD, DIV1_Y); ctx.lineTo(W-PAD, DIV1_Y); ctx.stroke();

  // ── VERDICT LABEL ────────────────────────────────────────────────────────
  ctx.font         = `600 10px ${SF}`;
  ctx.fillStyle    = '#aaaaaf';
  ctx.letterSpacing = '2px';
  ctx.fillText('THE AI VERDICT IS IN —', PAD, VERDICT_Y);
  ctx.letterSpacing = '0px';

  // ── ROAST LINES ──────────────────────────────────────────────────────────
  let ly = BODY_Y + 16;
  lines.forEach((line, i) => {
    // number badge
    ctx.fillStyle   = '#fff0f0';
    rr(ctx, PAD, ly-16, 26, 24, 6); ctx.fill();
    ctx.strokeStyle = '#ffcccc';
    ctx.lineWidth   = 1;
    rr(ctx, PAD, ly-16, 26, 24, 6); ctx.stroke();
    ctx.font      = `700 10px monospace`;
    ctx.fillStyle = '#cc2200';
    ctx.fillText(String(i+1).padStart(2,'0'), PAD+4, ly);

    // line text — dark on light bg
    ctx.font      = `400 22px ${SF}`;
    ctx.fillStyle = '#1a1a1a';
    const words   = line.split(' ');
    let   ltext   = '';
    let   lty     = ly;
    for (const w of words) {
      const test = ltext ? ltext+' '+w : w;
      if (ctx.measureText(test).width > TW-52 && ltext) {
        ctx.fillText(ltext, PAD+38, lty); lty+=32; ltext=w;
      } else { ltext=test; }
    }
    if (ltext) ctx.fillText(ltext, PAD+38, lty);
    ly = lty + 32 + 12;

    // separator
    if (i < lines.length-1) {
      ctx.strokeStyle = '#ebebef';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(PAD+38, ly-4); ctx.lineTo(W-PAD, ly-4); ctx.stroke();
      ly += 8;
    }
  });

  // ── HOPE SECTION ─────────────────────────────────────────────────────────
  ctx.fillStyle   = '#f0fdf4';
  rr(ctx, PAD, HOPE_Y, TW, hopeH, 12); ctx.fill();
  ctx.strokeStyle = '#bbf7d0';
  ctx.lineWidth   = 1;
  rr(ctx, PAD, HOPE_Y, TW, hopeH, 12); ctx.stroke();

  ctx.font      = `400 18px ${SF}`;
  ctx.fillStyle = '#16a34a';
  ctx.fillText('✦', PAD+16, HOPE_Y+26);

  ctx.font      = `500 20px ${SF}`;
  ctx.fillStyle = '#15803d';
  const hwords  = hopeL.split(' ');
  let   hline   = '';
  let   hty     = HOPE_Y + 26;
  for (const w of hwords) {
    const test = hline ? hline+' '+w : w;
    if (ctx.measureText(test).width > TW-48 && hline) {
      ctx.fillText(hline, PAD+42, hty); hty+=30; hline=w;
    } else { hline=test; }
  }
  if (hline) ctx.fillText(hline, PAD+42, hty);

  // ── DIVIDER 2 ────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#e0e0e4';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(PAD, DIV2_Y); ctx.lineTo(W-PAD, DIV2_Y); ctx.stroke();

  // ── FOOTER ───────────────────────────────────────────────────────────────
  // TARGET label
  ctx.font         = `700 10px ${SF}`;
  ctx.fillStyle    = '#888890';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('TARGET', PAD, FOOT_Y);
  ctx.letterSpacing = '0px';

  // Role chip
  const rv  = targetRole || 'General';
  ctx.font  = `600 13px ${SF}`;
  const rvW = ctx.measureText(rv).width + 24;
  ctx.fillStyle   = '#f3f4f6';
  rr(ctx, PAD+62, FOOT_Y-15, rvW, 22, 11); ctx.fill();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth   = 1;
  rr(ctx, PAD+62, FOOT_Y-15, rvW, 22, 11); ctx.stroke();
  ctx.fillStyle   = '#374151';
  ctx.fillText(rv, PAD+74, FOOT_Y);

  // Watermark — clear and prominent
  ctx.font = `800 16px ${SF}`;
  const wparts = [['career','#555560'],['copilot','#cc2200'],['.in','#555560']];
  const wtotal = wparts.reduce((a,[t]) => a + ctx.measureText(t).width, 0);
  let   wx     = W - PAD - wtotal;
  wparts.forEach(([t,c]) => {
    ctx.fillStyle = c;
    ctx.fillText(t, wx, FOOT_Y);
    wx += ctx.measureText(t).width;
  });

  return cv;
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
        <div class="rst-head">
          <div class="rst-top-row">
            <span class="rst-eyebrow">🔥 Resume Roasted</span>
            <span class="rst-chip">${esc(sc)}</span>
          </div>
          <h2 class="rst-title">"${esc(title)}"</h2>
        </div>
        <div class="rst-body">
          <p class="rst-lbl">🤖 The AI verdict is in —</p>
          ${lines.map((l,i)=>`
          <div class="rst-line rst-line--${i+1}">
            <span class="rst-num">${String(i+1).padStart(2,'0')}</span>
            <p class="rst-txt">${esc(l)}</p>
          </div>`).join('')}
        </div>
        <div class="rst-hope">
          <span class="rst-hope-ic">✦</span>
          <p class="rst-hope-txt">${esc(hopeL)}</p>
        </div>
        <div class="rst-foot">
          <div class="rst-role"><span class="rst-role-lbl">Target</span><span class="rst-role-val">${esc(targetRole||'General')}</span></div>
          <span class="rst-wm">career<b>copilot</b>.in</span>
        </div>
      </div>
      <div class="rst-btns">
        <button class="rst-btn rst-btn--dl" id="rst-dl" type="button">⬇ Download PNG</button>
        <button class="rst-btn rst-btn--cp" id="rst-cp" type="button">📋 Copy for LinkedIn</button>
        <button class="rst-btn rst-btn--tw" id="rst-tw" type="button">𝕏 Post on X</button>
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

  document.getElementById('rst-dl')?.addEventListener('click',e=>{
    const btn=e.currentTarget, orig=btn.innerHTML;
    btn.disabled=true; btn.textContent='Generating...';
    try { const cv=generatePNG(data); const a=document.createElement('a'); a.download='resume-roast-careercopilot.png'; a.href=cv.toDataURL('image/png'); a.click(); }
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
    btn.textContent='✓ Copied!'; setTimeout(()=>{ btn.innerHTML=orig; },2000);
  });

  document.getElementById('rst-tw')?.addEventListener('click',()=>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(data.title,data.targetRole,data.atsScore,data.lines))}`,'_blank','noopener,width=600,height=400')
  );
}

export function destroyRoastCard() { closeModal(); }
