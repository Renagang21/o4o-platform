import { authClient } from "../../lib/apiClient";
import UnifiedStoreLayout from "../../components/layouts/UnifiedStoreLayout";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "fixture-owner" }, isAuthenticated: true, isLoading: false }),
}));

vi.mock("../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
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

describe("업무 배치와 기존 경로", () => {
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

it.each(['/store', '/work/kpa-society/store'])('목적지에서 미구현 예고를 내리고 기존 편집기는 세부 진입으로 유지한다: %s', base => {
  render(<MemoryRouter initialEntries={[base + '/workspace/studio']}><Routes>
    <Route path={base} element={<StoreWorkspaceShell config={{ ...config, basePath: base }} />}>
      <Route path="workspace/studio" element={<StoreWorkspacePage area="studio" />} />
      <Route path="workspace/use" element={<StoreWorkspacePage area="use" />} />
    </Route>
  </Routes></MemoryRouter>);
  expect(screen.getByRole('link', { name: '상품에서 시작' }).getAttribute('href')).toBe(base + '/my-products');
  expect(screen.getByRole('link', { name: '블로그' }).closest('details')?.open).toBe(false);
  fireEvent.click(screen.getByText('편집기·제작 도구'));
  expect(screen.getByRole('link', { name: '블로그' }).getAttribute('href')).toBe(base + '/content/blog');
  fireEvent.click(screen.getByRole('link', { name: '매장 운영' }));
  expect(screen.queryByText('준비 중')).toBeNull();
  expect(screen.getByRole('link', { name: 'QR 배치·출력' }).getAttribute('href')).toBe(base + '/marketing/qr?workspace=use');
});
it('필터된 자료·상품 진입을 목적지의 새 안내 시작에서 다시 노출하지 않는다', () => {
  const filtered = { ...config, menuSections: [] };
  render(<MemoryRouter initialEntries={['/store/workspace/studio']}><Routes><Route path="/store" element={<StoreWorkspaceShell config={filtered} />}><Route path="workspace/studio" element={<StoreWorkspacePage area="studio" />} /></Route></Routes></MemoryRouter>);
  expect(screen.queryByRole('link', { name: '상품에서 시작' })).toBeNull();
  expect(screen.queryByRole('link', { name: '자료에서 시작' })).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('현재 이용할 수 있는 업무가 없습니다');
});
