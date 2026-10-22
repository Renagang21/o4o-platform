import { test, expect, type Page } from "@playwright/test";
async function fixture(
  page: Page,
  roles: string[] | null = ["platform:super_admin"],
) {
  const control = {
    revision: 0,
    models: [
      {
        provider: "gemini",
        id: "gemini-fixture",
        name: "합성 기본 모델",
        capabilities: ["text", "image"],
      },
    ],
    deleted: [] as string[],
    selections: {} as Record<string, { provider: string; model: string }>,
    protectedModels: ["gemini:gemini-fixture"],
    targets: [
      {
        id: "home.chat",
        name: "홈 대화",
        providers: ["gemini", "openai"],
        capability: "text",
      },
    ],
    usageTargets: { "home.chat": "home.chat" },
  };
  let conflict = false;
  const writes: string[] = [];
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
      if (path === "/api/ai/admin/management")
        return json({
          success: true,
          data: {
            observedAt: "2026-10-21T02:00:00.000Z",
            notice: "합성 사용처·연결 조회",
            queryPolicyRead: "read",
            scopePolicyRead: "read",
            groups: [{ id: "neture", name: "Neture", serviceKey: "neture" }],
            usages: [
              {
                id: "home.chat",
                evidenceId: "A02",
                name: "홈 대화",
                group: "neture",
                capability: "텍스트",
                selection: "runtime",
                accounting: "unconnected",
                stop: "none",
                note: "합성 홈 대화",
                application: "unverified",
                configuration: {
                  state: "runtime",
                  model: "gemini-fixture",
                  provider: "gemini",
                  enabled: null,
                  description: "기존 설정",
                },
              },
            ],
            providers: ["openai", "gemini"].map((id) => ({
              id,
              name: id === "openai" ? "OpenAI" : "Gemini",
              support: "텍스트·이미지",
              credential: "present",
              databaseRead: "read",
              models: [],
              modelSource: "code",
            })),
            nonApiItems: [],
          },
        });
      if (path === "/api/ai/admin/management/models" && req.method() === "GET")
        return json({ success: true, data: control });
      if (
        path.startsWith("/api/ai/admin/management/") &&
        req.method() !== "GET"
      ) {
        writes.push(req.method() + " " + path);
        const body = req.postDataJSON();
        if (conflict) {
          conflict = false;
          control.revision++;
          return json(
            {
              success: false,
              error:
                "다른 관리자가 변경했습니다. 최신 목록을 다시 조회해 주세요.",
            },
            409,
          );
        }
        if (body.revision !== control.revision)
          return json({ success: false, error: "설정 충돌" }, 409);
        if (path.includes("/model-selections/"))
          control.selections = body.selection
            ? { "home.chat": body.selection }
            : {};
        else if (req.method() === "POST") control.models.push(body.model);
        else {
          const id = decodeURIComponent(path.split("/").pop()!);
          if (req.method() === "DELETE") {
            control.models = control.models.filter((x) => x.id !== id);
            control.deleted.push("openai:" + id);
          } else
            control.models = control.models.map((x) =>
              x.id === id ? body.model : x,
            );
        }
        control.revision++;
        control.protectedModels = [
          "gemini:gemini-fixture",
          ...Object.values(control.selections).map(
            (x) => x.provider + ":" + x.model,
          ),
        ];
        return json(
          { success: true, data: control },
          req.method() === "POST" ? 201 : 200,
        );
      }
      return json({ success: false, error: "Unmocked fixture API" }, 404);
    },
  );
  return {
    writes,
    setConflict: () => {
      conflict = true;
    },
  };
}
for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test("register, edit with conflict, select, refresh, unassign and delete models", async ({
      page,
    }, info) => {
      const api = await fixture(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/settings");
      await page
        .getByRole("tab", { name: "API·모델 연결", exact: true })
        .click();
      const openai = page
        .getByRole("article")
        .filter({
          has: page.getByRole("heading", { name: "OpenAI", exact: true }),
        });
      await openai.getByRole("button", { name: "모델 등록" }).click();
      let dialog = page.getByRole("dialog", { name: "모델 등록" });
      await expect(dialog.getByLabel("모델 ID", { exact: true })).toBeFocused();
      await dialog
        .getByLabel("모델 ID", { exact: true })
        .fill("gpt-e2e-fixture");
      await dialog
        .getByLabel("표시 이름", { exact: true })
        .fill("합성 신규 모델");
      await dialog.getByLabel("이미지·PDF", { exact: true }).check();
      await dialog.getByRole("button", { name: "저장", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(
        openai.getByText("합성 신규 모델", { exact: true }),
      ).toBeVisible();
      expect(api.writes.filter((x) => x.startsWith("POST"))).toHaveLength(1);
      await page
        .getByRole("button", { name: "gpt-e2e-fixture 수정", exact: true })
        .click();
      dialog = page.getByRole("dialog", { name: "모델 수정" });
      await dialog
        .getByLabel("표시 이름", { exact: true })
        .fill("합성 수정 모델");
      api.setConflict();
      await dialog.getByRole("button", { name: "저장", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText(
        "다른 관리자가 변경했습니다",
      );
      await expect(dialog.getByLabel("표시 이름", { exact: true })).toHaveValue(
        "합성 수정 모델",
      );
      await dialog.getByRole("button", { name: "취소", exact: true }).click();
      await page
        .getByRole("button", { name: "새로 불러오기", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "gpt-e2e-fixture 수정", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "gpt-e2e-fixture 수정", exact: true })
        .click();
      dialog = page.getByRole("dialog", { name: "모델 수정" });
      await dialog
        .getByLabel("표시 이름", { exact: true })
        .fill("합성 수정 모델");
      await dialog.getByRole("button", { name: "저장", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await page
        .getByRole("tab", { name: "사용처·현재 설정", exact: true })
        .click();
      await page.getByRole("button", { name: "홈 대화", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "홈 대화", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");
      const choice = page.getByLabel("홈 대화 · 사용 모델", { exact: true });
      await choice.selectOption("openai:gpt-e2e-fixture");
      await page
        .getByRole("button", { name: "사용 모델 저장", exact: true })
        .click();
      await expect(page.getByText(/사용 모델을 저장했습니다/)).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "홈 대화", exact: true }).click();
      await expect(choice).toHaveValue("openai:gpt-e2e-fixture");
      await page.screenshot({
        path: info.outputPath("selected-model.png"),
        fullPage: true,
      });
      await page
        .getByRole("tab", { name: "API·모델 연결", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "gpt-e2e-fixture 삭제", exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("tab", { name: "사용처·현재 설정", exact: true })
        .click();
      await choice.selectOption("");
      await page
        .getByRole("button", { name: "사용 모델 저장", exact: true })
        .click();
      await expect(page.getByText(/사용 모델을 저장했습니다/)).toBeVisible();
      await page
        .getByRole("tab", { name: "API·모델 연결", exact: true })
        .click();
      page.once("dialog", (event) => event.accept());
      await page
        .getByRole("button", { name: "gpt-e2e-fixture 삭제", exact: true })
        .click();
      await expect(
        page.getByText("모델을 삭제했습니다.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole("tab", { name: "API·모델 연결", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "gpt-e2e-fixture 수정", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "gemini-fixture 삭제", exact: true }),
      ).toBeDisabled();
      await page.screenshot({
        path: info.outputPath("model-catalog.png"),
        fullPage: true,
      });
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(0);
    });
  });
}
test("service operator cannot enter model management", async ({ page }) => {
  await fixture(page, ["neture:operator"]);
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "접근 권한이 없습니다" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "모델 등록" })).toHaveCount(0);
});
test("anonymous model management retains the Google login boundary", async ({
  page,
}) => {
  await fixture(page, null);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "관리자 로그인", exact: true }),
  ).toBeVisible();
});
