/**
 * sanitize.js — Normalizes and sanitizes user text before AI or internal handling.
 * This module enforces the "Sanitization Sandbox" rule from AI_RULES.
 */

/**
 * Remove control characters and trim text.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeUserText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Constrain text length, to protect anti-abuse and predictable vector.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function clampTextLength(text, maxLength) {
  if (typeof text !== "string") return "";
  if (!Number.isInteger(maxLength) || maxLength <= 0) return text;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
