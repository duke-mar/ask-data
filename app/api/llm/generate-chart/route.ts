import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/app/lib/llm';

/**
 * 从 LLM 返回内容中提取 JSON 字符串
 * 支持多种格式：```json 代码块、``` 代码块、纯 JSON 文本
 */
function extractJSON(content: string): string {
  // 1. 优先匹配 ```json ... ``` 代码块
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  // 2. 匹配 ``` ... ``` 代码块（无语言标识）
  const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // 3. 尝试从文本中提取最外层 JSON 对象（从第一个 { 到最后一个 }）
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }

  // 4. 兜底：直接返回去空白后的内容
  return content.trim();
}

/**
 * 清理 LLM 返回 JSON 中常见的语法错误
 */
function sanitizeJSON(jsonStr: string): string {
  return (
    jsonStr
      // 移除单行注释 //...
      .replace(/\/\/.*$/gm, '')
      // 移除多行注释 /* ... */
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // 移除对象 trailing comma: {a:1,} -> {a:1}
      .replace(/,\s*}/g, '}')
      // 移除数组 trailing comma: [1,2,] -> [1,2]
      .replace(/,\s*]/g, ']')
      // 单引号转双引号: 'key' -> "key", 'value' -> "value"
      .replace(/'([^']*)'/g, '"$1"')
      // 移除 undefined（JSON 不支持）
      .replace(/\bundefined\b/g, 'null')
      // 清理多余空白
      .trim()
  );
}

/**
 * 尝试修复未加引号的 key（如 { name: "xxx" } -> { "name": "xxx" }）
 * 注意：此函数在 sanitizeJSON 之后执行，因为单引号已经处理了
 */
function fixUnquotedKeys(jsonStr: string): string {
  // 匹配 JavaScript 对象中未加引号的 key：\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:
  // 但要避免匹配已经在字符串内部的
  let inString = false;
  let escape = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    const prev = jsonStr[i - 1];

    if (escape) {
      result += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    // 不在字符串内，且当前位置可能是一个未加引号的 key
    if (!inString && /[a-zA-Z_$]/.test(ch)) {
      // 向前看：是否处于 "...": 的模式中
      // 简单处理：匹配 key: 或 key : 的模式
      const match = jsonStr.slice(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
      if (match) {
        const key = match[1];
        // 检查前面是不是 { 或 , 或 [，说明这是 key
        const before = jsonStr.slice(0, i).trimEnd();
        const lastChar = before.slice(-1);
        if (lastChar === '{' || lastChar === ',' || lastChar === '[') {
          result += `"${key}"`;
          i += key.length - 1;
          continue;
        }
      }
    }

    result += ch;
  }

  return result;
}

/**
 * 综合尝试解析 JSON，返回解析结果和状态
 */
function tryParseJSON(jsonStr: string): { success: boolean; option?: Record<string, unknown>; error?: string } {
  const attempts: { label: string; str: string }[] = [
    { label: '原始提取', str: jsonStr },
    { label: '清理后', str: sanitizeJSON(jsonStr) },
    { label: '修复未引用key', str: fixUnquotedKeys(sanitizeJSON(jsonStr)) },
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt.str);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { success: true, option: parsed };
      }
    } catch {
      // continue to next attempt
    }
  }

  return { success: false, error: '所有自动修复尝试均失败' };
}

/**
 * 用 LLM 二次修复损坏的 JSON
 */
async function llmFixJSON(
  config: { apiUrl: string; apiKey: string; model: string },
  brokenJson: string,
  parseError: string
): Promise<Record<string, unknown> | null> {
  const fixPrompt = `你是一个 JSON 修复专家。以下是一段损坏的 JSON 文本，解析时报错："${parseError}"。

请修复这段 JSON，使其成为合法的、可被 JSON.parse() 解析的标准 JSON。

## 修复规则
1. 移除所有 trailing comma（对象或数组末尾多余的逗号）
2. 将所有单引号 ' 替换为双引号 "
3. 给所有未加引号的 key 加上双引号
4. 将 undefined 替换为 null
5. 移除所有注释
6. 保持数据的完整性和结构不变
7. 输出必须是纯 JSON，不要添加任何解释文字

## 损坏的 JSON

\`\`\`json
${brokenJson}
\`\`\`

请直接输出修复后的 JSON（包含在 \`\`\`json 代码块中）：`;

  try {
    const content = await chatCompletion(config, [{ role: 'user', content: fixPrompt }]);
    const jsonStr = extractJSON(content);
    const cleanJson = sanitizeJSON(jsonStr);
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // LLM 修复也失败了
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { apiUrl, apiKey, model, messages } = await req.json();
    const config = { apiUrl, apiKey, model };

    const content = await chatCompletion(config, messages as ChatMessage[]);
    const jsonStr = extractJSON(content);

    // 第一轮：自动修复尝试
    const autoResult = tryParseJSON(jsonStr);
    if (autoResult.success && autoResult.option) {
      return NextResponse.json({ success: true, option: autoResult.option });
    }

    // 第二轮：LLM 二次修复
    const llmResult = await llmFixJSON(config, jsonStr, autoResult.error || 'JSON parse error');
    if (llmResult) {
      return NextResponse.json({ success: true, option: llmResult, _fixed: true });
    }

    // 全部失败
    return NextResponse.json(
      {
        success: false,
        raw: content,
        extracted: jsonStr,
        sanitized: sanitizeJSON(jsonStr),
        error: '无法解析图表配置，自动修复和 LLM 修复均失败',
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
