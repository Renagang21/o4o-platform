/**
 * WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
 *
 * capability → tool 자격 → 실행 경계를 고정한다. LLM 호출 없음.
 * DB 는 `dataSource.query` stub 으로 대체해 **실제로 나가는 SQL 과 파라미터**를 검사한다.
 *
 * 특히 고정하려는 것:
 *   - capability 는 **서버가 파생**한다. 클라이언트가 보낸 값은 어디에도 쓰이지 않는다.
 *   - 자격 없는 tool 은 목록에 나타나지도, 실행되지도 않는다(이중 차단).
 *   - 위조된 storeId / capability 가 실행 경로를 열지 못한다.
 *   - read-only executor 가 write SQL 을 만들지 않는다.
 *   - store 미확정(none/ambiguous)에서 매장 tool 이 열리지 않는다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AiCapability,
  AI_TOOL_NAMES,
  AI_TOOL_REGISTRY,
  assertToolAllowed,
  deriveAiCapabilities,
  resolveAvailableTools,
  validateToolArguments,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  executeAiTool,
  looksLikeStoreScopedRequest,
  renderToolContext,
  selectToolForRequest,
} from '../services/ai-tools/ai-tool-router.js';

const homeCtx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  ...over,
});

const storeResolvedCtx = (): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'store',
  serviceKey: 'kpa-society',
  storeStatus: 'resolved',
  organizationId: 'org-1',
});

function makeDataSource(rows: Array<{ capability_key: string; enabled: boolean }>) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const dataSource: any = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return rows;
    }),
  };
  return { dataSource, calls };
}

// ─── capability 파생 ─────────────────────────────────────────────────────────

describe('capability 파생 — 서버 사실만 입력', () => {
  it('1. 인증만 되면 AI context capability 를 갖는다', () => {
    expect(deriveAiCapabilities(homeCtx())).toEqual([
      AiCapability.READ_ONLY_AI_CONTEXT,
      // WO-O4O-LOCAL-WORK-AGENT-V0: "내 PC 연결됐나" 는 인증만으로 답할 수 있다.
      AiCapability.READ_ONLY_LOCAL_AGENT_STATUS,
    ]);
  });

  it('3. store resolved 면 store context capability 가 추가된다', () => {
    expect(deriveAiCapabilities(storeResolvedCtx())).toEqual([
      AiCapability.READ_ONLY_AI_CONTEXT,
      AiCapability.READ_ONLY_STORE_CONTEXT,
      AiCapability.READ_ONLY_LOCAL_AGENT_STATUS,
    ]);
  });

  it('4. store 가 none / ambiguous 면 store capability 를 주지 않는다', () => {
    for (const status of ['none', 'ambiguous'] as const) {
      const caps = deriveAiCapabilities(homeCtx({ workspace: 'store', storeStatus: status, organizationId: undefined }));
      expect(caps).not.toContain(AiCapability.READ_ONLY_STORE_CONTEXT);
    }
  });

  it('status 가 resolved 여도 organizationId 가 없으면 주지 않는다 (반쪽 상태 방지)', () => {
    const caps = deriveAiCapabilities(homeCtx({ workspace: 'store', storeStatus: 'resolved' }));
    expect(caps).not.toContain(AiCapability.READ_ONLY_STORE_CONTEXT);
  });
});

// ─── eligibility (노출 차단) ─────────────────────────────────────────────────

describe('tool eligibility — 자격 없는 tool 은 노출되지 않는다', () => {
  it('1·2. home scope 에서는 매장 tool 이 보이지 않는다', () => {
    const names = resolveAvailableTools(homeCtx()).map((t) => t.name);
    expect(names).toContain(AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT);
    expect(names).not.toContain(AI_TOOL_NAMES.GET_STORE_CONTEXT);
    // WO-O4O-LOCAL-WORK-AGENT-V0 이후: 인증만 되면 "PC 연결됐나" 를 물을 수 있다.
    // 그것은 서버 DB 만으로 답하는 tool 이므로 home 에서도 열려 있다.
    expect(names).toContain(AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS);
    // 반면 실제 PC 를 깨우는 tool 은 연결된 기기가 없으면 열리지 않는다.
    expect(names).not.toContain(AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO);
  });

  it('3. store resolved 에서는 두 tool 모두 보인다', () => {
    const names = resolveAvailableTools(storeResolvedCtx()).map((t) => t.name);
    expect(names).toContain(AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT);
    expect(names).toContain(AI_TOOL_NAMES.GET_STORE_CONTEXT);
  });

  /**
   * WO-O4O-LOCAL-WORK-AGENT-V0 에서 `local` 이 한 개 추가됐고,
   * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 에서 **처음으로 read-only 가 아닌 tool** 이
   * 하나 들어왔다 (`local.activate_window`).
   *
   * 그래서 고정하는 것을 "전부 read-only" 에서
   * **"read-only 가 아니면 허용된 effect 를 선언해야 하고,
   * 그 effect 는 창 활성화 하나뿐"** 으로 옮긴다 (§13·§19·§25～§28).
   * browser tool 은 여전히 0 이다.
   */
  /**
   * WO-O4O-BROWSER-CONTROL-V0 에서 두 번째 non-read-only tool 이 들어왔다
   * (`local.browser.open_site`, effect `BROWSER_SITE_OPEN`).
   *
   * `executionMode: 'browser'` 는 여전히 0 이다 — 사이트 열기는 Local Agent 가 OS handler 를
   * 부르는 **local** 실행이지, 브라우저 안(extension/CDP) 실행이 아니다. 'browser' 슬롯은
   * 후속 Browser Navigation 의 자리로 비워 둔다(§21·§34·§35).
   */
  it('registry 는 read-only 또는 허용된 effect 만 담고 browser-mode tool 은 0 이다', () => {
    const allowedEffects = ['FOREGROUND_ACTIVATION', 'BROWSER_SITE_OPEN'];
    for (const t of AI_TOOL_REGISTRY) {
      expect(['server', 'local']).toContain(t.executionMode);
      if (!t.readOnly) {
        expect(allowedEffects).toContain(t.effect);
      }
    }
    expect(AI_TOOL_REGISTRY.filter((t) => t.executionMode === 'browser')).toEqual([]);

    // 쓰기 쪽은 이 둘이 전부여야 한다. 늘어나면 이 테스트가 먼저 깨진다.
    expect(AI_TOOL_REGISTRY.filter((t) => !t.readOnly).map((t) => t.name)).toEqual([
      AI_TOOL_NAMES.ACTIVATE_WINDOW,
      AI_TOOL_NAMES.BROWSER_OPEN_SITE,
    ]);
    // effect 와 tool 은 1:1 이다 — 같은 effect 를 다른 이름으로 다시 열 수 없다.
    expect(AI_TOOL_REGISTRY.find((t) => t.name === AI_TOOL_NAMES.BROWSER_OPEN_SITE)?.effect)
      .toBe('BROWSER_SITE_OPEN');
  });
});

// ─── 실행 직전 재검증 (이중 차단) ────────────────────────────────────────────

describe('실행 직전 재검증', () => {
  it('2. 자격 없는 tool 은 실행 단계에서도 차단된다', () => {
    const auth = assertToolAllowed(AI_TOOL_NAMES.GET_STORE_CONTEXT, homeCtx());
    expect(auth.allowed).toBe(false);
    expect(auth).toMatchObject({ reason: 'CAPABILITY_MISSING' });
  });

  it('8. 등록부에 없는 tool 이름은 차단된다 (모델이 지어내도 실행 불가)', () => {
    for (const bogus of ['store.delete_all', 'local.file_read', 'browser.navigate', '']) {
      const auth = assertToolAllowed(bogus, storeResolvedCtx());
      expect(auth.allowed).toBe(false);
      expect(auth).toMatchObject({ reason: 'UNKNOWN_TOOL' });
    }
  });

  it('자격이 충족되면 통과한다', () => {
    const auth = assertToolAllowed(AI_TOOL_NAMES.GET_STORE_CONTEXT, storeResolvedCtx());
    expect(auth.allowed).toBe(true);
  });
});

// ─── 인자 검증 ───────────────────────────────────────────────────────────────

describe('9. tool 인자 검증 — 식별자 주입 차단', () => {
  it('빈 인자만 허용한다', () => {
    expect(validateToolArguments({}).ok).toBe(true);
    expect(validateToolArguments(undefined).ok).toBe(true);
    expect(validateToolArguments(null).ok).toBe(true);
  });

  it('6. 위조 storeId/organizationId 를 인자로 넘기면 거부한다', () => {
    for (const bad of [
      { storeId: '00000000-0000-0000-0000-000000000001' },
      { organizationId: 'org-victim' },
      { serviceKey: 'kpa-society' },
    ]) {
      const r = validateToolArguments(bad);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('INVALID_ARGUMENTS');
    }
  });

  it('배열·원시값도 거부한다', () => {
    for (const bad of [[], ['x'], 'str', 42, true]) {
      expect(validateToolArguments(bad).ok).toBe(false);
    }
  });
});

// ─── executor ────────────────────────────────────────────────────────────────

describe('executor — read-only · 식별자 미노출', () => {
  it('workscope tool 은 UUID 를 반환하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([]);
    const r = await executeAiTool(dataSource, AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT, {}, storeResolvedCtx());
    expect(r.ok).toBe(true);
    const json = JSON.stringify(r);
    expect(json).not.toContain('org-1');
    expect(json).not.toContain('user-1');
    // DB 를 건드리지 않는다.
    expect(calls).toHaveLength(0);
  });

  it('3·10. store tool 은 확정된 organizationId 로만 조회하고 write 를 하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([
      { capability_key: 'TABLET', enabled: true },
      { capability_key: 'SIGNAGE', enabled: true },
      { capability_key: 'KIOSK', enabled: false },
    ]);
    const r = await executeAiTool(dataSource, AI_TOOL_NAMES.GET_STORE_CONTEXT, {}, storeResolvedCtx());

    expect(r.ok).toBe(true);
    if (r.ok) {
      // 비활성 기능은 제외된다.
      expect(r.data.enabledFeatureCount).toBe(2);
      expect(r.data.enabledFeatures).toEqual(['태블릿 주문', '사이니지']);
    }
    // 세션에서 확정한 org 로만 조회한다.
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual(['org-1']);
    // read-only 고정.
    expect(calls[0].sql).toMatch(/^\s*SELECT/i);
    expect(calls[0].sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i);
  });

  it('4·5. store 미확정이면 executor 가 스스로 막고 DB 를 조회하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([{ capability_key: 'TABLET', enabled: true }]);
    const r = await executeAiTool(
      dataSource,
      AI_TOOL_NAMES.GET_STORE_CONTEXT,
      {},
      homeCtx({ workspace: 'store', storeStatus: 'ambiguous' }),
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ reason: 'CAPABILITY_MISSING' });
    // 다른 매장 데이터가 새어나갈 질의 자체가 없다.
    expect(calls).toHaveLength(0);
  });

  it('7. 클라이언트가 보낸 capability 는 판정에 쓰이지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([{ capability_key: 'TABLET', enabled: true }]);
    // 컨텍스트에 클라이언트발 capability 를 억지로 끼워넣어도 타입 밖이라 판정에 닿지 않는다.
    const forged = { ...homeCtx(), capabilities: ['READ_ONLY_STORE_CONTEXT'] } as unknown as VerifiedToolContext;
    const r = await executeAiTool(dataSource, AI_TOOL_NAMES.GET_STORE_CONTEXT, {}, forged);
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

// ─── 결정론적 선택 ───────────────────────────────────────────────────────────

describe('12. 결정론적 tool 선택 (agent loop 없음)', () => {
  it('매장 지시어를 인식한다 (한글 공백 변형 포함)', () => {
    for (const m of [
      '내 매장 기준으로 알려줘',
      '내매장 기능',       // 공백 없음
      '내  매장 기능',     // 공백 2칸
      '우리 약국에 맞게',
      'my store setup',
      'List features in MY  STORE',
    ]) {
      expect(looksLikeStoreScopedRequest(m)).toBe(true);
    }
    for (const m of ['약국 POP 원칙 알려줘', '안녕하세요', 'store hours']) {
      expect(looksLikeStoreScopedRequest(m)).toBe(false);
    }
  });

  /**
   * 회귀 고정 — 2026-09-09 프로덕션 실측 결함.
   *
   * 한글을 정규식 리터럴(`/내\s*매장/`)로 두면 번들 후 매칭이 실패했다(영어 패턴만 동작).
   * 소스가 순수 ASCII 로 유지되는지 확인해 같은 실수를 막는다.
   */
  it('한글 의도 키워드가 정규식이 아닌 ASCII 이스케이프 문자열로 유지된다', () => {
    const src = readFileSync(
      join(__dirname, '..', 'services', 'ai-tools', 'ai-tool-router.ts'),
      'utf8',
    );
    // 키워드 선언부에 한글 원문이 들어가면 안 된다(주석은 허용).
    const declStart = src.indexOf('STORE_INTENT_KEYWORDS_KO: readonly string[] = [');
    // 선언 블록만 잘라낸다 — 뒤따르는 주석까지 포함하면 주석 속 한글에 걸린다.
    const decl = src.slice(declStart, src.indexOf('];', declStart) + 2);
    const codeOnly = decl
      .split('\n')
      .map((l) => l.split('//')[0])
      .join('\n');
    expect(codeOnly).not.toMatch(/[가-힣]/);
    expect(codeOnly).toMatch(/\\u[0-9A-F]{4}/);
    // 정규식 리터럴에 한글이 다시 들어오지 않았는지도 본다.
    // 주석에는 설명용으로 옛 패턴이 남아 있으므로 **주석을 먼저 제거**하고 검사한다.
    const codeWithoutComments = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    const regexLiterals = codeWithoutComments.match(/\/(?![/*])(?:\\.|[^/\n])+\/[gimsuy]*/g) ?? [];
    expect(regexLiterals.filter((r) => /[가-힣]/.test(r))).toEqual([]);
  });

  it('자격이 있을 때만 매장 tool 을 고른다', () => {
    expect(selectToolForRequest('내 매장 기준으로 알려줘', storeResolvedCtx()))
      .toBe(AI_TOOL_NAMES.GET_STORE_CONTEXT);
  });

  it('4. 자격이 없으면 tool 을 고르지 않는다 (텍스트 응답으로 간다)', () => {
    expect(selectToolForRequest('내 매장 기준으로 알려줘', homeCtx())).toBeNull();
    expect(
      selectToolForRequest('내 매장 기준으로', homeCtx({ workspace: 'store', storeStatus: 'none' })),
    ).toBeNull();
  });

  it('매장 지시어가 없으면 tool 을 고르지 않는다', () => {
    expect(selectToolForRequest('약국 POP 원칙 3가지', storeResolvedCtx())).toBeNull();
  });
});

// ─── 프롬프트 주입 형태 ──────────────────────────────────────────────────────

describe('tool 결과 → 프롬프트 컨텍스트', () => {
  it('구조체가 아니라 요약 문장으로 변환된다', async () => {
    const { dataSource } = makeDataSource([{ capability_key: 'POP_PRINT', enabled: true }]);
    const r = await executeAiTool(dataSource, AI_TOOL_NAMES.GET_STORE_CONTEXT, {}, storeResolvedCtx());
    const block = renderToolContext(r);
    expect(block).toContain('POP 출력');
    expect(block).not.toContain('org-1');
    expect(block).not.toContain('{');
  });

  it('차단된 결과는 프롬프트에 아무것도 넣지 않는다', () => {
    expect(renderToolContext({ ok: false, tool: 'x', reason: 'CAPABILITY_MISSING' })).toBeNull();
  });
});
