
import { GoogleGenAI, Type } from "@google/genai";
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

// Lista ordinata di modelli per fallback (dai più potenti ai più veloci)
const RECOMMENDED_MODELS = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview'
];

export const analyzeScriptPdf = async (
  pdfBase64: string, 
  onModelSelected?: (modelId: string) => void
): Promise<BreakdownResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Log PDF size
  const byteLength = (pdfBase64.length * 0.75); // Stima grossolana base64 -> bytes
  console.log(`[GeminiService] Preparazione invio PDF: ${(byteLength / 1024).toFixed(2)} KB`);

  if (!process.env.API_KEY) {
    throw new Error("API_KEY mancante. Configura l'ambiente per utilizzare Gemini.");
  }

  const prompt = `
    Sei un esperto Assistente alla Regia (1st AD).
    Analizza il PDF della sceneggiatura allegato e genera un breakdown professionale.
    Rispondi esclusivamente in formato JSON.

    Requisiti JSON:
    - scenes: array con sceneNumber, slugline, intExt (INT o EST), dayNight (GIORNO, NOTTE, ALBA o TRAMONTO), setName, locationName, pageCountInEighths (formato: "X Y/8"), synopsis.
    - elements: array di tutti gli elementi unici (Cast, Props, Vehicles, Wardrobe, SFX, VFX, Stunt).
    - sceneElements: mapping tra sceneNumber e nomi degli elementi.

    IMPORTANTE: Estima il conteggio pagine in ottavi. Sii meticoloso con i nomi dei personaggi.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.STRING },
            slugline: { type: Type.STRING },
            intExt: { type: Type.STRING },
            dayNight: { type: Type.STRING },
            setName: { type: Type.STRING },
            locationName: { type: Type.STRING },
            pageCountInEighths: { type: Type.STRING },
            synopsis: { type: Type.STRING },
          },
          required: ["sceneNumber", "slugline", "intExt", "dayNight", "pageCountInEighths", "synopsis", "setName", "locationName"]
        }
      },
      elements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["name", "category"]
        }
      },
      sceneElements: {
        type: Type.OBJECT,
        additionalProperties: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    },
    required: ["scenes", "elements", "sceneElements"]
  };

  let lastError = null;

  // Implementazione Fallback Modelli
  for (const modelId of RECOMMENDED_MODELS) {
    try {
      console.log(`[GeminiService] Tentativo con modello: ${modelId}`);
      if (onModelSelected) onModelSelected(modelId);

      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
        }
      });

      if (!response.text) {
        throw new Error("Il modello ha restituito una risposta vuota.");
      }

      return JSON.parse(response.text) as BreakdownResult;

    } catch (error: any) {
      console.error(`[GeminiService] Errore con modello ${modelId}:`, error);
      lastError = error;
      
      // Se l'errore è 404 (modello non trovato) o 503 (servizio sovraccarico), prova il prossimo modello
      const isRecoverable = error.message?.includes('404') || 
                           error.message?.includes('503') || 
                           error.message?.includes('not found') ||
                           error.message?.includes('deprecated');
      
      if (!isRecoverable) {
          // Se l'errore è bloccante (es. API KEY non valida), esci subito
          break;
      }
      console.warn(`[GeminiService] Fallback in corso...`);
    }
  }

  // Se arriviamo qui, tutti i modelli hanno fallito
  const errorMessage = lastError?.message || "Errore sconosciuto durante l'analisi.";
  throw new Error(`Analisi fallita dopo vari tentativi: ${errorMessage}`);
};
