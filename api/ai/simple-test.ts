
import { getGeminiClient } from "../../lib/ai/client";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // 1. Setup Header JSON immediato per evitare risposte HTML di default
  res.setHeader('Content-Type', 'application/json');

  try {
    // 2. Controllo Metodo
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: "Method Not Allowed. Use GET." });
    }

    // 3. Inizializzazione Client (lancia errore se manca la chiave)
    const ai = getGeminiClient();
    const modelId = "gemini-2.0-flash";

    console.log(`[SimpleTest] Testing model ${modelId}...`);

    // 4. Chiamata Minimale
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "Di' solo la parola OK.",
    });

    const textResponse = response.text || "";
    console.log(`[SimpleTest] Success. Response: ${textResponse}`);

    // 5. Risposta Successo
    return res.status(200).json({
      ok: true,
      modelId: modelId,
      text: textResponse.trim()
    });

  } catch (error: any) {
    console.error("[SimpleTest Error]", error);

    // 6. Gestione Errore Globale: Ritorna SEMPRE JSON
    const errorMessage = error.message || String(error);
    const statusCode = errorMessage.includes("Missing GEMINI_API_KEY") ? 400 : 500;

    return res.status(statusCode).json({
      ok: false,
      modelId: "gemini-2.0-flash",
      error: errorMessage
    });
  }
}
