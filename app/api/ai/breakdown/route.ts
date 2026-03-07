
import { NextResponse } from 'next/server';
import { parseScript } from '../../../../lib/script-parser/index';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log("[API] Breakdown request received (App Router POST) - Rule Based");
  
  try {
    // API Key check is still good practice for auth, even if not used for Gemini
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
    
    console.log(`[API] Avvio analisi con Rule-Based Parser...`);

    const result = await parseScript(pdfBase64);

    if (!result.ok) {
      throw new Error(result.error || "Errore durante il parsing del copione.");
    }

    console.log("[API] Analisi completata con successo.");

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[API ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Errore interno durante l'elaborazione del copione." 
    }, { status: 500 });
  }
}

