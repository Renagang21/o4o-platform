/**
 * 커뮤니티 서비스 카탈로그 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3 · §7 (S5)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 테스트가 막는 것
 *
 *   ① `joinEnabled: true` 로 되돌리는 것.
 *      그러면 범용 `POST /auth/services/community/join` 이 **어느 커뮤니티에도 승인받지 않은**
 *      사람에게 `service_memberships('community')` 를 만들어 준다. 그 행은 진입 자격이므로
 *      개별 커뮤니티 승인(가입 승인형 하나)을 서비스 단위로 우회하는 길이 된다.
 *      커뮤니티의 서비스 가입은 **개별 승인의 결과로만** 생긴다
 *      (community-lifecycle.service ensureServiceMembership).
 *
 *   ② 커뮤니티에 새 서브도메인/배포를 붙이는 것.
 *      커뮤니티는 web-neture 안의 `/community` 영역이고 개별 커뮤니티는 그 아래 개체다.
 *      Cloud Run 웹 서비스를 서브도메인 수만큼 새로 만들지 않는다.
 */
import { O4O_SERVICES, getService } from '../service-catalog.js';
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

  it('별도 서브도메인·배포를 만들지 않는다 — 플랫폼 기본 호스트의 /community 영역', () => {
    expect({ domain: community?.domain, basePath: community?.basePath }).toEqual({
      domain: 'neture.co.kr',
      basePath: '/community',
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
   */
  it.each(['community', 'kpa-branch', 'lecture', 'cafe24-b2b'])('%s 는 joinEnabled=false', (key) => {
    expect(getService(key)?.joinEnabled).toBe(false);
  });
});
