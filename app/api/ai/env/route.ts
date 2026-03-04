
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV,
    keyPresent: Boolean(process.env.API_KEY),
    service: "Smart Set Scheduling Pro API",
    timestamp: new Date().toISOString()
  });
}
