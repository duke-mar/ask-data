import { NextRequest, NextResponse } from 'next/server';
import { getTables } from '@/app/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const config = {
      host: searchParams.get('host') || '',
      port: Number(searchParams.get('port')) || 3306,
      user: searchParams.get('user') || '',
      password: searchParams.get('password') || '',
      database: searchParams.get('database') || '',
    };
    const tables = await getTables(config);
    return NextResponse.json({ tables });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
