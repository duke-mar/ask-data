import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/db';
import { isUnsafeSQL } from '@/app/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, password, database, sql } = await req.json();

    // Backend security check
    const safetyCheck = isUnsafeSQL(sql);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { success: false, error: `安全拦截：${safetyCheck.reason}` },
        { status: 403 }
      );
    }

    const config = { host, port, user, password, database };
    const result = await executeQuery(config, sql);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
