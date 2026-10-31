import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceSpaceSwitcher } from "../ServiceSpaceSwitcher";
import {
  loadNavigationAccess,
  O4O_SERVICE_DIRECTORY,
  resolveServiceDestination,
  type NavigationClient,
} from "../service-directory";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const client = (): NavigationClient => ({
  get: vi.fn(async (path) => ({
    data: {
      success: true,
      data:
        path === "/auth/services"
          ? {
              services: [
                { key: "lecture", membership: { status: "active" } },
                { key: "funding", membership: { status: "pending" } },
                { key: "supplier", membership: { status: "active" } },
              ],
            }
          : path === "/work-scope/accessible-stores"
            ? {
                stores: [
                  {
                    organizationId: "synthetic-a",
                    organizationName: "합성 매장 A",
                  },
                  {
                    organizationId: "synthetic-b",
                    organizationName: "합성 매장 B",
                  },
                ],
              }
            : { serviceStates: { supplier: { status: "active" } } },
    },
  })),
  post: vi.fn(async (_path, body: any) => ({
    data: {
      data: {
        targetUrl: `https://${body.targetWorkspace ? "store" : body.targetServiceKey === "lecture" ? "study" : body.targetServiceKey === "kpa-society" ? "pharmacy" : body.targetServiceKey}.neture.co.kr/handoff?returnTo=${encodeURIComponent(body.returnPath)}`,
      },
    },
  })),
});
const mount = (
  api = client(),
  extra: Partial<Parameters<typeof ServiceSpaceSwitcher>[0]> = {},
) =>
  render(
    <MemoryRouter>
      <ServiceSpaceSwitcher
        api={api}
        isAuthenticated
        accountId="synthetic-user"
        {...extra}
      />
    </MemoryRouter>,
  );
const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "서비스·공간" }));
const panel = () =>
  within(screen.getByRole("region", { name: "서비스·공간 전환" }));

describe("service and workspace navigation", () => {
  it("offers searchable published discovery to guests without fetching personal data", () => {
    const api = client();
    mount(api, { isAuthenticated: false, accountId: undefined });
    open();
    expect(api.get).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "서비스 검색" }), {
      target: { value: "강의" },
    });
    expect(panel().getByText("O4O 강의 · 교육·학습")).toBeTruthy();
    expect(panel().queryByText("공급자")).toBeNull();
    expect(
      O4O_SERVICE_DIRECTORY.some((item) => /구인구직|부동산/.test(item.label)),
    ).toBe(false);
  });
  it("keeps store, supplier and joined services available concurrently without choosing a store", async () => {
    const api = client(),
      navigate = vi.fn();
    mount(api, { navigate });
    open();
    await waitFor(() => expect(panel().getByText("내 업무공간")).toBeTruthy());
    expect(
      panel().getByText("내 매장에서 이용할 매장을 선택합니다."),
    ).toBeTruthy();
    const workspace = screen.getByText("내 업무공간").nextElementSibling!;
    expect(within(workspace as HTMLElement).getByText("공급자")).toBeTruthy();
    fireEvent.click(
      within(workspace as HTMLElement).getByRole("button", {
        name: /내 매장 업무공간/,
      }),
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "https://store.neture.co.kr/handoff?returnTo=%2Fselect-store",
      ),
    );
    expect(api.post).toHaveBeenCalledWith("/auth/handoff", {
      targetWorkspace: "store",
      returnPath: "/select-store",
    });
  });
  it("does not derive supplier workspace access from generic service membership", async () => {
    const api = client(),
      get = api.get;
    api.get = vi.fn(async (path) =>
      path === "/neture/home/entry"
        ? {
            data: {
              data: { serviceStates: { supplier: { status: "pending" } } },
            },
          }
        : get(path),
    );
    mount(api);
    open();
    await waitFor(() => expect(panel().getByText("내 업무공간")).toBeTruthy());
    const workspace = screen.getByText("내 업무공간").nextElementSibling!;
    expect(within(workspace as HTMLElement).queryByText("공급자")).toBeNull();
    expect(panel().getAllByText("신청 중")).toHaveLength(2);
  });
  it("shows failed personal reads as an error with retry, not an empty membership list", async () => {
    const api = client(),
      get = api.get;
    api.get = vi.fn().mockRejectedValue(new Error("network"));
    mount(api);
    open();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(panel().queryByText("내 업무공간")).toBeNull();
    api.get = get;
    // Use the same client object to retry with restored connectivity.
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(panel().getByText("내 업무공간")).toBeTruthy());
  });
  it("returns keyboard focus when closed with Escape", () => {
    mount(client(), { isAuthenticated: false, accountId: undefined });
    open();
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "서비스 검색" }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "서비스·공간" }),
    );
  });
  it("isolates pinned services by account and discards late previous-account data", async () => {
    const api = client();
    const { rerender } = mount(api);
    open();
    await waitFor(() => expect(panel().getByText("내 업무공간")).toBeTruthy());
    fireEvent.click(
      panel().getAllByRole("button", { name: "공급자 즐겨찾기" })[0],
    );
    expect(panel().getByText("즐겨찾기")).toBeTruthy();
    rerender(
      <MemoryRouter>
        <ServiceSpaceSwitcher
          api={api}
          isAuthenticated
          accountId="different-synthetic-user"
        />
      </MemoryRouter>,
    );
    open();
    expect(panel().queryByText("즐겨찾기")).toBeNull();
  });
  it("does not navigate after account changes during a handoff", async () => {
    const api = client(),
      navigate = vi.fn();
    let resolve!: (value: any) => void;
    api.post = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { rerender } = mount(api, { navigate });
    open();
    await waitFor(() =>
      expect(panel().getByText("이용 중인 서비스")).toBeTruthy(),
    );
    const services = screen.getByText("이용 중인 서비스").nextElementSibling!;
    fireEvent.click(
      within(services as HTMLElement).getByRole("button", {
        name: "O4O 강의 · 교육·학습 이용 중",
      }),
    );
    rerender(
      <MemoryRouter>
        <ServiceSpaceSwitcher
          api={api}
          isAuthenticated
          accountId="different-user"
          navigate={navigate}
        />
      </MemoryRouter>,
    );
    await act(async () =>
      resolve({
        data: {
          data: {
            targetUrl: "https://study.neture.co.kr/handoff?returnTo=%2F",
          },
        },
      }),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
  it("shows independent pharmacy businesses without generic membership and hands off their sessions", async () => {
    const api = client(), get = api.get, navigate = vi.fn();
    api.get = vi.fn(async (path) => path === "/neture/home/entry" ? {
      data: { success: true, data: {
        serviceStates: { supplier: { status: "none" } },
        businesses: [
          { key: "pharmacy", canParticipate: true, membershipStatus: null },
          { key: "carepharm", canParticipate: true, membershipStatus: "active" },
          { key: "megapharm", canParticipate: true, membershipStatus: null },
        ],
      } },
    } : get(path));
    mount(api, { navigate }); open();
    await waitFor(() => expect(panel().getByText("이용 중인 서비스")).toBeTruthy());
    const joined = screen.getByText("이용 중인 서비스").nextElementSibling as HTMLElement;
    expect(within(joined).getByRole("button", { name: "O4O 약국 경영지원 이용 중" })).toBeTruthy();
    expect(within(joined).getByRole("button", { name: "창고형 약국 이용 중" })).toBeTruthy();
    fireEvent.click(within(joined).getByRole("button", { name: "만성질환관리 이용 중" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/handoff", {
      targetServiceKey: "carepharm", returnPath: "/",
    }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://carepharm.neture.co.kr/handoff?returnTo=%2F"));
    await waitFor(() => expect((within(joined).getByRole("button", { name: "O4O 약국 경영지원 이용 중" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(within(joined).getByRole("button", { name: "O4O 약국 경영지원 이용 중" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/handoff", {
      targetServiceKey: "kpa-society", returnPath: "/",
    }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://pharmacy.neture.co.kr/handoff?returnTo=%2F"));
  });
  it.each(["pending", "suspended", "rejected", "withdrawn", "terminated", "active"])(
    "does not turn a non-participating business %s record into active service access",
    async (status) => {
      const api = client(), get = api.get;
      api.get = vi.fn(async (path) => path === "/auth/services" ? {
        data: { data: { services: [{ key: "carepharm", membership: { status: "active" } }] } },
      } : path === "/neture/home/entry" ? {
        data: { data: { serviceStates: { supplier: { status: "none" } }, businesses: [
          { key: "carepharm", canParticipate: false, membershipStatus: status },
        ] } },
      } : get(path));
      const access = await loadNavigationAccess(api);
      expect(access.statuses.carepharm).toBe(status === "active" ? "unverified" : status);
      const navigate = vi.fn();
      mount(api, { navigate }); open();
      await waitFor(() => expect(panel().getByText("이용 중인 서비스")).toBeTruthy());
      const joined = screen.getByText("이용 중인 서비스").nextElementSibling as HTMLElement;
      expect(within(joined).queryByText("만성질환관리")).toBeNull();
      const labels: Record<string, string> = { pending: "신청 중", suspended: "이용 정지", rejected: "신청 반려", withdrawn: "탈퇴", terminated: "이용 종료", active: "이용 자격 확인 필요" };
      fireEvent.click(panel().getByRole("button", { name: `만성질환관리 ${labels[status]}`, exact: true }));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://carepharm.neture.co.kr/"));
      expect(api.post).not.toHaveBeenCalled();
    },
  );
  it("keeps personal pharmacy membership but does not invent independent business participation", async () => {
    const api = client(), get = api.get;
    api.get = vi.fn(async (path) => path === "/auth/services" ? {
      data: { data: { services: ["kpa-society", "carepharm"].map(key => ({ key, membership: { status: "active" } })) } },
    } : path === "/neture/home/entry" ? {
      data: { data: { serviceStates: { supplier: { status: "none" } }, businesses: [] } },
    } : get(path));
    expect((await loadNavigationAccess(api)).statuses).toMatchObject({ "kpa-society": "active", carepharm: "none" });
  });
  it("rejects malformed business participation instead of inferring membership", async () => {
    const api = client(), get = api.get;
    api.get = vi.fn(async (path) => path === "/neture/home/entry" ? {
      data: { data: { serviceStates: { supplier: { status: "none" } }, businesses: [{ key: "carepharm", canParticipate: "yes" }] } },
    } : get(path));
    await expect(loadNavigationAccess(api)).rejects.toThrow();
  });
  it("validates response shape instead of treating malformed access as an empty list", async () => {
    const api = client();
    api.get = vi.fn(async () => ({ data: { data: {} } }));
    await expect(loadNavigationAccess(api)).rejects.toThrow();
  });
  it.each([
    "https://evil.example/handoff",
    "https://study.neture.co.kr/login",
    "http://study.neture.co.kr/handoff",
    "javascript:alert(1)",
  ])("rejects unexpected handoff %s", async (url) => {
    const api = client();
    api.post = vi.fn(async () => ({ data: { data: { targetUrl: url } } }));
    const destination = O4O_SERVICE_DIRECTORY.find(
      (item) => item.key === "lecture",
    )!;
    await expect(
      resolveServiceDestination(api, destination, true),
    ).rejects.toThrow();
  });
});
