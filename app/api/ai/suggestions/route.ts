
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "API Key mancante" }, { status: 401 });
    }

    const { context } = await req.json();
    if (!context) {
      return NextResponse.json({ ok: false, error: "Contesto mancante" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-3-flash-preview';

    const systemInstruction = `Sei un assistente di produzione cinematografica esperto e creativo.
Analizza il contesto fornito (lista scene, sinossi o dettagli di una scena) e suggerisci elementi mancanti che sarebbero logici e arricchirebbero la produzione.

1. **Location**: Suggerisci location specifiche o dettagli ambientali che potrebbero non essere esplicitati ma sono impliciti (es. se la scena è in "CUCINA", suggerisci "Frigorifero vintage", "Tavolo disordinato").
2. **Props (Oggetti di scena)**: Suggerisci oggetti che i personaggi potrebbero maneggiare o che caratterizzano l'ambiente (es. "Tazza di caffè fumante", "Giornale aperto", "Chiavi della macchina").

Sii specifico, evita banalità. Pensa a cosa renderebbe la scena più viva e realistica.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        locations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Suggerimenti per location mancanti o implicite"
        },
        props: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Suggerimenti per oggetti di scena mancanti o impliciti"
        },
        reasoning: {
          type: Type.STRING,
          description: "Breve spiegazione del perché di questi suggerimenti (max 1 frase)"
        }
      },
      required: ["locations", "props"]
    };

    const result = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: `Ecco il contesto delle scene:\n${context}\n\nGenera suggerimenti creativi e specifici per Location (dettagli ambientali) e Props (oggetti di scena) che potrebbero mancare o arricchire la scena.` }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const rawJson = result.text || "{}";
    const data = JSON.parse(rawJson);

    return NextResponse.json({ ok: true, suggestions: data });

  } catch (error: any) {
    console.error("[API SUGGESTIONS ERROR]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
