
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'nodejs';

// In-memory store per i job (nota: in serverless potrebbe resettarsi tra le istanze, 
// ma per polling rapido su singola sessione solitamente funziona)
// Use globalThis instead of global for cross-environment compatibility and to fix TS error
if (!(globalThis as any).analysisJobs) {
  (globalThis as any).analysisJobs = new Map();
}
const jobs = (globalThis as any).analysisJobs;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Usa POST' });

  const { pdfBase64 } = req.body;
  // FIX: Strictly use process.env.NEXT_PUBLIC_GEMINI_API_KEY with fallbacks.
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) return res.status(500).json({ message: "NEXT_PUBLIC_GEMINI_API_KEY mancante" });
  if (!pdfBase64) return res.status(400).json({ message: "PDF mancante" });

  const jobId = crypto.randomUUID();
  
  // Inizializza il Job
  // Using 'any' to allow adding dynamic properties later (modelId, result, etc.) without TS errors
  const jobState: any = {
    id: jobId,
    status: 'queued',
    step: 'File ricevuto, avvio analisi...',
    // Estimate bytes from base64 string
    inputBytes: Math.floor((pdfBase64.length * 3) / 4),
    timestamp: Date.now()
  };
  jobs.set(jobId, jobState);

  // Esecuzione "asincrona"
  (async () => {
    try {
      // FIX: Use named parameter for GoogleGenAI initialization and strictly process.env.NEXT_PUBLIC_GEMINI_API_KEY with fallbacks.
      const ai = new GoogleGenAI({ apiKey });
      const modelId = 'gemini-3-flash-preview';
      
      jobState.status = 'running';
      jobState.modelId = modelId;
      jobState.step = 'Gemini sta analizzando il documento...';

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

      const response = await ai.models.generateContent({
        model: modelId,
        // FIX: Use object format for contents with parts.
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            { text: "Analizza la sceneggiatura. Estrai scene ed elementi seguendo rigorosamente le istruzioni." }
          ]
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any
        }
      });

      // FIX: Access text property directly.
      let rawText = response.text || "";
      
      // Pulizia difensiva del JSON (rimozione backticks markdown se presenti)
      rawText = rawText.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json/, "").replace(/```$/, "");
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "");
      }

      jobState.rawPreview = rawText.substring(0, 1500);
      jobState.status = 'parsing';
      jobState.step = 'Sto elaborando i risultati estratti...';

      const parsed = JSON.parse(rawText);
      jobState.result = parsed;
      jobState.resultSummary = {
        sceneCount: parsed.scenes?.length || 0,
        locationCount: new Set(parsed.scenes?.map((s: any) => s.locationName)).size,
        castCount: parsed.elements?.filter((e: any) => e.category === 'Cast').length || 0,
        propsCount: parsed.elements?.filter((e: any) => e.category === 'Props').length || 0,
      };

      jobState.status = 'done';
      jobState.step = 'Analisi completata con successo.';

    } catch (err: any) {
      console.error("Analysis Job Error:", err);
      jobState.status = 'error';
      jobState.step = 'Errore durante l\'analisi AI.';
      jobState.error = err.message;
    }
  })();

  return res.status(200).json({ ok: true, jobId });
}
