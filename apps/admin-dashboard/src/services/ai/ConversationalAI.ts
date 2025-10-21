/**
 * Conversational AI Service
 *
 * AI가 편집기 상태를 읽고 블록을 조작하는 핵심 서비스
 * Phase 4: Context-Aware Conversational Editor
 */

import { Block } from '@/types/post.types';
import { simpleAIGenerator, AIConfig } from './SimpleAIGenerator';

/**
 * 편집기 컨텍스트 (AI가 "읽을" 데이터)
 */
export interface EditorContext {
  selectedBlockId: string | null;
  selectedBlock: Block | null;
  allBlocks: Block[];
  documentTitle: string;
  blockCount: number;
}

/**
 * AI 액션 타입
 */
export type AIActionType =
  | 'insert'           // 블록 삽입
  | 'update'           // 블록 업데이트
  | 'delete'           // 블록 삭제
  | 'replace'          // 블록 교체
  | 'move'             // 블록 이동
  | 'duplicate'        // 블록 복제
  | 'transform';       // 블록 타입 변경

/**
 * AI 액션 (AI가 편집기에 내리는 "명령")
 */
export interface AIAction {
  action: AIActionType;
  targetBlockId?: string;      // 대상 블록 ID
  position?: 'before' | 'after' | 'replace' | number;
  blockType?: string;           // 생성할 블록 타입
  content?: any;                // 블록 콘텐츠
  attributes?: Record<string, any>; // 블록 속성
  blocks?: Block[];             // 여러 블록 (일괄 삽입 시)
}

/**
 * AI 응답
 */
export interface AIResponse {
  success: boolean;
  message?: string;
  actions?: AIAction[];
  error?: string;
}

/**
 * Conversational AI 클래스
 */
export class ConversationalAI {
  private readonly API_BASE: string;

  constructor() {
    this.API_BASE = this.getApiBaseUrl();
  }

  /**
   * Get API base URL
   */
  private getApiBaseUrl(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL as string;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'admin.neture.co.kr') {
        return 'https://api.neture.co.kr';
      }
    }

    return 'http://localhost:3002';
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        return value;
      }
    }
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  }

  /**
   * 대화 - AI가 편집기를 조작
   *
   * @param userInput - 사용자 명령 (예: "제목 추가해줘", "이미지 블록 삭제해줘")
   * @param context - 현재 편집기 상태
   * @param config - AI 설정
   */
  async chat(
    userInput: string,
    context: EditorContext,
    config: AIConfig
  ): Promise<AIResponse> {
    try {
      const token = this.getAuthToken();

      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      // 시스템 프롬프트: AI에게 편집기 API 설명
      const systemPrompt = this.buildSystemPrompt(context);

      // 사용자 프롬프트: 현재 상태 + 명령
      const userPrompt = this.buildUserPrompt(userInput, context);

      const url = `${this.API_BASE}/api/ai/generate`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          systemPrompt,
          userPrompt,
          temperature: 0.3,  // 낮은 temperature (정확성 우선)
          maxTokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 응답 실패: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI 응답 오류');
      }

      // AI 응답 파싱
      const actions = this.parseAIResponse(data.result);

      return {
        success: true,
        actions,
        message: this.generateFeedbackMessage(actions),
      };

    } catch (error: any) {
      console.error('Conversational AI 오류:', error);
      return {
        success: false,
        error: error.message || 'AI 처리 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 시스템 프롬프트 구성 - AI에게 편집기 API 설명
   */
  private buildSystemPrompt(context: EditorContext): string {
    return `
너는 블록 편집기를 제어하는 AI 어시스턴트입니다.

**현재 편집기 상태:**
- 전체 블록 수: ${context.blockCount}개
- 선택된 블록 ID: ${context.selectedBlockId || '없음'}
- 선택된 블록 타입: ${context.selectedBlock?.type || '없음'}
- 문서 제목: ${context.documentTitle || '(제목 없음)'}

**사용 가능한 블록 타입:**
- o4o/heading (제목)
- o4o/paragraph (단락)
- o4o/image (이미지)
- o4o/button (버튼)
- o4o/list (리스트)
- o4o/quote (인용구)
- o4o/code (코드)
- o4o/columns (컬럼 레이아웃)
- o4o/universal-form (폼 - Post/CPT)
- 더 많은 블록들...

**액션 형식 (JSON):**
응답은 반드시 다음 JSON 형식이어야 합니다:

{
  "actions": [
    {
      "action": "insert",
      "position": "after",
      "targetBlockId": "block-123",
      "blockType": "o4o/heading",
      "content": { "text": "새 제목", "level": 2 },
      "attributes": {}
    }
  ]
}

**action 타입:**
- insert: 새 블록 삽입 (position: before/after 필수)
- update: 기존 블록 수정 (targetBlockId 필수)
- delete: 블록 삭제 (targetBlockId 필수)
- replace: 블록 교체 (targetBlockId 필수, blocks 필수)
- move: 블록 이동 (targetBlockId 필수, position: number)

**중요 규칙:**
1. 사용자가 "이거" "저거"라고 하면 selectedBlockId 사용
2. "새로 추가"는 selectedBlockId 뒤에 insert
3. "맨 위에"는 position: 0
4. "맨 아래"는 position: ${context.blockCount}
5. 항상 JSON으로만 응답하세요!
`;
  }

  /**
   * 사용자 프롬프트 구성
   */
  private buildUserPrompt(userInput: string, context: EditorContext): string {
    let prompt = `사용자 명령: "${userInput}"\n\n`;

    // 선택된 블록 정보 추가
    if (context.selectedBlock) {
      prompt += `선택된 블록:\n`;
      prompt += `- ID: ${context.selectedBlock.id}\n`;
      prompt += `- 타입: ${context.selectedBlock.type}\n`;
      prompt += `- 내용: ${JSON.stringify(context.selectedBlock.content).substring(0, 100)}\n\n`;
    }

    // 전체 블록 목록 (간략히)
    if (context.allBlocks.length > 0) {
      prompt += `전체 블록 목록:\n`;
      context.allBlocks.slice(0, 10).forEach((block, idx) => {
        prompt += `${idx + 1}. [${block.id}] ${block.type}\n`;
      });
      if (context.allBlocks.length > 10) {
        prompt += `... 외 ${context.allBlocks.length - 10}개\n`;
      }
    }

    prompt += `\n위 명령을 실행할 JSON 액션을 생성하세요.`;

    return prompt;
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(result: any): AIAction[] {
    try {
      // AI가 텍스트로 응답한 경우 JSON 추출
      let parsed: any;

      if (typeof result === 'string') {
        // JSON 블록 추출 (```json ... ``` 또는 그냥 {...})
        const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) ||
                         result.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('JSON 형식을 찾을 수 없습니다');
        }
      } else {
        parsed = result;
      }

      // blocks 배열인 경우 (SimpleAIGenerator 응답)
      if (Array.isArray(parsed.blocks)) {
        return [{
          action: 'replace',
          blocks: parsed.blocks,
        }];
      }

      // actions 배열인 경우 (Conversational AI 응답)
      if (Array.isArray(parsed.actions)) {
        return parsed.actions;
      }

      throw new Error('유효하지 않은 응답 형식');

    } catch (error: any) {
      console.error('AI 응답 파싱 실패:', error);
      return [];
    }
  }

  /**
   * 사용자 피드백 메시지 생성
   */
  private generateFeedbackMessage(actions: AIAction[]): string {
    if (actions.length === 0) {
      return '실행할 액션이 없습니다.';
    }

    const actionDescriptions: string[] = actions.map(action => {
      switch (action.action) {
        case 'insert':
          return `${action.blockType} 블록 추가`;
        case 'update':
          return `블록 업데이트`;
        case 'delete':
          return `블록 삭제`;
        case 'replace':
          return `${action.blocks?.length || 0}개 블록으로 교체`;
        case 'move':
          return `블록 이동`;
        case 'duplicate':
          return `블록 복제`;
        case 'transform':
          return `블록 타입 변경`;
        default:
          return '액션 실행';
      }
    });

    return actionDescriptions.join(', ');
  }
}

// 싱글톤 인스턴스
export const conversationalAI = new ConversationalAI();
