
export enum ProductionType {
  Feature = 'Lungometraggio',
  Medium = 'Mediometraggio',
  Short = 'Cortometraggio',
  Series = 'Serie TV',
  Commercial = 'Pubblicità'
}

export enum DayNight {
  DAY = 'GIORNO',
  NIGHT = 'NOTTE',
  DAWN = 'ALBA',
  DUSK = 'TRAMONTO'
}

export enum IntExt {
  INT = 'INT',
  EXT = 'EST',
  INT_EXT = 'INT/EST'
}

export interface Project {
  id: string;
  name: string;
  code: string;
  type: ProductionType;
  startDate: string;
  endDate?: string;
  totalPages: number;
  totalScenes: number;
  currentScriptId?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: string;
  slugline: string;
  intExt: IntExt;
  dayNight: DayNight;
  locationName: string;
  setName: string;
  pages: number; 
  pageCountInEighths: string; 
  synopsis: string;
  scriptText?: string;
  elementIds: string[];
}

export enum ElementCategory {
  Cast = 'Cast',
  Background = 'Comparse',
  Vehicles = 'Veicoli',
  Props = 'Arredamento/Attrezzeria',
  SFX = 'Effetti Speciali (SFX)',
  VFX = 'Effetti Visivi (VFX)',
  Wardrobe = 'Costumi',
  Animals = 'Animali',
  Greenery = 'Greenery',
  Security = 'Sicurezza',
  Music = 'Musica',
  Sound = 'Suono',
  Camera = 'Macchina da Presa',
  Stunt = 'Stunt'
}

export interface ProductionElement {
  id: string;
  projectId: string;
  name: string;
  category: ElementCategory;
  castId?: number; 
}

export interface ScriptVersion {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string; 
  version: number;
  createdAt: string;
}

export interface Strip {
  id: string;
  sceneId: string;
  order: number;
  isBanner?: boolean;
  bannerText?: string;
  isDayBreak?: boolean;
  dayNumber?: number;
}

export interface Stripboard {
  id: string;
  projectId: string;
  name: string;
  strips: Strip[];
}

// Nuovi tipi per l'analisi Job-based
export type JobStatus = 'queued' | 'running' | 'parsing' | 'done' | 'error';

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  step: string;
  modelId?: string;
  inputBytes?: number;
  rawPreview?: string;
  error?: string;
  resultSummary?: {
    sceneCount: number;
    locationCount: number;
    castCount: number;
    propsCount: number;
  };
  result?: BreakdownResult;
}

export interface BreakdownResult {
  scenes: {
    sceneNumber: string;
    slugline: string;
    intExt: string;
    dayNight: string;
    setName: string;
    locationName: string;
    pageCountInEighths: string;
    synopsis: string;
  }[];
  elements: { 
    name: string; 
    category: string; 
  }[];
  sceneElements: Record<string, string[]>;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  type: 'shooting' | 'general';
  scenes?: string[]; // Scene Numbers
  notes?: string;
  time?: string;
}
