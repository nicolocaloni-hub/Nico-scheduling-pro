
import { GoogleGenAI } from "@google/genai";

export const getGeminiClient = () => {
  // Supporta sia GEMINI_API_KEY (specifico) che API_KEY (generico Vercel)
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or API_KEY environment variable");
  }

  // Restituisce l'istanza client configurata
  return new GoogleGenAI({ apiKey });
};
