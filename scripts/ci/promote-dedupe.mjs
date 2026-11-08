#!/usr/bin/env node
/**
 * WO-O4O-PROMOTE-SAME-SHA-GUARD-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §9-4 · §9-5 2)
 *
 * 같은 SHA 의 Promote 를 다시 돌리지 않는다. 2026-09-30~10-29 Promote 207회 중 50회가 직전과 같은 SHA 였다.
 * 판정은 GitHub Actions API 가 주는 Promote run 목록 · job 결과만 쓴다(head_sha · 제목 · 상태 · 결론 · Report job).
 *
 *   skip=true  — 같은 SHA 이고 **이번 요청 서비스 범위를 덮는** 이전 Promote(dry-run 제외)가
 *                ① 실제로 승격을 마쳤거나(그 run 의 `Report` job 이 success) ② **이 run 보다 먼저 만들어져** 아직 진행 · 대기 중이다
 *   skip=false — 그 밖 전부: 이전 run 이 실패 · 취소 · 배포 없이 끝남(freeze · guard skip · 판정 거절 = Report 없음) ·
 *                범위가 다름 · 이 run 뒤에 만들어진 run 만 있음 · 이 run 이 dry-run · force='true' · SHA 형식 이상 · API 조회 실패
 * **확인할 수 없으면 skip=false** 다 — 중복 방지 때문에 정상 승격을 막지 않는다(비용만 든다).
 *
 * Codex #980 반영:
 *   - 뒤에 만들어진 대기 run 은 세지 않는다. 세면 앞 run 은 뒤 run 을 보고, 뒤 run 은 (배포 없이) 성공한 앞 run 을 보고
 *     둘 다 건너뛰어 승격이 한 번도 일어나지 않는다. concurrency `promote-production` 은 한 번에 하나만 실행한다.
 *   - workflow 결론 success 는 승격 완료가 아니다(freeze · guard skip 도 success). delivery 의 `Report` job 은
 *     실제 배포를 실행한 run 에서만 돌고, FAILED · CANCELLED 가 있으면 exit 1 이다 — 그 job 의 success 만 완료로 본다.
 *   - 서비스 범위: run 이름에 `services=<목록>` 을 남긴다(promote.yml run-name). 목록이 없는 run = 승격 가능한 전부.
 *     이전 범위가 이번 요청을 모두 덮을 때만 중복이다.
 * 항상 exit 0. 결과는 GITHUB_OUTPUT(`skip`, `reason`)과 GITHUB_STEP_SUMMARY 에 남긴다.
 *
 *   env: GITHUB_REPOSITORY · GITHUB_TOKEN · GITHUB_RUN_ID · PROMOTE_SHA · PROMOTE_SERVICES · PROMOTE_DRY_RUN · PROMOTE_FORCE
 */
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const REPORT_JOB = /(^|\/ )Report \(serving SHA/;
const MAX_JOB_LOOKUPS = 5;

/** 쉼표 · 공백 목록 → 정렬된 소문자 집합 (빈 값 = 전부) */
export function parseServices(raw) {
  return [...new Set(String(raw ?? '').split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * Promote run 제목 해석 — `Promote <sha>[ · services=<목록>][ (dry-run)]`.
 * @returns {{dryRun: boolean, services: string[]} | null}  제목이 이 SHA 의 Promote 가 아니면 null
 */
export function parseTitle(title, sha) {
  const t = String(title ?? '');
  if (!t.startsWith(`Promote ${sha}`)) return null;
  let rest = t.slice(`Promote ${sha}`.length);
  const dryRun = /\(dry-run\)\s*$/.test(rest);
  if (dryRun) rest = rest.replace(/\s*\(dry-run\)\s*$/, '');
  const m = /^\s*·\s*services=(.*)$/.exec(rest);
  if (!m && rest.trim() !== '') return null;
  return { dryRun, services: m ? parseServices(m[1]) : [] };
}

/** 이전 범위(prev)가 이번 요청(cur)을 모두 덮는가. 빈 목록 = 승격 가능한 전부. */
export function covers(prev, cur) {
  if (prev.length === 0) return true;
  if (cur.length === 0) return false;
  return cur.every((s) => prev.includes(s));
}

/**
 * @returns {Promise<{skip: boolean, reason: string, runUrl?: string}>}
 */
export async function checkDuplicate({ repo, sha, runId, services, dryRun, force, token, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  if (String(force).toLowerCase() === 'true') return { skip: false, reason: "force='true' — 같은 SHA 여도 실행" };
  if (String(dryRun).toLowerCase() === 'true') return { skip: false, reason: 'dry-run 은 판정만 하므로 막지 않는다' };
  if (!/^[0-9a-f]{40}$/.test(String(sha ?? ''))) return { skip: false, reason: 'SHA 형식이 40자 hex 가 아님 — 판정은 delivery 가 거절한다' };
  if (!repo || !token || typeof fetchImpl !== 'function') return { skip: false, reason: '저장소 · token 없음 — 확인 불가' };
  const self = Number(runId);
  const want = parseServices(services);
  const base = apiUrl.replace(/\/$/, '');
  const get = async (ep) => {
    const res = await fetchImpl(`${base}/repos/${repo}/${ep}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  try {
    const body = await get(`actions/workflows/promote.yml/runs?head_sha=${sha}&per_page=100`);
    if (!Array.isArray(body?.workflow_runs)) return { skip: false, reason: '응답 형식 이상 — 확인 불가' };
    const same = body.workflow_runs
      .filter((r) => String(r.id) !== String(runId) && r.head_sha === sha)
      .map((r) => ({ run: r, title: parseTitle(r.display_title, sha) }))
      .filter((x) => x.title && !x.title.dryRun && covers(x.title.services, want))
      .sort((a, b) => Number(b.run.id) - Number(a.run.id));

    // ① 이 run 보다 먼저 만들어져 아직 끝나지 않은 run — 그 run 이 승격한다(concurrency 로 이 run 은 그 뒤에 돈다)
    const older = Number.isFinite(self) && self > 0 ? same.filter((x) => Number(x.run.id) < self) : [];
    const active = older.find((x) => ACTIVE.has(x.run.status));
    if (active) return { skip: true, reason: `같은 SHA · 같은 범위의 먼저 시작된 Promote 가 진행 · 대기 중 (run ${active.run.id})`, runUrl: active.run.html_url };

    // ② 실제로 승격을 마친 run — workflow 결론이 아니라 delivery Report job 의 success 로 판정한다
    const done = same.filter((x) => x.run.status === 'completed' && x.run.conclusion === 'success').slice(0, MAX_JOB_LOOKUPS);
    for (const x of done) {
      const jobs = await get(`actions/runs/${x.run.id}/jobs?filter=latest&per_page=100`);
      const report = (jobs?.jobs ?? []).find((j) => REPORT_JOB.test(String(j.name ?? '')));
      if (report?.conclusion === 'success') {
        return { skip: true, reason: `같은 SHA · 같은 범위의 Promote 가 이미 승격을 마침 (run ${x.run.id} · Report success)`, runUrl: x.run.html_url };
      }
    }
    return { skip: false, reason: same.length ? `같은 범위의 이전 Promote ${same.length}건 중 승격을 마친 run 없음 — 실행` : '같은 SHA · 같은 범위의 이전 Promote 없음' };
  } catch (error) {
    return { skip: false, reason: `Promote run 조회 실패(${error?.message ?? error?.name ?? 'Error'}) — 확인 불가` };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkDuplicate({
    repo: process.env.GITHUB_REPOSITORY,
    sha: process.env.PROMOTE_SHA,
    runId: process.env.GITHUB_RUN_ID,
    services: process.env.PROMOTE_SERVICES,
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
