/**
 * WO-O4O-SIGNAGE-FORCED-CONTENT-SURFACE-READ-CONTRACT-CLOSURE-V2
 *
 * 결함: signage playback reader
 *   (`routes/o4o-store/repositories/store-playlist.repository.ts`
 *    → `findPublicPlaylistItems()`, GET /store-playlists/public/:id)
 *   가 `signage_forced_content` 를 UNION 할 때 `target_surface` 를 필터하지 않았다.
 *   그 결과 태블릿 전용(`tablet_idle`) forced content 가 사이니지 재생 목록에
 *   섞여 들어갔다. 이 경로는 dead code 가 아니다 —
 *   `services/web-kpa-society` 의 `/public/signage` (PublicSignagePage) 가
 *   실제로 소비하는 무인증 재생 endpoint 다.
 *
 * 고정하는 계약 (surface truth table):
 *   target_surface | signage playback | tablet playback
 *   ---------------|------------------|----------------
 *   'signage'      | 포함             | 제외
 *   'tablet_idle'  | 제외             | 포함
 *   'both'         | 포함             | 포함
 *   invalid/NULL   | 제외             | 제외
 *
 * 관리(management) reader 는 playback reader 가 아니므로 전체 surface 를 본다.
 *
 * DB 는 붙이지 않는다. reader 원본 SQL 에서 실제 허용 집합을 추출해
 * truth table 을 평가하므로 mock 과의 순환 검증이 되지 않는다.
 */

import fs from 'fs';
import path from 'path';

const API_SERVER_SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(API_SERVER_SRC, rel), 'utf-8');

const STORE_PLAYLIST_REPO_REL = 'routes/o4o-store/repositories/store-playlist.repository.ts';
const TABLET_RESOLVER_REL = 'routes/platform/store-public/store-public-tablet-idle-resolve.ts';

const ALL_SURFACES = ['signage', 'tablet_idle', 'both'] as const;

/** 소스에서 메서드 본문을 잘라낸다 (다음 async 선언 전까지). */
function methodBody(src: string, name: string): string {
  const start = src.indexOf(`async ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  const next = rest.indexOf('\n  async ');
  return next === -1 ? rest : rest.slice(0, next);
}

/** target_surface IN (...) 절에서 허용 집합을 추출한다. */
function allowedSurfaces(sql: string): Set<string> {
  const out = new Set<string>();
  const re = /target_surface\s+IN\s*\(([^)]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    for (const raw of m[1].split(',')) {
      const v = raw.trim().replace(/^'|'$/g, '');
      if (v) out.add(v);
    }
  }
  return out;
}

/** forced content 를 읽는 SQL 조각만 남긴다. */
function forcedContentQueries(src: string): string[] {
  return src
    .split(/dataSource\.query\(/)
    .slice(1)
    .filter((chunk) => /signage_forced_content/i.test(chunk.slice(0, 1500)));
}

describe('WO-O4O-SIGNAGE-FORCED-CONTENT-SURFACE-READ-CONTRACT-CLOSURE-V2', () => {
  const repoSrc = read(STORE_PLAYLIST_REPO_REL);
  const resolverSrc = read(TABLET_RESOLVER_REL);

  describe('signage playback reader — findPublicPlaylistItems', () => {
    const body = methodBody(repoSrc, 'findPublicPlaylistItems');

    it('forced content UNION 이 target_surface 를 필터한다', () => {
      expect(body).toMatch(/FROM signage_forced_content/);
      expect(body).toMatch(/target_surface\s+IN\s*\('signage','both'\)/);
    });

    it('허용 집합은 정확히 signage · both 이며 tablet_idle 을 포함하지 않는다', () => {
      const allowed = allowedSurfaces(body);
      expect([...allowed].sort()).toEqual(['both', 'signage']);
      expect(allowed.has('tablet_idle')).toBe(false);
    });

    it('기존 lifecycle/시간 조건은 유지된다 (회귀 방지)', () => {
      expect(body).toMatch(/fc\.is_active = true/);
      expect(body).toMatch(/fc\.deleted_at IS NULL/);
      expect(body).toMatch(/NOW\(\) >= fc\.start_at/);
      expect(body).toMatch(/NOW\(\) <= fc\.end_at/);
      expect(body).toMatch(/fc\.service_key = \$2/);
    });
  });

  describe('tablet playback reader — store-public-tablet-idle-resolve', () => {
    it('forced content 조회 2경로(선택/fallback) 모두 tablet_idle · both 만 읽는다', () => {
      const queries = forcedContentQueries(resolverSrc);
      expect(queries.length).toBe(2);
      for (const q of queries) {
        expect(allowedSurfaces(q.slice(0, 1500))).toEqual(new Set(['tablet_idle', 'both']));
      }
    });

    it('signage 는 tablet playback 에 노출되지 않는다', () => {
      expect(allowedSurfaces(resolverSrc).has('signage')).toBe(false);
    });
  });

  describe('truth table — surface × playback reader', () => {
    const signageAllowed = allowedSurfaces(methodBody(repoSrc, 'findPublicPlaylistItems'));
    const tabletAllowed = allowedSurfaces(resolverSrc);

    const table: Array<[string, boolean, boolean]> = [
      // surface,      signage, tablet
      ['signage', true, false],
      ['tablet_idle', false, true],
      ['both', true, true],
    ];

    it.each(table)('%s → signage=%s, tablet=%s', (surface, onSignage, onTablet) => {
      expect(signageAllowed.has(surface as string)).toBe(onSignage);
      expect(tabletAllowed.has(surface as string)).toBe(onTablet);
    });

    it('invalid / NULL 은 양쪽 playback reader 에서 제외된다', () => {
      for (const bad of ['', 'unknown', 'kiosk', 'NULL', 'SIGNAGE']) {
        expect(signageAllowed.has(bad)).toBe(false);
        expect(tabletAllowed.has(bad)).toBe(false);
      }
      // IN (...) 은 NULL 에 대해 NULL(=거짓) 이므로 SQL 의미상으로도 제외된다.
      expect([...signageAllowed].every((s) => (ALL_SURFACES as readonly string[]).includes(s))).toBe(true);
      expect([...tabletAllowed].every((s) => (ALL_SURFACES as readonly string[]).includes(s))).toBe(true);
    });

    it('두 playback reader 의 합집합은 전체 surface 를 덮고, both 만 교집합이다', () => {
      const union = new Set([...signageAllowed, ...tabletAllowed]);
      expect([...union].sort()).toEqual([...ALL_SURFACES].sort());
      const inter = [...signageAllowed].filter((s) => tabletAllowed.has(s));
      expect(inter).toEqual(['both']);
    });
  });

  describe('writer 정합 — 기존 write 계약 불변', () => {
    it('campaign writer = both → 양쪽 playback reader 에 포함', () => {
      const src = read('routes/kpa/services/content-approval.service.ts');
      const m = src.match(/CAMPAIGN_TARGET_SURFACE\s*=\s*'([a-z_]+)'/);
      expect(m).not.toBeNull();
      expect(m![1]).toBe('both');

      const signageAllowed = allowedSurfaces(methodBody(repoSrc, 'findPublicPlaylistItems'));
      expect(signageAllowed.has(m![1])).toBe(true);
      expect(allowedSurfaces(resolverSrc).has(m![1])).toBe(true);
    });

    it('manual writer default = signage → signage 포함 / tablet 제외', () => {
      const src = read('routes/signage/controllers/forced-content.controller.ts');
      expect(src).toMatch(
        /req\.body\.targetSurface === 'string' \? req\.body\.targetSurface : 'signage'/,
      );
      const signageAllowed = allowedSurfaces(methodBody(repoSrc, 'findPublicPlaylistItems'));
      expect(signageAllowed.has('signage')).toBe(true);
      expect(allowedSurfaces(resolverSrc).has('signage')).toBe(false);
    });

    it('SSOT — VALID_TARGET_SURFACES 는 signage · tablet_idle · both 세 개다', () => {
      const src = read('routes/signage/controllers/forced-content.controller.ts');
      const m = src.match(/VALID_TARGET_SURFACES\s*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const values = m![1]
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter(Boolean);
      expect(values.sort()).toEqual([...ALL_SURFACES].sort());
    });
  });

  describe('management reader — playback 계약 대상 아님', () => {
    it('findPlaylistItems 는 편집용이므로 surface 전체를 본다 (필터 강제 안 함)', () => {
      const body = methodBody(repoSrc, 'findPlaylistItems');
      expect(body).toMatch(/FROM signage_forced_content/);
      // 편집 화면은 tablet 전용 항목도 보여줄 수 있어야 한다 → 제약 없음을 명시적으로 고정
      expect(allowedSurfaces(body).size).toBe(0);
    });
  });

  describe('회귀 경계 — Channel / retired signage stack 재도입 0', () => {
    it('수정 파일이 channel 축을 참조하지 않는다', () => {
      expect(repoSrc).not.toMatch(/channel_heartbeats|channel_playback_logs|\/api\/v1\/channels/);
    });

    it('Tablet ScreenSet canonical 경로는 유지된다', () => {
      expect(resolverSrc).toMatch(/screenSetIdleConfig/);
    });
  });
});
