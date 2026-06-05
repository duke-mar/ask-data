import mysql from 'mysql2/promise';
import { DbConfig, TableSchema, ColumnInfo } from '@/app/types';

export async function createConnection(config: Omit<DbConfig, 'id' | 'name' | 'description' | 'createdAt'>) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 10000,
  });
}

export async function testConnection(
  config: Omit<DbConfig, 'id' | 'name' | 'description' | 'createdAt'>
): Promise<{ success: boolean; message: string }> {
  let conn: mysql.Connection | null = null;
  try {
    conn = await createConnection(config);
    await conn.execute('SELECT 1');
    return { success: true, message: '连接成功' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  } finally {
    if (conn) await conn.end();
  }
}

export async function getTables(config: Omit<DbConfig, 'id' | 'name' | 'description' | 'createdAt'>): Promise<string[]> {
  const conn = await createConnection(config);
  try {
    const [rows] = await conn.execute(
      `SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );
    return (rows as { name: string }[]).map((r) => r.name);
  } finally {
    await conn.end();
  }
}

export async function getTableSchema(
  config: Omit<DbConfig, 'id' | 'name' | 'description' | 'createdAt'>,
  tableName: string
): Promise<TableSchema> {
  const conn = await createConnection(config);
  try {
    const [rows] = await conn.execute(
      `SELECT
        COLUMN_NAME as name,
        DATA_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as \`key\`,
        COLUMN_DEFAULT as \`default\`,
        EXTRA as extra,
        COLUMN_COMMENT as comment
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [config.database, tableName]
    );

    const columns = (rows as ColumnInfo[]).map((r) => ({
      name: r.name,
      type: r.type,
      nullable: r.nullable,
      key: r.key,
      default: r.default,
      extra: r.extra,
      comment: r.comment,
    }));

    return { name: tableName, columns };
  } finally {
    await conn.end();
  }
}

export async function executeQuery(
  config: Omit<DbConfig, 'id' | 'name' | 'description' | 'createdAt'>,
  sql: string
): Promise<{ columns: string[]; data: Record<string, unknown>[] }> {
  const conn = await createConnection(config);
  try {
    const [rows, fields] = await conn.execute(sql);
    const fieldNames = Array.isArray(fields)
      ? fields.map((f) => ('name' in f ? f.name : String(f)))
      : [];
    return {
      columns: fieldNames,
      data: rows as Record<string, unknown>[],
    };
  } finally {
    await conn.end();
  }
}
