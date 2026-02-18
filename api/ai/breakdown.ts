
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  console.log("[API] Breakdown request received");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Metodo non consentito. Usa POST.' });
  }

  try {
    // FIX: The API key must be obtained exclusively from process.env.API_KEY.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("[API] Missing API_KEY");
      return res.status(500).json({ ok: false, error: "Chiave API Gemini non configurata nel server." });
    }

    // FIX: Use req.body directly as it is automatically parsed by Vercel for application/json.
    // This removes the dependency on the Buffer global, fixing the "Cannot find name 'Buffer'" error.
    const { pdfBase64 } = req.body || {};

    if (!pdfBase64 || pdfBase64.length < 10) {
      return res.status(400).json({ ok: false, error: "Contenuto PDF vuoto o non valido." });
    }

    // FIX: Always use a named parameter when initializing GoogleGenAI.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-flash-preview';
    
    console.log(`[API] Calling Gemini (${modelId})...`);

    const systemInstruction = `Sei un esperto assistente alla regia (AD). 
Analizza la sceneggiatura PDF allegata e produci uno spoglio completo delle scene in formato JSON.
Estrai: scene (numero, slugline, int/est, giorno/notte, set, location, pagine in ottavi, sinossi), 
elementi (nome, categoria come Cast, Props, etc), e mappa quali elementi appaiono in quali scene.`;

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
          additionalProperties: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      },
      required: ["scenes", "elements", "sceneElements"]
    };

    // FIX: Use the recommended contents structure for multi-part requests.
    const result = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: "Esegui lo spoglio completo di questo copione." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    console.log("[API] Gemini response received");
    // FIX: Access the text property directly (do not call text()).
    const rawJson = result.text || "{}";
    const data = JSON.parse(rawJson);

    const summary = {
      sceneCount: data.scenes?.length || 0,
      locationCount: new Set(data.scenes?.map((s: any) => s.locationName)).size,
      castCount: data.elements?.filter((e: any) => e.category === 'Cast').length || 0,
      propsCount: data.elements?.filter((e: any) => (e.category || '').toLowerCase().includes('prop')).length || 0,
    };

    console.log("[API] Response parsed and summary generated");

    return res.status(200).json({
      ok: true,
      data,
      summary,
      modelUsed: modelId
    });

  } catch (error: any) {
    console.error("[API] Critical Error:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Errore interno durante l'analisi AI." 
    });
  }
}
