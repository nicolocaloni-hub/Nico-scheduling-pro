import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function extractPdfText(pdfBase64: string): Promise<string> {
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}
