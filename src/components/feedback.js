/**
 * feedback.js — Floating Feedback Widget
 * Uses Formspree to send feedback to careercopilot04@gmail.com
 */

const FORMSPREE_ID = "mvzwrgel";

export function initFeedbackWidget() {
  // ── Create floating button ──────────────────────────────
  const btn = document.createElement("button");
  btn.id = "feedback-float-btn";
  btn.innerHTML = "💬 Feedback";
  btn.setAttribute("aria-label", "Send Feedback");
  document.body.appendChild(btn);

  // ── Create modal overlay ────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "feedback-overlay";
  overlay.innerHTML = `
    <div class="feedback-modal">
      <div class="feedback-modal__header">
        <span class="feedback-modal__title">💬 Send Feedback</span>
        <button class="feedback-modal__close" id="feedback-close-btn">✕</button>
      </div>
      <p class="feedback-modal__desc">
        Kuch missing hai? Koi suggestion hai? Seedha batao — 
        hum improve karte rahenge.
      </p>
      <form id="feedback-form">
        <div class="feedback-field">
          <label class="feedback-label">Name <span style="color:var(--color-red)">*</span></label>
          <input class="feedback-input" type="text" name="name" placeholder="Tumhara naam" required />
        </div>
        <div class="feedback-field">
          <label class="feedback-label">Email <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span></label>
          <input class="feedback-input" type="email" name="email" placeholder="reply@email.com" />
        </div>
        <div class="feedback-field">
          <label class="feedback-label">Message <span style="color:var(--color-red)">*</span></label>
          <textarea class="feedback-textarea" name="message" placeholder="Kya chahiye tumhe? Kya improve ho sakta hai?" required></textarea>
        </div>
        <button class="feedback-submit btn btn--primary btn--full" type="submit" id="feedback-submit-btn">
          🚀 Send Feedback
        </button>
        <div class="feedback-success hidden" id="feedback-success">
          ✅ Feedback mil gaya! Shukriya — hum zaroor improve karenge.
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Event listeners ─────────────────────────────────────
  btn.addEventListener("click", () => {
    overlay.classList.add("feedback-overlay--visible");
  });

  document.getElementById("feedback-close-btn").addEventListener("click", () => {
    overlay.classList.remove("feedback-overlay--visible");
  });

  // Close on outside click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("feedback-overlay--visible");
    }
  });

  // ── Form submit via Formspree ────────────────────────────
  document.getElementById("feedback-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("feedback-submit-btn");
    const successMsg = document.getElementById("feedback-success");
    const form = e.target;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form),
      });

      if (res.ok) {
        form.reset();
        successMsg.classList.remove("hidden");
        submitBtn.style.display = "none";
        // Auto close after 3 seconds
        setTimeout(() => {
          overlay.classList.remove("feedback-overlay--visible");
          successMsg.classList.add("hidden");
          submitBtn.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 Send Feedback";
        }, 3000);
      } else {
        throw new Error("Submit failed");
      }
    } catch {
      alert("Kuch error aaya — please careercopilot04@gmail.com pe directly mail karo.");
      submitBtn.disabled = false;
      submitBtn.textContent = "🚀 Send Feedback";
    }
  });
}
