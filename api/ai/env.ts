
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  try {
    const vercelEnv = process.env.VERCEL_ENV || 'development';
    // Utilizziamo esclusivamente process.env.API_KEY come da linee guida
    const keyPresent = Boolean(process.env.API_KEY);
    
    return res.status(200).json({
      ok: true,
      vercelEnv,
      keyPresent,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Garantiamo che la risposta sia sempre JSON
    return res.status(500).json({ 
      ok: false, 
      error: error.message || "Errore interno durante il controllo dell'ambiente" 
    });
  }
}
