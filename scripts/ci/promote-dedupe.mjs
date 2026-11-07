#!/usr/bin/env node
/**
 * WO-O4O-PROMOTE-SAME-SHA-GUARD-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §9-4 · §9-5 2)
 *
 * 같은 SHA 의 Promote 를 다시 돌리지 않는다. 2026-09-30~10-29 Promote 207회 중 50회가 직전과 같은 SHA 였다.
 * 판정은 GitHub Actions API 가 주는 Promote run 목록만 쓴다(head_sha · 제목 · 상태 · 결론).
 *
 *   skip=true  — 같은 SHA 의 Promote(dry-run 제외)가 이미 **성공**했거나, 지금 **진행 · 대기 중**이다
 *   skip=false — 그 밖 전부: 이전 run 이 실패 · 취소됨(재시도 허용) · 이 run 이 dry-run · force='true' ·
 *                SHA 형식 이상 · API 조회 실패
 * **확인할 수 없으면 skip=false** 다 — 중복 방지 때문에 정상 승격을 막지 않는다(비용만 든다).
 * 항상 exit 0. 결과는 GITHUB_OUTPUT(`skip`, `reason`)과 GITHUB_STEP_SUMMARY 에 남긴다.
 *
 *   env: GITHUB_REPOSITORY · GITHUB_TOKEN · GITHUB_RUN_ID · PROMOTE_SHA · PROMOTE_DRY_RUN · PROMOTE_FORCE
 */
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const isDryRunTitle = (title) => /\(dry-run\)\s*$/.test(String(title ?? ''));

/**
 * @returns {Promise<{skip: boolean, reason: string, runUrl?: string}>}
 */
export async function checkDuplicate({ repo, sha, runId, dryRun, force, token, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  if (String(force).toLowerCase() === 'true') return { skip: false, reason: "force='true' — 같은 SHA 여도 실행" };
  if (String(dryRun).toLowerCase() === 'true') return { skip: false, reason: 'dry-run 은 판정만 하므로 막지 않는다' };
  if (!/^[0-9a-f]{40}$/.test(String(sha ?? ''))) return { skip: false, reason: 'SHA 형식이 40자 hex 가 아님 — 판정은 delivery 가 거절한다' };
  if (!repo || !token || typeof fetchImpl !== 'function') return { skip: false, reason: '저장소 · token 없음 — 확인 불가' };
  try {
    const res = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/repos/${repo}/actions/workflows/promote.yml/runs?head_sha=${sha}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { skip: false, reason: `Promote run 조회 HTTP ${res.status} — 확인 불가` };
    const body = await res.json();
    if (!Array.isArray(body?.workflow_runs)) return { skip: false, reason: '응답 형식 이상 — 확인 불가' };
    const same = body.workflow_runs.filter((r) =>
      String(r.id) !== String(runId) &&
      r.head_sha === sha &&
      String(r.display_title ?? '').startsWith(`Promote ${sha}`) &&
      !isDryRunTitle(r.display_title));
    const active = same.find((r) => ACTIVE.has(r.status));
    if (active) return { skip: true, reason: `같은 SHA 의 Promote 가 진행 · 대기 중 (run ${active.id})`, runUrl: active.html_url };
    const done = same.find((r) => r.status === 'completed' && r.conclusion === 'success');
    if (done) return { skip: true, reason: `같은 SHA 의 Promote 가 이미 성공 (run ${done.id})`, runUrl: done.html_url };
    return { skip: false, reason: same.length ? `이전 Promote ${same.length}건은 성공하지 않았다 — 재시도 허용` : '같은 SHA 의 이전 Promote 없음' };
  } catch (error) {
    return { skip: false, reason: `Promote run 조회 실패(${error?.name ?? 'Error'}) — 확인 불가` };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkDuplicate({
    repo: process.env.GITHUB_REPOSITORY,
    sha: process.env.PROMOTE_SHA,
    runId: process.env.GITHUB_RUN_ID,
    dryRun: process.env.PROMOTE_DRY_RUN,
    force: process.env.PROMOTE_FORCE,
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || undefined,
  });
  console.log(`same-SHA guard: skip=${result.skip} — ${result.reason}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `skip=${result.skip}\nreason=${result.reason.replace(/\r?\n/g, ' ')}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [`### Promote same-SHA guard`, '', `- skip: **${result.skip}**`, `- ${result.reason}`];
    if (result.runUrl) lines.push(`- 기존 run: ${result.runUrl}`);
    if (result.skip) lines.push('', "다시 배포해야 하면(예: 롤백 뒤) `force='true'` 로 실행한다.");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}
