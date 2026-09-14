import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1
 * 근거: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1 §6 · §7 ·
 *       CHECK-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1 §2
 *
 * 런타임이 실제로 소비하지만 **생성 migration 이 없던** 5 테이블의 schema 소유권을 deploy migration job 으로 정본화한다.
 *   permissions · role_permissions · linked_accounts · settings · account_activities
 * (roles 는 대상 밖 — 생성 migration 부재는 별도 보고. 은퇴한 user_roles · organization_units · organization_roles 는 만들지 않는다.)
 *
 * canonical schema = 2026-09-14 운영 read-only 실측(pg_catalog) 구조. 은퇴한 Core lifecycle installer 의 snake_case DDL 은
 * 운영을 만든 적이 없고(운영은 camelCase), entity 는 운영의 부분집합으로 동작한다 — entity 와의 drift 는 CHECK §3 에 기록하고
 * 여기서 보정하지 않는다 (ALTER 0).
 *
 * 동작 (테이블별):
 *   테이블 부재                 → canonical DDL 로 생성 후 동일 assertion 으로 자가 검증
 *   테이블 존재 + 구조 일치     → no-op (운영 기대 경로)
 *   테이블 존재 + 구조 불일치   → throw → migration job 실패 → deploy 중지 (자동 ALTER 없음)
 *   데이터                      → INSERT/UPDATE/DELETE 0 · seed 0 · 역할/permission 부여 0
 *
 * 판정 기준:
 *   column(이름·타입·NOT NULL·default) 불일치 · 누락 · 초과 → 실패
 *   PK · UNIQUE · FK(정의·ON DELETE) 누락 · 정의 불일치 · 초과 → 실패
 *   canonical index 누락 · 정의 불일치 → 실패 / 운영에만 있는 추가 index → 허용 + 로그
 *
 * 금지 준수: wildcard 0 · DROP 0 · ALTER 0 · synchronize 0 · lifecycle installer 호출 0 · seed 0 · CREATE EXTENSION 0 (존재만 확인) ·
 *   오류 catch-and-continue 0. FK 의 `ON DELETE CASCADE` 는 운영 정의 그대로의 참조 무결성 규칙이며 DROP CASCADE 가 아니다.
 *
 * down(): no-op (irreversible). 활성 인증·설정·활동 테이블은 되돌리기에서 DROP 하지 않는다.
 */

interface ColumnSpec {
  name: string;
  /** pg format_type() 출력과 동일한 문자열 */
  type: string;
  notNull: boolean;
  /** pg_get_expr(adbin) 출력과 동일한 문자열. null = default 없음 */
  default: string | null;
}

interface ConstraintSpec {
  name: string;
  /** pg_get_constraintdef() 출력과 동일한 문자열 */
  def: string;
}

interface IndexSpec {
  name: string;
  unique: boolean;
  /** pg_indexes.indexdef 의 `USING` 이후 문자열 (예: `btree ("userId")`) */
  using: string;
}

interface TableSpec {
  table: string;
  columns: ColumnSpec[];
  constraints: ConstraintSpec[];
  /** PK · UNIQUE 의 backing index 는 제외 (제약으로 검증) */
  indexes: IndexSpec[];
  /** 생성 전 반드시 존재해야 하는 참조 테이블 (FK 대상) */
  requires: string[];
}

const UUID_DEFAULT = 'uuid_generate_v4()';
const TS = 'timestamp without time zone';
const NOW = 'CURRENT_TIMESTAMP';

const col = (name: string, type: string, notNull: boolean, def: string | null = null): ColumnSpec => ({ name, type, notNull, default: def });

/** 순서 = 운영 ordinal_position (생성 시 동일 순서로 만든다). 이 배열 밖의 테이블은 절대 건드리지 않는다. */
const TABLES: readonly TableSpec[] = [
  {
    table: 'permissions',
    columns: [
      col('id', 'uuid', true, UUID_DEFAULT),
      col('name', 'character varying(100)', true),
      col('displayName', 'character varying(255)', false),
      col('description', 'text', false),
      col('resource', 'character varying(100)', false),
      col('action', 'character varying(50)', false),
      col('createdAt', TS, true, NOW),
      col('key', 'character varying(100)', false),
      col('category', 'character varying(50)', false),
      col('isActive', 'boolean', false, 'true'),
      col('updatedAt', TS, false, NOW),
    ],
    constraints: [
      { name: 'PK_permissions', def: 'PRIMARY KEY (id)' },
      { name: 'UQ_permissions_name', def: 'UNIQUE (name)' },
    ],
    indexes: [],
    requires: [],
  },
  {
    table: 'role_permissions',
    columns: [col('role_id', 'uuid', true), col('permission_id', 'uuid', true)],
    constraints: [
      { name: 'PK_role_permissions', def: 'PRIMARY KEY (role_id, permission_id)' },
      { name: 'FK_role_permissions_permission', def: 'FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE' },
      { name: 'FK_role_permissions_role', def: 'FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE' },
    ],
    indexes: [
      { name: 'IDX_role_permissions_permission_id', unique: false, using: 'btree (permission_id)' },
      { name: 'IDX_role_permissions_role_id', unique: false, using: 'btree (role_id)' },
    ],
    requires: ['roles', 'permissions'],
  },
  {
    table: 'linked_accounts',
    columns: [
      col('id', 'uuid', true, UUID_DEFAULT),
      col('userId', 'uuid', true),
      col('provider', 'character varying(50)', true),
      col('providerId', 'character varying(255)', false),
      col('email', 'character varying(255)', false),
      col('accessToken', 'text', false),
      col('refreshToken', 'text', false),
      col('expiresAt', TS, false),
      col('profile', 'jsonb', false),
      col('createdAt', TS, true, NOW),
      col('updatedAt', TS, true, NOW),
      col('displayName', 'character varying(255)', false),
      col('profileImage', 'character varying(500)', false),
      col('providerData', 'json', false),
      col('lastUsedAt', TS, false),
      col('isVerified', 'boolean', false, 'false'),
      col('isPrimary', 'boolean', false, 'false'),
      col('linkedAt', TS, false, NOW),
    ],
    constraints: [{ name: 'PK_linked_accounts', def: 'PRIMARY KEY (id)' }],
    indexes: [
      { name: 'IDX_linked_accounts_provider', unique: false, using: 'btree (provider, "providerId")' },
      { name: 'IDX_linked_accounts_user', unique: false, using: 'btree ("userId")' },
    ],
    requires: [],
  },
  {
    table: 'settings',
    columns: [
      col('key', 'character varying(100)', true),
      col('value', 'jsonb', false),
      col('type', 'character varying(50)', true),
      col('description', 'text', false),
      col('createdAt', TS, true, NOW),
      col('updatedAt', TS, true, NOW),
    ],
    constraints: [{ name: 'PK_settings', def: 'PRIMARY KEY (key)' }],
    indexes: [],
    requires: [],
  },
  {
    table: 'account_activities',
    columns: [
      col('id', 'uuid', true, UUID_DEFAULT),
      col('userId', 'uuid', false),
      col('email', 'character varying(255)', false),
      col('action', 'character varying(100)', true),
      col('ipAddress', 'character varying(50)', false),
      col('userAgent', 'text', false),
      col('success', 'boolean', true, 'true'),
      col('details', 'jsonb', false),
      col('createdAt', TS, true, NOW),
      col('type', 'character varying(50)', false),
    ],
    constraints: [{ name: 'PK_account_activities', def: 'PRIMARY KEY (id)' }],
    indexes: [
      { name: 'IDX_account_activities_email', unique: false, using: 'btree (email)' },
      { name: 'IDX_account_activities_user', unique: false, using: 'btree ("userId")' },
    ],
    requires: [],
  },
];

const TAG = '[BaselineRbacAndAccountTables]';

export class BaselineRbacAndAccountTables20270413000000 implements MigrationInterface {
  name = 'BaselineRbacAndAccountTables20270413000000';

  async up(q: QueryRunner): Promise<void> {
    // uuid_generate_v4() default 의 전제. 만들지 않고 존재만 확인한다 (운영: 존재 · 신규 DB: 선행 migration 이 생성).
    const [{ n: ext }] = (await q.query(`SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'uuid-ossp'`)) as Array<{ n: number }>;
    if (ext !== 1) throw new Error(`${TAG} extension "uuid-ossp" is missing — refusing to proceed`);

    for (const spec of TABLES) {
      for (const dep of spec.requires) {
        if (!(await q.hasTable(dep))) {
          throw new Error(`${TAG} ${spec.table}: required table "${dep}" is absent — cannot create FK target (roles has no creation migration: report, do not improvise)`);
        }
      }

      if (await q.hasTable(spec.table)) {
        const extras = await assertTable(q, spec);
        console.log(`${TAG} ${spec.table}: exists · structure matches canonical · no-op${extras.length ? ` (extra non-canonical indexes kept: ${extras.join(', ')})` : ''}`);
        continue;
      }

      await q.query(createTableSql(spec));
      for (const idx of spec.indexes) {
        await q.query(`CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX "${idx.name}" ON "${spec.table}" USING ${idx.using}`);
      }
      // 생성 결과를 동일 기준으로 자가 검증 — DDL 과 spec 이 어긋나면 여기서 실패한다.
      await assertTable(q, spec);
      console.log(`${TAG} ${spec.table}: absent → created from canonical spec · verified`);
    }
  }

  async down(): Promise<void> {
    // no-op (irreversible): 활성 인증·설정·활동 테이블을 되돌리기에서 DROP 하지 않는다. 필요 시 별도 WO.
    console.warn(`${TAG} down() is a no-op — baseline ownership of active tables is not reverted.`);
  }
}

function createTableSql(spec: TableSpec): string {
  const cols = spec.columns.map((c) => `"${c.name}" ${c.type}${c.notNull ? ' NOT NULL' : ''}${c.default !== null ? ` DEFAULT ${c.default}` : ''}`);
  const cons = spec.constraints.map((k) => `CONSTRAINT "${k.name}" ${k.def}`);
  return `CREATE TABLE "${spec.table}" (\n  ${[...cols, ...cons].join(',\n  ')}\n)`;
}

/** 구조 불일치 시 throw. 반환값 = 운영에만 있는 추가 index 이름 (허용 · 기록). */
async function assertTable(q: QueryRunner, spec: TableSpec): Promise<string[]> {
  const problems: string[] = [];

  // ── columns ──
  const actualCols = (await q.query(
    `SELECT a.attname AS name,
            format_type(a.atttypid, a.atttypmod) AS type,
            a.attnotnull AS "notNull",
            pg_get_expr(d.adbin, d.adrelid) AS "default"
       FROM pg_attribute a
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [`public."${spec.table}"`],
  )) as Array<{ name: string; type: string; notNull: boolean; default: string | null }>;

  const actualByName = new Map(actualCols.map((c) => [c.name, c]));
  for (const c of spec.columns) {
    const a = actualByName.get(c.name);
    if (!a) {
      problems.push(`column "${c.name}" missing`);
      continue;
    }
    if (a.type !== c.type) problems.push(`column "${c.name}" type ${a.type} ≠ ${c.type}`);
    if (a.notNull !== c.notNull) problems.push(`column "${c.name}" nullability ${a.notNull ? 'NOT NULL' : 'NULL'} ≠ ${c.notNull ? 'NOT NULL' : 'NULL'}`);
    if ((a.default ?? null) !== c.default) problems.push(`column "${c.name}" default ${a.default ?? '(none)'} ≠ ${c.default ?? '(none)'}`);
  }
  const canonicalNames = new Set(spec.columns.map((c) => c.name));
  for (const a of actualCols) if (!canonicalNames.has(a.name)) problems.push(`unexpected column "${a.name}"`);

  // ── constraints (PK · UNIQUE · FK · CHECK 전부) ──
  const actualCons = (await q.query(
    `SELECT conname AS name, pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conrelid = $1::regclass ORDER BY conname`,
    [`public."${spec.table}"`],
  )) as Array<{ name: string; def: string }>;
  const actualConByName = new Map(actualCons.map((k) => [k.name, k.def]));
  for (const k of spec.constraints) {
    const def = actualConByName.get(k.name);
    if (def === undefined) problems.push(`constraint "${k.name}" missing`);
    else if (def !== k.def) problems.push(`constraint "${k.name}" def ${def} ≠ ${k.def}`);
  }
  const canonicalCons = new Set(spec.constraints.map((k) => k.name));
  for (const k of actualCons) if (!canonicalCons.has(k.name)) problems.push(`unexpected constraint "${k.name}" (${k.def})`);

  // ── indexes (PK · UNIQUE backing index 제외) ──
  const actualIdx = (await q.query(
    `SELECT i.indexname AS name, i.indexdef AS def
       FROM pg_indexes i
      WHERE i.schemaname = 'public' AND i.tablename = $1
        AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = i.indexname AND c.conrelid = ('public."' || i.tablename || '"')::regclass)
      ORDER BY i.indexname`,
    [spec.table],
  )) as Array<{ name: string; def: string }>;
  const parseIdx = (def: string) => ({ unique: /^CREATE UNIQUE INDEX/.test(def), using: def.slice(def.indexOf(' USING ') + ' USING '.length) });
  const actualIdxByName = new Map(actualIdx.map((i) => [i.name, parseIdx(i.def)]));
  for (const idx of spec.indexes) {
    const a = actualIdxByName.get(idx.name);
    if (!a) problems.push(`index "${idx.name}" missing`);
    else if (a.unique !== idx.unique || a.using !== idx.using) problems.push(`index "${idx.name}" def ${a.unique ? 'UNIQUE ' : ''}${a.using} ≠ ${idx.unique ? 'UNIQUE ' : ''}${idx.using}`);
  }
  const canonicalIdx = new Set(spec.indexes.map((i) => i.name));
  const extras = actualIdx.filter((i) => !canonicalIdx.has(i.name)).map((i) => i.name);

  if (problems.length > 0) {
    throw new Error(`${TAG} ${spec.table}: structure drift — refusing to proceed (no ALTER). ${problems.join('; ')}`);
  }
  return extras;
}
