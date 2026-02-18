
import { GoogleGenAI } from "@google/genai";
import { PRIMARY_MODEL_ID } from "../../lib/ai/config";

/**
 * Health Check Route per l'AI.
 * Risponde SEMPRE con JSON.
 */
export default async function handler(req: any, res: any) {
  // Log server-side per debug Vercel (visibile nella dashboard Function Logs)
  console.log(`[Health API] Request received: ${req.method} ${req.url}`);

  // 1. Setup Header JSON immediato
  res.setHeader('Content-Type', 'application/json');

  try {
    // 2. Controllo Metodo
    if (req.method !== 'GET') {
       return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // 3. Verifica Chiave API
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error("[Health API] Missing GEMINI_API_KEY");
      return res.status(400).json({ 
        ok: false, 
        error: "Missing GEMINI_API_KEY environment variable" 
      });
    }

    // 4. Inizializzazione SDK
    // Usiamo il modello "gemini-2.0-flash" hardcoded per il ping test come richiesto
    const modelId = "gemini-2.0-flash";
    const ai = new GoogleGenAI({ apiKey });
    
    // 5. Chiamata di test (Ping)
    console.log(`[Health API] Pinging model ${modelId}...`);
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "ping",
    });

    const textResponse = response.text || "";
    console.log(`[Health API] Success. Response len: ${textResponse.length}`);

    // 6. Risposta Successo
    return res.status(200).json({
      ok: true,
      modelId: modelId,
      text: textResponse.trim()
    });

  } catch (error: any) {
    console.error("[Health API Error]", error);

    // 7. Gestione Errore Globale
    // Restituisce JSON anche in caso di crash server-side
    return res.status(500).json({
      ok: false,
      modelId: "gemini-2.0-flash",
      error: error.message || String(error) || "Unknown Server Error"
    });
  }
}
