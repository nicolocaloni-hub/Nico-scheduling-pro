
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
  // Use process.env.API_KEY as the exclusive source for the API key
  const apiKey = process.env.API_KEY;

  if (!apiKey) return res.status(500).json({ message: "API_KEY mancante" });
  if (!pdfBase64) return res.status(400).json({ message: "PDF mancante" });

  const jobId = crypto.randomUUID();
  
  // Inizializza il Job
  // Using 'any' to allow adding dynamic properties later (modelId, result, etc.) without TS errors
  const jobState: any = {
    id: jobId,
    status: 'queued',
    step: 'File ricevuto, avvio analisi...',
    // Estimate bytes from base64 string to avoid Buffer dependency in TS environments
    inputBytes: Math.floor((pdfBase64.length * 3) / 4),
    timestamp: Date.now()
  };
  jobs.set(jobId, jobState);

  // Esecuzione "asincrona" (non attendiamo la fine per rispondere al client)
  (async () => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelId = 'gemini-3-flash-preview';
      
      jobState.status = 'running';
      jobState.modelId = modelId;
      jobState.step = 'Gemini sta analizzando il documento...';

      const systemInstruction = `You are a professional assistant director. Perform a full script breakdown.
      Return JSON only. Focus on scenes, sets, day/night, and production elements.`;

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
                intExt: { type: Type.STRING },
                dayNight: { type: Type.STRING },
                setName: { type: Type.STRING },
                locationName: { type: Type.STRING },
                pageCountInEighths: { type: Type.STRING },
                synopsis: { type: Type.STRING },
              },
              required: ["sceneNumber", "slugline", "intExt", "dayNight", "pageCountInEighths"]
            }
          },
          elements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          },
          sceneElements: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      };

      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
              { text: "Analizza questo copione e crea uno spoglio completo delle scene." }
            ]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any
        }
      });

      const rawText = response.text || "";
      jobState.rawPreview = rawText.substring(0, 1500);
      jobState.status = 'parsing';
      jobState.step = 'Sto elaborando i risultati estratti...';

      const parsed = JSON.parse(rawText);
      jobState.result = parsed;
      jobState.resultSummary = {
        sceneCount: parsed.scenes?.length || 0,
        locationCount: new Set(parsed.scenes?.map((s: any) => s.locationName)).size,
        castCount: parsed.elements?.filter((e: any) => e.category === 'Cast').length || 0,
        propsCount: parsed.elements?.filter((e: any) => (e.category || '').includes('Prop')).length || 0,
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
