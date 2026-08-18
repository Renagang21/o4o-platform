/**
 * Service Legal — supported serviceKey 집합 계약 테스트
 *
 * WO-O4O-PHARMACY-HUB-LEGAL-SERVICE-SCOPE-AND-FOOTER-404-FIX-V1
 *
 * PharmacyHub 푸터의 `GET /public/services/pharmacy-hub/footer-legal` 이
 * UNKNOWN_SERVICE 404 였던 원인은 이 집합에 'pharmacy-hub' 가 없었던 것 하나다.
 * 여기서 고정하는 계약:
 *   - pharmacy-hub 는 legal scope 대상이다 (404 재발 방지)
 *   - 기존 4서비스는 그대로 accept (회귀 방지)
 *   - 미지원/role-prefix 축 문자열은 여전히 reject (계약을 넓히지 않았다)
 */

import {
  SUPPORTED_LEGAL_SERVICE_KEYS,
  isSupportedLegalServiceKey,
} from '../service-legal-scope.js';

describe('SUPPORTED_LEGAL_SERVICE_KEYS', () => {
  it('pharmacy-hub 를 legal 서비스로 받아들인다 (footer-legal 404 원인 제거)', () => {
    expect(isSupportedLegalServiceKey('pharmacy-hub')).toBe(true);
  });

  it('기존 4서비스는 그대로 accept 된다 (회귀 없음)', () => {
    for (const key of ['neture', 'glycopharm', 'kpa-society', 'k-cosmetics']) {
      expect(isSupportedLegalServiceKey(key)).toBe(true);
    }
  });

  it('미지원 serviceKey 는 여전히 reject 된다', () => {
    for (const key of ['unknown', '', 'pharmacy', 'pharmacyhub', 'kpa-groupbuy']) {
      expect(isSupportedLegalServiceKey(key)).toBe(false);
    }
  });

  it('role-prefix 축 문자열은 legal serviceKey 가 아니다 (canonical key 축만)', () => {
    // kpa / cosmetics 는 role prefix 이지 canonical serviceKey 가 아니다.
    expect(isSupportedLegalServiceKey('kpa')).toBe(false);
    expect(isSupportedLegalServiceKey('cosmetics')).toBe(false);
  });

  it('집합은 정확히 5개 canonical key 다 (의도치 않은 확장 감지)', () => {
    expect([...SUPPORTED_LEGAL_SERVICE_KEYS].sort()).toEqual([
      'glycopharm',
      'k-cosmetics',
      'kpa-society',
      'neture',
      'pharmacy-hub',
    ]);
  });
});
