import { test, expect, type Page } from "@playwright/test";
async function fixture(page: Page, delegated: string[] | null, menuKeys?: string[]) {
  let current = delegated;
  let outage = false;
  const writes: string[] = [];
  const user = {
    id: "synthetic-central-operator",
    email: "operator@example.invalid",
    name: "합성 운영자",
    roles: ["supplier:operator", "funding:operator"],
    status: "active",
    isActive: true,
    isEmailVerified: true,
    authMethod: "google",
  };
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!["GET", "OPTIONS"].includes(route.request().method()))
        writes.push(path);
      if (path === "/api/v1/auth/status")
        return route.fulfill({
          json: { success: true, data: { authenticated: true, user } },
        });
      if (path === "/api/v1/auth/me")
        return route.fulfill({ json: { success: true, data: user } });
      if (path === "/api/v1/auth/google/config")
        return route.fulfill({
          json: { success: true, data: { enabled: false, clientId: null } },
        });
      if (path === "/api/v1/operator/central-access" && outage)
        return route.fulfill({
          status: 503,
          json: { success: false, code: "CENTRAL_ACCESS_UNAVAILABLE" },
        });
      if (path === "/api/v1/operator/central-access")
        return route.fulfill({
          status: current?.length ? 200 : 403,
          json: current?.length
            ? { success: true, data: { roles: current, menuKeys } }
            : { success: false, code: "CENTRAL_DELEGATION_REQUIRED" },
        });
      return route.fulfill({
        status: 403,
        json: { success: false, code: "FIXTURE_UNEXPECTED_API" },
      });
    },
  );
  return {
    writes,
    revoke: () => {
      current = [];
    },
    setOutage: (value: boolean) => {
      outage = value;
    },
  };
}
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`central entry ${viewport.width}`, () => {
    test.use({ viewport });
    test("uses explicit duties, blocks cross-duty URLs, and honors live revocation", async ({
      page,
    }) => {
      const state = await fixture(
        page,
        ["supplier:operator", "funding:operator"],
        ["supplier.members", "funding.members"],
      );
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "O4O 업무 운영" }),
      ).toBeVisible();
      const directory = page.getByRole("region", { name: "전체 업무 바로가기" });
      await directory.getByText("공급자", { exact: true }).click();
      await expect(
        directory.getByRole("link", { name: "공급 서비스 회원" }),
      ).toBeVisible();
      await directory.getByText("펀딩", { exact: true }).click();
      await expect(
        directory.getByRole("link", { name: "펀딩 서비스 회원" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "전체 관리자", exact: true }),
      ).toHaveCount(0);
      await page.goto("/operations/neture/pharmacies");
      await expect(page.locator("main [role=alert]")).toContainText(
        "위임되지 않은 업무",
      );
      await page.goto("/operations");
      state.revoke();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.locator("main [role=alert]")).toContainText(
        "유효한 업무 위임",
      );
      expect(state.writes).toEqual([]);
    });
    test("manual credential approval records evidence and reason in the central workflow", async ({
      page,
    }) => {
      await fixture(page, ["neture:operator"], ["neture.qualifications"]);
      const decisions: unknown[] = [];
      let pending = true;
      await page.route(
        "**/api/v1/qualifications/pharmacist/review**",
        async (route) => {
          if (route.request().method() === "POST") {
            decisions.push(route.request().postDataJSON());
            pending = false;
            return route.fulfill({
              json: { success: true, data: { status: "approved" } },
            });
          }
          if (new URL(route.request().url()).pathname.endsWith("22222222-2222-4222-8222-222222222222"))
            return route.fulfill({
              json: {
                success: true,
                data: {
                  member: { userId: "22222222-2222-4222-8222-222222222222", name: "합성 자격 신청자", nickname: "합성", email: "member@example.test", phone: null, accountStatus: "active", emailVerified: true, joinedAt: "2026-11-01", version: "2026-10-28T00:00:00.123456", hasPassword: false },
                  qualification: { licenseNumber: "SYNTHETIC-LICENSE", status: "pending", reason: null, approvedAt: null, reviewedBy: null, version: "2026-10-28T00:00:00.123456" },
                  registration: null, legacyLicense: null, pharmacies: [], history: [],
                  permissions: { edit: false, qualifications: true, pharmacies: false },
                },
              },
            });
          return route.fulfill({
            json: {
              success: true,
              data: {
                items: pending
                  ? [
                      {
                        userId: "22222222-2222-4222-8222-222222222222",
                        name: "합성 자격 신청자",
                        licenseNumber: "SYNTHETIC-LICENSE",
                        status: "pending",
                        reason: null,
                        version: "2026-10-28T00:00:00.123456",
                      },
                    ]
                  : [],
                hasNext: false,
              },
            },
          });
        },
      );
      await page.goto("/operations/neture/qualifications");
      await expect(
        page.getByRole("heading", { name: "회원 가입 승인" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "가입승인", exact: true }).click();
      const save = page.getByRole("dialog").getByRole("button", { name: "승인", exact: true });
      await expect(save).toBeDisabled();
      await page
        .getByLabel("신청자에게 안내할 확인·반려 사유")
        .fill("합성 면허 근거를 별도로 확인함");
      await expect(save).toBeDisabled();
      await page.getByLabel("신청자 본인의 면허 근거를 별도로 확인했습니다.").check();
      await save.click();
      await expect(
        page.getByText(
          "자격 검토 결과를 저장했습니다. 공통 계정 상태는 변경하지 않았습니다.",
        ),
      ).toBeVisible();
      expect(decisions).toEqual([
        {
          action: "approve",
          reason: "합성 면허 근거를 별도로 확인함",
          version: "2026-10-28T00:00:00.123456",
          licenseEvidenceChecked: true,
        },
      ]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
    const openCourseReview = async (page: Page) => {
      await fixture(page, ["lecture:operator"], ["lecture.courses"]);
      await page.route(
        "**/api/v1/lms/operator/courses/synthetic-course/review",
        (route) =>
          route.fulfill({
            json: {
              success: true,
              data: {
                course: {
                  title: "합성 강의 검토",
                  description: "심사 자료",
                  status: "pending_review",
                  isPaid: false,
                  requiresApproval: false,
                },
                curriculum: [],
              },
            },
          }),
      );
      await page.goto("/operations/lecture/courses/synthetic-course");
      await expect(
        page.getByRole("heading", { name: "합성 강의 검토" }),
      ).toBeVisible();
    };
    test("opens a delegated course detail route with its fixed courses area", async ({
      page,
    }) => {
      await openCourseReview(page);
      // Located by text on purpose: the next test records that this link is currently hidden.
      await expect(
        page.locator("main a", { hasText: /^목록$/ }),
      ).toHaveAttribute("href", "/operations/lecture/courses");
      await expect(page.locator("main [role=alert]")).toHaveCount(0);
    });
    test("KNOWN DEFECT: course review actions are visible to the operator", async ({
      page,
    }) => {
      // The global `.row-actions` rule in styles/o4o-table-fix.css hides these shared-screen actions.
      // Expected to fail until that is fixed; this then reports and test.fail() must be removed.
      test.fail();
      await openCourseReview(page);
      await expect(
        page.getByRole("button", { name: "승인(게시)" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "반려" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "목록", exact: true }),
      ).toBeVisible();
    });
    test("a temporary outage keeps the typed reason and an explicit revocation still closes the screen", async ({
      page,
    }) => {
      const state = await fixture(page, ["neture:operator"], ["neture.qualifications"]);
      const applicantId = "22222222-2222-4222-8222-222222222222";
      const version = "2026-10-28T00:00:00.123456";
      await page.route(
        "**/api/v1/qualifications/pharmacist/review**",
        (route) =>
          route.fulfill({
            json: {
              success: true,
              data: new URL(route.request().url()).pathname.endsWith(applicantId)
                ? {
                    member: { userId: applicantId, name: "합성 자격 신청자", nickname: "합성", email: "member@example.test", phone: null, accountStatus: "active", emailVerified: true, joinedAt: "2026-11-01", version, hasPassword: false },
                    qualification: { licenseNumber: "SYNTHETIC-LICENSE", status: "pending", reason: null, approvedAt: null, reviewedBy: null, version },
                    registration: null, legacyLicense: null, pharmacies: [], history: [],
                    permissions: { edit: false, qualifications: true, pharmacies: false },
                  }
                : {
                    items: [{ userId: applicantId, name: "합성 자격 신청자", licenseNumber: "SYNTHETIC-LICENSE", status: "pending", reason: null, version }],
                    hasNext: false,
                  },
            },
          }),
      );
      await page.goto("/operations/neture/qualifications");
      await page.getByRole("button", { name: "가입승인", exact: true }).click();
      const reason = page.getByLabel("신청자에게 안내할 확인·반려 사유");
      await reason.fill("작성 중인 합성 사유");
      const notice = page.getByText("현재 화면을 유지합니다");
      const recheck = () => page.evaluate(() => window.dispatchEvent(new Event("focus")));
      state.setOutage(true);
      await recheck();
      await expect(notice).toBeVisible();
      await expect(reason).toHaveValue("작성 중인 합성 사유");
      state.setOutage(false);
      await recheck();
      await expect(notice).toHaveCount(0);
      await expect(reason).toHaveValue("작성 중인 합성 사유");
      state.revoke();
      await recheck();
      await expect(page.locator("main [role=alert]")).toContainText("유효한 업무 위임");
      await expect(reason).toHaveCount(0);
      expect(state.writes).toEqual([]);
    });
    test("service roles alone cannot enter the central or platform administration", async ({
      page,
    }) => {
      await fixture(page, null);
      await page.goto("/operations");
      await expect(page.locator("main [role=alert]")).toContainText(
        "유효한 업무 위임",
      );
      await page.goto("/admin/platform");
      await expect(
        page.getByRole("heading", { name: "접근 권한이 없습니다" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "O4O 플랫폼 관리" }),
      ).toHaveCount(0);
    });
  });
}
