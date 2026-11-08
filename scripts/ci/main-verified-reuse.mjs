#!/usr/bin/env node
/**
 * WO-O4O-CI-MAIN-VERIFIED-REUSE-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §9-3 C · 조건부 채택)
 *
 * main push 커밋 C 가 **녹색 PR CI 가 이미 검사한 것과 내용이 같으면** 무거운 job 을 건너뛴다.
 * 판정은 **GitHub API 가 직접 주는 정보만** 쓴다 — PR 쪽 코드가 만든 기록(artifact · summary · 자체 check run)은 쓰지 않는다.
 *
 *   1. C 와 첫 부모 사이 변경 파일(compare API) — `.github/**` · `scripts/**` (CI 인프라)가 있으면 full
 *   2. C 를 merge commit 으로 가진 병합 PR 정확히 1개(commits/{C}/pulls · merged · base=main · merge_commit_sha=C · 같은 저장소)
 *   3. **tree(C) == tree(PR head H)** — git 이 계산한 tree SHA(commits API). 같으면 H 의 내용 = C 의 내용이다.
 *   3-b. **병합 직전 main(C 의 첫 부모 P)이 H 의 조상**이다 — compare API `P...H` 의 behind_by == 0.
 *   4. H 에 대해 `ci-pipeline.yml` 의 `pull_request` run 이 성공했고, 그 run 의 job 중 **이름이 정확히 `CI Gate`** 인 job 이
 *      success 다(Actions jobs API). 드래프트 run 의 gate(`CI Gate (draft · not final)`)는 이름이 달라 해당하지 않는다.
 *
 * PR CI 는 H 가 아니라 H 와 **그 시점 main(B_t)** 의 임시 병합 결과를 검사한다(Codex #981).
 *   tree(C)==tree(H) 만으로는 부족하다 — B_t 에 있던 변경이 나중에 main 에서 revert 되면 C 의 tree 는 H 와 같지만,
 *   CI 가 검사한 것은 H+그 변경이다. 그래서 P 가 H 의 조상인지 확인한다(3-b): main 은 이력 재작성이 금지돼
 *   (ruleset non-fast-forward 금지) B_t 는 P 의 조상이고, 따라서 H 의 조상이다 → H 와 B_t 의 병합 = H 그대로
 *   = 검사한 내용이 H = C 의 내용이다. run 의 base SHA 는 완료된 run 의 API 응답에 남지 않아 이 방식으로 증명한다.
 *
 * 하나라도 확인할 수 없으면 verified=false(full CI)다. 항상 exit 0.
 * 기본 비활성 — 저장소 변수 `CI_MAIN_REUSE=true` 일 때만 판정한다(통합 담당 결정).
 *
 *   env: GITHUB_REPOSITORY · GITHUB_TOKEN · GITHUB_SHA · CI_MAIN_REUSE · GITHUB_OUTPUT · GITHUB_STEP_SUMMARY
 */
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INFRA = [/^\.github\//, /^scripts\//];
const CI_WORKFLOW = '.github/workflows/ci-pipeline.yml';
const GATE = 'CI Gate';

/**
 * @returns {Promise<{verified: boolean, reason: string, evidence?: object}>}
 */
export async function decideReuse({ repo, sha, enabled, token, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  if (String(enabled).toLowerCase() !== 'true') return { verified: false, reason: 'CI_MAIN_REUSE 미설정 — full' };
  if (!/^[0-9a-f]{40}$/.test(String(sha ?? ''))) return { verified: false, reason: 'SHA 형식 이상 — full' };
  if (!repo || !token || typeof fetchImpl !== 'function') return { verified: false, reason: '저장소 · token 없음 — full' };
  const base = apiUrl.replace(/\/$/, '');
  const get = async (ep) => {
    const res = await fetchImpl(`${base}/repos/${repo}/${ep}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${ep.split('?')[0]}`);
    return res.json();
  };
  try {
    const commit = await get(`commits/${sha}`);
    const tree = commit?.commit?.tree?.sha;
    const parent = commit?.parents?.[0]?.sha;
    if (!tree || !parent) return { verified: false, reason: 'C 의 tree · 부모를 알 수 없음 — full' };

    const cmp = await get(`compare/${parent}...${sha}`);
    const files = Array.isArray(cmp?.files) ? cmp.files : null;
    if (!files || files.length >= 300) return { verified: false, reason: '변경 파일 목록을 다 받을 수 없음(300건 이상 · 형식 이상) — full' };
    const infra = files.map((f) => f.filename).filter((f) => INFRA.some((re) => re.test(f)));
    if (infra.length) return { verified: false, reason: `CI 인프라 변경(${infra.slice(0, 3).join(', ')}) — full` };

    const pulls = (await get(`commits/${sha}/pulls`)).filter((p) =>
      p?.merged_at && p?.base?.ref === 'main' && p?.merge_commit_sha === sha && p?.head?.repo?.full_name === repo);
    if (pulls.length !== 1) return { verified: false, reason: `C 를 병합 커밋으로 가진 같은 저장소 PR 이 ${pulls.length}개 — full` };
    const pr = pulls[0];
    const head = pr.head.sha;

    const headCommit = await get(`commits/${head}`);
    const headTree = headCommit?.commit?.tree?.sha;
    if (headTree !== tree) return { verified: false, reason: `tree(C) ≠ tree(PR #${pr.number} head) — PR branch 가 병합 직전 main 을 포함하지 않았다 — full` };

    // 3-b. P(병합 직전 main)가 H 의 조상 — CI 가 검사한 임시 병합 결과가 H 그대로임을 보장한다
    const ancestry = await get(`compare/${parent}...${head}`);
    if (ancestry?.behind_by !== 0 || !['ahead', 'identical'].includes(ancestry?.status)) {
      return { verified: false, reason: `병합 직전 main 이 PR #${pr.number} head 의 조상이 아님(status=${ancestry?.status ?? '?'} · behind_by=${ancestry?.behind_by ?? '?'}) — PR CI 가 다른 병합 결과를 검사했을 수 있다 — full` };
    }

    const runs = await get(`actions/workflows/ci-pipeline.yml/runs?head_sha=${head}&event=pull_request&status=completed&per_page=20`);
    const candidates = (runs?.workflow_runs ?? []).filter((r) =>
      r.head_sha === head && r.event === 'pull_request' && r.path === CI_WORKFLOW && r.conclusion === 'success' &&
      r.repository?.full_name === repo && r.head_repository?.full_name === repo)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    for (const run of candidates) {
      const jobs = await get(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
      const gate = (jobs?.jobs ?? []).find((j) => j.name === GATE);
      if (gate?.conclusion === 'success') {
        return {
          verified: true,
          reason: `PR #${pr.number} head ${head.slice(0, 10)} 의 녹색 CI(run ${run.id}) 가 같은 tree 를 검사했다`,
          evidence: { pr: pr.number, head, tree, run: run.id, runUrl: run.html_url },
        };
      }
    }
    return { verified: false, reason: `PR #${pr.number} head 에 녹색 \`${GATE}\` 가 없음 — full` };
  } catch (error) {
    return { verified: false, reason: `GitHub API 조회 실패(${error?.message ?? error}) — full` };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await decideReuse({
    repo: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    enabled: process.env.CI_MAIN_REUSE,
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || undefined,
  });
  console.log(`main verified reuse: ${result.verified} — ${result.reason}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `verified=${result.verified}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const e = result.evidence;
    const lines = ['### main 검증 재사용 판정', '', `- verified: **${result.verified}**`, `- ${result.reason}`];
    if (e) lines.push(`- tree \`${e.tree}\` · PR #${e.pr} head \`${e.head}\` · run ${e.runUrl ?? e.run}`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}
