/**
 * WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1
 *
 * store slug 의 **생성 → 저장 → 서비스 귀속 → 공개 조회** 계약 회귀 테스트.
 *
 *   §4 생성 규칙 = validation 규칙 (generator 산출물이 validator 에서 거부되는 케이스 0)
 *   §5 public store slug 의 SSOT = `platform_store_slugs` 하나 (레거시 mirror write 중단)
 *   §6 공개 조회는 slug 만 맞는다고 끝내지 않고 service 귀속까지 일치
 *
 * DB·네트워크 없이 순수 함수 + 정적 census 로 검증한다.
 */

import fs from 'fs';
import path from 'path';
import {
  generateSlugFromName,
  toValidSlugBase,
  validateSlug,
  SLUG_CONSTRAINTS,
} from '../../../../packages/platform-core/src/store-identity/utils/slug-validation.js';

const API_SERVER_SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(API_SERVER_SRC, rel), 'utf8');

describe('§4 slug 생성 규칙 ↔ validation 규칙 정합', () => {
  const NAMES = [
    'E2E_TEST Pharmacy',
    'test_store',
    '테스트 약국',
    'Test Store 01',
    '  spaced  name  ',
    '네추럴!! 약국@@(본점)',
    'A___B___C',
    'UPPER_CASE_NAME',
  ];

  it.each(NAMES)('generateSlugFromName(%j) 결과는 validateSlug 를 통과한다', (name) => {
    const slug = generateSlugFromName(name);
    expect(slug.length).toBeGreaterThan(0);
    expect(validateSlug(slug)).toEqual({ valid: true });
  });

  it('underscore 는 canonical separator(-) 로 변환된다', () => {
    expect(generateSlugFromName('E2E_TEST Pharmacy')).toBe('e2e-test-pharmacy');
    expect(generateSlugFromName('test_store')).toBe('test-store');
    expect(generateSlugFromName('A___B___C')).toBe('a-b-c');
  });

  it('생성 결과에 밑줄·대문자·연속 하이픈·말단 하이픈이 남지 않는다', () => {
    for (const name of NAMES) {
      const slug = generateSlugFromName(name);
      expect(slug).not.toMatch(/_/);
      expect(slug).toBe(slug.toLowerCase());
      expect(slug).not.toMatch(/--/);
      expect(slug).not.toMatch(/^-|-$/);
    }
  });

  it('한글 이름은 한글을 보존한 유효 slug 가 된다', () => {
    expect(generateSlugFromName('테스트 약국')).toBe('테스트-약국');
    expect(validateSlug('테스트-약국')).toEqual({ valid: true });
  });

  it('MAX_LENGTH 절단이 말단 하이픈을 남기지 않는다', () => {
    const name = 'a'.repeat(SLUG_CONSTRAINTS.MAX_LENGTH - 1) + ' b';
    const slug = generateSlugFromName(name);
    expect(slug.length).toBeLessThanOrEqual(SLUG_CONSTRAINTS.MAX_LENGTH);
    expect(validateSlug(slug)).toEqual({ valid: true });
  });

  it('base 가 비는 이름은 toValidSlugBase 가 유효 base 로 보정한다', () => {
    for (const name of ['!!!', '___', '   ', '@@@']) {
      expect(generateSlugFromName(name)).toBe('');
      const base = toValidSlugBase(name);
      expect(validateSlug(base)).toEqual({ valid: true });
    }
  });

  it('유효한 이름의 base 는 toValidSlugBase 에서 바뀌지 않는다 (기존 채번 회귀 0)', () => {
    for (const name of ['중앙약국', 'Test Store 01', 'renagang 약국']) {
      expect(toValidSlugBase(name)).toBe(generateSlugFromName(name));
    }
  });

  it('숫자 suffix 재시도가 유효한 케이스(TOO_SHORT / RESERVED)는 base 를 바꾸지 않는다', () => {
    // 'kpa' 는 RESERVED, 'ab' 는 TOO_SHORT — 둘 다 `-1` 접미사로 해소된다.
    expect(toValidSlugBase('KPA')).toBe('kpa');
    expect(validateSlug('kpa-1')).toEqual({ valid: true });
    expect(toValidSlugBase('ab')).toBe('ab');
    expect(validateSlug('ab-1')).toEqual({ valid: true });
  });
});

describe('§4 서비스 로컬 정규화 중복 제거', () => {
  it('PharmacyHub slugBase 는 공통 generateSlugFromName 에 위임한다', () => {
    const src = read('services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts');
    expect(src).toMatch(/function slugBase\([^)]*\)[^{]*\{\s*const normalized = generateSlugFromName\(name\);/);
    // 자체 문자 치환 규칙을 다시 들이지 않는다 (규칙 SSOT = 공통 유틸).
    expect(src).not.toMatch(/replace\(\/\[_\s\]\+\/g/);
  });
});

describe('§5 public store slug SSOT = platform_store_slugs', () => {
  it('cosmetics 신규 매장 생성이 cosmetics_stores.slug 를 더 쓰지 않는다', () => {
    const src = read('routes/cosmetics/services/cosmetics-store.service.ts');
    const createBlock = src.slice(src.indexOf("manager.create('CosmeticsStore'"));
    const entityLiteral = createBlock.slice(0, createBlock.indexOf('});'));
    expect(entityLiteral).not.toMatch(/^\s*slug,?\s*$/m);
    // registry 예약은 유지된다.
    expect(src).toMatch(/reserveSlug\(\{/);
  });

  it('slug 변경 route 가 서비스 전용 테이블로 mirror write 하지 않는다', () => {
    const src = read('routes/platform/store-policy.routes.ts');
    expect(src).not.toMatch(/UPDATE cosmetics\.cosmetics_stores SET slug/);
  });
});

describe('§6 공개 조회의 service 귀속 검증', () => {
  const CONTROLLERS = [
    'routes/o4o-store/controllers/blog.controller.ts',
    'routes/o4o-store/controllers/pop.controller.ts',
    'routes/o4o-store/controllers/qr.controller.ts',
    'routes/o4o-store/controllers/video.controller.ts',
  ];

  it.each(CONTROLLERS)('%s 는 slug 의 service_key 와 mount serviceKey 를 대조한다', (rel) => {
    const src = read(rel);
    const resolver = src.slice(src.indexOf('async function resolvePharmacy'));
    const body = resolver.slice(0, resolver.indexOf('\n  }'));
    expect(body).toMatch(/record\.serviceKey !== serviceKey/);
    // 대조는 organization 조회보다 먼저 와야 한다.
    expect(body.indexOf('record.serviceKey !== serviceKey')).toBeLessThan(body.indexOf('orgRepo.findOne'));
  });

  it('서비스별 mount 는 slug 축 serviceKey 를 주입한다', () => {
    const mounts: Array<[string, string]> = [
      ['routes/cosmetics/cosmetics.routes.ts', 'cosmetics'],
      ['routes/glycopharm/glycopharm.routes.ts', 'glycopharm'],
      ['routes/kpa/kpa.routes.ts', 'kpa'],
    ];
    for (const [rel, key] of mounts) {
      expect(read(rel)).toContain(`'${key}'`);
    }
  });
});
