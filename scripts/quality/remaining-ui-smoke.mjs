/** Synthetic-only: real service origins are served from local Vite; all APIs are fixtures. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Start partner/coop/pharmacy/neture Vite on 4311/4310/4313/4312, using a fixture API origin.
const output = await mkdtemp(join(tmpdir(), "o4o-remaining-ui-"));
console.log("Evidence directory:", output);
const sites = {
  "partner.neture.co.kr": 4311,
  "pharmcoop.neture.co.kr": 4310,
  "megapharm.neture.co.kr": 4313,
  "neture.co.kr": 4312,
  "carepharm.neture.co.kr": 4314,
};
const id = "00000000-0000-4000-8000-000000000001";
const user = {
  id,
  name: "합성 회원",
  displayName: "합성 회원",
  email: "fixture@example.test",
  status: "active",
  roles: [],
  memberships: [],
};
const coop = {
  id,
  slug: "fixture-coop",
  businessKey: "fixture-business",
  name: "합성 협동조합",
  introduction: "검증 전용",
  eligibilityDescription: "독립 가입",
};
const fixtures = {
  "/auth/me": { user },
  "/auth/services": { services: [] },
  "/work-scope/accessible-stores": { stores: [] },
  "/work-scope/operator-services": { services: [] },
  "/communities": { communities: [] },
  "/neture/home/entry": {
    serviceStates: { supplier: { status: "none" } },
    stores: [],
    branches: [],
    cooperatives: [],
    businesses: [],
  },
  "/neture/cooperatives": [coop],
  "/neture/cooperatives/me": {
    userId: id,
    memberships: [],
    cooperativeOperators: [],
    federationOperators: [],
  },
  "/partner-support/community/membership": {
    status: "active",
    operator: false,
  },
  "/store/invitations": [],
  "/neture/cooperative-management/my-cooperatives": [],
  "/auth/handoff/exchange": {
    tokens: {
      accessToken: "synthetic-browser-session",
      refreshToken: "synthetic-refresh",
    },
  },
};
function mockApiData(endpoint, request, handoffs) {
  if (Object.hasOwn(fixtures, endpoint)) return fixtures[endpoint];
  if (/\/boards$|\/policies$/.test(endpoint)) return [];
  if (endpoint.endsWith("/footer-legal"))
    return {
      companyName: `합성 법정정보 ${endpoint.includes("partner-support") ? "Partner" : endpoint.includes("pharmcoop") ? "연합회" : "사업"}`,
    };
  if (endpoint === "/auth/handoff") {
    const body = request.postDataJSON();
    handoffs.push(body);
    const hosts = {
      neture: "neture.co.kr",
      "partner-support": "partner.neture.co.kr",
      pharmcoop: "pharmcoop.neture.co.kr",
      megapharm: "megapharm.neture.co.kr",
      "kpa-society": "pharmacy.neture.co.kr",
      carepharm: "carepharm.neture.co.kr",
    };
    return {
      targetUrl: `https://${hosts[body.targetServiceKey] || "store.neture.co.kr"}/handoff?token=fixture&returnTo=${encodeURIComponent(body.returnPath)}`,
    };
  }
  if (endpoint.includes("/home-presentation/"))
    return { enabled: true, slides: [], promotions: [] };
  return {
    items: [],
    courses: [],
    total: 0,
    notifications: [],
    unreadCount: 0,
  };
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
});
const results = [];
try {
  for (const width of [1280, 390]) {
    for (const [host, path] of [
      ["partner.neture.co.kr", "/community?page=2#recent"],
      ["pharmcoop.neture.co.kr", "/cooperatives/mine?tab=joined"],
      ["megapharm.neture.co.kr", "/"],
      ["carepharm.neture.co.kr", "/#news"],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(() =>
        localStorage.setItem("o4o_accessToken", "synthetic-browser-session"),
      );
      const handoffs = [],
        failures = [];
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(30000);
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          message.text().includes("ErrorBoundary")
        )
          failures.push("React error boundary");
      });
      await context.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const headers = {
          "access-control-allow-origin": request.headers().origin || "*",
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "*",
        };
        if (request.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        if (url.pathname.startsWith("/api/v1/")) {
          const endpoint = url.pathname.slice(7);
          const data = mockApiData(endpoint, request, handoffs);
          return route.fulfill({ headers, json: { success: true, data } });
        }
        const port = sites[url.hostname];
        if (port) {
          const response = await route.fetch({
            url: `http://127.0.0.1:${port}${url.pathname}${url.search}`,
            maxRetries: 2,
          });
          return route.fulfill({ response });
        }
        return route.abort();
      });
      await page.goto(`https://${host}${path}`);
      const switcher = page.getByRole("button", {
        name: "서비스·공간",
        exact: true,
      });
      await switcher.waitFor();
      await page.getByTestId("my-home-button").first().waitFor();
      assert.equal(
        await page.locator("header.sticky.top-0").count(),
        1,
        "one global header",
      );
      const account = page.getByRole("button", {
        name: "계정 메뉴",
        exact: true,
      });
      await account.click();
      await page
        .getByRole("button", { name: "O4O 로그아웃", exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      assert(await account.evaluate((node) => node === document.activeElement));
      await switcher.click();
      const panel = page.getByRole("region", { name: "서비스·공간 전환" });
      await panel
        .getByRole("textbox", { name: "서비스 검색" })
        .fill("협동조합");
      const bounds = await panel.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      await page.keyboard.press("Escape");
      assert(
        await switcher.evaluate((node) => node === document.activeElement),
      );
      await page.locator(".o4o-service-footer").waitFor();
      await page
        .getByText(
          `합성 법정정보 ${host.startsWith("partner") ? "Partner" : host.startsWith("pharmcoop") ? "연합회" : "사업"}`,
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "no horizontal page overflow",
      );
      await page.screenshot({
        path: join(output, `${host}-${width}.png`),
        fullPage: true,
      });
      if (host.startsWith("partner")) {
        await page.goto(`https://${host}/workspace?mode=local#assets`);
        await page.getByRole('button', { name: /자료 백업/ }).waitFor();
        assert.equal(await page.locator('header').count(), 1, 'workspace retains one global header');
        await page.goto(`https://${host}${path}`);
        await page.getByTestId('my-home-button').first().waitFor();
      }
      if (host.startsWith("pharmcoop")) {
        await page.goto(`https://${host}/fixture-coop`);
        await page
          .getByRole("complementary", { name: "합성 협동조합 이용 안내" })
          .getByText("합성 법정정보 사업", { exact: true })
          .waitFor();
        await page.getByText("합성 법정정보 연합회", { exact: true }).waitFor();
        await page.goto(`https://${host}${path}`);
        await page.getByTestId("my-home-button").first().waitFor();
      }
      await page.getByTestId("my-home-button").first().click();
      await page.waitForURL(/^https:\/\/neture\.co\.kr\/mypage/);
      const returnLabel = host.startsWith("partner")
        ? "O4O Partner로 돌아가기"
        : host.startsWith("pharmcoop")
          ? "협동조합으로 돌아가기"
          : host.startsWith("carepharm")
            ? "CarePharm로 돌아가기"
            : "메가팜으로 돌아가기";
      await page
        .getByRole("button", { name: returnLabel, exact: true })
        .waitFor();
      const expectedSource = host.startsWith("partner")
        ? "partner"
        : host.startsWith("pharmcoop")
          ? "cooperative"
          : host.startsWith("carepharm")
            ? "carepharm"
            : "megapharm";
      assert.equal(
        new URLSearchParams(page.url().split("?")[1]).get("from"),
        expectedSource,
      );
      if (path !== "/")
        assert.equal(new URL(page.url()).searchParams.get("returnPath"), path);
      try {
        await page
          .getByRole("button", { name: returnLabel, exact: true })
          .click();
      } catch (error) {
        await page.screenshot({
          path: join(output, "return-failure.png"),
          fullPage: true,
        });
        throw error;
      }
      await page.waitForURL(`https://${host}${path}`);
      assert.equal(handoffs.length, 2, "both directions preserve the session");
      assert.equal(handoffs[1].returnPath, path);
      await page.reload();
      await page.getByTestId("my-home-button").first().waitFor();
      assert.deepEqual(failures, []);
      results.push({
        host,
        width,
        result: "PASS",
        checks:
          "shared chrome, focus, viewport, authenticated deep roundtrip, reload",
      });
      console.log("PASS", host, width);
      await context.close();
    }
  }
  await writeFile(
    join(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
