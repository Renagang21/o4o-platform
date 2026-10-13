import UnifiedStoreLayout from "../../components/layouts/UnifiedStoreLayout";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  UNIFIED_STORE_CONFIG,
  withPharmacyStoreMenu,
} from "../../config/storeMenu";
import {
  currentWorkspaceArea,
  workspaceItems,
  workspaceSupportItems,
  withWorkspaceMode,
} from "../../config/storeWorkspace";
import { StoreWorkspaceShell } from "../../components/layouts/StoreWorkspaceShell";
import {
  StoreWorkflowNavigation,
  storeWorkspaceBase,
} from "../../components/store/StoreWorkflowNavigation";

vi.mock("../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
    effectiveServiceKey: "kpa-society",
    scopedServiceKey: "kpa-society",
    services: [],
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
      .getByRole("link", { name: "매장에서 활용" })
      .getAttribute("aria-current"),
  ).toBe("page");
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
  fireEvent.click(screen.getByRole("link", { name: "매장에서 활용" }));
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
