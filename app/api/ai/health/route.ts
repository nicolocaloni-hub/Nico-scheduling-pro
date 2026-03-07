
import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        ok: false,
        error: "Missing API_KEY configuration. Please set the API_KEY environment variable."
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
    });

    return NextResponse.json({
      ok: true,
      status: "ok",
      message: "Comunicazione con Google Gemini stabilita correttamente.",
      modelResponse: response.text?.trim()
    });
  } catch (error: any) {
    console.error("[HEALTH ERROR]", error);
    return NextResponse.json({
      ok: false,
      error: error.message || "Errore di connessione con l'API Gemini."
    }, { status: 500 });
  }
}
