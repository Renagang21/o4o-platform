import { authClient } from "../../lib/apiClient";
import UnifiedStoreLayout from "../../components/layouts/UnifiedStoreLayout";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  UNIFIED_STORE_CONFIG,
  withPharmacyStoreMenu,
} from "../../config/storeMenu";
import {
  currentWorkspaceArea,
  workspaceItems,
  workspaceGroups,
  workspaceSupportItems,
  withWorkspaceMode,
} from "../../config/storeWorkspace";
import { StoreWorkspacePage } from "../pharmacy/StoreWorkspacePage";
import { StoreWorkspaceShell } from "../../components/layouts/StoreWorkspaceShell";
import {
  StoreWorkflowNavigation,
  storeWorkspaceBase,
} from "../../components/store/StoreWorkflowNavigation";

vi.mock('../pharmacy/StoreHandledProductsPage', () => ({ default: ({ navigation }: { navigation?: React.ReactNode }) => <><h1>상품 목록</h1>{navigation}</> }));
vi.mock('../neture-pharmacy/SupplyOptionsPage', () => ({default:({navigation}:{navigation?:React.ReactNode})=><><h1>상품 주문</h1>{navigation}</>}));
vi.mock('../pharmacy/StoreLibraryContentsPage', () => ({ default: ({ navigation, quickLinks }: { navigation?: React.ReactNode; quickLinks?: React.ReactNode }) => <><h1>저장한 안내 목록</h1>{quickLinks}{navigation}</> }));
vi.mock('../pharmacy/StoreExecutionPage', () => ({ default: ({ navigation }: { navigation?: React.ReactNode }) => <><h1>실행 현황</h1>{navigation}</> }));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "fixture-owner" }, isAuthenticated: true, isLoading: false }),
}));

vi.mock("../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
    organizationId: 'fixture-store',
    effectiveServiceKey: "kpa-society",
    scopedServiceKey: "kpa-society",
    services: [],
    workServiceKeys: [],
  }),
}));

afterEach(cleanup);
const config = withPharmacyStoreMenu(UNIFIED_STORE_CONFIG);
function Location() {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify(location)}</output>;
}

it.each(['/store', '/work/kpa-society/store'])('restores the former product landing only for its current scoped return: %s', async base => {
  const path = `${base}/workspace/commerce?q=Fixture&source=local&page=2`;
  render(<MemoryRouter initialEntries={[{pathname:base+'/workspace/commerce',search:'?q=Fixture&source=local&page=2',state:{productReturn:{path,scope:'fixture-store:kpa-society',selectedKey:'local:one'}}}]}><Routes>
    <Route path={base} element={<StoreWorkspaceShell config={{...config,basePath:base}}/>}>
      <Route path="workspace/commerce" element={<StoreWorkspacePage area="commerce"/>}/>
      <Route path="my-products" element={<><h1>상품 목록</h1><Location/></>}/>
    </Route>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading',{name:'상품 목록'});
  expect(screen.queryByRole('heading',{name:'상품 주문'})).toBeNull();
  const location=JSON.parse(screen.getByTestId('location').textContent!);
  expect(location.pathname).toBe(base+'/my-products');
  expect(location.state.productReturn).toEqual({path:base+'/my-products'+location.search,scope:'fixture-store:kpa-society',selectedKey:'local:one'});
});
it.each([
  ['another-store:kpa-society','/store/workspace/commerce'],
  ['fixture-store:another-service','/store/workspace/commerce'],
  ['fixture-store:kpa-society','/store/my-products'],
])('ignores a product return for a different scope or exact route: %s %s', async (scope,path) => {
  render(<MemoryRouter initialEntries={[{pathname:'/store/workspace/commerce',state:{productReturn:{path,scope,selectedKey:'local:one'}}}]}><Routes>
    <Route path="/store" element={<StoreWorkspaceShell config={config}/>}>
      <Route path="workspace/commerce" element={<StoreWorkspacePage area="commerce"/>}/>
    </Route>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading',{name:'상품 주문'});
  expect(screen.queryByRole('heading',{name:'상품 목록'})).toBeNull();
});
it('a saved product return cannot restore a menu removed by capability filtering', async () => {
  const filtered={...config,menuSections:config.menuSections?.map(section=>({...section,items:section.items.filter(item=>item.key!=='my-products')}))};
  render(<MemoryRouter initialEntries={[{pathname:'/store/workspace/commerce',state:{productReturn:{path:'/store/workspace/commerce',scope:'fixture-store:kpa-society',selectedKey:'local:one'}}}]}><Routes>
    <Route path="/store" element={<StoreWorkspaceShell config={filtered}/>}>
      <Route path="workspace/commerce" element={<StoreWorkspacePage area="commerce"/>}/>
    </Route>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading',{name:'상품 주문'});
  expect(screen.queryByRole('heading',{name:'상품 목록'})).toBeNull();
});

describe("업무 배치와 기존 경로", () => {
  it("직원 지원은 약국 메뉴와 업무 그룹에만 노출된다", () => {
    expect(UNIFIED_STORE_CONFIG.menuSections?.flatMap(s => s.items).some(i => i.key === "staff-support")).toBe(false);
    expect(workspaceItems(UNIFIED_STORE_CONFIG, "use").some(i => i.key === "staff-support")).toBe(false);
    expect(workspaceItems(config, "use").some(i => i.key === "staff-support")).toBe(true);
  });

  it("기존 기능이 업무 또는 보조 메뉴에 남고 입력 설정은 변하지 않는다", () => {
    const before = JSON.stringify(config);
    const keys = new Set([
      "home",
      ...(["commerce", "studio", "use"] as const).flatMap((area) =>
        workspaceItems(config, area).map((item) => item.key),
      ),
      ...workspaceSupportItems(config).map((item) => item.key),
    ]);
    expect(
      config.menuSections
        ?.flatMap((section) => section.items)
        .every((item) => keys.has(item.key)),
    ).toBe(true);
    expect(JSON.stringify(config)).toBe(before);
    expect(
      workspaceItems(config, "commerce").some(
        (item) => item.key === "pharmacy-cart",
      ),
    ).toBe(true);
    expect(
      workspaceItems(config, "studio").some(
        (item) => item.key === "signage-schedules",
      ),
    ).toBe(false);
  });
  it("상위 필터가 제거한 기능을 재생성하지 않는다", () => {
    const filtered = {
      ...config,
      menuSections: config.menuSections?.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.key !== "qr" && item.key !== "library-contents",
        ),
      })),
    };
    expect(
      workspaceItems(filtered, "use").some(
        (item) => item.key === "qr" || item.key === "asset-status",
      ),
    ).toBe(false);
    expect(
      workspaceItems(filtered, "studio").some(
        (item) => item.key === "library-resources",
      ),
    ).toBe(false);
  });
  it.each([
    ["/store", "", "home"],
    ["/store/workspace/studio", "", "studio"],
    ["/store/content/direct/sample", "", "studio"],
    ["/store/content", "", "use"],
    ["/store/staff-support", "", "use"],
    ["/store/multilingual-consultation", "", "use"],
    ["/store/multilingual-consultation-other", "", null],
    ["/store/pharmacy/contents", "", "studio"],
    ["/store/pharmacy/orders", "", "commerce"],
    ["/store/marketing/qr", "?workspace=use", "use"],
    ["/store/marketing/qr", "", "studio"],
    ["/store/commerce/tablet-displays", "", "use"],
    ["/store/commerce/tablet-displays", "?workspace=studio", "studio"],
    ["/store/marketing/signage/schedules", "", "use"],
    ["/store/info", "", null],
    ["/storefront", "", null],
  ] as const)(
    "기존 경로 %s를 올바른 업무로 해석한다",
    (path, search, expected) =>
      expect(currentWorkspaceArea(path, search, "/store")).toBe(expected),
  );
  it("다른 서비스 문맥으로 넘어가지 않으며 실제 서비스 업무는 거래 메뉴로 유지한다", () => {
    const base = "/work/kpa-society/store";
    expect(currentWorkspaceArea(`${base}/library/contents`, "", base)).toBe(
      "studio",
    );
    expect(
      currentWorkspaceArea("/work/kpa-society/online-sales/settings", "", base),
    ).toBe("commerce");
    expect(currentWorkspaceArea("/work/other/commerce/orders", "", base)).toBe(
      null,
    );
    expect(storeWorkspaceBase(`${base}/marketing/qr`)).toBe(base);
  });
  it("업무 이동에서 기존 query를 보존하고 중복 mode를 만들지 않는다", () => {
    const path = withWorkspaceMode(
      "/store/marketing/qr?target=sample&workspace=studio",
      "use",
    );
    expect(path).toBe("/store/marketing/qr?target=sample&workspace=use");
  });
});

it("서비스 지정 메뉴와 직접 진입에서 동일한 상단 4개 메뉴를 제공한다", () => {
  const base = "/work/kpa-society/store";
  render(
    <MemoryRouter initialEntries={[`${base}/marketing/qr?workspace=use`]}>
      <Routes>
        <Route
          path={`${base}/*`}
          element={
            <StoreWorkspaceShell config={{ ...config, basePath: base }}>
              <h1>QR 내용</h1>
            </StoreWorkspaceShell>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  const main = screen.getByRole("navigation", { name: "내 매장 주요 업무" });
  expect(main.querySelectorAll("a")).toHaveLength(4);
  expect(
    screen
      .getByRole("link", { name: "매장 운영" })
      .getAttribute("aria-current"),
  ).toBe("page");
  fireEvent.click(screen.getByText("다른 업무 열기"));
  expect(
    screen.getByRole("link", { name: "QR 배치·출력" }).getAttribute("href"),
  ).toBe(`${base}/marketing/qr?workspace=use`);
});

it("제작·활용 이동에서 전달 자료·query·hash를 보존한다", () => {
  const state = {
    production: { source: { items: [{ id: "sample", origin: "library" }] } },
  };
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/work/kpa-society/store/marketing/qr",
          search: "?target=sample",
          hash: "#selected",
          state,
        },
      ]}
    >
      <StoreWorkflowNavigation subject="QR" />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: "매장 운영" }));
  const location = JSON.parse(screen.getByTestId("location").textContent!);
  expect(location.pathname).toBe("/work/kpa-society/store/marketing/qr");
  expect(location.search).toBe("?target=sample&workspace=use");
  expect(location.hash).toBe("#selected");
  expect(location.state).toEqual(state);
});

it("공통 URL에서 서비스 지정 URL로 전환할 때 제작 자료 전달을 잃지 않는다", () => {
  const state = {
    production: {
      source: { items: [{ id: "prefill-sample", origin: "library" }] },
    },
  };
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/store/marketing/qr",
          search: "?workspace=studio",
          hash: "#selected",
          state,
        },
      ]}
    >
      <Routes>
        <Route path="/store/*" element={<UnifiedStoreLayout />} />
        <Route path="/work/kpa-society/store/*" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  );
  const location = JSON.parse(screen.getByTestId("location").textContent!);
  expect(location.pathname).toBe("/work/kpa-society/store/marketing/qr");
  expect(location.search).toBe("?workspace=studio");
  expect(location.hash).toBe("#selected");
  expect(location.state).toEqual(state);
});

 it("My Home은 직접 도메인 링크 대신 기존 인증 handoff를 사용하고 실패를 표시한다", async () => {
  const post = vi.spyOn(authClient.api, "post").mockRejectedValueOnce(new Error("fixture handoff failure"));
  try {
    render(<MemoryRouter initialEntries={["/store"]}><StoreWorkspaceShell config={config}><h1>내 매장</h1></StoreWorkspaceShell></MemoryRouter>);
    fireEvent.click(screen.getByTestId("my-home-button"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/handoff", { targetServiceKey: "neture", returnPath: "/mypage" }));
    expect((await screen.findByRole("alert")).textContent).toContain("My Home으로 이동하지 못했습니다");
    expect(screen.queryByRole("link", { name: /My Home/ })).toBeNull();
  } finally {
    post.mockRestore();
  }
});

it('업무 그룹은 필터된 기존 기능을 빠짐없이 한 번씩 배치한다', () => {
  for (const area of ['commerce', 'studio', 'use'] as const) {
    const grouped = workspaceGroups(config, area).flatMap(group => [...group.primary, ...group.secondary]);
    expect(grouped.map(item => item.key).sort()).toEqual(workspaceItems(config, area).map(item => item.key).sort());
    expect(new Set(grouped.map(item => item.key)).size).toBe(grouped.length);
  }
  const filtered = { ...config, menuSections: [] };
  expect(workspaceGroups(filtered, 'studio')).toEqual([]);
  expect(workspaceGroups(filtered, 'use')).toEqual([]);
});
it('목적지 첫 화면에는 중복 하위 메뉴를 펼치지 않고 매장 선택은 해당 홈으로 복귀한다', () => {
  const base = '/work/kpa-society/store';
  render(<MemoryRouter initialEntries={[base + '/workspace/studio']}><StoreWorkspaceShell config={{ ...config, basePath: base }}><h1>준비</h1></StoreWorkspaceShell></MemoryRouter>);
  expect(screen.queryByRole('navigation', { name: '현재 업무 메뉴' })).toBeNull();
  expect(screen.getByRole('link', { name: '매장 선택' }).getAttribute('href')).toBe('/select-store?returnTo=%2Fwork%2Fkpa-society%2Fstore');
});

it.each(['/store', '/work/kpa-society/store'])('목적지에서 미구현 예고를 내리고 기존 편집기는 세부 진입으로 유지한다: %s', async base => {
  render(<MemoryRouter initialEntries={[base + '/workspace/studio']}><Routes>
    <Route path={base} element={<StoreWorkspaceShell config={{ ...config, basePath: base }} />}>
      <Route path="workspace/studio" element={<StoreWorkspacePage area="studio" />} />
      <Route path="workspace/use" element={<StoreWorkspacePage area="use" />} />
    </Route>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading', {name:'저장한 안내 목록'});
  expect(screen.getByRole('link', { name: '상품에서 만들기' }).getAttribute('href')).toBe(base + '/my-products');
  expect(screen.getByRole('link', {name:'블로그'}).closest('details')?.open).toBe(false);
  expect(screen.getByRole('heading', {name:'저장한 안내 목록'})).toBeTruthy();
  fireEvent.click(screen.getByText('전체 업무'));
  expect(screen.getByRole('link', { name: '블로그' }).getAttribute('href')).toBe(base + '/content/blog');
  fireEvent.click(screen.getByRole('link', { name: '매장 운영' }));
  expect(screen.queryByText('준비 중')).toBeNull();
  expect(await screen.findByRole('heading', {name:'매장 운영'})).toBeTruthy();
  fireEvent.click(within(screen.getByRole('navigation', {name:'매장 운영 업무'})).getByRole('link', {name:'QR'}));
  expect(screen.getByRole('link', { name: 'QR 배치·출력' }).getAttribute('href')).toBe(base + '/marketing/qr?workspace=use');
});
it('필터된 자료·상품 진입을 목적지의 새 안내 시작에서 다시 노출하지 않는다', async () => {
  const filtered = { ...config, menuSections: [] };
  render(<MemoryRouter initialEntries={['/store/workspace/studio']}><Routes><Route path="/store" element={<StoreWorkspaceShell config={filtered} />}><Route path="workspace/studio" element={<StoreWorkspacePage area="studio" />} /></Route></Routes></MemoryRouter>);
  expect(screen.queryByRole('link', { name: '상품에서 만들기' })).toBeNull();
  expect(screen.queryByRole('link', { name: '자료에서 시작' })).toBeNull();
  expect((await screen.findByText('현재 이용할 수 있는 업무가 없습니다.')).textContent).toContain('현재 이용할 수 있는 업무가 없습니다');
});

it('상품 목적지는 주문 상품 목록을 먼저 표시하고 기존 취급상품 진입을 보존한다', async () => {
 render(<MemoryRouter initialEntries={['/store/workspace/commerce']}><Routes><Route path="/store" element={<StoreWorkspaceShell config={config} />}><Route path="workspace/commerce" element={<StoreWorkspacePage area="commerce" />} /></Route></Routes></MemoryRouter>);
 expect(await screen.findByRole('heading', {name:'상품 주문'})).toBeTruthy();
 expect(screen.getByRole('link', {name:'공급 상품'}).closest('details')?.open).toBe(false);
 fireEvent.click(screen.getByText('전체 업무'));
 expect(screen.getByRole('link', {name:'공급 상품'}).getAttribute('href')).toBe('/store/pharmacy/supply');
});


function OperationsHistory() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>뒤로</button>;
}

it.each(['/store', '/work/kpa-society/store'])('상담 첫 화면은 기존 기능을 연결하고 운영 목록을 미리 조회하지 않는다: %s', async base => {
  const get = vi.spyOn(authClient.api, 'get');
  try {
    render(<MemoryRouter initialEntries={[base + '/workspace/use']}><Routes>
      <Route path={base} element={<StoreWorkspaceShell config={{...config, basePath:base}} />}>
        <Route path="workspace/use" element={<StoreWorkspacePage area="use" />} />
      </Route>
    </Routes></MemoryRouter>);
    await screen.findByRole('heading', {name:'상담'});
    expect(screen.getByRole('link', {name:'다국어 상담 시작'}).getAttribute('href')).toBe(base + '/multilingual-consultation');
    expect(screen.getByRole('link', {name:'상품 위치·기본 안내'}).getAttribute('href')).toBe(base + '/staff-support');
    expect(screen.getByRole('link', {name:'상담 요청 확인'}).getAttribute('href')).toBe(base + '/requests');
    expect(screen.queryByRole('link', {name:'재생할 안내·순서 변경'})).toBeNull();
    expect(screen.queryByRole('heading', {name:'실행 현황'})).toBeNull();
    expect(screen.getByText('배치·이용 현황 확인').closest('details')?.open).toBe(false);
    expect(within(screen.getByRole('navigation', {name:'매장 보조 메뉴'})).queryByRole('link', {name:'다국어 상담'})).toBeNull();
    expect(get).not.toHaveBeenCalled();
  } finally { get.mockRestore(); }
});

it('업무 선택은 뒤로가기로 복구하며 query·hash·state를 보존한다', async () => {
  render(<MemoryRouter initialEntries={[{pathname:'/store/workspace/use',search:'?topic=consultation&view=compact',hash:'#work',state:{selection:'fixture'}}]}><Routes>
    <Route path="/store" element={<StoreWorkspaceShell config={config} />}>
      <Route path="workspace/use" element={<><StoreWorkspacePage area="use" /><OperationsHistory /><Location /></>} />
    </Route>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading', {name:'상담'});
  fireEvent.click(within(screen.getByRole('navigation', {name:'매장 운영 업무'})).getByRole('link', {name:'사이니지'}));
  expect(screen.getByRole('heading', {name:'사이니지'})).toBeTruthy();
  expect(screen.queryByRole('link', {name:'다국어 상담 시작'})).toBeNull();
  const location = JSON.parse(screen.getByTestId('location').textContent!);
  expect(location.search).toBe('?topic=signage&view=compact');
  expect(location.hash).toBe('#work');
  expect(location.state).toEqual({selection:'fixture'});
  expect(screen.getByRole('link', {name:'재생할 안내·순서 변경'}).getAttribute('href')).toBe('/store/marketing/signage/playlist?workspace=use');
  fireEvent.click(screen.getByRole('button', {name:'뒤로'}));
  expect(screen.getByRole('heading', {name:'상담'})).toBeTruthy();
});

it('권한에서 빠진 업무·참고 자료를 새 첫 화면이 복원하지 않고 허용된 업무로 시작한다', async () => {
  const filtered = {...config, menuSections:config.menuSections?.map(section => ({...section,items:section.items.filter(item => ['qr','store-execution'].includes(item.key))}))};
  render(<MemoryRouter initialEntries={['/store/workspace/use?topic=consultation']}><Routes><Route path="/store" element={<StoreWorkspaceShell config={filtered} />}><Route path="workspace/use" element={<StoreWorkspacePage area="use" />} /></Route></Routes></MemoryRouter>);
  await screen.findByRole('heading', {name:'QR'});
  const topics = screen.getByRole('navigation', {name:'매장 운영 업무'});
  expect(within(topics).getAllByRole('link')).toHaveLength(1);
  expect(screen.queryByRole('link', {name:'다국어 상담 시작'})).toBeNull();
  expect(screen.queryByText('상담에 사용할 상품·안내 자료')).toBeNull();
  expect(screen.queryByRole('link', {name:'태블릿 위치·화면 관리'})).toBeNull();
});

it.each(['/store', '/work/kpa-society/store'])('상담 직접 진입도 매장 운영을 활성화하고 해당 업무로 복귀한다: %s', base => {
  render(<MemoryRouter initialEntries={[base + '/multilingual-consultation']}><StoreWorkspaceShell config={{...config,basePath:base}}><h1>상담 내용</h1></StoreWorkspaceShell></MemoryRouter>);
  expect(screen.getByRole('link', {name:'매장 운영'}).getAttribute('aria-current')).toBe('page');
  const consultation = within(screen.getByRole('navigation', {name:'매장 운영 업무'})).getByRole('link', {name:'상담'});
  expect(consultation.getAttribute('aria-current')).toBe('page');
  expect(consultation.getAttribute('href')).toBe(base + '/workspace/use?topic=consultation');
});
