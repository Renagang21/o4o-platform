import type { EntityManager } from 'typeorm';

/**
 * 계정 완전삭제 때 "기록은 남기고 이 회원의 식별값만 되돌릴 수 없게 바꾸는" 표와 "사본을 지우는" 표 (2026-11-10 사용자 확정).
 *
 * 근거: O4O-PRIVACY-DATA-RETENTION-POLICY-V1 §6 · §13 — 처리·접속 기록은 생성 후 1년 보존하되 개인 식별값은 남기지 않는다.
 * 문의는 §3 보존기간, 운영자 초대는 §2.1(이메일 · 토큰 파기, 최소 이력 유지). 공급자 사업체 · 거래 기록은 지우지 않는다(사용자 결정).
 *
 * - minimize: 이 회원의 ID · 이메일 · 참조 ID · 제공자 ID 가 들어 있는 행만 골라, 그 값을 `erased:<key>` 로 바꾼다.
 *   uuid 열이 이 회원을 가리키면 NULL 로 둔다(NOT NULL 열은 두고 사후 검토가 잡는다). 행 자체와 다른 값은 그대로다.
 * - delete: 이 회원 값이 들어 있는 사본 행을 지운다(보존 근거 없음).
 *
 * 삭제 전 검토(resume · finish 사전)는 이 표들을 건너뛴다 — 여기서 반드시 정리되기 때문이다.
 * 정리 후 검토(finish 사후)는 이 표들을 다시 전부 확인하므로, 치환이 덜 됐으면 전체가 되돌려지고 검토 대기로 남는다.
 */
export const RETAINED_RECORD_TABLES: Readonly<Record<string, 'minimize' | 'delete'>> = {
  account_activities: 'minimize',
  action_logs: 'minimize',
  canonical_demo_repair_snapshots: 'delete',
  neture_contact_messages: 'minimize',
  neture_suppliers: 'minimize',
  // 초대 이메일 · 토큰은 정책 §2.1 상 파기 대상이고, 「수락됨」은 DB 제약상 수락자를 비울 수 없다.
  // 지정 · 해제의 최소 이력은 action_logs 에 남고 그쪽은 치환으로 보존된다.
  operator_invitations: 'delete',
};

/**
 * 사업 소유 연결 열 — 치환하지 않는다. 이 회원이 이 열로 연결된 행은 소유 · 처분 문제이므로
 * 삭제 전 검토가 계속 잡는다(본인 소유 공급자는 기존 소유자 판정 · detach 경로가 처리한다).
 */
export const RETAINED_RECORD_LINKS: Readonly<Record<string, readonly string[]>> = {
  neture_suppliers: ['user_id'],
};

export function isRetainedRecordTable(schema: string, table: string): boolean {
  return schema === 'public' && Object.prototype.hasOwnProperty.call(RETAINED_RECORD_TABLES, table);
}

/** 삭제 전 검토에서 보존 기록 표를 볼 때 남길 조건: 사업 소유 연결 열이 이 회원을 가리키는 행만. 없으면 null(건너뜀). */
export function retainedLinkPredicate(table: string, columns: readonly string[]): string | null {
  const links = (RETAINED_RECORD_LINKS[table] ?? []).filter(column => columns.includes(column));
  return links.length ? links.map(column => `r.${quote(column)}::text=$1`).join(' OR ') : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_PART = "[:alnum:]_.!#$%&'*+/=?^`{|}~-";
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';

/** 삭제 검토(reviewManifest)와 같은 경계로 찾고, 앞뒤 경계 문자는 그대로 둔 채 값만 바꾼다. */
export function replacementRules(tokens: readonly string[], key: string): Array<{ pattern: string; replacement: string }> {
  const erased = `erased:${key}`;
  // 이메일 · 긴 값부터 바꾼다 — ID 가 이메일 안에 들어 있으면 ID 만 먼저 바뀌어 도메인이 남는다.
  const ordered = tokens.filter(token => token.length >= 2)
    .sort((a, b) => Number(b.includes('@')) - Number(a.includes('@')) || b.length - a.length);
  return ordered.map(token => {
    const escaped = escape(token);
    if (token.includes('@'))
      return { pattern: `(^|[^${LOCAL_PART}])${escaped}(?![[:alnum:]-]|\\.[[:alnum:]-])`, replacement: `\\1${erased}` };
    if (UUID.test(token)) return { pattern: escaped, replacement: erased };
    return { pattern: `(^|[^[:alnum:]_.-])${escaped}($|[^[:alnum:]_.-])`, replacement: `\\1${erased}\\2` };
  });
}

export async function minimizeRetainedRecords(
  m: Pick<EntityManager, 'query'>,
  userId: string,
  key: string,
  tokens: readonly string[],
): Promise<{ table: string; mode: 'minimize' | 'delete'; rows: number }[]> {
  const rules = replacementRules(tokens, key);
  if (!rules.length) return [];
  const patterns = rules.map(rule => rule.pattern);
  const uuidTokens = tokens.filter(token => UUID.test(token));
  const result: { table: string; mode: 'minimize' | 'delete'; rows: number }[] = [];
  for (const [table, mode] of Object.entries(RETAINED_RECORD_TABLES)) {
    const columns: Array<{ name: string; type: string; nullable: string }> = await m.query(
      `SELECT column_name AS name,data_type AS type,is_nullable AS nullable FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table]);
    if (!columns.length) continue;
    const matches = `to_jsonb(r)::text ~* ANY($1::text[])`;
    if (mode === 'delete') {
      const deleted = await m.query(`DELETE FROM public.${quote(table)} r WHERE ${matches} RETURNING 1`, [patterns]);
      result.push({ table, mode, rows: rowCount(deleted) });
      continue;
    }
    // $1 patterns, then the uuid tokens (only when a column uses them) and one parameter pair per rule.
    const params: unknown[] = [patterns];
    let uuidParam = 0;
    const uuids = () => (uuidParam ||= params.push(uuidTokens));
    const replace = (expression: string) => rules.reduce((value, rule) => {
      params.push(rule.pattern, rule.replacement);
      return `regexp_replace(${value},$${params.length - 1},$${params.length},'gi')`;
    }, expression);
    const sets: string[] = [];
    const actorKeyed = table === 'action_logs' && columns.some(column => column.name === 'meta');
    for (const column of columns) {
      if (column.name === 'id' || (actorKeyed && column.name === 'meta')) continue;
      const name = quote(column.name);
      if (RETAINED_RECORD_LINKS[table]?.includes(column.name)) continue;
      if (column.type === 'uuid' && column.nullable === 'YES')
        sets.push(`${name}=CASE WHEN ${name}::text=ANY($${uuids()}::text[]) THEN NULL ELSE ${name} END`);
      else if (['text', 'character varying'].includes(column.type))
        sets.push(`${name}=${replace(name)}`);
      else if (column.type === 'jsonb')
        sets.push(`${name}=(${replace(`${name}::text`)})::jsonb`);
      else if (column.type === 'json')
        sets.push(`${name}=(${replace(`${name}::text`)})::json`);
    }
    // 처리한 사람이 이 회원이면 같은 작업 키로 묶어 둔다(누가 했는지는 알 수 없게, 같은 사람의 처리였다는 것만 남는다).
    if (actorKeyed) {
      const meta = `(${replace('meta::text')})::jsonb`;
      const actor = uuids();
      params.push(key);
      sets.push(`meta=CASE WHEN user_id::text=ANY($${actor}::text[]) THEN COALESCE(${meta},'{}'::jsonb)||jsonb_build_object('actorKey',$${params.length}::text) ELSE ${meta} END`);
    }
    if (!sets.length) continue;
    const updated = await m.query(`UPDATE public.${quote(table)} r SET ${sets.join(',')} WHERE ${matches} RETURNING 1`, params);
    result.push({ table, mode, rows: rowCount(updated) });
  }
  return result;
}

/** TypeORM postgres 는 DELETE/UPDATE ... RETURNING 을 [rows, count] 로 돌려준다. */
function rowCount(raw: unknown): number {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0]) && typeof raw[1] === 'number') return raw[1];
  return Array.isArray(raw) ? raw.length : 0;
}
