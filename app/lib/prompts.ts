export function generateSQLPrompt(question: string, schema: string): string {
  return `你是一个精通 MySQL 的数据库专家。请根据以下数据库表结构，为用户的问题生成一条正确的 MySQL SELECT 查询语句。

## 数据库表结构

${schema}

## 用户问题

${question}

## 要求

1. 只返回一条 SQL 查询语句，不要包含任何解释、注释或额外文字
2. 如果需要，使用 MySQL 的标准语法
3. 使用反引号包裹表名和字段名
4. 如果涉及多个表，确保 JOIN 条件正确
5. 如果用户问题无法通过查询回答，返回: -- 无法生成查询
6. 禁止使用 INSERT、DELETE、UPDATE、DROP、TRUNCATE、ALTER 等修改性操作

请直接输出 SQL 代码（可以包含在 \`\`\`sql 代码块中）：`;
}

export function regenerateSQLPrompt(
  question: string,
  schema: string,
  previousSQL: string,
  error: string
): string {
  return `你是一个精通 MySQL 的数据库专家。之前生成的 SQL 查询执行报错了，请修正后重新生成。

## 数据库表结构

${schema}

## 用户问题

${question}

## 之前生成的 SQL（执行报错）

\`\`\`sql
${previousSQL}
\`\`\`

## 报错信息

${error}

## 要求

1. 分析报错原因，修正 SQL 后重新生成
2. 只返回一条修正后的 SQL 查询语句
3. 不要包含任何解释、注释或额外文字
4. 禁止使用 INSERT、DELETE、UPDATE、DROP、TRUNCATE、ALTER 等修改性操作

请直接输出修正后的 SQL 代码（可以包含在 \`\`\`sql 代码块中）：`;
}

export function generateChartPrompt(
  question: string,
  schema: string,
  queryResult: string
): string {
  return `你是一个数据可视化专家。请根据用户的问题、数据库结构和查询结果，生成一个 ECharts 图表配置对象（option）。

## 用户问题

${question}

## 数据库表结构

${schema}

## 查询结果（JSON格式）

${queryResult}

## 要求

1. 返回一个完整的、合法的 ECharts option 对象（JSON格式）
2. 根据数据特点选择合适的图表类型（柱状图、折线图、饼图、散点图等）
3. 包含标题（title）、图例（legend）、坐标轴（如适用）、提示框（tooltip）
4. 颜色方案使用暖色调（橙色、红色、黄色、绿色系列），禁止使用蓝色、紫色及其渐变色
5. 确保所有文本使用中文
6. 如果数据量很大，考虑使用 dataZoom
7. 返回格式必须是可直接 JSON.parse 的对象

请直接输出 ECharts option JSON 对象（包含在 \`\`\`json 代码块中）：`;
}

export function generateAnalysisPrompt(
  question: string,
  schema: string,
  queryResult: string
): string {
  return `你是一个数据分析专家。请根据用户的问题、数据库结构和查询结果，给出深入的数据分析结论。

## 用户问题

${question}

## 数据库表结构

${schema}

## 查询结果（JSON格式）

${queryResult}

## 要求

1. 使用中文回答
2. 分析数据中的关键趋势、异常值、关联关系
3. 给出具体的数据支撑，引用具体数字
4. 提供可行的业务建议或洞察
5. 结构清晰，分点论述
6. 如果数据有局限性，也指出来

请直接输出分析结论：`;
}

export function generateIntentCheckPrompt(question: string): string {
  return `请判断以下用户输入是否是有效的数据查询/统计指令。

## 用户输入

${question}

## 判断标准

有效的数据查询/统计指令应满足以下至少一条：
1. 明确要求查询某些数据（如"查询前10条记录"）
2. 要求统计/分析数据（如"统计各品类销售额"）
3. 要求数据对比/排名/趋势（如"按月查看订单趋势"）
4. 包含数据查询相关的关键词（查询、统计、分析、查看、列出、多少、占比、趋势等）

以下情况视为无效指令：
1. 纯问候语（你好、在吗、谢谢等）
2. 与数据查询无关的闲聊
3. 指令过于模糊或无法执行

## 输出格式

请严格按以下格式输出：

valid: true 或 false
reason: 如果无效，说明原因和正确的输入示例

例如：
valid: true
reason:

或：
valid: false
reason: 这是一个问候语。请输入具体的数据查询问题，例如"查询用户表中前10条记录"`;
}
