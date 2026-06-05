import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/app/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const { apiUrl, apiKey, model, messages } = await req.json();
    const content = await chatCompletion({ apiUrl, apiKey, model }, messages as ChatMessage[]);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    try {
      const option = JSON.parse(jsonStr);
      return NextResponse.json({ success: true, option });
    } catch {
      return NextResponse.json({ success: false, raw: content, error: '无法解析图表配置' }, { status: 500 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
