/**
 * AI Common Core Types
 *
 * 핵심 철학:
 * - 외부적으로는 "대화 중심" (Chat-centered UX)
 * - 내부적으로는 "버튼/프롬프트 중심" (Structured Control)
 */

// 서비스 식별자
export type ServiceId =
  | 'glucoseview'      // 약국 CGM 분석
  | 'glycopharm'       // 약사 대시보드
  | 'yaksa'            // 약사 서비스
  | 'cosmetics'        // 화장품
  | 'dropshipping';    // 드랍쉬핑

// 프롬프트 카테고리
export type PromptCategory =
  | 'dashboard'        // 대시보드 요약
  | 'analysis'         // 데이터 분석
  | 'recommendation'   // 추천/제안
  | 'report'           // 보고서 생성
  | 'consultation';    // 상담 지원

// 프롬프트 정의
export interface PromptDefinition {
  id: string;                    // 고유 식별자 (예: 'glucoseview.dashboard.summary')
  serviceId: ServiceId;          // 소속 서비스
  category: PromptCategory;      // 카테고리
  name: string;                  // 표시 이름 (예: '오늘의 요약')
  description: string;           // 설명
  buttonLabel: string;           // 버튼에 표시될 텍스트
  suggestedQuestion: string;     // 대화형으로 표시될 질문 형태
  systemPrompt: string;          // AI 시스템 프롬프트
  userPromptTemplate: string;    // 사용자 프롬프트 템플릿 (변수 포함 가능)
  requiredContext?: string[];    // 필요한 컨텍스트 데이터 키
  icon?: string;                 // 아이콘 (이모지 또는 아이콘 이름)
  order?: number;                // 표시 순서
  isDefault?: boolean;           // 기본 프롬프트 여부
}

// 프롬프트 실행 컨텍스트
export interface PromptContext {
  serviceId: ServiceId;
  userId?: string;
  userName?: string;
  currentDate: string;
  additionalData?: Record<string, unknown>;
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  promptId?: string;             // 어떤 프롬프트로 생성됐는지
  isLoading?: boolean;
}

// 프롬프트 레지스트리 인터페이스
export interface IPromptRegistry {
  getPrompts(serviceId: ServiceId): PromptDefinition[];
  getPromptsByCategory(serviceId: ServiceId, category: PromptCategory): PromptDefinition[];
  getPrompt(promptId: string): PromptDefinition | undefined;
  getDefaultPrompts(serviceId: ServiceId): PromptDefinition[];
  registerPrompt(prompt: PromptDefinition): void;
  buildUserPrompt(promptId: string, context: PromptContext): string;
}

// AI 서비스 설정
export interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// 채팅 훅 반환 타입
export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  executePrompt: (promptId: string, context?: Partial<PromptContext>) => Promise<void>;
  clearMessages: () => void;
  suggestedPrompts: PromptDefinition[];
}
