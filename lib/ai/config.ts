
// Updated to use the recommended model for Basic Text Tasks
export const PRIMARY_MODEL_ID = "gemini-3-flash-preview";

// Updated to use the recommended model for Complex Text Tasks as fallback
export const FALLBACK_MODEL_ID = "gemini-3-pro-preview";

export const getModelConfig = () => ({
  primary: PRIMARY_MODEL_ID,
  fallback: FALLBACK_MODEL_ID
});
