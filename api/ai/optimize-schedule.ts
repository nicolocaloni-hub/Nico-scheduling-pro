
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo non consentito' });
  }

  const { scenes } = req.body;
  // FIX: Strictly use process.env.API_KEY.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: "Chiave API mancante sul server. Verifica API_KEY." });
  }

  if (!scenes || !Array.isArray(scenes)) {
    return res.status(400).json({ message: "Dati scene mancanti o non validi." });
  }

  // FIX: Use named parameter for GoogleGenAI initialization.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `Sei un esperto Primo Assistente alla Regia (1st AD).
Il tuo compito è ottimizzare l'ordine delle scene per un piano di lavorazione (stripboard).
Logica di ottimizzazione:
1. Raggruppa per LOCATION (LocationName) per minimizzare gli spostamenti.
2. All'interno della stessa location, raggruppa per SET (SetName).
3. All'interno dello stesso set, raggruppa per DAY/NIGHT (DayNight) per ottimizzare i setup luci.
4. Cerca di mantenere una progressione narrativa dove possibile se i criteri sopra sono uguali.

Restituisci ESCLUSIVAMENTE un oggetto JSON con la chiave "orderedSceneIds" contenente l'array degli ID ordinati.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Ottimizza queste scene: ${JSON.stringify(scenes.map(s => ({ 
        id: s.id, 
        sceneNumber: s.sceneNumber, 
        locationName: s.locationName, 
        setName: s.setName, 
        dayNight: s.dayNight,
        intExt: s.intExt
      })))}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orderedSceneIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["orderedSceneIds"]
        }
      }
    });

    // FIX: Access text property directly.
    const result = JSON.parse(response.text || "{}");
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Optimization error:", error);
    return res.status(500).json({ message: "Errore durante l'ottimizzazione AI", error: error.message });
  }
}
