
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("[API] Breakdown request received (App Router POST)");
  
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        ok: false, 
        error: "Chiave API (API_KEY) non configurata sul server." 
      }, { status: 401 });
    }

    const body = await req.json();
    const { pdfBase64 } = body;

    if (!pdfBase64 || pdfBase64.length < 10) {
      return NextResponse.json({ 
        ok: false, 
        error: "Contenuto PDF non valido o mancante." 
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-flash-preview';
    
    console.log(`[API] Avvio analisi con Gemini (${modelId})...`);

    const systemInstruction = `Sei un esperto assistente alla regia (AD). 
Analizza la sceneggiatura PDF allegata e produci uno spoglio completo delle scene in formato JSON.
Estrai i dettagli tecnici: numero scena, slugline, int/est, giorno/notte, set, location, pagine in ottavi e sinossi.
Identifica gli elementi di produzione (Cast, Comparse, Arredamento, etc) e associali alle scene.`;

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

    const result = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: "Analizza questo copione ed esegui lo spoglio completo delle scene in formato JSON." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    // .text è una proprietà getter, non un metodo
    const rawJson = result.text || "{}";
    const data = JSON.parse(rawJson);

    const summary = {
      sceneCount: data.scenes?.length || 0,
      locationCount: new Set(data.scenes?.map((s: any) => s.locationName)).size,
      castCount: data.elements?.filter((e: any) => e.category === 'Cast').length || 0,
      propsCount: data.elements?.filter((e: any) => (e.category || '').toLowerCase().includes('prop')).length || 0,
    };

    console.log("[API] Analisi completata con successo.");

    return NextResponse.json({
      ok: true,
      data,
      summary,
      modelUsed: modelId
    });

  } catch (error: any) {
    console.error("[API ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Errore interno durante l'elaborazione del copione." 
    }, { status: 500 });
  }
}
