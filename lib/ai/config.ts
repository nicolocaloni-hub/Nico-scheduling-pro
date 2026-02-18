
// Updated to use the model specifically requested by the user
export const PRIMARY_MODEL_ID = "gemini-2.0-flash";

// Fallback model
export const FALLBACK_MODEL_ID = "gemini-1.5-flash";

export const getModelConfig = () => ({
  primary: PRIMARY_MODEL_ID,
  fallback: FALLBACK_MODEL_ID
});
