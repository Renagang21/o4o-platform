import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Local response fixtures only; never authenticates or writes to a real service.
const origin = process.env.STORE_PC_TEST_ORIGIN || "http://127.0.0.1:3031";
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const artifacts = await mkdtemp(join(tmpdir(), "store-pc-ux-"));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      serviceWorkers: "block",
    });
    const errors = [],
      writes = [],
      external = [];
    try {
      await context.addInitScript(() =>
        localStorage.setItem(
          "o4o_accessToken",
          "fixture-only-not-a-credential",
        ),
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url()),
          path = url.pathname;
        if (url.origin !== origin) {
          if (
            url.origin === "https://cdn.jsdelivr.net" &&
            request.method() === "GET"
          )
            return route.fulfill({ body: "", contentType: "text/css" });
          external.push(url.origin);
          return route.abort();
        }
        if (!path.startsWith("/api/")) return route.continue();
        if (request.method() !== "GET") {
          writes.push(request.method() + " " + path);
          return route.abort();
        }
        const ok = (data) => route.fulfill({ json: { success: true, data } });
        if (path.endsWith("/auth/me"))
          return ok({
            user: {
              id: "fixture-owner",
              name: "체험 경영자",
              status: "active",
              isEmailVerified: true,
              roles: ["neture:store_owner"],
              memberships: [{ serviceKey: "neture", status: "active" }],
            },
          });
        if (path.endsWith("/work-scope/accessible-stores"))
          return ok({
            stores: [
              {
                organizationId: "fixture-store",
                organizationName: "체험 공간",
                memberRole: "owner",
              },
            ],
          });
        if (path.endsWith("/work-scope/store-services"))
          return ok({
            status: "resolved",
            organizationId: "fixture-store",
            services: [],
            reason: null,
          });
        if (path.endsWith("/store/handled-products"))
          return route.fulfill({
            json: {
              success: true,
              data: {
                items: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
              },
            },
          });
        return route.fulfill({
          status: 404,
          json: { success: false, code: "NOT_FOUND" },
        });
      });
      await page.goto(origin + "/store/my-products");
      await page.getByText("제품 등록", { exact: true }).waitFor();
      await page
        .locator("summary")
        .filter({ hasText: /^제품 등록$/ })
        .click();
      await page
        .getByRole("button", { name: "O4O 제품에서 찾아 등록", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "직접 등록하기", exact: true })
        .waitFor();
      await page
        .getByRole("button", {
          name: "엑셀 상품 등록·AI 자료 준비",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "제품 진열 설정", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "새로고침", exact: true }).click();
      await page.screenshot({
        path: join(artifacts, `registration-${width}.png`),
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "horizontal overflow",
      );
      assert.deepEqual(writes, []);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      process.stdout.write(
        `PASS Store registration ${width}px; no writes, external calls or page errors\n`,
      );
    } finally {
      await context.close();
    }
  }
  process.stdout.write(`Artifacts: ${artifacts}\n`);
} finally {
  await browser.close();
}
