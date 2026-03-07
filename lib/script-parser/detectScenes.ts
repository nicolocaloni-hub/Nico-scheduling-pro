import { Scene } from './types.ts';
import { cleanLine } from './normalizeScriptText.ts';

export function detectScenes(lines: string[]): Scene[] {
  const scenes: Scene[] = [];
  let currentScene: Scene | null = null;
  let currentSceneLines: string[] = [];

  // Regex for slugline
  // Matches:
  // 1. Optional scene number (e.g., "1 ")
  // 2. INT, EXT, INT/EXT, I/E
  // 3. Optional dot
  // 4. Space
  // 5. Rest of line
  const sluglineRegex = /^(?:(\d+)[.\s]+)?((?:INT|EXT|INT\/EXT|I\/E)\.?\s+.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = cleanLine(line);

    if (!trimmed) {
      if (currentScene) {
        currentSceneLines.push(line);
      }
      continue;
    }

    const match = trimmed.match(sluglineRegex);

    if (match) {
      // Found a new scene
      if (currentScene) {
        // Save previous scene
        currentScene.rawText = currentSceneLines.join('\n');
        // Estimate page count (approx 55 lines per page = 8/8)
        const eighths = Math.max(1, Math.round((currentSceneLines.length / 55) * 8));
        currentScene.pageCountInEighths = `${Math.floor(eighths / 8)} ${eighths % 8}/8`;
        if (eighths < 8) currentScene.pageCountInEighths = `${eighths}/8`;
        
        scenes.push(currentScene);
      }

      // Start new scene
      let sceneNumber = match[1] || "";
      const slugline = match[2].trim();

      if (!sceneNumber) {
        // Auto-increment if missing
        sceneNumber = String(scenes.length + 1);
      }

      currentScene = {
        sceneNumber,
        slugline,
        intExt: "",
        dayNight: "",
        setName: "",
        locationName: "",
        pageCountInEighths: "",
        synopsis: "",
        rawText: ""
      };
      currentSceneLines = [line];
    } else {
      if (currentScene) {
        currentSceneLines.push(line);
      }
    }
  }

  // Add last scene
  if (currentScene) {
    currentScene.rawText = currentSceneLines.join('\n');
    const eighths = Math.max(1, Math.round((currentSceneLines.length / 55) * 8));
    currentScene.pageCountInEighths = `${Math.floor(eighths / 8)} ${eighths % 8}/8`;
    if (eighths < 8) currentScene.pageCountInEighths = `${eighths}/8`;
    scenes.push(currentScene);
  }

  return scenes;
}
