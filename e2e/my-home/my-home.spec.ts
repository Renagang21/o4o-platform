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
  {
    serviceKey: "kpa-society",
    organizationId: "fixture-store-second",
    name: "두 번째 검증 매장",
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
  let failFunding = false;
  let denyStudy = false;
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === "https://study.neture.co.kr" &&
      url.pathname === "/handoff"
    )
      return route.fulfill({
        contentType: "text/html",
        body: "<h1>Study 이동 검증 화면</h1>",
      });
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
    else if (path === "/lms/enrollments/me") {
      if (denyStudy)
        return route.fulfill({
          status: 403,
          json: { success: false, code: "MEMBERSHIP_NOT_ACTIVE" },
        });
      const limit = Number(url.searchParams.get("limit"));
      const current = Number(url.searchParams.get("page"));
      if (url.searchParams.has("serviceKey") || url.searchParams.has("userId"))
        throw new Error("Unexpected caller-controlled LMS scope");
      return route.fulfill({
        json: {
          success: true,
          data: Array.from({ length: 11 }, (_, i) => ({
            id: `enrollment-${i}`,
            courseId: `course-${i}`,
            course: { title: `검증 강의 ${i}` },
            status: "in_progress",
            progressPercentage: i === 0 ? 0 : undefined,
          })).slice((current - 1) * limit, current * limit),
          pagination: {
            total: 11,
            page: current,
            limit,
            totalPages: Math.ceil(11 / limit),
          },
        },
      });
    } else if (path === "/api/market-trial/my-participations") {
      if (failFunding)
        return route.fulfill({ status: 503, json: { success: false } });
      data = Array.from({ length: 11 }, (_, i) => ({
        id: `participation-${i}`,
        trialId: `trial-${i}`,
        trial: { title: `검증 펀딩 ${i}`, status: "recruiting" },
        settlementStatus: "offline_review",
      }));
    } else if (path === "/communities") data = { communities: [community] };
    else if (path === "/communities/operating") data = { communities: [] };
    else if (path === "/notifications/unread-count") data = { count: 2 };
    else if (path === "/notifications") {
      const current = Number(url.searchParams.get("page"));
      const limit = Number(url.searchParams.get("limit"));
      const records = Array.from({ length: 11 }, (_, i) => ({
        id: `fixture-notice-${i}`,
        title: i === 0 ? "참여 상태 알림" : `검증 알림 ${i}`,
        isRead: i % 2 === 1,
        createdAt: "2026-10-01T00:00:00Z",
      })).filter(
        (item) =>
          !url.searchParams.has("isRead") ||
          item.isRead === (url.searchParams.get("isRead") === "true"),
      );
      data = {
        notifications: records.slice((current - 1) * limit, current * limit),
        total: records.length,
        page: current,
        limit,
        totalPages: Math.ceil(records.length / limit),
        hasMore: current * limit < records.length,
      };
    } else if (path === "/communities/fixture-community/forum/posts")
      return route.fulfill({
        json: {
          success: true,
          data: Array.from({ length: 11 }, (_, i) => ({
            id: `fixture-post-${i}`,
            slug: `fixture-post-${i}`,
            title: i === 0 ? "내가 작성한 글" : `검증 작성 글 ${i}`,
            status: i === 10 ? "draft" : "publish",
            createdAt: "2026-10-01T00:00:00Z",
          })).slice(
            (Number(url.searchParams.get("page")) - 1) *
              Number(url.searchParams.get("limit")),
            Number(url.searchParams.get("page")) *
              Number(url.searchParams.get("limit")),
          ),
          total: 11,
        },
      });
    else if (path === "/kpa/pharmacy/analytics/marketing") {
      if (
        !stores.some(
          (store) =>
            store.organizationId ===
            route.request().headers()["x-store-organization-id"],
        )
      )
        throw new Error("Missing selected store scope");
      if (failStats)
        return route.fulfill({ status: 503, json: { success: false } });
      data = {
        totalScans: 100,
        todayScans:
          route.request().headers()["x-store-organization-id"] ===
          "fixture-store-second"
            ? 9
            : 7,
        weeklyScans: 30,
        activeQrCount: 4,
        dailyScans: [
          { date: "2026-10-01", count: 0 },
          { date: "2026-10-03", count: 7 },
        ],
      };
    } else if (path.endsWith("/footer-legal")) data = {};
    return route.fulfill({ json: { success: true, data } });
  });

  return {
    setFailure: (value: boolean) => {
      failStats = value;
    },
    requests,
    setFundingFailure: (value: boolean) => {
      failFunding = value;
    },
    setStudyDenied: (value: boolean) => {
      denyStudy = value;
    },
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
test("overview displays actual service activities and bounded summaries", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/mypage");
  await expect(page.getByText("학습 중 · 진도 0%")).toBeVisible();
  await expect(page.getByText("검증 강의 2", { exact: true })).toBeVisible();
  await expect(page.getByText("검증 강의 3", { exact: true })).toHaveCount(0);
  await expect(page.getByText("검증 펀딩 2", { exact: true })).toBeVisible();
  await expect(page.getByText("검증 펀딩 3", { exact: true })).toHaveCount(0);
  await expect(page.getByText("내가 작성한 글", { exact: true })).toBeVisible();
  await expect(page.locator("dd").filter({ hasText: /^7$/ })).toBeVisible();
  await page
    .getByRole("link", { name: "학습·펀딩 참여 이력 더 보기 →" })
    .click();
  await expect(page).toHaveURL(/\/mypage\/services$/);
});
test("service history pages and Study handoff continue at the original course", async ({
  page,
}) => {
  const fixture = await prepare(page);
  await page.goto("/mypage/services");
  const study = page.getByRole("region", { name: "Study 학습 현황" });
  const funding = page.getByRole("region", { name: "Funding 참여 현황" });
  await expect(study.getByText("검증 강의 0", { exact: true })).toBeVisible();
  await study.getByRole("button", { name: "다음", exact: true }).click();
  await expect(study.getByText("검증 강의 10", { exact: true })).toBeVisible();
  await expect(study.getByText("검증 강의 0", { exact: true })).toHaveCount(0);
  await funding.getByRole("button", { name: "다음", exact: true }).click();
  await expect(
    funding.getByText("검증 펀딩 10", { exact: true }),
  ).toBeVisible();
  await expect(
    funding.getByRole("link", { name: "검증 펀딩 10 펀딩 보기" }),
  ).toHaveAttribute(
    "href",
    "https://funding.neture.co.kr/market-trial/trial-10",
  );
  await page.route("**/api/v1/auth/handoff", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      targetServiceKey: "lecture",
      returnPath: "/courses/course-10",
    });
    return route.fulfill({
      json: {
        success: true,
        data: {
          targetUrl:
            "https://study.neture.co.kr/handoff?token=fixture&returnTo=%2Fcourses%2Fcourse-10",
        },
      },
    });
  });
  await study.getByRole("button", { name: "검증 강의 10 강의 보기" }).click();
  await expect(page).toHaveURL(
    "https://study.neture.co.kr/handoff?token=fixture&returnTo=%2Fcourses%2Fcourse-10",
  );
  expect(
    fixture.requests.filter((path) => path === "/lms/enrollments/me").length,
  ).toBe(2);
});
test("a denied Study read and failed Funding read remain distinct from empty histories", async ({
  page,
}) => {
  const fixture = await prepare(page);
  fixture.setStudyDenied(true);
  fixture.setFundingFailure(true);
  await page.goto("/mypage/services");
  await expect(page.getByText(/Study 이용 권한을 확인/)).toBeVisible();
  const funding = page.getByRole("region", { name: "Funding 참여 현황" });
  await expect(funding.getByRole("alert")).toBeVisible();
  await expect(page.getByText("수강 이력이 없습니다.")).toHaveCount(0);
  await expect(page.getByText("참여한 펀딩이 없습니다.")).toHaveCount(0);
  fixture.setStudyDenied(false);
  fixture.setFundingFailure(false);
  await page.getByRole("button", { name: "다시 확인", exact: true }).click();
  await funding
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await expect(page.getByText("검증 강의 0", { exact: true })).toBeVisible();
  await expect(page.getByText("검증 펀딩 0", { exact: true })).toBeVisible();
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
test("notification history pages and server filters remain usable on mobile", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/mypage");
  const notices = page.locator("#my-home-notifications");
  await expect(notices.getByText("검증 알림 4")).toBeVisible();
  await expect(notices.getByText("검증 알림 5", { exact: true })).toHaveCount(
    0,
  );
  await notices.getByRole("button", { name: "알림 전체보기" }).click();
  await notices.getByRole("button", { name: "다음", exact: true }).click();
  await expect(
    notices.getByText("검증 알림 10"),
  ).toBeVisible();
  await notices.getByLabel("알림 상태").selectOption("unread");
  await expect(
    notices.getByText("참여 상태 알림"),
  ).toBeVisible();
  await expect(notices.getByText("검증 알림 1", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    notices.getByRole("button", { name: "다음", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("community history keeps own drafts and pages inside My Home", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/mypage/activity");
  const community = page.getByRole("region", {
    name: "화면 검증 커뮤니티 내 글",
  });
  await expect(
    community.getByText("검증 작성 글 9", { exact: true }),
  ).toBeVisible();
  await community.getByRole("button", { name: "다음", exact: true }).click();
  await expect(
    community.getByText("검증 작성 글 10", { exact: true }),
  ).toBeVisible();
  await expect(community.getByText("임시 저장", { exact: true })).toBeVisible();
  await expect(
    community.getByRole("link", { name: "검증 작성 글 10" }),
  ).toHaveAttribute(
    "href",
    "/communities/fixture-community/forum/post/fixture-post-10",
  );
});
test("management preserves selected store between views and plots returned dates only", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/mypage");
  await page.getByLabel("통계를 볼 매장").selectOption("fixture-store-second");
  await expect(page.locator("dd").filter({ hasText: /^9$/ })).toBeVisible();
  await page.getByRole("link", { name: "매장 방문 통계 더 보기 →" }).click();
  await expect(page.getByLabel("통계를 볼 매장")).toHaveValue(
    "fixture-store-second",
  );
  const trend = page.getByRole("region", { name: "일별 QR 방문 추이" });
  await expect(trend.getByText("0건", { exact: true })).toBeVisible();
  await expect(trend.getByText("7건", { exact: true })).toBeVisible();
  await expect(trend.getByText("10-02", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("통계를 볼 매장")).toHaveValue(
    "fixture-store-second",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
