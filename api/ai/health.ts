
import { GoogleGenAI } from "@google/genai";
import { PRIMARY_MODEL_ID } from "../../lib/ai/config";

export default async function handler(req: any, res: any) {
  // Garantisce che la risposta sia sempre interpretata come JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Lettura sicura della chiave
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        error: "Missing GEMINI_API_KEY" 
      });
    }

    // 2. Configurazione Client
    const ai = new GoogleGenAI({ apiKey });
    const modelId = PRIMARY_MODEL_ID; // Usiamo gemini-2.0-flash come da config

    // 3. Esecuzione Test (Ping)
    // Non usiamo il config fallback qui per mantenere il test semplice e diretto sul modello primario
    const response = await ai.models.generateContent({
      model: modelId,
      contents: 'ping',
    });

    const text = response.text || "";

    // 4. Risposta Successo
    return res.status(200).json({
      ok: true,
      modelId: modelId,
      text: text.trim(),
    });

  } catch (error: any) {
    console.error("[Health API] Error:", error);

    // 5. Risposta Errore (gestisce anche errori API Gemini)
    // Importante: status 500 ma contenuto JSON valido
    return res.status(500).json({
      ok: false,
      modelId: PRIMARY_MODEL_ID,
      error: error.message || "Internal Server Error"
    });
  }
}
