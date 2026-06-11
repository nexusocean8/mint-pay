import { NextRequest, NextResponse } from 'next/server';
import { getChainApi, resolveChain } from '@/lib/api';

export async function GET(req: NextRequest) {
  const chain = resolveChain(req.nextUrl.searchParams.get('chain'));
  const api = getChainApi(chain);
  try {
    const [live, ready, synced] = await Promise.all([
      api.get('/health/live'),
      api.get('/health/ready'),
      api.get('/health/synced'),
    ]);
    return NextResponse.json({
      live: live.data,
      ready: ready.data,
      synced: synced.data,
    });
  } catch {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}
