import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

// Local isolated browser only. No real accounts, production API or payment calls.
const origin = process.env.PARTNER_TEST_ORIGIN || "http://localhost:3011";
const target = new URL(origin);
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname),
  "Only loopback smoke targets are allowed.",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const contexts = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== target.origin) {
      errors.push(`Unexpected external request: ${route.request().url()}`);
      await route.abort();
    } else await route.continue();
  });
  const visit = async (id) => {
    await page.goto(`${origin}/?mode=local#${id}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
  };
  await visit("home");
  assert.equal(
    await page.getByRole("heading", { level: 1 }).textContent(),
    "홍보를 함께 만드는 공간",
  );
  await page.screenshot({ path: "/tmp/partner-desktop.png", fullPage: true });
  await visit("proposals");
  await page.getByLabel("사업자·브랜드", { exact: true }).fill("테스트 브랜드");
  await page
    .getByLabel("홍보 제안 제목", { exact: true })
    .fill("생활 제품 콘텐츠");
  await page.getByLabel("활동 분야", { exact: true }).fill("라이프스타일");
  await page
    .getByLabel("제품·홍보 소개", { exact: true })
    .fill("브라우저 검증용 제품 정보");
  await page
    .getByLabel("제품·서비스 주소", { exact: true })
    .fill("https://example.com/product?existing=1");
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await page
    .getByRole("heading", { name: "생활 제품 콘텐츠", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "생활 제품 콘텐츠", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "기록 수정" });
  await editor
    .getByLabel("제품·홍보 소개", { exact: true })
    .fill("수정한 제품 정보");
  await editor.getByRole("button", { name: "변경 저장", exact: true }).click();
  await page.getByText("수정한 제품 정보", { exact: true }).waitFor();
  await page.getByLabel("검색", { exact: true }).fill("없는 검색어");
  await page.getByText("검색 결과가 없습니다", { exact: true }).waitFor();
  await visit("creators");
  await page.getByLabel("활동 이름", { exact: true }).fill("테스트 크리에이터");
  await page
    .getByLabel("활동 분야·소개", { exact: true })
    .fill("생활 제품 콘텐츠");
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await page
    .getByRole("heading", { name: "테스트 크리에이터", exact: true })
    .waitFor();
  await visit("studio");
  await page
    .getByLabel("제품·서비스 이름", { exact: true })
    .fill("테스트 제품");
  await page.getByLabel("제공자·브랜드", { exact: true }).fill("테스트 브랜드");
  await page
    .getByLabel("전달할 사실 정보", { exact: true })
    .fill("확인한 사실만 작성합니다.");
  await page
    .getByRole("button", { name: "구성안 만들기", exact: true })
    .click();
  await page.getByLabel("구성안 편집", { exact: true }).waitFor();
  await page
    .getByLabel("구성안 편집", { exact: true })
    .fill("직접 편집한 홍보 콘텐츠");
  await page
    .getByRole("button", { name: "자료실에 저장", exact: true })
    .click();
  await page
    .getByLabel("홍보 제안", { exact: true })
    .selectOption({ label: "생활 제품 콘텐츠" });
  await page
    .getByLabel("홍보자", { exact: true })
    .selectOption({ label: "테스트 크리에이터 · 인스타그램" });
  await page
    .getByRole("button", { name: "홍보 링크 만들기", exact: true })
    .click();
  assert(
    new URL(
      await page.getByLabel("생성한 홍보 링크", { exact: true }).inputValue(),
    ).searchParams.has("utm_content"),
  );
  await visit("library");
  await page
    .getByRole("heading", {
      name: "테스트 제품 · 인스타그램 초안",
      exact: true,
    })
    .waitFor();
  const textDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "문구 내려받기 ↓", exact: true })
    .click();
  assert((await textDownload).suggestedFilename().endsWith(".txt"));
  await visit("activities");
  await page
    .getByLabel("홍보 제안", { exact: true })
    .selectOption({ label: "생활 제품 콘텐츠" });
  await page
    .getByLabel("홍보자", { exact: true })
    .selectOption({ label: "테스트 크리에이터 · 인스타그램" });
  await page
    .getByLabel("게시물 주소", { exact: true })
    .fill("https://example.com/post");
  await page.getByLabel("게시일", { exact: true }).fill("2026-01-01");
  await page.getByLabel("직접 확인한 조회수 (선택)", { exact: true }).fill("0");
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await page
    .getByText("홍보자 입력 · 자동 검증하지 않은 정보", { exact: true })
    .waitFor();
  await visit("settlements");
  await page
    .getByLabel("홍보 제안", { exact: true })
    .selectOption({ label: "생활 제품 콘텐츠" });
  await page
    .getByLabel("홍보자", { exact: true })
    .selectOption({ label: "테스트 크리에이터 · 인스타그램" });
  await page
    .getByLabel("지급 내역 설명", { exact: true })
    .fill("외부에서 정한 활동비");
  await page
    .getByLabel("당사자가 정한 금액 (원)", { exact: true })
    .fill("25000");
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "외부 지급 내역 기록", exact: true })
    .click();
  await page.getByText("외부 지급 기록됨", { exact: true }).waitFor();
  const csvDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "정산 명세 CSV ↓", exact: true })
    .click();
  assert((await csvDownload).suggestedFilename().endsWith(".csv"));
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "자료 백업 ↓", exact: true }).click();
  assert((await backupDownload).suggestedFilename().endsWith(".json"));
  const state = await context.storageState();
  assert.equal(
    JSON.parse(
      state.origins[0].localStorage.find(
        (s) => s.name === "o4o.partner.workspace.v1",
      ).value,
    ).settlements[0].status,
    "paid",
  );

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    storageState: state,
  });
  contexts.push(mobile);
  const phone = await mobile.newPage();
  phone.on("pageerror", (error) => errors.push(error.message));
  for (const width of [360, 390, 768, 1440]) {
    await phone.setViewportSize({ width, height: 900 });
    for (const id of [
      "home",
      "proposals",
      "creators",
      "library",
      "studio",
      "activities",
      "settlements",
      "reports",
    ]) {
      await phone.goto(`${origin}/?mode=local#${id}`);
      await phone.getByRole("heading", { level: 1 }).waitFor();
      const overflow = await phone.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      assert(!overflow, `Horizontal overflow on ${id}, width ${width}`);
    }
  }
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(`${origin}/?mode=local#home`);
  await phone.screenshot({ path: "/tmp/partner-mobile.png", fullPage: true });
  await phone
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "홍보 제안" })
    .click();
  await phone.getByLabel("검색", { exact: true }).fill("생활 제품");
  await phone
    .getByRole("heading", { name: "생활 제품 콘텐츠", exact: true })
    .waitFor();
  assert.deepEqual(errors, [], "Browser errors or unexpected external calls");
  console.log(
    "PASS: create/reload/search, content editing/library download, UTM, activity, manual settlement, CSV/JSON exports, mobile navigation, 32 responsive page checks, no browser errors.",
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
