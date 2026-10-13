import {
  createWorkAgentExecutionState,
  type WorkAgentExecutionState,
} from "./work-agent-execution-state.js";
/** Request-local action execution and safety interpretation. Callers still validate proposals and node ownership first. */
import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
} from "../local-agent/local-agent-protocol.js";
import {
  isSubmitWindowNamedInGoal,
  type WorkAction,
  type WorkAgentState,
  type WorkStepRecord,
  type WorkSurface,
  type TakeoverReason,
  type ProposalRejectReason,
} from "./work-agent-contract.js";
import {
  experienceLocatorOf,
  type ExperienceActor,
  type ExperienceStepMeta,
} from "./work-experience.js";
import {
  buildTrajectoryEntry,
  type TrajectoryEntry,
} from "./workflow-candidate.js";
import type { ActDirective } from "./work-execution-types.js";
import type { WorkObservationSession } from "./work-observation-session.js";
type WorkActionOutcome = {
  status: string;
  errorCode?: string;
  safe: Record<string, unknown>;
};

/** Same DOM failure mapping for action and read paths. This does not grant execution permission. */
export function domFailureDirective(
  outcome: WorkActionOutcome,
): Extract<ActDirective, { do: "takeover" }> | null {
  // dom — 사용자 몫은 바로, 나머지(stale · content · 요소 없음)는 재관찰.
  if (outcome.errorCode === LOCAL_AGENT_ERROR.DOM_USER_ACTION_REQUIRED)
    return {
      do: "takeover",
      reason: "credential_required",
      progress: "needs_user",
    };
  if (
    outcome.errorCode === LOCAL_AGENT_ERROR.DOM_ACTION_NOT_ALLOWED &&
    outcome.safe.riskLevel === "COMMIT"
  )
    return {
      do: "takeover",
      reason: "commit_required",
      progress: "needs_user",
    };
  if (outcome.errorCode === LOCAL_AGENT_ERROR.DOM_CROSS_ORIGIN_BLOCKED)
    return {
      do: "takeover",
      reason: "unsupported_control",
      progress: "needs_user",
    };
  return null;
}
async function sendWorkAction(
  observation: Pick<WorkObservationSession, "dom" | "uia" | "computer">,
  surface: WorkSurface,
  act: WorkAction,
  snapshotId: string,
): Promise<WorkActionOutcome | null> {
  const { dom, uia, computer } = observation;
  if (surface === "uia") {
    if (act.kind === "set_input")
      return await uia(LOCAL_AGENT_ACTIONS.UIA_SET_VALUE, {
        elementRef: act.elementRef,
        snapshotId,
        text: act.text,
      });
    else if (act.kind === "click" && act.x !== undefined)
      return await uia(LOCAL_AGENT_ACTIONS.UIA_CLICK, {
        elementRef: act.elementRef,
        snapshotId,
        x: act.x,
        y: act.y,
        ...(act.clicks ? { clicks: act.clicks } : {}),
      });
    else if (act.kind === "click")
      return await uia(LOCAL_AGENT_ACTIONS.UIA_INVOKE, {
        elementRef: act.elementRef,
        snapshotId,
      });
    else if (act.kind === "key")
      return await uia(LOCAL_AGENT_ACTIONS.UIA_KEY, {
        key: act.key,
        snapshotId,
        ...(act.elementRef ? { elementRef: act.elementRef } : {}),
      });
    // 시각 모드 조작 — 정규화 좌표(0..1)/허용 텍스트·키는 contract 에서 이미 검증됨. 이미지·base64 는 여기 흐르지 않는다.
    else if (act.kind === "visual_click")
      return await computer(LOCAL_AGENT_ACTIONS.COMPUTER_CLICK, {
        x: act.x,
        y: act.y,
      });
    else if (act.kind === "visual_type")
      return await computer(LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT, {
        text: act.text,
      });
    else if (act.kind === "visual_key")
      return await computer(LOCAL_AGENT_ACTIONS.COMPUTER_KEY, { key: act.key });
    else return null;
  } else {
    if (act.kind === "set_input")
      return await dom(LOCAL_AGENT_ACTIONS.DOM_SET_INPUT, {
        elementRef: act.elementRef,
        snapshotId,
        text: act.text,
      });
    else if (act.kind === "select_option")
      return await dom(LOCAL_AGENT_ACTIONS.DOM_SELECT_OPTION, {
        elementRef: act.elementRef,
        snapshotId,
        option: act.option,
      });
    else if (act.kind === "click")
      return await dom(LOCAL_AGENT_ACTIONS.DOM_CLICK, {
        elementRef: act.elementRef,
        snapshotId,
      });
    else return null;
  }
}
const SAFETY_TAKEOVER: Record<
  string,
  { reason: TakeoverReason; immediate: boolean }
> = {
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_USER_ACTIVE]: {
    reason: "user_active",
    immediate: true,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_PAUSED]: {
    reason: "user_active",
    immediate: true,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_TARGET_CHANGED]: {
    reason: "target_changed",
    immediate: false,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_TARGET_UNCERTAIN]: {
    reason: "target_identity_uncertain",
    immediate: false,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_UIA_AMBIGUOUS]: {
    reason: "uia_target_ambiguous",
    immediate: false,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_HIDDEN_CONTROL]: {
    reason: "uia_hidden_control",
    immediate: true,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_SUBMIT_UNVERIFIED]: {
    reason: "submit_not_verified",
    immediate: false,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_KEY_UNKNOWN]: {
    reason: "key_semantics_unknown",
    immediate: true,
  },
  [LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_VISION_UNCERTAIN]: {
    reason: "vision_uncertain",
    immediate: true,
  },
};
interface WorkActionSessionInput {
  state: WorkAgentState;
  executionState?: WorkAgentExecutionState;
  surface: WorkSurface;
  observationSession: Pick<
    WorkObservationSession,
    "dom" | "uia" | "computer" | "isVisualFallback" | "enterVisualFallback"
  >;
  stepMeta: WeakMap<WorkStepRecord, ExperienceStepMeta>;
  trajectory: TrajectoryEntry[];
  currentActor(): ExperienceActor;
  setRejectReason(reason: ProposalRejectReason | undefined): void;
}
export function createWorkActionSession(input: WorkActionSessionInput) {
  const {
    state,
    surface,
    observationSession,
    stepMeta,
    trajectory,
    currentActor,
    setRejectReason,
  } = input;
  const goal = state.goal;
  const execution =
    input.executionState ?? createWorkAgentExecutionState(state);
  const safetyRejects: Record<string, number> = {};
  let safetyReason = "";
  let visualFailureRun = 0;
  const VISUAL_FAILURE_MAX = 2;
  const enterVisualFallback = async (): Promise<{
    ok: boolean;
    errorCode?: string;
  }> => {
    const outcome = await observationSession.enterVisualFallback();
    if (outcome.ok) visualFailureRun = 0;
    return outcome;
  };
  const interpretFailure = async (
    outcome: WorkActionOutcome,
    isVisual: boolean,
  ): Promise<ActDirective> => {
    if (isVisual) {
      // 시각 조작 실패 — 사용자 몫(자격/OTP)은 바로 인계, 그 밖(대상 상실·경계 밖·입력 실패)은 재관찰(=재캡처)해 화면을 다시 보게 하되 연속 실패면 인계.
      if (outcome.errorCode === LOCAL_AGENT_ERROR.COMPUTER_USER_ACTION_REQUIRED)
        return {
          do: "takeover",
          reason: "credential_required",
          progress: "needs_user",
        };
      visualFailureRun += 1;
      if (visualFailureRun >= VISUAL_FAILURE_MAX)
        return {
          do: "takeover",
          reason: "vision_uncertain",
          progress: "needs_user",
        };
      return { do: "observe", navigated: false };
    }
    if (surface === "uia") {
      if (outcome.errorCode === LOCAL_AGENT_ERROR.UIA_USER_ACTION_REQUIRED)
        return {
          do: "takeover",
          reason: "credential_required",
          progress: "needs_user",
        };
      if (outcome.errorCode === LOCAL_AGENT_ERROR.UIA_ACTION_NOT_ALLOWED)
        return {
          do: "takeover",
          reason: "commit_required",
          progress: "needs_user",
        };
      if (outcome.errorCode === LOCAL_AGENT_ERROR.UIA_TARGET_NOT_FOREGROUND)
        return {
          do: "takeover",
          reason: "site_not_ready",
          progress: "needs_user",
        };
      const safety = SAFETY_TAKEOVER[outcome.errorCode ?? ""];
      if (safety) {
        // §4 — 숨은 목록 항목(구조적 확인 불가)은 즉시 인계하지 않는다. 아직 시각 모드가 아니면 화면을 캡처해 AI 가 실제 화면을 보고 잇게 한다.
        if (
          outcome.errorCode ===
            LOCAL_AGENT_ERROR.WINDOWS_AUTOMATION_HIDDEN_CONTROL &&
          !observationSession.isVisualFallback()
        ) {
          const v = await enterVisualFallback();
          if (v.ok) {
            setRejectReason(undefined);
            return { do: "continue" };
          }
        }
        safetyRejects[outcome.errorCode as string] =
          (safetyRejects[outcome.errorCode as string] ?? 0) + 1;
        safetyReason =
          typeof outcome.safe.safety === "object" && outcome.safe.safety
            ? String(
                (outcome.safe.safety as Record<string, unknown>).reason ?? "",
              )
            : "";
        if (safety.immediate || safetyRejects[outcome.errorCode as string] >= 2)
          return {
            do: "takeover",
            reason: safety.reason,
            progress: "needs_user",
          };
        setRejectReason("SAFETY_REJECT");
        return { do: "observe", navigated: false };
      }
      return { do: "observe", navigated: false };
    }
    return domFailureDirective(outcome) ?? { do: "observe", navigated: false };
  };
  const execute = async (
    act: WorkAction,
    snapshotId: string,
    pre?: { status: string; errorCode?: string; safe: Record<string, unknown> },
  ): Promise<ActDirective> => {
    const isVisual =
      act.kind === "visual_click" ||
      act.kind === "visual_type" ||
      act.kind === "visual_key";
    // 제출 키(ENTER/CTRL+ENTER)는 대상 창 제목이 요청에 있어야 한다(§5 COMMIT 경계) — uia·visual 공통.
    if (
      (act.kind === "key" || act.kind === "visual_key") &&
      (act.key === "ENTER" || act.key === "CTRL+ENTER") &&
      !isSubmitWindowNamedInGoal(state.observation, goal.request)
    ) {
      return { do: "reject", reason: "WINDOW_NOT_NAMED_IN_GOAL" };
    }
    execution.beginAction();
    const t0 = Date.now();
    const actEl = (state.observation?.elements ?? []).find(
      (e) => e.elementRef === act.elementRef,
    );
    const actLocator = experienceLocatorOf(surface, act, actEl);
    const record: WorkStepRecord = {
      step: state.stepCount + 1,
      action: act,
      status: "failed",
    };
    let outcome: {
      status: string;
      errorCode?: string;
      safe: Record<string, unknown>;
    };
    if (pre) {
      state.stepCount += 1;
      outcome = pre;
    } else {
      const sent = await sendWorkAction(
        observationSession,
        surface,
        act,
        snapshotId,
      );
      if (!sent)
        return {
          do: "takeover",
          reason: "planner_unavailable",
          progress: "failed",
        };
      outcome = sent;
    }
    record.status =
      outcome.status === "success"
        ? "success"
        : outcome.status === "denied"
          ? "denied"
          : "failed";
    record.errorCode = outcome.errorCode;
    record.navigated = outcome.safe.navigated === true;
    record.changed = isVisual ? true : outcome.safe.changed === true;
    // PHASE 2 — 성공한 DOM 행동은 semantic trajectory 로 남긴다(행동 전 관찰의 같은 elementRef 요소 → role·name|text).
    // 좌표·elementRef·snapshot 은 trajectory 에 들어가지 않는다. 값은 run 끝의 템플릿 일반화에만 쓴다.
    if (surface === "dom" && outcome.status === "success") {
      const el = (state.observation?.elements ?? []).find(
        (e) => e.elementRef === act.elementRef,
      );
      const entry = buildTrajectoryEntry(
        act,
        el,
        record,
        state.observation?.path,
      );
      if (entry) trajectory.push(entry);
    }
    execution.append(record);
    execution.acceptResult(record);
    stepMeta.set(record, {
      actor: currentActor(),
      locator: actLocator,
      durationMs: Date.now() - t0,
    });
    execution.rememberAction(record);

    if (outcome.status !== "success")
      return interpretFailure(outcome, isVisual);

    // 성공 — set_input 은 응답(hasValue/verified)이 확인이라 재관찰 생략, 나머지는 §17 재관찰. dom 은 이동·변경일 때만.
    if (isVisual) visualFailureRun = 0;
    if (surface === "uia")
      return act.kind === "set_input"
        ? { do: "continue" }
        : { do: "observe", navigated: record.navigated === true };
    const needsReobserve =
      act.kind === "click" ||
      record.navigated === true ||
      record.changed === true;
    return needsReobserve
      ? { do: "observe", navigated: record.navigated === true }
      : { do: "continue" };
  };
  return {
    execute,
    enterVisualFallback,
    lastRecord: () => execution.lastActRecord,
    safetyReason: () => safetyReason,
  };
}
export type WorkActionSession = ReturnType<typeof createWorkActionSession>;
