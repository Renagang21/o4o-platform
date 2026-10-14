import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
} from '../local-agent/local-agent-protocol.js';
import {
  DOM_UNIT_MAX_STEPS,
  DOM_QUERY_VALUE_MAX,
  isDomUnitText,
  type DomFindQuery,
  type DomUnitFindActStep,
  type SafeDomElement,
} from '../local-agent/browser-dom-contract.js';
import {
  WORK_AGENT_ERROR,
  validateWorkProposal,
  fingerprintObservation,
  type WorkAction,
  type WorkObservation,
} from './work-agent-contract.js';
import {
  pickReplayTarget,
  replayFindQuery,
  type ReplayStep,
} from './workflow-candidate.js';
import type { WorkAgentRunResult } from './work-agent-runtime.js';
import type { WorkReplayContext } from './work-execution-types.js';
/** Deterministic replay reuses the same validation/action path; completion remains a planner decision. */
export function createWorkReplay(ctx: WorkReplayContext) {
  // ── PHASE 2 결정론적 재생(IR §8 재생 규칙) — 같은 대상의 같은 형태 요청이면 저장된 Workflow 를 먼저 빠르게 재생한다. ──
  //   Local 이 템플릿을 대조해 이번 요청의 값을 채운 semantic 단계만 돌려준다. 각 단계는 **현재 화면에서** locator(role·name|text)로
  //   다시 찾고(find · 유일할 때만), 같은 제안 검증(validateWorkProposal)과 같은 실행 경로(execActOnce · 안전 경계 그대로)를 거친다.
  //   찾지 못함 · 모호함 · 검증 거절 · 실패 · 예상 변화(이동) 불일치면 즉시 멈추고 AI loop 가 현재 화면에서 이어받는다(self-healing).
  //   완료 판단은 재생이 하지 않는다 — 재생 뒤에도 loop 의 Planner 가 확인한다(보통 계획 1회). 맹목 재생 금지.
  /** 결정적 재생 본체 — 인계로 끝나면 그 결과를, 아니면 null(loop 의 Planner 가 이어받는다). */
  const runReplay = async (
    replaySteps: readonly ReplayStep[],
  ): Promise<WorkAgentRunResult | null> => {
    if (ctx.unitCapable()) {
      const r = await runReplayUnit(replaySteps);
      if (r !== 'fallback') return r;
    }
    ctx.workflow.replay = 'completed';
    let observationFresh = true; // 마지막 관찰이 전체 inspect 인가(find 후보로 바뀌면 false).
    ctx.replaying = true;
    for (const step of replaySteps) {
      // find 1 + 행동 1 + 재관찰 2 + loop 첫 계획 여유 — 예산이 모자라면 재생을 멈추고 AI 에 맡긴다.
      if (ctx.overTime() || ctx.budgetLeft() < 5) {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = { cause: 'budget', code: null, stepSeq: null };
        break;
      }
      const f = await ctx.dom(LOCAL_AGENT_ACTIONS.DOM_FIND, {
        query: replayFindQuery(step.locator),
      });
      if (f.status !== 'success') {
        if (f.errorCode === LOCAL_AGENT_ERROR.DOM_USER_ACTION_REQUIRED)
          return ctx.takeoverWith(
            f.errorCode,
            'credential_required',
            'needs_user',
          );
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = {
          cause: 'find_failed',
          code: f.errorCode ?? null,
          stepSeq: null,
        };
        break;
      }
      const matches = (
        Array.isArray(f.safe.matches) ? f.safe.matches : []
      ) as SafeDomElement[];
      const ref = pickReplayTarget(step.locator, matches);
      if (!ref) {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = {
          cause: 'locator_not_found',
          code: null,
          stepSeq: null,
        };
        break;
      }
      const prev = ctx.state.observation as WorkObservation & {
        snapshotId?: string;
      };
      const findSnapshot = String(f.safe.snapshotId ?? prev.snapshotId ?? '');
      ctx.state.observation = {
        ...prev,
        elements: matches,
        elementCount: matches.length,
        fingerprint: fingerprintObservation(prev.path, matches),
        snapshotId: findSnapshot,
      } as WorkObservation;
      observationFresh = false;
      const action: WorkAction =
        step.actionKind === 'click'
          ? { kind: 'click', elementRef: ref }
          : step.actionKind === 'set_input'
            ? { kind: 'set_input', elementRef: ref, text: step.value }
            : { kind: 'select_option', elementRef: ref, option: step.value };
      const checked = validateWorkProposal(
        { assessment: 'progress', action },
        ctx.state.observation,
      );
      if (!checked.ok || !checked.proposal) {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = {
          cause: 'validation_rejected',
          code: null,
          stepSeq: null,
        };
        break;
      }
      const dir = await ctx.execActOnce(checked.proposal.action, findSnapshot);
      if (dir.do === 'takeover')
        return ctx.takeoverWith(
          ctx.lastActRecord?.errorCode,
          dir.reason,
          dir.progress,
        );
      if (dir.do === 'reject' || ctx.state.lastResult?.status !== 'success') {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge =
          dir.do === 'reject'
            ? { cause: 'validation_rejected', code: null, stepSeq: null }
            : {
                cause: 'step_failed',
                code: ctx.state.lastResult?.errorCode ?? null,
                stepSeq: ctx.state.history.length,
              };
        break;
      }
      ctx.workflow.replayedSteps += 1;
      if (dir.do === 'observe') {
        const o = await ctx.reobserve(dir.navigated);
        if (!o.ok) return ctx.observeFailed(o);
        observationFresh = true;
      }
      // checkpoint — 저장 때 이동했던 단계가 이번엔 이동하지 않았다면 화면 흐름이 달라졌다.
      if (step.expect.navigated && ctx.state.lastResult?.navigated !== true) {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = {
          cause: 'expect_mismatch',
          code: null,
          stepSeq: ctx.state.history.length,
        };
        break;
      }
    }
    ctx.replaying = false;
    // Planner 는 전체 화면을 봐야 한다 — 재생이 find 후보 관찰로 끝났으면 한 번 새로 관찰한다.
    if (!observationFresh) {
      const o = await ctx.observe();
      if (!o.ok) return ctx.observeFailed(o);
    }
    return null;
  };
  /**
   * Phase E — 재생을 작업 단위 하나로. 노드가 단계마다 현재 화면에서 다시 찾고(find · 유일할 때만) 같은 대상 검사(role · 비활성 ·
   * COMMIT)를 지난 뒤 행동하고, 이동이면 새 문서가 설 때까지 기다려 다음 단계를 찾는다. 단발 재생과 같은 멈춤 조건
   * (대상 없음/모호 · 검증 거절 · 실패 · 예상 이동 불일치 · 예산)에서 멈추고 그 화면을 관찰해 돌려준다 → AI loop 가 이어받는다.
   * 결과는 단발 재생과 같은 기록(history · trajectory · replayDiverge · replayedSteps)으로 옮긴다. 완료 판단은 여기서 하지 않는다.
   * 'fallback' — 단위로 보낼 수 없는 재생(단계 수 초과 · 값 거절 · 노드 형상 거절)이었고 아무것도 실행되지 않았다.
   */
  const runReplayUnit = async (
    replaySteps: readonly ReplayStep[],
  ): Promise<WorkAgentRunResult | null | 'fallback'> => {
    if (replaySteps.length === 0 || replaySteps.length > DOM_UNIT_MAX_STEPS)
      return 'fallback';
    const steps: DomUnitFindActStep[] = [];
    for (const step of replaySteps) {
      const base = {
        op: 'find_act' as const,
        kind: step.actionKind,
        query: replayFindQuery(step.locator) as DomFindQuery,
        expectNavigated: step.expect.navigated === true,
      };
      if (step.actionKind === 'click') steps.push(base);
      // 값 규칙은 단발 재생의 validateWorkProposal 과 같다. 거절될 값이면 단발 경로가 그 자리에서 validation_rejected 로 멈춘다.
      else if (step.actionKind === 'set_input' && isDomUnitText(step.value))
        steps.push({
          ...base,
          text: step.value.trim().slice(0, DOM_QUERY_VALUE_MAX),
        });
      else if (
        step.actionKind === 'select_option' &&
        typeof step.value === 'string' &&
        step.value.trim().length > 0 &&
        step.value.length <= DOM_QUERY_VALUE_MAX &&
        !/[<>{}]/.test(step.value)
      )
        steps.push({ ...base, option: step.value });
      else return 'fallback';
    }
    // 단발 재생은 단계마다 find 1 + 행동 1 + 재관찰 2 + 첫 계획 여유 1 을 본다 — 첫 단계도 못 담으면 같은 자리(budget)에서 어긋난다.
    if (ctx.overTime() || ctx.budgetLeft() < 5) {
      ctx.workflow.replay = 'diverged';
      ctx.replayDiverge = { cause: 'budget', code: null, stepSeq: null };
      return null;
    }
    ctx.replaying = true;
    const u = await ctx.runUnit(steps, { observe: true, reserve: 1 });
    if (u.kind === 'denied') {
      ctx.replaying = false;
      return 'fallback';
    }
    ctx.workflow.replay = 'completed';
    if (u.kind === 'lost') {
      // 무엇이 실행됐는지 모른다 — 다시 보내지 않는다. 지금 화면을 보고 AI loop 가 이어받는다.
      ctx.replaying = false;
      ctx.workflow.replay = 'diverged';
      ctx.replayDiverge = {
        cause: 'step_failed',
        code: u.errorCode ?? null,
        stepSeq: null,
      };
      const o = await ctx.observe();
      return o.ok ? null : ctx.observeFailed(o);
    }
    for (const rep of u.reports) {
      const step = replaySteps[rep.index];
      const target = rep.target;
      if (!step || !target || typeof target.elementRef !== 'string') break;
      ctx.state.stepCount += 1; // 이 단계의 find
      const prev = ctx.state.observation as WorkObservation & {
        snapshotId?: string;
      };
      ctx.state.observation = {
        ...prev,
        elements: [target],
        elementCount: 1,
        fingerprint: fingerprintObservation(prev.path, [target]),
        snapshotId: '',
      } as WorkObservation;
      const unitStep = steps[rep.index];
      const action: WorkAction =
        step.actionKind === 'click'
          ? { kind: 'click', elementRef: target.elementRef }
          : step.actionKind === 'set_input'
            ? {
                kind: 'set_input',
                elementRef: target.elementRef,
                text: unitStep.text as string,
              }
            : {
                kind: 'select_option',
                elementRef: target.elementRef,
                option: unitStep.option as string,
              };
      const dir = await ctx.execActOnce(action, '', {
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
      if (rep.status === 'success') ctx.workflow.replayedSteps += 1;
    }
    const stop = u.stop;
    if (stop) {
      const diverge = (
        cause: NonNullable<typeof ctx.replayDiverge>['cause'],
        code: string | null,
        stepSeq: number | null,
      ) => {
        ctx.workflow.replay = 'diverged';
        ctx.replayDiverge = { cause, code, stepSeq };
      };
      if (
        stop.cause === 'find_failed' ||
        stop.cause === 'locator_not_found' ||
        stop.cause === 'validation_rejected'
      )
        ctx.state.stepCount += 1; // 행동 없이 끝난 find
      if (
        stop.cause === 'find_failed' &&
        stop.errorCode === LOCAL_AGENT_ERROR.DOM_USER_ACTION_REQUIRED
      )
        return ctx.takeoverWith(
          stop.errorCode,
          'credential_required',
          'needs_user',
        );
      // 다른 사이트 — 단발 경로라면 재관찰의 get_context 1 이 실패로 세어진다(같은 예산 계산).
      if (stop.cause === 'cross_origin') {
        ctx.replaying = false;
        ctx.state.stepCount += 1;
        return ctx.observeFailed({
          errorCode: LOCAL_AGENT_ERROR.DOM_CROSS_ORIGIN_BLOCKED,
        });
      }
      if (stop.cause === 'not_ready') {
        ctx.replaying = false;
        return ctx.observeFailed({
          errorCode: WORK_AGENT_ERROR.SITE_NOT_READY,
        });
      }
      if (stop.cause === 'budget' || stop.cause === 'time')
        diverge('budget', null, null);
      else if (stop.cause === 'find_failed')
        diverge('find_failed', stop.errorCode ?? null, null);
      else if (stop.cause === 'locator_not_found')
        diverge('locator_not_found', null, null);
      else if (stop.cause === 'validation_rejected')
        diverge('validation_rejected', null, null);
      else if (stop.cause === 'expect_mismatch')
        diverge('expect_mismatch', null, ctx.state.history.length);
      else
        diverge(
          'step_failed',
          ctx.state.lastResult?.errorCode ?? stop.errorCode ?? null,
          ctx.state.history.length,
        );
    }
    ctx.replaying = false;
    // Planner 는 전체 화면을 봐야 한다 — 노드가 멈춘 자리의 관찰을 그대로 쓴다. 없으면(예산 · 시간 · 상한) 한 번 새로 본다.
    if (u.observation) {
      ctx.applyDomObservation(u.observation);
      return null;
    }
    if (
      u.observeErrorCode &&
      u.observeErrorCode !== LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE &&
      u.observeErrorCode !== 'DOM_UNIT_TIME' &&
      u.observeErrorCode !== 'DOM_UNIT_BUDGET'
    ) {
      if (!u.observeErrorCode.startsWith('DOM_UNIT_')) ctx.state.stepCount += 1; // 실패한 get_context(단발과 같은 계산)
      return ctx.observeFailed({
        errorCode: ctx.unitObserveError(u.observeErrorCode),
      });
    }
    const o = await ctx.observe();
    return o.ok ? null : ctx.observeFailed(o);
  };
  return runReplay;
}
