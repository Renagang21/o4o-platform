#!/usr/bin/env node
/**
 * PreToolUse 훅 — settings.json 의 넓은 ask 패턴 4종을 대신해, 위험 명령에는 승인을 묻고
 * 정확한 형태의 읽기 전용 명령만 예외로 통과시킨다(클라우드 · 로컬 모두 같은 판정).
 *
 * 왜 훅인가: settings.json 은 ask 가 allow 보다 우선이고 패턴에 "제외" 문법이 없다. 그래서 아래 4종은
 * 읽기 전용 명령까지 매번 승인을 물었다.
 *
 * 권한 모드: 승인 창이 뜨는 모드(default · acceptEdits · plan)에서는 "ask". 그 밖(auto · bypassPermissions ·
 * dontAsk · 알 수 없음)은 훅이 OS 확인 대화상자를 띄워 '예'면 "allow", 아니요 · 무응답 · 띄울 수 없음은 "deny".
 * 2026-11-09 로컬 auto 모드에서 이 훅이 `gh label delete x` 에 ask 를 반환했는데도 승인 창 없이 실행됐다
 * — lib/shell.mjs approvalFor · confirmDialog.
 *
 * 대체한 settings ask (Bash · PowerShell 모두)
 *   ⓐ gh api … -X | --method | -f | -F | --field | --raw-field | --input
 *      → 쓰기 가능한 플래그가 있으면 ask. 예외는 GitHub 검색 1 형태뿐:
 *        gh api (-X GET | --method GET) search/{code,issues,commits,repositories,users}
 *               [-f q=…] [-f per_page=N] [-f page=N] [-f sort=…] [-f order=…] [--paginate] [--jq <식> | -q <식>]
 *        (method 는 정확히 1번, 각 -f 키도 1번, 그 밖의 토큰 · 셸 확장 · 리다이렉션이 하나라도 있으면 예외 아님)
 *   ⓑ node *migration* · node *seed*
 *      → ask. 예외: `node scripts/db/check-migration-contract.mjs`(인자 없음 = CI 정적 검사)
 *                   `node --test <*.test.mjs|*.test.js …>`(테스트 파일만)
 *   ⓒ pnpm *migration* · pnpm *seed*
 *      → ask. 예외: `pnpm [--filter <pkg>] (test | run test | exec jest | jest) [--] <*.test|spec.* …> [안전 플래그]`
 *                   `pnpm --filter @o4o/api-server [run] migration:check-contract`
 *   ⓓ gh * delete *
 *      → gh 의 명령 단어로 `delete` · `delete-*` 가 오면 ask. --search · --title 같은 텍스트 플래그의 값은 명령이 아니다.
 *
 * settings.json 에 남긴 것: gh api *DELETE* deny · pnpm *db:seed* · pnpm *typeorm * · npm run *migration* 등 나머지 ask.
 * 예외 판정은 fail closed — 따옴표가 닫히지 않았거나 $ · ` 확장이 있으면 예외로 보지 않는다.
 * 훅 자체의 입력 오류(JSON 아님 등)는 허용(exit 0)으로 넘겨 일반 명령을 막지 않는다.
 */
import { approvalFor, baseName, readStdin, segments } from './lib/shell.mjs';

const UNSAFE_UNQUOTED = new Set(['<', '>', '(', ')', '*', '?', '[', ']', '{', '}', '~', '#']);

/**
 * 셸처럼 따옴표 이어붙이기(`'-'X` → `-X`)를 처리하는 토큰 분리.
 * - expansion: `$` · 백틱이 따옴표 밖이나 큰따옴표 안에 있음(값을 알 수 없음)
 * - special:   따옴표 밖의 리다이렉션 · glob · 괄호 · 주석 · 역슬래시
 * - ok:        따옴표가 모두 닫힘
 */
function shellWords(seg) {
  const tokens = [];
  let cur = '';
  let has = false;
  let q = null;
  let expansion = false;
  let special = false;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q === "'") {
      if (c === "'") q = null;
      else cur += c;
      continue;
    }
    if (q === '"') {
      if (c === '"') q = null;
      else {
        if (c === '$' || c === '`') expansion = true;
        if (c === '\\') special = true;
        cur += c;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      has = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (has) tokens.push(cur);
      cur = '';
      has = false;
      continue;
    }
    if (c === '$' || c === '`') expansion = true;
    if (c === '\\') {
      special = true;
      if (i + 1 < seg.length) cur += seg[++i];
      has = true;
      continue;
    }
    if (UNSAFE_UNQUOTED.has(c)) special = true;
    cur += c;
    has = true;
  }
  if (has) tokens.push(cur);
  return { tokens, expansion, special, ok: q === null };
}

/** 명령 위치(VAR=값 · env · sudo · PowerShell & 등 접두어 건너뜀) */
function commandAt(tokens) {
  const prefixes = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup', 'call', '&', '(', '{']);
  let i = 0;
  while (i < tokens.length && (prefixes.has(tokens[i]) || /^[A-Za-z_]\w*=/.test(tokens[i]))) i++;
  return i;
}

// ⓐ ---------------------------------------------------------------------------------------------

/** gh api 에서 쓰기 요청을 만들 수 있는 플래그 (pflag 단축 결합 `-iXPOST` · `-fq=x` · `--method=POST` 포함) */
const isWriteFlag = (t) =>
  /^(-X|--method|-f|-F|--field|--raw-field|--input)$/.test(t) ||
  /^--(method|field|raw-field|input)=/.test(t) ||
  /^-[A-Za-z]*[XfF]/.test(t);

const SEARCH_ENDPOINT = /^\/?search\/(code|issues|commits|repositories|users)$/;
const SEARCH_FIELDS = new Set(['q', 'per_page', 'page', 'sort', 'order']);

/** gh api 인자(api 다음)가 정확한 검색 형태인가 */
function isExactSearch(args) {
  let method = 0;
  let endpoint = 0;
  const keys = new Set();
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t === '-X' || t === '--method') {
      if (args[i + 1] !== 'GET') return false;
      method++;
      i++;
    } else if (t === '-f') {
      const v = args[i + 1];
      const m = typeof v === 'string' ? v.match(/^([a-z_]+)=/) : null;
      if (!m || !SEARCH_FIELDS.has(m[1]) || keys.has(m[1])) return false;
      if (m[1] !== 'q' && !/^[a-z_]+=[\w-]+$/.test(v)) return false;
      keys.add(m[1]);
      i++;
    } else if (t === '--paginate') {
      continue;
    } else if (t === '--jq' || t === '-q') {
      if (typeof args[i + 1] !== 'string') return false;
      i++;
    } else if (SEARCH_ENDPOINT.test(t)) {
      endpoint++;
    } else {
      return false;
    }
  }
  return method === 1 && endpoint === 1;
}

function checkGhApi(words, apiAt) {
  const { tokens, expansion, special, ok } = words;
  const args = tokens.slice(apiAt + 1);
  if (!ok || expansion) return 'gh api — 따옴표가 닫히지 않았거나 $ · 백틱 확장이 있어 쓰기 플래그 여부를 확정할 수 없음';
  if (!args.some(isWriteFlag)) return null;
  // 예외는 접두어 없는 `gh api …` 단독 형태만 — 환경 변수 · 리다이렉션 · glob 이 섞이면 예외 아님
  if (apiAt === 1 && baseName(tokens[0]) === 'gh' && !special && isExactSearch(args)) return null;
  return 'gh api 쓰기 가능 플래그(-X · --method · -f · -F · --field · --raw-field · --input) — 허용 예외는 `gh api -X GET search/<종류> -f q=…` 형태뿐';
}

// ⓓ ---------------------------------------------------------------------------------------------

/** 값이 자유 텍스트인 gh 플래그 — 그 값의 `delete` 는 명령 단어가 아니다 */
const GH_TEXT_FLAGS = new Set([
  '--search', '-S', '--jq', '-q', '--title', '-t', '--body', '-b', '--label', '-l', '--message', '-m',
  '--template', '-T', '--notes', '-n',
]);

function checkGhDelete(tokens, ghAt) {
  for (let i = ghAt + 1; i < tokens.length; i++) {
    if (/^delete(-[a-z]+)?$/.test(tokens[i]) && !GH_TEXT_FLAGS.has(tokens[i - 1])) {
      return `gh 삭제 명령(${tokens[i]})`;
    }
  }
  return null;
}

// ⓑ ⓒ --------------------------------------------------------------------------------------------

const MIG_SEED = /migration|seed/i;
const TEST_FILE_NODE = /^[\w.@/-]+\.test\.[cm]?js$/;
const TEST_FILE_JS = /^[\w.@/-]+\.(test|spec)\.[cm]?[jt]sx?$/;
const SAFE_TEST_FLAGS = new Set(['--runInBand', '-i', '--silent', '--verbose', '--ci', '--passWithNoTests']);

function isExactNode(tokens) {
  if (tokens.length === 2 && tokens[1] === 'scripts/db/check-migration-contract.mjs') return true;
  return (
    tokens.length >= 3 &&
    tokens[1] === '--test' &&
    tokens.slice(2).every((t) => TEST_FILE_NODE.test(t) && !t.includes('..'))
  );
}

function isExactPnpm(tokens) {
  let i = 1;
  let filter = null;
  if (tokens[i] === '--filter' || tokens[i] === '-F') {
    filter = tokens[i + 1];
    i += 2;
  } else if (tokens[i]?.startsWith('--filter=')) {
    filter = tokens[i].slice('--filter='.length);
    i += 1;
  }
  const rest = tokens.slice(i);
  if (
    filter === '@o4o/api-server' &&
    (rest.join(' ') === 'migration:check-contract' || rest.join(' ') === 'run migration:check-contract')
  ) {
    return true;
  }
  let args;
  if (rest[0] === 'test' || rest[0] === 'jest') args = rest.slice(1);
  else if ((rest[0] === 'run' && rest[1] === 'test') || (rest[0] === 'exec' && rest[1] === 'jest')) args = rest.slice(2);
  else return false;
  if (args[0] === '--') args = args.slice(1);
  if (!args.length) return false;
  return args.every((t) => SAFE_TEST_FLAGS.has(t) || (TEST_FILE_JS.test(t) && !t.includes('..')));
}

function checkMigrationSeed(word, words, seg, at) {
  const { tokens, expansion, special, ok } = words;
  if (!MIG_SEED.test(seg) && !MIG_SEED.test(tokens.join(' '))) return null;
  const clean = ok && !expansion && !special && at === 0;
  if (word === 'node' && clean && isExactNode(tokens)) return null;
  if (word === 'pnpm' && clean && isExactPnpm(tokens)) return null;
  return `${word} 명령에 migration · seed 가 포함됨 — 운영 DB 를 바꾸는 실행일 수 있음`;
}

// -----------------------------------------------------------------------------------------------

/** 한 segment 의 ask 사유. 없으면 null. */
function reasonFor(seg) {
  const words = shellWords(seg.replace(/^[({]\s*/, ''));
  const { tokens } = words;
  const at = commandAt(tokens);
  const word = baseName(tokens[at]);

  if (word === 'node' || word === 'pnpm') return checkMigrationSeed(word, words, seg, at);
  if (word !== 'gh') return null;

  // 서브커맨드 앞 gh 전역 옵션(-R/--repo <값> · 그 밖의 -플래그) 건너뜀
  let s = at + 1;
  while (s < tokens.length && tokens[s].startsWith('-')) s += tokens[s] === '-R' || tokens[s] === '--repo' ? 2 : 1;
  if (tokens[s] === 'api') return checkGhApi(words, s);
  return checkGhDelete(tokens, at);
}

function findReason(cmd) {
  for (const seg of segments(cmd)) {
    let r = null;
    try {
      r = reasonFor(seg);
    } catch {
      r = '명령을 해석하지 못함';
    }
    if (r) return r;
  }
  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return;
  }
  const cmd = payload?.tool_input?.command;
  if (typeof cmd !== 'string' || !cmd) return;
  const reason = findReason(cmd);
  if (!reason) return;
  const { decision, note } = approvalFor(payload.permission_mode, { title: 'O4O 위험 명령 승인', reason, command: cmd });
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: `승인 필요 (.claude/hooks/guard-ask-commands.mjs): ${reason}.` + note,
      },
    }),
  );
}

main();
