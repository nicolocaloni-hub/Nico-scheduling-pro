import * as pdfjsLib from 'pdfjs-dist';
import {
  extractCrewFromPositionedPages,
  ParsedCrewMember,
  PositionedText,
} from './crewTableParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const isPdf = (file: File) => (
  file.type === 'application/pdf'
  || file.name.toLowerCase().endsWith('.pdf')
);

const parsePdf = async (file: File): Promise<ParsedCrewMember[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PositionedText[][] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const positionedItems = textContent.items.flatMap(item => {
      if (!('str' in item) || !item.str.trim()) return [];
      return [{
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        height: item.height,
      }];
    });
    pages.push(positionedItems);
  }

  return extractCrewFromPositionedPages(pages);
};

export const parseDocumentLocally = async (file: File): Promise<ParsedCrewMember[]> => {
  if (isPdf(file)) return parsePdf(file);
  throw new Error('Formato file non supportato. Usa un PDF.');
};

export type { ParsedCrewMember } from './crewTableParser';

