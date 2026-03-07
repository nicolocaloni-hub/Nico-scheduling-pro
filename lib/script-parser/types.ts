export interface Scene {
  sceneNumber: string;
  slugline: string;
  intExt: "INT" | "EXT" | "INT/EXT" | "";
  dayNight: "DAY" | "NIGHT" | "DAWN" | "DUSK" | "";
  setName: string;
  locationName: string;
  pageCountInEighths: string;
  synopsis: string;
  rawText: string; // Internal use for further parsing
}

export interface Element {
  name: string;
  category: string;
}

export interface BreakdownData {
  scenes: Scene[];
  elements: Element[];
  sceneElements: Record<string, string[]>;
}

export interface BreakdownSummary {
  sceneCount: number;
  locationCount: number;
  castCount: number;
  propsCount: number;
}

export interface BreakdownResult {
  ok: boolean;
  data: BreakdownData;
  summary: BreakdownSummary;
  modelUsed: string;
  error?: string;
}
