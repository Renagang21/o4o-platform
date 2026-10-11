import { expect, test, type Page } from "@playwright/test";
const user = {
  id: "fixture-user",
  email: "fixture@example.test",
  name: "화면 검증 사용자",
  roles: [],
  memberships: [],
};
const stores = [
  {
    serviceKey: "kpa-society",
    organizationId: "fixture-store",
    name: "화면 검증 매장",
    memberRole: "owner",
  },
];
const community = {
  communityKey: "fixture-community",
  name: "화면 검증 커뮤니티",
  allowed: true,
  canParticipate: true,
  reason: null,
  entries: [
    { serviceKey: "community", path: "/communities/fixture-community/forum" },
  ],
};

async function prepare(page: Page) {
  const requests: string[] = [];
  await page.context().addInitScript(() => {
    localStorage.setItem("o4o_accessToken", "fixture-not-a-real-credential");
  });

  let failStats = false;
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && !url.pathname.startsWith("/api/"))
      return route.continue();
    if (!url.pathname.startsWith("/api/")) return route.abort();
    const path = url.pathname.replace("/api/v1", "");
    requests.push(path);
    let data = {};
    if (path === "/auth/me") data = { user };
    else if (path === "/auth/social/accounts")
      data = {
        providers: [],
        hasPassword: false,
        canManage: false,
        googleEnabled: false,
        kakaoEnabled: false,
      };
    else if (path === "/auth/password")
      data = { hasPassword: false, canManage: false };
    else if (path === "/auth/services")
      data = {
        services: [
          {
            key: "lecture",
            name: "Study",
            nameKo: "Study",
            domain: "study.neture.co.kr",
            basePath: "",
            description: "학습",
            joinEnabled: true,
            membership: { status: "active" },
          },
        ],
      };
    else if (path === "/neture/home/entry")
      data = {
        stores,
        branches: [],
        serviceStates: { supplier: { status: "none", source: "none" } },
      };
    else if (path === "/work-scope/operator-services") data = { services: [] };
    else if (path === "/communities") data = { communities: [community] };
    else if (path === "/communities/operating") data = { communities: [] };
    else if (path === "/notifications/unread-count") data = { count: 2 };
    else if (path === "/notifications")
      data = {
        notifications: [
          {
            id: "fixture-notice",
            title: "참여 상태 알림",
            isRead: false,
            createdAt: "2026-10-01T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 5,
        totalPages: 1,
        hasMore: false,
      };
    else if (path === "/communities/fixture-community/forum/posts")
      return route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: "fixture-post",
              slug: "fixture-post",
              title: "내가 작성한 글",
              status: "publish",
              createdAt: "2026-10-01T00:00:00Z",
            },
          ],
          total: 1,
        },
      });
    else if (path === "/kpa/pharmacy/analytics/marketing") {
      if (
        route.request().headers()["x-store-organization-id"] !== "fixture-store"
      )
        throw new Error("Missing selected store scope");
      if (failStats)
        return route.fulfill({ status: 503, json: { success: false } });
      data = {
        totalScans: 100,
        todayScans: 7,
        weeklyScans: 30,
        activeQrCount: 4,
        dailyScans: [{ date: "2026-10-01", count: 7 }],
      };
    } else if (path.endsWith("/footer-legal")) data = {};
    return route.fulfill({ json: { success: true, data } });
  });

  return {
    setFailure: (value: boolean) => {
      failStats = value;
    },
    requests,
  };
}

test("personal views and direct entries stay visible without page overflow", async ({
  page,
}, testInfo) => {
  await prepare(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, content] of [
    ["/mypage", "모아보기"],
    ["/mypage/services", "참여 서비스"],
    ["/mypage/activity", "내가 작성한 글"],
    ["/mypage/management", "QR 방문 현황"],
    ["/mypage/settings", "계정 보안 및 환경 설정을 관리합니다"],
  ]) {
    await page.goto(path);
    await expect(
      page
        .getByRole("heading", {
          name: path.endsWith("settings") ? "설정" : "My Home",
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByText(content).first()).toBeVisible();
    await expect(page.getByTestId("my-home-button").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (page.viewportSize()!.width < 768)
      await expect(
        page
          .getByRole("navigation", { name: "모바일 하단 메뉴" })
          .getByRole("button", { name: "My Home", exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${path.split("/")[2] || "overview"}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test("representative home summary opens the personal home", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My Home", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "모아보기 →" }).click();
  await expect(page).toHaveURL(/\/mypage$/);
});
test("statistics keep the selected store scope and recover from a failed read", async ({
  page,
}) => {
  const fixture = await prepare(page);
  fixture.setFailure(true);
  await page.goto("/mypage/management");
  await expect(
    page.getByRole("alert").filter({ hasText: "정보를 불러오지 못했습니다" }),
  ).toBeVisible();
  fixture.setFailure(false);
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await expect(page.locator("dd").filter({ hasText: /^7$/ })).toBeVisible();
});
