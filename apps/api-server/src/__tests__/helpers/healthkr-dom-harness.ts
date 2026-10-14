/**
 * 약학정보원(healthkr) DOM 업무 하네스 — 실제 runWorkAgent 를 로컬 에이전트 stub 위에서 돌리고,
 * 노드 명령에 정해진 결과로 답한다(planner 는 각본). 판정 · 완료 계약 테스트가 화면 각본만 바꿔 쓴다.
 */

import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../../services/local-agent/local-agent-protocol.js';
import { submitCommandResult } from '../../services/local-agent/local-agent-service.js';
import { runWorkAgent, type PlannerInput, type WorkPlanner } from '../../services/ai-tools/work-agent-runtime.js';
import type { CompletionJudge, ExecutionIntent } from '../../services/ai-tools/work-agent-contract.js';
import type { VerifiedToolContext } from '../../services/ai-tools/ai-tool-contract.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './local-agent-db-stub.js';

export const HEALTHKR = Object.freeze({
  site: 'healthkr',
  snapshot: 's_abcd1234',
  request: '약학정보원에서 아모디핀 찾아줘',
});

export type DomOutcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
export type DomScript = Record<string, DomOutcome[]>;

export const domOk = (data: Record<string, unknown>): DomOutcome => ({ status: 'success', data: { siteId: HEALTHKR.site, ...data } });
export const domContext = (path: string, docId: string): DomOutcome => domOk({ active: true, ready: true, path, docId });
export const domElement = (elementRef: string, role: string, name: string) => ({ elementRef, role, name });
export const domInspect = (elements: ReturnType<typeof domElement>[]): DomOutcome =>
  domOk({ snapshotId: HEALTHKR.snapshot, elements, elementCount: elements.length });

/** 검색 화면 → 결과 화면(결과 링크 하나) · 결과 글 읽기. */
export const HEALTHKR_HOME = [domElement('e_1', 'heading', '약학정보원'), domElement('e_2', 'searchbox', '약물명'), domElement('e_3', 'button', '검 색')];
export const HEALTHKR_RESULTS = [...HEALTHKR_HOME, domElement('e_9', 'link', '아모디핀정 5mg')];
export const HEALTHKR_SEARCH: DomScript = {
  get_context: [domContext('/', 'd_1'), domContext('/search', 'd_2')],
  inspect: [domInspect(HEALTHKR_HOME), domInspect(HEALTHKR_RESULTS)],
  click: [domOk({ elementRef: 'e_3', changed: true, navigated: true, role: 'button', riskLevel: 'REVERSIBLE' })],
  read_text: [domOk({ elementRef: 'e_9', role: 'link', text: '아모디핀정 5mg 성분: 암로디핀베실산염 6.94mg', textLength: 26 })],
};

const userContext = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });

/** 노드 기억 · 대상 준비 명령은 업무 화면과 무관하게 고정 답 — 각본은 DOM 동작만 다룬다. */
const FIXED_REPLIES: ReadonlyArray<[match: (base: string) => boolean, data: (args: Record<string, unknown>) => unknown]> = [
  [(b) => b === 'local.target.prepare', () => ({
    targetId: HEALTHKR.site, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/',
  })],
  [(b) => b === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_EXPERIENCE_RECALL, (args) => (args.taskKey === null ? { taskKeys: [] } : { patterns: [] })],
  [(b) => b === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CONTEXT_RECALL, () => ({ found: false })],
  [(b) => b === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, () => ({ matched: false })],
  [(b) => b.startsWith('local.data.work_run_'), () => ({ runId: 'r_test', runStatus: 'active', saved: true })],
];

const NOT_FOUND: DomOutcome = { status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' };

async function nextCommand(db: LocalAgentDb, index: number) {
  for (let waited = 0; waited < 400 && db.commands.length <= index; waited += 1) await new Promise((r) => setTimeout(r, 5));
  return db.commands[index];
}

/** 노드 역할 — 쌓이는 명령에 차례로 답한다. 같은 동작이 반복되면 각본의 다음 결과(끝나면 마지막 결과)를 낸다. */
export async function answerNodeCommands(db: LocalAgentDb, script: DomScript, limit = 80): Promise<void> {
  const used = new Map<string, number>();
  for (let index = 0; index < limit; index += 1) {
    const cmd = await nextCommand(db, index);
    if (!cmd) return;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const fixed = FIXED_REPLIES.find(([match]) => match(base));
    let outcome: DomOutcome;
    if (fixed) {
      outcome = { status: 'success', data: fixed[1](cmd.result_data ? JSON.parse(String(cmd.result_data)) : {}) };
    } else {
      const queue = script[base] ?? [NOT_FOUND];
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      outcome = queue[Math.min(n, queue.length - 1)];
    }
    await submitCommandResult(db.dataSource, cmd.device_id, {
      commandId: cmd.command_id, status: outcome.status, errorCode: outcome.errorCode, data: outcome.data,
    } as any);
  }
}

/** 각본 planner — 제안을 차례로 내고(끝나면 마지막 것) 받은 입력을 남긴다. */
export function scriptedPlanner(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push(input);
      return proposals[Math.min(calls.length - 1, proposals.length - 1)];
    },
  };
}

/** 연결된 노드 하나로 runWorkAgent 를 돌린다(요청 = HEALTHKR.request). */
export async function runOnHealthkr(planner: WorkPlanner, script: DomScript, intent?: ExecutionIntent, judge?: CompletionJudge) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result] = await Promise.all([
    runWorkAgent(db.dataSource, userContext(), { request: HEALTHKR.request, ...(intent ? { intent } : {}), ...(judge ? { judge } : {}) }, planner),
    answerNodeCommands(db, script),
  ]);
  return result;
}
