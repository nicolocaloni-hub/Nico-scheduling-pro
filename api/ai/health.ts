
import { GoogleGenAI } from "@google/genai";

// Configurazione Vercel
export const config = {
  maxDuration: 60, // Imposta timeout a 60 secondi (limite Pro, o max Hobby)
};

export default async function handler(req: any, res: any) {
  // 1. Log immediato per debug
  console.log(`[Health API] Request: ${req.method}`);

  // 2. Assicura Content-Type JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method !== 'GET') {
       return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error("[Health API] Missing API KEY");
      return res.status(400).json({ ok: false, error: "Missing GEMINI_API_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.0-flash";

    console.log(`[Health API] Pinging ${modelId}...`);
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "ping",
    });

    const text = response.text || "";
    
    console.log("[Health API] Success");
    return res.status(200).json({
      ok: true,
      modelId: modelId,
      text: text.trim()
    });

  } catch (error: any) {
    console.error("[Health API Error]", error);
    // 3. Catch-all che ritorna JSON invece di far crashare il server
    return res.status(500).json({
      ok: false,
      modelId: "gemini-2.0-flash",
      error: error.message || String(error)
    });
  }
}
