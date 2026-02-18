
import { GoogleGenAI } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  const modelId = "gemini-3-flash-preview";
  try {
    // La chiave API deve essere ottenuta esclusivamente da process.env.API_KEY
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        modelId, 
        error: "Missing API_KEY in server environment" 
      });
    }

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
      error: error.message || "Errore durante la chiamata a Gemini"
    });
  }
}
