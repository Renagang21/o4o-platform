/**
 * Unified Request Router — 한 문장을 어느 실행 경로로 보낼지 판정한다 (pure)
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §4·§5
 *
 *   User Request ─┬─ 일반 질의 · 파일 분석 · 1-step 조회(열기 · 상태 · 로컬 데이터 · 공급처)  → chat  (home-chat 경로 그대로)
 *                 ├─ 등재 대상(site · windows app) 위의 **업무**                               → work  (Work Agent loop)
 *                 ├─ 등재 대상은 있는데 업무인지 조회인지 모호                                  → confirm_work (짧은 확인)
 *                 └─ runId(PHASE 1 재개) · 사용자가 확인한 요청                                → work
 *
 * 원칙
 *   - **결정론**. 판정에 AI 를 부르지 않는다 — 요청마다 planner 호출이 늘면 안 된다(속도 · 비용).
 *   - 대상 판정은 Work Agent 와 **같은 함수**(`resolveWorkTarget`)를 쓴다. 라우터가 Work 로 보냈는데 Agent 가 대상을 못 찾는
 *     어긋남을 만들지 않기 위해서다. 새 별칭 표를 두지 않는다.
 *   - 조회 · 열기 · 로그인 안내는 home-chat 의 1-step tool 축이 이미 안전하게 처리한다 — 그 문장을 Work Agent 로 보내지 않는다.
 *   - 문서 · 표 첨부는 Work Agent 로 흐르지 않는다(§6 — 행동 loop 에 신뢰 불가 데이터를 싣지 않는다). 문서가 붙은 요청은 chat.
 *   - 안전 경계는 여기서 넓히지 않는다. Work 로 가더라도 COMMIT · credential · never-escalate 는 runtime 이 그대로 막는다.
 *
 * DB · 네트워크 의존 없음.
 */

import { asksForLogin, asksForSiteOpen, asksForWindowActivation } from './ai-tool-router.js';
import { resolveWorkTarget, type WorkTargetRef } from './work-target-resolver.js';
import { WINDOWS_APP_REGISTRY } from '../local-agent/windows-app-registry.js';
import { PHARMACY_WEB_SITE_REGISTRY } from '../local-agent/pharmacy-web-core.js';

export type UnifiedRoute = 'chat' | 'work' | 'confirm_work';

export type UnifiedRouteReason =
  | 'resume'
  | 'user_confirmed'
  | 'no_registered_target'
  | 'login_guidance'
  | 'status_inquiry'
  | 'open_or_activate_only'
  | 'document_attached'
  | 'task_intent'
  | 'ambiguous';

export interface UnifiedRouteDecision {
  route: UnifiedRoute;
  target: WorkTargetRef | null;
  reason: UnifiedRouteReason;
}

export interface UnifiedRouteInput {
  /** PHASE 1 same-run 재개 앵커. 있으면 무조건 Work. */
  runId?: string;
  /** confirm_work 응답에 사용자가 "진행" 으로 답했을 때 클라이언트가 되돌려 주는 내부 힌트. UI 모드가 아니다. */
  routeHint?: 'work';
  /** 문서 · 표 첨부가 있는가(이미지는 해당 없음). */
  hasDocumentAttachment?: boolean;
}

// ─── 사전 (한글은 esbuild 정규식 이슈를 피해 문자열 · compact 대조) ──────────────────────────────

/** "열려 있어?" · "실행 중이야?" 류 — 상태 조회. home-chat 의 BROWSER_GET_SITE_STATUS / FIND_APPLICATION 이 답한다. */
const STATUS_INQUIRY_KO: readonly string[] = [
  '열려있', '실행중', '실행되어있', '실행돼있', '켜져', '떠있', '떠있', '켜있', '열렸', '실행됐', '실행되고있', '돌아가고있', '살아있',
];
const STATUS_INQUIRY_EN: readonly RegExp[] = [/\bis\b.*\b(open|running|up)\b/i, /\brunning\b\s*\?/i, /\bstatus\b/i];

/** 열기 · 활성화 문장에서 대상 이름 외에 남아도 되는 말. 이것만 남으면 "열기/활성화만" 이다. */
const OPEN_FILLERS_KO: readonly string[] = [
  '열어', '열기', '열고', '접속', '이동', '띄워', '켜', '켜줘', '실행해', '실행시켜', '앞으로', '앞에', '활성화', '포커스', '전환', '가져와', '가져다',
  '해줘', '해주세요', '해주', '주세요', '줘', '줄래', '좀', '해', '요', '사이트', '홈페이지', '창', '화면', '프로그램', '브라우저', '앱', '탭',
  '다시', '지금', '바로', '먼저', '한번', '한 번', '그리고', '및', '이랑', '랑', '하고', '과', '와', '를', '을', '에', '에서', '로', '으로', '의', '도',
  '내', '제', '나의', 'pc', '컴퓨터', '?', '!', '.', ',', '~',
];
const OPEN_FILLERS_EN: readonly RegExp[] = [
  /\b(open|go\s*to|navigate|launch|bring|to|the|front|focus|activate|please|now|my|site|window|app|browser|tab|pc|up)\b/gi,
];

/** 업무 지시어 — 등재 대상 위에서 관찰 · 입력 · 조회를 잇는 요청. 열기 · 상태와 구분되는 **행동/결과** 요구. */
// 동사 · 의문형만 둔다. "반납" · "주문" · "목록" 같은 명사만 있는 문장("닥터스 반납")은 업무인지 조회인지 알 수 없으므로 되묻는다.
const TASK_INTENT_KO: readonly string[] = [
  '찾아', '검색', '조회', '확인해', '확인하', '알려', '보여', '가져', '정리해', '정리하', '입력', '작성', '등록해', '등록하', '저장', '처리',
  '비교', '추출', '읽어', '클릭', '눌러', '선택', '적어', '써줘', '써서', '보내', '계산', '다운', '출력', '인쇄', '검토', '분석', '요약',
  '수정', '변경', '삭제', '추가', '체크', '살펴', '뭐가있', '무엇이있', '어떤것', '몇개', '몇건', '얼마',
];
const TASK_INTENT_EN: readonly RegExp[] = [
  /\b(find|search|look\s*up|show|list|enter|type|fill|click|press|read|get|fetch|compare|extract|check|summari[sz]e|analy[sz]e|register|save|order|return|select|choose|what|which|how\s+many)\b/i,
];

function compact(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 문장에서 등재 대상 별칭(모든 등재부)을 지운다. 대상 이름을 "업무" 로 오인하지 않게 하기 위해서다. */
function stripTargetAliases(message: string): string {
  let text = message;
  const aliases: string[] = [];
  for (const app of WINDOWS_APP_REGISTRY) aliases.push(...app.aliases);
  for (const site of PHARMACY_WEB_SITE_REGISTRY) aliases.push(...site.aliases);
  aliases.push('네뚜레', 'neture', 'O4O홈', 'O4O 홈', 'o4o home');
  // 긴 별칭부터 지워야 "약학 정보원" 이 "약학정보원" 보다 먼저 사라지지 않는 문제를 피한다.
  for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), 'gi');
    text = text.replace(re, ' ');
  }
  return text;
}

export function isStatusInquiry(message: string): boolean {
  const c = compact(message);
  if (STATUS_INQUIRY_KO.some((k) => c.includes(k))) return true;
  return STATUS_INQUIRY_EN.some((re) => re.test(message));
}

/** 열기 · 활성화 지시어가 있고, 대상 이름과 상투어를 빼면 남는 말이 없는 문장. */
export function isOpenOrActivateOnly(message: string): boolean {
  if (!asksForSiteOpen(message) && !asksForWindowActivation(message)) return false;
  let rest = stripTargetAliases(message);
  for (const re of OPEN_FILLERS_EN) rest = rest.replace(re, ' ');
  let c = compact(rest);
  for (const f of [...OPEN_FILLERS_KO].sort((a, b) => b.length - a.length)) c = c.split(compact(f)).join('');
  return c.length <= 1;
}

export function hasTaskIntent(message: string): boolean {
  const c = compact(stripTargetAliases(message));
  if (TASK_INTENT_KO.some((k) => c.includes(compact(k)))) return true;
  return TASK_INTENT_EN.some((re) => re.test(message));
}

/**
 * 판정 본체. 순서가 곧 정책이다:
 *   runId → 확인된 요청 → 대상 없음 → 로그인 안내 → 상태 조회 → 열기/활성화만 → 문서 첨부 → 업무 지시어 → 모호(확인).
 *
 * 이 라우터는 **병원 특수 규칙(원내약·동일성분 composite)을 갖지 않는다.** hospital-drug 결합 요청의
 * composite 경계는 그 화면(surface='hospital-drug')에서만 ai-proxy HTTP 계층이 명시적으로 건다
 * (WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §16 — 고정되는 것은 Source 가 아니라 Context).
 */
export function classifyUnifiedRequest(message: string, input: UnifiedRouteInput = {}): UnifiedRouteDecision {
  const text = String(message ?? '');
  if (typeof input.runId === 'string' && input.runId.length > 0) {
    return { route: 'work', target: resolveWorkTarget(text), reason: 'resume' };
  }
  const target = resolveWorkTarget(text);
  if (!target) return { route: 'chat', target: null, reason: 'no_registered_target' };
  if (input.routeHint === 'work') return { route: 'work', target, reason: 'user_confirmed' };
  // 로그인 automation 은 없다 — 열기까지만 하고 "직접 로그인" 을 안내하는 home-chat 축으로 보낸다(BROWSER-CONTROL-V0 §31·§32).
  if (asksForLogin(text)) return { route: 'chat', target, reason: 'login_guidance' };
  if (isStatusInquiry(text)) return { route: 'chat', target, reason: 'status_inquiry' };
  if (isOpenOrActivateOnly(text)) return { route: 'chat', target, reason: 'open_or_activate_only' };
  if (input.hasDocumentAttachment) return { route: 'chat', target, reason: 'document_attached' };
  if (hasTaskIntent(text)) return { route: 'work', target, reason: 'task_intent' };
  return { route: 'confirm_work', target, reason: 'ambiguous' };
}

/** confirm_work 사용자 문구. 내부 용어(Work Agent · Local Agent)를 쓰지 않는다(§4). */
export function confirmWorkMessage(target: WorkTargetRef): string {
  const where = target.targetType === 'windows_app' ? `${target.displayName} 프로그램` : `${target.displayName} 사이트`;
  return `${where}에서 직접 작업을 진행할까요? 단순히 알고 싶은 것이면 질문을 조금 더 구체적으로 적어 주세요.`;
}
