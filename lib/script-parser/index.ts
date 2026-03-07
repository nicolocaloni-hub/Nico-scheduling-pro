import { extractPdfText } from './extractPdfText';
import { normalizeScriptText } from './normalizeScriptText';
import { detectScenes } from './detectScenes';
import { parseSceneHeader } from './parseSceneHeader';
import { extractCharacters } from './extractCharacters';
import { extractProps } from './extractProps';
import { summarizeBreakdown } from './summarizeBreakdown';
import { BreakdownResult, BreakdownData, Element } from './types';

export async function parseScript(pdfBase64: string): Promise<BreakdownResult> {
  try {
    // 1. Extract text
    const rawText = await extractPdfText(pdfBase64);
    
    // 2. Normalize
    const lines = normalizeScriptText(rawText);

    // 3. Detect scenes
    let scenes = detectScenes(lines);

    // 4. Parse each scene
    const allElements: Element[] = [];
    const sceneElements: Record<string, string[]> = {};

    scenes = scenes.map(scene => {
      // Parse header
      const parsedScene = parseSceneHeader(scene);

      // Extract characters
      const characters = extractCharacters(parsedScene);
      
      // Extract props
      const props = extractProps(parsedScene);

      // Combine elements
      const sceneEl = [...characters, ...props];
      
      // Add to global list
      allElements.push(...sceneEl);

      // Map scene to elements
      // Use sceneNumber if available, otherwise index?
      // The frontend expects sceneNumber as key.
      // If sceneNumber is empty, we should probably generate one?
      // But detectScenes tries to extract it.
      // If empty, let's use a fallback?
      // Actually, let's rely on what detectScenes found.
      if (parsedScene.sceneNumber) {
        sceneElements[parsedScene.sceneNumber] = sceneEl.map(e => e.name);
      }

      return parsedScene;
    });

    // 5. Deduplicate elements
    const uniqueElementsMap = new Map<string, Element>();
    allElements.forEach(el => {
      const key = `${el.name.toLowerCase()}-${el.category}`;
      if (!uniqueElementsMap.has(key)) {
        uniqueElementsMap.set(key, el);
      }
    });
    const uniqueElements = Array.from(uniqueElementsMap.values());

    // 6. Build response
    const data: BreakdownData = {
      scenes,
      elements: uniqueElements,
      sceneElements
    };

    const summary = summarizeBreakdown(data);

    return {
      ok: true,
      data,
      summary,
      modelUsed: 'rule-based-parser'
    };

  } catch (error: any) {
    console.error("Parser Error:", error);
    return {
      ok: false,
      data: { scenes: [], elements: [], sceneElements: {} },
      summary: { sceneCount: 0, locationCount: 0, castCount: 0, propsCount: 0 },
      modelUsed: 'rule-based-parser',
      error: error.message
    };
  }
}
