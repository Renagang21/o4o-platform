/**
 * WO-O4O-WINDOWS-VISUAL-COMPUTER-USE-AND-FAST-LOOP-V1 §13 — 필수 테스트 (계약 + runtime 통합)
 *
 * 핵심 원칙: "UIA 가 못 보는 순간 자동화를 포기하지 말고, 실제 화면을 AI 가 보고 이어서 작업하게 만든다.
 *            동시에 한 동작마다 AI 를 부르는 구조를 줄인다." — structured-first 는 유지(UIA → Visual → 사용자 질문).
 *
 * 앞의 7개(순수 계약)는 DB 없이 validateWorkProposal 로 visual_* 표면 게이팅·형상·좌표·텍스트·키와
 * 배치(§7) 검증을 본다. 뒤의 5개(runtime 통합)는 work-agent.spec 과 같은 DB stub 하네스로:
 *   ⑧ unsupported_control → 즉시 인계하지 않고 화면을 캡처해 planner 에 screen_capture 이미지를 넘긴다.
 *   ⑨ WINDOWS_AUTOMATION_HIDDEN_CONTROL → 즉시 uia_hidden_control 인계가 아니라 시각 fallback.
 *   ⑩ visual_click 은 local.computer.click 으로 실행되고, 자격 요구(COMPUTER_USE_USER_ACTION_REQUIRED)는 credential_required 인계.
 *   ⑪ 연속 visual 실패(2회) → vision_uncertain 인계.
 *   ⑫ Fast Loop 배치는 한 번의 plan 으로 연속 실행하고 마지막에 한 번만 재관찰한다(§7) — 그리고 캡처 base64 는
 *      로그·결과·history 어디에도 남지 않는다(SENSITIVE_IMAGE_PERSISTENCE=0, §4-1).
 *
 * 실 Doctors·실 PC·실 planner 는 CHECK 의 smoke 가 본다. 여기서는 planner·agent 응답을 주입해 배선만 검사한다.
 */

jest.setTimeout(60_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import logger from '../utils/logger.js';
import { LOCAL_AGENT_ACTIONS, LOCAL_AGENT_ERROR, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import {
  WORK_BATCH_MAX,
  validateWorkProposal,
  type WorkObservation,
} from '../services/ai-tools/work-agent-contract.js';
import { runWorkAgent, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

// ─────────────────────────────────────────────────────────────────────────────
// 순수 계약 — visual_* 표면 게이팅 · 형상 · 배치 검증 (§4·§7·§9·§10)
// ─────────────────────────────────────────────────────────────────────────────

const APP = 'windows.doctors';
const SNAP = 's_abcd1234';

/** uia 관찰 하나를 만든다. visualFallback=true 여야 visual_* 가 허용된다(structured-first 보존). */
function uiaObs(visualFallback: boolean, elements: WorkObservation['elements'] = []): WorkObservation {
  return {
    siteId: APP, path: 'window:Doctors', ready: true, elements, elementCount: elements.length,
    source: 'app_window', surface: 'uia',
    windows: [{ windowRef: 'w_1', title: 'Doctors', foreground: true, userAction: false }],
    fingerprint: 'fp', visualFallback,
  } as WorkObservation;
}
const domObs = (): WorkObservation => ({
  siteId: 'healthkr', path: '/', ready: true, elements: [], elementCount: 0, source: 'webpage', surface: 'dom', fingerprint: 'fp',
} as WorkObservation);
const P = (action: unknown, extra: Record<string, unknown> = {}) => ({ assessment: 'progress', action, ...extra });

describe('§4 visual_* 계약 — 표면 게이팅 · 형상 (순수)', () => {
  it('① visual_click: dom 표면·시각 모드 아닌 uia 에서는 거절(SURFACE_MISMATCH), uia+visualFallback 에서만 허용', () => {
    const click = { kind: 'visual_click', x: 0.5, y: 0.5 };
    // dom 표면 — visual_* 는 존재하지 않는 표면.
    expect(validateWorkProposal(P(click), domObs())).toMatchObject({ ok: false, reason: 'SURFACE_MISMATCH' });
    // uia 지만 아직 구조 모드(visualFallback=false) — structured-first 가 지켜진다.
    expect(validateWorkProposal(P(click), uiaObs(false))).toMatchObject({ ok: false, reason: 'SURFACE_MISMATCH' });
    // uia + 시각 fallback — 이때만 통과, 좌표는 정규화되어 실린다.
    const ok = validateWorkProposal(P(click), uiaObs(true));
    expect(ok.ok).toBe(true);
    expect(ok.proposal?.action).toMatchObject({ kind: 'visual_click', x: 0.5, y: 0.5 });
  });

  it('② visual_click: 0..1 밖 좌표·clicks 지정은 SHAPE(단일 클릭·정규화 좌표만)', () => {
    expect(validateWorkProposal(P({ kind: 'visual_click', x: 1.5, y: 0.5 }), uiaObs(true))).toMatchObject({ ok: false, reason: 'SHAPE' });
    expect(validateWorkProposal(P({ kind: 'visual_click', x: -0.1, y: 0.5 }), uiaObs(true))).toMatchObject({ ok: false, reason: 'SHAPE' });
    // local.computer.click 원형은 {x,y} 두 키만 — 더블클릭(clicks)은 시각 모드에 없다.
    expect(validateWorkProposal(P({ kind: 'visual_click', x: 0.5, y: 0.5, clicks: 2 }), uiaObs(true))).toMatchObject({ ok: false, reason: 'SHAPE' });
  });

  it('③ visual_type: credential/OTP·HTML 성격 텍스트는 TEXT_DENIED, 평범한 텍스트만 허용', () => {
    expect(validateWorkProposal(P({ kind: 'visual_type', text: 'password123' }), uiaObs(true))).toMatchObject({ ok: false, reason: 'TEXT_DENIED' });
    expect(validateWorkProposal(P({ kind: 'visual_type', text: '비밀번호1234' }), uiaObs(true))).toMatchObject({ ok: false, reason: 'TEXT_DENIED' });
    expect(validateWorkProposal(P({ kind: 'visual_type', text: '<script>x</script>' }), uiaObs(true))).toMatchObject({ ok: false, reason: 'TEXT_DENIED' });
    const ok = validateWorkProposal(P({ kind: 'visual_type', text: '반납대상' }), uiaObs(true));
    expect(ok.ok).toBe(true);
    expect(ok.proposal?.action).toMatchObject({ kind: 'visual_type', text: '반납대상' });
  });

  it('④ visual_key: ENTER·TAB·ESC 만 허용(그 밖은 KEY_INVALID)', () => {
    expect(validateWorkProposal(P({ kind: 'visual_key', key: 'F5' }), uiaObs(true))).toMatchObject({ ok: false, reason: 'KEY_INVALID' });
    expect(validateWorkProposal(P({ kind: 'visual_key', key: 'CTRL+A' }), uiaObs(true))).toMatchObject({ ok: false, reason: 'KEY_INVALID' });
    const ok = validateWorkProposal(P({ kind: 'visual_key', key: 'TAB' }), uiaObs(true));
    expect(ok.ok).toBe(true);
    expect(ok.proposal?.action).toMatchObject({ kind: 'visual_key', key: 'TAB' });
  });
});

describe('§7 배치(Fast Loop) 계약 — 형상 · 부분 실행 금지 (순수)', () => {
  const good = { kind: 'visual_click', x: 0.5, y: 0.5 };

  it('⑤ 배치 길이가 WORK_BATCH_MAX 를 넘거나 비면 SHAPE', () => {
    const tooMany = Array.from({ length: WORK_BATCH_MAX + 1 }, () => ({ ...good }));
    expect(validateWorkProposal(P(good, { actions: tooMany }), uiaObs(true))).toMatchObject({ ok: false, reason: 'SHAPE' });
    expect(validateWorkProposal(P(good, { actions: [] }), uiaObs(true))).toMatchObject({ ok: false, reason: 'SHAPE' });
  });

  it('⑥ 배치에 실행 행동이 아닌 종류(inspect·read_text)가 있으면 UNKNOWN_ACTION', () => {
    expect(validateWorkProposal(P(good, { actions: [good, { kind: 'inspect' }] }), uiaObs(true))).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    expect(validateWorkProposal(P(good, { actions: [{ kind: 'read_text', elementRef: 'e_1' }] }), uiaObs(true))).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
  });

  it('⑦ 금지 키가 섞이면 FORBIDDEN_KEY, 배치 항목 하나만 어긋나도 proposal 전체 거절(부분 실행 없음)', () => {
    // 금지 키(selector 등)를 실은 배치 항목 — 전체 거절.
    expect(validateWorkProposal(P(good, { actions: [good, { kind: 'visual_click', x: 0.4, y: 0.4, selector: '.x' }] }), uiaObs(true))).toMatchObject({ ok: false, reason: 'FORBIDDEN_KEY' });
    // 좌표 하나가 범위 밖 — 앞 항목이 유효해도 배치 전체를 거절한다(부분 실행 금지).
    const r = validateWorkProposal(P(good, { actions: [good, { kind: 'visual_click', x: 2, y: 0.4 }] }), uiaObs(true));
    expect(r.ok).toBe(false);
    expect(r.proposal).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// runtime 통합 — 시각 fallback · Fast Loop 배선 (DB stub 하네스)
// ─────────────────────────────────────────────────────────────────────────────

const REQUEST = '닥터스에서 반납대상 리스트 보여줘';
/** 캡처 base64 자리표시자 — 유효한 base64 문자만, 로그·결과·history 어디에도 새면 안 되는 값이라 유일하게 표시한다. */
const SENTINEL = 'ZZVISUALCAPTUREONLYSENTINELBASE64ZZ';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });

type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: Record<string, unknown> };
type Script = Record<string, Outcome[]>;

const UIA_INSPECT_OK: Outcome = {
  status: 'success',
  data: {
    appId: APP, snapshotId: SNAP, elementCount: 3,
    elements: [
      { elementRef: 'e_1', role: 'listitem', name: '반납대상' },
      { elementRef: 'e_2', role: 'textbox', name: '수량' },
      { elementRef: 'e_3', role: 'button', name: '조회' },
    ],
    windows: [{ windowRef: 'w_1', title: 'Doctors', foreground: true, minimized: false, userAction: false }],
  },
};
const CAPTURE_OK: Outcome = {
  status: 'success',
  data: { targetId: APP, foreground: true, imageMime: 'image/jpeg', imageBase64: SENTINEL, imageWidth: 1024, imageHeight: 768 },
};

/** commandId 를 소진하며 script 에 따라 결과를 넣는다. prepare/activate 는 고정 응답. base 는 full action(dom 접두 제거 없음). */
async function drive(db: LocalAgentDb, script: Script, max = 120) {
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const { base } = parseLocalAction(String(cmd.action));
    if (base === LOCAL_AGENT_ACTIONS.TARGET_PREPARE) {
      await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data: { targetId: APP, targetType: 'windows_app', state: 'ready', reusedExisting: true, openedByO4O: false, windowCount: 1 } } as any);
      continue;
    }
    if (base === LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW) {
      await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data: {} } as any);
      continue;
    }
    const queue = script[base] ?? [{ status: 'failed', errorCode: LOCAL_AGENT_ERROR.UIA_TARGET_NOT_FOREGROUND }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
}

function scripted(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push(input);
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      if (p instanceof Error) throw p;
      return p;
    },
  } as WorkPlanner & { calls: PlannerInput[] };
}

async function run(planner: WorkPlanner, script: Script) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request: REQUEST }, planner), drive(db, script)]);
  return { result, db };
}

/** 발행된 명령들의 base 순서(prepare/activate 포함 전부). */
const commandBases = (db: LocalAgentDb): string[] => db.commands.map((c) => parseLocalAction(String(c.action)).base);

/** SENSITIVE_IMAGE_PERSISTENCE=0 — 캡처 base64 가 로그·결과·history 어디에도 없는지. */
function assertNoImageLeak(result: unknown, db: LocalAgentDb) {
  for (const level of ['info', 'warn', 'error', 'debug'] as const) {
    for (const call of (logger[level] as jest.Mock).mock.calls) {
      expect(JSON.stringify(call ?? null)).not.toContain(SENTINEL);
    }
  }
  expect(JSON.stringify(result)).not.toContain(SENTINEL);
  // DB(명령 result_data 포함)에도 남지 않는다 — 캡처 이미지는 요청 메모리에서만 산다.
  expect(JSON.stringify(db.commands)).not.toContain(SENTINEL);
}

beforeEach(() => jest.clearAllMocks());

describe('§4 unsupported_control · hidden_control → 시각 fallback (runtime)', () => {
  it('⑧ unsupported_control 은 즉시 인계하지 않고 화면을 캡처해 planner 에 screen_capture 이미지를 넘긴 뒤 잇는다', async () => {
    const planner = scripted([
      P({ kind: 'takeover', reason: 'unsupported_control' }),
      { assessment: 'completed', action: { kind: 'done' } },
    ]);
    const { result, db } = await run(planner, {
      [LOCAL_AGENT_ACTIONS.UIA_INSPECT]: [UIA_INSPECT_OK],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE]: [CAPTURE_OK],
    });
    // 인계로 끝나지 않았다 — 시각 모드로 이어서 완료.
    expect(result.takeover).toBeNull();
    expect(result.progress).toBe('completed');
    // 캡처가 실제로 발행됐고(활성화 → 캡처), 두 번째 plan 이 screen_capture 이미지를 받았다.
    expect(commandBases(db)).toContain(LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE);
    expect(planner.calls[1].image?.provenance).toBe('screen_capture');
    assertNoImageLeak(result, db);
  });

  it('⑨ WINDOWS_AUTOMATION_HIDDEN_CONTROL 은 즉시 uia_hidden_control 인계가 아니라 시각 fallback 으로 잇는다', async () => {
    const planner = scripted([
      P({ kind: 'click', elementRef: 'e_1' }), // 숨은 목록 항목 클릭 시도
      { assessment: 'completed', action: { kind: 'done' } },
    ]);
    const { result, db } = await run(planner, {
      [LOCAL_AGENT_ACTIONS.UIA_INSPECT]: [UIA_INSPECT_OK],
      [LOCAL_AGENT_ACTIONS.UIA_INVOKE]: [{ status: 'failed', errorCode: LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_HIDDEN_CONTROL }],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE]: [CAPTURE_OK],
    });
    expect(result.takeover).toBeNull(); // uia_hidden_control 로 즉시 멈추지 않았다
    expect(result.progress).toBe('completed');
    expect(commandBases(db)).toContain(LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE);
    expect(planner.calls[1].image?.provenance).toBe('screen_capture');
    assertNoImageLeak(result, db);
  });
});

describe('§4 visual 조작 실행 · 실패 인계 (runtime)', () => {
  it('⑩ visual_click 은 local.computer.click 으로 실행되고, 자격 요구는 credential_required 인계', async () => {
    const planner = scripted([
      P({ kind: 'takeover', reason: 'unsupported_control' }), // 시각 모드 진입
      P({ kind: 'visual_click', x: 0.5, y: 0.5 }),
    ]);
    const { result, db } = await run(planner, {
      [LOCAL_AGENT_ACTIONS.UIA_INSPECT]: [UIA_INSPECT_OK],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE]: [CAPTURE_OK],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CLICK]: [{ status: 'failed', errorCode: LOCAL_AGENT_ERROR.COMPUTER_USER_ACTION_REQUIRED }],
    });
    expect(commandBases(db)).toContain(LOCAL_AGENT_ACTIONS.COMPUTER_CLICK); // 좌표 클릭이 computer 축으로 실행됨
    expect(result.takeover?.reason).toBe('credential_required');
    expect(result.progress).toBe('needs_user');
    assertNoImageLeak(result, db);
  });

  it('⑪ 연속 visual 실패(2회)는 vision_uncertain 으로 인계된다', async () => {
    const planner = scripted([
      P({ kind: 'takeover', reason: 'unsupported_control' }), // 시각 모드 진입
      P({ kind: 'visual_click', x: 0.4, y: 0.4 }),
      P({ kind: 'visual_click', x: 0.6, y: 0.6 }),
    ]);
    const { result, db } = await run(planner, {
      [LOCAL_AGENT_ACTIONS.UIA_INSPECT]: [UIA_INSPECT_OK],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE]: [CAPTURE_OK],
      [LOCAL_AGENT_ACTIONS.COMPUTER_CLICK]: [{ status: 'failed', errorCode: LOCAL_AGENT_ERROR.COMPUTER_TARGET_LOST }],
    });
    expect(result.takeover?.reason).toBe('vision_uncertain');
    expect(result.progress).toBe('needs_user');
    assertNoImageLeak(result, db);
  });
});

describe('§7 Fast Loop 배치 — 한 plan 연속 실행 · 단일 재관찰 (runtime)', () => {
  it('⑫ set_input·set_input·click 배치는 한 번의 plan 으로 연속 실행되고 마지막에 한 번만 재관찰한다', async () => {
    // 배치 하나(3행동)를 낸 뒤 done — 세 행동에 plan 은 두 번만 불린다(한 동작마다 AI 를 부르지 않는 축).
    const planner = scripted([
      P({ kind: 'set_input', elementRef: 'e_2', text: '10' }, {
        actions: [
          { kind: 'set_input', elementRef: 'e_2', text: '10' },
          { kind: 'set_input', elementRef: 'e_2', text: '20' },
          { kind: 'click', elementRef: 'e_3' },
        ],
      }),
      { assessment: 'completed', action: { kind: 'done' } },
    ]);
    const { result, db } = await run(planner, {
      [LOCAL_AGENT_ACTIONS.UIA_INSPECT]: [UIA_INSPECT_OK, UIA_INSPECT_OK],
      [LOCAL_AGENT_ACTIONS.UIA_SET_VALUE]: [{ status: 'success', data: { verified: true, hasValue: true } }, { status: 'success', data: { verified: true, hasValue: true } }],
      [LOCAL_AGENT_ACTIONS.UIA_INVOKE]: [{ status: 'success', data: { executed: true } }],
    });
    expect(result.progress).toBe('completed');
    const bases = commandBases(db);
    // 배치가 순서대로 연속 실행됐다: 최초 관찰 → set_value → set_value → invoke → (단일) 재관찰.
    const seq = bases.filter((b) => b === LOCAL_AGENT_ACTIONS.UIA_SET_VALUE || b === LOCAL_AGENT_ACTIONS.UIA_INVOKE || b === LOCAL_AGENT_ACTIONS.UIA_INSPECT);
    expect(seq).toEqual([
      LOCAL_AGENT_ACTIONS.UIA_INSPECT, // 최초 관찰
      LOCAL_AGENT_ACTIONS.UIA_SET_VALUE,
      LOCAL_AGENT_ACTIONS.UIA_SET_VALUE,
      LOCAL_AGENT_ACTIONS.UIA_INVOKE,
      LOCAL_AGENT_ACTIONS.UIA_INSPECT, // click 뒤 단 한 번의 재관찰
    ]);
    // 3개 행동 배치에 planner 는 2번만 불렸다(배치 plan 1 + 완료 판단 1).
    expect(planner.calls.length).toBe(2);
  });
});
