
import { GoogleGenAI, Type } from "@google/genai";
import { BreakdownResult } from "../types";

/**
 * Converte il numero di ottavi in un valore decimale per il conteggio pagine.
 * es. "1 4/8" -> 1.5
 */
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

export const analyzeScriptPdf = async (pdfBase64: string): Promise<BreakdownResult> => {
  // Always initialize right before use as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (!process.env.API_KEY) {
    // Logica di simulazione per lo sviluppo
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                scenes: [
                    {
                        sceneNumber: "1",
                        intExt: "INT",
                        dayNight: "GIORNO",
                        slugline: "INT. CAFFÈ - GIORNO",
                        locationName: "BAR",
                        setName: "BANCONE PRINCIPALE",
                        pageCountInEighths: "1 2/8",
                        synopsis: "Due spie si incontrano per scambiare una valigetta criptata."
                    },
                    {
                        sceneNumber: "2",
                        intExt: "EST",
                        dayNight: "NOTTE",
                        slugline: "EST. VICOLO - NOTTE",
                        locationName: "STRADE",
                        setName: "VICOLO CIECO",
                        pageCountInEighths: "0 4/8",
                        synopsis: "Lo scambio viene interrotto dalle sirene della polizia."
                    }
                ],
                elements: [
                    { name: "AGENTE ORION", category: "Cast" },
                    { name: "IL CORRIERE", category: "Cast" },
                    { name: "Valigetta Criptata", category: "Props" },
                    { name: "Sirene Polizia", category: "SFX" }
                ],
                sceneElements: {
                    "1": ["AGENTE ORION", "IL CORRIERE", "Valigetta Criptata"],
                    "2": ["AGENTE ORION", "Sirene Polizia"]
                }
            });
        }, 3000);
    });
  }

  // Prompt updated to ensure AI returns strings that match the Italian DayNight and IntExt enum values
  const prompt = `
    You are an expert Hollywood First Assistant Director.
    Analyze the attached film script PDF carefully and perform a professional breakdown.
    Return a valid JSON object.

    JSON Requirements:
    - scenes: array of objects with sceneNumber, slugline, intExt (INT, EST, or INT/EST), dayNight (GIORNO, NOTTE, ALBA, or TRAMONTO), setName, locationName, pageCountInEighths (format: "X Y/8"), and synopsis.
    - elements: array of all unique production items (Cast, Props, Vehicles, Wardrobe, SFX, VFX, Stunt).
    - sceneElements: an object where keys are scene numbers and values are arrays of element names appearing in that scene.

    Guidelines:
    - Estimate page counts in eighths.
    - Be meticulous about naming characters and essential props.
  `;

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
          required: ["sceneNumber", "slugline", "intExt", "dayNight", "pageCountInEighths", "synopsis", "setName", "locationName"]
        }
      },
      elements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["name", "category"]
        }
      },
      sceneElements: {
        type: Type.OBJECT,
        additionalProperties: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    },
    required: ["scenes", "elements", "sceneElements"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: [
        {
            parts: [
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: pdfBase64
                    }
                },
                { text: prompt }
            ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
      }
    });

    // Directly access .text property from response as per extracted text output guidelines
    return JSON.parse(response.text || "{}") as BreakdownResult;
  } catch (error) {
    console.error("Errore Spoglio PDF AI:", error);
    throw new Error("Gemini non è riuscito a elaborare il PDF. Assicurati che il file sia una sceneggiatura leggibile.");
  }
};
