
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Metodo non consentito. Usa POST.' });
    }

    const { pdfBase64 } = req.body;
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        message: "Configurazione Server Errata", 
        error: "Chiave API Gemini non trovata. Verifica le impostazioni delle variabili d'ambiente su Vercel." 
      });
    }

    if (!pdfBase64) {
      return res.status(400).json({ message: "Dati PDF mancanti." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const MODELS_TO_TRY = ['gemini-3-pro-preview', 'gemini-3-flash-preview'];
    
    const systemInstruction = `You are an assistant director (AD) and script breakdown specialist.
Analyze the attached screenplay PDF and produce a structured breakdown for scheduling.
Return ONLY valid JSON.`;

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
          type: Type.OBJECT,
          additionalProperties: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      },
      required: ["scenes", "elements", "sceneElements"]
    };

    let lastError: any = null;

    for (const modelId of MODELS_TO_TRY) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [
            {
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
                { text: "Esegui lo spoglio completo di questo PDF." }
              ]
            }
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: responseSchema as any,
          }
        });

        if (response.text) {
          return res.status(200).json({
            modelUsed: modelId,
            data: JSON.parse(response.text)
          });
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Model ${modelId} failed:`, error.message);
        continue;
      }
    }

    return res.status(500).json({
      message: "L'analisi del copione è fallita con tutti i modelli.",
      error: lastError?.message || "Errore sconosciuto",
      code: lastError?.status
    });

  } catch (error: any) {
    console.error("Critical breakdown error:", error);
    return res.status(500).json({
      message: "Errore interno del server durante l'analisi.",
      error: error.message
    });
  }
}
