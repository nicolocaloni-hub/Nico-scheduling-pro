
import { GoogleGenAI } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.API_KEY;
    
    const diagnostics = {
      hasApiKey: !!apiKey,
      nodeVersion: (process as any).version,
      timestamp: new Date().toISOString(),
      platform: (process as any).platform,
    };

    if (!apiKey) {
      return res.status(400).json({ 
        ok: false,
        status: "error", 
        message: "API_KEY non configurata nel server (process.env.API_KEY).",
        diagnostics
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
    });

    return res.status(200).json({
      ok: true,
      status: "ok",
      message: "Comunicazione con Google Gemini stabilita.",
      diagnostics: {
        ...diagnostics,
        modelResponse: response.text?.trim()
      }
    });
  } catch (error: any) {
    console.error("[HEALTH ERROR]", error);
    return res.status(500).json({
      ok: false,
      status: "error",
      message: error.message || "Impossibile contattare l'API Gemini.",
      diagnostics: { hasApiKey: !!process.env.API_KEY }
    });
  }
}
