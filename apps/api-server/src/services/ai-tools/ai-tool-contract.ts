/**
 * AI Capability / Tool Routing — 계약 (순수)
 *
 * WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   capability  = 지금 이 사용자가 **도구를 쓸 자격**이 있는가
 *   tool        = 시스템이 가진 **실행 수단**
 *   routing     = 이 요청에서 **어떤 tool 이 자격을 통과하는가**
 *
 *   capability → tool 사용 자격 (이름이 곧 도구가 아니다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 이것은 **새 권한 체계가 아니다**
 *
 *   아래 `AiCapability` 는 저장되지 않는다. DB 테이블도, grant 절차도, 관리 화면도 없다.
 *   **기존 인가 사실(session · service_memberships · role_assignments · store resolution)을
 *   서버가 그때그때 투영(projection)한 라벨**일 뿐이다. 권한을 새로 만들지 않으므로
 *   기존 SSOT 와 충돌하지 않는다.
 *
 *   같은 저장소에 이름이 비슷한 축이 둘 더 있다. **셋은 서로 다른 것이다:**
 *
 *   1. `@o4o/capabilities` (`StoreCapability`: TABLET / SIGNAGE / POP_PRINT …)
 *      = **매장 기능 등재부**. "이 매장이 태블릿 기능을 켰는가" — organization_id 로 저장되는
 *        매장 단위 entitlement 다. 사용자 권한이 아니다.
 *   2. `WorkScope.capabilities` (`navigate|read|draft` …)
 *      = 프런트 **서술용**. 그 계약이 "인가 판정에 쓰지 않는다" 고 명시돼 있고,
 *        클라이언트가 보내는 값이라 신뢰 대상이 아니다.
 *   3. `AiCapability` (이 파일)
 *      = **tool 사용 자격**. 서버가 세션에서 파생한다.
 *
 *   1번은 tool 의 *결과 데이터* 로 쓰이고(어떤 매장 기능이 켜져 있는지 알려주는 것),
 *   2번은 tool 판정에 **쓰지 않는다**. 판정에 쓰는 것은 3번뿐이다.
 */

import { isRegisteredWindowsApp } from '../local-agent/windows-app-registry.js';
import { isRegisteredBrowserSite } from '../local-agent/browser-site-registry.js';
import {
  validateClickArgs,
  validateKeyArgs,
  validateTextArgs,
} from '../local-agent/computer-use-contract.js';
import {
  validateDataGetMetaArgs,
  validateDataSetSettingArgs,
} from '../local-agent/local-agent-protocol.js';

// ─── Capability ──────────────────────────────────────────────────────────────

/**
 * V0 capability 집합 — **최소 2개만** 둔다(§7: 새 이름을 대량 생성하지 않는다).
 *
 * 둘 다 read-only 다. 쓰기·로컬·브라우저 capability 는 이번 범위에서 **정의하지 않는다** —
 * 이름만 미리 만들어 두면 "있으니 곧 열어도 된다" 는 압력이 생긴다(§22·§23).
 */
export const AiCapability = {
  /** 현재 작업 컨텍스트(업무 공간·서비스·매장 확정 여부) 조회. 인증만 되면 성립한다. */
  READ_ONLY_AI_CONTEXT: 'READ_ONLY_AI_CONTEXT',
  /** 현재 사용자의 **확정된** 매장 컨텍스트 조회. 매장이 resolved 일 때만 성립한다. */
  READ_ONLY_STORE_CONTEXT: 'READ_ONLY_STORE_CONTEXT',
  /**
   * 이 사용자의 Local Work Agent **연결 상태** 조회 (§19 `local.agent.status`).
   * 인증만 되면 성립한다 — 답이 "연결 안 됨" 일 수 있어야 §41 안내가 가능하다.
   */
  READ_ONLY_LOCAL_AGENT_STATUS: 'READ_ONLY_LOCAL_AGENT_STATUS',
  /**
   * 연결된 PC 의 **안전 시스템 정보** 조회 (§19 `local.system.info`).
   * agent 가 실제로 붙어 있을 때만 성립한다.
   */
  READ_ONLY_LOCAL_SYSTEM_INFO: 'READ_ONLY_LOCAL_SYSTEM_INFO',
  /**
   * 연결된 PC 에서 **등재된 프로그램이 실행 중인지** 조회
   * (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §22 `local.app.inspect`).
   *
   * read-only 다. 전체 process 목록도, 실행 파일 경로도 이 자격으로 얻을 수 없다 —
   * 얻을 수 있는 것은 "등재 앱이 실행 중인가 · 창이 몇 개인가" 뿐이다(§20·§21).
   */
  READ_ONLY_LOCAL_APP_INSPECT: 'READ_ONLY_LOCAL_APP_INSPECT',
  /**
   * 등재된 프로그램의 창을 **앞으로 가져오는** 자격 (§22 `local.window.activate`).
   *
   * ⚠️ V0 에서 **유일하게 read-only 가 아닌 capability** 다. 다만 그 효과는
   * "이미 열려 있는 창의 z-order 를 바꾼다" 하나뿐이고, 실행 · 종료 · 입력 · 캡처는
   * 애초에 구현되어 있지 않다(§25·§26·§27·§28).
   */
  LOCAL_WINDOW_ACTIVATE: 'LOCAL_WINDOW_ACTIVATE',
  /**
   * 연결된 PC 에서 **등재 사이트 기준으로 브라우저 실행 여부** 조회
   * (WO-O4O-BROWSER-CONTROL-V0 §13·§28 `local.browser.inspect`).
   * read-only 다. 탭 목록 · history · cookie 는 이 자격으로 얻을 수 없다(§46).
   */
  READ_ONLY_LOCAL_BROWSER_INSPECT: 'READ_ONLY_LOCAL_BROWSER_INSPECT',
  /**
   * **등재된 HTTPS 사이트를 기본 브라우저로 여는** 자격 (§14·§25·§28 `local.browser.open`).
   *
   * 창 활성화에 이어 두 번째 non-read-only capability 다. 효과는 "등재 URL 하나를
   * OS 기본 handler 로 연다" 뿐이다. 임의 URL · 임의 프로그램 · 로그인 · 입력은 이 자격으로
   * 표현할 수 없다(§10·§26·§32).
   */
  LOCAL_BROWSER_OPEN: 'LOCAL_BROWSER_OPEN',
  /**
   * 연결된 PC 의 **등재 앱 창 하나**에 대해 foreground 여부 · client 크기 · snapshot 가능 여부를
   * 조회 (WO-O4O-COMPUTER-USE-V0 §14·§23 `local.computer.inspect`).
   * read-only 다. 이미지 · 창 제목 · 다른 창 목록은 이 자격으로 얻을 수 없다(§10·§43).
   */
  READ_ONLY_LOCAL_COMPUTER_INSPECT: 'READ_ONLY_LOCAL_COMPUTER_INSPECT',
  /**
   * 등재 앱 창 **client 영역 안**에 한정된 상호작용 자격 (§15~§20·§23 `local.computer.interact`):
   * 왼쪽 단일 클릭 · 짧은 일반 텍스트 · ENTER/TAB/ESC. 한 요청당 1회.
   *
   * 로그인 대행 · 비밀번호 · OTP · 임의 hotkey · 드래그 · 우클릭 · 다른 창 · 바탕화면은
   * 이 자격으로 표현할 수 없다(§3·§5·§9·§22).
   */
  LOCAL_COMPUTER_INTERACT: 'LOCAL_COMPUTER_INTERACT',
  /**
   * 연결된 PC 의 로컬 SQLite **상태·allowlist 된 meta 조회** 자격
   * (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 `local.data.health`·`local.data.get_meta`).
   * read-only 다. 임의 row · imported 원자료 · local.db 경로는 이 자격으로 얻을 수 없다(§18·§19).
   */
  READ_ONLY_LOCAL_DATA: 'READ_ONLY_LOCAL_DATA',
  /**
   * 로컬 SQLite 의 **allowlist 된 setting 키**에 검증된 값을 쓰는 자격 (동 `local.data.set_setting`).
   * generic KV 쓰기가 아니다 — 키·값 모두 좁은 스키마를 통과해야 하고, 임의 SQL 은 표현 불가다(§10·§11·§16).
   */
  LOCAL_DATA_SETTING_WRITE: 'LOCAL_DATA_SETTING_WRITE',
} as const;

/**
 * ⚠️ 여기서 멈춘다 (§19·§22·§23·§24).
 *
 * `local.read` · `local.write` · `browser` · `desktop` capability 는 **정의하지 않는다.**
 * 위 두 개는 "연결됐는가" 와 "무슨 OS 인가" 뿐이고, 둘 다 파일·프로세스·화면에 닿지 않는다.
 * V0 가 증명하려는 것은 *능력의 범위* 가 아니라 *연결·인증·명령·허용목록·왕복* 이라는 배관이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-09-10 · WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 에서 **창 축 2개가 추가됐다**
 *
 * `READ_ONLY_LOCAL_APP_INSPECT` · `LOCAL_WINDOW_ACTIVATE`.
 * 위 문단의 "파일·프로세스·화면에 닿지 않는다" 는 여전히 사실이다 — 새 두 자격으로
 * 얻을 수 있는 것은 **등재 앱의 실행 여부·창 개수**와 **그 창을 앞으로 가져오는 것**뿐이고,
 * 파일 접근 · 임의 프로세스 실행/종료 · 키보드/마우스 · 화면 캡처는 구현 자체가 없다.
 * `local.read` · `local.write` · `browser` · `desktop` 은 **여전히 정의하지 않는다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-09-11 · WO-O4O-COMPUTER-USE-V0 정정 — 위 "키보드/마우스 · 화면 캡처는 구현 자체가
 * 없다" 는 **더 이상 사실이 아니다.**
 *
 * `READ_ONLY_LOCAL_COMPUTER_INSPECT` · `LOCAL_COMPUTER_INTERACT` 가 추가됐다. agent 에는
 * 등재 앱 창의 client 영역을 **메모리에서 캡처해 크기만 돌려주고 버리는** 검사기와, 그 창이
 * foreground 일 때만 **왼쪽 단일 클릭 · 500자 이하 텍스트 · ENTER/TAB/ESC** 를 넣는 입력기가
 * 생겼다. 이미지는 서버에 오지 않는다(§12 저장 0). 다른 창 · 바탕화면 · 임의 키 조합 ·
 * 로그인 폼은 여전히 표현 불가이며, `desktop`(전체 데스크톱 제어) capability 는 **정의하지
 * 않는다**(§7 "AI 가 Windows 전체 desktop 을 자유롭게 제어하면 안 된다").
 */

export type AiCapabilityKey = (typeof AiCapability)[keyof typeof AiCapability];

// ─── 서버가 확정한 인가 사실 ─────────────────────────────────────────────────

/**
 * capability 파생의 **유일한 입력**. 전부 서버가 세션에서 만든 값이다.
 * 클라이언트가 보낸 workScope 는 여기에 들어오지 않는다(§5·§16).
 */
export interface VerifiedToolContext {
  /** 인증된 사용자 id (세션 유래). */
  userId: string;
  /** route 에서 파생된 업무 축. */
  workspace: string;
  /** 서버가 정규화한 canonical service_memberships.service_key. */
  serviceKey?: string;
  /** `resolveWorkScopeStore()` 결과. store 축이 아니면 undefined. */
  storeStatus?: 'resolved' | 'none' | 'ambiguous';
  /**
   * 확정된 조직 id. **resolved 일 때만** 채워진다.
   * 이 값은 executor 내부에서만 쓰고 프롬프트·응답에 싣지 않는다.
   */
  organizationId?: string;
  /**
   * 이 사용자의 Local Work Agent 연결 상태. **서버가 DB 에서 확정한다**(§14).
   *
   * 클라이언트나 agent 가 보낸 값이 아니다. `store` 축에서 클라이언트 serviceKey 를
   * 서버가 재확정하는 것과 같은 규칙이다. 축이 아니면 undefined.
   */
  localAgentStatus?: 'connected' | 'offline' | 'none' | 'ambiguous';
  /** 확정된 단일 device id. **connected 일 때만** 채워진다(§34). */
  localDeviceId?: string;
}

/**
 * 인가 사실 → capability 투영.
 *
 * 규칙은 단순하다. 복잡해지면 그때가 "새 권한 체계" 가 되는 시점이다.
 *   - 인증됨                     → READ_ONLY_AI_CONTEXT
 *   - 매장이 **resolved**        → READ_ONLY_STORE_CONTEXT
 *     (`none` / `ambiguous` 는 부여하지 않는다 — ambiguous 에서 임의 매장을 고르지 않는
 *      직전 WO 계약을 그대로 승계한다.)
 */
export function deriveAiCapabilities(ctx: VerifiedToolContext): AiCapabilityKey[] {
  const caps: AiCapabilityKey[] = [];
  if (ctx.userId) caps.push(AiCapability.READ_ONLY_AI_CONTEXT);
  if (ctx.storeStatus === 'resolved' && ctx.organizationId) {
    caps.push(AiCapability.READ_ONLY_STORE_CONTEXT);
  }
  // 연결 상태 **조회** 자격은 인증만으로 성립한다. 그래야 "연결 안 됨" 이라는 정확한
  // 답을 돌려줄 수 있고, AI 가 없는 PC 데이터를 지어내지 않는다(§41).
  if (ctx.userId) caps.push(AiCapability.READ_ONLY_LOCAL_AGENT_STATUS);
  // PC 에 실제로 명령을 보내는 자격은 **connected + 단일 device 확정** 일 때만.
  // offline · none · ambiguous 는 부여하지 않는다 — 매장 ambiguous 를 다루는 방식과 같다.
  if (ctx.localAgentStatus === 'connected' && ctx.localDeviceId) {
    caps.push(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
    // 창 축도 같은 조건이다. 연결되지 않은 PC 의 창을 찾을 수도, 띄울 수도 없다.
    caps.push(AiCapability.READ_ONLY_LOCAL_APP_INSPECT);
    caps.push(AiCapability.LOCAL_WINDOW_ACTIVATE);
    // 브라우저 축도 같은 조건이다(BROWSER-CONTROL-V0 §43). 연결된 PC 가 있어야 열 수 있다.
    caps.push(AiCapability.READ_ONLY_LOCAL_BROWSER_INSPECT);
    caps.push(AiCapability.LOCAL_BROWSER_OPEN);
    // 화면 조작 축도 같은 조건이다(COMPUTER-USE-V0 §25). 연결된 단일 PC 가 확정돼야 한다.
    caps.push(AiCapability.READ_ONLY_LOCAL_COMPUTER_INSPECT);
    caps.push(AiCapability.LOCAL_COMPUTER_INTERACT);
    // 로컬 데이터 축도 같은 조건이다(LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §14). local.db 는 연결된
    // 그 PC 에 있으므로, 연결된 단일 device 가 확정돼야 상태·meta 조회와 setting 쓰기가 성립한다.
    caps.push(AiCapability.READ_ONLY_LOCAL_DATA);
    caps.push(AiCapability.LOCAL_DATA_SETTING_WRITE);
  }
  return caps;
}

// ─── Tool 정의 ───────────────────────────────────────────────────────────────

/**
 * 실행 위치.
 *
 * - `server` — API 서버 안에서 끝난다.
 * - `local`  — 사용자의 PC 에 있는 Local Work Agent 로 **왕복**한다
 *              (WO-O4O-LOCAL-WORK-AGENT-V0 에서 열렸다).
 * - `browser`— 아직 **닫혀 있다.** 등록된 tool 이 없고 아래 게이트도 통과시키지 않는다.
 *              브라우저 제어 · Computer Use 는 후속 WO 의 판단 대상이다(§24).
 */
export type ToolExecutionMode = 'server' | 'local' | 'browser';

/**
 * 실행이 허용된 mode. **registry 에 무엇이 등록돼 있든 이 집합이 최종 게이트다.**
 *
 * `browser` 가 빠져 있는 것이 핵심이다 — 누군가 실수로 browser tool 을 등록해도
 * eligibility 와 실행 판정 양쪽에서 탈락한다.
 */
const EXECUTABLE_MODES: readonly ToolExecutionMode[] = Object.freeze(['server', 'local']);

export interface AiToolDefinition {
  /** 도구 이름. `{domain}.{action}` — 기존 ACTION_KEYS 의 점 표기 관행을 따른다. */
  name: string;
  /** 모델·로그에 쓰이는 한 줄 설명. */
  description: string;
  /** 이 tool 을 쓰려면 **전부** 필요한 capability. */
  requiredCapabilities: AiCapabilityKey[];
  executionMode: ToolExecutionMode;
  /** read-only 가 아니면 아래 `effect` 를 반드시 선언해야 실행 게이트를 통과한다. */
  readOnly: boolean;
  /**
   * read-only 가 아닌 tool 이 **일으킬 수 있는 부작용의 종류**
   * (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §13·§18·§19).
   *
   * "readOnly 가 아니면 무엇이든 해도 된다" 가 되지 않도록, 허용 효과를 이름으로 한정한다.
   * 아래 `ALLOWED_TOOL_EFFECTS` 에 없는 값은 실행되지 않는다.
   */
  effect?: ToolEffect;
  /**
   * 받는 인자의 형상. 생략하면 **인자 없음**이다(V0 기본).
   * `appId` 는 `{ appId }` 하나만 허용하며, 값은 Windows App Registry 등재분이어야 한다(§9).
   */
  argumentSchema?: 'none' | 'appId' | 'siteId' | ComputerArgumentSchema | DataArgumentSchema;
}

/**
 * LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §6 인자 형상. 자유 args 채널이 아니다 — tool 별로 좁다.
 *   dataMetaKey → { key }           key 는 allowlist(local_meta) 등재분
 *   dataSetting → { key, value }    key 는 allowlist(settings) 등재분 · value 는 per-key 스키마
 * health 는 인자 없음('none')이라 여기 없다.
 */
export type DataArgumentSchema = 'dataMetaKey' | 'dataSetting';

/**
 * COMPUTER-USE-V0 §15~§20 인자 형상. 전부 `targetId`(= 등재 appId) 를 포함한다.
 *   computerTarget → { targetId }
 *   computerClick  → { targetId, x, y }        x·y 는 client 영역 정규화 0..1
 *   computerText   → { targetId, text }        1~500자, 제어문자 · credential · shell 문자열 거절
 *   computerKey    → { targetId, key }         ENTER | TAB | ESC
 */
export type ComputerArgumentSchema = 'computerTarget' | 'computerClick' | 'computerText' | 'computerKey';

/**
 * 부작용 종류.
 *
 * `FOREGROUND_ACTIVATION` = 이미 열려 있는 창을 앞으로 가져온다(최소화면 복원 포함).
 * 그 이상은 없다 — 프로그램 실행 · 종료 · 키보드 · 마우스 · 화면 캡처는 정의조차 하지 않는다.
 * 이름이 없으면 등록할 수도 없다(§25·§26·§27·§28).
 */
export type ToolEffect =
  | 'FOREGROUND_ACTIVATION'
  /**
   * 등재된 HTTPS 사이트 하나를 OS 기본 URL handler 로 연다 (BROWSER-CONTROL-V0 §25).
   * 브라우저가 꺼져 있으면 OS 가 기본 브라우저를 띄운다 — "임의 process launch" 가 아니라
   * 등재 URL open 이라는 좁은 효과다(§26). 열리는 주소는 agent 등재부 상수뿐이다.
   */
  | 'BROWSER_SITE_OPEN'
  /**
   * 등재 앱 창 client 영역 안에서의 **단일 상호작용** 한 번 (COMPUTER-USE-V0 §15~§22·§31):
   * 왼쪽 클릭 1회 · 짧은 텍스트 1건 · 허용키 1회 중 하나. 창이 foreground 가 아니면 agent 가
   * 실행 전에 멈춘다(§9). 파일 저장 · 전송 · 종료 같은 고위험 동작은 이 효과의 이름이 아니다(§39).
   */
  | 'COMPUTER_INTERACTION'
  /**
   * 로컬 SQLite 의 **allowlist 된 setting 키 하나**에 검증된 값을 쓴다
   * (LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §5·§10·§11·§16). generic KV 쓰기도, 임의 SQL 도,
   * imported 원자료 write 도 아니다 — 키·값 모두 좁은 스키마를 통과해야 하고 그 밖은 이름이 없다.
   */
  | 'LOCAL_DATA_WRITE';

/** 실행이 허용된 부작용. **registry 에 무엇이 적혀 있든 이 집합이 최종 게이트다.** */
const ALLOWED_TOOL_EFFECTS: readonly ToolEffect[] = Object.freeze([
  'FOREGROUND_ACTIVATION',
  'BROWSER_SITE_OPEN',
  'COMPUTER_INTERACTION',
  'LOCAL_DATA_WRITE',
]);

/** read-only 이거나, 허용된 effect 를 선언한 tool 만 실행 후보가 된다. */
function hasAllowedEffect(tool: AiToolDefinition): boolean {
  if (tool.readOnly) return true;
  return tool.effect !== undefined && ALLOWED_TOOL_EFFECTS.includes(tool.effect);
}

export const AI_TOOL_NAMES = {
  GET_WORK_SCOPE_CONTEXT: 'workscope.get_context',
  GET_STORE_CONTEXT: 'store.get_context',
  GET_LOCAL_AGENT_STATUS: 'local.get_agent_status',
  GET_LOCAL_SYSTEM_INFO: 'local.get_system_info',
  FIND_APPLICATION: 'local.find_application',
  ACTIVATE_WINDOW: 'local.activate_window',
  // WO-O4O-BROWSER-CONTROL-V0 §13·§14
  BROWSER_GET_SITE_STATUS: 'local.browser.get_site_status',
  BROWSER_OPEN_SITE: 'local.browser.open_site',
  // WO-O4O-COMPUTER-USE-V0 §24
  COMPUTER_INSPECT: 'local.computer.inspect',
  COMPUTER_CLICK: 'local.computer.click',
  COMPUTER_TYPE_TEXT: 'local.computer.type_text',
  COMPUTER_KEY: 'local.computer.key',
  // WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §5·§12
  DATA_LOCAL_HEALTH: 'local.data.health',
  DATA_GET_LOCAL_META: 'local.data.get_meta',
  DATA_SET_LOCAL_SETTING: 'local.data.set_setting',
} as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[keyof typeof AI_TOOL_NAMES];

/**
 * Tool Registry.
 *
 * 기본은 read-only 다. read-only 가 아닌 항목은 `ALLOWED_TOOL_EFFECTS` 에 있는
 * effect 를 반드시 선언해야 하며, V0 에서 그런 항목은 `local.activate_window` 하나뿐이다.
 *
 * local 두 개의 역할이 다르다는 점에 주의:
 *   - `local.get_agent_status` 는 **서버 DB 의 연결 상태만으로 답한다.** PC 로 명령이 가지 않는다.
 *     "연결됐나?" 를 묻자고 상대 PC 를 깨울 이유가 없고, 꺼져 있을 때 답할 수 있어야 한다.
 *   - `local.get_system_info` 만이 **실제 왕복**이다. V0 가 검증하려는 배관 전체
 *     (명령 발행 → 큐 → agent allowlist → 실행 → 결과 회수)를 이 하나가 통과한다.
 */
export const AI_TOOL_REGISTRY: readonly AiToolDefinition[] = Object.freeze([
  {
    name: AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT,
    description: '현재 사용자의 업무 공간·서비스·매장 확정 여부를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_AI_CONTEXT],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_STORE_CONTEXT,
    description: '현재 사용자의 확정된 매장에서 사용 가능한 기능 목록을 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_STORE_CONTEXT],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
    description: '이 사용자의 PC 에 설치된 Local Work Agent 의 연결 상태를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_AGENT_STATUS],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    description: '연결된 PC 의 운영체제 이름·버전·아키텍처 등 기본 정보를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO],
    executionMode: 'local',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.FIND_APPLICATION,
    description: '등재된 Windows 프로그램이 지금 실행 중인지 확인한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_APP_INSPECT],
    executionMode: 'local',
    readOnly: true,
    argumentSchema: 'appId',
  },
  {
    name: AI_TOOL_NAMES.ACTIVATE_WINDOW,
    description: '등재된 Windows 프로그램의 창을 앞으로 가져온다.',
    requiredCapabilities: [AiCapability.LOCAL_WINDOW_ACTIVATE],
    executionMode: 'local',
    // V0 registry 에서 **유일하게** read-only 가 아닌 항목이다.
    readOnly: false,
    effect: 'FOREGROUND_ACTIVATION',
    argumentSchema: 'appId',
  },
  {
    name: AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS,
    description: '등재된 사이트 기준으로 연결된 PC 에 브라우저가 떠 있는지 확인한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_BROWSER_INSPECT],
    executionMode: 'local',
    readOnly: true,
    argumentSchema: 'siteId',
  },
  {
    name: AI_TOOL_NAMES.BROWSER_OPEN_SITE,
    description: '등재된 사이트를 연결된 PC 의 기본 브라우저로 연다. 로그인은 사용자가 직접 한다.',
    requiredCapabilities: [AiCapability.LOCAL_BROWSER_OPEN],
    // local 이다 — 'browser' mode 는 향후 브라우저 안(extension/CDP) 실행기의 자리이며
    // EXECUTABLE_MODES 에 없다. 이 tool 은 Local Agent 가 OS handler 를 부르는 것이므로 local 이 맞다.
    executionMode: 'local',
    readOnly: false,
    effect: 'BROWSER_SITE_OPEN',
    argumentSchema: 'siteId',
  },
  // ── Computer Use V0 (§14~§20·§24) — 대상은 등재 appId 하나. HWND · 창 제목은 인자에 없다.
  {
    name: AI_TOOL_NAMES.COMPUTER_INSPECT,
    description: '등재된 프로그램 창이 앞에 있는지 · client 크기 · 화면 확인 가능 여부를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_COMPUTER_INSPECT],
    executionMode: 'local',
    readOnly: true,
    argumentSchema: 'computerTarget',
  },
  {
    name: AI_TOOL_NAMES.COMPUTER_CLICK,
    description: '등재된 프로그램 창 client 영역 안 한 점을 왼쪽 클릭 한 번 한다.',
    requiredCapabilities: [AiCapability.LOCAL_COMPUTER_INTERACT],
    executionMode: 'local',
    readOnly: false,
    effect: 'COMPUTER_INTERACTION',
    argumentSchema: 'computerClick',
  },
  {
    name: AI_TOOL_NAMES.COMPUTER_TYPE_TEXT,
    description: '등재된 프로그램 창에 짧은 일반 텍스트를 입력한다. 로그인·비밀번호에는 쓰지 않는다.',
    requiredCapabilities: [AiCapability.LOCAL_COMPUTER_INTERACT],
    executionMode: 'local',
    readOnly: false,
    effect: 'COMPUTER_INTERACTION',
    argumentSchema: 'computerText',
  },
  {
    name: AI_TOOL_NAMES.COMPUTER_KEY,
    description: '등재된 프로그램 창에 ENTER · TAB · ESC 중 하나를 한 번 누른다.',
    requiredCapabilities: [AiCapability.LOCAL_COMPUTER_INTERACT],
    executionMode: 'local',
    readOnly: false,
    effect: 'COMPUTER_INTERACTION',
    argumentSchema: 'computerKey',
  },
  // ── Local Data V0 (LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §5·§6·§12) — 매장 PC 로컬 SQLite.
  //    임의 SQL · 임의 row · imported 원자료 · local.db 경로를 얻는 tool 은 없다. tool 별 좁은 인자뿐이다.
  {
    name: AI_TOOL_NAMES.DATA_LOCAL_HEALTH,
    description: '연결된 PC 의 로컬 데이터 저장소가 정상인지 · 스키마 버전을 확인한다. DB 경로는 돌려주지 않는다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_DATA],
    executionMode: 'local',
    readOnly: true,
    // 인자 없음.
  },
  {
    name: AI_TOOL_NAMES.DATA_GET_LOCAL_META,
    description: '연결된 PC 의 로컬 데이터 저장소에서 허용된 meta 키 하나의 값을 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_DATA],
    executionMode: 'local',
    readOnly: true,
    argumentSchema: 'dataMetaKey',
  },
  {
    name: AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING,
    description: '연결된 PC 의 로컬 데이터 저장소에서 허용된 설정 키 하나에 검증된 값을 저장한다.',
    requiredCapabilities: [AiCapability.LOCAL_DATA_SETTING_WRITE],
    executionMode: 'local',
    readOnly: false,
    effect: 'LOCAL_DATA_WRITE',
    argumentSchema: 'dataSetting',
  },
]);

export function findToolDefinition(name: string): AiToolDefinition | undefined {
  return AI_TOOL_REGISTRY.find((t) => t.name === name);
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

/**
 * 이 컨텍스트에서 자격을 통과하는 tool 목록.
 *
 * **모델에게는 이 목록만 보여준다.** 자격 없는 tool 은 애초에 노출하지 않는다.
 * 다만 노출 차단만으로 끝내지 않는다 — 실행 직전에 `assertToolAllowed()` 로 다시 막는다
 * (§13: 가능하면 둘 다 적용).
 */
export function resolveAvailableTools(ctx: VerifiedToolContext): AiToolDefinition[] {
  const caps = new Set<string>(deriveAiCapabilities(ctx));
  return AI_TOOL_REGISTRY.filter((tool) => {
    // 안전장치: 등록부에 실행 불가 mode 나 쓰기 도구가 섞여 들어와도 후보가 되지 않는다.
    if (!EXECUTABLE_MODES.includes(tool.executionMode) || !hasAllowedEffect(tool)) return false;
    return tool.requiredCapabilities.every((c) => caps.has(c));
  });
}

export type ToolDenyReason =
  | 'UNKNOWN_TOOL'
  | 'CAPABILITY_MISSING'
  | 'NOT_READ_ONLY'
  | 'EXECUTION_MODE_NOT_ALLOWED'
  | 'INVALID_ARGUMENTS';

/**
 * 판정 결과.
 *
 * discriminated union 이 아니라 **평평한 형상**이다. api-server 는 `strictNullChecks: false`
 * 라 union 판별 narrowing 이 동작하지 않는다(호출부에서 `.reason` 접근이 컴파일 오류가 된다).
 * 저장소 설정에 맞춰 optional field 로 둔다.
 */
export interface ToolAuthorization {
  allowed: boolean;
  /** allowed 일 때만 채워진다. */
  tool?: AiToolDefinition;
  /** allowed 가 false 일 때만 채워진다. */
  reason?: ToolDenyReason;
}

/**
 * 실행 직전 최종 판정 (§14).
 *
 * 모델이 이름을 만들어냈다는 이유로 실행하지 않는다. 등록부에 없으면 `UNKNOWN_TOOL`,
 * capability 가 모자라면 `CAPABILITY_MISSING` 이다.
 */
export function assertToolAllowed(name: string, ctx: VerifiedToolContext): ToolAuthorization {
  const tool = findToolDefinition(name);
  if (!tool) return { allowed: false, reason: 'UNKNOWN_TOOL' };
  // read-only 가 아니면서 허용 effect 도 선언하지 않은 tool 은 여기서 끝난다.
  if (!hasAllowedEffect(tool)) return { allowed: false, reason: 'NOT_READ_ONLY' };
  if (!EXECUTABLE_MODES.includes(tool.executionMode)) {
    return { allowed: false, reason: 'EXECUTION_MODE_NOT_ALLOWED' };
  }
  const caps = new Set<string>(deriveAiCapabilities(ctx));
  const ok = tool.requiredCapabilities.every((c) => caps.has(c));
  return ok ? { allowed: true, tool } : { allowed: false, reason: 'CAPABILITY_MISSING' };
}

// ─── Arguments ───────────────────────────────────────────────────────────────

/**
 * 기본은 **인자 없음**이다(§15).
 *
 * 의도적이다. `get_store_context({ storeId })` 처럼 식별자를 모델/클라이언트가 넘기게 하면
 * 그 값을 신뢰하는 순간 권한 우회가 된다. 대신 서버가 세션에서 매장을 확정한다.
 * 따라서 기본 스키마에서 유효한 인자는 **빈 객체뿐**이며, 그 외는 전부 거부한다.
 *
 * 예외는 창 축 tool 하나뿐이다(WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §9).
 * 그 tool 도 자유 식별자를 받는 것이 아니라 **등재부에 있는 appId 만** 받는다 —
 * 즉 모델이 넘긴 값을 신뢰하는 것이 아니라 서버가 가진 목록과 대조해 통과시킨다.
 */
export function validateToolArguments(
  args: unknown,
  tool?: AiToolDefinition,
): { ok: boolean; reason?: ToolDenyReason } {
  const schema = tool?.argumentSchema ?? 'none';

  if (schema === 'appId') {
    // 창 축 tool 은 **정확히 `{ appId }` 하나**만 받는다 (§9).
    // 값은 모델이 만든 문자열이므로 그대로 믿지 않고 등재부와 대조한다.
    // processName · exe 경로 · 창 핸들을 넘길 통로는 형상 자체에 없다.
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const keys = Object.keys(args as Record<string, unknown>);
    if (keys.length !== 1 || keys[0] !== 'appId') {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const appId = (args as Record<string, unknown>).appId;
    if (typeof appId !== 'string' || !isRegisteredWindowsApp(appId)) {
      // 등재되지 않은 프로그램은 여기서 끝난다 — 명령이 발행되지 않는다(§10).
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    return { ok: true };
  }

  if (schema === 'siteId') {
    // 브라우저 축 tool 은 **정확히 `{ siteId }` 하나**만 받는다 (BROWSER-CONTROL-V0 §10·§15).
    // URL 을 넘길 칸이 형상에 없다 — `{ url }` 은 키 개수/이름 검사에서 끝난다.
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const keys = Object.keys(args as Record<string, unknown>);
    if (keys.length !== 1 || keys[0] !== 'siteId') {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const siteId = (args as Record<string, unknown>).siteId;
    if (typeof siteId !== 'string' || !isRegisteredBrowserSite(siteId)) {
      // 등재되지 않은 사이트는 여기서 끝난다 — 명령이 발행되지 않는다(§11).
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    return { ok: true };
  }

  if (
    schema === 'computerTarget' ||
    schema === 'computerClick' ||
    schema === 'computerText' ||
    schema === 'computerKey'
  ) {
    // 화면 조작 tool (COMPUTER-USE-V0 §25): AI 가 만든 좌표·텍스트·키를 **그대로 믿지 않는다**.
    // targetId 는 등재 appId 여야 하고, 나머지 키는 형상별로 정확히 그 키만 허용된다.
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const { targetId, ...rest } = args as Record<string, unknown>;
    if (typeof targetId !== 'string' || !isRegisteredWindowsApp(targetId)) {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const restOk =
      schema === 'computerTarget'
        ? Object.keys(rest).length === 0
        : schema === 'computerClick'
          ? validateClickArgs(rest).ok
          : schema === 'computerText'
            ? validateTextArgs(rest).ok
            : validateKeyArgs(rest).ok;
    return restOk ? { ok: true } : { ok: false, reason: 'INVALID_ARGUMENTS' };
  }

  if (schema === 'dataMetaKey') {
    // 로컬 데이터 meta 조회(LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §6): **정확히 `{ key }` 하나**.
    // key 는 서버 protocol 의 meta allowlist 등재분이어야 한다 — 임의 key 를 넘길 통로가 없다.
    // 검증 논리는 서버 단일 출처(local-agent-protocol)를 재사용한다.
    return validateDataGetMetaArgs(args).ok ? { ok: true } : { ok: false, reason: 'INVALID_ARGUMENTS' };
  }

  if (schema === 'dataSetting') {
    // 로컬 데이터 setting 쓰기(§6·§10·§11): **정확히 `{ key, value }`**. key 는 setting allowlist
    // 등재분, value 는 per-key 스키마를 통과해야 한다. generic KV 도 임의 SQL 도 표현 불가다.
    return validateDataSetSettingArgs(args).ok ? { ok: true } : { ok: false, reason: 'INVALID_ARGUMENTS' };
  }

  if (args === undefined || args === null) return { ok: true };
  if (typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, reason: 'INVALID_ARGUMENTS' };
  }
  if (Object.keys(args as Record<string, unknown>).length > 0) {
    // storeId·organizationId 같은 것을 넘기려는 시도를 여기서 끊는다.
    return { ok: false, reason: 'INVALID_ARGUMENTS' };
  }
  return { ok: true };
}

// ─── 결과 ────────────────────────────────────────────────────────────────────

/**
 * provider-neutral 결과 형상 (§17). provider 별 tool schema 로 변환하는 것은 adapter 몫이다.
 * 위 `ToolAuthorization` 과 같은 이유로 union 이 아닌 평평한 형상이다.
 */
export interface ToolResult {
  ok: boolean;
  tool: string;
  /** ok 일 때만 채워진다. 민감 필드는 executor 단계에서 이미 제거된 상태다. */
  data?: Record<string, unknown>;
  /** ok 가 false 일 때만 채워진다. */
  reason?: ToolDenyReason;
}
