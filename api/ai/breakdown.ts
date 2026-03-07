
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  console.log("[API] Breakdown request received");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Metodo non consentito. Usa POST.' });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("[API] Missing API_KEY");
      return res.status(400).json({ ok: false, error: "Missing API_KEY configuration on server." });
    }

    const { pdfBase64 } = req.body || {};

    if (!pdfBase64 || pdfBase64.length < 10) {
      return res.status(400).json({ ok: false, error: "Contenuto PDF vuoto o non valido." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-2.5-flash-lite';
    
    console.log(`[API] Calling Gemini (${modelId})...`);

    const systemInstruction = `Sei un esperto assistente alla regia (AD) con anni di esperienza nello spoglio di sceneggiature.
Il tuo compito è analizzare la sceneggiatura PDF fornita e produrre un breakdown dettagliato e professionale in formato JSON rigoroso.

OBIETTIVO:
Identificare nel PDF le informazioni già presenti (scene, cast, props, location) senza inventare o interpretare eccessivamente.

ISTRUZIONI PER L'ESTRAZIONE:

1. **SCENE**:
   - Riconosci le scene dalle slugline/intestazioni (es. "INT. CUCINA - GIORNO").
   - **sceneNumber**: Estrai il numero se presente, altrimenti lascialo vuoto o usa un progressivo se evidente.
   - **slugline**: Riporta l'intestazione completa.
   - **intExt**: Normalizza TASSATIVAMENTE in: "INT", "EXT", "INT/EXT" oppure "" se non specificato.
   - **dayNight**: Normalizza TASSATIVAMENTE in: "DAY", "NIGHT", "DAWN", "DUSK" oppure "" se non specificato.
   - **setName**: L'ambiente specifico (es. "CUCINA", "AUTO DI LUCA").
   - **locationName**: Il luogo più ampio (es. "CASA DI MARIO", "ROMA"). Se non distinto, usa lo stesso del setName.
   - **pageCountInEighths**: Calcola in ottavi di pagina (es. "1 4/8") SOLO se deducibile dalla lunghezza del testo, altrimenti "".
   - **synopsis**: Brevissima descrizione dell'azione (max 1-2 frasi).

2. **ELEMENTI (Elements)**:
   - Estrai SOLO elementi espliciti nel testo.
   - **Cast**: Solo personaggi che parlano o sono chiaramente presenti e attivi in scena.
   - **Props**: Oggetti concreti manipolati o essenziali per la scena (es. "pistola", "telefono"). NON includere elementi di sfondo generici a meno che non interagiscano.
   - **Categorie Ammesse**: "Cast", "Props", "Costume", "MakeupHair", "Vehicles", "Animals", "SFX", "VFX", "Stunts", "Extras", "SetDressing", "Sound", "SpecialEquipment".
   - **Deduplica**: Non creare duplicati per lo stesso elemento (es. "Luca" e "LUCA" sono lo stesso).

3. **ASSOCIAZIONE (SceneElements)**:
   - Crea una mappa dove la chiave è il 'sceneNumber' e il valore è una lista di 'name' degli elementi presenti in quella scena.

FORMATO OUTPUT:
JSON valido con le chiavi: "scenes", "elements", "sceneElements".`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.STRING },
              slugline: { type: Type.STRING },
              intExt: { type: Type.STRING, enum: ["INT", "EXT", "INT/EXT", ""] },
              dayNight: { type: Type.STRING, enum: ["DAY", "NIGHT", "DAWN", "DUSK", ""] },
              setName: { type: Type.STRING },
              locationName: { type: Type.STRING },
              pageCountInEighths: { type: Type.STRING },
              synopsis: { type: Type.STRING },
            },
            required: ["sceneNumber", "slugline", "intExt", "dayNight", "setName", "locationName", "synopsis"]
          }
        },
        elements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ["Cast", "Props", "Costume", "MakeupHair", "Vehicles", "Animals", "SFX", "VFX", "Stunts", "Extras", "SetDressing", "Sound", "SpecialEquipment"] 
              }
            },
            required: ["name", "category"]
          }
        },
        sceneElements: {
          type: Type.OBJECT,
          description: "Mappa: chiave = sceneNumber, valore = array di nomi elementi",
          // Nota: Gemini potrebbe non validare strettamente additionalProperties in tutti i casi, ma aiuta la struttura.
        }
      },
      required: ["scenes", "elements", "sceneElements"]
    };

    const result = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: "Analizza la sceneggiatura. Estrai scene ed elementi seguendo rigorosamente le istruzioni." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    console.log("[API] Gemini response received");
    let rawJson = result.text || "{}";
    
    // Pulizia difensiva del JSON (rimozione backticks markdown se presenti)
    rawJson = rawJson.trim();
    if (rawJson.startsWith("```json")) {
      rawJson = rawJson.replace(/^```json/, "").replace(/```$/, "");
    } else if (rawJson.startsWith("```")) {
      rawJson = rawJson.replace(/^```/, "").replace(/```$/, "");
    }

    let data;
    try {
      data = JSON.parse(rawJson);
    } catch (parseError) {
      console.error("[API] Errore parsing JSON:", parseError);
      console.error("[API] Raw JSON ricevuto:", rawJson.substring(0, 200) + "...");
      throw new Error("Il modello ha prodotto un JSON non valido.");
    }

    const summary = {
      sceneCount: data.scenes?.length || 0,
      locationCount: new Set(data.scenes?.map((s: any) => s.locationName)).size,
      castCount: data.elements?.filter((e: any) => e.category === 'Cast').length || 0,
      propsCount: data.elements?.filter((e: any) => e.category === 'Props').length || 0,
    };

    console.log("[API] Response parsed and summary generated");

    return res.status(200).json({
      ok: true,
      data,
      summary,
      modelUsed: modelId
    });

  } catch (error: any) {
    console.error("[API] Critical Error:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Errore interno durante l'analisi AI." 
    });
  }
}
