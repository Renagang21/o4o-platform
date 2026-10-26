import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// The backend uses a test-only identity adapter and real isolated PostgreSQL.
// This test makes no claim about real-account login or production deployment.
const origin = "http://127.0.0.1:3011";
const artifacts = await mkdtemp(join(tmpdir(), "partner-server-browser-"));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const contexts = [],
  errors = [];
try {
  const actor = async (name, width = 1440) => {
    const c = await browser.newContext({
      viewport: { width, height: 1000 },
      acceptDownloads: true,
    });
    contexts.push(c);
    await c.addCookies([
      {
        name: "partner_test_actor",
        value: name,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${origin}/#home`);
    await p
      .getByRole("button", { name: "공동공간 만들기", exact: true })
      .waitFor();
    return p;
  };
  const owner = await actor("owner"),
    editor = await actor("editor", 390),
    viewer = await actor("viewer", 390);
  await owner
    .getByLabel("새 공동공간 이름", { exact: true })
    .fill("테스트 홍보 공동공간");
  await owner
    .getByRole("button", { name: "공동공간 만들기", exact: true })
    .click();
  await owner
    .getByRole("heading", { level: 1, name: "홍보를 함께 만드는 공간" })
    .waitFor();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "홍보 제안", exact: false })
    .click();
  await owner
    .getByLabel("사업자·브랜드", { exact: true })
    .fill("테스트 브랜드");
  await owner
    .getByLabel("홍보 제안 제목", { exact: true })
    .fill("공유할 제품 소개");
  await owner.getByLabel("활동 분야", { exact: true }).fill("생활");
  await owner
    .getByLabel("제품·홍보 소개", { exact: true })
    .fill("서버에 보관할 제품 정보");
  await owner
    .getByLabel("제품·서비스 주소", { exact: true })
    .fill("https://example.com/product");
  await owner.getByRole("button", { name: "저장하기", exact: true }).click();
  await owner
    .getByRole("heading", { name: "공유할 제품 소개", exact: true })
    .waitFor();
  await owner
    .getByRole("button", { name: "공동공간 관리", exact: true })
    .click();
  await owner.getByLabel("초대 권한", { exact: true }).selectOption("editor");
  await owner
    .getByRole("button", { name: "일회용 초대 링크 만들기", exact: true })
    .click();
  const editorLink = await owner
    .getByLabel("새 초대 링크", { exact: true })
    .inputValue();
  const editorToken = editorLink.split("#join=")[1];
  assert(editorToken?.length === 64);
  await editor.getByLabel("초대 코드", { exact: true }).fill(editorToken);
  await editor
    .getByRole("button", { name: "초대로 참여하기", exact: true })
    .click();
  await editor
    .getByRole("heading", { level: 1, name: "홍보를 함께 만드는 공간" })
    .waitFor();
  await editor
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "홍보 제안", exact: false })
    .click();
  await editor
    .getByRole("heading", { name: "공유할 제품 소개", exact: true })
    .waitFor();
  await editor
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "홍보자", exact: false })
    .click();
  await editor
    .getByLabel("활동 이름", { exact: true })
    .fill("공동공간 크리에이터");
  await editor
    .getByLabel("활동 분야·소개", { exact: true })
    .fill("직접 만든 콘텐츠");
  await editor.getByRole("button", { name: "저장하기", exact: true }).click();
  await editor
    .getByRole("heading", { name: "공동공간 크리에이터", exact: true })
    .waitFor();
  await owner
    .getByRole("button", { name: "서버 자료 다시 불러오기", exact: true })
    .click();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "정산 내역", exact: false })
    .click();
  await owner
    .getByLabel("홍보 제안", { exact: true })
    .selectOption({ label: "공유할 제품 소개" });
  await owner
    .getByLabel("홍보자", { exact: true })
    .selectOption({ label: "공동공간 크리에이터 · 인스타그램" });
  await owner
    .getByLabel("지급 내역 설명", { exact: true })
    .fill("외부에서 정한 활동비");
  await owner
    .getByLabel("당사자가 정한 금액 (원)", { exact: true })
    .fill("25000");
  await owner.getByRole("button", { name: "저장하기", exact: true }).click();
  await owner
    .getByLabel("정산 목록")
    .getByText("미지급 기록", { exact: true })
    .waitFor();
  await owner.getByRole("button", { name: "수정", exact: true }).click();
  const settlementEditor = owner.getByRole("dialog", { name: "기록 수정" });
  await settlementEditor
    .getByLabel("지급 내역 설명", { exact: true })
    .fill("수정한 활동비 내역");
  await settlementEditor
    .getByRole("button", { name: "변경 저장", exact: true })
    .click();
  await owner
    .getByText("공동공간 크리에이터 · 수정한 활동비 내역", { exact: true })
    .waitFor();
  await owner
    .getByRole("button", { name: "공동공간 관리", exact: true })
    .click();
  await owner.getByLabel("초대 권한", { exact: true }).selectOption("viewer");
  await owner
    .getByRole("button", { name: "일회용 초대 링크 만들기", exact: true })
    .click();
  const viewerLink = await owner
    .getByLabel("새 초대 링크", { exact: true })
    .inputValue();
  await viewer.goto(viewerLink); // Also checks fragment-token capture and removal from history.
  await viewer
    .getByRole("button", { name: "초대로 참여하기", exact: true })
    .click();
  await viewer.getByRole("heading", { level: 1 }).waitFor();
  await viewer
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "홍보 제안", exact: false })
    .click();
  await viewer
    .getByRole("heading", { name: "공유할 제품 소개", exact: true })
    .waitFor();
  assert.equal(
    await viewer.getByRole("button", { name: "저장하기", exact: true }).count(),
    0,
  );
  assert.equal(
    await viewer.getByRole("button", { name: "수정", exact: true }).count(),
    0,
  );
  assert(!viewer.url().includes("join="));
  await editor
    .getByRole("button", { name: "서버 자료 다시 불러오기", exact: true })
    .click();
  await editor
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "정산 내역", exact: false })
    .click();
  await editor
    .getByLabel("정산 목록")
    .getByText("미지급 기록", { exact: true })
    .waitFor();
  assert.equal(
    await editor.getByRole("button", { name: "저장하기", exact: true }).count(),
    0,
  );
  assert(
    await editor
      .getByRole("button", { name: "외부 지급 내역 기록", exact: true })
      .isDisabled(),
  );
  owner.once("dialog", (d) => d.accept());
  await owner
    .getByRole("button", { name: "외부 지급 내역 기록", exact: true })
    .click();
  await owner.getByText("외부 지급 기록됨", { exact: true }).waitFor();
  if (
    await owner
      .getByRole("heading", { name: "최근 변경 이력", exact: true })
      .isVisible()
  ) {
    await owner
      .getByRole("button", { name: "공동공간 관리", exact: true })
      .click();
    await owner
      .getByRole("heading", { name: "최근 변경 이력", exact: true })
      .waitFor({ state: "hidden" });
  }
  await owner
    .getByRole("button", { name: "공동공간 관리", exact: true })
    .click();
  await owner
    .getByRole("heading", { name: "최근 변경 이력", exact: true })
    .waitFor();
  assert((await owner.locator(".audit-list").innerText()).includes("25,000원"));
  const backupDownload = owner.waitForEvent("download");
  await owner.getByRole("button", { name: "자료 백업 ↓", exact: true }).click();
  const downloaded = await backupDownload;
  const backup = JSON.parse(await readFile(await downloaded.path(), "utf8"));
  backup.assets.push({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title: "백업에서 가져온 자료",
    business: "테스트 브랜드",
    channel: "라인",
    content: "검증용 콘텐츠",
    url: "",
    usage: "테스트용 직접 작성",
  });
  owner.once("dialog", (d) => d.accept());
  await owner
    .getByLabel("JSON 백업으로 공동공간 자료 교체", { exact: true })
    .setInputFiles({
      name: "partner-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await owner
    .getByText("백업을 서버 공동공간에 저장했습니다.", { exact: true })
    .waitFor();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "콘텐츠 자료실", exact: false })
    .click();
  await owner
    .getByRole("heading", { name: "백업에서 가져온 자료", exact: true })
    .waitFor();
  const resource = owner.locator("article").filter({
    has: owner.getByRole("heading", {
      name: "백업에서 가져온 자료",
      exact: true,
    }),
  });
  await resource.getByText("첨부 파일 · 콘텐츠 버전", { exact: true }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1kAAAAASUVORK5CYII=",
    "base64",
  );
  await owner.waitForFunction(
    () =>
      document.querySelector(".asset-resources input[type=file]") &&
      !document.querySelector(".asset-resources input[type=file]").disabled,
  );
  await resource
    .getByLabel("이미지·영상 첨부 (25MB 이내)", { exact: true })
    .setInputFiles({ name: "테스트.png", mimeType: "image/png", buffer: png });
  await resource.getByText("테스트.png", { exact: true }).waitFor();
  await resource.getByRole("button", { name: "미리보기", exact: true }).click();
  await resource.locator("img.media-preview").waitFor();
  await owner.waitForFunction(
    () => document.querySelector("img.media-preview")?.naturalWidth > 0,
  );
  await resource
    .getByLabel("다음 버전 파일", { exact: true })
    .setInputFiles({ name: "테스트.png", mimeType: "image/png", buffer: png });
  await resource.getByText(/v2 ·/).waitFor();
  const oldDownload = owner.waitForEvent("download");
  await resource
    .getByRole("button", { name: "v1 다운로드", exact: true })
    .click();
  assert.equal((await oldDownload).suggestedFilename(), "테스트.png");
  await resource.getByRole("button", { name: "수정", exact: true }).click();
  const assetEditor = owner.getByRole("dialog", { name: "기록 수정" });
  await assetEditor
    .getByLabel("내용·제품 정보", { exact: true })
    .fill("새 콘텐츠 버전");
  await assetEditor.getByLabel(/^태그/).fill("제품, 영상");
  await assetEditor
    .getByRole("checkbox", { name: "재사용 템플릿으로 보관" })
    .check();
  await assetEditor
    .getByRole("button", { name: "변경 저장", exact: true })
    .click();
  await resource
    .locator(".content-preview")
    .filter({ hasText: "새 콘텐츠 버전" })
    .waitFor();
  await resource
    .getByRole("button", { name: "파일·이력 새로고침", exact: true })
    .click();
  const previous = resource
    .locator(".version-row")
    .filter({ hasText: "검증용 콘텐츠" })
    .first();
  owner.once("dialog", (d) => d.accept());
  await previous
    .getByRole("button", { name: "이 내용으로 복원", exact: true })
    .click();
  await resource
    .locator(".content-preview")
    .filter({ hasText: "검증용 콘텐츠" })
    .waitFor();
  await viewer
    .getByRole("button", { name: "서버 자료 다시 불러오기", exact: true })
    .click();
  await viewer
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "콘텐츠 자료실", exact: false })
    .click();
  const reader = viewer.locator("article").filter({
    has: viewer.getByRole("heading", {
      name: "백업에서 가져온 자료",
      exact: true,
    }),
  });
  await reader.getByText("첨부 파일 · 콘텐츠 버전", { exact: true }).click();
  await reader
    .getByRole("button", { name: "파일 다운로드", exact: true })
    .waitFor();
  assert.equal(
    await reader
      .getByLabel("이미지·영상 첨부 (25MB 이내)", { exact: true })
      .count(),
    0,
  );
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "활동 기록", exact: false })
    .click();
  await owner.getByText("게시 활동 CSV 일괄 등록", { exact: true }).click();
  await owner
    .getByLabel("가져올 홍보 제안", { exact: true })
    .selectOption({ label: "공유할 제품 소개" });
  await owner
    .getByLabel("가져올 홍보자", { exact: true })
    .selectOption({ label: "공동공간 크리에이터" });
  const activityCsv = {
    name: "activities.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "url,publishedAt,views,likes,comments,shares\nhttps://example.com/imported-post,2026-01-01,0,2,1,0",
    ),
  };
  await owner
    .getByLabel("활동 CSV 파일", { exact: true })
    .setInputFiles(activityCsv);
  await owner.getByText("1건 등록 · 중복 0건 제외", { exact: true }).waitFor();
  await owner
    .getByLabel("활동 CSV 파일", { exact: true })
    .setInputFiles(activityCsv);
  await owner.getByText("0건 등록 · 중복 1건 제외", { exact: true }).waitFor();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "성과 리포트", exact: false })
    .click();
  await owner
    .getByRole("cell", { name: "공유할 제품 소개", exact: true })
    .waitFor();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "정산 내역", exact: false })
    .click();
  await owner
    .getByLabel("홍보 제안", { exact: true })
    .selectOption({ label: "공유할 제품 소개" });
  await owner
    .getByLabel("홍보자", { exact: true })
    .selectOption({ label: "공동공간 크리에이터 · 인스타그램" });
  await owner
    .getByLabel("지급 내역 설명", { exact: true })
    .fill("CSV 지급 대상");
  await owner
    .getByLabel("당사자가 정한 금액 (원)", { exact: true })
    .fill("5000");
  await owner
    .getByLabel("지급 예정일 (선택)", { exact: true })
    .fill("2026-12-01");
  await owner.getByRole("button", { name: "저장하기", exact: true }).click();
  await owner
    .getByText("공동공간 크리에이터 · CSV 지급 대상", { exact: true })
    .waitFor();
  const payoutBackup = owner.waitForEvent("download");
  await owner.getByRole("button", { name: "자료 백업 ↓", exact: true }).click();
  const payoutData = JSON.parse(
      await readFile(await (await payoutBackup).path(), "utf8"),
    ),
    payout = payoutData.settlements.find((s) => s.memo === "CSV 지급 대상");
  assert(payout);
  await owner.getByText("외부 지급 결과 CSV 가져오기", { exact: true }).click();
  owner.once("dialog", (d) => d.accept());
  await owner.getByLabel("지급 결과 CSV 파일", { exact: true }).setInputFiles({
    name: "payments.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `settlementId,paidAt,reference\n${payout.id},2026-01-01T00:00:00Z,test-reference`,
    ),
  });
  await owner
    .getByText("1건의 외부 지급 결과를 기록했습니다.", { exact: true })
    .waitFor();
  await viewer
    .getByRole("button", { name: "공동공간 알림", exact: true })
    .click();
  const activeSpaceId = await viewer
    .getByLabel("이용할 공동공간", { exact: true })
    .inputValue();
  const notification = viewer.locator(
    `.notification-row[data-space-id="${activeSpaceId}"]`,
  );
  await notification
    .getByRole("button", { name: "읽음으로 표시", exact: true })
    .click();
  await notification.getByText(/새 변경 0건/).waitFor();
  await owner
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "콘텐츠 자료실", exact: false })
    .click();
  const mediaAsset = owner
    .locator("article")
    .filter({
      has: owner.getByRole("heading", {
        name: "백업에서 가져온 자료",
        exact: true,
      }),
    });
  await mediaAsset
    .getByText("첨부 파일 · 콘텐츠 버전", { exact: true })
    .click();
  await owner.waitForFunction(
    () =>
      document.querySelector(".asset-resources input[type=file]") &&
      !document.querySelector(".asset-resources input[type=file]").disabled,
  );
  // Generated test fixture: ffmpeg lavfi solid green, 32x32, VP8, 0.6 seconds, no audio.
  const video = Buffer.from(
    "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIuEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEjTbuMU6uEHFO7a1OsggIY7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuNy4xMDNXQYxMYXZmNjEuNy4xMDNEiYhAgsAAAAAAABZUrmvIrgEAAAAAAAA/14EBc8WIhXr+Vyb+KJOcgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QL68IA4JCwgSC6gSCagQJVsIRVuYEBElTDZ/tzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYxLjcuMTAzc3PWY8CLY8WIhXr+Vyb+KJNnyKFFo4dFTkNPREVSRIeUTGF2YzYxLjE5LjEwMSBsaWJ2cHhnyKFFo4hEVVJBVElPTkSHkzAwOjAwOjAwLjYwMDAwMDAwMAAfQ7Z18OeBAKO9gQAAgBADAJ0BKiAAIAAARwiFhYiFhIgCAgJ1qgP4A/oCCFkMvQD+/W7z/+K1h1nF/4rf/9Nk8VeM/+mLAKOVgQDIALEBAAEQEAAYABhYL/QACHAAo5WBAZAAsQEAARAQABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGj8IED",
    "base64",
  );
  await mediaAsset
    .getByLabel("이미지·영상 첨부 (25MB 이내)", { exact: true })
    .setInputFiles({
      name: "test-video.webm",
      mimeType: "video/webm",
      buffer: video,
    });
  const videoCard = mediaAsset
    .locator(".media-card")
    .filter({ hasText: "test-video.webm" });
  await videoCard
    .getByRole("button", { name: "미리보기", exact: true })
    .click();
  await mediaAsset.locator("video.media-preview").waitFor();
  await mediaAsset.locator("video.media-preview").evaluate(async (el) => {
    el.muted = true;
    await el.play();
  });
  await owner.waitForFunction(() => {
    const v = document.querySelector("video.media-preview");
    return v && v.videoWidth === 32 && v.currentTime > 0;
  });
  await mediaAsset.locator("video.media-preview").evaluate((el) => el.pause());
  // Revoke the editor and verify server reads no longer disclose the workspace.
  const member = owner
    .locator(".member-list li")
    .filter({ hasText: "테스트 홍보자" });
  owner.once("dialog", (d) => d.accept());
  await member.getByRole("button", { name: "접근 해제", exact: true }).click();
  await editor
    .getByRole("button", { name: "서버 자료 다시 불러오기", exact: true })
    .click();
  await editor
    .getByRole("alert")
    .filter({ hasText: "접근할 수 없는 공동공간" })
    .waitFor();
  for (const p of [owner, viewer]) {
    assert(
      !(await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
  }
  await owner.screenshot({
    path: join(artifacts, "partner-server-desktop.png"),
    fullPage: true,
  });
  await viewer.screenshot({
    path: join(artifacts, "partner-server-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real PostgreSQL shared workspace, three isolated browser identities, owner/editor/viewer permissions, invitations, cross-browser content, owner-only settlement, audit and access revocation. Test identities only; production login unverified.",
  );
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
