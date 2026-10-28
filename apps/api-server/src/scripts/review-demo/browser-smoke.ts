import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

export async function createReviewBrowser() {
  const artifacts = await mkdtemp(join(tmpdir(), "o4o-review-artifacts-"));
  const browser = await chromium.launch({
    executablePath:
      process.env.REVIEW_DEMO_CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const blocked = new Set<string>();
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      ["13000", "13001", "13002"].includes(url.port)
    )
      return route.continue();
    blocked.add(url.hostname);
    await route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  async function login(target: Page) {
    let stage = "email";
    try {
      await target
        .getByRole("textbox", { name: "이메일", exact: true })
        .fill("reviewer@example.invalid");
      stage = "password";
      await target
        .getByLabel("비밀번호", { exact: true })
        .fill(process.env.REVIEW_DEMO_PASSWORD!);
      stage = "submit";
      const response = target
        .waitForResponse(
          (r) =>
            r.url().includes("/auth/email/login") &&
            r.request().method() === "POST",
        )
        .catch(() => null);
      await target
        .locator("form")
        .filter({
          has: target.getByRole("textbox", { name: "이메일", exact: true }),
        })
        .getByRole("button", { name: "로그인", exact: true })
        .click();
      stage = "response";
      const completed = await response;
      assert.ok(completed);
      assert.equal(completed.status(), 200);
    } catch {
      await target
        .screenshot({
          path: join(artifacts, "login-failure.png"),
          mask: [target.locator("input")],
        })
        .catch(() => {});
      console.log(
        JSON.stringify({
          uiLoginStage: stage,
          buttons: await target
            .getByRole("button", { name: "로그인", exact: true })
            .count(),
        }),
      );
      // Do not emit Playwright action logs that might contain a password fill value.
      throw new Error(`REVIEW_BROWSER_LOGIN_FAILED at ${stage}`);
    }
  }
  return {
    page,
    async loginAndCheckQualification(origin: string) {
      await page.goto(`${origin}/login`);
      await login(page);
      await page.goto(`${origin}/mypage/settings`);
      await page.getByText("현재 상태: 승인", { exact: true }).waitFor();
      console.log(
        "PASS browser: reviewer login and synthetic qualification status",
      );
    },
    async approve(location: string, callback: string, write: boolean) {
      try {
        await page.route(`${callback}**`, (route) =>
          route.fulfill({
            contentType: "text/html",
            body: "Review OAuth callback received",
          }),
        );
        await page.goto(location);
        await page
          .getByRole("checkbox", { name: /심사용 테스트 약국/ })
          .check();
        if (write)
          await page.getByRole("checkbox", { name: "초안 저장·수정" }).check();
        await Promise.all([
          page.waitForURL((url) => url.pathname === "/review-callback"),
          page.getByRole("button", { name: "선택한 범위로 연결" }).click(),
        ]);
        console.log("PASS browser: actual workspace and scope consent");
        return new URL(page.url());
      } catch {
        throw new Error("REVIEW_BROWSER_CONSENT_FAILED");
      }
    },
    async openDraft(openUrl: string, title: string) {
      const editor = await context.newPage();
      await editor.goto(openUrl);
      await editor.waitForLoadState("networkidle");
      await editor
        .locator(
          '#pm-title,input[type=email],main.center-card a[href^="/login"]',
        )
        .first()
        .waitFor();
      const loginLink = editor.locator('main.center-card a[href^="/login"]');
      if (await loginLink.count()) {
        await loginLink.click();
        await editor
          .getByRole("textbox", { name: "이메일", exact: true })
          .waitFor();
      }
      if (
        await editor
          .getByRole("textbox", { name: "이메일", exact: true })
          .count()
      )
        await login(editor);
      await editor.waitForURL(
        /\/store\/library\/production-materials\/[^/]+\/edit/,
      );
      await editor.locator("#pm-title").waitFor();
      assert.equal(await editor.locator("#pm-title").inputValue(), title);
      assert.equal(
        new URL(editor.url()).origin,
        process.env.REVIEW_DEMO_STORE_ORIGIN,
      );
      assert.ok(
        ![...blocked].some((host) =>
          ["api.neture.co.kr", "store.neture.co.kr", "neture.co.kr"].includes(
            host,
          ),
        ),
      );
      await editor.screenshot({
        path: join(artifacts, "private-draft-editor.png"),
        fullPage: true,
      });
      console.log(
        "PASS browser: saved private draft opens in review Store editor; production requests blocked",
      );
    },
    async close() {
      await browser.close();
    },
  };
}
