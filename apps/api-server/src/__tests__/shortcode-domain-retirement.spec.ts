/**
 * WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1
 *   — shortcode 도메인 은퇴 계약 테스트 (재도입 방지)
 *
 * 판정 근거
 * ---------------------------------------------------------------
 *   선행 census (`WO-O4O-SHORTCODE-ACTUAL-USAGE-AND-RETIREMENT-READINESS-CENSUS-V1`)
 *   가 production stored usage 0 · service consumer 0 · production render usage 0 ·
 *   external/public contract 0 · cosmetics-seller shortcode usage 0 을 확정하고
 *   `RETIRE_READY` 로 닫았다. 이 WO 는 그 판정을 실행해 도메인을 **완전히 제거**했다.
 *
 *   교체가 아니라 은퇴다. 호환 shim · legacy renderer · placeholder/fallback
 *   렌더러 · dead shortcode 자동 변환은 만들지 않았다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. `@o4o/shortcodes` runtime dependency 0
 *   2. `packages/shortcodes` 부재
 *   3. admin bootstrap 의 shortcode import 0
 *   4. `o4o/shortcode` block 정의 0
 *   5. block-renderer 의 shortcode alias 0
 *   6. `verify:shortcodes` script 0
 *   7. `scripts/audit/check-shortcode-registry.ts` 0
 *   8. cosmetics-seller-extension 의 shortcode 정의 0
 *
 * 스크립트를 실행하지 않고 raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const abs = (...seg: string[]) => path.join(REPO_ROOT, ...seg);
const exists = (...seg: string[]) => fs.existsSync(abs(...seg));
const readRoot = (rel: string) => fs.readFileSync(abs(...rel.split('/')), 'utf-8');
const readJson = (rel: string) => JSON.parse(readRoot(rel));

/** 은퇴 전에 `@o4o/shortcodes` 를 dependency 로 들고 있던 package manifest 들. */
const FORMER_DEPENDENTS = [
  'apps/admin-dashboard/package.json',
  'packages/block-renderer/package.json',
  'packages/cosmetics-seller-extension/package.json',
  // workspace glob 밖의 stale mirror stub — 문자열 잔재까지 함께 닫는다.
  'apps/api-server/packages/block-renderer/package.json',
  'apps/api-server/packages/cosmetics-seller-extension/package.json',
];

describe('1. `@o4o/shortcodes` runtime dependency 가 0 이다', () => {
  it.each(FORMER_DEPENDENTS)('%s — 어떤 dependency 필드에도 없다', (rel) => {
    const pkg = readJson(rel);
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      expect(Object.keys(pkg[field] ?? {})).not.toContain('@o4o/shortcodes');
    }
  });

  it('lockfile 에 `packages/shortcodes` importer 가 없다', () => {
    const lock = readRoot('pnpm-lock.yaml');
    expect(lock).not.toContain('packages/shortcodes');
    expect(lock).not.toContain('@o4o/shortcodes');
  });

  it('block-renderer 의 tsconfig project reference 에서도 빠졌다', () => {
    const refs = readJson('packages/block-renderer/tsconfig.json').references ?? [];
    expect(refs.map((r: { path: string }) => r.path)).not.toContain('../shortcodes');
  });
});

describe('2. `packages/shortcodes` 가 존재하지 않는다', () => {
  it('package 디렉터리가 없다', () => {
    expect(exists('packages', 'shortcodes')).toBe(false);
  });

  it('workspace 밖 mirror stub 도 없다', () => {
    expect(exists('apps', 'api-server', 'packages', 'shortcodes')).toBe(false);
  });

  it('루트 build 체인이 shortcodes 를 빌드하지 않는다', () => {
    const scripts = readJson('package.json').scripts as Record<string, string>;
    expect(scripts['build:shortcodes']).toBeUndefined();
    for (const body of Object.values(scripts)) {
      expect(body).not.toContain('build:shortcodes');
      expect(body).not.toContain('@o4o/shortcodes');
    }
  });
});

describe('3. admin bootstrap 의 shortcode import 가 0 이다', () => {
  const BOOTSTRAP = [
    'apps/admin-dashboard/src/main.tsx',
    'apps/admin-dashboard/src/App.tsx',
    'apps/admin-dashboard/src/blocks/index.ts',
  ];

  it.each(BOOTSTRAP)('%s — shortcode 를 import·초기화하지 않는다', (rel) => {
    const src = readRoot(rel);
    expect(src).not.toContain('@o4o/shortcodes');
    expect(src).not.toContain('register-dynamic-shortcodes');
    expect(src).not.toContain('shortcode-loader');
    expect(src).not.toMatch(/globalRegistry|loadShortcodes|__shortcodeRegistry/);
  });

  it('은퇴한 admin shortcode 자산 파일들이 없다', () => {
    const gone = [
      ['apps', 'admin-dashboard', 'src', 'blocks', 'definitions', 'shortcode.tsx'],
      ['apps', 'admin-dashboard', 'src', 'components', 'shortcodes'],
      ['apps', 'admin-dashboard', 'src', 'utils', 'shortcode-loader.ts'],
      ['apps', 'admin-dashboard', 'src', 'utils', 'shortcode-parser.ts'],
      ['apps', 'admin-dashboard', 'src', 'utils', 'register-dynamic-shortcodes.ts'],
      ['apps', 'admin-dashboard', 'src', 'services', 'ai', 'shortcode-registry.ts'],
      ['apps', 'admin-dashboard', 'src', 'components', 'editor', 'blocks', 'ShortcodeBlock.tsx'],
    ];
    for (const seg of gone) {
      expect({ p: seg.join('/'), exists: exists(...seg) }).toEqual({
        p: seg.join('/'),
        exists: false,
      });
    }
  });

  it('vite alias · optimizeDeps 에서도 빠졌다', () => {
    expect(readRoot('apps/admin-dashboard/vite.config.ts')).not.toContain('shortcode');
  });
});

describe('4. `o4o/shortcode` block 정의가 0 이다', () => {
  it('blocks/index.ts 가 shortcode block 을 등록하지 않는다', () => {
    const src = readRoot('apps/admin-dashboard/src/blocks/index.ts');
    expect(src).not.toContain('shortcodeBlockDefinition');
    expect(src).not.toContain("o4o/shortcode");
  });

  it('DynamicRenderer · block-icons 에 shortcode 매핑이 없다', () => {
    for (const rel of [
      'apps/admin-dashboard/src/blocks/registry/DynamicRenderer.tsx',
      'apps/admin-dashboard/src/utils/block-icons.tsx',
    ]) {
      expect(readRoot(rel)).not.toContain('shortcode');
    }
  });

  it('block name 정규화 표에 shortcode alias 가 없다', () => {
    const src = readRoot('scripts/cms/normalize-blocknames.ts');
    expect(src).not.toContain('shortcode');
    // 다른 block 정규화는 그대로 살아 있어야 한다 — 파일 통째 삭제가 아니다.
    expect(src).toContain("'core/buttons': 'o4o/buttons',");
    expect(src).toContain("'core/paragraph':");
  });
});

describe('5. block-renderer 의 shortcode alias 가 0 이다', () => {
  it('renderer registry 에 shortcode 키가 없다', () => {
    const src = readRoot('packages/block-renderer/src/renderers/index.ts');
    expect(src).not.toContain('shortcode');
    expect(src).not.toContain('ShortcodeBlock');
    // 다른 renderer 는 그대로다.
    expect(src).toContain("'o4o/buttons'");
  });

  it('renderer 파일과 metadata entry 가 없다', () => {
    expect(
      exists('packages', 'block-renderer', 'src', 'renderers', 'special', 'ShortcodeBlock.tsx')
    ).toBe(false);
    expect(readRoot('packages/block-renderer/src/metadata.ts')).not.toContain('shortcode');
  });
});

describe('6. `verify:shortcodes` 가 0 이다', () => {
  it('루트 script 에 없다', () => {
    const scripts = readJson('package.json').scripts as Record<string, string>;
    expect(scripts['verify:shortcodes']).toBeUndefined();
    expect(scripts['verify:registry']).not.toContain('verify:shortcodes');
    // block · cpt 검증 체인은 유지된다.
    expect(scripts['verify:registry']).toContain('verify:blocks');
  });

  it('`scripts/verify-shortcodes.ts` 가 없다', () => {
    expect(exists('scripts', 'verify-shortcodes.ts')).toBe(false);
  });
});

describe('7. `check-shortcode-registry` 가 0 이다', () => {
  it('audit 스크립트 파일이 없다', () => {
    expect(exists('scripts', 'audit', 'check-shortcode-registry.ts')).toBe(false);
  });

  it('생성 산출물의 ignore 규칙도 함께 사라졌다', () => {
    const ignore = readRoot('.gitignore');
    expect(ignore).not.toContain('shortcode-registry-report.json');
    // sibling block 규칙은 그대로 유지된다.
    expect(ignore).toContain('/scripts/audit/block-registry-report.json');
  });

  it('block audit 도구는 그대로 살아 있다', () => {
    expect(exists('scripts', 'audit', 'check-block-registry.ts')).toBe(true);
  });
});

describe('8. cosmetics-seller-extension 의 shortcode 정의가 0 이다', () => {
  it('shortcodes 디렉터리가 없다', () => {
    expect(exists('packages', 'cosmetics-seller-extension', 'src', 'shortcodes')).toBe(false);
  });

  it('index · manifest 어디에도 shortcode 가 남지 않았다', () => {
    for (const rel of [
      'packages/cosmetics-seller-extension/src/index.ts',
      'packages/cosmetics-seller-extension/src/manifest.ts',
    ]) {
      expect(readRoot(rel)).not.toContain('shortcode');
    }
  });

  it('package 자체 · manifest · lifecycle 은 삭제되지 않았다 (은퇴 범위는 shortcode 축뿐이다)', () => {
    expect(exists('packages', 'cosmetics-seller-extension', 'package.json')).toBe(true);
    expect(exists('packages', 'cosmetics-seller-extension', 'src', 'manifest.ts')).toBe(true);
    const index = readRoot('packages/cosmetics-seller-extension/src/index.ts');
    expect(index).toContain('manifest');
    expect(index).toContain('lifecycle');
  });
});
