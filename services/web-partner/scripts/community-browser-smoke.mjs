import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Run only with community-browser-harness.ts and the disposable canonical PG15 database.
const origin = "http://127.0.0.1:3011";
const artifacts = await mkdtemp(join(tmpdir(), "partner-community-browser-"));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [],
  contexts = [];
const capture = (p) => p.on("pageerror", (e) => errors.push(e.message));
const reason = async (p, text) => {
  await p.getByLabel("처리 사유", { exact: true }).fill(text);
  await p.getByRole("button", { name: "조치 적용", exact: true }).click();
  await p.getByLabel("처리 사유", { exact: true }).waitFor({ state: "hidden" });
};
try {
  for (const width of [390, 768, 1440]) {
    const c = await browser.newContext({ viewport: { width, height: 900 } });
    contexts.push(c);
    const p = await c.newPage();
    capture(p);
    await p.goto(origin + "/community");
    await p.getByText("로그인하고 참여하기", { exact: true }).waitFor();
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `public overflow ${width}`,
    );
    await p.screenshot({
      path: join(artifacts, `public-${width}.png`),
      fullPage: true,
    });
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
  });
  contexts.push(context);
  const member = await context.newPage();
  capture(member);
  await member.goto(origin + "/login");
  await member
    .getByLabel("이메일", { exact: true })
    .fill("member@example.invalid");
  await member.getByLabel("비밀번호", { exact: true }).fill(randomUUID());
  await member.getByRole("button", { name: "로그인", exact: true }).click();
  await member.getByRole("checkbox").waitFor();
  const memberId=(await (await member.request.get(origin+"/api/v1/auth/me")).json()).data.user.id;
  await member.getByRole("checkbox").check();
  await member
    .getByRole("button", { name: "커뮤니티 가입하기", exact: true })
    .click();
  await member
    .getByText("파트너 커뮤니티에 가입했습니다.", { exact: true })
    .waitFor();
  await member
    .getByRole("navigation", { name: "커뮤니티 게시판" })
    .getByRole("link", { name: "자유 소통", exact: true })
    .click();
  await member.getByRole("button", { name: "글쓰기", exact: true }).click();
  const title = "브라우저 커뮤니티 검증 " + randomUUID().slice(0, 8);
  await member.getByLabel("글 제목", { exact: true }).fill(title);
  await member
    .getByLabel("글 내용", { exact: true })
    .fill("공동으로 경험을 나눕니다. <script>text only</script>");
  await member.getByRole("button", { name: "글 저장", exact: true }).click();
  await member.getByRole("heading", { name: title, exact: true }).waitFor();
  const postUrl = member.url();
  const postId=new URL(postUrl).pathname.split("/").at(-1);
  const reportReason="운영 검증용 신고 "+randomUUID().slice(0,8);
  await member
    .getByLabel("댓글 내용", { exact: true })
    .fill("모바일에서 남기는 댓글");
  await member.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await member.getByText("모바일에서 남기는 댓글", { exact: true }).waitFor();
  await member
    .getByRole("button", { name: "댓글 수정", exact: true })
    .click({ trial: true });
  await member.getByRole("button", { name: "글 신고", exact: true }).click();
  await member
    .getByLabel("신고 사유", { exact: true })
    .fill(reportReason);
  await member.getByRole("button", { name: "신고 접수", exact: true }).click();
  await member
    .getByText("신고를 접수했습니다. 운영자가 확인합니다.", { exact: true })
    .waitFor();
  assert.equal(
    await member
      .locator("script")
      .evaluateAll((nodes) =>
        nodes.some((n) => n.textContent?.includes("text only")),
      ),
    false,
  );
  assert.equal(
    await member.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await member.screenshot({
    path: join(artifacts, "member-390.png"),
    fullPage: true,
  });
  const opContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(opContext);
  await opContext.addCookies([
    {
      name: "partner_community_actor",
      value: "operator",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const op = await opContext.newPage();
  capture(op);
  await op.goto(origin + "/operator");
  await op.getByText(reportReason, { exact: true }).waitFor();
  await op.locator(`[data-report-post-id="${postId}"]`)
    .getByRole("button", { name: "대상 글·댓글 확인", exact: true })
    .click();
  await op.getByRole("heading", { name: title, exact: true }).waitFor();
  await op.getByRole("button", { name: "댓글 숨김", exact: true }).click();
  await reason(op, "댓글 노출 검토");
  await member.reload();
  await member
    .getByText("운영자가 숨긴 댓글입니다.", { exact: true })
    .waitFor();
  assert.equal(
    await member.getByText("모바일에서 남기는 댓글", { exact: true }).count(),
    0,
  );
  await op.getByRole("button", { name: "게시글 숨김", exact: true }).click();
  await reason(op, "글 노출 검토");
  await member.reload();
  await member
    .getByRole("alert")
    .filter({ hasText: "현재 열람할 수 없는" })
    .waitFor();
  await op.getByRole("button", { name: "게시글 복구", exact: true }).click();
  await reason(op, "검토 후 글 복구");
  await member.goto(postUrl);
  await member.getByRole("heading", { name: title, exact: true }).waitFor();
  await op.getByRole("button", { name: "신고 처리", exact: true }).click();
  await op.locator(`[data-report-post-id="${postId}"]`)
    .getByRole("button", { name: "처리 기록 남기기", exact: true })
    .click();
  await reason(op, "신고 검토 완료");
  await op.locator(`[data-report-post-id="${postId}"]`).getByText("처리 기록: 신고 검토 완료", { exact: true }).waitFor();
  await op.getByRole("button", { name: "회원 관리", exact: true }).click();
  await op.locator(`[data-member-id="${memberId}"]`).getByRole("button", { name: "이용 정지", exact: true }).click();
  await reason(op, "회원 이용 상태 검증");
  await member.reload();
  await member.getByText(/현재 커뮤니티 이용 상태: 이용 정지/).waitFor();
  await op.locator(`[data-member-id="${memberId}"]`).getByRole("button", { name: "정지 해제", exact: true }).click();
  await reason(op, "검증 후 이용 상태 복구");
  await member.goto(postUrl);
  await member.getByRole("heading", { name: title, exact: true }).waitFor();
  await op.getByRole("button", { name: "게시판 관리", exact: true }).click();
  const boardName="검증 게시판 "+randomUUID().slice(0,8);
  await op.getByLabel("게시판 이름", { exact: true }).fill(boardName);
  await op.getByLabel("게시판 소개", { exact: true }).fill("브라우저에서 생성");
  await op.getByLabel("변경 사유", { exact: true }).fill("운영 검증");
  await op.getByRole("button", { name: "게시판 저장", exact: true }).click();
  await op.getByRole("heading", { name: boardName, exact: true }).waitFor();
  assert.equal(
    await op.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await op.screenshot({
    path: join(artifacts, "operator-1440.png"),
    fullPage: true,
  });
  await op.setViewportSize({ width: 390, height: 900 });
  assert.equal(
    await op.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await op.screenshot({
    path: join(artifacts, "operator-390.png"),
    fullPage: true,
  });
  await member.goto(origin + "/workspace?mode=local#home");
  await member.getByRole("navigation", { name: "주 메뉴" }).waitFor();
  await member
    .getByRole("heading", { name: "홍보를 함께 만드는 공간", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      publicWidths: [390, 768, 1440],
      memberWidth: 390,
      operatorWidths: [1440, 390],
      flows:
        "fixture login, opt-in, post/comment, report, hide/restore, suspension/restore, board management, local tools",
      artifacts,
    }),
  );
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
