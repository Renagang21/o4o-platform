import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { authClient } from "@o4o/auth-client";
import Health from "../pages/platform/PlatformHubPage";
import Accounts from "../pages/settings/AdminAccountsSettings";
import LegacyRoles from '../pages/users/UsersListClean';
vi.mock("@o4o/auth-client", () => ({
  authClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } },
}));
const get = vi.mocked(authClient.api.get),
  post = vi.mocked(authClient.api.post);
const reply = (data: unknown) => ({ data: { success: true, data } });
const health = () => ({
  checkedAt: new Date().toISOString(),
  cacheSeconds: 60,
  cached: false,
  scope: "기본 점검",
  infrastructure: [
    { name: "공통 DB 연결", state: "unknown", detail: "확인하지 못했습니다." },
  ],
  services: [
    {
      id: "carepharm",
      name: "CarePharm",
      url: "https://carepharm.neture.co.kr/",
      checkedAt: new Date().toISOString(),
      checks: [{ name: "HTTPS 응답", state: "failed", detail: "HTTP 503" }],
    },
    {
      id: "pharmcoop",
      name: "협동조합 연합회",
      url: "https://pharmcoop.neture.co.kr/",
      checkedAt: new Date().toISOString(),
      checks: [
        { name: "접속 확인", state: "unknown", detail: "네트워크 확인 불가" },
      ],
    },
  ],
});
const platform = {
  id: "platform-user",
  name: "합성 전체 관리자",
  email: "admin@example.invalid",
  roles: ["platform:super_admin", "kpa:store_owner"],
  isActive: true,
  lastLoginAt: null,
};
const service = {
  id: "service-user",
  name: "합성 서비스 담당",
  email: "service@example.invalid",
  roles: ["community:admin"],
  isActive: true,
  lastLoginAt: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("shows check evidence, unconfirmed scopes and failures without claiming all services healthy", async () => {
  get.mockResolvedValue(reply(health()) as any);
  render(<Health />);
  await screen.findByRole("heading", { name: "CarePharm" });
  expect(screen.getByText("HTTP 503")).toBeInTheDocument();
  expect(screen.getByText("네트워크 확인 불가")).toBeInTheDocument();
  expect(screen.queryByText("모든 서비스 정상")).not.toBeInTheDocument();
  expect(screen.getByText(/로그인·서비스 식별/)).toBeInTheDocument();
});
it("keeps a visible failed-refresh warning rather than treating previous results as a successful new check", async () => {
  get
    .mockResolvedValueOnce(reply(health()) as any)
    .mockRejectedValueOnce(new Error("private details"));
  render(<Health />);
  await screen.findByRole("heading", { name: "CarePharm" });
  fireEvent.click(screen.getByRole("button", { name: "상태 새로고침" }));
  await screen.findByRole("alert");
  expect(screen.getByText(/아래는 이전 점검 결과/)).toBeInTheDocument();
  expect(screen.queryByText("private details")).not.toBeInTheDocument();
});
it("marks expired results and handles malformed snapshots as errors", async () => {
  const old = health();
  old.checkedAt = "2026-01-01T00:00:00.000Z";
  get
    .mockResolvedValueOnce(reply(old) as any)
    .mockResolvedValueOnce(reply({}) as any);
  render(<Health />);
  await screen.findByText(/오래된 점검 결과/);
  fireEvent.click(screen.getByRole("button", { name: "상태 새로고침" }));
  expect(await screen.findByText(/서비스 상태를 조회하지 못했습니다/)).toBeInTheDocument();
});
it("shows only platform administrators and their platform role, filtering a stale mixed response too", async () => {
  get.mockResolvedValue(reply([platform, service]) as any);
  render(
    <MemoryRouter>
      <Accounts />
    </MemoryRouter>,
  );
  await screen.findByText(platform.email);
  expect(screen.queryByText(service.email)).not.toBeInTheDocument();
  expect(screen.queryByText("kpa:store_owner")).not.toBeInTheDocument();
  expect(screen.getByText(/공통 계정의 이용을 중지/)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /수정.*역할/ }),
  ).not.toBeInTheDocument();
});
it("searches an existing Google user and uses the official platform grant endpoint, surviving list reload", async () => {
  let rows = [platform];
  get.mockImplementation(
    async (path: any) =>
      reply(
        String(path).includes("/candidates")
          ? {
              candidates: [
                {
                  userId: service.id,
                  name: service.name,
                  email: service.email,
                  hasGoogleLink: true,
                },
              ],
            }
          : rows,
      ) as any,
  );
  post.mockImplementation(async () => {
    rows = [platform, { ...service, roles: ["platform:super_admin"] }];
    return reply({ changed: true }) as any;
  });
  render(
    <MemoryRouter>
      <Accounts />
    </MemoryRouter>,
  );
  await screen.findByText(platform.email);
  fireEvent.change(screen.getByLabelText("전체 관리자 지정 대상 검색"), {
    target: { value: "service" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사용자 검색" }));
  await screen.findByRole("option", { name: /합성 서비스 담당/ });
  fireEvent.change(screen.getByLabelText("지정할 사용자"), {
    target: { value: service.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "전체 관리자 지정" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      "/admin/platform-accounts/service-user/super-admin",
    ),
  );
  await screen.findByText("전체 관리자 권한을 부여했습니다.");
  await screen.findByText(service.email);
});
it("retains grant errors without a success message or changing unrelated roles", async () => {
  get.mockImplementation(
    async (path: any) =>
      reply(
        String(path).includes("/candidates")
          ? {
              candidates: [
                {
                  userId: service.id,
                  name: service.name,
                  email: service.email,
                  hasGoogleLink: true,
                },
              ],
            }
          : [platform],
      ) as any,
  );
  post.mockRejectedValue({
    response: { data: { error: "비활성 계정에는 지정할 수 없습니다." } },
  });
  render(
    <MemoryRouter>
      <Accounts />
    </MemoryRouter>,
  );
  await screen.findByText(platform.email);
  fireEvent.change(screen.getByLabelText("전체 관리자 지정 대상 검색"), {
    target: { value: "service" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사용자 검색" }));
  await screen.findByRole("option", { name: /합성 서비스 담당/ });
  fireEvent.change(screen.getByLabelText("지정할 사용자"), {
    target: { value: service.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "전체 관리자 지정" }));
  await screen.findByRole("alert");
  expect(
    screen.queryByText("전체 관리자 권한을 부여했습니다."),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(service.email)).not.toBeInTheDocument();
});

it('blocks platform grants after a failed account-list read until a successful refresh', async () => {
  get.mockRejectedValueOnce(new Error('read failed')).mockResolvedValue(reply([platform]) as any);
  render(<MemoryRouter><Accounts /></MemoryRouter>);
  await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText('전체 관리자 지정 대상 검색'), { target: { value: 'service' } });
  expect(screen.getByRole('button', { name: '사용자 검색' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  await screen.findByText(platform.email);
  expect(screen.getByRole('button', { name: '사용자 검색' })).toBeEnabled();
});
it('does not recreate a synthetic user role after the last real assignment was removed', async () => {
  get.mockResolvedValue({ data: { success: true, users: [{ ...service, roles: [] }] } } as any);
  render(<MemoryRouter><LegacyRoles /></MemoryRouter>);
  await screen.findByText('조건에 맞는 권한 할당이 없습니다.');
  expect(screen.queryByText(service.email)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'New Assignment' })).not.toBeInTheDocument();
});
