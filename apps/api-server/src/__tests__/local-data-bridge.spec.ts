/**
 * WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §23 — 자동 테스트 18항목
 *
 * cloud → Tool Router → issueCommand → (agent) → 결과 → pickSafeDataInfo 왕복 배관과
 * 안전 경계를 고정한다. 실제 로컬 SQLite 는 부르지 않는다 — 그것은 §24 Windows local smoke ·
 * §25 production smoke 가 담당한다(agent 쪽 DB 계약은 tools/o4o-local-agent/test/local-db.test.mjs).
 *
 * 특히 고정하려는 것 (§29·§30):
 *   - 데이터 tool 은 `local.data.health` · `get_meta` · `set_setting` 3개뿐이고, 대상은 로컬 DB
 *     하나다 — #appId · #siteId 접미사가 붙지 않는다. 임의 SQL · 임의 파일 tool 은 존재하지 않는다.
 *   - get_meta 는 **등재 meta 키 하나**, set_setting 은 **등재 setting 키 + 키별 값 스키마**만
 *     통과한다 — generic KV 가 아니다. 서버와 agent 가 같은 규칙을 두 번 검사한다(§14·§15).
 *   - 응답·프롬프트·로그에 local.db 경로 · setting **값 원문** · local_db_id · 임의 row 가 없다(§19·§20).
 *   - set_setting 은 명시적 쓰기 요청일 때만 결정론적으로 선택된다(§13).
 *   - 서버 allowlist = agent allowlist (§15 이중 방어의 전제).
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DATA_TARGET_ACTIONS,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
  isAllowedLocalAction,
  pickSafeDataInfo,
  validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import {
  AiCapability,
  AI_TOOL_NAMES,
  findToolDefinition,
  resolveAvailableTools,
  validateToolArguments,
  deriveAiCapabilities,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  executeAiTool,
  looksLikeLocalDataRequest,
  needsLocalDeviceResolution,
  renderToolContext,
  selectToolInvocationForRequest,
} from '../services/ai-tools/ai-tool-router.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const AGENT_SRC = join(__dirname, '..', '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
const readAgent = (f: string) => readFileSync(join(AGENT_SRC, f), 'utf8');

const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  localAgentStatus: 'connected',
  localDeviceId: 'dev-1',
  ...over,
});

type AgentOutcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };

async function respondAsAgent(db: LocalAgentDb, index: number, outcome: AgentOutcome) {
  for (let i = 0; i < 400 && db.commands.length <= index; i += 1) {
    await new Promise((r) => setTimeout(r, 5));
  }
  const cmd = db.commands[index];
  if (!cmd) throw new Error(`command #${index} 가 발행되지 않았다`);
  await submitCommandResult(db.dataSource, cmd.device_id, {
    commandId: cmd.command_id,
    status: outcome.status,
    errorCode: outcome.errorCode,
    data: outcome.data,
  } as any);
  return cmd;
}

/** 데이터 tool 은 명령 1개(왕복)다. agent 처럼 한 번 답한다. */
async function runDataTool(db: LocalAgentDb, tool: string, args: Record<string, unknown>, outcome: AgentOutcome) {
  const [result] = await Promise.all([executeAiTool(db.dataSource, tool, args, ctx()), respondAsAgent(db, 0, outcome)]);
  return { result, cmds: db.commands };
}

// ─── 1~4. 왕복 (§5·§19) ──────────────────────────────────────────────────────

describe('1~4. cloud → agent → 결과 왕복', () => {
  it('1. health — action 은 접미사 없는 local.data.health, 되돌아오는 것은 상태뿐(경로 없음)', async () => {
    const db = makeDb();
    await connected(db);
    const { result, cmds } = await runDataTool(db, AI_TOOL_NAMES.DATA_LOCAL_HEALTH, {}, {
      status: 'success',
      data: { ok: true, schemaVersion: 1, migrationStatus: 'current', dbPath: 'C:\\Users\\x\\local.db' },
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].action).toBe(LOCAL_AGENT_ACTIONS.DATA_HEALTH);
    expect(cmds[0].action).not.toContain('#');
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ available: true, ok: true, schemaVersion: 1, migrationStatus: 'current' });
    const text = JSON.stringify(result) + (renderToolContext(result) ?? '');
    for (const leaked of ['local.db', 'C:\\Users', 'dbPath']) expect(text).not.toContain(leaked);
    expect(renderToolContext(result)).toContain('## 로컬 데이터 상태');
  });

  it('2. get_meta — {key} 만 실려 가고, 되돌아오는 것은 key/value 하나', async () => {
    const db = makeDb();
    await connected(db);
    const { result, cmds } = await runDataTool(db, AI_TOOL_NAMES.DATA_GET_LOCAL_META, { key: 'schema_version' }, {
      status: 'success',
      data: { key: 'schema_version', value: '1' },
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].action).toBe(LOCAL_AGENT_ACTIONS.DATA_GET_META);
    expect(cmds[0].result_data).toBeNull(); // claim 시 인자·결과 채널이 지워진다(§8)
    expect(result.data).toMatchObject({ available: true, key: 'schema_version', value: '1' });
    expect(renderToolContext(result)).toContain('schema_version');
  });

  it('3. set_setting — 저장 사실·key 만 돌려주고 값 원문은 응답/프롬프트에 없다(§19)', async () => {
    const db = makeDb();
    await connected(db);
    const { result, cmds } = await runDataTool(db, AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING, { key: 'locale', value: 'ko' }, {
      status: 'success',
      // agent 가 (버그로) 값을 되돌려 보내도 서버 화이트리스트가 버려야 한다.
      data: { saved: true, key: 'locale', value: 'ko' },
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].action).toBe(LOCAL_AGENT_ACTIONS.DATA_SET_SETTING);
    expect(result.data).toMatchObject({ available: true, saved: true, key: 'locale' });
    // 값 'ko' 는 setting value 이므로 응답·프롬프트 어디에도 없다.
    const rendered = renderToolContext(result) ?? '';
    expect(rendered).toContain('저장했습니다');
    expect(rendered).not.toContain('ko');
    expect(rendered).not.toContain('value');
  });

  it('4. pickSafeDataInfo — 경로·임의 row·credential·local_db_id 는 통과하지 못한다', () => {
    // get_meta 의 value(meta 값: schema_version 등)는 화이트리스트에 있다 — meta 키는
    // allowlist 등재분이라 값이 비민감하다. set_setting 은 애초에 value 를 되돌리지 않고(agent
    // dataSetSetting 이 {key,saved} 만 반환) 렌더도 값을 에코하지 않는다(§19, 테스트 3).
    const safe = pickSafeDataInfo({
      key: 'schema_version',
      value: '1', // meta 값 채널 — 유지된다
      dbPath: 'C:\\x\\local.db',
      local_db_id: 'uuid-1',
      rawRows: [{ a: 1 }],
      credential: 'secret',
      schemaVersion: 1,
      migrationStatus: 'current',
    });
    expect(safe).toEqual({ key: 'schema_version', value: '1', schemaVersion: 1, migrationStatus: 'current' });
    for (const k of ['dbPath', 'local_db_id', 'rawRows', 'credential']) expect(k in safe).toBe(false);
  });
});

// ─── 5~8. 인자 검증 — 명령 발행 전 (§6·§14) ──────────────────────────────────

describe('5~8. 좁은 structured args 강제 (§6·§11)', () => {
  it('5. get_meta — allowlist 밖 meta 키는 명령이 되지 못한다 (local_db_id 포함)', async () => {
    const db = makeDb();
    await connected(db);
    for (const key of ['local_db_id', 'settings', '', 42, null]) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.DATA_GET_LOCAL_META, { key }, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    // 추가 필드가 있어도 실패한다.
    expect(validateToolArguments({ key: 'schema_version', extra: 1 }, findToolDefinition(AI_TOOL_NAMES.DATA_GET_LOCAL_META)!).ok).toBe(false);
    expect(db.commands).toHaveLength(0);
  });

  it('6. set_setting — allowlist 밖 setting 키는 명령이 되지 못한다', async () => {
    const db = makeDb();
    await connected(db);
    for (const key of ['ui.lang', 'db_path', 'anything']) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING, { key, value: 'x' }, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    expect(db.commands).toHaveLength(0);
  });

  it('7. set_setting — 등재 키라도 키별 값 스키마 밖이면 명령이 되지 못한다', async () => {
    const db = makeDb();
    await connected(db);
    // locale 은 ko/en/zh/ja enum, export_format 은 csv, profile 은 좁은 식별자.
    for (const args of [
      { key: 'locale', value: 'de' },
      { key: 'locale', value: 'korean' },
      { key: 'preferred_export_format', value: 'xlsx' },
      { key: 'selected_source_profile', value: 'has space' },
      { key: 'locale' }, // value 없음
    ]) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING, args, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    expect(db.commands).toHaveLength(0);
  });

  it('8. validateLocalCommandArgs — 서버 명령 계약도 같은 규칙을 강제한다 (임의 SQL 인자 거부)', () => {
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_HEALTH, {}).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_HEALTH, { sql: 'SELECT 1' }).ok).toBe(false);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_GET_META, { key: 'schema_version' }).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_GET_META, { key: 'local_db_id' }).ok).toBe(false);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_SET_SETTING, { key: 'locale', value: 'ko' }).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_SET_SETTING, { key: 'locale', value: 'de' }).ok).toBe(false);
    // 임의 SQL/파일 인자를 실을 칸이 없다.
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_SET_SETTING, { key: 'locale', value: 'ko', sql: 'x' }).ok).toBe(false);
  });
});

// ─── 9~11. allowlist · registry (§12·§18) ────────────────────────────────────

describe('9~11. tool 등록부 · allowlist', () => {
  it('9. 데이터 축 3개는 allowlist 에 접미사 없이 그대로 있고, #appId 형태는 없다', () => {
    expect(DATA_TARGET_ACTIONS).toEqual([
      LOCAL_AGENT_ACTIONS.DATA_HEALTH,
      LOCAL_AGENT_ACTIONS.DATA_GET_META,
      LOCAL_AGENT_ACTIONS.DATA_SET_SETTING,
    ]);
    for (const a of DATA_TARGET_ACTIONS) {
      expect(isAllowedLocalAction(a)).toBe(true);
      expect(a).not.toContain('#');
      // 접미사를 붙인 형태는 통과하지 못한다.
      expect(isAllowedLocalAction(`${a}#windows.notepad`)).toBe(false);
    }
  });

  it('10. 임의 SQL · 파일 tool 은 등록부에도 allowlist 에도 없다', () => {
    for (const name of ['local.data.execute_sql', 'local.data.query', 'local.sqlite.raw', 'local.data.read_file']) {
      expect(findToolDefinition(name)).toBeUndefined();
      expect(isAllowedLocalAction(name)).toBe(false);
    }
  });

  it('11. 데이터 tool 은 executionMode=local 이고 set_setting 만 쓰기(effect 선언)다', () => {
    const health = findToolDefinition(AI_TOOL_NAMES.DATA_LOCAL_HEALTH)!;
    const meta = findToolDefinition(AI_TOOL_NAMES.DATA_GET_LOCAL_META)!;
    const setting = findToolDefinition(AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING)!;
    for (const t of [health, meta, setting]) expect(t.executionMode).toBe('local');
    expect(health.readOnly).toBe(true);
    expect(meta.readOnly).toBe(true);
    expect(setting.readOnly).toBe(false);
    expect(setting.effect).toBe('LOCAL_DATA_WRITE');
  });
});

// ─── 12~13. capability (§12·§14) ─────────────────────────────────────────────

describe('12~13. 자격 파생', () => {
  it('12. 연결된 PC 가 있을 때만 데이터 자격이 파생된다', () => {
    const caps = new Set(deriveAiCapabilities(ctx()));
    expect(caps.has(AiCapability.READ_ONLY_LOCAL_DATA)).toBe(true);
    expect(caps.has(AiCapability.LOCAL_DATA_SETTING_WRITE)).toBe(true);
    const none = new Set(deriveAiCapabilities(ctx({ localAgentStatus: 'none', localDeviceId: undefined })));
    expect(none.has(AiCapability.READ_ONLY_LOCAL_DATA)).toBe(false);
    expect(none.has(AiCapability.LOCAL_DATA_SETTING_WRITE)).toBe(false);
  });

  it('13. 자격 없으면 데이터 tool 은 후보에 들어오지 않는다', () => {
    const connectedTools = resolveAvailableTools(ctx()).map((t) => t.name);
    expect(connectedTools).toEqual(expect.arrayContaining([
      AI_TOOL_NAMES.DATA_LOCAL_HEALTH,
      AI_TOOL_NAMES.DATA_GET_LOCAL_META,
      AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING,
    ]));
    const offlineTools = resolveAvailableTools(ctx({ localAgentStatus: 'none', localDeviceId: undefined })).map((t) => t.name);
    expect(offlineTools).not.toContain(AI_TOOL_NAMES.DATA_LOCAL_HEALTH);
    expect(offlineTools).not.toContain(AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING);
  });
});

// ─── 14~17. 결정론적 선택 (§13) ──────────────────────────────────────────────

describe('14~17. 결정론적 tool 선택', () => {
  it('14. "로컬 데이터 확인" 은 데이터 축이고 health 로 간다', () => {
    expect(looksLikeLocalDataRequest('로컬 데이터 확인해줘')).toBe(true);
    expect(needsLocalDeviceResolution('로컬 데이터 확인해줘')).toBe(true);
    expect(selectToolInvocationForRequest('로컬 데이터 저장소 상태 확인해줘', ctx())).toEqual({
      tool: AI_TOOL_NAMES.DATA_LOCAL_HEALTH,
      args: {},
    });
  });

  it('15. 스키마/버전 조회는 get_meta(schema_version) 로 간다', () => {
    expect(selectToolInvocationForRequest('로컬 데이터 스키마 버전 알려줘', ctx())).toEqual({
      tool: AI_TOOL_NAMES.DATA_GET_LOCAL_META,
      args: { key: 'schema_version' },
    });
  });

  it('16. set_setting 은 쓰기 지시어 + 확정 가능한 값이 둘 다 있을 때만 선택된다(§13)', () => {
    // 쓰기 지시어 + locale 값.
    expect(selectToolInvocationForRequest('로컬 데이터 언어를 한국어로 설정해줘', ctx())).toEqual({
      tool: AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING,
      args: { key: 'locale', value: 'ko' },
    });
    // 쓰기를 원했지만 어떤 값인지 확정할 수 없으면 **조회로 흘리지 않고** 멈춘다.
    expect(selectToolInvocationForRequest('로컬 데이터 설정 바꿔줘', ctx())).toBeNull();
    // 쓰기 지시어가 없으면 값 언급만으로 저장하지 않는다 — health 로 간다(조회).
    const readOnly = selectToolInvocationForRequest('로컬 데이터 상태 알려줘', ctx());
    expect(readOnly?.tool).not.toBe(AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING);
  });

  it('17. 자격 없으면 데이터 축도 선택되지 않는다', () => {
    expect(
      selectToolInvocationForRequest('로컬 데이터 언어를 한국어로 설정해줘', ctx({ localAgentStatus: 'none', localDeviceId: undefined })),
    ).toBeNull();
  });
});

// ─── 18. 서버 · agent allowlist 교차 검증 + 실패 매핑 (§15·§21) ──────────────

describe('18. 서버 · agent 이중 방어', () => {
  it('18. agent handlers 가 서버 allowlist 를 글자 단위로 미러링하고, 실패는 코드로 정규화된다', () => {
    const handlers = readAgent('handlers.mjs');
    // agent 쪽 ACTIONS 문자열 = 서버 계약.
    for (const [k, v] of [
      ['DATA_HEALTH', LOCAL_AGENT_ACTIONS.DATA_HEALTH],
      ['DATA_GET_META', LOCAL_AGENT_ACTIONS.DATA_GET_META],
      ['DATA_SET_SETTING', LOCAL_AGENT_ACTIONS.DATA_SET_SETTING],
    ] as const) {
      expect(handlers).toContain(`${k}: '${v}'`);
    }
    // agent 도 같은 meta/setting allowlist 와 값 스키마를 들고 있다(§15 재검증).
    expect(handlers).toContain("DATA_META_KEYS = Object.freeze(['schema_version', 'created_at', 'updated_at'])");
    expect(handlers).toContain("DATA_SETTING_KEYS = Object.freeze(['locale', 'preferred_export_format', 'selected_source_profile'])");
    // agent error code = 서버 error code (LOCAL_DATA_INVALID_ARGS 같은 옛 이름을 쓰지 않는다).
    expect(handlers).toContain("'LOCAL_DATA_KEY_NOT_ALLOWED'");
    expect(handlers).toContain("'LOCAL_DATA_INVALID_ARGUMENT'");
    expect(handlers).not.toContain("'LOCAL_DATA_INVALID_ARGS'");
    // agent 저장소 어디에도 임의 SQL/파일 실행 통로가 없다 (주석 제외한 코드 기준 —
    // "execute_sql 같은 tool 은 없다"는 설명 주석은 존재해도 된다).
    const code = handlers
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toContain('execute_sql');
    expect(code).not.toContain("'node:fs'");
    expect(code).not.toContain("'node:child_process'");
  });

  it('18-b. 실패 결과는 안전 문장으로 렌더된다 (offline · timeout · db 없음 · 허용 밖 키)', () => {
    const render = (errorCode: string) =>
      renderToolContext({ ok: true, tool: AI_TOOL_NAMES.DATA_LOCAL_HEALTH, data: { available: false, errorCode } }) ?? '';
    expect(render(LOCAL_AGENT_ERROR.OFFLINE)).toContain('연결되어 있지 않아');
    expect(render(LOCAL_AGENT_ERROR.TIMEOUT)).toContain('제한 시간');
    expect(render(LOCAL_AGENT_ERROR.DATA_DB_NOT_AVAILABLE)).toContain('사용할 수 없습니다');
    expect(render(LOCAL_AGENT_ERROR.DATA_KEY_NOT_ALLOWED)).toContain('허용되지 않은 키');
    // 실패 문장에도 경로·값이 없다.
    for (const code of [LOCAL_AGENT_ERROR.OFFLINE, LOCAL_AGENT_ERROR.DATA_WRITE_FAILED]) {
      expect(render(code)).not.toContain('local.db');
    }
  });
});
