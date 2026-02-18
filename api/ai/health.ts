
import { GoogleGenAI } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    const diagnostics = {
      hasApiKey: !!apiKey,
      nodeVersion: (process as any).version,
      timestamp: new Date().toISOString(),
      platform: (process as any).platform,
    };

    if (!apiKey) {
      return res.status(500).json({ 
        status: "error", 
        message: "API_KEY non configurata. Assicurati che su Vercel la variabile si chiami API_KEY o GEMINI_API_KEY e sia attiva per l'ambiente corrente.",
        diagnostics
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const testResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
    });

    return res.status(200).json({
      status: "ok",
      message: "Comunicazione con Google Gemini stabilita.",
      diagnostics: {
        ...diagnostics,
        modelResponse: testResponse.text?.trim()
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Impossibile contattare l'API Gemini.",
      diagnostics: { hasApiKey: !!(process.env.API_KEY || process.env.GEMINI_API_KEY) }
    });
  }
}
