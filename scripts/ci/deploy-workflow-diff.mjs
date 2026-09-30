/**
 * WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1 §7 · §8 · §9
 *
 * deploy workflow(`deploy-api.yml` · `deploy-web-services.yml` · `deploy-admin.yml`) 변경을
 * "파일이 바뀌었다" 가 아니라 **job 단위 · 줄/flag 단위 의미**로 분류한다.
 *
 * 문제 (CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1 §8-4):
 *   workflow 파일이 바뀌면 기존 classifier 는 그 workflow 의 **모든 서비스를 배포 필요 + LEVEL_3** 로 봤다.
 *   주석 · hold 문구 · ci-gate · if 조건만 바뀌어도 9개 web 서비스가 전부 L3 로 남았다.
 *
 * 분류 (서비스별):
 *   control   주석 · echo 문구 · if/needs/permissions · 판정/게이트 job(detect · ci-gate · hold · summary) · 입력 정의
 *             → runtime 무영향
 *   build     build-arg · docker build · 빌드 명령 · 빌드 설정 값 → 해당 서비스 **artifact 변경**
 *             (top-level env 로 주입되는 build-arg 는 그 ARG 를 서비스 소스가 실제로 읽는지 확인한다 — 안 읽으면 무영향)
 *   config    gcloud run deploy 의 env · secret · 리소스 · ingress 등 flag, migration 호출, 이미지 · 배포 대상
 *             → **배포 필요 + LEVEL_3** (runtime 설정 변경 — 배포해야 반영되고, 반영되면 위험하다)
 *   rollout   `--no-traffic` · `--tag` · `--update-labels` · ROLLOUT_ARGS · 전환 스크립트/액션
 *             → **배포 불필요** (artifact · 설정 불변). 다음 배포 1회만 통제(LEVEL_3)
 *
 * 판정 불가(원문을 못 읽음 · 파싱 실패)는 호출자가 종전처럼 "전 서비스 build + config" 로 본다.
 * 순수 함수 — 파일 원문과 소비 여부 판정기는 주입한다.
 */

export const DEPLOY_WORKFLOWS = {
  '.github/workflows/deploy-api.yml': { kind: 'api' },
  '.github/workflows/deploy-web-services.yml': { kind: 'web' },
  '.github/workflows/deploy-admin.yml': { kind: 'admin' },
};

/** job 이름 → 서비스 key. null 이면 판정/게이트 job(control). */
export function jobServiceKey(kind, job, webKeys) {
  if (kind === 'api') return job === 'build-and-deploy' ? 'api' : null;
  if (kind === 'admin') return job === 'deploy' ? 'admin' : null;
  const m = /^deploy-(.+)$/.exec(job);
  return m && webKeys.includes(m[1]) ? m[1] : null;
}

/** 줄 끝이 아닌 flag 토큰 (`--x`, `--x=v`, `--x="a b"`) 과 bash 배열 전개 토큰 */
const FLAG_TOKEN = /(?:^|\s)(--[a-z][a-z0-9-]*(?:=(?:"[^"]*"|'[^']*'|\S+))?|"\$\{[A-Z_]+\[@\]\}")/g;

/**
 * workflow 원문 → 구역별 정규화된 줄 · flag 토큰.
 * @returns {{ sections: Map<string, {lines: string[], tokens: string[], raw: string}> } | null}
 *   section key: `top:env` · `top:other` · `job:<name>`
 */
export function parseWorkflow(text) {
  if (typeof text !== 'string' || !/^jobs:\s*$/m.test(text)) return null;
  const sections = new Map();
  const get = (k) => {
    if (!sections.has(k)) sections.set(k, { lines: [], tokens: [], raw: '' });
    return sections.get(k);
  };
  let top = 'top:other';
  let job = null;
  let inJobs = false;
  // `if:` 조건식(한 줄 · `if: >-` 여러 줄)은 실행 여부만 정한다 — artifact · 설정이 아니다 (cutover 자가 검증 오탐:
  //   build-and-deploy 의 if 안 `migrate_only` 가 CONFIG_LINE 의 `migrat` 에 걸렸다).
  let ifIndent = -1;
  for (const rawLine of text.split(/\r?\n/)) {
    const indent = rawLine.length - rawLine.trimStart().length;
    if (ifIndent >= 0 && rawLine.trim() !== '' && indent <= ifIndent) ifIndent = -1;
    const inIfBlock = ifIndent >= 0 && rawLine.trim() !== '';
    if (/^\s*if:\s*[>|]-?\s*$/.test(rawLine)) ifIndent = indent;
    if (/^[A-Za-z_][\w-]*:/.test(rawLine)) {
      // top-level key
      inJobs = /^jobs:/.test(rawLine);
      top = /^env:/.test(rawLine) ? 'top:env' : 'top:other';
      job = null;
      if (!inJobs) {
        const s = get(top);
        s.raw += `${rawLine}\n`;
      }
      continue;
    }
    const jm = inJobs ? /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(rawLine) : null;
    if (jm) {
      job = jm[1];
      get(`job:${job}`);
      continue;
    }
    const key = inJobs ? (job ? `job:${job}` : 'top:other') : top;
    const s = get(key);
    s.raw += `${rawLine}\n`;
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue; // 주석 · 빈 줄 = control
    if (inIfBlock || /^if:/.test(trimmed)) {
      s.lines.push(`if-expr ${trimmed}`); // 조건식은 flag 토큰 추출 없이 통째로 control
      continue;
    }
    const tokens = [];
    const stripped = trimmed
      .replace(FLAG_TOKEN, (m, tok) => {
        tokens.push(tok);
        return ' ';
      })
      .replace(/\\\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    s.tokens.push(...tokens);
    if (stripped !== '' && stripped !== '\\') s.lines.push(stripped);
  }
  return { sections };
}

function multisetDiff(a, b) {
  const count = new Map();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  for (const x of b) count.set(x, (count.get(x) ?? 0) - 1);
  const removed = [];
  const added = [];
  for (const [x, n] of count) {
    for (let i = 0; i < Math.abs(n); i += 1) (n > 0 ? removed : added).push(x);
  }
  return { removed, added };
}

/**
 * rollout = **배포 방식** (트래픽 전환 · 빌드 환경 준비). artifact 소스 · runtime 설정을 바꾸지 않으므로 배포는 필요 없고,
 * 다음 배포 1회만 통제한다. checkout · sparse · 도구 설치 · setup action 변경도 여기다(replay: 6ae232ea1).
 */
const ROLLOUT_LINE = /ROLLOUT_ARGS|cloud-run-rollout|cloud-run-verified-rollout|update-traffic|rollout-plan|sparse-checkout|actions\/checkout|setup-build-env|setup-gcloud|google-github-actions|skip_install|node-version|fetch-depth|frozen-lockfile|^\/\*$|^!\/apps\//;
const BUILD_LINE = /--build-arg|docker (buildx )?build|build:prod|ci-build-app|\brun build\b|pnpm .*build|VITE_[A-Z0-9_]+=|\bAPI_URL=|\bAPP_ORIGIN=|Dockerfile|^-f services\//;
const CONFIG_LINE = /gcloud run (deploy|jobs)|jobs (create|update|execute)|migrat|docker push|FULL_IMAGE=|IMAGE_TAG=|IMAGE_NAME=|SERVICE_NAME=|OPTIONAL_ENV|cloud-run-env|imagetools|--set-env-vars|--set-secrets/;
const ROLLOUT_TOKEN = /^(--update-labels|--labels|--no-traffic|--tag)\b|^"\$\{ROLLOUT_ARGS\[@\]\}"$/;
const BUILD_TOKEN = /^(--build-arg|--file|-f|--build-context|--cache-from|--cache-to)\b/;
/** 인증 진입을 바꾸는 build 입력 — build 이지만 LEVEL_3 (예: 매장 handoff 전환 플래그) */
export const AUTH_BUILD_INPUT = /HANDOFF|AUTH|LOGIN|OAUTH|CLIENT_ID|GOOGLE/;

export function classifyLine(line) {
  if (line.startsWith('if-expr ')) return 'control';
  if (ROLLOUT_LINE.test(line)) return 'rollout';
  if (CONFIG_LINE.test(line)) return 'config';
  if (BUILD_LINE.test(line)) return 'build';
  return 'control';
}

export function classifyToken(tok) {
  if (ROLLOUT_TOKEN.test(tok)) return 'rollout';
  if (BUILD_TOKEN.test(tok)) return 'build';
  return 'config';
}

/**
 * @param {string} file                   workflow 경로
 * @param {string|undefined} baseText
 * @param {string|undefined} headText
 * @param {{webKeys: string[], consumes?: (argName: string, serviceKey: string) => boolean|null}} ctx
 *   consumes: 서비스 소스가 그 ARG 를 읽는가 (null = 모름 → 읽는다고 본다)
 * @returns {null | Record<string, {build: string[], config: string[], rollout: string[], auth: string[], control: number, notes: string[]}>}
 *   null = 판정 불가 (호출자가 보수 fallback)
 */
export function analyzeWorkflowChange(file, baseText, headText, ctx) {
  const meta = DEPLOY_WORKFLOWS[file];
  if (!meta) return null;
  const base = parseWorkflow(baseText ?? (headText === undefined ? undefined : ''));
  const head = parseWorkflow(headText ?? '');
  // 신규 생성(base 없음) · 삭제(head 없음) 는 의미 분석 대상이 아니다 → 보수 fallback
  if (!base || !head) return null;

  const serviceKeys = meta.kind === 'web' ? ctx.webKeys : [meta.kind];
  const out = Object.fromEntries(serviceKeys.map((k) => [k, { build: [], config: [], rollout: [], auth: [], control: 0, notes: [] }]));
  const all = (fn) => serviceKeys.forEach((k) => fn(out[k]));

  const keys = new Set([...base.sections.keys(), ...head.sections.keys()]);
  for (const key of keys) {
    const b = base.sections.get(key) ?? { lines: [], tokens: [], raw: '' };
    const h = head.sections.get(key) ?? { lines: [], tokens: [], raw: '' };
    const lines = multisetDiff(b.lines, h.lines);
    const tokens = multisetDiff(b.tokens, h.tokens);
    const changedLines = [...lines.removed, ...lines.added];
    const changedTokens = [...tokens.removed, ...tokens.added];
    if (changedLines.length === 0 && changedTokens.length === 0) continue;

    if (key === 'top:env') {
      for (const line of changedLines) {
        const m = /^([A-Z][A-Z0-9_]*):/.exec(line);
        if (!m) {
          all((s) => s.config.push(`top env: ${line}`));
          continue;
        }
        const name = m[1];
        // 이 env 를 참조하는 job 만 영향. build-arg 로 쓰이면 그 ARG 의 소비 여부까지 본다.
        let referenced = false;
        for (const [sk, sec] of [...head.sections, ...base.sections]) {
          if (!sk.startsWith('job:')) continue;
          const svc = jobServiceKey(meta.kind, sk.slice(4), ctx.webKeys);
          if (!svc || !sec.raw.includes(`env.${name}`)) continue;
          referenced = true;
          const argRe = new RegExp(`--build-arg\\s+([A-Z][A-Z0-9_]*)=\\$\\{\\{\\s*env\\.${name}\\s*\\}\\}`);
          const arg = argRe.exec(sec.raw)?.[1];
          const tag = `env ${name}${arg ? ` → build-arg ${arg}` : ''}`;
          if (!arg) {
            if (!out[svc].config.includes(tag)) out[svc].config.push(tag);
            continue;
          }
          const used = ctx.consumes ? ctx.consumes(arg, svc) : null;
          if (used === false) {
            const note = `${tag} 변경 — 서비스 소스가 ${arg} 를 읽지 않음 → artifact 무영향`;
            if (!out[svc].notes.includes(note)) out[svc].notes.push(note);
          } else if (!out[svc].build.includes(tag)) {
            out[svc].build.push(tag);
            if (AUTH_BUILD_INPUT.test(arg) || AUTH_BUILD_INPUT.test(name)) out[svc].auth.push(tag);
          }
        }
        if (!referenced) {
          // 어떤 배포 job 도 참조하지 않는 env (예: PROJECT_ID 처럼 run 에서 쓰는 값) → 배포 설정
          if (/^VITE_/.test(name)) all((s) => s.notes.push(`env ${name} 변경 — 참조하는 배포 job 없음`));
          else all((s) => s.config.push(`top env ${name}`));
        }
      }
      continue;
    }

    if (key === 'top:other') {
      // on · inputs · concurrency · name — 실행 조건일 뿐 artifact · 설정 아님
      all((s) => {
        s.control += changedLines.length + changedTokens.length;
      });
      continue;
    }

    const job = key.slice(4);
    const svc = jobServiceKey(meta.kind, job, ctx.webKeys);
    if (!svc) {
      all((s) => {
        s.control += changedLines.length + changedTokens.length;
      });
      continue;
    }
    const s = out[svc];
    for (const line of changedLines) {
      const c = classifyLine(line);
      if (c === 'control') s.control += 1;
      else s[c].push(line.slice(0, 120));
      if (c === 'build' && AUTH_BUILD_INPUT.test(line)) s.auth.push(line.slice(0, 120));
    }
    for (const tok of changedTokens) {
      const c = classifyToken(tok);
      s[c].push(tok.slice(0, 120));
    }
  }
  return out;
}
