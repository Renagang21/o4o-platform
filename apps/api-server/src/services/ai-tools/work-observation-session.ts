import {
  createWorkAgentExecutionState,
  type WorkAgentExecutionState,
} from "./work-agent-execution-state.js";
/** Per-run observation session. It uses the already verified node and existing executors; it grants no permission. */
import type { DataSource } from "typeorm";
import type { VerifiedToolContext } from "./ai-tool-contract.js";
import type { DeviceRow } from "../local-agent/local-agent-service.js";
import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
} from "../local-agent/local-agent-protocol.js";
import {
  DOM_UNIT_MAX_COMMANDS,
  DOM_UNIT_MAX_DURATION_MS,
  type DomUnitStep,
  type SafeDomElement,
} from "../local-agent/browser-dom-contract.js";
import type {
  SafeUiaElement,
  SafeUiaWindow,
} from "../local-agent/windows-uia-contract.js";
import {
  issueDomCommand,
  issueDomUnitCommand,
} from "./browser-dom-executor.js";
import { issueUiaCommand } from "./windows-uia-executor.js";
import {
  issueComputerCapture,
  issueComputerAction,
} from "./windows-computer-executor.js";
import {
  WORK_AGENT_ERROR,
  WORK_LOOP_LIMITS,
  fingerprintObservation,
  type WorkAgentState,
  type WorkImageInput,
  type WorkObservation,
  type WorkElement,
  type WorkSurface,
} from "./work-agent-contract.js";
import type {
  UnitReport,
  UnitStop,
  UnitObservation,
  UnitRun,
} from "./work-execution-types.js";

/** Numeric counters only; images and observation data never enter measurements or persistence inputs. */
export interface WorkRunMeasurements {
  aiMs: number;
  aiCalls: number;
  settleMs: number;
  retryCount: number;
  roundTrips: number;
  unitDispatches: number;
}
export function createWorkRunMeasurements(): WorkRunMeasurements {
  return {
    aiMs: 0,
    aiCalls: 0,
    settleMs: 0,
    retryCount: 0,
    roundTrips: 0,
    unitDispatches: 0,
  };
}
interface ObservationOptions {
  dataSource: DataSource;
  ctx: VerifiedToolContext;
  deviceId: string;
  executionNode: DeviceRow;
  tool: string;
  siteId: string;
  surface: WorkSurface;
  state: WorkAgentState;
  executionState?: WorkAgentExecutionState;
  measurements: WorkRunMeasurements;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const NAVIGATION_SETTLE_MS = 700;

export function createWorkObservationSession({
  dataSource,
  ctx,
  deviceId,
  executionNode,
  tool,
  siteId,
  surface,
  state,
  measurements,
  executionState,
}: ObservationOptions) {
  // These values are private to this invocation, never a singleton or a copied persistence snapshot.
  const execution = executionState ?? createWorkAgentExecutionState(state);
  let visualFallback = false;
  let unitDisabled = false;
  const settle = async (): Promise<void> => {
    const t = Date.now();
    await sleep(NAVIGATION_SETTLE_MS);
    measurements.settleMs += Date.now() - t;
  };
  const budgetLeft = () => WORK_LOOP_LIMITS.maxSteps - state.stepCount;
  const overTime = () =>
    Date.now() - state.startedAt > WORK_LOOP_LIMITS.maxDurationMs;
  const dom = async (action: string, args?: Record<string, unknown>) => {
    state.stepCount += 1;
    measurements.roundTrips += 1;
    return issueDomCommand(
      dataSource,
      ctx,
      deviceId,
      tool,
      action,
      siteId,
      args,
    );
  };
  const uia = async (action: string, args?: Record<string, unknown>) => {
    state.stepCount += 1;
    measurements.roundTrips += 1;
    return issueUiaCommand(
      dataSource,
      ctx,
      deviceId,
      tool,
      action,
      siteId,
      args,
    );
  };
  const computer = async (action: string, args?: Record<string, unknown>) => {
    state.stepCount += 1;
    measurements.roundTrips += 1;
    return issueComputerAction(
      dataSource,
      ctx,
      deviceId,
      tool,
      siteId,
      action,
      args,
    );
  };

  // ── Visual Computer Use (§4·§4-1) — UIA 가 요소를 못 볼 때만 켜지는 시각 모드. ──
  //   visualFallback 이 켜지면 관찰마다 등재 앱 foreground client 를 캡처해 Planner 에 이미지로 넘긴다.
  //   base64 는 이 세션 closure(visualImage)에만 살고 로그·DB·state·history 에 절대 쓰지 않는다(SENSITIVE_IMAGE_PERSISTENCE 0).
  let visualImage: WorkImageInput | null = null;
  /** 등재 앱 foreground client 캡처(요청 메모리 전용). 성공하면 visualImage 갱신. 예산 1 을 쓴다(관찰 성격). */
  const captureForVisual = async (): Promise<{
    ok: boolean;
    errorCode?: string;
  }> => {
    if (budgetLeft() < 1)
      return { ok: false, errorCode: WORK_AGENT_ERROR.LOOP_LIMIT };
    state.stepCount += 1;
    const cap = await issueComputerCapture(
      dataSource,
      ctx,
      deviceId,
      tool,
      siteId,
    );
    if (cap.status !== "success" || !cap.image)
      return {
        ok: false,
        errorCode:
          cap.errorCode ?? LOCAL_AGENT_ERROR.COMPUTER_UNSUPPORTED_ACTION,
      };
    visualImage = {
      mimeType: "image/jpeg",
      base64: cap.image.base64,
      provenance: "screen_capture",
    };
    return { ok: true };
  };
  /** 시각 모드 진입 — UIA 가 못 본 화면을 한 번 캡처해 Planner 에 이미지를 준다. 캡처 실패면 ok=false(호출자가 인계). */
  const enterVisualFallback = async (): Promise<{
    ok: boolean;
    errorCode?: string;
  }> => {
    if (surface !== "uia" || visualFallback) return { ok: false };
    const cap = await captureForVisual();
    if (!cap.ok) return { ok: false, errorCode: cap.errorCode };
    visualFallback = true;
    if (state.observation)
      execution.acceptObservation(
        { ...state.observation, visualFallback: true },
        "preserve",
      ); // 이미지는 담지 않는다 — 표식만.
    return { ok: true };
  };

  /** uia 표면 관찰 — `local.uia.inspect` 한 번. 창 목록 + 요소(DOM 과 같은 형상 + editable/size/focused). */
  const observeUia = async (): Promise<{ ok: boolean; errorCode?: string }> => {
    if (budgetLeft() < 1)
      return { ok: false, errorCode: WORK_AGENT_ERROR.LOOP_LIMIT };
    const r = await uia(LOCAL_AGENT_ACTIONS.UIA_INSPECT);
    if (r.status !== "success") return { ok: false, errorCode: r.errorCode };
    const rawEls = (
      Array.isArray(r.safe.elements) ? r.safe.elements : []
    ) as SafeUiaElement[];
    const windows = (
      Array.isArray(r.safe.windows) ? r.safe.windows : []
    ) as SafeUiaWindow[];
    const elements: WorkElement[] = rawEls.map((e) => ({
      elementRef: e.elementRef,
      role: e.role,
      name: e.name,
      text: e.text,
      disabled: e.disabled,
      hasValue: e.hasValue,
      riskLevel: e.riskLevel,
      editable: e.editable,
      size: e.size,
      focused: e.focused,
      userAction: e.userAction,
      windowRef: e.windowRef,
    }));
    const fg = windows.find((w) => w.foreground) ?? windows[0];
    const path = `window:${fg?.title ?? ""}`;
    const obs: WorkObservation & { snapshotId: string } = {
      siteId,
      path,
      ready: true,
      elements,
      elementCount:
        typeof r.safe.elementCount === "number"
          ? r.safe.elementCount
          : elements.length,
      source: "app_window",
      surface: "uia",
      windows: windows.map((w) => ({
        windowRef: w.windowRef,
        title: w.title,
        foreground: w.foreground,
        userAction: w.userAction,
      })),
      fingerprint: fingerprintObservation(path, elements),
      snapshotId: String(r.safe.snapshotId ?? ""),
    };
    // 시각 모드면 현재 화면을 다시 캡처(Planner 는 이 이미지를 본다). 캡처 실패해도 UIA 관찰은 유지한다.
    if (visualFallback) {
      obs.visualFallback = true;
      await captureForVisual();
      // UIA 지문은 시각 모드에서 화면 변화를 반영하지 못한다(요소 미노출) — 같은-관찰 카운터를 진전 신호로 쓰지 않는다.
      execution.acceptObservation(obs, "reset");
      return { ok: true };
    }
    execution.acceptObservation(obs);
    return { ok: true };
  };

  // ── Phase E — 작업 단위 dispatch(V2 §11-2) ──────────────────────────────────────────────────────────────
  //   판단은 Assistant(여기), 연속 실행은 Execution Node. 노드가 `taskUnit` 을 보고했을 때만 DOM 표면에서 쓴다.
  //   단위 안의 각 단계는 노드에서 단발 action 과 같은 검증 · 같은 실행 경로를 지나고, 화면이 예상과 다르거나
  //   (대상 없음/모호 · 이동 불일치 · 다른 사이트) 사용자 몫(자격 · COMMIT)이거나 예산/시간이 모자라면 노드가 멈추고
  //   지금 화면을 관찰해 돌려준다. 다음 판단은 늘 여기서 한다. 단위는 Task 목적이나 절차를 정하지 않는다.

  const unitCapable = (): boolean =>
    surface === "dom" &&
    !unitDisabled &&
    executionNode?.capabilities?.taskUnit === true;
  /**
   * 단위 하나를 보낸다. 예산 · 시간 상한은 이번 run 의 남은 몫 안에서 정한다(노드가 그 안에서 멈춘다).
   * denied 는 노드가 아무것도 실행하지 않았다는 뜻(형상 거절) — 호출자가 단발 경로로 같은 일을 한다.
   * 그 밖의 실패(만료 · 전송)는 무엇이 실행됐는지 모른다 — **다시 보내지 않고** 관찰부터 한다.
   * 어느 쪽이든 이번 run 의 남은 부분은 단발 경로로 간다.
   */
  const runUnit = async (
    steps: DomUnitStep[],
    opts: { observe: boolean; afterNavigation?: boolean; reserve?: number },
  ): Promise<UnitRun> => {
    const remainingMs =
      WORK_LOOP_LIMITS.maxDurationMs - (Date.now() - state.startedAt);
    const maxDurationMs = Math.max(
      1000,
      Math.min(DOM_UNIT_MAX_DURATION_MS, Math.floor(remainingMs)),
    );
    const maxCommands = Math.max(
      1,
      Math.min(DOM_UNIT_MAX_COMMANDS, budgetLeft() - (opts.reserve ?? 0)),
    );
    const docId = state.observation?.docId;
    measurements.roundTrips += 1;
    measurements.unitDispatches += 1;
    const r = await issueDomUnitCommand(
      dataSource,
      ctx,
      deviceId,
      tool,
      siteId,
      {
        steps,
        observe: opts.observe,
        maxCommands,
        maxDurationMs,
        ...(typeof docId === "string" ? { docId } : {}),
        ...(steps.length === 0 && opts.afterNavigation
          ? { afterNavigation: true }
          : {}),
      },
    );
    if (r.status === "denied") {
      unitDisabled = true;
      return { kind: "denied" };
    }
    if (r.status !== "success") {
      unitDisabled = true;
      return { kind: "lost", errorCode: r.errorCode };
    }
    if (typeof r.safe.probeCount === "number")
      measurements.retryCount += r.safe.probeCount;
    const obs =
      r.safe.observation && typeof r.safe.observation === "object"
        ? (r.safe.observation as UnitObservation)
        : null;
    return {
      kind: "ran",
      reports: (Array.isArray(r.safe.reports)
        ? r.safe.reports
        : []) as UnitReport[],
      stop: (r.safe.stop ?? null) as UnitStop,
      observation: obs,
      observeErrorCode:
        typeof r.safe.observeErrorCode === "string"
          ? r.safe.observeErrorCode
          : null,
    };
  };
  /** 관찰 반영 — 단발 observe() 와 같은 규칙(지문 · 같은-관찰 카운터 · snapshot · docId). 유효 관찰은 예산 2. */
  const applyDomObservation = (o: UnitObservation, countSame = true): void => {
    const elements = (
      Array.isArray(o.elements) ? o.elements : []
    ) as SafeDomElement[];
    const path = typeof o.path === "string" ? o.path : "";
    const obs: WorkObservation & { snapshotId: string } = {
      siteId,
      path,
      ready: true,
      elements,
      elementCount:
        typeof o.elementCount === "number" ? o.elementCount : elements.length,
      source: "webpage",
      fingerprint: fingerprintObservation(path, elements),
      snapshotId: String(o.snapshotId ?? ""),
      ...(typeof o.docId === "string" ? { docId: o.docId } : {}),
    };
    state.stepCount += 2;
    execution.acceptObservation(obs, countSame ? "count" : "preserve");
  };
  /** 노드가 관찰하지 못한 이유 → 단발 observe() 와 같은 오류 축. */
  const unitObserveError = (code: string | null): string => {
    if (code === "DOM_UNIT_BUDGET") return WORK_AGENT_ERROR.LOOP_LIMIT;
    if (
      code === null ||
      code === "DOM_UNIT_TIME" ||
      code === "DOM_UNIT_NOT_READY"
    )
      return WORK_AGENT_ERROR.SITE_NOT_READY;
    return code;
  };
  /** 행동 뒤 재관찰 — 단위 경로면 대기(settle)까지 노드가 한다. 단발 경로는 예전 그대로 서버가 기다린 뒤 관찰한다. */
  const reobserve = async (
    navigated: boolean,
  ): Promise<{ ok: boolean; errorCode?: string }> => {
    if (navigated && !unitCapable()) await settle();
    return observe({ afterNavigation: navigated });
  };

  /**
   * get_context + inspect → 관찰(§7). 이동 직후엔 content script 가 설 때까지 짧게 재시도한다.
   *
   * `afterNavigation` 이면 **이전 문서(docId 동일)를 새 관찰로 받아들이지 않는다** — 실 health.kr smoke(2026-09-12)에서
   * click 이 `navigated:true` 를 돌려준 뒤 700 ms 안에 옛 문서가 아직 살아 있어 홈 화면을 "결과 화면" 으로 관찰한 결함.
   * 새 docId 가 올 때까지 몇 번 더 기다리되, 한 번도 안 바뀌면(같은 문서 안 이동) 마지막 관찰을 그대로 쓴다.
   */
  const observe = async (
    opts: { afterNavigation?: boolean } = {},
  ): Promise<{ ok: boolean; errorCode?: string }> => {
    if (surface === "uia") return observeUia();
    // Phase E — 관찰 전용 단위: get_context · 대기 · inspect 를 노드가 한 번에(왕복 1). 같은 재시도 · 옛 문서 규칙.
    if (unitCapable()) {
      if (budgetLeft() < 2)
        return { ok: false, errorCode: WORK_AGENT_ERROR.LOOP_LIMIT };
      const u = await runUnit([], {
        observe: true,
        afterNavigation: opts.afterNavigation,
      });
      if (u.kind === "ran") {
        if (u.observation) {
          applyDomObservation(u.observation);
          return { ok: true };
        }
        if (u.observeErrorCode !== LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE)
          return { ok: false, errorCode: unitObserveError(u.observeErrorCode) };
        // 관찰이 결과 상한을 넘었다 — 아래 단발 관찰로 다시 본다.
      }
      // denied · lost — 관찰은 상태를 바꾸지 않는다. 단발 경로로 다시 본다.
    }
    const previousDocId = state.observation?.docId;
    const attempts = opts.afterNavigation ? 10 : 3; // 이동 뒤 최대 ~7 s(실 health.kr 폼 이동이 4 s 를 넘긴다)
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await settle();
      if (budgetLeft() < 2)
        return { ok: false, errorCode: WORK_AGENT_ERROR.LOOP_LIMIT };
      const c = await dom(LOCAL_AGENT_ACTIONS.DOM_GET_CONTEXT);
      // 아직 쓸 수 없는 문서(미도달 · 로딩 중 · 옛 문서)를 다시 두드린 probe 는 행동 예산을 쓰지 않는다 —
      // 예산은 "행동 + 유효 관찰" 의 상한이고, 대기 자체는 attempts · maxDuration 이 막는다(실 smoke 에서 이동 대기
      // probe 4회가 예산을 잠식해 결과 화면 직전에 loop_limit 에 걸린 결함).
      const unspend = () => {
        state.stepCount -= 1;
        measurements.retryCount += 1;
      };
      if (c.status !== "success") {
        if (c.errorCode === LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE) {
          unspend();
          continue;
        }
        return { ok: false, errorCode: c.errorCode };
      }
      if (typeof c.safe.siteId === "string" && c.safe.siteId !== siteId)
        return {
          ok: false,
          errorCode: LOCAL_AGENT_ERROR.DOM_CROSS_ORIGIN_BLOCKED,
        };
      if (c.safe.ready !== true) {
        unspend();
        continue;
      }
      if (
        opts.afterNavigation &&
        previousDocId &&
        c.safe.docId === previousDocId &&
        attempt < attempts - 1
      ) {
        // 아직 옛 문서다 — 새 문서가 설 때까지 기다린다(마지막 시도면 그대로 받아들인다).
        unspend();
        continue;
      }
      const i = await dom(LOCAL_AGENT_ACTIONS.DOM_INSPECT);
      if (i.status !== "success") {
        if (i.errorCode === LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE) {
          unspend();
          continue;
        }
        return { ok: false, errorCode: i.errorCode };
      }
      const elements = (
        Array.isArray(i.safe.elements) ? i.safe.elements : []
      ) as SafeDomElement[];
      const path = typeof c.safe.path === "string" ? c.safe.path : "";
      const obs: WorkObservation & { snapshotId: string } = {
        siteId,
        path,
        ready: true,
        elements,
        elementCount:
          typeof i.safe.elementCount === "number"
            ? i.safe.elementCount
            : elements.length,
        source: "webpage",
        fingerprint: fingerprintObservation(path, elements),
        snapshotId: String(i.safe.snapshotId ?? ""),
        ...(typeof c.safe.docId === "string" ? { docId: c.safe.docId } : {}),
      };
      execution.acceptObservation(obs);
      return { ok: true };
    }
    return { ok: false, errorCode: WORK_AGENT_ERROR.SITE_NOT_READY };
  };

  return {
    budgetLeft,
    overTime,
    dom,
    uia,
    computer,
    unitCapable,
    runUnit,
    applyDomObservation,
    unitObserveError,
    reobserve,
    observe,
    enterVisualFallback,
    isVisualFallback: () => visualFallback,
    // A method keeps image bytes out of serializable session properties; only Planner consumes them.
    plannerImage: () => visualImage,
    sameObservationRun: () => execution.sameObservationRun,
    resetSameObservationRun: () => {
      execution.restoreObservationRun(0);
    },
    restoreSameObservationRun: (value: number) => {
      execution.restoreObservationRun(value);
    },
  };
}
export type WorkObservationSession = ReturnType<
  typeof createWorkObservationSession
>;
