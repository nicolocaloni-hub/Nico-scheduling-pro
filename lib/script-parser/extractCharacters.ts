import { Scene, Element } from './types';

export function extractCharacters(scene: Scene): Element[] {
  const lines = scene.rawText.split('\n');
  const characters: Set<string> = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;

    // Check if line is uppercase
    if (line === line.toUpperCase() && line.length > 1 && line.length < 30) {
      // Check if it's a slugline (already handled, but double check)
      if (/^(?:INT|EXT|INT\/EXT|I\/E)\.?\s/i.test(line)) continue;

      // Check if it's a transition
      if (/^(?:CUT TO:|FADE TO:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|TRANSITION:)$/i.test(line)) continue;

      // Check if it's a parenthetical (starts with '(')
      if (line.startsWith('(')) continue;

      // Check if next line is dialogue (mixed case, not empty)
      // We look ahead a few lines to skip parentheticals
      let nextLineIndex = i + 1;
      while (nextLineIndex < lines.length && (lines[nextLineIndex].trim().startsWith('(') || !lines[nextLineIndex].trim())) {
        nextLineIndex++;
      }

      if (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex].trim();
        // Dialogue usually starts with mixed case or lowercase (if continued)
        // But some scripts use uppercase for emphasis.
        // The key is that character name is usually followed by dialogue block.
        // And character name is usually preceded by empty line.
        
        const prevLine = i > 0 ? lines[i-1].trim() : "";
        
        if (!prevLine && nextLine && nextLine !== nextLine.toUpperCase()) {
          // Likely a character
          // Clean up (remove (V.O.), (O.S.), etc.)
          const name = line.replace(/\s*\(.*\)$/, '').trim();
          if (name.length > 1) {
            characters.add(name);
          }
        }
      }
    }
  }

  return Array.from(characters).map(name => ({ name, category: 'Cast' }));
}
