/**
 * 독립 서비스 3개의 카탈로그 계약 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3 · §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 테스트가 막는 것
 *
 *   ① `joinEnabled: true` 로 되돌리는 것.
 *      그러면 범용 `POST /auth/services/{key}/join` 이 **어느 커뮤니티에도 승인받지 않은**
 *      사람에게 `service_memberships` 를 만들어 준다. 그 행은 진입 자격이므로 개별 커뮤니티
 *      승인(가입 승인형 하나)을 서비스 단위로 우회하는 길이 된다. 커뮤니티의 서비스 가입은
 *      **개별 승인의 결과로만** 생긴다(community-lifecycle.service ensureServiceMembership).
 *
 *   ② 독립 주소를 대표 호스트의 하위 경로로 되돌리는 것.
 *      `community` · `supplier` · `funding` 은 각자 `*.neture.co.kr` **독립 서비스**다.
 *      같은 `neture-web` 을 서빙하지만(Cloud Run 서비스를 서브도메인 수만큼 만들지 않는다)
 *      주소와 권한 경계는 독립이다. 호스트 라우팅은 `web-neture/src/lib/hostProfile.ts` 가 갖는다.
 *
 *      착수 중 `community` 를 `neture.co.kr` + `basePath: '/community'` 로 등록했다가
 *      **확정 요구사항과 달라 정정했다.** 같은 앱을 서빙한다는 사실이 주소·권한 경계를
 *      대표 호스트에 붙여도 된다는 뜻이 아니다.
 */
import { O4O_SERVICES, getService, getServiceOrigins } from '../service-catalog.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';

describe('community 서비스 카탈로그', () => {
  const community = getService('community');

  it('카탈로그에 등록되어 있다 (handoff · /auth/services 가 이 집합을 본다)', () => {
    expect(community).toBeDefined();
  });

  it('서비스 단위 자가 가입 경로를 열지 않는다 — joinEnabled=false', () => {
    // true 로 바꾸면 개별 커뮤니티 승인이 우회된다. 위 주석 ① 참조.
    expect(community?.joinEnabled).toBe(false);
  });

  it('독립 주소다 — `community.neture.co.kr` 호스트 루트가 진입(basePath 없음)', () => {
    expect({ domain: community?.domain, basePath: community?.basePath }).toEqual({
      domain: 'community.neture.co.kr',
      basePath: undefined,
    });
  });

  it('매장 축이 없고 운영자 업무 공간만 있다', () => {
    expect(community?.workspace).toMatchObject({
      workspaceMode: 'none',
      storeWorkspaceEnabled: false,
      operatorWorkspaceEnabled: true,
    });
  });

  it('SERVICE_KEYS 와 카탈로그 key 가 같다 (두 곳이 어긋나지 않는다)', () => {
    expect(SERVICE_KEYS.COMMUNITY).toBe(community?.key);
  });

  it('카탈로그 key 는 유일하다', () => {
    const keys = O4O_SERVICES.map((s) => s.key);
    expect(keys.length).toBe(new Set(keys).size);
  });
});

describe('자가 가입 경로가 승인 축을 우회하지 않는다', () => {
  /**
   * 승인 주체가 개체(커뮤니티 운영자)인 서비스와 분회는 서비스 단위 자가 가입을 열지 않는다.
   * `lecture` 도 같은 이유(가입 UX·약관 미게시)로 닫혀 있다.
   * `supplier` 는 조직 기반 심사이고 `funding` 은 운영자 범위 축이므로 둘 다 자가 가입이 없다.
   */
  it.each(['community', 'supplier', 'funding', 'kpa-branch', 'lecture', 'cafe24-b2b'])(
    '%s 는 joinEnabled=false',
    (key) => {
      expect(getService(key)?.joinEnabled).toBe(false);
    },
  );
});

/**
 * WO §4 — 서브도메인 전체 운영자 범위 분리.
 *
 * 착수 중 "기존 `neture` 키로 충분하다" 고 판정했다가 **철회했다.**
 * FROZEN `O4O-SUPPLIER-DOMAIN-BOUNDARY-V1` §7 이 고정한 것은 "이 사용자가 **어느 공급자 조직을
 * 소유**하는가"이고, 여기서 필요한 것은 "누가 그 **서브도메인 영역을 운영**하는가"다.
 * 서로 다른 질문이므로 두 번째 인가 축이 아니다 — 조직 소유권 검사는 그대로 두고 운영자 범위만 나눈다.
 */
describe('supplier · funding 독립 서비스', () => {
  it.each([
    ['supplier', 'supplier.neture.co.kr'],
    ['funding', 'funding.neture.co.kr'],
  ])('%s 는 %s 독립 주소다 (basePath 없음)', (key, domain) => {
    expect({ domain: getService(key)?.domain, basePath: getService(key)?.basePath }).toEqual({
      domain,
      basePath: undefined,
    });
  });

  it.each(['supplier', 'funding'])('%s 는 SERVICE_KEYS 와 카탈로그가 일치한다', (key) => {
    const fromConst = (SERVICE_KEYS as Record<string, string>)[key.toUpperCase()];
    expect(fromConst).toBe(getService(key)?.key);
  });

  it('세 서비스의 공식 origin 이 모두 등록돼 있다 (CORS · handoff 판정 축)', () => {
    const origins = getServiceOrigins();
    for (const host of ['community.neture.co.kr', 'supplier.neture.co.kr', 'funding.neture.co.kr']) {
      expect(origins).toContain(`https://${host}`);
    }
  });

  it('세 서비스 모두 운영자 업무 공간을 갖는다 (매장 축은 없다)', () => {
    for (const key of ['community', 'supplier', 'funding']) {
      expect(getService(key)?.workspace).toMatchObject({
        storeWorkspaceEnabled: false,
        operatorWorkspaceEnabled: true,
      });
    }
  });
});
