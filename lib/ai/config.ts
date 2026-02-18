
// Configurazione Modelli AI
// Richiesto esplicitamente: gemini-2.0-flash
export const PRIMARY_MODEL_ID = "gemini-2.0-flash";

// Fallback di stabilità
export const FALLBACK_MODEL_ID = "gemini-1.5-flash";

export const getModelConfig = () => ({
  primary: PRIMARY_MODEL_ID,
  fallback: FALLBACK_MODEL_ID
});
