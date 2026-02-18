
import { GoogleGenAI } from "@google/genai";
import { PRIMARY_MODEL_ID } from "../../lib/ai/config";

/**
 * Health Check Route per l'AI.
 * Risponde SEMPRE con JSON.
 */
export default async function handler(req: any, res: any) {
  // 1. Setup Header JSON immediato per dire al client cosa aspettarsi
  res.setHeader('Content-Type', 'application/json');

  try {
    // 2. Controllo Metodo (Opzionale ma buona pratica)
    if (req.method !== 'GET') {
       // Anche qui usiamo .json()
       return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // 3. Verifica Chiave API
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        error: "Missing GEMINI_API_KEY environment variable" 
      });
    }

    // 4. Inizializzazione SDK
    const ai = new GoogleGenAI({ apiKey });
    
    // 5. Chiamata di test (Ping)
    // Usiamo contents stringa semplice come da SDK @google/genai
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL_ID,
      contents: "ping",
    });

    // 6. Estrazione testo sicura
    // La proprietà .text è un getter, se nullo usiamo stringa vuota
    const textResponse = response.text || "";

    // 7. Risposta Successo
    return res.status(200).json({
      ok: true,
      modelId: PRIMARY_MODEL_ID,
      text: textResponse.trim()
    });

  } catch (error: any) {
    console.error("[Health API Error]", error);

    // 8. Gestione Errore Globale
    // Qualsiasi eccezione viene catturata qui e trasformata in JSON 500
    // Evitiamo che Vercel ritorni la pagina HTML di default "FUNCTION_INVOCATION_FAILED"
    return res.status(500).json({
      ok: false,
      modelId: PRIMARY_MODEL_ID,
      error: error.message || String(error) || "Unknown Server Error"
    });
  }
}
