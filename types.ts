
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
  shootDays?: string[]; // List of ISO dates YYYY-MM-DD
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
  shootDay?: string; // YYYY-MM-DD
}

export enum ElementCategory {
  Cast = 'Cast',
  Background = 'Comparse',
  Vehicles = 'Veicoli',
  Props = 'Arredamento/Attrezzeria',
  SFX = 'Effetti Speciali (SFX)',
  VFX = 'Effetti Visivi (VFX)',
  Wardrobe = 'Costumi',
  MakeupHair = 'Trucco/Acconciatura',
  Animals = 'Animali',
  Greenery = 'Greenery',
  Security = 'Sicurezza',
  Music = 'Musica',
  Sound = 'Suono',
  Camera = 'Macchina da Presa',
  SpecialEquipment = 'Equipaggiamento Speciale',
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

export interface DayPrintSettings {
  startTime?: string;
  endTime?: string;
  pauseStart?: string;
  pauseEnd?: string;
}

export interface PrintSetup {
  showTime?: boolean;
  includeExtraBanners?: boolean;
  useMovieMagicColors?: boolean;
  dayLabels?: string[];
  daySettings?: Record<string, DayPrintSettings>; // key is the date YYYY-MM-DD
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
  shootingDays?: string[]; // List of ISO dates YYYY-MM-DD
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

export interface ODGSceneEntry {
  sceneId: string;
  selected: boolean;
  order: number;
  notes?: string;
}

export interface ODGCallEntry {
  id: string;
  role: string;
  name: string;
  department?: string;
  scenes?: string;
  pickupTime?: string;
  makeupTime?: string;
  costumeTime?: string;
  readyTime?: string;
  setTime?: string;
  callTime: string; // General call time
  notes?: string;
}

export interface ODGData {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  shootDayNumber: number;
  projectName: string;
  director?: string;
  odgNumber?: number;
  
  // Info Generali
  baseCamp: string;
  locationCity: string;
  mainSet: string;
  setAddress: string;
  startTime: string;
  readyToShootTime?: string;
  lunchTime: string;
  wrapTime?: string;
  endTime: string;
  
  // New fields from screenshot
  metroStation?: string;
  parkingInfo?: string;
  hospitalInfo?: string;
  executiveProducer?: string;
  productionOrganizer?: string;
  assistantDirector?: string;
  dop?: string;
  soundMixer?: string;
  productionDesigner?: string;
  costumeDesigner?: string;
  weatherMaxTemp?: string;
  weatherMinTemp?: string;
  weather?: string;
  sunriseTime?: string;
  sunsetTime?: string;
  mottoOfTheDay?: string;
  
  // Scene
  scenes: ODGSceneEntry[];
  
  // Convocazioni
  castCalls: ODGCallEntry[];
  crewCalls: ODGCallEntry[];
  
  // Note
  transportNotes: string;
  weatherNotes: string;
  backgroundNotes: string;
  productionNotes: string;

  // Department notes
  propsNotes?: string;
  soundNotes?: string;
  costumeNotes?: string;
  makeupNotes?: string;
  photographyNotes?: string;
  regiaNotes?: string;
  animaliNotes?: string;
  productionLogo?: string;
}
