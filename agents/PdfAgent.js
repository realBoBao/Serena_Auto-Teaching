/**
 * PdfAgent — PDF processing agent
 * Extracts text from PDFs, generates flashcards, summarizes content.
 * @module agents/PdfAgent
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('PdfAgent');

/**
 * Process a PDF file: extract text, summarize, optionally generate flashcards.
 */
export async function processPdf(filePath, options = {}) {
  logger.info('[PdfAgent] Processing PDF:', filePath);

  try {
    const pdfParse = (await import('pdf-parse')).default;
    const fs = await import('fs');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const text = data.text || '';
    const pages = data.numpages || 0;

    logger.info(`[PdfAgent] Extracted ${text.length} chars from ${pages} pages`);

    return {
      text: text.slice(0, 10000), // Limit for processing
      pages,
      info: data.info || {},
      generatedFlashcards: 0,
    };
  } catch (err) {
    logger.error('[PdfAgent] processPdf failed:', err.message);
    return { text: '', pages: 0, error: err.message };
  }
}

/**
 * Generate flashcards from PDF text.
 */
export async function generateFlashcardsFromPdf(text, count = 10) {
  try {
    const { generateFlashcardsFromText } = await import('../lib/flashcard_generator.js');
    return await generateFlashcardsFromText(text, count);
  } catch (err) {
    logger.error('[PdfAgent] generateFlashcards failed:', err.message);
    return [];
  }
}

export default { processPdf, generateFlashcardsFromPdf };
