/** Synthetic browser coverage only. All API and outbound requests are intercepted. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const output = process.env.O4O_UI_SMOKE_OUTPUT || "/tmp/o4o-ui-shell-smoke";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium" }
    : {}),
  headless: true,
});
const results = [];
const directory = [
  { key: "lecture", membership: { status: "active" } },
  { key: "supplier", membership: { status: "active" } },
  { key: "funding", membership: { status: "pending" } },
];
const stores = ["A", "B"].map((name, i) => ({
  organizationId: `00000000-0000-4000-8000-00000000000${i + 1}`,
  organizationName: `합성 매장 ${name}`,
  memberRole: "owner",
}));
const user = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "합성 사용자",
  email: "synthetic@example.test",
  roles: ["kpa:store_owner", "supplier:supplier"],
  memberships: [{ serviceKey: "lecture", status: "active" }],
  status: "active",
};
const slides = ["합성 홍보 첫 화면", "합성 홍보 두 번째 화면"].map(
  (title, i) => ({
    id: `synthetic-${i}`,
    title,
    description: "운영자가 검토한 합성 홍보 소재입니다.",
    eyebrow: "서비스 소식",
    imageUrl: "",
    linkUrl: "",
    linkText: "",
    kind: "service",
    sponsor: "",
    startsAt: "",
    endsAt: "",
    enabled: true,
  }),
);

try {
  for (const width of [1280, 390]) {
    for (const [app, port, path] of [
      ["neture", 4300, "/"],
      ["community-shell", 4300, "/contact"],
      ["lecture", 4301, "/courses"],
      ["store", 4302, "/"],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion:
          app === "neture" && width === 1280 ? "no-preference" : "reduce",
      });
      await context.addInitScript(() =>
        localStorage.setItem("o4o_accessToken", "synthetic-browser-session"),
      );
      const page = await context.newPage();
      const failures = [],
        handoffs = [];
      page.on("pageerror", (error) => failures.push(error.message));
      await page.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (
          url.hostname === "127.0.0.1" &&
          [4300, 4301, 4302].includes(Number(url.port))
        )
          return route.continue();
        const headers = {
          "access-control-allow-origin": request.headers().origin || "*",
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "*",
        };
        if (request.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        if (url.pathname === "/handoff")
          return route.fulfill({
            contentType: "text/html; charset=utf-8",
            body: "<main>합성 서비스 이동 완료</main>",
          });
        if (!url.pathname.startsWith("/api/v1/")) return route.abort();
        const endpoint = url.pathname.slice("/api/v1".length);
        let data = {
          items: [],
          courses: [],
          total: 0,
          notifications: [],
          unreadCount: 0,
        };
        if (endpoint === "/auth/me") data = { user };
        else if (endpoint === "/auth/services") data = { services: directory };
        else if (endpoint === "/work-scope/accessible-stores")
          data = { stores };
        else if (endpoint === "/work-scope/operator-services")
          data = { services: [] };
        else if (endpoint === "/neture/home/entry")
          data = {
            serviceStates: { supplier: { status: "active" } },
            stores: [],
            branches: [],
            businesses: [
              { key: "pharmacy", name: "약국 경영지원", canParticipate: true, membershipStatus: null },
              { key: "carepharm", name: "만성질환관리", canParticipate: true, membershipStatus: "active" },
            ],
            cooperatives: [],
          };
        else if (endpoint === "/lms/courses") data = [];
        else if (endpoint === "/communities") data = { communities: [] };
        else if (endpoint.startsWith("/home-presentation/"))
          data = { enabled: true, slides, promotions: [] };
        else if (endpoint === "/auth/handoff") {
          const body = request.postDataJSON();
          handoffs.push(body);
          const host =
            body.targetWorkspace === "store"
              ? "store"
              : body.targetServiceKey === "lecture"
                ? "study"
                : body.targetServiceKey === "kpa-society"
                  ? "pharmacy"
                  : body.targetServiceKey;
          data = {
            targetUrl: `https://${host}.neture.co.kr/handoff?returnTo=${encodeURIComponent(body.returnPath)}`,
          };
        } else if (endpoint.includes("footer-legal")) data = null;
        await route.fulfill({ headers, json: { success: true, data } });
      });
      await page.goto(`http://127.0.0.1:${port}${path}`);
      if (app === "neture" && width === 1280) {
        await page
          .getByRole("heading", { name: "합성 홍보 첫 화면", exact: true })
          .waitFor();
        await page
          .getByRole("heading", { name: "합성 홍보 두 번째 화면", exact: true })
          .waitFor({ timeout: 12000 });
        await page
          .getByRole("button", { name: "자동 넘김 정지", exact: true })
          .click();
        await page.waitForTimeout(8500);
        assert.equal(
          await page
            .getByRole("heading", {
              name: "합성 홍보 두 번째 화면",
              exact: true,
            })
            .count(),
          1,
        );
      }
      const trigger = page.getByRole("button", {
        name: "서비스·공간",
        exact: true,
      });
      await trigger.waitFor();
      await page.waitForFunction(
        () => !document.querySelector(".o4o-switcher-trigger")?.disabled,
      );
      await trigger.click();
      const panel = page.getByRole("region", { name: "서비스·공간 전환" });
      await panel
        .getByRole("heading", { name: "내 업무공간", exact: true })
        .waitFor();
      assert.equal(
        await panel.getByText("내 매장에서 이용할 매장을 선택합니다.").count(),
        1,
      );
      assert.equal(
        await panel.getByText("신청 중", { exact: true }).count(),
        1,
      );
      const bounds = await panel.boundingBox();
      assert(
        bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
        "switcher must fit viewport",
      );
      const joinedServices = panel.getByRole("heading", { name: "이용 중인 서비스", exact: true }).locator("+ ul");
      await joinedServices.getByRole("button", { name: "O4O 약국 경영지원 이용 중", exact: true }).waitFor();
      await joinedServices.getByRole("button", { name: "만성질환관리 이용 중", exact: true }).waitFor();
      await panel.getByRole("textbox", { name: "서비스 검색" }).fill("공급자");
      assert.equal(
        await panel.getByText("O4O 강의 · 교육·학습", { exact: true }).count(),
        0,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await trigger.evaluate((node) => node === document.activeElement),
        true,
      );
      await page.locator(".o4o-service-footer").waitFor();
      if (app === "lecture")
        assert.equal(
          await page
            .getByText("목록을 불러오지 못했습니다.", { exact: true })
            .count(),
          0,
        );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        "page must not scroll horizontally",
      );
      if (app !== "neture")
        await page.waitForFunction(() => {
          const header = document.querySelector("header");
          return (
            header &&
            Number.parseFloat(
              document.documentElement.style.getPropertyValue(
                "--o4o-global-header-height",
              ),
            ) === Math.ceil(header.getBoundingClientRect().height)
          );
        });
      if (app === "lecture" && width === 390)
        assert(
          (await page.locator("header > .brand").boundingBox()).height < 40,
          "mobile brand must not break into vertical characters",
        );
      await page.screenshot({
        path: `${output}/${app}-${width}.png`,
        fullPage: true,
      });
      await trigger.click();
      await panel
        .getByRole("heading", { name: "이용 중인 서비스", exact: true })
        .waitFor();
      const handoffService = width === 1280 ? "lecture" : "kpa-society";
      await panel.getByRole("textbox", { name: "서비스 검색" }).fill(width === 1280 ? "강의" : "약국 경영지원");
      await panel
        .getByRole("button", {
          name: width === 1280 ? "O4O 강의 · 교육·학습 이용 중" : "O4O 약국 경영지원 이용 중",
          exact: true,
        })
        .first()
        .click();
      await page.getByText("합성 서비스 이동 완료").waitFor();
      assert.deepEqual(handoffs.at(-1), {
        targetServiceKey: handoffService,
        returnPath: "/",
      });
      assert.deepEqual(failures, []);
      results.push({
        app,
        width,
        result: "PASS",
        evidence:
          "search, multi-role/store, pending state, focus, viewport, footer, handoff",
      });
      console.log("PASS", app, width);
      await context.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
