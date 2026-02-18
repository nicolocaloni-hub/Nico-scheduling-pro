
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const vercelEnv = process.env.VERCEL_ENV || 'development';
    // FIX: Strictly use process.env.API_KEY.
    const keyPresent = Boolean(process.env.API_KEY);
    
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
