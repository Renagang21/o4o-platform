import {
  fingerprintObservation,
  sameWorkAction,
  type WorkAction,
  type WorkAgentState,
  type WorkElement,
  type WorkObservation,
  type WorkStepRecord,
} from "./work-agent-contract.js";

type Observed = WorkObservation & { snapshotId?: string };
type OwnedState = Pick<
  WorkAgentState,
  "observation" | "history" | "lastResult"
>;

/** Request-local execution evidence. Budgets, routing, persistence and transport stay in runtime. */
export function createWorkAgentExecutionState(state: OwnedState) {
  let sameObservationRun = 0;
  let repeatedActionRun = 0;
  let lastActRecord: WorkStepRecord | null = null;

  return {
    get sameObservationRun() {
      return sameObservationRun;
    },
    get lastActRecord() {
      return lastActRecord;
    },
    acceptObservation(
      observation: Observed,
      progress: "count" | "preserve" | "reset" = "count",
    ) {
      if (progress === "count") {
        sameObservationRun =
          state.observation?.fingerprint === observation.fingerprint
            ? sameObservationRun + 1
            : 0;
      } else if (progress === "reset") sameObservationRun = 0;
      state.observation = observation;
    },
    // find/replay candidates are a partial view, not another full observation of progress.
    narrowObservation(elements: WorkElement[], snapshotId: string) {
      const previous = state.observation as Observed;
      const narrowed: Observed = {
        ...previous,
        elements,
        elementCount: elements.length,
        fingerprint: fingerprintObservation(previous.path, elements),
        snapshotId,
      };
      state.observation = narrowed;
    },
    restoreObservationRun(count: number) {
      sameObservationRun = count;
    },
    resetProgress() {
      sameObservationRun = 0;
      repeatedActionRun = 0;
    },
    noteProposedAction(action: WorkAction) {
      repeatedActionRun = sameWorkAction(state.lastResult?.action, action)
        ? repeatedActionRun + 1
        : 0;
      return repeatedActionRun;
    },
    // Append and accept are separate to preserve each call site's metadata/result ordering.
    append(record: WorkStepRecord) {
      state.history.push(record);
    },
    acceptResult(record: WorkStepRecord) {
      state.lastResult = record;
    },
    beginAction() {
      lastActRecord = null;
    },
    rememberAction(record: WorkStepRecord) {
      lastActRecord = record;
    },
  };
}

export type WorkAgentExecutionState = ReturnType<
  typeof createWorkAgentExecutionState
>;
