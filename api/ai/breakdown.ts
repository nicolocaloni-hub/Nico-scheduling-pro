
import { GoogleGenAI, Type } from "@google/genai";
import { PRIMARY_MODEL_ID, FALLBACK_MODEL_ID } from "../../lib/ai/config";

export default async function handler(req: any, res: any) {
  // Forza JSON header
  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Check Metodo
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    // 2. Check API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        reason: "Missing GEMINI_API_KEY" 
      });
    }

    // 3. Check Body
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ ok: false, message: "Dati PDF mancanti (pdfBase64)." });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Usiamo il modello richiesto 2.0, poi fallback su 1.5 se necessario
    const MODELS_TO_TRY = ["gemini-2.0-flash", FALLBACK_MODEL_ID];
    
    const prompt = `Sei un esperto Assistente alla Regia. Analizza il PDF allegato e genera un breakdown professionale in JSON.`;
    
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

    // 4. Tentativi Sequenziali
    for (const modelId of MODELS_TO_TRY) {
      try {
        console.log(`[Breakdown API] Tentativo con: ${modelId}`);
        
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

        // Verifica robusta della risposta
        if (!response.text) throw new Error("Risposta vuota dal modello (text property missing).");

        return res.status(200).json({
          ok: true,
          modelUsed: modelId,
          fallback: modelId !== "gemini-2.0-flash",
          data: JSON.parse(response.text)
        });

      } catch (error: any) {
        console.error(`[Breakdown API] Errore con ${modelId}:`, error.message);
        lastError = error;
        
        // Se errore critico su API Key (400), abortiamo subito
        if (error.message && (error.message.includes('API key') || error.status === 400)) {
           return res.status(400).json({ ok: false, message: "Invalid API Key or Bad Request", error: error.message });
        }
      }
    }

    // 5. Fallimento Totale
    return res.status(500).json({
      ok: false,
      message: "Tutti i tentativi di analisi sono falliti.",
      error: lastError?.message || "Unknown error during AI processing",
      code: lastError?.status || 500
    });

  } catch (globalError: any) {
    console.error("[Breakdown API Fatal]", globalError);
    return res.status(500).json({
      ok: false,
      message: "Internal Server Error (Fatal)",
      error: globalError.message
    });
  }
}
