/**
 * Store Workspace 공통 계약 (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §21)
 *
 * 고정하는 것:
 *   · Home / My Store / Store Hub / My Services 경로가 서비스 basePath 에서 결정적으로 파생된다
 *   · 상위 탭 활성 판정 (Home 은 exact, My Store 는 prefix, Store Hub 는 공통 /store-hub)
 *   · My Services 선별: active ∧ workspaceAvailable 만 진입 · 그 외는 상태만 · 다른 조직 row 는 섞이지 않는다
 *   · MyServicesView: 합성 시나리오 매장 A (KPA active · KCos active · PH inactive)
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KPA_SOCIETY_STORE_CONFIG,
  COSMETICS_STORE_CONFIG,
  PHARMACY_HUB_STORE_CONFIG,
} from '../../config/storeMenuConfig';
import {
  buildStoreWorkspaceTabs,
  getStoreWorkspacePathsForService,
  resolveActiveStoreWorkspaceTab,
  resolveStoreWorkspacePaths,
} from '../storeWorkspace';
import {
  createStoreServicesApi,
  selectMyServices,
  type StoreServiceResolution,
  type StoreServicesApi,
} from '../../api/createStoreServicesApi';
import { MyServicesView } from '../MyServicesView';
import { StoreWorkspaceNav } from '../StoreWorkspaceNav';

afterEach(cleanup);

describe('resolveStoreWorkspacePaths', () => {
  it('KPA / KCos = /store 기반, PH = /store-owner 기반 (PG callback 경로 보존), Store Hub 는 공통', () => {
    expect(resolveStoreWorkspacePaths(KPA_SOCIETY_STORE_CONFIG)).toEqual({
      home: '/store/workspace',
      myStore: '/store',
      storeHub: '/store-hub',
      myServices: '/store/services',
    });
    expect(resolveStoreWorkspacePaths(COSMETICS_STORE_CONFIG).home).toBe('/store/workspace');
    expect(resolveStoreWorkspacePaths(PHARMACY_HUB_STORE_CONFIG)).toEqual({
      home: '/store-owner/workspace',
      myStore: '/store-owner',
      storeHub: '/store-hub',
      myServices: '/store-owner/services',
    });
  });

  it('canonical serviceKey → 경로 (store workspace 없는 키는 null)', () => {
    expect(getStoreWorkspacePathsForService('kpa-society')?.myStore).toBe('/store');
    expect(getStoreWorkspacePathsForService('pharmacy-hub')?.myStore).toBe('/store-owner');
    expect(getStoreWorkspacePathsForService('neture')).toBeNull();
    expect(getStoreWorkspacePathsForService('kpa')).toBeNull(); // role prefix ≠ canonical key
  });

  it('탭 4개 순서 고정: home · my-store · store-hub · my-services', () => {
    const tabs = buildStoreWorkspaceTabs(resolveStoreWorkspacePaths(KPA_SOCIETY_STORE_CONFIG));
    expect(tabs.map((t) => t.key)).toEqual(['home', 'my-store', 'store-hub', 'my-services']);
    expect(tabs.map((t) => t.label)).toEqual(['홈', '내 매장', '매장 HUB', '내 서비스']);
  });
});

describe('resolveActiveStoreWorkspaceTab', () => {
  const paths = resolveStoreWorkspacePaths(KPA_SOCIETY_STORE_CONFIG);
  const cases: Array<[string, string | null]> = [
    ['/store/workspace', 'home'],
    ['/store', 'my-store'],
    ['/store/qr', 'my-store'],
    ['/store/library/contents', 'my-store'],
    ['/store-hub', 'store-hub'],
    ['/store-hub/contents', 'store-hub'],
    ['/store/services', 'my-services'],
    ['/community', null],
  ];
  for (const [pathname, expected] of cases) {
    it(`${pathname} → ${String(expected)}`, () => {
      expect(resolveActiveStoreWorkspaceTab(pathname, paths)).toBe(expected);
    });
  }
});

// ── §21 합성 시나리오 매장 A ────────────────────────────────────────────────
const ORG_A = 'org-a';
const scenarioA: StoreServiceResolution = {
  status: 'resolved',
  organizationId: ORG_A,
  reason: null,
  services: [
    { organizationId: ORG_A, serviceKey: 'kpa-society', serviceName: 'KPA Society', enrollmentStatus: 'active', workspaceMode: 'standard', workspaceAvailable: true },
    { organizationId: ORG_A, serviceKey: 'k-cosmetics', serviceName: 'K-Cosmetics', enrollmentStatus: 'active', workspaceMode: 'standard', workspaceAvailable: true },
    { organizationId: ORG_A, serviceKey: 'pharmacy-hub', serviceName: 'Pharmacy Hub', enrollmentStatus: 'inactive', workspaceMode: 'standard', workspaceAvailable: true },
    // 다른 조직의 row 가 섞여 들어와도 표시하지 않는다 (= FAIL 조건)
    { organizationId: 'org-b', serviceKey: 'neture', serviceName: 'Neture', enrollmentStatus: 'active', workspaceMode: 'special', workspaceAvailable: false },
  ],
};

describe('selectMyServices', () => {
  it('매장 A: available = KPA + KCos, unavailable = PH(inactive), 다른 조직 row 제외', () => {
    const { available, unavailable } = selectMyServices(scenarioA);
    expect(available.map((s) => s.serviceKey)).toEqual(['kpa-society', 'k-cosmetics']);
    expect(unavailable.map((s) => s.serviceKey)).toEqual(['pharmacy-hub']);
  });

  it('active 이지만 workspaceAvailable=false 는 unavailable', () => {
    const r: StoreServiceResolution = {
      ...scenarioA,
      services: [{ organizationId: ORG_A, serviceKey: 'kpa-society', serviceName: 'KPA', enrollmentStatus: 'active', workspaceMode: 'none', workspaceAvailable: false }],
    };
    expect(selectMyServices(r).available).toEqual([]);
    expect(selectMyServices(r).unavailable).toHaveLength(1);
  });

  it('status ≠ resolved (none / ambiguous) 는 아무것도 선별하지 않는다', () => {
    expect(selectMyServices({ status: 'none', organizationId: null, reason: 'NO_ACCESSIBLE_STORE', services: [] })).toEqual({ available: [], unavailable: [] });
    expect(selectMyServices({ status: 'ambiguous', organizationId: null, reason: 'MULTIPLE_ACCESSIBLE_STORES', services: [] })).toEqual({ available: [], unavailable: [] });
    expect(selectMyServices(null)).toEqual({ available: [], unavailable: [] });
  });
});

describe('createStoreServicesApi', () => {
  it('GET /work-scope/store-services 로 조회하고 data 를 돌려준다', async () => {
    const get = vi.fn(async () => ({ success: true, data: scenarioA }));
    const api = createStoreServicesApi({ get, post: vi.fn() as any });
    await expect(api.fetchStoreServices()).resolves.toEqual(scenarioA);
    expect(get).toHaveBeenCalledWith('/work-scope/store-services');
    await api.fetchStoreServices(ORG_A);
    expect(get).toHaveBeenLastCalledWith(`/work-scope/store-services?organizationId=${ORG_A}`);
  });

  it('handoff 는 https targetUrl 만 받아들인다', async () => {
    const post = vi.fn(async () => ({ success: true, data: { targetUrl: 'https://k-cosmetics.site/auth/handoff?t=x' } }));
    const api = createStoreServicesApi({ get: vi.fn() as any, post });
    await expect(api.resolveServiceEntryUrl('k-cosmetics', '/store')).resolves.toMatch(/^https:\/\//);
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'k-cosmetics', returnPath: '/store' });
    const bad = createStoreServicesApi({ get: vi.fn() as any, post: vi.fn(async () => ({ success: true, data: { targetUrl: 'javascript:alert(1)' } })) });
    await expect(bad.resolveServiceEntryUrl('k-cosmetics', '/store')).rejects.toThrow();
  });
});

describe('MyServicesView (매장 A · 현재 서비스 = KPA)', () => {
  function renderView(resolution: StoreServiceResolution) {
    const api: StoreServicesApi = {
      fetchStoreServices: vi.fn(async () => resolution),
      resolveServiceEntryUrl: vi.fn(async () => 'https://k-cosmetics.site/auth/handoff'),
    };
    render(
      <MemoryRouter>
        <MyServicesView api={api} currentServiceKey="kpa-society" currentMyStorePath="/store" />
      </MemoryRouter>,
    );
    return api;
  }

  it('KPA · KCos 는 진입 가능, PH 는 "이용 중지" 로만 표시되고 진입 버튼이 없다', async () => {
    renderView(scenarioA);
    await waitFor(() => expect(screen.getByText('KPA Society')).toBeTruthy());
    // 현재 서비스 → 내부 Link
    const kpaLink = screen.getByRole('link', { name: '내 매장으로' });
    expect(kpaLink.getAttribute('href')).toBe('/store');
    // 다른 서비스 → handoff 버튼
    expect(screen.getByRole('button', { name: 'K-Cosmetics 내 매장으로' })).toBeTruthy();
    // PH inactive → 상태만
    expect(screen.getByText('Pharmacy Hub')).toBeTruthy();
    expect(screen.getByText('이용 중지')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Pharmacy Hub 내 매장으로/ })).toBeNull();
    // 다른 조직 row 는 어디에도 없다
    expect(screen.queryByText('Neture')).toBeNull();
  });

  it('ambiguous 는 안내 문구를 보이고 목록을 만들지 않는다', async () => {
    renderView({ status: 'ambiguous', organizationId: null, reason: 'MULTIPLE_ACCESSIBLE_STORES', services: [] });
    await waitFor(() => expect(screen.getByText(/운영 중인 매장이 여러 개/)).toBeTruthy());
    expect(screen.queryByRole('link', { name: '내 매장으로' })).toBeNull();
  });
});

describe('StoreWorkspaceNav', () => {
  it('4개 탭을 렌더링하고 현재 경로 탭에 aria-current 를 준다', () => {
    const paths = resolveStoreWorkspacePaths(KPA_SOCIETY_STORE_CONFIG);
    render(
      <MemoryRouter initialEntries={['/store/services']}>
        <StoreWorkspaceNav paths={paths} />
      </MemoryRouter>,
    );
    const nav = screen.getByTestId('store-workspace-nav');
    expect(nav.querySelectorAll('a')).toHaveLength(4);
    expect(screen.getByRole('link', { name: '내 서비스' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBeNull();
  });
});
