/**
 * createRouteGuard 회귀검증
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * 4개 서비스(KPA / K-Cosmetics / GlycoPharm / Neture)의 기존 RoleGuard 동작을
 * Core 로 옮긴 뒤에도 판정이 동일한지 확인한다. 각 테스트는 "어느 서비스의 어떤 계약"인지
 * 명시한다 — 회귀 시 어느 서비스가 깨졌는지 바로 알기 위해서다.
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { createRouteGuard, type GuardAuthState } from '../createRouteGuard';

// globals:false 설정이라 @testing-library/react 의 자동 cleanup 이 등록되지 않는다.
// 명시적으로 정리하지 않으면 이전 테스트의 DOM 이 남아 getByTestId 가 중복 매칭된다.
afterEach(cleanup);

/** 리다이렉트 도착지를 관측하는 프로브. location.state 도 함께 노출한다. */
function Probe({ id }: { id: string }) {
  const loc = useLocation();
  return (
    <div data-testid={id} data-from={(loc.state as { from?: string } | null)?.from ?? ''}>
      {id}
    </div>
  );
}

const PROTECTED = '/protected';

function renderAtProtected(ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[PROTECTED]}>
      <Routes>
        <Route path={PROTECTED} element={ui} />
        <Route path="/" element={<Probe id="home" />} />
        <Route path="/login" element={<Probe id="login" />} />
        <Route path="/signin" element={<Probe id="signin" />} />
        <Route path="/admin" element={<Probe id="admin" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function authed(roles: string[]): GuardAuthState {
  return { isAuthenticated: true, isLoading: false, user: { roles } };
}
const ANON: GuardAuthState = { isAuthenticated: false, isLoading: false, user: null };
const LOADING: GuardAuthState = { isAuthenticated: false, isLoading: true, user: null };

/** 서비스별 MembershipGate 자리에 들어가는 대역. 전달된 serviceKey 를 관측한다. */
function makeGate() {
  const Gate = vi.fn(({ serviceKey, children }: { serviceKey?: string; children: ReactNode }) => (
    <div data-testid="gate" data-service-key={serviceKey ?? '(undefined)'}>
      {children}
    </div>
  ));
  return Gate;
}

const CHILD = <div data-testid="child">protected-content</div>;

describe('createRouteGuard — 판정 순서 (4개 서비스 공통)', () => {
  it('로딩 중에는 renderLoading 만 그리고 판정을 미룬다', () => {
    const Guard = createRouteGuard({ useAuth: () => LOADING, renderLoading: () => <div data-testid="spinner" /> });
    renderAtProtected(<Guard allowedRoles={['x:admin']}>{CHILD}</Guard>);

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByTestId('child')).toBeNull();
    expect(screen.queryByTestId('login')).toBeNull();
  });

  it('renderLoading 미지정 시 아무것도 그리지 않는다(리다이렉트도 하지 않는다)', () => {
    const Guard = createRouteGuard({ useAuth: () => LOADING });
    renderAtProtected(<Guard allowedRoles={['x:admin']}>{CHILD}</Guard>);

    expect(screen.queryByTestId('child')).toBeNull();
    expect(screen.queryByTestId('login')).toBeNull();
    expect(screen.queryByTestId('home')).toBeNull();
  });

  it('미인증이면 fallback 으로 보내고 원래 경로를 state.from 에 보존한다', () => {
    const Guard = createRouteGuard({ useAuth: () => ANON });
    renderAtProtected(<Guard allowedRoles={['x:admin']}>{CHILD}</Guard>);

    const login = screen.getByTestId('login');
    expect(login).toBeTruthy();
    // 로그인 후 복귀 경로 — 4개 서비스 모두 이 동작을 갖고 있었다.
    expect(login.getAttribute('data-from')).toBe(PROTECTED);
  });

  it('fallback 은 호출부가 지정할 수 있다', () => {
    const Guard = createRouteGuard({ useAuth: () => ANON });
    renderAtProtected(
      <Guard allowedRoles={['x:admin']} fallback="/signin">
        {CHILD}
      </Guard>,
    );
    expect(screen.getByTestId('signin')).toBeTruthy();
  });

  it('allowedRoles 미지정이면 인증만 요구하고 통과시킨다', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['whatever:role']) });
    renderAtProtected(<Guard>{CHILD}</Guard>);
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});

describe('createRouteGuard — 허용·금지 역할', () => {
  it('허용 역할을 하나라도 가지면 통과한다', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['neture:operator']) });
    renderAtProtected(<Guard allowedRoles={['neture:admin', 'neture:operator']}>{CHILD}</Guard>);
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('금지 역할이면 deniedRedirect 로 보낸다(기본 "/")', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['neture:member']) });
    renderAtProtected(<Guard allowedRoles={['neture:admin']}>{CHILD}</Guard>);

    expect(screen.getByTestId('home')).toBeTruthy();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('KPA 계약: accessDeniedMessage 가 있으면 리다이렉트 대신 안내를 그린다', () => {
    const Guard = createRouteGuard({
      useAuth: () => authed(['kpa:pharmacist']),
      renderDenied: ({ message }) => (message ? <div data-testid="denied-card">{message}</div> : null),
    });
    renderAtProtected(
      <Guard allowedRoles={['kpa:operator']} accessDeniedMessage="운영자 전용입니다">
        {CHILD}
      </Guard>,
    );

    expect(screen.getByTestId('denied-card').textContent).toBe('운영자 전용입니다');
    expect(screen.queryByTestId('home')).toBeNull();
  });

  it('KPA 계약: accessDeniedMessage 가 없으면 renderDenied 가 null 을 반환해 "/" 로 떨어진다', () => {
    const Guard = createRouteGuard({
      useAuth: () => authed(['kpa:pharmacist']),
      renderDenied: ({ message }) => (message ? <div data-testid="denied-card">{message}</div> : null),
    });
    renderAtProtected(<Guard allowedRoles={['kpa:operator']}>{CHILD}</Guard>);

    expect(screen.getByTestId('home')).toBeTruthy();
    expect(screen.queryByTestId('denied-card')).toBeNull();
  });
});

describe('createRouteGuard — isAllowed 술어 (GlycoPharm / K-Cosmetics OperatorRoute)', () => {
  it('GlycoPharm: isOperatorOrAbove 동치 술어로 통과한다', () => {
    const isAllowed = (roles: string[]) =>
      roles.some((r) => r === 'platform:super_admin' || r === 'glycopharm:admin' || r === 'glycopharm:operator');

    const Guard = createRouteGuard({ useAuth: () => authed(['glycopharm:operator']) });
    renderAtProtected(<Guard isAllowed={isAllowed}>{CHILD}</Guard>);
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('GlycoPharm: 술어 불충족이면 "/" 로 보낸다', () => {
    const isAllowed = (roles: string[]) => roles.includes('glycopharm:operator');
    const Guard = createRouteGuard({ useAuth: () => authed(['glycopharm:member']) });
    renderAtProtected(<Guard isAllowed={isAllowed}>{CHILD}</Guard>);
    expect(screen.getByTestId('home')).toBeTruthy();
  });

  it('K-Cosmetics: prefix 두 갈래(k-cosmetics / cosmetics) 모두 통과한다', () => {
    const isAllowed = (roles: string[]) =>
      roles.some((r) => r === 'platform:super_admin' || r === 'k-cosmetics:admin') ||
      roles.some((r) => r === 'k-cosmetics:operator' || r === 'cosmetics:operator');

    for (const role of ['k-cosmetics:operator', 'cosmetics:operator', 'k-cosmetics:admin', 'platform:super_admin']) {
      const Guard = createRouteGuard({ useAuth: () => authed([role]) });
      const { unmount } = renderAtProtected(<Guard isAllowed={isAllowed}>{CHILD}</Guard>);
      expect(screen.getByTestId('child'), `role=${role}`).toBeTruthy();
      unmount();
    }
  });

  it('allowedRoles 와 isAllowed 를 함께 주면 둘 다 통과해야 한다', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['a:admin']) });
    renderAtProtected(
      <Guard allowedRoles={['a:admin']} isAllowed={() => false}>
        {CHILD}
      </Guard>,
    );
    expect(screen.getByTestId('home')).toBeTruthy();
  });
});

describe('createRouteGuard — redirectMap (Neture 계약)', () => {
  it('redirectMap 은 allowedRoles 검사보다 먼저 실행된다', () => {
    // neture:admin 은 allowedRoles 에 없지만, redirectMap 이 먼저 잡아 /admin 으로 보낸다.
    const Guard = createRouteGuard({ useAuth: () => authed(['neture:admin']) });
    renderAtProtected(
      <Guard allowedRoles={['neture:operator']} redirectMap={{ 'neture:admin': '/admin' }}>
        {CHILD}
      </Guard>,
    );

    expect(screen.getByTestId('admin')).toBeTruthy();
    expect(screen.queryByTestId('home')).toBeNull();
  });

  it('redirectMap 에 해당 역할이 없으면 그대로 역할 검사로 넘어간다', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['neture:operator']) });
    renderAtProtected(
      <Guard allowedRoles={['neture:operator']} redirectMap={{ 'neture:admin': '/admin' }}>
        {CHILD}
      </Guard>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});

describe('createRouteGuard — MembershipGate 위임', () => {
  it('MembershipGate 를 주입하면 역할 통과 후 그 안에서 children 을 그린다', () => {
    const Gate = makeGate();
    const Guard = createRouteGuard({ useAuth: () => authed(['a:admin']), MembershipGate: Gate });
    renderAtProtected(<Guard allowedRoles={['a:admin']}>{CHILD}</Guard>);

    expect(screen.getByTestId('gate')).toBeTruthy();
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('enforceMembership=false 면 Gate 를 거치지 않는다 (KPA/K-Cos/Glyco public 계약)', () => {
    const Gate = makeGate();
    const Guard = createRouteGuard({ useAuth: () => authed(['a:admin']), MembershipGate: Gate });
    renderAtProtected(
      <Guard allowedRoles={['a:admin']} enforceMembership={false}>
        {CHILD}
      </Guard>,
    );

    expect(screen.queryByTestId('gate')).toBeNull();
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(Gate).not.toHaveBeenCalled();
  });

  it('Neture 계약: membershipServiceKey 가 Gate 로 그대로 전달된다', () => {
    const Gate = makeGate();
    const Guard = createRouteGuard({ useAuth: () => authed(['neture:operator']), MembershipGate: Gate });
    renderAtProtected(
      <Guard allowedRoles={['neture:operator']} membershipServiceKey="neture">
        {CHILD}
      </Guard>,
    );
    expect(screen.getByTestId('gate').getAttribute('data-service-key')).toBe('neture');
  });

  it('membershipServiceKey 미지정 시 Gate 는 undefined 를 받아 자기 기본값(SERVICE_KEY)을 쓴다', () => {
    const Gate = makeGate();
    const Guard = createRouteGuard({ useAuth: () => authed(['a:admin']), MembershipGate: Gate });
    renderAtProtected(<Guard allowedRoles={['a:admin']}>{CHILD}</Guard>);
    expect(screen.getByTestId('gate').getAttribute('data-service-key')).toBe('(undefined)');
  });

  it('Neture PlatformRoute 계약: enforceMembership=false 는 membership 검사를 완전히 건너뛴다', () => {
    const Gate = makeGate();
    const Guard = createRouteGuard({ useAuth: () => authed(['platform:super_admin']), MembershipGate: Gate });
    renderAtProtected(
      <Guard allowedRoles={['platform:super_admin']} enforceMembership={false}>
        {CHILD}
      </Guard>,
    );
    expect(Gate).not.toHaveBeenCalled();
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('MembershipGate 를 주입하지 않으면 membership 검사 없이 children 을 그린다', () => {
    const Guard = createRouteGuard({ useAuth: () => authed(['a:admin']) });
    renderAtProtected(<Guard allowedRoles={['a:admin']}>{CHILD}</Guard>);
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
