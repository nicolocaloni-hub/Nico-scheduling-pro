
import { Type } from "@google/genai";
import { getGeminiClient } from "../../lib/ai/client";
import { FALLBACK_MODEL_ID } from "../../lib/ai/config";

// Configurazione Vercel
export const config = {
  maxDuration: 60, 
};

export default async function handler(req: any, res: any) {
  console.log("[Breakdown API] Start");
  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Validazione Request
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ ok: false, error: "Missing pdfBase64 body parameter" });
    }

    // 2. Inizializzazione Client (Logica condivisa)
    // Se manca la key, getGeminiClient lancia un errore che viene catturato dal catch globale
    const ai = getGeminiClient();

    // 3. Configurazione Modelli e Prompt
    const MODELS_TO_TRY = ["gemini-2.0-flash", FALLBACK_MODEL_ID];
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

    // 4. Loop Tentativi Modelli
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

        if (!response.text) throw new Error("Empty response text from AI");

        // Validazione JSON server-side per assicurarsi che il modello abbia risposto correttamente
        let parsedData;
        try {
            parsedData = JSON.parse(response.text);
        } catch (jsonError) {
            throw new Error("Model returned invalid JSON");
        }

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
        
        // Se è un errore 400 (Bad Request) o Auth, è inutile riprovare con altri modelli
        if (error.toString().includes('API key') || error.status === 400) {
           throw error; // Esci dal loop e vai al catch globale
        }
      }
    }

    // Se arriviamo qui, tutti i modelli hanno fallito
    throw new Error(lastError?.message || "All models failed to analyze the script");

  } catch (globalError: any) {
    console.error("[Breakdown API Fatal]", globalError);
    
    // 5. Risposta Errore Globale (Sempre JSON)
    const statusCode = globalError.message?.includes("API key") ? 400 : 500;
    
    return res.status(statusCode).json({
      ok: false,
      error: globalError.message || "Internal Server Error",
      details: "Check server logs for more info"
    });
  }
}
