
import { Project, Scene, ProductionElement, Stripboard, ProductionType, Strip, ScriptVersion, CalendarEvent } from "../types";

const LOCAL_STORAGE_KEY = 'nico_schedule_pro_db_v2';

interface DBState {
  projects: Project[];
  scenes: Record<string, Scene[]>; 
  elements: Record<string, ProductionElement[]>; 
  stripboards: Record<string, Stripboard[]>; 
  scripts: Record<string, ScriptVersion[]>; 
  calendarEvents: Record<string, CalendarEvent[]>;
  analysisResults: Record<string, any>; // projectId -> result object
}

const loadState = (): DBState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return { projects: [], scenes: {}, elements: {}, stripboards: {}, scripts: {}, calendarEvents: {}, analysisResults: {} };
};

const saveState = (state: DBState) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

export const db = {
  getProjects: async (): Promise<Project[]> => {
    const state = loadState();
    return state.projects;
  },

  createProject: async (name: string, type: ProductionType): Promise<Project> => {
    const state = loadState();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      code: name.substring(0, 3).toUpperCase(),
      type,
      startDate: new Date().toISOString(),
      totalPages: 0,
      totalScenes: 0
    };
    state.projects.push(newProject);
    saveState(state);
    return newProject;
  },
  
  saveAnalysisResult: async (projectId: string, result: any): Promise<void> => {
    const state = loadState();
    if (!state.analysisResults) state.analysisResults = {};
    state.analysisResults[projectId] = result;
    saveState(state);
  },

  getAnalysisResult: async (projectId: string): Promise<any> => {
    const state = loadState();
    return state.analysisResults?.[projectId] || null;
  },

  clearAnalysisResult: async (projectId: string): Promise<void> => {
    const state = loadState();
    if (state.analysisResults && state.analysisResults[projectId]) {
      delete state.analysisResults[projectId];
      saveState(state);
    }
  },

  getProjectScenes: async (projectId: string): Promise<Scene[]> => {
    const state = loadState();
    return state.scenes[projectId] || [];
  },

  saveScenes: async (projectId: string, scenes: Scene[]): Promise<void> => {
    const state = loadState();
    state.scenes[projectId] = scenes;
    
    // Update project totals
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
        project.totalScenes = scenes.length;
        project.totalPages = scenes.reduce((acc, s) => acc + s.pages, 0);
    }
    saveState(state);
  },

  getStripboards: async (projectId: string): Promise<Stripboard[]> => {
    const state = loadState();
    return state.stripboards[projectId] || [];
  },

  saveStripboard: async (board: Stripboard): Promise<void> => {
    const state = loadState();
    if (!state.stripboards[board.projectId]) state.stripboards[board.projectId] = [];
    const index = state.stripboards[board.projectId].findIndex(b => b.id === board.id);
    if (index >= 0) {
        state.stripboards[board.projectId][index] = board;
    } else {
        state.stripboards[board.projectId].push(board);
    }
    saveState(state);
  },

  createDefaultStripboard: async (projectId: string, scenes: Scene[]): Promise<Stripboard> => {
    const newBoard: Stripboard = {
        id: crypto.randomUUID(),
        projectId,
        name: 'Main Board',
        strips: scenes.map((s, i) => ({
            id: crypto.randomUUID(),
            sceneId: s.id,
            order: i
        }))
    };
    await db.saveStripboard(newBoard);
    return newBoard;
  },

  saveElements: async (projectId: string, elements: ProductionElement[]): Promise<void> => {
    const state = loadState();
    state.elements[projectId] = elements;
    saveState(state);
  },

  getElements: async (projectId: string): Promise<ProductionElement[]> => {
    const state = loadState();
    return state.elements[projectId] || [];
  },

  saveScriptVersion: async (version: ScriptVersion): Promise<void> => {
    const state = loadState();
    if (!state.scripts[version.projectId]) state.scripts[version.projectId] = [];
    state.scripts[version.projectId].push(version);
    saveState(state);
  },

  getEvents: async (projectId: string): Promise<CalendarEvent[]> => {
    const state = loadState();
    return state.calendarEvents[projectId] || [];
  },

  saveEvent: async (event: CalendarEvent): Promise<void> => {
    const state = loadState();
    if (!state.calendarEvents[event.projectId]) state.calendarEvents[event.projectId] = [];
    const index = state.calendarEvents[event.projectId].findIndex(e => e.id === event.id);
    if (index >= 0) {
      state.calendarEvents[event.projectId][index] = event;
    } else {
      state.calendarEvents[event.projectId].push(event);
    }
    saveState(state);
  },

  deleteEvent: async (projectId: string, eventId: string): Promise<void> => {
    const state = loadState();
    if (state.calendarEvents[projectId]) {
      state.calendarEvents[projectId] = state.calendarEvents[projectId].filter(e => e.id !== eventId);
      saveState(state);
    }
  }
};
