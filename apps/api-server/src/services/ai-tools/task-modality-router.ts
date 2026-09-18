/**
 * Task Modality Router — Goal 이 요구하는 실행 modality 를 고르는 얇은 계층 (pure)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-C-TASK-MODALITY-ROUTER-V1
 *
 *   Goal ──┬─ 검증된 반복 업무가 있다                 → workflow   (deterministic · PHASE 2 저장소가 붙기 전엔 hook 이 없다)
 *          ├─ 현재 화면을 보고 판단·조작해야 한다      → screen     (Capability B · openai vision planner)
 *          ├─ 검색·조사·문서·텍스트·데이터 업무다      → research   (Capability A · gemini web research)
 *          └─ 실행 표면도 조사 대상도 정해지지 않았다   → question   (사용자 고유 정보 필요 · QUESTION / same-run 재개)
 *
 * 원칙
 *   - provider 선택은 **per-task 실행 결정**이다. 전역 `AI_DEFAULT_PROVIDER` 는 바꾸지 않는다(운영 기본 gemini 유지).
 *   - 사용자에게 모델/provider 를 고르게 하지 않는다. 이 모듈은 provider 이름만 알고 **모델 이름은 모른다**(runtime resolver 소관).
 *   - 특정 업종 · 사이트 · 약품 · 서비스 키워드 하드코딩 0. "실행 표면이 있는가" 는 등재부 조회(resolveWorkTarget)로만 판단하고
 *     UI 어휘(화면 · 버튼 · 클릭 · 입력창 …)는 업종 중립 일반어만 둔다. 비용 점수 · AI classifier 없음(결정론).
 *   - 기존 Safety · QUESTION/TAKEOVER · same-run 재개 는 건드리지 않는다 — 이 모듈은 실행 **전** 한 번 고를 뿐이다.
 *
 * DB · 네트워크 의존 없음.
 */

import { resolveWorkTarget, type WorkTargetRef } from './work-target-resolver.js';
import type { RuntimeProvider } from '../../utils/ai-provider-runtime.js';

export type TaskModality = 'workflow' | 'screen' | 'research' | 'question';

export type TaskModalityReason =
  | 'verified_workflow'
  | 'registered_target'
  | 'target_hint'
  | 'screen_image'
  | 'ui_interaction_vocabulary'
  | 'research_vocabulary'
  | 'no_execution_surface';

export interface TaskModalityInput {
  /** 사용자의 자연어 목적. */
  request: string;
  /** Work Agent 등재 id 힌트(siteId/appId). 있으면 실행 표면이 정해진 것. */
  targetHint?: string;
  /** 이미지 동반 여부와 출처. 화면 캡처는 그 자체로 screen. */
  image?: { provenance?: 'user_image' | 'screen_capture' } | null;
  /**
   * 검증된 반복 업무(Workflow) 조회 hook — PHASE 2 Workflow 저장소가 붙을 때 주입한다.
   * 주입이 없으면 workflow modality 는 나오지 않는다(새 Workflow Engine 을 여기서 만들지 않는다).
   */
  hasVerifiedWorkflow?: (request: string) => boolean;
}

export interface TaskModalityDecision {
  modality: TaskModality;
  reason: TaskModalityReason;
  /** screen 일 때 등재 대상(있으면). "현재 화면" 류는 대상 없이 screen 일 수 있다(런타임이 targetHint 또는 foreground 를 요구). */
  target: WorkTargetRef | null;
  /** 이 modality 를 실행할 provider. workflow/question 은 AI provider 를 쓰지 않는다. */
  provider: RuntimeProvider | null;
  /** 실행 경로 이름(로그 · CHECK 용 · UI 비노출). */
  executor: 'workflow' | 'vision_planner' | 'web_research' | 'question';
}

/** modality → provider. 모델 이름은 여기 없다 — `resolveAiTarget(ds, provider)` 가 admin/env SSOT 로 정한다. */
export const MODALITY_PROVIDER: Readonly<Record<TaskModality, RuntimeProvider | null>> = Object.freeze({
  workflow: null,
  screen: 'openai',
  research: 'gemini',
  question: null,
});

const MODALITY_EXECUTOR: Readonly<Record<TaskModality, TaskModalityDecision['executor']>> = Object.freeze({
  workflow: 'workflow',
  screen: 'vision_planner',
  research: 'web_research',
  question: 'question',
});

// ─── 어휘 (업종 중립 · 한글은 문자열 compact 대조 — esbuild charset=ascii 정규식 이슈 회피) ─────────────────

/** 현재 화면을 보고/만지며 진행해야 하는 요청. 대상 이름이 없어도("이 화면에서 …") screen 이다. */
const UI_INTERACTION_KO: readonly string[] = [
  '화면', '버튼', '클릭', '눌러', '입력창', '입력란', '메뉴', '탭에서', '창에서', '팝업', '스크롤', '체크박스', '드롭다운', '선택해',
  '다음으로진행', '다음단계', '진행해줘', '넘어가', '캡처', '스크린샷', '보이는', '표시된', '띄워져',
];
const UI_INTERACTION_EN: readonly RegExp[] = [
  /\b(screen|button|click|tap|press|menu|popup|dialog|scroll|checkbox|dropdown|input\s*box|text\s*field|next\s*step|proceed|screenshot)\b/i,
];

/** 검색·조사·문서·텍스트·데이터 업무. 대상 화면이 없을 때만 research 로 간다. */
const RESEARCH_KO: readonly string[] = [
  '조사', '검색', '알아봐', '알아보', '찾아봐', '찾아보', '정보', '비교', '요약', '정리해', '분석', '최신', '동향', '뉴스', '리뷰', '평판',
  '가격대', '시세', '설명해', '무엇인지', '뭔지', '어떤제품', '자료', '문서', '데이터', '통계', '추천', '장단점', '차이',
];
const RESEARCH_EN: readonly RegExp[] = [
  /\b(research|search|look\s*up|find\s*out|compare|summari[sz]e|analy[sz]e|explain|what\s+is|latest|news|review|overview|pros\s+and\s+cons|difference)\b/i,
];

function compact(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

export function hasUiInteractionVocabulary(request: string): boolean {
  const c = compact(request);
  if (UI_INTERACTION_KO.some((k) => c.includes(compact(k)))) return true;
  return UI_INTERACTION_EN.some((re) => re.test(request));
}

export function hasResearchVocabulary(request: string): boolean {
  const c = compact(request);
  if (RESEARCH_KO.some((k) => c.includes(compact(k)))) return true;
  return RESEARCH_EN.some((re) => re.test(request));
}

function decide(modality: TaskModality, reason: TaskModalityReason, target: WorkTargetRef | null): TaskModalityDecision {
  return { modality, reason, target, provider: MODALITY_PROVIDER[modality], executor: MODALITY_EXECUTOR[modality] };
}

/**
 * 판정. 순서가 곧 정책이다:
 *   ① 검증된 workflow → workflow
 *   ② 실행 표면이 정해짐(등재 대상 · targetHint · 화면 캡처) → screen
 *   ③ UI 어휘(현재 화면을 만져야 함) → screen
 *   ④ 조사 어휘 → research
 *   ⑤ 그 밖 → question (무엇을 · 어디서 를 사용자가 정해야 한다)
 * 등재 대상이 있으면 조사 어휘가 있어도 screen 이다 — "사이트에서 찾아줘" 는 그 화면에서 하는 일이다.
 */
export function classifyTaskModality(input: TaskModalityInput): TaskModalityDecision {
  const request = String(input.request ?? '').trim();
  if (input.hasVerifiedWorkflow && request && input.hasVerifiedWorkflow(request)) {
    return decide('workflow', 'verified_workflow', null);
  }
  const target = resolveWorkTarget(request, input.targetHint);
  if (target) return decide('screen', input.targetHint ? 'target_hint' : 'registered_target', target);
  if (input.image?.provenance === 'screen_capture') return decide('screen', 'screen_image', null);
  if (hasUiInteractionVocabulary(request)) return decide('screen', 'ui_interaction_vocabulary', null);
  if (hasResearchVocabulary(request)) return decide('research', 'research_vocabulary', null);
  return decide('question', 'no_execution_surface', null);
}
