
import { Project, Scene, ProductionElement, Stripboard, ProductionType, Strip, ScriptVersion } from "../types";

const LOCAL_STORAGE_KEY = 'nico_schedule_pro_db_v2';

interface DBState {
  projects: Project[];
  scenes: Record<string, Scene[]>; 
  elements: Record<string, ProductionElement[]>; 
  stripboards: Record<string, Stripboard[]>; 
  scripts: Record<string, ScriptVersion[]>; 
}

const loadState = (): DBState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return { projects: [], scenes: {}, elements: {}, stripboards: {}, scripts: {} };
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

  saveScriptVersion: async (version: ScriptVersion): Promise<void> => {
    const state = loadState();
    if (!state.scripts[version.projectId]) state.scripts[version.projectId] = [];
    state.scripts[version.projectId].push(version);
    saveState(state);
  }
};
