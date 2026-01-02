import type {
  ChatMessage,
  PromptContext,
  AIServiceConfig,
} from '../types';
import { promptRegistry } from './PromptRegistry';

/**
 * AI Service
 *
 * OpenAI API를 통한 AI 대화 처리
 * - 프롬프트 레지스트리와 연동
 * - 스트리밍 응답 지원
 */
export class AIService {
  private config: AIServiceConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      model: 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.7,
      ...config,
    };
  }

  /**
   * API 키 설정
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * 프롬프트 ID로 대화 시작
   */
  async executePrompt(
    promptId: string,
    context: PromptContext
  ): Promise<string> {
    const systemPrompt = promptRegistry.getSystemPrompt(promptId);
    const userPrompt = promptRegistry.buildUserPrompt(promptId, context);

    return this.sendMessage(userPrompt, systemPrompt);
  }

  /**
   * 일반 메시지 전송
   */
  async sendMessage(
    userMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    if (!this.config.apiKey) {
      // API 키가 없으면 데모 응답
      return this.getDemoResponse(userMessage);
    }

    try {
      const messages = this.buildMessages(userMessage, systemPrompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || '';

      // 대화 기록에 추가
      this.addToHistory('user', userMessage);
      this.addToHistory('assistant', assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  /**
   * 스트리밍 메시지 전송
   */
  async *sendMessageStream(
    userMessage: string,
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.config.apiKey) {
      // API 키가 없으면 데모 응답을 청크로
      const demoResponse = this.getDemoResponse(userMessage);
      for (const char of demoResponse) {
        yield char;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return;
    }

    try {
      const messages = this.buildMessages(userMessage, systemPrompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      if (!reader) {
        throw new Error('No response body');
      }

      this.addToHistory('user', userMessage);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              fullMessage += content;
              yield content;
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }

      this.addToHistory('assistant', fullMessage);
    } catch (error) {
      console.error('AI Service Stream Error:', error);
      throw error;
    }
  }

  /**
   * 대화 기록 초기화
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 대화 기록 조회
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  private buildMessages(
    userMessage: string,
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // 이전 대화 기록 추가 (최근 10개만)
    const recentHistory = this.conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      messages.push({ role: msg.role, content: msg.content });
    });

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    });

    // 최대 50개 유지
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }

  private getDemoResponse(userMessage: string): string {
    // 데모 모드 응답 (API 키 없을 때)
    const responses = [
      `안녕하세요! "${userMessage}"에 대해 답변드립니다.\n\n현재 데모 모드로 실행 중입니다. 실제 AI 응답을 받으려면 OpenAI API 키를 설정해주세요.\n\n설정 → AI 설정에서 API 키를 입력할 수 있습니다.`,
      `좋은 질문입니다! 이 기능은 곧 활성화될 예정입니다.\n\nGlucoseView AI 어시스턴트는 다음을 도와드릴 수 있습니다:\n- 환자 혈당 데이터 분석\n- 패턴 인식 및 인사이트 제공\n- 상담 포인트 제안`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// 기본 인스턴스 export
export const aiService = new AIService();

export default AIService;
