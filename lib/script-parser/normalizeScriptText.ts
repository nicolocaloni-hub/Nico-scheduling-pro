export function normalizeScriptText(text: string): string[] {
  // Replace multiple spaces with single space, but keep indentation if possible?
  // Actually, pdf-parse often loses indentation or adds weird spaces.
  // We will trim lines for easier regex matching.
  // But we might lose character indentation info.
  // Let's try to keep indentation for character detection if possible.
  // pdf-parse output is unpredictable.
  // Let's assume standard text extraction.

  // Normalize newlines
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into lines
  const lines = normalized.split('\n');

  // Trim lines? If we trim, we lose indentation.
  // But indentation is useful for characters.
  // Let's keep indentation for now, but also provide a trimmed version for regex.
  return lines;
}

export function cleanLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}
