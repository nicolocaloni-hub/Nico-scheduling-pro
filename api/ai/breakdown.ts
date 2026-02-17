
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { pdfBase64 } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: "API_KEY mancante sul server." });
  }

  if (!pdfBase64) {
    return res.status(400).json({ message: "Dati PDF mancanti (pdfBase64)." });
  }

  const ai = new GoogleGenAI({ apiKey });
  const MODELS_TO_TRY = ['gemini-3-pro-preview', 'gemini-3-flash-preview'];
  
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
      console.log(`Tentativo breakdown con: ${modelId}, Bytes: ${pdfBase64.length}`);
      
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

      return res.status(200).json({
        modelUsed: modelId,
        data: JSON.parse(response.text)
      });

    } catch (error: any) {
      console.error(`Errore con ${modelId}:`, error.message);
      lastError = error;
      // Continue to next model if 404 or 503
      if (!error.message.includes('404') && !error.message.includes('503') && !error.message.includes('not found')) {
        break; 
      }
    }
  }

  return res.status(500).json({
    message: "Tutti i tentativi di analisi sono falliti.",
    error: lastError?.message,
    code: lastError?.status || 500
  });
}
