import { test, expect } from "@playwright/test";
test.use({
  launchOptions: { executablePath: process.env.O4O_TEST_CHROMIUM_PATH },
});
test.setTimeout(60000);

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test("external connection settings and examples survive refresh", async ({
      page,
    }) => {
      let revision = 0;
      let settings = {
        enabled: false,
        chatgptEnabled: false,
        targets: {
          supplier: { read: false, write: false },
          store: { read: false, write: false },
          organization: { read: false, write: false },
          community: { read: false, write: false },
        },
        examples: [] as Array<{
          id: string;
          name: string;
          purpose: string;
          prompt: string;
        }>,
      };
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
                authenticated: true,
                user: {
                  id: "fixture-admin",
                  email: "admin@example.invalid",
                  name: "합성 관리자",
                  roles: ["platform:super_admin"],
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
          if (path === "/api/ai/admin/external-connections") {
            if (req.method() === "PUT") {
              const body = req.postDataJSON();
              expect(body.revision).toBe(revision);
              settings = body.settings;
              revision++;
              return json({ success: true, data: { revision, settings } });
            }
            return json({
              success: true,
              data: {
                revision,
                settings,
                configured: true,
                mcpUrl: "https://api.example.invalid/api/external-ai/mcp",
                adapters: [
                  { kind: "supplier", ready: true },
                  { kind: "store", ready: false },
                  { kind: "organization", ready: false },
                  { kind: "community", ready: false },
                ],
                errors: [],
              },
            });
          }
          return json({ success: false }, 404);
        },
      );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/settings");
      await page
        .getByRole("button", { name: "외부 AI 연결", exact: true })
        .click();
      await page.getByLabel("외부 AI 연결 사용").check();
      await page.getByLabel("ChatGPT 연결 허용").check();
      await page.getByLabel("자료 조회", { exact: true }).check();
      await page.getByLabel("초안 저장·수정", { exact: true }).check();
      await page.getByRole("button", { name: "예제 추가" }).click();
      await page.getByLabel("예제 이름").fill("직원 안내");
      await page
        .getByLabel("예제 요청문")
        .fill("확인된 자료로 안내문을 작성해 주세요.");
      await page.getByRole("button", { name: "설정 저장" }).click();
      await expect(
        page.getByText("설정을 저장했습니다. 이후 요청부터 적용됩니다."),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole("button", { name: "외부 AI 연결", exact: true })
        .click();
      await expect(page.getByLabel("외부 AI 연결 사용")).toBeChecked();
      await expect(page.getByLabel("예제 이름")).toHaveValue("직원 안내");
      await page.getByRole("button", { name: "이 예제 삭제" }).click();
      await page.getByLabel("자료 조회", { exact: true }).uncheck();
      await expect(
        page.getByLabel("초안 저장·수정", { exact: true }),
      ).not.toBeChecked();
      await page.getByRole("button", { name: "설정 저장" }).click();
      await expect(
        page.getByText("설정을 저장했습니다. 이후 요청부터 적용됩니다."),
      ).toBeVisible();
      expect(settings.examples).toHaveLength(0);
      expect(settings.targets.supplier.write).toBe(false);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
