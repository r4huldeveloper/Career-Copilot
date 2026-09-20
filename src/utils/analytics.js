/**
 * Privacy-safe product funnel events.
 * Uses the Vercel Analytics queue already loaded by index.html.
 * Never pass resume text, JD text, answers, API keys, or raw errors here.
 */

const ALLOWED_EVENTS = new Set([
  "page_view",
  "tool_opened",
  "primary_cta_clicked",
  "resume_upload_started",
  "resume_uploaded",
  "resume_upload_failed",
  "role_selected",
  "api_settings_opened",
  "api_key_saved",
  "analysis_blocked",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "result_viewed",
  "next_action_clicked",
  "share_clicked",
]);

function _safeData(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .map(([key, value]) => [
        key.slice(0, 40),
        typeof value === "string" ? value.slice(0, 80) : value,
      ])
  );
}

export function trackFunnelEvent(name, data = {}) {
  if (!ALLOWED_EVENTS.has(name)) return;
  try {
    window.va?.("event", { name, data: _safeData(data) });
  } catch {
    // Analytics must never interrupt the product flow.
  }
}
