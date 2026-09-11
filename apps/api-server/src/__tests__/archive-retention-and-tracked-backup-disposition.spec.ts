/**
 * 코드 archive · 추적 백업 최종 처분 — 회귀 계약
 *
 * WO-O4O-ARCHIVE-RETENTION-AND-TRACKED-BACKUP-FINAL-DISPOSITION-V1
 *
 * 정책 (docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md §8):
 *   - Git 이력이 코드의 보존 수단이다. 과거 코드 사본 · 날짜별 source backup · 생성 산출물은 추적하지 않는다.
 *   - 저장소 루트 archive/** 는 제거되었다 (import 0 · CI/빌드 소비 0 · 원본 커밋 존재).
 *   - 문서 기록물(docs/archive · docs/checks · docs/investigations)과 migration 이력은 보존한다.
 *
 * 경로 개수를 고정하지 않고 "금지 유형" 과 "소비 관계" 를 검사한다.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const REPO = join(__dirname, '..', '..', '..', '..');
const exists = (...seg: string[]) => existsSync(join(REPO, ...seg));
const read = (...seg: string[]) => readFileSync(join(REPO, ...seg), 'utf-8');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.turbo', '.vite-cache', 'build', '.next']);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const rel = (p: string) => relative(REPO, p).split(sep).join('/');

// 활성 소스 트리 (문서 기록물 · tmp · 산출물 제외)
const ACTIVE_ROOTS = ['apps', 'packages', 'services', 'scripts', '.github'];
const activeFiles = ACTIVE_ROOTS.filter((r) => exists(r)).flatMap((r) => walk(join(REPO, r))).map(rel);
const activeSources = activeFiles.filter((f) => /\.(ts|tsx|js|mjs|cjs|json|yml|yaml)$/.test(f) && !/\.d\.ts$/.test(f));

describe('tracked source backups = zero', () => {
  it('저장소 루트 archive/ 가 존재하지 않는다', () => {
    expect(exists('archive')).toBe(false);
  });

  it('활성 트리에 backup 유형 파일이 없다 (*.bak · *.old · *.orig · *.before-* · *.tsx.fix)', () => {
    const hits = activeFiles.filter((f) => /\.(bak|old|orig)$|\.before-[a-z-]+$|\.(ts|tsx)\.fix$/.test(f));
    expect(hits).toEqual([]);
  });

  it('활성 트리에 backup 디렉터리가 없다 (backup/ · backups/ · *-backup-*/ · *_backup/)', () => {
    const hits = activeFiles.filter((f) => /(^|\/)(backup|backups|[^/]+-backup(-[^/]*)?|[^/]+_backup)\//.test(f));
    expect(hits).toEqual([]);
  });
});

describe('active imports / CI / build dependencies on archive = zero', () => {
  it('활성 소스가 archive/ 경로를 import 하지 않는다', () => {
    const hits = activeSources.filter((f) => {
      const src = read(f);
      return /(from\s+['"]|require\(\s*['"]|import\(\s*['"])[^'"]*(^|\/)archive\//.test(src);
    });
    expect(hits).toEqual([]);
  });

  it('CI workflow 가 archive/ 경로를 참조하지 않는다', () => {
    const wf = activeFiles.filter((f) => f.startsWith('.github/') && /\.ya?ml$/.test(f));
    const hits = wf.filter((f) => /(^|[\s'"/])archive\//.test(read(f)));
    expect(hits).toEqual([]);
  });

  it('tsconfig · eslint 가 제거된 archive 경로를 exclude/ignore 목록에 남기지 않는다', () => {
    expect(read('apps', 'admin-dashboard', 'tsconfig.json')).not.toContain('archive/**');
    expect(read('apps', 'api-server', 'tsconfig.build.json')).not.toContain('ARCHIVE_2025');
    const eslint = read('eslint.config.js')
      .split('\n')
      .filter((l) => !/^\s*\/\//.test(l))
      .join('\n');
    expect(eslint).not.toMatch(/['"]archive\/\*\*['"]/);
  });
});

describe('historical records · migration history = preserved', () => {
  it('docs/archive 기록물 폴더가 보존된다', () => {
    for (const d of ['audits', 'checks', 'investigations', 'reports', 'work-orders', 'obsolete']) {
      expect(exists('docs', 'archive', d)).toBe(true);
    }
    const mdCount = walk(join(REPO, 'docs', 'archive')).filter((f) => f.endsWith('.md')).length;
    expect(mdCount).toBeGreaterThan(0);
  });

  it('docs/checks · docs/investigations 가 보존된다', () => {
    expect(exists('docs', 'checks')).toBe(true);
    expect(exists('docs', 'investigations')).toBe(true);
  });

  it('api-server migration 이력이 보존된다', () => {
    const dir = join(REPO, 'apps', 'api-server', 'src', 'database', 'migrations');
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir).filter((f) => /\.ts$/.test(f)).length).toBeGreaterThan(0);
  });

  it('코드 archive 정책이 문서화되어 있다', () => {
    const rules = read('docs', 'rules', 'DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md');
    expect(rules).toContain('코드 archive · 추적 백업 정책');
    expect(rules).toContain('Git 이력이 코드의 보존 수단이다');
  });
});

describe('sanity', () => {
  it('활성 트리 walk 가 실제 파일을 읽었다', () => {
    expect(activeSources.length).toBeGreaterThan(100);
    expect(statSync(join(REPO, 'package.json')).isFile()).toBe(true);
  });
});
