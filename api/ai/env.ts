
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const vercelEnv = process.env.VERCEL_ENV || 'development';
    
    // Verifichiamo la presenza di diverse varianti per aiutare il debug dell'utente
    // ma ricordiamo che l'app userà process.env.API_KEY come standard.
    const hasStandardKey = Boolean(process.env.API_KEY);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEY);
    
    return res.status(200).json({
      ok: true,
      vercelEnv,
      keyPresent: hasStandardKey, // Questa è la chiave principale usata dall'SDK
      details: {
        API_KEY: hasStandardKey,
        GEMINI_API_KEY: hasGeminiKey,
        GOOGLE_API_KEY: hasGoogleKey
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Errore interno durante il controllo dell'ambiente" 
    });
  }
}
