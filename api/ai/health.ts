
import { GoogleGenAI } from "@google/genai";
import { PRIMARY_MODEL_ID, FALLBACK_MODEL_ID } from "../../lib/ai/config";

export default async function handler(req: any, res: any) {
  // 1. Lettura sicura della chiave
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return res.status(400).json({ 
      ok: false, 
      reason: "Missing GEMINI_API_KEY" 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    let modelUsed = PRIMARY_MODEL_ID;
    let fallbackUsed = false;
    let text = "";

    try {
      // Tentativo 1: Modello Primario
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL_ID,
        contents: 'ping. rispondi solo con "pong"',
      });
      text = response.text || "";
    } catch (primaryError: any) {
      console.warn(`[Health API] Primary model ${PRIMARY_MODEL_ID} failed: ${primaryError.message}. Switching to fallback.`);
      
      // Tentativo 2: Modello Fallback
      modelUsed = FALLBACK_MODEL_ID;
      fallbackUsed = true;
      const response = await ai.models.generateContent({
        model: FALLBACK_MODEL_ID,
        contents: 'ping. rispondi solo con "pong"',
      });
      text = response.text || "";
    }

    return res.status(200).json({
      ok: true,
      model: modelUsed,
      fallbackUsed,
      text: text.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("[Health API] Fatal Error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Unknown error connecting to Gemini",
      code: error.status || 500
    });
  }
}
