
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
  const { jobId } = req.query;
  // Use globalThis instead of global to fix TS error and ensure cross-platform compatibility
  const jobs = (globalThis as any).analysisJobs;

  if (!jobId || !jobs || !jobs.has(jobId)) {
    return res.status(404).json({ message: "Job non trovato" });
  }

  const job = jobs.get(jobId);
  return res.status(200).json({ ok: true, job });
}
