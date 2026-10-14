/**
 * Task Understanding — 한 run 의 완료 근거 상태(요청 메모리 전용 · 로그 · 저장 금지).
 * (WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1)
 *
 *   seen       이번 run 에서 실제로 본 화면 글(관찰 요소 · 읽기 결과) — 정규화 · 상한. 입력 · 선택 칸의 값은 넣지 않는다.
 *   ground     Execution 이 보고한 근거 인용을 seen 과 대조해 grounded 를 정하고, 같은 run 의 앞선 grounded 근거를 누적한다.
 *   verdict    Assistant 판정 결과(최종 보고에 실린다).
 */
import {
  elementEvidenceText,
  isIdentifyingQuote,
  normalizeEvidenceText,
  type CompletionVerdict,
  type ExecutionEvidence,
  type WorkElement,
  type WorkObservation,
  type WorkProposal,
  type WorkStepRecord,
} from './work-agent-contract.js';

/** 완료 근거 대조용으로 기억하는 화면 글 묶음 수(읽기 결과 · 관찰 요소). 메모리 전용. */
export const SEEN_TEXT_MAX = 40;

export function createCompletionEvidenceSession() {
  const seenTexts: string[] = [];
  /** 이번 run 에서 화면 근거로 확인된(grounded) 조건별 근거 — 조건이 서로 다른 화면에서 확인돼도 앞 판정의 근거를 잃지 않는다. */
  const groundedByCriterion = new Map<string, ExecutionEvidence>();
  let lastEvidence: ExecutionEvidence[] = [];
  let lastVerdict: CompletionVerdict | null = null;

  const noteSeen = (text: string | null | undefined): void => {
    const t = normalizeEvidenceText(String(text ?? ''));
    if (!t) return;
    seenTexts.push(t);
    if (seenTexts.length > SEEN_TEXT_MAX) seenTexts.shift();
  };
  /** 요소 글 — 입력 · 선택 칸의 현재 값은 근거가 아니다(elementEvidenceText). */
  const noteElements = (elements: readonly WorkElement[]): void => {
    noteSeen(elements.map(elementEvidenceText).join('\n'));
  };
  const noteObservation = (o: WorkObservation | null): void => {
    if (o) noteElements(o.elements ?? []);
  };

  /**
   * 근거 인용은 이번 run 에서 실제 본 화면 글에 있어야 grounded 다 — 입력한 값 · 짧거나 비식별적인 인용("5" 등)은 근거가 아니다.
   * 같은 run 의 앞선 판정에서 grounded 된 조건 근거를 누적해 돌려준다.
   */
  const ground = (proposal: WorkProposal, history: readonly WorkStepRecord[]): ExecutionEvidence[] => {
    const typed = new Set(
      history.flatMap((h) => [h.action.text, h.action.option])
        .filter((v): v is string => typeof v === 'string')
        .map(normalizeEvidenceText),
    );
    const evidence: ExecutionEvidence[] = (proposal.evidence ?? []).map((e) => {
      const q = normalizeEvidenceText(e.quote);
      const grounded = isIdentifyingQuote(q) && !typed.has(q) && seenTexts.some((t) => t.includes(q));
      return { criterionId: e.criterion, source: e.source, quote: e.quote, grounded };
    });
    for (const e of evidence) if (e.grounded) groundedByCriterion.set(e.criterionId, e);
    lastEvidence = [
      ...groundedByCriterion.values(),
      ...evidence.filter((e) => !groundedByCriterion.has(e.criterionId)),
    ];
    return lastEvidence;
  };

  return {
    noteSeen,
    noteElements,
    noteObservation,
    ground,
    /** 이미 확인된 조건 id(이번 미충족 제외) — planner 가 확인된 조건으로 되돌아가 왕복하지 않게. */
    confirmedExcept: (unmet: readonly string[]): string[] =>
      [...groundedByCriterion.keys()].filter((id) => !unmet.includes(id)).slice(0, 6),
    setVerdict: (v: CompletionVerdict | null): void => { lastVerdict = v; },
    evidence: (): ExecutionEvidence[] => lastEvidence,
    verdict: (): CompletionVerdict | null => lastVerdict,
  };
}
export type CompletionEvidenceSession = ReturnType<typeof createCompletionEvidenceSession>;
