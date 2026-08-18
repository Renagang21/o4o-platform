/**
 * users 갱신 시각 canonical 계약 회귀 테스트 (저장소 전역 인벤토리)
 * WO-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1 §8
 *
 * 배경
 * ────
 * users 테이블에는 갱신 시각 컬럼이 2개 있었다.
 *
 *   "updatedAt"  — canonical. User entity 의 @UpdateDateColumn 이 갱신한다.
 *   updated_at   — legacy. 최초 migration 이 만들었고 아무도 갱신하지 않아
 *                  INSERT 시각에서 멈춰 있었다 (production 53/53 행에서 created_at 과 동일).
 *
 * 두 컬럼이 공존하는 동안 raw SQL 이 어느 쪽을 참조하느냐에 따라 "마지막 갱신 시각"이
 * 달라졌고, 이것이 계정 상태 변경 시점 오귀속의 직접 원인이 되었다.
 * legacy 컬럼은 20270310000000-DropUsersLegacyUpdatedAt 에서 제거했다.
 *
 * 이 spec 은 **legacy 컬럼 참조가 runtime 소스에 다시 생기면 실패**하도록 고정한다.
 * 컬럼이 이미 없으므로 새 참조는 즉시 런타임 오류가 되며, 배포 전에 여기서 걸려야 한다.
 *
 * 방식
 * ────
 * 정적 분석이다. DB·네트워크가 없다. api-server 소스의 SQL 리터럴에서
 * **테이블이 users 하나뿐인 문장**과 **users 별칭(u.) 한정 참조**만 골라
 * snake_case 시각 컬럼을 참조하는지 본다. users 를 JOIN 하는 문장의 비한정
 * created_at/updated_at 은 상대 테이블 컬럼이므로(둘 다 있으면 Postgres 가 ambiguous
 * 오류를 낸다) 대상이 아니다.
 *
 * 제외 대상
 *   - database/migrations/**  : legacy 컬럼을 만들고 지운 이력 자체가 정본이다.
 *   - *.sql 일회성 스크립트     : 이미 제거된 컬럼(approved_at 등)을 참조하는 dead script.
 *                               CHECK §C-4 에 별도 부채로 기록되어 있다.
 */

import fs from 'fs';
import path from 'path';

const API_SERVER_SRC = path.resolve(__dirname, '..');

/** legacy(snake_case) 시각 컬럼. */
const LEGACY_TS = /(?<![.\w"])(created_at|updated_at)\b/;

/** SQL 문장 후보 — 템플릿 리터럴 안에서 잘라 쓴다. */
const STATEMENT = /(SELECT|UPDATE|INSERT INTO|DELETE FROM)[\s\S]{0,2000}?(?=`|;)/gi;

/** 문장에 등장하는 테이블 이름. */
const TABLES = /(?:FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;

/** users 별칭 한정 legacy 참조 — 저장소 전역에서 users 별칭은 u 하나뿐이다. */
const ALIASED = /\bu\.(created_at|updated_at)\b/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'migrations') {
        continue;
      }
      collectSourceFiles(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function tablesOf(statement: string): Set<string> {
  const found = new Set<string>();
  for (const m of statement.matchAll(TABLES)) {
    found.add(m[1].toLowerCase());
  }
  return found;
}

describe('WO-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1 — users 시각 컬럼 canonical', () => {
  const files = collectSourceFiles(API_SERVER_SRC);

  it('스캔 대상 소스가 실제로 수집된다 (스캐너가 조용히 비어버리지 않는다)', () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it('users 단독 SQL 문장이 legacy snake_case 시각 컬럼을 참조하지 않는다', () => {
    const violations: string[] = [];

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf-8');
      if (!src.includes('users')) continue;

      for (const m of src.matchAll(STATEMENT)) {
        const statement = m[0];
        const tables = tablesOf(statement);
        if (tables.size !== 1 || !tables.has('users')) continue;
        if (!LEGACY_TS.test(statement)) continue;

        const line = src.slice(0, m.index ?? 0).split('\n').length;
        violations.push(
          `${path.relative(API_SERVER_SRC, file).replace(/\\/g, '/')}:${line}  ${statement
            .split(/\s+/)
            .join(' ')
            .slice(0, 120)}`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it('users 별칭(u.) 한정 참조가 legacy snake_case 시각 컬럼을 쓰지 않는다', () => {
    const violations: string[] = [];

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf-8');
      if (!/\busers\b/.test(src)) continue;

      src.split('\n').forEach((line, idx) => {
        if (!ALIASED.test(line)) return;
        violations.push(
          `${path.relative(API_SERVER_SRC, file).replace(/\\/g, '/')}:${idx + 1}  ${line.trim().slice(0, 120)}`,
        );
      });
    }

    expect(violations).toEqual([]);
  });

  it('User entity 는 갱신 시각을 @UpdateDateColumn 으로만 소유한다', () => {
    const entity = fs.readFileSync(
      path.join(API_SERVER_SRC, 'modules', 'auth', 'entities', 'User.ts'),
      'utf-8',
    );

    expect(entity).toMatch(/@UpdateDateColumn\(\)\s*\n\s*updatedAt/);
    expect(entity).toMatch(/@CreateDateColumn\(\)\s*\n\s*createdAt/);
    // 컬럼명을 snake 로 강제하는 표기가 들어오면 계약이 깨진다.
    expect(entity).not.toMatch(/@UpdateDateColumn\(\{[^}]*name:\s*['"]updated_at['"]/);
    expect(entity).not.toMatch(/@CreateDateColumn\(\{[^}]*name:\s*['"]created_at['"]/);
  });

  it('legacy 컬럼 제거 migration 이 존재하고 되돌릴 수 있다', () => {
    const file = path.join(
      API_SERVER_SRC,
      'database',
      'migrations',
      '20270310000000-DropUsersLegacyUpdatedAt.ts',
    );
    const src = fs.readFileSync(file, 'utf-8');

    expect(src).toContain('DROP COLUMN IF EXISTS "updated_at"');
    // down 이 컬럼 복구 + backfill 을 모두 수행해야 rollback 이 데이터까지 되돌린다.
    expect(src).toContain('ADD COLUMN IF NOT EXISTS "updated_at"');
    expect(src).toMatch(/UPDATE "users" SET "updated_at" = "createdAt"/);
  });
});
