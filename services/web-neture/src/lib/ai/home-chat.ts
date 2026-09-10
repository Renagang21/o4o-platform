/**
 * O4O Home AI Chat — client
 *
 * WO-O4O-COMMON-HOME-AI-INPUT-V0
 *
 * 중앙 입력창 → `POST /api/ai/home-chat` → 텍스트 응답.
 *
 * 계약:
 *   - 대화를 저장하지 않는다. 호출부의 React state 로만 유지한다(§9).
 *   - WorkScope 는 **요청 컨텍스트**로만 보낸다. 서버가 membership·store 를
 *     다시 확정하므로 여기서 보낸 organizationId/storeId 는 권한 근거가 되지 않는다(§11).
 *   - 타입을 다시 만들지 않고 기존 WorkScope 계약을 그대로 재사용한다(§10).
 */

import { api, API_BASE_URL } from '../apiClient';
import type { WorkScope } from '../work-scope';

/**
 * 입력 상한. 서버 `HOME_CHAT_MAX_MESSAGE_LENGTH` 와 같은 값이어야 한다
 * (서버가 최종 판정하며, 여기 값은 입력 단계 편의를 위한 것이다).
 */
export const HOME_CHAT_MAX_MESSAGE_LENGTH = 2000;

/** 서버로 보내는 scope 힌트. WorkScope 에서 필요한 축만 뽑는다. */
export interface HomeChatScopePayload {
  serviceKey?: string;
  workspace: string;
  role?: string;
  capabilities: string[];
  executionMode: string;
  status: string;
}

export interface HomeChatResult {
  message: string;
  scope: {
    workspace: string;
    serviceKey: string | null;
    storeStatus: 'resolved' | 'none' | 'ambiguous' | null;
  };
  /**
   * WO-O4O-BROWSER-CONTROL-V0 §19·§41: 이번 응답에서 등재 사이트가 **실제로 열렸을 때만** 온다.
   * UI 는 이 값이 있을 때 [로그인 완료] 버튼을 보여준다. URL·browserType 은 오지 않는다.
   */
  browserSiteOpened?: { siteId: string; displayName: string } | null;
}

/**
 * WorkScope → 요청 payload.
 *
 * `organizationId` / `storeId` 는 **의도적으로 보내지 않는다.** 서버가 세션에서
 * 다시 확정하므로 보낼 이유가 없고, 보내면 "클라이언트가 scope 를 주장한다"는
 * 잘못된 계약이 된다(§11). 서버도 이 두 필드를 읽지 않는다.
 */
export function toHomeChatScope(workScope: WorkScope): HomeChatScopePayload {
  return {
    serviceKey: workScope.serviceKey,
    workspace: workScope.workspace,
    role: workScope.role,
    capabilities: workScope.capabilities,
    executionMode: workScope.executionMode,
    status: workScope.status,
  };
}

export class HomeChatError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HomeChatError';
  }
}

/**
 * Home AI 질의.
 *
 * 서버는 오류 상세(provider·model·key)를 싣지 않으므로 여기서도 그대로 노출한다.
 * 네트워크 실패 등 응답이 없는 경우만 클라이언트 기본 문구를 쓴다.
 */
export async function sendHomeChat(
  message: string,
  workScope: WorkScope,
): Promise<HomeChatResult> {
  try {
    // AI 라우터는 `/api/ai` 에 마운트돼 있어 apiClient 의 `/api/v1` base 를 벗어난다.
    // 기존 AI 호출부(AiAdminDashboardPage 등)와 동일하게 절대 URL 을 쓴다.
    const res = await api.post(`${API_BASE_URL}/api/ai/home-chat`, {
      message,
      workScope: toHomeChatScope(workScope),
    });
    const data = res?.data?.data as HomeChatResult | undefined;
    if (!data || typeof data.message !== 'string') {
      throw new HomeChatError('응답을 생성하지 못했습니다. 다시 시도해 주세요.', 'AI_ERROR');
    }
    return data;
  } catch (err) {
    if (err instanceof HomeChatError) throw err;
    const resp = (err as { response?: { status?: number; data?: { error?: string; code?: string } } }).response;
    if (resp) {
      throw new HomeChatError(
        resp.data?.error || '응답을 생성하지 못했습니다. 다시 시도해 주세요.',
        resp.data?.code || 'AI_ERROR',
        resp.status,
      );
    }
    throw new HomeChatError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
}
