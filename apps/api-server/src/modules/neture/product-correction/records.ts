import type { DataSource, EntityManager } from 'typeorm';
import { CorrectionError } from './contracts.js';
export type Db = Pick<DataSource | EntityManager, 'query'>;
/** Only this namespace of settings is writable. No product, description, identifier or candidate mutations. */
export async function read<T>(db: Db, key: string, type: string, lock = false): Promise<T> {
  const rows = await db.query(
    `SELECT value FROM settings WHERE key=$1 AND type=$2${lock ? ' FOR UPDATE' : ''}`,
    [key, type],
  );
  if (!rows[0]) throw new CorrectionError('NOT_FOUND', 404);
  return rows[0].value as T;
}
export async function insert(db: Db, key: string, type: string, value: unknown) {
  await db.query('INSERT INTO settings(key,value,type,description) VALUES($1,$2::jsonb,$3,$4)', [
    key,
    JSON.stringify(value),
    type,
    '상품 보정 기준·작업 기록 (원본 적용 없음)',
  ]);
}
export async function replace(db: Db, key: string, type: string, value: unknown) {
  await db.query('UPDATE settings SET value=$1::jsonb,"updatedAt"=NOW() WHERE key=$2 AND type=$3', [
    JSON.stringify(value),
    key,
    type,
  ]);
}
