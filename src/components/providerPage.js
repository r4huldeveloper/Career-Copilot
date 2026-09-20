/**
 * providerPage.js — API & Provider Settings Page
 *
 * AI_RULES Rule 1 — Pure UI: zero AI calls, zero business logic.
 * AI_RULES Rule 3 — Atomic: deletable, zero footprint.
 * AI_RULES Rule 2 — Zero inline styles, zero style.* calls.
 *
 * v0.3.2 — Model selector with tags restored.
 * Selected model saved via onSave(providerId, modelId, apiKey).
 */

import { CONFIG }                              from "../config.js";
import { getProvider, getModel, getApiKey }    from "../utils/storage.js";
import { fetchAvailableModels }                from "../adapters/aiProvider.js";

function _logoPath(id) {
  const provider = CONFIG.PROVIDERS[id];
  const fileName = provider?.logo || `${id}.png`;
  return `assets/logos/${encodeURI(fileName)}`;
}

function _esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Provider Cards ────────────────────────────────────────────────────────────
function _renderProviderCards(container, selectedId, onSelect) {
  container.innerHTML = "";
  Object.values(CONFIG.PROVIDERS).forEach((p) => {
    const isActive = p.id === selectedId;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `provider-card${isActive ? " provider-card--active" : ""}`;
    card.dataset.providerId = p.id;
    card.setAttribute("aria-pressed", String(isActive));
    card.innerHTML = `
      <div class="provider-card__logo-wrap">
        <img
          class="provider-card__logo"
          src="${_esc(_logoPath(p.id))}"
          alt="${_esc(p.name)}"
          loading="lazy"
          onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')"
        >
        <div class="provider-card__logo-fallback hidden">${_esc(p.name[0])}</div>
      </div>
      <div class="provider-card__info">
        <div class="provider-card__name">${_esc(p.name)}</div>
        <div class="provider-card__tagline">${_esc(p.tagline)}</div>
      </div>
      ${isActive ? '<div class="provider-card__check" aria-hidden="true"></div>' : ""}
    `;
    card.addEventListener("click", () => onSelect(p.id));
    container.appendChild(card);
  });
}

// ── Model Selector with Tags ──────────────────────────────────────────────────
// availableIds: Set of ids the connected key can actually call, or null when unknown
// (no key yet / provider unreachable) — then the curated list renders as-is.
function _renderModelSelector(container, providerId, selectedModelId, availableIds) {
  const provider = CONFIG.PROVIDERS[providerId];
  const activeId = selectedModelId || provider.defaultModel;
  container.innerHTML = "";

  provider.models.forEach((m) => {
    const offline  = availableIds ? !availableIds.has(m.id) : false;
    const isActive = m.id === activeId && !offline;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `model-chip${isActive ? " model-chip--active" : ""}${offline ? " model-chip--unavailable" : ""}`;
    btn.dataset.modelId = m.id;
    btn.disabled = offline;
    btn.setAttribute("aria-pressed", String(isActive));

    const tags = offline ? ["Is key pe available nahi"] : (m.tags || []);
    const tagsHtml = tags
      .map(t => `<span class="model-chip__tag">${_esc(t)}</span>`)
      .join("");

    btn.innerHTML = `
      <div class="model-chip__top">
        <span class="model-chip__name">${_esc(m.name)}</span>
        <span class="model-chip__ctx">${_esc(m.context)}</span>
      </div>
      ${tagsHtml ? `<div class="model-chip__tags">${tagsHtml}</div>` : ""}
    `;
    container.appendChild(btn);
  });

  // Model click — update active state. Wired once: the grid re-renders on every
  // provider switch and availability refresh, but the container element persists.
  if (container.dataset.wired) return;
  container.dataset.wired = "1";
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".model-chip");
    if (!chip || chip.disabled) return;
    container.querySelectorAll(".model-chip").forEach((c) => {
      c.classList.remove("model-chip--active");
      c.setAttribute("aria-pressed", "false");
    });
    chip.classList.add("model-chip--active");
    chip.setAttribute("aria-pressed", "true");
  });
}

// ── Key Panel ─────────────────────────────────────────────────────────────────
function _renderKeyPanel(container, providerId) {
  const provider  = CONFIG.PROVIDERS[providerId];
  const connected = !!getApiKey();
  container.innerHTML = `
    <div class="key-panel">
      <div class="key-panel__left">
        <div class="key-panel__header">
          <p class="key-panel__label">API Key</p>
          <span class="key-panel__badge ${connected ? "key-panel__badge--connected" : "key-panel__badge--disconnected"}">
            ${connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div class="key-panel__how">
          <p class="key-panel__how-title">Key kaise milegi</p>
          <ol class="key-panel__steps">
            <li><a href="${_esc(provider.keyLink)}" target="_blank" rel="noopener">${_esc(provider.keyLinkText)}</a> pe jao</li>
            <li>Free account banao agar nahi hai</li>
            <li>Naya API key generate karo</li>
            <li>Neeche paste karo</li>
          </ol>
        </div>
      </div>
      <div class="key-panel__right">
        <div class="field">
          <input
            class="field__input"
            type="password"
            id="provider-key-input"
            placeholder="${_esc(provider.placeholder)}"
            autocomplete="off"
            value="${connected ? "••••••••••••••••••••••••" : ""}"
          >
        </div>
        <div id="provider-key-error" class="hidden inline-error key-panel__error"></div>
        <div class="key-panel__actions">
          <button type="button" class="btn btn--primary" id="provider-save-btn">
            Save &amp; Connect
          </button>
          ${connected ? `<button type="button" class="btn btn--ghost" id="provider-disconnect-btn">Disconnect</button>` : ""}
        </div>
        <p class="key-panel__note">
          Key is browser mein save hoti hai aur analysis ke waqt selected AI provider ko directly bheji jaati hai.
        </p>
      </div>
    </div>
  `;
  const input = container.querySelector("#provider-key-input");
  if (connected && input) {
    input.addEventListener("focus", () => { input.value = ""; }, { once: true });
  }
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initProviderPage({ providerGrid, modelGrid, keyPanel, onSave, onDisconnect }) {
  let selectedProvider = getProvider();
  let selectedModel    = getModel() || CONFIG.PROVIDERS[selectedProvider]?.defaultModel || "";
  let availableIds     = null;

  function _render() {
    _renderProviderCards(providerGrid, selectedProvider, (id) => {
      selectedProvider = id;
      selectedModel    = CONFIG.PROVIDERS[id]?.defaultModel || "";
      availableIds     = null;
      _render();
      _refreshAvailability(getApiKey());
    });
    _renderModelSelector(modelGrid, selectedProvider, selectedModel, availableIds);
    _renderKeyPanel(keyPanel, selectedProvider);
    _wire();
  }

  // Grey out models this key cannot call. Re-renders only the model grid so it
  // never clobbers a message already shown in the key panel.
  async function _refreshAvailability(key) {
    if (!key) return;
    const askedFor = selectedProvider;
    try {
      const ids = await fetchAvailableModels(key, askedFor);
      if (askedFor !== selectedProvider) return;
      availableIds = new Set(ids);
      _renderModelSelector(modelGrid, selectedProvider, selectedModel, availableIds);
    } catch (err) {
      console.warn("[providerPage] model list unavailable:", err.message);
    }
  }

  function _wire() {
    const saveBtn       = document.getElementById("provider-save-btn");
    const disconnectBtn = document.getElementById("provider-disconnect-btn");
    const keyInput      = document.getElementById("provider-key-input");
    const errorEl       = document.getElementById("provider-key-error");

    const showError = (message) => {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
      setTimeout(() => errorEl.classList.add("hidden"), 4000);
    };

    saveBtn?.addEventListener("click", async () => {
      const key      = keyInput?.value?.trim() || "";
      const provider = CONFIG.PROVIDERS[selectedProvider];

      if (provider.keyPrefix && !key.startsWith(provider.keyPrefix)) {
        showError(`Key "${provider.keyPrefix}" se shuru honi chahiye`);
        return;
      }
      if (!key || /^•+$/.test(key)) {
        showError("Valid API key daalo");
        return;
      }

      // Read selected model from DOM
      const activeChip = modelGrid.querySelector(".model-chip--active");
      selectedModel = activeChip?.dataset.modelId || provider.defaultModel || "";

      // Verify the key and the model against the provider's live catalog, so a
      // retired model id never reaches the first analysis.
      const originalLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = "Checking key...";
      try {
        const liveIds = new Set(await fetchAvailableModels(key, selectedProvider));
        availableIds  = liveIds;

        if (!liveIds.has(selectedModel)) {
          const firstUsable = provider.models.find((m) => liveIds.has(m.id));
          if (!firstUsable) {
            showError("Is key pe koi supported model nahi mila — provider dashboard check karo");
            return;
          }
          selectedModel = firstUsable.id;
          showError(`Selected model is key pe nahi hai — ${firstUsable.name} laga diya`);
        }
      } catch (err) {
        // Bad key is fatal; offline/rate-limited provider is not — save anyway.
        if (/Invalid API key/i.test(err.message)) {
          showError(err.message);
          return;
        }
        console.warn("[providerPage] key check skipped:", err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
      }

      onSave(selectedProvider, selectedModel, key);
      _render();
    });

    disconnectBtn?.addEventListener("click", () => {
      onDisconnect();
      availableIds = null;
      _render();
    });
  }

  _render();
  _refreshAvailability(getApiKey());
}
