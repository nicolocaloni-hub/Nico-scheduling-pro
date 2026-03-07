
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

    const systemInstruction = `Sei un esperto assistente alla regia (AD) con anni di esperienza nello spoglio di sceneggiature.
Il tuo compito è analizzare la sceneggiatura PDF fornita e produrre un breakdown dettagliato e professionale.

1. **Analisi Scene**: Per ogni scena, estrai con precisione:
   - Numero scena
   - Slugline completa
   - INT/EST (Interno/Esterno)
   - Giorno/Notte (Day/Night)
   - Nome del Set (es. "CUCINA DI MARIO")
   - Location Reale (se deducibile, altrimenti generica)
   - Conteggio pagine in ottavi (es. "2 4/8")
   - Sinossi breve ma descrittiva dell'azione principale.

2. **Estrazione Elementi (CRITICO)**: Devi identificare TUTTI gli elementi produttivi menzionati nel testo, categorizzandoli accuratamente. Non limitarti al Cast. Cerca attivamente:
   - **Cast**: Personaggi parlanti (nomi in maiuscolo al centro).
   - **Comparse (Extras)**: Gruppi di persone, folla, passanti.
   - **Oggetti di Scena (Props)**: Oggetti manipolati dai personaggi (es. "pistola", "telefono", "bicchiere", "chiavi").
   - **Costumi**: Descrizioni specifiche di abbigliamento (es. "giacca di pelle", "divisa da poliziotto", "vestito rosso").
   - **Arredamento (Set Dressing)**: Mobili, quadri, lampade e oggetti di fondo che definiscono l'ambiente.
   - **Veicoli**: Auto, moto, bici, treni menzionati.
   - **Trucco/Parrucco**: Ferite, cicatrici, acconciature specifiche.
   - **Effetti Speciali (SFX)**: Esplosioni, pioggia, fumo, spari.
   - **Effetti Visivi (VFX)**: Elementi da aggiungere in post-produzione (es. "mostro alieno", "schermo olografico").
   - **Animali**: Cani, gatti, cavalli, etc.
   - **Suono**: Rumori specifici indicati nel testo (es. "suono di sirena", "battito cardiaco").

Sii meticoloso. Se un oggetto è importante per l'azione, DEVE essere listato.`;

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
          { text: "Analizza questo copione. Esegui uno spoglio completo. Per ogni scena, elenca tutti gli elementi necessari alla produzione (Props, Costumi, Veicoli, etc.) oltre al Cast. Sii molto dettagliato nell'identificazione degli oggetti di scena." }
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
