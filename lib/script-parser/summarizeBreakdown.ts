import { BreakdownData, BreakdownSummary } from './types';

export function summarizeBreakdown(data: BreakdownData): BreakdownSummary {
  const sceneCount = data.scenes.length;
  const locationCount = new Set(data.scenes.map(s => s.locationName)).size;
  const castCount = data.elements.filter(e => e.category === 'Cast').length;
  const propsCount = data.elements.filter(e => e.category === 'Props').length;

  return {
    sceneCount,
    locationCount,
    castCount,
    propsCount
  };
}
