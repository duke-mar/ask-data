import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { question, sql, chartOption, analysis } = await req.json();

    const md = `# 数据分析报告

## 问题

${question}

## SQL 查询

\`\`\`sql
${sql || ''}
\`\`\`

## 数据可视化

图表配置（ECharts Option）：

\`\`\`json
${chartOption ? JSON.stringify(chartOption, null, 2) : '无'}
\`\`\`

## 分析结论

${analysis || ''}

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    return NextResponse.json({ success: true, markdown: md });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
