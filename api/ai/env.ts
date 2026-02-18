
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const vercelEnv = process.env.VERCEL_ENV || 'development';
    // Supporta sia API_KEY (standard) che GEMINI_API_KEY (configurata dall'utente)
    const keyPresent = Boolean(process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    
    return res.status(200).json({
      ok: true,
      vercelEnv,
      keyPresent,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Errore interno durante il controllo dell'ambiente" 
    });
  }
}
