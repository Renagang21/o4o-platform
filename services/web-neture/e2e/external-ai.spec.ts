import { test, expect, type Page } from "@playwright/test";
async function fixture(page: Page, loggedIn = true) {
  if (loggedIn)
    await page.addInitScript(() =>
      localStorage.setItem("o4o_accessToken", "synthetic-browser-token"),
    );
  let revoked = false;
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      const json = (data: unknown, status = 200) =>
        route.fulfill({ json: data, status });
      if (path === "/api/v1/auth/me")
        return json({
          success: true,
          data: {
            user: {
              id: "fixture-user",
              email: "creator@example.invalid",
              name: "합성 사용자",
              roles: [],
              memberships: [],
              status: "active",
              isActive: true,
            },
          },
        });
      if (path === "/api/v1/auth/google/config")
        return json({
          success: true,
          data: { enabled: false, clientId: null },
        });
      if (path === "/api/v1/auth/social/accounts")
        return json({
          success: true,
          data: {
            providers: [],
            canManage: false,
            hasPassword: false,
            googleEnabled: false,
            kakaoEnabled: false,
          },
        });
      if (path === "/api/v1/auth/password")
        return json({
          success: true,
          data: { hasPassword: false, canManage: false },
        });
      if (path === "/api/external-ai/consent" && req.method() === "GET")
        return json({
          success: true,
          data: {
            clientName: "Fixture AI",
            scopes: ["o4o:read", "o4o:draft:write"],
            workspaces: [
              {
                id: "workspace-a",
                name: "합성 공급자 작업공간",
                writable: true,
                kind: "supplier",
              },
              {
                id: "store:fixture",
                name: "합성 약국",
                kind: "store",
                writable: true,
              },
              {
                id: "organization:fixture",
                name: "합성 협력조직",
                kind: "organization",
                writable: true,
              },
              {
                id: "community:fixture",
                name: "합성 게시판",
                kind: "community",
                writable: true,
              },
            ],
          },
        });
      if (path === "/api/external-ai/consent" && req.method() === "POST") {
        expect(req.postDataJSON()).toEqual({
          request: "fixture-request",
          workspaces: [
            "workspace-a",
            "store:fixture",
            "organization:fixture",
            "community:fixture",
          ],
          scopes: ["o4o:read", "o4o:draft:write"],
        });
        return json({
          success: true,
          data: {
            redirectUrl:
              "http://127.0.0.1:3102/fixture-callback?code=fixture-code",
          },
        });
      }
      if (path === "/api/external-ai/connections")
        return json({
          success: true,
          data: revoked
            ? []
            : [
                {
                  id: "connection-a",
                  clientName: "Fixture AI",
                  workspaceNames: ["합성 공급자 작업공간"],
                  scopes: ["o4o:read"],
                  expiresAt: "2026-11-01T00:00:00Z",
                },
              ],
        });
      if (
        path === "/api/external-ai/connections/connection-a" &&
        req.method() === "DELETE"
      ) {
        revoked = true;
        return json({ success: true });
      }
      if (path.includes("policy-acceptances"))
        return json({ success: true, data: { pending: [] } });
      return json({ success: true, data: [] });
    },
  );
  return () => revoked;
}
test("explicit consent selects named workspace and returns to client", async ({
  page,
}) => {
  await fixture(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/external-ai/connect?request=fixture-request");
  await expect(
    page.getByRole("heading", { name: "O4O 외부 AI 연결" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "선택한 범위로 연결" }),
  ).toBeDisabled();
  await page.getByLabel(/합성 공급자 작업공간/).check();
  for (const name of ["합성 약국", "합성 협력조직", "합성 게시판"])
    await page.getByLabel(new RegExp(name)).check();
  await page.getByLabel("초안 저장·수정").check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "선택한 범위로 연결" }).click();
  await expect(page).toHaveURL(/fixture-callback\?code=fixture-code/);
  expect(errors).toEqual([]);
});
test("my account revokes the connection", async ({ page }) => {
  const revoked = await fixture(page);
  await page.goto("/mypage/settings");
  const card = page.getByRole("region", { name: "외부 AI 계정 연결" });
  await expect(card.getByText("합성 공급자 작업공간")).toBeVisible();
  await card.getByRole("button", { name: "연결 해제" }).click();
  await expect(
    card.getByText("연결을 해제했습니다. 저장된 콘텐츠는 유지됩니다."),
  ).toBeVisible();
  expect(revoked()).toBe(true);
});
test("anonymous visitor uses the existing login entry", async ({ page }) => {
  await fixture(page, false);
  await page.goto("/external-ai/connect?request=fixture-request");
  await expect(page.getByRole("button", { name: "O4O 로그인" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "선택한 범위로 연결" }),
  ).toHaveCount(0);
});

test("community private draft keeps its format and publishes only on explicit user submission", async ({
  page,
}) => {
  await fixture(page);
  const id = "5ae1b092-6a63-4a55-b0a1-cad583079e66";
  let published = false;
  const post = () => ({
    id,
    title: "외부 AI 작성 초안",
    slug: "fixture-draft",
    status: published ? "publish" : "draft",
    authorId: "fixture-user",
    author: { id: "fixture-user", name: "합성 사용자" },
    content: [
      {
        id: "heading",
        type: "heading",
        content: "상품 안내 제목",
        attributes: { level: 2 },
      },
      {
        id: "body",
        type: "paragraph",
        content:
          "근거 자료를 확인하여 사용자가 게시하기 전에 검토할 내용입니다.",
      },
    ],
    createdAt: "2026-10-22T00:00:00Z",
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    allowComments: false,
    showContactOnPost: false,
  });
  // The real app chooses its community profile from hostname. Serve its local Vite assets at that origin.
  await page.route("https://community.neture.co.kr/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fallback();
    const response = await route.fetch({
      url: `http://127.0.0.1:3102${url.pathname}${url.search}`,
    });
    await route.fulfill({ response });
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/v1/communities/community/access")
        return route.fulfill({
          json: {
            success: true,
            data: {
              communityKey: "community",
              name: "커뮤니티",
              kind: "independent",
              allowed: true,
              canManage: false,
              canJoin: false,
              membershipStatus: "active",
            },
          },
        });
      if (path.startsWith("/api/v1/communities/community/forum/posts/")) {
        if (route.request().method() === "PUT") {
          expect(route.request().postDataJSON().status).toBe("publish");
          published = true;
        }
        return route.fulfill({ json: { success: true, data: post() } });
      }
      return route.fallback();
    },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `https://community.neture.co.kr/communities/community/forum/write?edit=${id}`,
  );
  const submit = page.getByRole("button", {
    name: "검토한 초안 게시",
    exact: true,
  });
  await expect(submit).toBeVisible();
  await expect(
    page
      .locator('[contenteditable="true"] h2')
      .filter({ hasText: "상품 안내 제목" }),
  ).toBeVisible();
  expect(published).toBe(false);
  await submit.click();
  await expect(page).toHaveURL(/\/post\/fixture-draft/);
  expect(published).toBe(true);
  expect(errors).toEqual([]);
});
