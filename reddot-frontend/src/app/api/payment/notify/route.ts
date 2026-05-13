import { NextResponse } from 'next/server';

const BACKEND_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/**
 * Forwards RDP S2S webhook notifications to the Express backend.
 * RDP must be configured to POST to this URL.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const body = await request.text();

    const res = await fetch(`${BACKEND_URL}/webhook/rdp`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[RDP NOTIFY PROXY] Error:', error.message);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
