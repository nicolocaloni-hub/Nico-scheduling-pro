
import { BreakdownResult } from "../types";

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

export interface HealthCheckResponse {
  ok: boolean;
  reason?: string;
  error?: string;
  model?: string;
  text?: string;
}

export const checkAiHealth = async (): Promise<HealthCheckResponse> => {
  const response = await fetch('/api/ai/health');
  const data = await response.json();
  // Ritorniamo direttamente il data perché ora contiene { ok: boolean, ... }
  return data;
};

export const analyzeScriptPdf = async (
  pdfBase64: string, 
  onDebugInfo?: (info: any) => void
): Promise<BreakdownResult> => {
  console.log(`[Frontend Service] Invio PDF all'API breakdown: ${pdfBase64.length} bytes`);

  const response = await fetch('/api/ai/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 })
  });

  const result = await response.json();

  if (onDebugInfo) {
    onDebugInfo({
      status: response.status,
      modelUsed: result.modelUsed,
      message: result.message || result.reason, // Gestisce sia il formato errore breakdown che health
      error: result.error
    });
  }

  if (!result.ok && !response.ok) {
    // Se la response è 400/500 e il body ha ok: false
    throw new Error(result.reason || result.error || result.message || `Errore Server (${response.status})`);
  }
  
  // Caso in cui il backend torna 200 ma ok: false (raro con la logica attuale, ma sicuro)
  if (result.ok === false) {
     throw new Error(result.error || result.reason || "Errore sconosciuto nell'analisi");
  }

  return result.data as BreakdownResult;
};
