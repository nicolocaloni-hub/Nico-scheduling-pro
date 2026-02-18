
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  try {
    // Correctly using process.env.API_KEY as per guidelines
    const apiKey = process.env.API_KEY;
    
    const diagnostics = {
      hasApiKey: !!apiKey,
      nodeVersion: (process as any).version,
      timestamp: new Date().toISOString(),
      platform: (process as any).platform,
    };

    if (!apiKey) {
      return res.status(500).json({ 
        status: "error", 
        message: "API_KEY non configurata nelle variabili d'ambiente.",
        diagnostics
      });
    }

    // Always initialize with { apiKey: process.env.API_KEY }
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
      diagnostics: { hasApiKey: !!process.env.API_KEY }
    });
  }
}
