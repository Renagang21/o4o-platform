/** Real desktop/mobile Chromium, loopback API/PG, fixture-only login. No external account or browser profile. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

export async function startMailBrowserFixture(apiOrigin) {
  const require = createRequire(
    new URL("../../services/web-neture/package.json", import.meta.url),
  );
  const { createServer } = await import(
    new URL(
      "./dist/node/index.js",
      pathToFileURL(require.resolve("vite/package.json")),
    ).href
  );
  const old = process.env.VITE_API_BASE_URL;
  const oldCwd = process.cwd();
  process.chdir(
    fileURLToPath(new URL("../../services/web-neture/", import.meta.url)),
  );
  process.env.VITE_API_BASE_URL = apiOrigin;
  const vite = await createServer({
    root: fileURLToPath(new URL("../../services/web-neture/", import.meta.url)),
    configFile: fileURLToPath(
      new URL("../../services/web-neture/vite.config.ts", import.meta.url),
    ),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "silent",
  });
  await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  let browser;
  return {
    origin,
    async run({ check, user, account, worker }) {
      browser = await chromium.launch({
        executablePath: "/usr/bin/chromium",
        headless: true,
      });
      const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user, userId: user, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
      const profile = {
        id: user,
        name: "Fixture owner",
        email: "mail-owner@example.invalid",
        roles: [],
        role: "user",
        status: "active",
        isActive: true,
        isEmailVerified: true,
        accountAccess: "normal",
        serviceMemberships: [],
        pendingPolicyAcceptances: [],
      };
      async function scenario(viewport, label) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const errors = [],
          external = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await context.addInitScript(
          ({ token }) => {
            localStorage.setItem("o4o_accessToken", token);
            localStorage.setItem("o4o_refreshToken", token);
          },
          { token },
        );
        await context.route("**/*", async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (!["http:", "https:"].includes(url.protocol)) {
            await route.continue();
            return;
          }
          // The app's existing font stylesheet is replaced locally; no CDN connection or mailbox data leaves the fixture.
          if (
            url.origin === "https://cdn.jsdelivr.net" &&
            request.resourceType() === "stylesheet" &&
            url.pathname ===
              "/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          ) {
            await route.fulfill({
              status: 200,
              contentType: "text/css",
              body: "",
            });
            return;
          }
          if (![origin, apiOrigin].includes(url.origin)) {
            external.push(url.origin);
            await route.abort();
            return;
          }
          if (url.origin !== apiOrigin) {
            await route.continue();
            return;
          }
          if (url.pathname.startsWith("/api/personal-mail")) {
            await route.continue({
              headers: { ...request.headers(), "x-fixture-user": user },
            });
            return;
          }
          const payload = url.pathname.endsWith("/auth/me")
            ? { success: true, user: profile, data: { user: profile } }
            : {
                success: true,
                data: [],
                notifications: [],
                unreadCount: 0,
                total: 0,
              };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(payload),
          });
        });
        try {
          await page.goto(`${origin}/mypage/mail?accountId=${account.id}`, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          await page
            .getByRole("checkbox", { name: "notice@example.invalid" })
            .waitFor({ timeout: 30000 });
          await page
            .getByRole("link", { name: "개인 메일", exact: true })
            .click();
          assert.ok(page.url().includes("/mypage/mail"));
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 2,
          );
          assert.equal(overflow, false, `${label} horizontal overflow`);
          await page
            .getByRole("checkbox", { name: "notice@example.invalid" })
            .check();
          await page.getByLabel("처리 방식").selectOption("important");
          await page
            .getByRole("button", { name: "기존 메일 정리 검토" })
            .click();
          const confirm = page.getByRole("button", {
            name: /확인한 \d+건 실행/,
          });
          await confirm.waitFor();
          assert.equal(await confirm.isEnabled(), false);
          await page
            .getByRole("checkbox", {
              name: "대상·건수와 처리 방식을 확인했습니다.",
            })
            .check();
          const confirmed = page.waitForResponse(
            (response) =>
              response.url().endsWith("/confirm") &&
              response.request().method() === "POST" &&
              response.status() === 200,
          );
          await confirm.click();
          await confirmed;
          await worker.tick();
          await worker.tick();
          await worker.tick();
          const progress = page
            .getByRole("region", { name: "메일 작업 확인" })
            .getByRole("status");
          await progress
            .filter({ hasText: /^완료 [01] · 건너뜀 [01] · 실패 0 · 대기 0$/ })
            .waitFor({ timeout: 15000 });
          await page.screenshot({
            path: `/tmp/o4o-personal-mail-${label}.png`,
            fullPage: true,
          });
          assert.deepEqual(errors, [], `${label} page errors`);
          assert.deepEqual(
            external,
            [],
            `${label} external HTTP request blocked`,
          );
        } finally {
          await context.close();
        }
      }
      await check(
        "desktop Chromium exercises authenticated private mail navigation, review and execution",
        () => scenario({ width: 1440, height: 1000 }, "desktop"),
      );
      await check(
        "mobile Chromium exercises private mail review without horizontal overflow",
        () => scenario({ width: 390, height: 844 }, "mobile"),
      );
    },
    async close() {
      if (browser) await browser.close();
      await vite.close();
      process.chdir(oldCwd);
      if (old === undefined) delete process.env.VITE_API_BASE_URL;
      else process.env.VITE_API_BASE_URL = old;
    },
  };
}
