import { TableSchema, ColumnInfo } from '@/app/types';

export function formatSchema(tables: TableSchema[], notes?: Record<string, string>): string {
  return tables
    .map((t) => {
      const note = notes?.[t.name] ? `\n【用户备注】${notes[t.name]}` : '';
      const cols = t.columns
        .map((c) => {
          const comment = c.comment ? ` /* ${c.comment} */` : '';
          const key = c.key ? ` [${c.key}]` : '';
          return `  \`${c.name}\` ${c.type}${key}${comment}`;
        })
        .join('\n');
      return `Table: \`${t.name}\`${note}\n${cols}`;
    })
    .join('\n\n');
}

export function formatQueryResult(columns: string[], data: Record<string, unknown>[]): string {
  return JSON.stringify({ columns, rows: data }, null, 2);
}
