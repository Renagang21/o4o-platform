#!/usr/bin/env node
/**
 * 겹치는 열린 PR 알림 — AGENTS.md §4-1(e) 「겹치는 PR 표시」 · §4-3 lane(R1) 보조.
 *
 * PR 이 Ready 일 때(열림 · push · Ready 전환) 다른 열린 PR(드래프트 포함)과
 *   1. 같은 파일을 바꾸는지
 *   2. 같은 lane(migration · core-hub · shared-package:<이름>)을 바꾸는지
 * 를 찾아, 이 PR 에 댓글 하나(marker 로 식별 · 이후 실행은 같은 댓글을 고친다)로 알린다.
 *
 * - 병합 gate 가 아니다: 겹침이 있어도 exit 0. API 오류 · 입력 누락만 exit 1.
 * - 겹침이 없고 이전 댓글도 없으면 아무것도 쓰지 않는다. 이전 댓글이 있으면 "겹침 없음" 으로 고친다.
 * - 사람을 @멘션하지 않는다(PR 번호 링크만).
 * - 다른 PR 에는 쓰지 않는다 — 그 PR 은 자기 다음 push · Ready 전환 때 같은 판정을 받는다.
 * - node 내장 모듈과 전역 fetch 만 쓴다(설치 없이 실행).
 *
 *   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo PR_NUMBER=123 node scripts/ci/pr-overlap.mjs
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARKER = '<!-- o4o-pr-overlap -->';
const MAX_FILES_SHOWN = 10;

// ---------------------------------------------------------------------------------------------
// 판정 (순수 함수)
// ---------------------------------------------------------------------------------------------

/**
 * §4-3 lane 표. 파일 하나가 속하는 lane 이름 목록.
 * @param {{ filename: string, status?: string }} f
 */
export function lanesOf(f) {
  const p = f.filename;
  const out = [];
  if (
    (p.startsWith('apps/api-server/src/database/migrations/') && f.status === 'added') ||
    p === 'apps/api-server/src/database/incremental/manifest.ts' ||
    p === 'apps/api-server/src/database/incremental/expected-schema-states.ts'
  ) {
    out.push('migration');
  }
  if (
    p.startsWith('apps/api-server/src/bootstrap/') ||
    p === 'apps/api-server/src/services/startup.service.ts' ||
    /^packages\/[^/]+-core\//.test(p) ||
    isSharedController(p)
  ) {
    out.push('core-hub');
  }
  const pkg = /^packages\/([^/]+)\//.exec(p);
  if (pkg && !pkg[1].endsWith('-core')) out.push(`shared-package:${pkg[1]}`);
  return out;
}

/**
 * §4-3 「공통 controller 처럼 여러 서비스가 함께 쓰는 파일」 — 서비스 키를 받아 여러 서비스가 함께 쓰는
 * operator console controller(`controllers/operator/*` · routes/operator/* 가 연결)와 `src/common/` 공용 계층.
 * 테스트 파일은 제외한다.
 */
const TEST_FILE = /(?:(?:^|\/)__tests__\/)|(?:\.(?:test|spec)\.[cm]?[jt]sx?$)/;
export const isSharedController = (p) =>
  !TEST_FILE.test(p) &&
  (/^apps\/api-server\/src\/controllers\/operator\/[^/]+\.ts$/.test(p) || /^apps\/api-server\/src\/common\/.+\.ts$/.test(p));

/** lane 은 아니지만 R5 · R6 대상인 허브 파일 */
export const isHubFile = (p) => /^services\/[^/]+\/src\/App\.tsx$/.test(p) || /^docs\/work-orders\/[^/]*TODO[^/]*$/.test(p);

/** PR 파일 목록 → 비교용 경로 집합(이름 변경 전 경로 포함) */
export function pathsOf(files) {
  const s = new Set();
  for (const f of files) {
    s.add(f.filename);
    if (f.previous_filename) s.add(f.previous_filename);
  }
  return s;
}

export function lanesOfFiles(files) {
  const s = new Set();
  for (const f of files) for (const l of lanesOf(f)) s.add(l);
  return s;
}

/**
 * @param {{ number: number, files: object[] }} current
 * @param {{ number: number, title: string, draft: boolean, files: object[] }[]} others
 */
export function computeOverlaps(current, others) {
  const myPaths = pathsOf(current.files);
  const myLanes = lanesOfFiles(current.files);
  const rows = [];
  for (const o of others) {
    if (o.number === current.number) continue;
    const theirPaths = pathsOf(o.files);
    const files = [...myPaths].filter((p) => theirPaths.has(p)).sort(byText);
    const lanes = [...lanesOfFiles(o.files)].filter((l) => myLanes.has(l)).sort(byText);
    if (files.length || lanes.length) rows.push({ number: o.number, title: o.title, draft: o.draft, files, lanes });
  }
  return rows.sort((a, b) => a.number - b.number);
}

const byText = (a, b) => a.localeCompare(b, 'en');
const esc = (s) => String(s).replaceAll('|', String.raw`\|`).replaceAll('\n', ' ');
const code = (s) => '`' + s + '`';

/**
 * @param {ReturnType<typeof computeOverlaps>} rows
 * @param {{ sha: string, repo: string }} meta
 */
export function renderComment(rows, { sha, repo }) {
  const head = `${MARKER}\n### 🔀 겹치는 열린 PR (자동 알림)\n\n`;
  const footer =
    `\n<sub>마지막 확인: \`${sha.slice(0, 9)}\` · 이 PR 이 Ready 일 때 열림 · push · Ready 전환마다 다시 확인한다. ` +
    `병합 gate 가 아니다 — 순서 조정은 통합 담당이 한다([AGENTS.md §4-1(e) · §4-3](https://github.com/${repo}/blob/main/AGENTS.md#4-git--병렬-작업-안전)).</sub>\n`;
  if (!rows.length) return `${head}현재 이 PR 과 같은 파일 · 같은 lane 을 바꾸는 열린 PR 은 없습니다.\n${footer}`;

  const lines = ['| PR | 상태 | 같은 파일 | 같은 lane |', '|---|---|---|---|'];
  for (const r of rows) {
    const shown = r.files.slice(0, MAX_FILES_SHOWN).map((f) => code(esc(f)));
    if (r.files.length > MAX_FILES_SHOWN) shown.push(`외 ${r.files.length - MAX_FILES_SHOWN}개`);
    const state = r.draft ? '드래프트' : 'Ready';
    const fileCell = shown.join('<br>') || '—';
    const laneCell = r.lanes.map(code).join(' ') || '—';
    lines.push(`| #${r.number} ${esc(r.title)} | ${state} | ${fileCell} | ${laneCell} |`);
  }
  const notes = ['', '- PR 설명의 「겹치는 PR」 칸에 위 PR 번호와 파일을 적어 주세요(AGENTS.md §4-1(e)).'];
  if (rows.some((r) => !r.draft && r.lanes.length)) {
    notes.push('- **같은 lane 의 Ready PR 이 있습니다.** §4-3 R1: 같은 lane 의 Ready PR 은 동시에 1개 — 한쪽을 드래프트로 두고, 앞 PR 병합 후 `origin/main` 을 merge 해 Ready 로 바꿉니다.');
  }
  const hubs = [...new Set(rows.flatMap((r) => r.files.filter(isHubFile)))];
  if (hubs.length) {
    notes.push(`- 허브 파일이 겹칩니다(${hubs.map(code).join(' ')}) — §4-3 R6: 정렬된 자리에 한 줄만 추가하고, WO 진행표 상태 갱신은 통합 담당이 합니다.`);
  }
  return `${head}${lines.join('\n')}\n${notes.join('\n')}\n${footer}`;
}

// ---------------------------------------------------------------------------------------------
// GitHub REST
// ---------------------------------------------------------------------------------------------

export function makeApi({ token, repo, fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repo}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'o4o-pr-overlap',
  };
  async function call(method, path, body) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub ${method} ${path} → ${res.status}`);
    return res.json();
  }
  async function all(path) {
    const out = [];
    for (let page = 1; page <= 30; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const items = await call('GET', `${path}${sep}per_page=100&page=${page}`);
      out.push(...items);
      if (items.length < 100) break;
    }
    return out;
  }
  return {
    openPulls: () => all('/pulls?state=open'),
    files: (n) => all(`/pulls/${n}/files`),
    comments: (n) => all(`/issues/${n}/comments`),
    createComment: (n, body) => call('POST', `/issues/${n}/comments`, { body }),
    updateComment: (id, body) => call('PATCH', `/issues/comments/${id}`, { body }),
  };
}

/** 한 PR 에 대해 판정하고 댓글을 만든다 · 고친다. 반환: 수행한 동작 */
export async function run({ api, number, repo }) {
  const pulls = await api.openPulls();
  const me = pulls.find((p) => p.number === number);
  if (!me) return { action: 'skip', reason: 'PR 이 열려 있지 않음' };
  const current = { number, files: await api.files(number) };
  const others = await Promise.all(
    pulls
      .filter((p) => p.number !== number)
      .map(async (p) => ({ number: p.number, title: p.title, draft: Boolean(p.draft), files: await api.files(p.number) })),
  );
  const rows = computeOverlaps(current, others);
  const body = renderComment(rows, { sha: me.head.sha, repo });
  const existing = (await api.comments(number)).find(
    (c) => c.user?.type === 'Bot' && typeof c.body === 'string' && c.body.startsWith(MARKER),
  );
  if (existing) {
    if (existing.body === body) return { action: 'unchanged', rows };
    await api.updateComment(existing.id, body);
    return { action: 'updated', rows };
  }
  if (!rows.length) return { action: 'none', rows };
  await api.createComment(number, body);
  return { action: 'created', rows };
}

async function main() {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, PR_NUMBER } = process.env;
  const number = Number(PR_NUMBER);
  if (!token || !repo || !Number.isInteger(number) || number <= 0) {
    console.error('GITHUB_TOKEN · GITHUB_REPOSITORY · PR_NUMBER 가 필요하다');
    return 1;
  }
  const result = await run({ api: makeApi({ token, repo }), number, repo });
  const reason = result.reason ? ` (${result.reason})` : '';
  console.log(`PR #${number}: ${result.action}${reason}`);
  for (const r of result.rows ?? []) {
    console.log(`  #${r.number} ${r.draft ? 'draft' : 'ready'} files=${r.files.length} lanes=${r.lanes.join(',') || '-'}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(await main());
  } catch (error) {
    console.error(`pr-overlap 실패: ${error.message}`);
    process.exit(1);
  }
}
