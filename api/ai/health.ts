
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        status: "error", 
        message: "API_KEY non configurata nelle variabili d'ambiente di Vercel." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // We attempt a very lightweight generateContent to verify the key and service
    // because listModels is sometimes restricted or has different permissions
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'echo health-check-ok',
    });

    return res.status(200).json({
      status: "ok",
      message: "Connessione a Gemini stabilita con successo.",
      testResponse: response.text,
      availableModels: [
        'gemini-3-pro-preview',
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite-latest'
      ],
      environment: "production"
    });
  } catch (error: any) {
    console.error("Health Check Error:", error);
    return res.status(500).json({
      status: "error",
      code: error.status || 500,
      message: error.message || "Errore sconosciuto durante il health check."
    });
  }
}
