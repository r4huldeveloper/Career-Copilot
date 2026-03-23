/**
 * roastLogic.js — Pure Logic Layer: Resume Roast
 * AI_RULES: Rule 1 zero DOM, Rule 3 atomic, Rule 4 sanitized, Rule 5 output contract, Rule 6 exported parser
 */

import { GroqAdapter }                       from "../../adapters/aiProvider.js";
import { sanitizeUserText, clampTextLength } from "../../utils/sanitize.js";
import { CONFIG }                            from "../../config.js";

/**
 * parseRoast — exported for tests.js (Rule 6)
 * Parses ROAST_LINE_1/2/3, HOPE_LINE, ROAST_TITLE from AI output.
 * Two fallback patterns per field — never throws (Rule 5).
 */
export function parseRoast(text) {
  if (!text || typeof text !== 'string') return { lines: [], hopeL: '', title: '' };

  function extract(label) {
    // Pattern 1: LABEL: content until next label or end
    const r1 = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=ROAST_LINE_\\d:|HOPE_LINE:|ROAST_TITLE:|$)`, 'i');
    const m1  = text.match(r1);
    if (m1?.[1]?.trim()) return m1[1].trim();
    // Pattern 2: just grab same line after label
    const r2 = new RegExp(`${label}:\\s*(.+)`, 'i');
    const m2  = text.match(r2);
    return m2?.[1]?.trim() || '';
  }

  const lines = [
    extract('ROAST_LINE_1'),
    extract('ROAST_LINE_2'),
    extract('ROAST_LINE_3'),
  ].filter(l => l.length > 0);

  const hopeL = extract('HOPE_LINE');
  const title = extract('ROAST_TITLE');

  return { lines, hopeL, title };
}

/**
 * runRoastAnalysis
 * @param {{ resumeText: string, targetRole: string, apiKey: string }}
 * @returns {Promise<{ lines: string[], hopeL: string, title: string, raw: string }>}
 */
export async function runRoastAnalysis({ resumeText, targetRole, apiKey }) {
  const text = clampTextLength(sanitizeUserText(resumeText), CONFIG.MAX_RESUME_LENGTH);
  const role = sanitizeUserText(targetRole) || 'General';

  if (!text || text.length < CONFIG.MIN_RESUME_LENGTH) {
    throw new Error('Resume upload karo ya paste karo pehle!');
  }

  const raw    = await new GroqAdapter(apiKey).roastResume({ resumeText: text, targetRole: role });
  const parsed = parseRoast(raw);

  // Graceful fallback if parser gets nothing
  if (parsed.lines.length === 0) {
    parsed.lines = [
      'Yaar, tera resume itna generic hai ki ATS ne socha "yeh toh template hai" aur skip kar diya.',
      'Skills mein "Team Player, Hardworking" likha hai — bhai, sab likhte hain. Alag kya hai tujh mein?',
      'Projects mein sirf tech stack hai, result kuch nahi. Tu kiya kya actually?',
    ];
    parsed.hopeL = 'Par seriously — tu yahan hai, improve karna chahta hai. Yahi baat tujhe baaki se alag karti hai!';
    parsed.title = 'The Resume That Could Be So Much More';
  }

  return { ...parsed, raw };
}
