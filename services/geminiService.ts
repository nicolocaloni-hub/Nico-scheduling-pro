
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
  modelId?: string;
  text?: string;
  error?: string;
}

export const checkAiHealth = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch('/api/ai/health');
    
    // Controlliamo il content-type per evitare errori di parsing se il server ritorna HTML per errore
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
       const text = await response.text();
       throw new Error(`Server returned non-JSON response: ${text.substring(0, 50)}...`);
    }

    const data = await response.json();
    return data;
  } catch (e: any) {
    return {
      ok: false,
      error: e.message || "Network or Parsing Error"
    };
  }
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
      message: result.message || result.error,
      error: result.error
    });
  }

  if (!result.ok && !response.ok) {
    throw new Error(result.error || result.message || `Errore Server (${response.status})`);
  }
  
  if (result.ok === false) {
     throw new Error(result.error || "Errore sconosciuto nell'analisi");
  }

  return result.data as BreakdownResult;
};
