import { test, expect, type Page } from "@playwright/test";
async function fixture(
  page: Page,
  roles: string[] | null = ["platform:super_admin"],
) {
  let paid = true;
  const writes: Array<{ method: string; path: string; body: any }> = [];
  const features = [
    { key: "tablet", label: "태블릿" },
    { key: "store-staff-support", label: "매장 직원 지원" },
  ];
  const business = {
    id: "business",
    key: "carepharm",
    name: "합성 협력사업",
    status: "active",
    registration_conditions: "합성 조건",
    operators: [],
    roleOperators: [],
    community_key: null,
    payment_receiver_key: null,
  };
  const targets = [
    { key: "default", name: "기본 제공 · 전체 약국", features: [] as string[] },
    { key: "paid", name: "유료회원", features: ["tablet"] },
    {
      key: "business:carepharm",
      name: "협력사업 · 합성 협력사업",
      features: ["store-staff-support"],
      status: "active",
      business,
    },
  ];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname;
      const body =
        request.method() === "GET" ? undefined : request.postDataJSON();
      const json = (data: unknown, status = 200) =>
        route.fulfill({ status, json: data });
      if (request.method() !== "GET")
        writes.push({ method: request.method(), path, body });
      if (path === "/api/v1/auth/status")
        return json({
          success: true,
          data: {
            authenticated: roles !== null,
            user: roles && {
              id: "fixture-admin",
              email: "admin@example.invalid",
              name: "합성 관리자",
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
      if (path === "/api/v1/neture/admin/service-feature-policies")
        return json({ success: true, data: { features, targets } });
      if (
        path.startsWith("/api/v1/neture/admin/service-feature-policies/") &&
        request.method() === "PUT"
      ) {
        const target = targets.find(
          (item) => item.key === decodeURIComponent(path.split("/").pop()!),
        );
        if (!target) return json({ success: false }, 404);
        target.features = body.features;
        return json({ success: true, data: {} });
      }
      if (
        path === "/api/v1/neture/admin/semi-franchises" &&
        request.method() === "POST"
      ) {
        targets.push({
          key: `business:${body.key}`,
          name: body.name,
          features: [],
        });
        return json({ success: true, data: { key: body.key } }, 201);
      }
      if (path === "/api/v1/neture/admin/member-paid-entitlements")
        return json({
          success: true,
          data: {
            id: "member",
            email: "member@example.invalid",
            name: "합성 회원",
            active: paid,
            endsAt: null,
          },
        });
      if (
        path === "/api/v1/neture/admin/member-paid-entitlements/member" &&
        request.method() === "PUT"
      ) {
        paid = body.active;
        return json({ success: true, data: { active: paid } });
      }
      if (
        path === "/api/v1/neture/admin/member-paid-entitlements/member/access"
      )
        return json({
          success: true,
          data: {
            paidEligible: paid,
            accountActive: true,
            accountStatus: "active",
            pharmacies: [
              {
                id: "store",
                name: "합성 약국",
                pharmacyStatus: "active",
                memberships: [
                  {
                    key: "carepharm",
                    name: "합성 협력사업",
                    status: "active",
                    businessStatus: "active",
                  },
                ],
                features: [
                  {
                    key: "tablet",
                    label: "태블릿",
                    allowed: paid,
                    sources: paid
                      ? [
                          {
                            type: "member",
                            key: "paid-member",
                            name: "경영자 유료회원",
                          },
                        ]
                      : [],
                  },
                  {
                    key: "store-staff-support",
                    label: "매장 직원 지원",
                    allowed: true,
                    sources: [
                      {
                        type: "semi-franchise",
                        key: "carepharm",
                        name: "합성 협력사업",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        });
      return json({ success: false, error: "Unmocked local fixture API" }, 404);
    },
  );
  return writes;
}
for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test("consolidated settings edit, modal registration and member entitlement work after old bookmark refresh", async ({
      page,
    }) => {
      const writes = await fixture(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/admin/pharmacy-service-settings");
      await expect(
        page.getByRole("tab", { name: "기능 설정" }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByRole("link", { name: "약국 협력사업", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("현장 고객 요구 집계", { exact: true }),
      ).toHaveCount(0);
      await page.getByRole("tab", { name: "기능 설정" }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("tab", { name: "회원 이용 자격" })).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowLeft");
      await expect(page.getByRole("tab", { name: "기능 설정" })).toHaveAttribute("aria-selected", "true");
      const target = page.getByRole("combobox", { name: "설정 대상" });
      await target.selectOption("paid");
      await expect(
        page.getByRole("checkbox", { name: "태블릿" }),
      ).toBeChecked();
      await page.getByRole("checkbox", { name: "매장 직원 지원" }).check();
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(
        page.getByText(
          "제공 기능을 저장했습니다. 다음 이용 자격 확인부터 적용됩니다.",
        ),
      ).toBeVisible();
      await target.selectOption("business:carepharm");
      await expect(page.getByText("사업 정보 · 합성 협력사업")).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "사업 이름" }),
      ).not.toBeVisible();
      const add = page.getByRole("button", { name: "사업 추가" });
      await add.click();
      const dialog = page.getByRole("dialog", { name: "사업 추가" });
      await expect(
        dialog.getByRole("combobox", { name: "대상 서비스" }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(add).toBeFocused();
      await add.click();
      await dialog
        .getByRole("combobox", { name: "대상 서비스" })
        .selectOption("drugstore");
      await expect(dialog.getByRole("checkbox")).toHaveCount(0);
      await dialog.getByRole("button", { name: "사업 등록" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(target).toHaveValue("business:drugstore");
      await expect(
        page.getByRole("checkbox", { name: "태블릿" }),
      ).not.toBeChecked();
      await page.getByRole("tab", { name: "회원 이용 자격" }).click();
      await page.getByLabel("회원 이메일").fill("member@example.invalid");
      await page.getByRole("button", { name: "회원 조회" }).click();
      await expect(page.getByText("유효한 유료 자격: 있음")).toBeVisible();
      await expect(page.getByText(/합성 협력사업 가입으로 제공/)).toBeVisible();
      await page.getByLabel("유료 자격 활성", { exact: true }).uncheck();
      await page.getByRole("button", { name: "유료 자격 저장" }).click();
      await expect(page.getByText("유효한 유료 자격: 없음")).toBeVisible();
      await expect(page.getByText(/합성 협력사업 가입으로 제공/)).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath("member-access.png"),
        fullPage: true,
      });
      await page.goto("/admin/semi-franchises?register=carepharm");
      await expect(page).toHaveURL(
        /\/admin\/pharmacy-service-settings\?register=carepharm$/,
      );
      await expect(target).toHaveValue("business:carepharm");
      await page.reload();
      await expect(target).toHaveValue("business:carepharm");
      expect(writes.filter((item) => item.method === "POST")).toHaveLength(1);
      expect(
        writes.find((item) => item.method === "POST")!.body,
      ).not.toHaveProperty("serviceFeatures");
      expect(writes.filter((item) => item.method === "PUT")).toHaveLength(2);
      expect(errors).toEqual([]);
      expect(
        await page
          .locator("main")
          .last()
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath("feature-settings.png"),
        fullPage: true,
      });
    });
  });
}
test("service operator cannot enter the consolidated settings through the old bookmark", async ({
  page,
}) => {
  await fixture(page, ["neture:operator"]);
  await page.goto("/admin/semi-franchises?register=carepharm");
  await expect(
    page.getByRole("heading", { name: "접근 권한이 없습니다" }),
  ).toBeVisible();
});
test("anonymous old bookmarks keep the Google login boundary", async ({
  page,
}) => {
  await fixture(page, null);
  await page.goto("/admin/semi-franchises");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "관리자 로그인", exact: true }),
  ).toBeVisible();
});
