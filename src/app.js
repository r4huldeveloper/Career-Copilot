/**
 * app.js — Main Application Controller
 *
 * Yeh file sirf orchestration karta hai:
 * - Components initialize karta hai
 * - State manage karta hai
 * - Events wire karta hai
 * - Koi business logic khud nahi likhta — sab utils/api se import karta hai
 *
 * Ek elite engineer ka rule: app.js mein sirf "glue code" hoga.
 */

import { getApiKey, setApiKey }                from './utils/storage.js';
import { parseMarkdown }                       from './utils/markdown.js';
import { startProgress, setProgressStep }      from './components/progressBar.js';
import { initDropZone }                        from './components/fileUpload.js';
import { createModal }                         from './components/modal.js';
import {
  analyzeResume,
  matchJD,
  generateInterviewQuestion,
  evaluateAnswer,
  getAnswerTips,
} from './api/groq.js';

// ── App State ────────────────────────────────────────────────────────────────
const state = {
  apiKey:          '',
  resumeText:      '',  // from file upload
  jdResumeText:    '',  // from file upload (JD tab)
  currentQuestion: '',
  questionCount:   0,
};

// ── DOM Helpers ──────────────────────────────────────────────────────────────
const $  = (id)  => document.getElementById(id);
const $v = (id)  => $(id)?.value?.trim() || '';

function showResult(boxId, contentId, html) {
  const box = $(boxId);
  $(contentId).innerHTML = `<div class="prose">${html}</div>`;
  box.classList.add('result-box--visible');
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addChatMsg(containerId, role, html) {
  const container = $(containerId);
  const isAI = role === 'ai';
  container.insertAdjacentHTML('beforeend', `
    <div class="chat__msg chat__msg--${isAI ? 'ai' : 'user'}">
      <div class="chat__avatar">${isAI ? '🤖' : '👤'}</div>
      <div class="chat__bubble prose">${html}</div>
    </div>
  `);
  container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setBtn(id, disabled, text) {
  const btn = $(id);
  if (!btn) return;
  btn.disabled = disabled;
  if (text) btn.textContent = text;
}

// ── Navigation ───────────────────────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('panel--active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-item--active'));
  $('panel-' + name)?.classList.add('panel--active');
  $('nav-' + name)?.classList.add('nav-item--active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── API Key Setup ────────────────────────────────────────────────────────────
const apiModal = createModal('setup-overlay');

function updateConnectionStatus(connected) {
  const dot    = $('api-dot');
  const status = $('api-status');
  const card   = $('sidebar-api-card');

  if (connected) {
    dot?.classList.add('topbar__status-dot--connected');
    if (status) { status.textContent = 'Groq connected'; status.style.color = 'var(--color-green)'; }
    card?.classList.add('hidden');
  } else {
    dot?.classList.remove('topbar__status-dot--connected');
    if (status) { status.textContent = 'API not connected'; status.style.color = ''; }
    card?.classList.remove('hidden');
  }
}

function saveApiKey() {
  const key = $v('api-key-input');
  if (!key.startsWith('gsk_')) {
    alert('Valid Groq API key "gsk_" se shuru hoti hai.');
    return;
  }
  state.apiKey = key;
  setApiKey(key);
  apiModal.hide();
  updateConnectionStatus(true);
}

// ── Resume Analyzer ──────────────────────────────────────────────────────────
async function handleAnalyzeResume() {
  const pastedText = $v('resume-text');
  const text = state.resumeText || pastedText;
  const role = $v('resume-role');

  if (!text || text.length < 80) {
    alert('Resume upload karo ya paste karo pehle!');
    return;
  }

  setBtn('resume-btn', true, 'Analyzing...');
  setProgressStep(['rs-1','rs-2','rs-3','rs-4'], 2);
  const stop = startProgress('resume-bar', 'resume-progress', 3000);

  try {
    const result = await analyzeResume({ resumeText: text, targetRole: role, apiKey: state.apiKey });
    stop();
    setProgressStep(['rs-1','rs-2','rs-3','rs-4'], 4);
    showResult('resume-result', 'resume-result-content', parseMarkdown(result));
  } catch (e) {
    stop();
    alert('Error: ' + e.message);
  }

  setBtn('resume-btn', false, '🔍 Analyze Resume');
}

// ── JD Matcher ───────────────────────────────────────────────────────────────
async function handleMatchJD() {
  const jd     = $v('jd-text');
  const resume = state.jdResumeText || $v('jd-resume-text');

  if (!jd)               { alert('Job Description paste karo!'); return; }
  if (resume.length < 80) { alert('Resume upload karo ya paste karo!'); return; }

  setBtn('jd-btn', true, 'Matching...');
  const stop = startProgress('jd-bar', 'jd-progress', 3000);

  try {
    const result = await matchJD({ jdText: jd, resumeText: resume, apiKey: state.apiKey });
    stop();
    showResult('jd-result', 'jd-result-content', parseMarkdown(result));
  } catch (e) {
    stop();
    alert('Error: ' + e.message);
  }

  setBtn('jd-btn', false, '🎯 Match Karo & Analyze');
}

// ── Mock Interview ────────────────────────────────────────────────────────────
async function handleGenerateQuestion(forceNew = false) {
  const role = $v('int-role');
  const type = $v('int-type');

  // Reset UI
  $('chat-container').innerHTML = '';
  $('user-answer').value = '';
  $('answer-section').style.display = 'none';
  $('question-box').classList.remove('question-box--visible');

  setBtn('gen-btn', true, 'Thinking...');

  try {
    const raw = await generateInterviewQuestion({
      role, type,
      forceNew,
      count: ++state.questionCount,
      apiKey: state.apiKey,
    });

    // Parse structured response
    let question = '', difficulty = 'Medium', focus = '';
    raw.split('\n').forEach(line => {
      if (line.startsWith('QUESTION:'))   question   = line.replace('QUESTION:', '').trim();
      if (line.startsWith('DIFFICULTY:')) difficulty = line.replace('DIFFICULTY:', '').trim();
      if (line.startsWith('FOCUS:'))      focus      = line.replace('FOCUS:', '').trim();
    });
    if (!question) question = raw.trim();

    state.currentQuestion = question;

    $('question-text').textContent = question;
    $('question-tags').innerHTML = `
      <span class="tag tag--blue">${type.split('—')[0].trim()}</span>
      <span class="tag tag--yellow">${difficulty}</span>
      ${focus ? `<span class="tag tag--purple">${focus}</span>` : ''}
    `;

    $('question-box').classList.add('question-box--visible');
    $('answer-section').style.display = 'block';
    $('answer-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    alert('Error: ' + e.message);
  }

  setBtn('gen-btn', false, '❓ Generate Question');
}

async function handleGetFeedback() {
  const answer = $v('user-answer');
  if (!answer) { alert('Pehle apna jawab likho!'); return; }

  const role = $v('int-role');
  const type = $v('int-type');

  setBtn('feedback-btn', true, 'Evaluating...');
  const stop = startProgress('int-bar', 'int-progress', 2500);

  $('chat-container').innerHTML = '';
  addChatMsg('chat-container', 'user', answer.replace(/</g,'&lt;'));

  try {
    const result = await evaluateAnswer({
      question: state.currentQuestion,
      answer,
      role, type,
      apiKey: state.apiKey,
    });
    stop();
    addChatMsg('chat-container', 'ai', parseMarkdown(result));
  } catch (e) {
    stop();
    alert('Error: ' + e.message);
  }

  setBtn('feedback-btn', false, '💬 Get AI Feedback');
}

async function handleGetTips() {
  const role = $v('int-role');
  const type = $v('int-type');

  setBtn('tips-btn', true, 'Loading...');
  const stop = startProgress('int-bar', 'int-progress', 2500);

  $('chat-container').innerHTML = '';

  try {
    const result = await getAnswerTips({
      question: state.currentQuestion,
      role, type,
      apiKey: state.apiKey,
    });
    stop();
    addChatMsg('chat-container', 'ai', parseMarkdown(result));
  } catch (e) {
    stop();
    alert('Error: ' + e.message);
  }

  setBtn('tips-btn', false, '📋 Expected Answer');
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  // Load saved API key
  state.apiKey = getApiKey();
  updateConnectionStatus(!!state.apiKey);
  if (!state.apiKey) apiModal.show();

  // ── Navigation — data-panel attribute driven ──
  document.querySelectorAll('[data-panel]').forEach(el => {
    el.addEventListener('click', () => showPanel(el.dataset.panel));
  });

  // ── API key modal ──
  $('save-api-btn')?.addEventListener('click', saveApiKey);
  $('api-key-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveApiKey(); });
  document.querySelectorAll('[data-action="show-setup"]').forEach(el => {
    el.addEventListener('click', () => apiModal.show());
  });

  // ── Resume Analyzer ──
  $('resume-btn')?.addEventListener('click', handleAnalyzeResume);

  // ── JD Matcher ──
  $('jd-btn')?.addEventListener('click', handleMatchJD);

  // ── Mock Interview ──
  $('gen-btn')?.addEventListener('click',      () => handleGenerateQuestion(false));
  $('new-q-btn')?.addEventListener('click',    () => handleGenerateQuestion(true));
  $('feedback-btn')?.addEventListener('click', handleGetFeedback);
  $('tips-btn')?.addEventListener('click',     handleGetTips);

  // ── File uploads ──
  initDropZone({
    zoneId:     'resume-drop-zone',
    inputId:    'resume-file-input',
    fileNameId: 'resume-file-name',
    onExtract:  (text) => { state.resumeText = text; },
  });

  initDropZone({
    zoneId:     'jd-drop-zone',
    inputId:    'jd-file-input',
    fileNameId: 'jd-file-name',
    onExtract:  (text) => { state.jdResumeText = text; },
  });
}

document.addEventListener('DOMContentLoaded', init);
