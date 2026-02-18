
import { GoogleGenAI, Type } from "@google/genai";
import { PRIMARY_MODEL_ID, FALLBACK_MODEL_ID } from "../../lib/ai/config";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return res.status(400).json({ 
      ok: false, 
      reason: "Missing GEMINI_API_KEY" 
    });
  }

  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ ok: false, message: "Dati PDF mancanti (pdfBase64)." });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Array modelli da provare in sequenza (dal config)
  const MODELS_TO_TRY = [PRIMARY_MODEL_ID, FALLBACK_MODEL_ID];
  
  const prompt = `
    Sei un esperto Assistente alla Regia. Analizza il PDF allegato e genera un breakdown professionale in JSON.
    Includi:
    - scenes: sceneNumber, slugline, intExt, dayNight, setName, locationName, pageCountInEighths, synopsis.
    - elements: name, category.
    - sceneElements: mapping sceneNumber -> nomi elementi.
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
      sceneElements: {
        type: Type.OBJECT
      }
    }
  };

  let lastError = null;

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

      if (!response.text) throw new Error("Risposta vuota dal modello.");

      // Successo
      return res.status(200).json({
        ok: true,
        modelUsed: modelId,
        fallback: modelId !== PRIMARY_MODEL_ID,
        data: JSON.parse(response.text)
      });

    } catch (error: any) {
      console.error(`[Breakdown API] Errore con ${modelId}:`, error.message);
      lastError = error;
      
      // Se l'errore è relativo alla chiave API invalida, fermiamoci subito
      if (error.message && (error.message.includes('API key') || error.status === 400)) {
         return res.status(400).json({ ok: false, message: "Invalid API Key or Bad Request", error: error.message });
      }
      // Altrimenti (es. 404 Model Not Found), continua con il prossimo modello nel loop
    }
  }

  // Se siamo qui, entrambi i modelli hanno fallito
  return res.status(500).json({
    ok: false,
    message: "Tutti i tentativi di analisi sono falliti.",
    error: lastError?.message,
    code: lastError?.status || 500
  });
}
