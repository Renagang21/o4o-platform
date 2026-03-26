/**
 * CGM-Event → Action Mapper (순수 함수)
 *
 * WO-O4O-CARE-ACTION-ENGINE-V2
 *
 * 분석 결과를 규칙 기반으로 약사 행동 제안(Action)에 매핑한다.
 * DB 접근 없음. AI 생성 없음. 최대 3개 Action, 중복 제거, 우선순위 정렬.
 */

import type {
  CgmEventAnalysisResult,
  EventAnalysis,
  DetectedPattern,
  CareGeneratedAction,
  CareActionType,
  CareActionPriority,
} from './cgm-event.types.js';

const MAX_ACTIONS = 3;

const PRIORITY_ORDER: Record<CareActionPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export function mapAnalysisToActions(result: CgmEventAnalysisResult): CareGeneratedAction[] {
  const candidates: CareGeneratedAction[] = [];

  for (const ev of result.events) {
    applyEventRules(ev, candidates);
  }

  for (const pattern of result.patterns) {
    applyPatternRules(pattern, candidates);
  }

  // Deduplicate: keep highest priority per action type
  const byType = new Map<CareActionType, CareGeneratedAction>();
  for (const action of candidates) {
    const existing = byType.get(action.type);
    if (!existing || PRIORITY_ORDER[action.priority] < PRIORITY_ORDER[existing.priority]) {
      byType.set(action.type, action);
    }
  }

  return Array.from(byType.values())
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, MAX_ACTIONS);
}

// ── Event-level rules ──

function applyEventRules(ev: EventAnalysis, out: CareGeneratedAction[]): void {
  switch (ev.eventType) {
    case 'meal':
      if (ev.impact === 'high') {
        out.push({ type: 'create_coaching', priority: 'HIGH', label: '식후 혈당 관리 코칭 권장', reason: '식후 혈당 급상승이 감지되었습니다' });
        out.push({ type: 'open_patient', priority: 'MEDIUM', label: '식사-혈당 패턴 상세 확인', reason: '식후 혈당 급상승 — 상세 확인 필요' });
      }
      break;

    case 'exercise':
      if (ev.effect === 'low') {
        out.push({ type: 'run_analysis', priority: 'LOW', label: '운동-혈당 변화 재분석', reason: '운동 효과가 미미합니다 — 추가 분석 권장' });
        out.push({ type: 'open_patient', priority: 'LOW', label: '운동 기록 상세 확인', reason: '운동 효과 미미 — 기록 상세 확인' });
      }
      break;

    case 'medication':
      if (ev.effect === 'weak') {
        out.push({ type: 'open_patient', priority: 'HIGH', label: '복약-혈당 관계 재확인', reason: '약물 효과가 약합니다 — 즉시 확인 필요' });
        out.push({ type: 'create_coaching', priority: 'MEDIUM', label: '복약 순응도 코칭 검토', reason: '약물 효과 약함 — 복약 지도 권장' });
      }
      break;

    case 'symptom':
      if (ev.context === 'hypoglycemia') {
        out.push({ type: 'resolve_alert', priority: 'HIGH', label: '저혈당 알림 확인 필요', reason: `저혈당 증상 감지 (혈당 ${ev.glucoseAtEvent ?? '-'} mg/dL)` });
        out.push({ type: 'create_coaching', priority: 'HIGH', label: '저혈당 대응 코칭 작성', reason: '저혈당 증상 — 긴급 코칭 필요' });
      }
      if (ev.context === 'hyperglycemia') {
        out.push({ type: 'resolve_alert', priority: 'HIGH', label: '고혈당 알림 확인 필요', reason: `고혈당 증상 감지 (혈당 ${ev.glucoseAtEvent ?? '-'} mg/dL)` });
        out.push({ type: 'open_patient', priority: 'HIGH', label: '고혈당 상황 상세 확인', reason: '고혈당 증상 — 즉시 확인 필요' });
      }
      break;
  }
}

// ── Pattern-level rules (count >= 3 already guaranteed) ──

function applyPatternRules(pattern: DetectedPattern, out: CareGeneratedAction[]): void {
  if (pattern.patternType === 'meal' && pattern.classification === 'high') {
    out.push({ type: 'create_coaching', priority: 'HIGH', label: '식후 혈당 관리 코칭 권장', reason: `식후 급상승 패턴이 ${pattern.count}회 반복되었습니다` });
    out.push({ type: 'open_patient', priority: 'MEDIUM', label: '식사-혈당 패턴 상세 확인', reason: '식후 급상승 패턴 반복 — 상세 확인' });
  }

  if (pattern.patternType === 'exercise' && pattern.classification === 'high') {
    out.push({ type: 'create_coaching', priority: 'MEDIUM', label: '운동 유지 코칭 권장', reason: `운동 시 혈당 감소 효과가 큰 패턴 (${pattern.count}회)` });
  }

  if (pattern.patternType === 'symptom' && pattern.classification === 'hypoglycemia') {
    out.push({ type: 'resolve_alert', priority: 'HIGH', label: '저혈당 알림 확인 필요', reason: `저혈당 반복 발생 (${pattern.count}회)` });
    out.push({ type: 'create_coaching', priority: 'HIGH', label: '저혈당 대응 코칭 작성', reason: `저혈당 패턴 반복 — 긴급 코칭 필요` });
  }

  if (pattern.patternType === 'symptom' && pattern.classification === 'hyperglycemia') {
    out.push({ type: 'resolve_alert', priority: 'HIGH', label: '고혈당 알림 확인 필요', reason: `고혈당 반복 발생 (${pattern.count}회)` });
    out.push({ type: 'open_patient', priority: 'HIGH', label: '고혈당 상황 상세 확인', reason: '고혈당 패턴 반복 — 즉시 확인 필요' });
  }
}
