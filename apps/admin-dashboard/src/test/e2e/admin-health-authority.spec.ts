import { test, expect, type Page } from "@playwright/test";
async function fixture(
  page: Page,
  roles: string[] | null = ["platform:super_admin"],
) {
  let healthFail = false,
    grantFail = false;
  const writes: string[] = [];
  const platform = {
    id: "platform-user",
    name: "합성 전체 관리자",
    email: "admin@example.invalid",
    roles: ["platform:super_admin", "kpa:store_owner"],
    isActive: true,
    status: "active",
    createdAt: "2026-10-21",
    lastLoginAt: null,
  };
  const service = {
    id: "service-user",
    name: "합성 서비스 담당",
    email: "service@example.invalid",
    roles: ["community:admin"],
    isActive: true,
    status: "active",
    createdAt: "2026-10-21",
    lastLoginAt: null,
  };
  const member = {
    id: "member-user",
    name: "합성 기존 사용자",
    email: "member@example.invalid",
    roles: ["kpa:store_owner"],
    isActive: true,
    status: "active",
    createdAt: "2026-10-21",
  };
  let accounts = [platform, service];
  const users = [platform, service, member];
  const targets = [
    ["pharmacy", "O4O 약국 경영지원"],
    ["carepharm", "CarePharm"],
    ["megapharm", "MegaPharm"],
    ["pharmcoop", "협동조합 연합회"],
    ["supplier", "공급자"],
    ["community", "커뮤니티"],
    ["kpa", "분회"],
    ["study", "O4O 강의"],
    ["funding", "유통참여형 펀딩"],
    ["store", "내 매장"],
    ["admin", "전체 관리자"],
    ["neture", "O4O 대표 홈"],
  ];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      const json = (data: unknown, status = 200) =>
        route.fulfill({ json: data, status });
      if (path === "/api/v1/auth/status")
        return json({
          success: true,
          data: {
            authenticated: roles !== null,
            user: roles && {
              id: "platform-user",
              email: "admin@example.invalid",
              name: "합성 전체 관리자",
              roles,
              status: "active",
              authMethod: "google",
            },
          },
        });
      if (path === "/api/v1/auth/google/config")
        return json({
          success: true,
          data: { enabled: false, clientId: null },
        });
      if (path === "/api/v1/admin/pending-tasks/summary")
        return json({ success: true, data: { total: 0 } });
      if (path === "/api/v1/platform/hub/summary")
        return healthFail
          ? json({ success: false }, 503)
          : json({
              success: true,
              data: {
                checkedAt: new Date().toISOString(),
                cached: false,
                cacheSeconds: 60,
                scope: "합성 기본 점검",
                infrastructure: [
                  {
                    name: "공통 API 실행 준비",
                    state: "passed",
                    detail: "서버 시작 상태 READY",
                  },
                  {
                    name: "공통 DB 연결",
                    state: "unknown",
                    detail: "연결 확인 불가",
                  },
                ],
                services: targets.map(([id, name]) => ({
                  id,
                  name,
                  url:
                    id === "neture"
                      ? "https://neture.co.kr/"
                      : `https://${id}.neture.co.kr/`,
                  checkedAt: new Date().toISOString(),
                  checks: [
                    {
                      name: "HTTPS 응답",
                      state:
                        id === "carepharm"
                          ? "failed"
                          : id === "pharmcoop"
                            ? "unknown"
                            : "passed",
                      detail:
                        id === "carepharm"
                          ? "HTTP 503"
                          : id === "pharmcoop"
                            ? "네트워크 확인 불가"
                            : "HTTP 200",
                    },
                    {
                      name: "화면·필수 파일",
                      state: "passed",
                      detail: "HTML 및 앱 JavaScript 응답 확인",
                    },
                  ],
                })),
              },
            });
      if (path === "/api/v1/admin/platform-accounts" && req.method() === "GET")
        return json({ success: true, data: accounts });
      if (path === "/api/v1/admin/operator-assignments/candidates")
        return json({
          success: true,
          data: {
            candidates: [
              {
                userId: service.id,
                name: service.name,
                email: service.email,
                hasGoogleLink: true,
              },
            ],
          },
        });
      if (path === "/api/v1/admin/users") return json({ success: true, users });
      if (path === "/api/v1/neture/admin/semi-franchises")
        return json({ success: true, data: [] });
      if (req.method() !== "GET") {
        writes.push(req.method() + " " + path);
        if (
          path === "/api/v1/admin/platform-accounts/service-user/super-admin"
        ) {
          if (grantFail)
            return json(
              { success: false, error: "대상 계정을 확인해 주세요." },
              400,
            );
          accounts = [
            platform,
            { ...service, roles: ["platform:super_admin"] },
          ];
          return json({ success: true, data: { changed: true } });
        }
        if (path === "/api/v1/admin/operator-assignments") {
          const body = req.postDataJSON();
          service.roles.push(body.role);
          return json({ success: true, data: { membershipPolicy: "CREATED" } });
        }
        if (path.includes("/role-assignments/")) {
          const id = path.split("/")[5],
            role = decodeURIComponent(path.split("/").pop()!);
          const user = users.find((x) => x.id === id);
          if (user) user.roles = user.roles.filter((x) => x !== role);
          return json({ success: true });
        }
      }
      return json({ success: false, error: "Unmocked fixture API" }, 404);
    },
  );
  return {
    writes,
    setHealthFail: (value: boolean) => {
      healthFail = value;
    },
    setGrantFail: (value: boolean) => {
      grantFail = value;
    },
  };
}
for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
])
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test("shows all current targets, evidence, failed refresh and retry without a false all-healthy result", async ({
      page,
    }, info) => {
      const api = await fixture(page),
        errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/admin/platform/hub");
      await expect(
        page.getByRole("heading", { name: "서비스 상태", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("article")).toHaveCount(12);
      await expect(page.getByText("HTTP 503", { exact: true })).toBeVisible();
      await expect(
        page.getByText("모든 서비스 정상", { exact: true }),
      ).toHaveCount(0);
      api.setHealthFail(true);
      await page.getByRole("button", { name: "상태 새로고침" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "조회하지 못했습니다" }),
      ).toBeVisible();
      api.setHealthFail(false);
      await page.getByRole("button", { name: "상태 새로고침" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "조회하지 못했습니다" }),
      ).toHaveCount(0);
      await page.screenshot({
        path: info.outputPath("service-health.png"),
        fullPage: true,
      });
      expect(api.writes).toEqual([]);
      expect(errors).toEqual([]);
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    });
    test("unifies old bookmarks, keeps service roles separate, preserves legacy revoke and grants a platform admin explicitly", async ({
      page,
    }, info) => {
      const api = await fixture(page);
      await page.goto("/users");
      await expect(page).toHaveURL(/\/operators$/, { timeout: 15000 });
      await expect(
        page.getByRole("heading", {
          name: "서비스 관리자·운영자",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "권한 할당", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("cell", { name: "합성 전체 관리자", exact: true }),
      ).toHaveCount(0);
      await page
        .getByText("기존·기타 권한 정리", { exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("heading", { name: "기존·기타 권한 정리", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("합성 기존 사용자", { exact: true }),
      ).toBeVisible();
      const oldRow = page
        .getByRole("row")
        .filter({ hasText: "member@example.invalid" });
      await oldRow.getByRole("button", { name: "더보기" }).click();
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: /권한 해제/ }).click();
      await expect(
        page.getByText("합성 기존 사용자", { exact: true }),
      ).toHaveCount(0);
      await page.goto("/admin/platform/accounts");
      await expect(page).toHaveURL(/\/settings\/admin-accounts$/);
      await expect(
        page
          .getByRole("table", { name: "전체 관리자 계정 목록" })
          .getByText("admin@example.invalid", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("service@example.invalid", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("kpa:store_owner", { exact: true }),
      ).toHaveCount(0);
      await page.getByLabel("전체 관리자 지정 대상 검색").fill("service");
      await page
        .getByRole("button", { name: "사용자 검색", exact: true })
        .click();
      await page
        .getByLabel("지정할 사용자", { exact: true })
        .selectOption("service-user");
      api.setGrantFail(true);
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: "전체 관리자 지정", exact: true })
        .click();
      await expect(page.locator("main").getByRole("alert")).toHaveText(
        "대상 계정을 확인해 주세요.",
      );
      await expect(
        page.getByText("전체 관리자 권한을 부여했습니다.", { exact: true }),
      ).toHaveCount(0);
      api.setGrantFail(false);
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: "전체 관리자 지정", exact: true })
        .click();
      await expect(
        page.getByText("전체 관리자 권한을 부여했습니다.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("cell", {
          name: "합성 서비스 담당 service@example.invalid",
        }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("cell", {
          name: "합성 서비스 담당 service@example.invalid",
        }),
      ).toBeVisible();
      await page.screenshot({
        path: info.outputPath("platform-accounts.png"),
        fullPage: true,
      });
      expect(api.writes.some((x) => x.includes("/role-assignments/"))).toBe(
        true,
      );
      expect(api.writes.filter((x) => x.includes("/super-admin"))).toHaveLength(
        2,
      );
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    });
  });
test("service-only users cannot reach either health or platform accounts", async ({
  page,
}) => {
  await fixture(page, ["community:admin"]);
  for (const path of [
    "/admin/platform/hub",
    "/settings/admin-accounts",
    "/users",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "접근 권한이 없습니다" }),
    ).toBeVisible();
  }
});
test("anonymous legacy bookmarks retain Google login", async ({ page }) => {
  await fixture(page, null);
  await page.goto("/users");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "관리자 로그인" }),
  ).toBeVisible();
});
