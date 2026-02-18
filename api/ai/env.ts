
export default async function handler(req: any, res: any) {
  try {
    const vercelEnv = process.env.VERCEL_ENV || 'development';
    // Exclusively check process.env.API_KEY as per guidelines
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
      error: error.message || "Errore durante il controllo env" 
    });
  }
}
