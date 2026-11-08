#!/usr/bin/env node
/**
 * WO-O4O-CI-DRAFT-LIGHT-READY-GUARANTEE-V1 — 드래프트 run 이 이미 Ready 로 바뀐 PR 에서 돌고 있는지 확인한다.
 *
 * 클라우드 세션은 push 할 때 드래프트 PR 이 자동으로 생기고, 검증을 마친 세션은 곧바로 Ready 로 바꾼다(#974).
 * 그러면 같은 HEAD 에 `opened`(draft) run 과 `ready_for_review` run 이 몇 초 차이로 시작한다.
 * 드래프트 run 의 Detect 가 이 스크립트로 PR 의 **현재** 상태를 읽어, 이미 Ready 면 가벼운 검사도 건너뛴다
 * (full 은 Ready run 이 한다).
 *
 * 출력(GITHUB_OUTPUT): `superseded=true` — PR 이 지금 드래프트가 아님(Ready run 이 full 을 맡음)
 *                      `superseded=false` — 아직 드래프트이거나, 확인할 수 없음
 * **확인할 수 없으면 false** 다. 그 경우 가벼운 검사를 그냥 돌린다 — 비용만 조금 늘고 검증은 줄지 않는다.
 * 항상 exit 0 이다(판정 보조이며 CI 를 막지 않는다).
 *
 *   env: GITHUB_REPOSITORY · PR_NUMBER · GITHUB_TOKEN · GITHUB_API_URL(선택) · GITHUB_OUTPUT(선택)
 */
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @returns {Promise<{superseded: boolean, reason: string}>}
 */
export async function checkSuperseded({ repo, pr, token, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return { superseded: false, reason: 'repository 없음 — 확인 불가' };
  if (!/^\d+$/.test(String(pr ?? ''))) return { superseded: false, reason: 'PR 번호 없음 — 확인 불가' };
  if (!token) return { superseded: false, reason: 'token 없음 — 확인 불가' };
  if (typeof fetchImpl !== 'function') return { superseded: false, reason: 'fetch 없음 — 확인 불가' };
  try {
    const res = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/repos/${repo}/pulls/${pr}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { superseded: false, reason: `PR 조회 HTTP ${res.status} — 확인 불가` };
    const body = await res.json();
    if (body?.state !== 'open') return { superseded: false, reason: `PR 상태 ${body?.state ?? '알 수 없음'} — 판정하지 않음` };
    if (body?.draft === false) return { superseded: true, reason: 'PR 이 이미 Ready — full 검증은 ready_for_review run 이 맡는다' };
    if (body?.draft === true) return { superseded: false, reason: 'PR 이 아직 드래프트 — 가벼운 검사 실행' };
    return { superseded: false, reason: 'draft 필드 없음 — 확인 불가' };
  } catch (error) {
    return { superseded: false, reason: `PR 조회 실패(${error?.name ?? 'Error'}) — 확인 불가` };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkSuperseded({
    repo: process.env.GITHUB_REPOSITORY,
    pr: process.env.PR_NUMBER,
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || undefined,
  });
  console.log(`draft superseded: ${result.superseded} — ${result.reason}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `superseded=${result.superseded}\n`);
}
