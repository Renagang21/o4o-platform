/**
 * WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1
 * `scripts/check-typeorm-entities.mjs` 회귀 테스트
 *
 * 목적:
 *   2026-08-25 장애(`AiEngine`/`AiQueryPolicy`/`AiQueryLog` 미등록 → 전면 500)를
 *   가드가 **실제로 잡는지** 고정한다. positive("지금 통과한다")만 두면
 *   가드가 조용히 무력화돼도 초록불이 유지되므로, negative 를 함께 고정한다.
 *
 * 원칙:
 *   실제 `apps/api-server/src/database/entities.ts` 를 수정하지 않는다.
 *   registry 내용을 임시 파일로 주입하는 `--registry-source` 입력 추상화를 쓴다.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const GUARD = path.join(REPO_ROOT, 'scripts/check-typeorm-entities.mjs');
const REGISTRY = path.join(REPO_ROOT, 'apps/api-server/src/database/entities.ts');

const REGRESSION_ENTITIES = ['AiEngine', 'AiQueryPolicy', 'AiQueryLog'] as const;

jest.setTimeout(180_000);

let tmpDir: string;
let registrySource: string;

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'entity-guard-'));
  registrySource = readFileSync(REGISTRY, 'utf8');
});

afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

interface GuardRun {
  status: number;
  output: string;
}

function runGuard(mutatedSource?: string): GuardRun {
  const args = [GUARD];
  if (mutatedSource !== undefined) {
    const file = path.join(tmpDir, `registry-${Math.random().toString(36).slice(2)}.ts`);
    writeFileSync(file, mutatedSource, 'utf8');
    args.push('--registry-source', file);
  }
  try {
    const output = execFileSync(process.execPath, args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? -1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** entities 배열에서 해당 식별자 줄만 제거한다 (import 줄은 남긴다 = 실제 사고 형태) */
function removeFromArray(source: string, name: string): string {
  const lines = source.split('\n');
  const arrayStart = lines.findIndex((l) => /export\s+const\s+entities\s*(:[^=]*)?=\s*\[/.test(l));
  expect(arrayStart).toBeGreaterThan(-1);
  const idx = lines.findIndex((l, i) => i > arrayStart && l.trim() === `${name},`);
  expect(idx).toBeGreaterThan(arrayStart);
  lines.splice(idx, 1);
  return lines.join('\n');
}

describe('TypeORM entity registry guard — positive', () => {
  it('현재 저장소 상태에서 exit 0 으로 통과한다', () => {
    const run = runGuard();
    expect(run.output).toContain('entity registry 정합성 통과');
    expect(run.status).toBe(0);
  });

  it('registry 를 그대로 주입해도 동일하게 통과한다 (입력 주입이 결과를 바꾸지 않는다)', () => {
    const run = runGuard(registrySource);
    expect(run.status).toBe(0);
  });
});

describe('TypeORM entity registry guard — negative regression (2026-08-25 장애 형태)', () => {
  it.each(REGRESSION_ENTITIES)('%s 를 registry 배열에서 빼면 exit != 0 이고 이름을 정확히 출력한다', (name) => {
    const run = runGuard(removeFromArray(registrySource, name));

    expect(run.status).not.toBe(0);
    expect(run.output).toContain(name);
    expect(run.output).toContain('IMPORT_EXISTS_BUT_ARRAY_MISSING');

    // 다른 회귀 대상 entity 는 오탐으로 함께 걸리지 않는다
    for (const other of REGRESSION_ENTITIES.filter((n) => n !== name)) {
      expect(run.output).not.toContain(`- ${other}:`);
    }
  });

  it('AI entity 3개를 import 까지 통째로 제거하면 3개 이름이 모두 DEFINED_BUT_UNREGISTERED 로 보고된다', () => {
    let mutated = registrySource;
    for (const name of REGRESSION_ENTITIES) {
      mutated = removeFromArray(mutated, name);
      mutated = mutated
        .split('\n')
        .filter((l) => !new RegExp(`^import\\s*\\{\\s*${name}\\s*\\}\\s*from`).test(l.trim()))
        .join('\n');
    }

    const run = runGuard(mutated);

    expect(run.status).not.toBe(0);
    expect(run.output).toContain('DEFINED_BUT_UNREGISTERED');
    for (const name of REGRESSION_ENTITIES) {
      expect(run.output).toContain(`- ${name}:`);
    }
    // 미등록 사유가 "runtime 소비처가 있다" 임을 명시한다 → allowlist 로 덮을 수 없는 부류
    expect(run.output).toContain('EntityMetadataNotFoundError');
  });

  it('DUPLICATE_REGISTRATION 을 검출한다', () => {
    const mutated = registrySource.replace(/\n(\s*)AiEngine,\n/, '\n$1AiEngine,\n$1AiEngine,\n');
    expect(mutated).not.toBe(registrySource);

    const run = runGuard(mutated);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain('DUPLICATE_REGISTRATION');
    expect(run.output).toContain('AiEngine');
  });

  it('ARRAY_ENTRY_WITHOUT_IMPORT 를 검출한다', () => {
    const mutated = registrySource.replace(/\n(\s*)AiEngine,\n/, '\n$1AiEngine,\n$1NeverImportedEntity,\n');
    expect(mutated).not.toBe(registrySource);

    const run = runGuard(mutated);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain('ARRAY_ENTRY_WITHOUT_IMPORT');
    expect(run.output).toContain('NeverImportedEntity');
  });

  it('REGISTERED_BUT_SOURCE_MISSING 을 검출한다', () => {
    const mutated = registrySource.replace(
      /from '\.\.\/entities\/AiEngine\.js'/,
      "from '../entities/AiEngine__deleted.js'"
    );
    expect(mutated).not.toBe(registrySource);

    const run = runGuard(mutated);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain('REGISTERED_BUT_SOURCE_MISSING');
    expect(run.output).toContain('AiEngine');
  });

  it('entities 배열 자체가 사라지면 조용히 통과하지 않고 exit 2 로 중단한다', () => {
    const mutated = registrySource.replace(/export\s+const\s+entities\s*=\s*\[/, 'export const entitiesRenamed = [');
    expect(mutated).not.toBe(registrySource);

    const run = runGuard(mutated);
    expect(run.status).toBe(2);
    expect(run.output).toContain('entities');
  });
});
