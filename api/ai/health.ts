
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // 1. Lettura sicura della chiave (Priorità a GEMINI_API_KEY)
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return res.status(400).json({ 
      ok: false, 
      reason: "Missing GEMINI_API_KEY" 
    });
  }

  try {
    // 2. Inizializzazione Client
    const ai = new GoogleGenAI({ apiKey });
    
    // Modello rapido per il ping test
    const modelName = 'gemini-2.5-flash-latest';

    // 3. Chiamata di test ("ping")
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'ping. rispondi solo con "pong"',
    });

    const text = response.text || "";

    // 4. Risposta successo
    return res.status(200).json({
      ok: true,
      model: modelName,
      text: text.trim(), // Dovrebbe essere "pong"
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("[Health API] Error:", error);

    // 5. Risposta errore server
    return res.status(500).json({
      ok: false,
      error: error.message || "Unknown error connecting to Gemini",
      code: error.status || 500
    });
  }
}
