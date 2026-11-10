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

/**
 * 작성자 본인 행이면 내용 전체를 지우고 행만 남기는 열 (2026-11-10 통합 담당 결정 · #1022 Codex P1).
 * 이름 · 전화번호 · 제목 · 본문에는 회원 ID · 이메일 말고도 개인정보가 들어 있어, 식별값 치환만으로는 사후 검토가 놓친다.
 * 작성자는 `owner` 열(문의 이메일)이 이 회원 이메일과 같은 행으로 판정한다. 다른 사람의 문의는 기존처럼 식별값만 치환한다.
 * NOT NULL 열은 `erased:<key>`, NULL 허용 열은 NULL 로 둔다.
 */
const RETAINED_RECORD_WIPED_COLUMNS: Readonly<Record<string, { owner: string; columns: readonly string[] }>> = {
  neture_contact_messages: { owner: 'email', columns: ['name', 'phone', 'subject', 'message', 'adminNotes'] },
};

export function isRetainedRecordTable(schema: string, table: string): boolean {
  return schema === 'public' && Object.prototype.hasOwnProperty.call(RETAINED_RECORD_TABLES, table);
}

/**
 * 보존 기록 표 안에서도 치환으로 넘기지 않고 계속 검토하는 행.
 * 중앙 운영 메뉴 권한 감사 기록은 정해진 형식만 전용 경로(central-menu-audit-evidence)가 정리하고,
 * 형식이 다른 기록은 검토로 남긴다 — 일반 치환이 그 판정을 건너뛰지 않게 한다.
 */
const RETAINED_RECORD_REVIEWED_ROWS: Readonly<Record<string, { columns: readonly string[]; sql: string }>> = {
  action_logs: { columns: ['action_key'], sql: "r.action_key IN ('operator.central_menu_grants_changed','admin.service_operator_assigned')" },
};

/**
 * 삭제 전 검토에서 보존 기록 표를 볼 때 남길 조건: 사업 소유 연결 열이 이 회원을 가리키는 행과,
 * 전용 경로가 판정하는 행만. 둘 다 없으면 null(건너뜀).
 */
export function retainedLinkPredicate(table: string, columns: readonly string[]): string | null {
  const links = (RETAINED_RECORD_LINKS[table] ?? []).filter(column => columns.includes(column))
    .map(column => `r.${quote(column)}::text=$1`);
  const reviewed = RETAINED_RECORD_REVIEWED_ROWS[table];
  if (reviewed && reviewed.columns.every(column => columns.includes(column))) links.push(`(${reviewed.sql})`);
  return links.length ? links.join(' OR ') : null;
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

/** 표 이름(`schema.table`) — 사본 검사가 찾은 그 밖의 표를 가리킨다. */
export interface CopyTable { schema: string; table: string }

/**
 * 보존 기록 표와, 사본 검사(reviewManifest)가 회원 식별값의 단순 사본을 찾은 그 밖의 표를 정리한다.
 * 그 밖의 표는 모두 `minimize`(식별값만 `erased:<key>` 로 치환, 행은 유지)로 처리한다 — 2026-11-10 통합 담당 결정:
 * 등록되지 않은 표에 사본이 있다는 이유로 삭제가 「검토 필요」에서 멈추지 않게 한다. 치환 뒤에도 남으면 사후 검토가 잡는다.
 */
export async function minimizeRetainedRecords(
  m: Pick<EntityManager, 'query'>,
  userId: string,
  key: string,
  tokens: readonly string[],
  copyTables: readonly CopyTable[] = [],
): Promise<{ table: string; mode: 'minimize' | 'delete'; rows: number }[]> {
  const rules = replacementRules(tokens, key);
  if (!rules.length) return [];
  const patterns = rules.map(rule => rule.pattern);
  const uuidTokens = tokens.filter(token => UUID.test(token));
  const result: { table: string; mode: 'minimize' | 'delete'; rows: number }[] = [];
  const targets: Array<{ schema: string; table: string; mode: 'minimize' | 'delete' }> =
    Object.entries(RETAINED_RECORD_TABLES).map(([table, mode]) => ({ schema: 'public', table, mode }));
  for (const copy of copyTables) {
    if (!targets.some(t => t.schema === copy.schema && t.table === copy.table))
      targets.push({ schema: copy.schema, table: copy.table, mode: 'minimize' });
  }
  for (const { schema, table: name, mode } of targets) {
    // 보존 기록 표 전용 규칙(행위자 키 · 본인 문의 · 소유 연결)은 public 표 이름에만 적용한다.
    const table = schema === 'public' ? name : '';
    const columns: Array<{ name: string; type: string; nullable: string }> = await m.query(
      `SELECT column_name AS name,data_type AS type,is_nullable AS nullable FROM information_schema.columns
       WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`, [schema, name]);
    if (!columns.length) continue;
    const target = `${quote(schema)}.${quote(name)}`;
    const label = schema === 'public' ? name : `${schema}.${name}`;
    const matches = `to_jsonb(r)::text ~* ANY($1::text[])`;
    if (mode === 'delete') {
      const deleted = await m.query(`DELETE FROM ${target} r WHERE ${matches} RETURNING 1`, [patterns]);
      result.push({ table: label, mode, rows: rowCount(deleted) });
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
    // 작성자 본인 행 판정(SET 안의 열 참조는 갱신 전 값이다). 이메일 토큰이 없으면 내용 삭제를 하지 않는다.
    const wipe = RETAINED_RECORD_WIPED_COLUMNS[table];
    const emails = tokens.filter(token => token.includes('@')).map(token => token.toLowerCase());
    let owned: string | null = null;
    // 쓰지 않는 바인딩은 PostgreSQL 이 형식을 정하지 못해 실패하므로, 실제로 지울 열이 있을 때만 넣는다.
    if (wipe && emails.length && columns.some(column => column.name === wipe.owner)
      && columns.some(column => wipe.columns.includes(column.name))) {
      params.push(emails);
      owned = `lower(r.${quote(wipe.owner)}::text)=ANY($${params.length}::text[])`;
    }
    for (const column of columns) {
      if (column.name === 'id' || (actorKeyed && column.name === 'meta')) continue;
      const name = quote(column.name);
      if (RETAINED_RECORD_LINKS[table]?.includes(column.name)) continue;
      if (owned && wipe?.columns.includes(column.name)) {
        const cleared = column.nullable === 'YES' ? 'NULL' : `$${params.push(`erased:${key}`)}::text`;
        const kept = ['text', 'character varying'].includes(column.type) ? replace(name) : name;
        sets.push(`${name}=CASE WHEN ${owned} THEN ${cleared} ELSE ${kept} END`);
        continue;
      }
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
    const updated = await m.query(`UPDATE ${target} r SET ${sets.join(',')} WHERE ${matches} RETURNING 1`, params);
    result.push({ table: label, mode, rows: rowCount(updated) });
  }
  return result;
}

/** TypeORM postgres 는 DELETE/UPDATE ... RETURNING 을 [rows, count] 로 돌려준다. */
function rowCount(raw: unknown): number {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0]) && typeof raw[1] === 'number') return raw[1];
  return Array.isArray(raw) ? raw.length : 0;
}
