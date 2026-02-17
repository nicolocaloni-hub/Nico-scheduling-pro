
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

export const checkAiHealth = async () => {
  const response = await fetch('/api/ai/health');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Health check fallito");
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
      message: result.message,
      error: result.error
    });
  }

  if (!response.ok) {
    throw new Error(result.error || result.message || `Errore Server (${response.status})`);
  }

  return result.data as BreakdownResult;
};
