
import { GoogleGenAI, Type } from "@google/genai";
import { BreakdownResult, Scene } from "../types";
import * as mammoth from 'mammoth';

export const parseEighthsToFloat = (eighthsStr: string): number => {
  if (!eighthsStr) return 0;
  const match = eighthsStr.match(/(\d+)?\s*(\d+)\/8/);
  if (!match) {
      const val = parseFloat(eighthsStr);
      return isNaN(val) ? 0 : val;
  }
  const whole = match[1] ? parseInt(match[1]) : 0;
  const eighths = parseInt(match[2]);
  return whole + (eighths / 8);
};

const getApiKey = () => {
  // Check for custom key in localStorage first
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('custom_gemini_api_key');
    if (customKey && customKey.trim().length > 20) {
      return customKey.trim();
    }
  }
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) throw new Error("API Key (NEXT_PUBLIC_GEMINI_API_KEY) mancante. Verifica la configurazione.");
  return key;
};

export const analyzeScriptPdf = async (
  pdfBase64: string, 
  onDebugInfo?: (info: any) => void
): Promise<{ data: BreakdownResult, summary: any, modelUsed: string }> => {
  
  const modelId = 'gemini-3.1-pro-preview'; // Using pro for better script analysis
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const systemInstruction = `Sei un esperto assistente alla regia (AD) con anni di esperienza nello spoglio di sceneggiature.
Il tuo compito è analizzare la sceneggiatura PDF fornita e produrre un breakdown dettagliato e professionale.

1. **Analisi Scene**: Per ogni scena, estrai con precisione:
   - Numero scena
   - Slugline completa
   - INT/EST (Interno/Esterno)
   - Giorno/Notte (Day/Night)
   - Nome del Set (es. "CUCINA DI MARIO")
   - Location Reale (se deducibile, altrimenti generica)
   - Conteggio pagine in ottavi (es. "2 4/8")
   - Sinossi breve ma descrittiva dell'azione principale.

2. **Estrazione Elementi (CRITICO)**: Devi identificare TUTTI gli elementi produttivi menzionati nel testo, categorizzandoli accuratamente. Non limitarti al Cast. Cerca attivamente:
   - **Cast**: Personaggi parlanti (nomi in maiuscolo al centro).
   - **Comparse (Extras)**: Gruppi di persone, folla, passanti.
   - **Oggetti di Scena (Props)**: Oggetti manipolati dai personaggi o essenziali per la scena. NON ignorare oggetti comuni se sono menzionati specificamente.
     Esempi da cercare: "scatoloni", "sigarette", "mazzo di carte", "bicchiere rotto", "libro", "telefono", "chiavi", "pistola".
     IMPORTANTE: Se la descrizione dice "la camera è vuota, rimangono solo gli scatoloni", ALLORA "scatoloni" È UN PROP e DEVE essere listato.
   - **Costumi**: Descrizioni specifiche di abbigliamento (es. "giacca di pelle", "divisa da poliziotto", "vestito rosso").
   - **Arredamento (Set Dressing)**: Mobili, quadri, lampade e oggetti di fondo che definiscono l'ambiente.
   - **Veicoli**: Auto, moto, bici, treni menzionati.
   - **Trucco/Parrucco**: Ferite, cicatrici, acconciature specifiche.
   - **Effetti Speciali (SFX)**: Esplosioni, pioggia, fumo, spari.
   - **Effetti Visivi (VFX)**: Elementi da aggiungere in post-produzione (es. "mostro alieno", "schermo olografico").
   - **Animali**: Cani, gatti, cavalli, etc.
   - **Suono**: Rumori specifici indicati nel testo (es. "suono di sirena", "battito cardiaco").

3. **Mappatura Elementi-Scene (sceneElements)**: È FONDAMENTALE che tu colleghi ogni elemento estratto alla scena in cui compare. Nel campo \`sceneElements\`, crea una mappa dove la chiave è il \`sceneNumber\` e il valore è un array con i nomi esatti degli elementi (incluso il Cast) presenti in quella scena. Questo permetterà di avere i personaggi e gli oggetti già assegnati alle scene nel piano di lavorazione.

Sii meticoloso. Se un oggetto è importante per l'azione o menzionato nella descrizione, DEVE essere listato come elemento. Usa la categoria "Props" per gli oggetti di scena.`;

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
          required: ["sceneNumber", "slugline", "intExt", "dayNight", "pageCountInEighths", "synopsis"]
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
    },
    required: ["scenes", "elements", "sceneElements"]
  };

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: "Analizza questo copione. Esegui uno spoglio completo. Per ogni scena, elenca tutti gli elementi necessari alla produzione (Props, Costumi, Veicoli, etc.) oltre al Cast. Sii OSSESSIVO nell'identificazione degli oggetti di scena (Props). Se un oggetto è menzionato nella descrizione (es. 'scatoloni', 'sigaretta', 'telefono'), DEVI estrarlo come Prop." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });

    const rawJson = result.text || "{}";
    const data = JSON.parse(rawJson);

    const summary = {
      sceneCount: data.scenes?.length || 0,
      locationCount: new Set(data.scenes?.map((s: any) => s.locationName)).size,
      castCount: data.elements?.filter((e: any) => e.category === 'Cast').length || 0,
      propsCount: data.elements?.filter((e: any) => {
        const cat = (e.category || '').toLowerCase();
        return cat.includes('prop') || cat.includes('oggetti') || cat.includes('attrezzeria');
      }).length || 0,
    };

    if (onDebugInfo) {
      onDebugInfo({
        status: 200,
        modelUsed: modelId,
        message: "Analisi completata con successo"
      });
    }

    return { data, summary, modelUsed: modelId };

  } catch (error: any) {
    if (onDebugInfo) {
      onDebugInfo({
        status: 500,
        error: error.message
      });
    }
    throw error;
  }
};

export const extractCrewFromDocument = async (
  file: File,
  onDebugInfo?: (info: any) => void
): Promise<{ department: string, role: string, name: string }[]> => {
  const modelId = 'gemini-2.5-flash-lite';
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const systemInstruction = `Sei un esperto assistente di produzione. Il tuo compito è estrarre i membri della troupe da un documento.
Il documento contiene tabelle o elenchi con i membri della troupe.
Cerca le informazioni relative a "REPARTI TROUPE" (o Reparto/Qualifica), "RUOLO" e "NOME".
Ignora altre informazioni come numeri di telefono o intolleranze.

Restituisci un array JSON di oggetti con la seguente struttura:
[
  {
    "department": "Nome del reparto (es. PRODUZIONE, REGIA, FOTOGRAFIA)",
    "role": "Ruolo della persona (es. Organizzatore di produzione, Regista, DOP)",
    "name": "Nome e cognome della persona"
  }
]
Se un reparto raggruppa più persone, assegna quel reparto a tutte le persone di quel gruppo.`;

  try {
    if (onDebugInfo) {
      onDebugInfo({ status: 'analyzing', message: 'Estrazione membri troupe in corso...' });
    }

    let parts: any[] = [];

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      // Use mammoth to extract text from docx
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      parts = [
        { text: "Estrai i membri della troupe da questo testo estratto da un documento Word:\n\n" + result.value }
      ];
    } else {
      // Use base64 for PDF
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      parts = [
        {
          inlineData: {
            data: base64,
            mimeType: file.type || 'application/pdf'
          }
        },
        { text: "Estrai i membri della troupe da questo documento." }
      ];
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              department: { type: Type.STRING, description: "Reparto (es. PRODUZIONE, REGIA)" },
              role: { type: Type.STRING, description: "Ruolo (es. Regista, DOP)" },
              name: { type: Type.STRING, description: "Nome e cognome" }
            },
            required: ["department", "role", "name"]
          }
        },
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota da Gemini");

    const data = JSON.parse(text);
    return data;
  } catch (error: any) {
    if (onDebugInfo) {
      onDebugInfo({ status: 'error', error: error.message });
    }
    throw error;
  }
};

// Placeholder for optimization (can be implemented similarly if needed)
export const optimizeSchedule = async (scenes: Scene[]): Promise<string[]> => {
  // Simple mock implementation or implement real logic
  return scenes.map(s => s.id);
};

