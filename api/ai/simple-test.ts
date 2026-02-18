
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Using recommended model name for basic text tasks
  const modelId = "gemini-3-flash-preview";
  try {
    // Exclusively use process.env.API_KEY as per guidelines
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        modelId, 
        error: "Chiave API mancante (API_KEY)" 
      });
    }

    // Always initialize with { apiKey: process.env.API_KEY }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "ping",
    });

    return res.status(200).json({
      ok: true,
      modelId,
      text: response.text || "Nessuna risposta dal modello"
    });
  } catch (error: any) {
    console.error("Simple Test Error:", error);
    return res.status(500).json({
      ok: false,
      modelId,
      error: error.message || "Errore durante il test di Gemini"
    });
  }
}
