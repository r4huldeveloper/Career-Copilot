/**
 * pdfParser.js — File text extraction
 * Supports: PDF (via PDF.js), TXT (native), DOC/DOCX (best-effort)
 *
 * Kyun PDF.js:
 * Browser natively PDF bytes nahi padh sakta as text.
 * PDF.js (Mozilla ka open source library) proper rendering engine hai
 * jo PDF ke har page ka text accurately extract karta hai.
 */

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Lazy-load PDF.js only when needed
async function ensurePDFJS() {
  if (window.pdfjsLib) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = resolve;
    script.onerror = () => reject(new Error('PDF.js load nahi hua'));
    document.head.appendChild(script);
  });

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
}

/**
 * Extract text from PDF file
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractFromPDF(file) {
  await ensurePDFJS();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(pageText);
  }

  return pages.join('\n').trim();
}

/**
 * Extract text from plain text file
 * @param {File} file
 * @returns {Promise<string>}
 */
function extractFromTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Best-effort extraction from DOC/DOCX
 * Note: For reliable DOC extraction, PDF format recommended.
 * @param {File} file
 * @returns {Promise<string>}
 */
function extractFromDOC(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target.result;
      let text = '';
      for (let i = 0; i < raw.length; i++) {
        const code = raw.charCodeAt(i);
        if (code >= 32 && code < 127) text += raw[i];
        else if (code === 10 || code === 13) text += '\n';
      }
      text = text
        .replace(/[^\x20-\x7E\n]/g, '')
        .replace(/\s{4,}/g, ' ')
        .trim();

      if (text.length < 100) {
        resolve('');
      } else {
        resolve(text);
      }
    };
    reader.readAsBinaryString(file);
  });
}

/**
 * Main entry point — extract text from any supported file type
 * @param {File} file
 * @returns {Promise<{ text: string, error: string | null }>}
 */
export async function extractText(file) {
  const name = file.name.toLowerCase();

  try {
    let text = '';

    if (name.endsWith('.pdf')) {
      text = await extractFromPDF(file);
    } else if (name.endsWith('.txt')) {
      text = await extractFromTXT(file);
    } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
      text = await extractFromDOC(file);
    } else {
      return { text: '', error: 'Unsupported file type. PDF ya TXT use karo.' };
    }

    if (!text || text.length < 80) {
      return {
        text: '',
        error: 'File se text extract nahi hua. PDF try karo ya neeche manually paste karo.',
      };
    }

    return { text, error: null };
  } catch (err) {
    console.error('[pdfParser] Error:', err);
    return {
      text: '',
      error: `Extraction failed: ${err.message}. Neeche manually paste karo.`,
    };
  }
}
