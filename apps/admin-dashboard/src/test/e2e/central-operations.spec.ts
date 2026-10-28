import { test, expect, type Page } from "@playwright/test";
async function fixture(page: Page, delegated: string[] | null) {
  let current = delegated;
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
      if (path === "/api/v1/operator/central-access")
        return route.fulfill({
          status: current?.length ? 200 : 403,
          json: current?.length
            ? { success: true, data: { roles: current } }
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
      const state = await fixture(page, [
        "supplier:operator",
        "funding:operator",
      ]);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "O4O 통합 운영" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "공급자 회원 관리" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "펀딩 회원 관리" }),
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
      await fixture(page, ["neture:operator"]);
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
        page.getByRole("heading", { name: "공통 약사 자격 검토" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "승인 검토" }).click();
      const save = page.getByRole("button", { name: "검토 결과 저장" });
      await expect(save).toBeDisabled();
      await page
        .getByLabel("신청자에게 안내할 확인·반려 사유")
        .fill("합성 면허 근거를 별도로 확인함");
      await expect(save).toBeDisabled();
      await page.getByRole("checkbox").check();
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
