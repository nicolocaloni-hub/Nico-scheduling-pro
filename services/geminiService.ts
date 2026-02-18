
import { BreakdownResult, Scene } from "../types";

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

/**
 * Utility per gestire le fetch in modo sicuro, evitando crash in caso di risposte non-JSON
 */
const safeFetch = async (url: string, options?: RequestInit) => {
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
};

export const checkAiEnv = async () => {
  return await safeFetch('/api/ai/env');
};

export const runSimpleTest = async () => {
  return await safeFetch('/api/ai/simple-test');
};

export const checkAiHealth = async () => {
  const { ok, data, error } = await safeFetch('/api/ai/health');
  if (!ok) throw new Error(error || data?.message || "Health check fallito");
  return data;
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
