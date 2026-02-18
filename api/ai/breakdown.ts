
import { GoogleGenAI, Type } from "@google/genai";
import { FALLBACK_MODEL_ID } from "../../lib/ai/config";

// Configurazione Vercel: Estendi timeout
export const config = {
  maxDuration: 60, 
};

export default async function handler(req: any, res: any) {
  console.log("[Breakdown API] Start");
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(400).json({ ok: false, reason: "Missing GEMINI_API_KEY" });
    }

    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ ok: false, message: "Missing pdfBase64" });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Sequenza modelli: Prova il 2.0 Flash, poi fallback
    const MODELS_TO_TRY = ["gemini-2.0-flash", FALLBACK_MODEL_ID];
    
    // Prompt ottimizzato per velocità
    const prompt = `Analizza lo script PDF. Estrai Scene ed Elementi. Rispondi SOLO in JSON.`;
    
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
            required: ["sceneNumber", "slugline", "intExt", "dayNight", "pageCountInEighths", "synopsis"]
          }
        },
        elements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING }
            }
          }
        },
        sceneElements: { type: Type.OBJECT }
      }
    };

    let lastError = null;

    for (const modelId of MODELS_TO_TRY) {
      try {
        console.log(`[Breakdown API] Trying model: ${modelId}`);
        
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

        if (!response.text) throw new Error("Empty response text");

        // Validazione JSON server-side
        const parsedData = JSON.parse(response.text);

        console.log(`[Breakdown API] Success with ${modelId}`);
        return res.status(200).json({
          ok: true,
          modelUsed: modelId,
          fallback: modelId !== "gemini-2.0-flash",
          data: parsedData
        });

      } catch (error: any) {
        console.error(`[Breakdown API] Error with ${modelId}:`, error.message);
        lastError = error;
        
        // Non riprovare se è un errore di autenticazione o bad request
        if (error.status === 400 || (error.message && error.message.includes('API key'))) {
           return res.status(400).json({ ok: false, message: "Invalid API Key or Bad Request", error: error.message });
        }
      }
    }

    // Se arriviamo qui, tutti i modelli hanno fallito
    throw new Error(lastError?.message || "All models failed");

  } catch (globalError: any) {
    console.error("[Breakdown API Fatal]", globalError);
    return res.status(500).json({
      ok: false,
      message: "Internal Server Error",
      error: globalError.message || "Unknown error"
    });
  }
}
