/**
 * WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1 — canonical 회귀 가드
 *
 * 무엇을 고정하는가 (WO §10):
 *   1. 삭제 판정된 WordPress 호환 필드의 활성 선언 = 0
 *   2. 삭제 판정된 필드의 runtime read/write = 0
 *   3. 삭제 판정된 theme asset(`public/themes/**`)의 loader/import = 0
 *   4. `@wordpress/*` package dependency = 0
 *   5. `window.wp` runtime = 0
 *   6. `wp-json` / `wp_posts` runtime = 0
 *   7. `@o4o/block-renderer` 활성 소비처 = 보존
 *   8. 일반 O4O CMS 필드(camelCase 정본 · DB column `published_at`) = 보존
 *   9. migration history = 보존
 *
 * 무엇을 고정하지 않는가 (WO §10 마지막 문단):
 *   문자열이 남았다는 이유만으로 실패시키지 않는다. docs/ · archive/ · migrations/ ·
 *   과거 CHECK · 이 spec 자신은 스캔 대상이 아니다. 활성 소스도 **주석을 제거한 뒤** 검사한다
 *   (제거 근거 주석이 계약 단언을 오탐시키지 않도록).
 *
 * 판정 근거 정본: docs/checks/WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1-CHECK.md
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const abs = (rel: string) => path.join(REPO_ROOT, ...rel.split('/'));
const exists = (rel: string) => fs.existsSync(abs(rel));
const read = (rel: string) => fs.readFileSync(abs(rel), 'utf-8');
const SELF = 'apps/api-server/src/__tests__/wordpress-compat-field-and-theme-final-disposition.spec.ts';

/**
 * 활성 소스 루트 — 의도적으로 좁힌다. 전 저장소 스캔은 OOM·70초 대의 비용이 들고,
 * 이 WO 의 계약이 걸린 곳은 아래 다섯 루트뿐이다.
 */
const ACTIVE_ROOTS = [
  'packages/types/src',
  'packages/appearance-system/src',
  'packages/block-renderer/src',
  'apps/admin-dashboard/src',
  'apps/api-server/src',
];
const SCAN_EXT = /\.(ts|tsx|js|mjs|cjs)$/;
/** 활성 소스에서 제외 — 테스트 · migration(역사) · 산출물. */
const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.turbo|__tests__|migrations)(\/|$)|\.(spec|test)\.(ts|tsx)$|\.d\.ts$/;

let cache: Array<{ rel: string; body: string; code: string }> | null = null;
function activeSources() {
  if (cache) return cache;
  const out: Array<{ rel: string; body: string; code: string }> = [];
  for (const root of ACTIVE_ROOTS) {
    const full = abs(root);
    if (!fs.existsSync(full)) continue;
    for (const file of walk(full)) {
      const rel = path.relative(REPO_ROOT, file).split(path.sep).join('/');
      if (!SCAN_EXT.test(rel) || SKIP.test(rel) || rel === SELF) continue;
      const body = fs.readFileSync(file, 'utf-8');
      out.push({ rel, body, code: stripComments(body) });
    }
  }
  cache = out;
  return out;
}
const hitsInCode = (re: RegExp) => activeSources().filter(({ code }) => re.test(code)).map(({ rel }) => rel);

// ---------------------------------------------------------------------------

describe('1·2. 삭제 판정된 WordPress 호환 필드 — 선언 0 · runtime read/write 0', () => {
  const POST_TYPE = 'packages/types/src/cpt/post.ts';

  /** `export interface Post { ... }` 블록만 잘라낸다 — 같은 파일의 settings.sticky(중첩 설정) ·
   *  PostQueryParams.sticky(질의 파라미터)는 이번 제거 대상이 아니다(CHECK §6 후속 항목). */
  const postInterfaceBlock = (code: string) => {
    const start = code.indexOf('export interface Post {');
    expect(start).toBeGreaterThan(-1);
    const end = code.indexOf('\n}\n', start);
    return code.slice(start, end);
  };

  it('Post 인터페이스에 snake_case WP-compat alias 7건이 없다', () => {
    const code = stripComments(read(POST_TYPE));
    const block = postInterfaceBlock(code);
    for (const alias of ['featured_media', 'published_at', 'created_at', 'updated_at', 'comment_status', 'ping_status', 'sticky']) {
      // 들여쓰기 2칸 = Post 의 직접 멤버. settings{} 안의 4칸 들여쓰기는 대상이 아니다.
      expect(block).not.toMatch(new RegExp(`^ {2}${alias}\\??:`, 'm'));
    }
    expect(code).not.toContain('WordPress-style compatibility');
  });

  it.each([['featured_media'], ['comment_status'], ['ping_status']])(
    '활성 소스에 %s 선언·접근이 없다 (DB column 도 존재하지 않는 순수 WP 잔재)',
    (field) => {
      // 속성 접근(.x) · 객체 키(x:) · 문자열 키('x') 전부. 이 세 필드는 O4O 어디에도 컬럼이 없다.
      expect(hitsInCode(new RegExp(`(\\.|['"\`]|\\b)${field}(\\b|['"\`]|\\s*[?:])`))).toEqual([]);
    },
  );

  it('Post 타입의 published_at alias 는 없지만 DB column 으로서의 published_at 은 보존된다', () => {
    // WO §5-B: 이름만으로 WordPress 전용으로 단정하지 않는다.
    expect(stripComments(read(POST_TYPE))).not.toMatch(/^\s*published_at\??:/m);
    expect(read('packages/forum-core/src/backend/entities/ForumPost.ts')).toContain("published_at");
    expect(read('apps/api-server/src/routes/o4o-store/entities/store-pop.entity.ts')).toContain('published_at');
  });
});

describe('3. 삭제 판정된 theme asset — loader/import 0', () => {
  it('apps/admin-dashboard/public/themes 디렉터리가 없다', () => {
    expect(exists('apps/admin-dashboard/public/themes')).toBe(false);
  });

  it('활성 소스가 public/themes 계열 자산을 요청하지 않는다', () => {
    for (const needle of [/theme\.json/, /\/themes\/(default|twenty-four)\//, /schemas\.wp\.org/, /zones\.json/, /layout\.json/]) {
      expect(hitsInCode(needle)).toEqual([]);
    }
  });

  it('Overview 에 /themes 계열 데드링크와 "WordPress N.N.N 실행 중" 문구가 없다', () => {
    const src = stripComments(read('apps/admin-dashboard/src/pages/AdminDashboard.tsx'));
    expect(src).not.toMatch(/to="\/themes/);
    expect(src).not.toMatch(/WordPress\s+\d+\.\d+/);
  });

  it('appearance-system 은 O4O 토큰/CSS 생성기이며 theme.json 을 읽지 않는다 (보존)', () => {
    expect(exists('packages/appearance-system/src/tokens.ts')).toBe(true);
    expect(exists('packages/appearance-system/src/css-generators.ts')).toBe(true);
  });
});

describe('4·5·6. WordPress runtime · package · window.wp · wp-json = 0', () => {
  it('워크스페이스 package.json 에 @wordpress/* 의존성이 없다', () => {
    const offenders: string[] = [];
    for (const root of ['apps', 'packages', 'services']) {
      const full = abs(root);
      if (!fs.existsSync(full)) continue;
      for (const dir of fs.readdirSync(full, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const pkgPath = path.join(full, dir.name, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, Record<string, string> | undefined>;
        for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
          for (const name of Object.keys(pkg[section] ?? {})) {
            if (name.startsWith('@wordpress/')) offenders.push(`${root}/${dir.name}:${section}:${name}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each([['window.wp'], ['wp-json'], ['wp_posts'], ['wordpress-runtime-setup']])(
    '활성 소스(주석 제거)에 %s 가 없다',
    (needle) => {
      expect(hitsInCode(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toEqual([]);
    },
  );

  it('dangling "wordpress-runtime-setup.ts" 참조 주석이 admin src 에 없다 (주석 포함 검사)', () => {
    // 이 항목은 주석 자체가 결함이었다(존재하지 않는 파일을 가리킴) → raw body 로 검사한다.
    const hits = activeSources()
      .filter(({ rel, body }) => rel.startsWith('apps/admin-dashboard/src') && /is in wordpress-runtime-setup\.ts/.test(body))
      .map(({ rel }) => rel);
    expect(hits).toEqual([]);
  });
});

describe('7·8·9. 보존 계약 — block-renderer · 일반 CMS 필드 · migration history', () => {
  it('@o4o/block-renderer 패키지와 활성 소비처가 보존된다', () => {
    expect(exists('packages/block-renderer/src')).toBe(true);
    const consumers = activeSources().filter(({ rel, code }) => !rel.startsWith('packages/block-renderer/') && code.includes('@o4o/block-renderer'));
    expect(consumers.length).toBeGreaterThan(0);
  });

  it('packages/forum-core 가 보존된다', () => {
    expect(exists('packages/forum-core/src')).toBe(true);
  });

  it('Post 타입의 camelCase 정본 필드가 보존된다', () => {
    const code = stripComments(read('packages/types/src/cpt/post.ts'));
    for (const f of ['featuredImageId', 'publishedAt', 'createdAt', 'updatedAt', 'commentStatus', 'pingStatus', 'isSticky']) {
      expect(code).toMatch(new RegExp(`^\\s*${f}\\??:`, 'm'));
    }
    expect(code).toMatch(/export type CommentStatus = 'open' \| 'closed'/);
    expect(code).toMatch(/export type PingStatus = 'open' \| 'closed'/);
  });

  it('cover 블록의 레거시 top-level 속성(dimRatio 등)은 저장 데이터 호환으로 보존된다', () => {
    // ACTIVE_EXTERNAL_COMPAT — registry 속성 스키마에 선언돼 저장된 블록 JSON 에 존재할 수 있다.
    const types = stripComments(read('apps/admin-dashboard/src/components/editor/blocks/cover/types.ts'));
    expect(types).toMatch(/^\s*dimRatio\?:/m);
    expect(stripComments(read('apps/admin-dashboard/src/blocks/definitions/cover.tsx'))).toMatch(/dimRatio:\s*\{/);
  });

  it('migration history 를 수정하지 않았다 (published_at 컬럼 생성 이력 보존)', () => {
    expect(read('apps/api-server/src/database/migrations/20261029000000-CreateStorePops.ts')).toContain('published_at');
    expect(read('packages/forum-core/src/migrations/001-create-forum-tables.ts')).toContain('published_at');
  });

  it('활성 editor 블록 컴포넌트가 보존된다 (주석 문구만 정정 대상이었다)', () => {
    for (const rel of [
      'apps/admin-dashboard/src/components/editor/slate/utils/serialize.ts',
      'apps/admin-dashboard/src/components/editor/blocks/ParagraphBlock.tsx',
      'apps/admin-dashboard/src/components/editor/blocks/ListBlock.tsx',
    ]) {
      expect(exists(rel)).toBe(true);
      expect(read(rel)).not.toContain('Gutenberg compatibility');
    }
  });
});

// ---------------------------------------------------------------------------

/** 주석을 제거한다 — 제거 근거 주석이 계약 단언을 오탐시키지 않도록 한다. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

/** 디렉터리 재귀 순회 — 테스트 전용 헬퍼. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
