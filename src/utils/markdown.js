/**
 * markdown.js — Lightweight Markdown → HTML parser
 * Only parses what we need: headings, bold, lists, code.
 * Kyun: Full markdown libraries (marked.js etc) are 50KB+.
 * Humara use case simple hai — yeh 30 lines kaafi hai.
 */

/**
 * Converts AI markdown response to safe HTML
 * @param {string} text - Raw markdown text from AI
 * @returns {string} - Safe HTML string
 */
export function parseMarkdown(text) {
  if (!text) return '';

  return text
    // Escape HTML first (security — prevent XSS)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headings
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')

    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Unordered list items
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')

    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, match =>
      `<ul>${match}</ul>`
    )

    // Paragraph breaks
    .replace(/\n\n/g, '</p><p>')

    // Merge adjacent lists
    .replace(/<\/ul>\s*<ul>/g, '');
}
