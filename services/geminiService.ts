
import { BreakdownResult, Scene, AnalysisJob } from "../types";

export const parseEighthsToFloat = (eighthsStr: string): number => {
  if (!eighthsStr) return 0;
  const match = eighthsStr.match(/(\d+)?\s*(\d+)\/8/);
  if (!match) {
      const val = parseFloat(eighthsStr);
      return isNaN(val) ? 0 : val;
  }
  const whole = match[1] ? parseInt(match[1]) : 0;
  const eighths = parseInt(match[2]);
  return whole + (eighths / 8);
};

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } else {
      const text = await response.text();
      return { 
        ok: false, 
        status: response.status, 
        error: `Risposta non JSON: ${text.substring(0, 100)}...` 
      };
    }
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message };
  }
};

export const checkAiEnv = async () => {
  return await safeFetch('/api/ai/env');
};

export const runSimpleTest = async () => {
  return await safeFetch('/api/ai/simple-test');
};

export const startScriptAnalysis = async (pdfBase64: string): Promise<string> => {
  const { ok, data, error } = await safeFetch('/api/ai/breakdown_start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 })
  });
  if (!ok) throw new Error(error || data?.message || "Impossibile avviare l'analisi");
  return data.jobId;
};

export const getAnalysisStatus = async (jobId: string): Promise<AnalysisJob> => {
  const { ok, data, error } = await safeFetch(`/api/ai/breakdown_status?jobId=${jobId}`);
  if (!ok) throw new Error(error || data?.message || "Errore nel recupero dello stato");
  return data.job;
};

export const getAnalysisResult = async (jobId: string): Promise<BreakdownResult> => {
  const { ok, data, error } = await safeFetch(`/api/ai/breakdown_result?jobId=${jobId}`);
  if (!ok) throw new Error(error || data?.message || "Errore nel recupero del risultato");
  return data.result;
};

export const optimizeSchedule = async (scenes: Scene[]): Promise<string[]> => {
  const { ok, data, error } = await safeFetch('/api/ai/optimize-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes })
  });
  if (!ok) throw new Error(error || data?.message || "Ottimizzazione fallita");
  return data.orderedSceneIds;
};

export const analyzeScriptPdf = async (
  pdfBase64: string, 
  onDebugInfo?: (info: any) => void
): Promise<BreakdownResult> => {
  // Metodo legacy mantenuto per compatibilità, ma ora useremo il nuovo workflow job-based
  const { ok, status, data, error } = await safeFetch('/api/ai/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 })
  });

  if (onDebugInfo) {
    onDebugInfo({
      status,
      modelUsed: data?.modelUsed,
      message: data?.message,
      error: error || data?.error
    });
  }

  if (!ok) {
    throw new Error(error || data?.error || data?.message || `Errore Server (${status})`);
  }

  return data.data as BreakdownResult;
};
