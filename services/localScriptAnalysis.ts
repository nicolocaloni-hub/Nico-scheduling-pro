import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { groupScriptLines, parseScreenplayLines, type ScriptLine } from './screenplayParser';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** The source PDF never leaves the browser. PDF.js and its worker ship with the app. */
export async function analyzeScriptLocally(file: File, onProgress: (message: string) => void = () => {}) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') throw new Error('Seleziona un file PDF.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Il PDF supera 50 MB. Esporta una versione testuale più leggera.');
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const document = await task.promise;
    if (document.numPages > 500) throw new Error('Il PDF supera 500 pagine. Dividi il copione in parti più piccole.');
    const lines: ScriptLine[] = [];
    const emptyPages: number[] = [];
    for (let n = 1; n <= document.numPages; n++) {
      onProgress(`Lettura locale: pagina ${n} di ${document.numPages}`);
      const page = await document.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const text = await page.getTextContent();
      const items = text.items.flatMap(item => {
        if (!('str' in item) || !item.str.trim()) return [];
        const transform = pdfjs.Util.transform(viewport.transform, item.transform);
        return [{ text: item.str, x: transform[4], top: transform[5], height: Math.max(1, item.height) }];
      });
      if (!items.length) emptyPages.push(n);
      lines.push(...groupScriptLines(items, n, viewport.height));
      page.cleanup();
      // Yield between pages so progress and navigation remain responsive.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    onProgress('Riconoscimento di scene, personaggi ed elementi...');
    const result = parseScreenplayLines(lines);
    if (emptyPages.length) result.data.warnings.push(`Pagine senza testo: ${emptyPages.join(', ')}. Le scansioni richiedono OCR; controlla eventuali scene mancanti.`);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('Il PDF è protetto da password. Importa una copia non protetta.');
    if (error instanceof Error && error.name === 'InvalidPDFException') throw new Error('Il PDF non è valido o è danneggiato. Prova a esportarlo di nuovo.');
    throw error;
  } finally {
    await task.destroy();
  }
}
