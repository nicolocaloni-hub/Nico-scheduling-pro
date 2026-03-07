import { Scene } from './types';

export function parseSceneHeader(scene: Scene): Scene {
  const slugline = scene.slugline.toUpperCase();

  // INT/EXT
  if (slugline.startsWith('INT.')) scene.intExt = 'INT';
  else if (slugline.startsWith('EXT.')) scene.intExt = 'EXT';
  else if (slugline.startsWith('INT/EXT') || slugline.startsWith('I/E')) scene.intExt = 'INT/EXT';
  
  // DAY/NIGHT
  if (slugline.includes('DAY') || slugline.includes('GIORNO')) scene.dayNight = 'DAY';
  else if (slugline.includes('NIGHT') || slugline.includes('NOTTE')) scene.dayNight = 'NIGHT';
  else if (slugline.includes('DAWN') || slugline.includes('ALBA')) scene.dayNight = 'DAWN';
  else if (slugline.includes('DUSK') || slugline.includes('TRAMONTO')) scene.dayNight = 'DUSK';

  // Location
  // Remove INT/EXT and DAY/NIGHT
  let location = slugline
    .replace(/^(?:INT|EXT|INT\/EXT|I\/E)\.?\s+/i, '')
    .replace(/\s*-\s*(?:DAY|NIGHT|DAWN|DUSK|GIORNO|NOTTE|ALBA|TRAMONTO).*$/i, '')
    .trim();

  // Split Set/Location if possible (e.g., "HOUSE - KITCHEN")
  if (location.includes(' - ')) {
    const parts = location.split(' - ');
    scene.locationName = parts[0].trim();
    scene.setName = parts[1].trim();
  } else {
    scene.locationName = location;
    scene.setName = location;
  }

  return scene;
}
