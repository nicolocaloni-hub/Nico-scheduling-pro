
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

/**
 * Funzione helper per gestire le risposte fetch in modo sicuro.
 * Previene "Unexpected token <" quando il server ritorna HTML di errore.
 */
async function handleResponse(response: Response) {
  const text = await response.text();
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Se fallisce il parsing JSON, probabilmente è un errore HTML di Vercel (504/500)
    console.error("[GeminiService] Non-JSON response received:", text.substring(0, 100));
    throw new Error(`Server Error (${response.status}): La risposta non è JSON valido. Possibile Timeout o Crash.`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Errore API (${response.status})`);
  }
  
  return data;
}

export const checkAiHealth = async (): Promise<HealthCheckResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per health check

    // PUNTA AL NUOVO ENDPOINT SIMPLE-TEST
    const response = await fetch('/api/ai/simple-test', { 
        signal: controller.signal 
    });
    clearTimeout(timeoutId);

    const data = await handleResponse(response);
    return data;
  } catch (e: any) {
    return {
      ok: false,
      error: e.name === 'AbortError' ? 'Timeout: Il server non risponde (10s)' : (e.message || "Network Error")
    };
  }
};

export const analyzeScriptPdf = async (
  pdfBase64: string, 
  onDebugInfo?: (info: any) => void
): Promise<BreakdownResult> => {
  console.log(`[Frontend Service] Invio PDF all'API breakdown: ${pdfBase64.length} bytes`);

  // Impostiamo un timeout client leggermente inferiore al limite server (es. 55s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch('/api/ai/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64 }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const result = await handleResponse(response);

    if (onDebugInfo) {
        onDebugInfo({
        status: response.status,
        modelUsed: result.modelUsed,
        message: result.message || "Success",
        });
    }

    if (result.ok === false) {
        throw new Error(result.error || "Errore sconosciuto nell'analisi");
    }

    return result.data as BreakdownResult;

  } catch (error: any) {
    if (onDebugInfo) {
        onDebugInfo({
            status: error.name === 'AbortError' ? 408 : 500,
            modelUsed: 'error',
            message: error.message,
            error: error.message
        });
    }
    
    if (error.name === 'AbortError') {
        throw new Error("Timeout Richiesta (55s): L'analisi sta impiegando troppo tempo. Il PDF potrebbe essere troppo lungo per il piano attuale.");
    }
    throw error;
  }
};
