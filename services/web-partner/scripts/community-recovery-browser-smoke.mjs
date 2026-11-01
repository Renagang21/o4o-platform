import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

// Isolated response fixtures only. No real accounts, API, database or writes.
const origin = process.env.PARTNER_TEST_ORIGIN || "http://127.0.0.1:3011";
const target = new URL(origin);
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname),
  "Loopback target required",
);
const artifacts = await mkdtemp(join(tmpdir(), "partner-recovery-browser-"));
const board = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "자유 소통",
  description: "경험 나누기",
  operator_only: false,
  revision: 0,
};
const member = {
  id: "00000000-0000-4000-8000-000000000010",
  displayName: "회원 A",
};
const base = "/api/v1/partner-support/community";
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
    try {
      const page = await context.newPage();
      const errors = [],
        writes = [],
        external = [];
      let retrying = false;
      let listRecovered = false;
      let detailRecovered = false;
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          path = url.pathname;
        if (url.origin !== target.origin) {
          external.push(url.origin);
          return route.abort();
        }
        if (!path.startsWith("/api/")) return route.continue();
        if (req.method() !== "GET") {
          writes.push(`${req.method()} ${path}`);
          return route.abort();
        }
        const ok = (data) => route.fulfill({ json: { success: true, data } });
        const fail = () =>
          route.fulfill({
            status: 503,
            json: { success: false, code: "PARTNER_UNAVAILABLE" },
          });
        if (path === "/api/v1/auth/me") return ok({ user: member });
        if (path === `${base}/boards`) return retrying ? ok([board]) : fail();
        if (path === `${base}/policies`) return ok([]);
        if (path === `${base}/membership`)
          return retrying ? ok({ status: "active", operator: false }) : fail();
        if (path === `${base}/boards/${board.id}/posts`)
          return listRecovered ? ok({ items: [], count: 0, page: 1 }) : fail();
        if (path === `${base}/posts/${board.id}`)
          return !detailRecovered
            ? fail()
            : ok({
                id: board.id,
                board_id: board.id,
                title: "복구한 글",
                body: "복구한 본문",
                author_id: member.id,
                author_name: member.displayName,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
                revision: 0,
                state: "published",
                pinned: false,
                comments: [],
              });
        return route.fulfill({
          status: 404,
          json: { success: false, code: "NOT_FOUND" },
        });
      });
      await page.goto(`${origin}/community`);
      await page
        .getByRole("button", { name: "가입 상태 다시 확인", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "커뮤니티 가입하기", exact: true })
          .count(),
        0,
      );
      retrying = true;
      await page
        .getByRole("button", { name: "가입 상태 다시 확인", exact: true })
        .click();
      await page
        .getByRole("button", { name: "게시글 다시 불러오기", exact: true })
        .waitFor();
      listRecovered = true;
      await page
        .getByRole("button", { name: "게시글 다시 불러오기", exact: true })
        .click();
      await page.getByRole("button", { name: "글쓰기", exact: true }).waitFor();
      await page
        .getByRole("navigation", { name: "커뮤니티 게시판" })
        .getByRole("link", { name: board.name, exact: true })
        .waitFor();
      await page.goto(`${origin}/community/posts/${board.id}`);
      await page
        .getByRole("button", { name: "게시글 다시 불러오기", exact: true })
        .waitFor();
      detailRecovered = true;
      await page
        .getByRole("button", { name: "게시글 다시 불러오기", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "복구한 글", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow ${width}`,
      );
      assert.deepEqual(writes, []);
      assert.deepEqual(external, []);
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: join(artifacts, `recovered-${width}.png`),
        fullPage: true,
      });
      process.stdout.write(
        `PASS community recovery ${width}px; no writes, external requests or page errors\n`,
      );
    } finally {
      await context.close();
    }
  }
  process.stdout.write(`Artifacts: ${artifacts}\n`);
} finally {
  await browser.close();
}
