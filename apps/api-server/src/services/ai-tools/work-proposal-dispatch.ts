import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
} from '../local-agent/local-agent-protocol.js';
import {
  DOM_UNIT_MAX_STEPS,
  type DomUnitActStep,
  type SafeDomElement,
} from '../local-agent/browser-dom-contract.js';
import {
  WORK_LOOP_LIMITS,
  describeObservationElement,
  fingerprintObservation,
  type WorkProposal,
  type WorkObservation,
  type WorkStepRecord,
} from './work-agent-contract.js';
import { experienceLocatorOf } from './work-experience.js';
import type { WorkAgentRunResult } from './work-agent-runtime.js';
import type { WorkDispatchContext } from './work-execution-types.js';
import type { issueDomCommand } from './browser-dom-executor.js';
const READ_SUMMARY_MAX = 600;
/** Execute a validated proposal. null asks the existing planner loop to continue. */
export async function dispatchWorkProposal(
  ctx: WorkDispatchContext,
  proposal: WorkProposal,
): Promise<WorkAgentRunResult | null> {
  // Act (§14·§16). snapshot 은 직전 관찰과 짝이다. 비-행동(inspect·find·read_*)은 배치 대상이 아니라 표면별로 여기서 처리하고,
  // 행동(act-only)은 단발 또는 Fast Loop 배치로 execActOnce 에 위임한다.
  const snapshotId =
    (
      ctx.state.observation as WorkObservation & {
        snapshotId?: string;
      }
    )?.snapshotId ?? '';
  const a = proposal.action;
  // ── inspect — 두 표면 공통: 재관찰. ──
  if (a.kind === 'inspect') {
    const rec: WorkStepRecord = {
      step: ctx.state.stepCount + 1,
      action: a,
      status: 'failed',
    };
    const t0 = Date.now();
    const o = await ctx.observe();
    rec.status = o.ok ? 'success' : 'failed';
    rec.errorCode = o.errorCode;
    ctx.state.history.push(rec);
    ctx.stepMeta.set(rec, {
      actor: ctx.currentActor(),
      locator: null,
      durationMs: Date.now() - t0,
    });
    ctx.state.lastResult = rec;
    if (!o.ok) return ctx.observeFailed(o);
    return null;
  }
  // ── uia 표면 읽기 — find · read_text 는 현재 관찰 안에서(명령 0). ──
  if (ctx.surface === 'uia' && a.kind === 'find') {
    const q = a.query ?? {};
    const norm = (v: unknown) =>
      String(v ?? '')
        .replace(/\s+/g, '')
        .toLowerCase();
    const matches = (ctx.state.observation?.elements ?? []).filter((e) => {
      if (q.role && e.role !== q.role) return false;
      const hay = norm(`${e.name ?? ''} ${e.text ?? ''}`);
      for (const k of ['text', 'name', 'label', 'placeholder'] as const) {
        const want = (q as Record<string, unknown>)[k];
        if (typeof want === 'string' && want && !hay.includes(norm(want)))
          return false;
      }
      return true;
    });
    ctx.lastRead = matches.length
      ? matches.slice(0, 20).map(describeObservationElement).join('\n')
      : '(일치하는 요소 없음)';
    const rec: WorkStepRecord = {
      step: ctx.state.stepCount + 1,
      action: a,
      status: 'success',
    };
    ctx.state.history.push(rec);
    ctx.stepMeta.set(rec, {
      actor: ctx.currentActor(),
      locator: null,
      durationMs: 0,
    });
    ctx.state.lastResult = rec;
    return null;
  }
  if (ctx.surface === 'uia' && a.kind === 'read_text') {
    const el = (ctx.state.observation?.elements ?? []).find(
      (e) => e.elementRef === a.elementRef,
    );
    ctx.lastRead = String(el?.text ?? el?.name ?? '').slice(
      0,
      READ_SUMMARY_MAX,
    );
    const rec: WorkStepRecord = {
      step: ctx.state.stepCount + 1,
      action: a,
      status: 'success',
    };
    ctx.state.history.push(rec);
    ctx.stepMeta.set(rec, {
      actor: ctx.currentActor(),
      locator: null,
      durationMs: 0,
    });
    ctx.state.lastResult = rec;
    return null;
  }
  // ── dom 표면 읽기 — find · read_text · read_table 은 local.dom.* 명령. ──
  if (
    ctx.surface === 'dom' &&
    (a.kind === 'find' || a.kind === 'read_text' || a.kind === 'read_table')
  ) {
    const rec: WorkStepRecord = {
      step: ctx.state.stepCount + 1,
      action: a,
      status: 'failed',
    };
    const t0 = Date.now();
    const readLocator =
      a.kind === 'find'
        ? null
        : experienceLocatorOf(
            ctx.surface,
            a,
            (ctx.state.observation?.elements ?? []).find(
              (e) => e.elementRef === a.elementRef,
            ),
          );
    let outcome: Awaited<ReturnType<typeof issueDomCommand>>;
    if (a.kind === 'find')
      outcome = await ctx.dom(LOCAL_AGENT_ACTIONS.DOM_FIND, { query: a.query });
    else if (a.kind === 'read_text')
      outcome = await ctx.dom(LOCAL_AGENT_ACTIONS.DOM_READ_TEXT, {
        elementRef: a.elementRef,
        snapshotId,
      });
    else
      outcome = await ctx.dom(
        LOCAL_AGENT_ACTIONS.DOM_READ_TABLE,
        a.elementRef ? { elementRef: a.elementRef, snapshotId } : {},
      );
    rec.status =
      outcome.status === 'success'
        ? 'success'
        : outcome.status === 'denied'
          ? 'denied'
          : 'failed';
    rec.errorCode = outcome.errorCode;
    ctx.state.history.push(rec);
    ctx.state.lastResult = rec;
    ctx.stepMeta.set(rec, {
      actor: ctx.currentActor(),
      locator: readLocator,
      durationMs: Date.now() - t0,
    });
    if (outcome.status !== 'success') {
      if (outcome.errorCode === LOCAL_AGENT_ERROR.DOM_USER_ACTION_REQUIRED)
        return ctx.takeoverWith(
          outcome.errorCode,
          'credential_required',
          'needs_user',
        );
      if (
        outcome.errorCode === LOCAL_AGENT_ERROR.DOM_ACTION_NOT_ALLOWED &&
        outcome.safe.riskLevel === 'COMMIT'
      )
        return ctx.takeoverWith(
          outcome.errorCode,
          'commit_required',
          'needs_user',
        );
      if (outcome.errorCode === LOCAL_AGENT_ERROR.DOM_CROSS_ORIGIN_BLOCKED)
        return ctx.takeoverWith(
          outcome.errorCode,
          'unsupported_control',
          'needs_user',
        );
      const o = await ctx.observe();
      if (!o.ok) return ctx.observeFailed(o);
      return null;
    }
    // 읽기 결과는 Planner 컨텍스트로만(UNTRUSTED · 상한). find 는 새 snapshot 의 후보를 관찰로 삼는다.
    if (a.kind === 'find') {
      const matches = (
        Array.isArray(outcome.safe.matches) ? outcome.safe.matches : []
      ) as SafeDomElement[];
      const prev = ctx.state.observation as WorkObservation & {
        snapshotId?: string;
      };
      ctx.state.observation = {
        ...prev,
        elements: matches,
        elementCount: matches.length,
        fingerprint: fingerprintObservation(prev.path, matches),
        snapshotId: String(outcome.safe.snapshotId ?? snapshotId),
      } as WorkObservation;
      return null;
    }
    if (a.kind === 'read_text') {
      ctx.lastRead = String(outcome.safe.text ?? '').slice(0, READ_SUMMARY_MAX);
      return null;
    }
    const columns = (
      Array.isArray(outcome.safe.columns) ? outcome.safe.columns : []
    ) as string[];
    const rows = (
      Array.isArray(outcome.safe.rows) ? outcome.safe.rows : []
    ) as string[][];
    ctx.lastRead =
      [columns.join(' | '), ...rows.slice(0, 8).map((r) => r.join(' | '))]
        .join('\n')
        .slice(0, READ_SUMMARY_MAX) +
      (rows.length > 8 ? `\n… (전체 ${rows.length}행)` : '');
    return null;
  }
  // ── 행동(act) — 단발 또는 Fast Loop 배치(§7). 배치는 act-only 최대 WORK_BATCH_MAX 개를 연속 실행하되, 각 행동 전에 예산·안전을
  //    재확인하고 화면 변화(이동·변경·오류·대상 상실·숨은 목록)면 즉시 중단하고 한 번만 재관찰한다 — 한 동작마다 AI 를 부르지 않는 축이다.
  //    execActOnce 가 UIA/visual/DOM 명령·오류 해석·인계 판단을 모두 담고, 여기서는 배치 진행/중단/재관찰만 조율한다.
  const steps =
    proposal.batch && proposal.batch.length > 1 ? proposal.batch : [a];
  // Phase E — DOM 행동 묶음을 작업 단위 하나로: 노드가 행동들을 잇고, 화면이 바뀌거나 실패하면 거기서 멈춘 뒤 관찰까지 해서
  // 돌려준다(행동 n + 재관찰 2 왕복 → 1). 같은 snapshot 의 ref 만 쓴다 — 화면이 바뀐 뒤의 ref 는 노드가 쓰지 않는다(reobserve).
  // 각 행동의 기록 · 오류 해석 · 인계는 단발과 같은 execActOnce 를 지난다. 노드가 형상을 거절하면(denied) 아래 단발 경로로 같은 일을 한다.
  if (
    ctx.unitCapable() &&
    steps.length <= DOM_UNIT_MAX_STEPS &&
    steps.every(
      (x) =>
        x.kind === 'click' ||
        x.kind === 'set_input' ||
        x.kind === 'select_option',
    )
  ) {
    if (ctx.overTime() || ctx.budgetLeft() < 1)
      return ctx.takeover('loop_limit', 'no_progress');
    const unitSteps: DomUnitActStep[] = steps.map((x) => ({
      op: 'act' as const,
      kind: x.kind as DomUnitActStep['kind'],
      elementRef: x.elementRef as string,
      snapshotId,
      ...(x.kind === 'set_input'
        ? { text: x.text }
        : x.kind === 'select_option'
          ? { option: x.option }
          : {}),
    }));
    // 입력만 하는 묶음은 단발처럼 재관찰하지 않는다(응답이 확인). 클릭 · 선택이 있으면 끝에 관찰을 함께 받는다.
    const wantObserve = steps.some((x) => x.kind !== 'set_input');
    const u = await ctx.runUnit(unitSteps, { observe: wantObserve });
    if (u.kind === 'lost') {
      // 무엇이 실행됐는지 모른다 — 다시 보내지 않는다. 지금 화면을 보고 다음 계획을 세운다.
      const o = await ctx.observe();
      if (!o.ok) return ctx.observeFailed(o);
      return null;
    }
    if (u.kind === 'ran') {
      let unitPending: {
        navigated: boolean;
      } | null = null;
      for (const rep of u.reports) {
        const act = steps[rep.index];
        if (!act) break;
        const dir = await ctx.execActOnce(act, snapshotId, {
          status: rep.status,
          errorCode: rep.errorCode,
          safe: {
            navigated: rep.navigated,
            changed: rep.changed,
            riskLevel: rep.riskLevel,
          },
        });
        if (dir.do === 'takeover')
          return ctx.takeoverWith(
            ctx.lastActRecord?.errorCode,
            dir.reason,
            dir.progress,
          );
        if (dir.do === 'observe') {
          unitPending = { navigated: dir.navigated };
          break;
        }
      }
      const stopped = u.stop !== null;
      if (u.observation) {
        // 화면이 바뀌지 않은 묶음 끝의 관찰은 진전 판단(같은-관찰 카운터)에 넣지 않는다 — 단발은 그 자리에서 관찰하지 않는다.
        ctx.applyDomObservation(u.observation, unitPending !== null || stopped);
        return null;
      }
      if (
        u.stop &&
        (u.stop.cause === 'budget' || u.stop.cause === 'time') &&
        !unitPending
      )
        return ctx.takeover('loop_limit', 'no_progress');
      if (unitPending || stopped) {
        if (
          wantObserve &&
          u.observeErrorCode &&
          u.observeErrorCode !== LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE
        ) {
          if (!u.observeErrorCode.startsWith('DOM_UNIT_'))
            ctx.state.stepCount += 1; // 실패한 get_context(단발과 같은 계산)
          return ctx.observeFailed({
            errorCode: ctx.unitObserveError(u.observeErrorCode),
          });
        }
        const o = await ctx.reobserve(unitPending?.navigated === true);
        if (!o.ok) return ctx.observeFailed(o);
      }
      return null;
    }
    // denied — 노드가 아무것도 실행하지 않았다. 아래 단발 경로로.
  }
  let pendingObserve: {
    navigated: boolean;
  } | null = null;
  let batchInterrupted = false;
  for (let bi = 0; bi < steps.length; bi += 1) {
    if (ctx.overTime() || ctx.budgetLeft() < 1)
      return ctx.takeover('loop_limit', 'no_progress');
    const dir = await ctx.execActOnce(steps[bi], snapshotId);
    if (dir.do === 'takeover')
      return ctx.takeoverWith(
        ctx.lastActRecord?.errorCode,
        dir.reason,
        dir.progress,
      );
    if (dir.do === 'reject') {
      // 제출 창 미지정 등 — 실행하지 않았다. 무효 제안으로 세고 배치를 끊는다(다음은 재계획).
      ctx.state.invalidProposals += 1;
      ctx.lastRejectReason = dir.reason;
      const rejected: WorkStepRecord = {
        step: ctx.state.stepCount,
        action: steps[bi],
        status: 'rejected',
        rejectReason: dir.reason,
      };
      ctx.state.history.push(rejected);
      ctx.stepMeta.set(rejected, {
        actor: ctx.currentActor(),
        locator: null,
        durationMs: null,
      });
      if (ctx.state.invalidProposals >= WORK_LOOP_LIMITS.maxInvalidProposals)
        return ctx.takeover('user_judgment_required', 'needs_user');
      batchInterrupted = true;
      break;
    }
    if (dir.do === 'observe') {
      // 화면이 바뀌었거나 실패 — 배치 중단, 한 번 재관찰(§7 abort on navigation/change/error).
      pendingObserve = { navigated: dir.navigated };
      break;
    }
    // dir.do === 'continue' — 재관찰 없이 다음 배치 행동으로(또는 배치 끝).
  }
  if (batchInterrupted) return null;
  if (pendingObserve) {
    const o = await ctx.reobserve(pendingObserve.navigated);
    if (!o.ok) return ctx.observeFailed(o);
  }
  return null;
}
