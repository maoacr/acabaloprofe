import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import { env } from '@/infrastructure/env';

/**
 * POST /api/cron/lock-predictions
 *
 * Cron-callable endpoint that locks all predictions for matches whose
 * lock_at has passed but are still in 'scheduled' status.
 *
 * Auth: Bearer ${CRON_SECRET} header. Vercel Cron automatically sends
 * `x-vercel-cron` in production, which we accept as an alternative.
 *
 * Returns: { lockedCount: number, timestamp: ISO }
 */
export async function POST(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');

  const isAuthorized =
    (env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`) ||
    (process.env.NODE_ENV === 'production' && vercelCron !== null);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc('lock_pending_predictions');

  if (error) {
    console.error('[lock-predictions] RPC error:', error);
    return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
  }

  const lockedCount = typeof data === 'number' ? data : 0;
  console.log(
    `[lock-predictions] ${JSON.stringify({
      timestamp: new Date().toISOString(),
      lockedCount,
    })}`,
  );

  return NextResponse.json({
    lockedCount,
    timestamp: new Date().toISOString(),
  });
}
