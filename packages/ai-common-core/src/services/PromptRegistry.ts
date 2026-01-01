import type {
  PromptDefinition,
  PromptContext,
  PromptCategory,
  ServiceId,
  IPromptRegistry,
} from '../types';

/**
 * Prompt Registry
 *
 * 서비스별 프롬프트를 관리하는 중앙 레지스트리
 * - 내부적으로는 구조화된 프롬프트 관리
 * - 외부적으로는 "대화형 질문 제안" 형태로 제공
 */
class PromptRegistry implements IPromptRegistry {
  private prompts: Map<string, PromptDefinition> = new Map();
  private promptsByService: Map<ServiceId, PromptDefinition[]> = new Map();

  /**
   * 프롬프트 등록
   */
  registerPrompt(prompt: PromptDefinition): void {
    this.prompts.set(prompt.id, prompt);

    const servicePrompts = this.promptsByService.get(prompt.serviceId) || [];
    const existingIndex = servicePrompts.findIndex((p) => p.id === prompt.id);

    if (existingIndex >= 0) {
      servicePrompts[existingIndex] = prompt;
    } else {
      servicePrompts.push(prompt);
    }

    // 순서대로 정렬
    servicePrompts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    this.promptsByService.set(prompt.serviceId, servicePrompts);
  }

  /**
   * 여러 프롬프트 일괄 등록
   */
  registerPrompts(prompts: PromptDefinition[]): void {
    prompts.forEach((p) => this.registerPrompt(p));
  }

  /**
   * 서비스별 전체 프롬프트 조회
   */
  getPrompts(serviceId: ServiceId): PromptDefinition[] {
    return this.promptsByService.get(serviceId) || [];
  }

  /**
   * 서비스+카테고리별 프롬프트 조회
   */
  getPromptsByCategory(
    serviceId: ServiceId,
    category: PromptCategory
  ): PromptDefinition[] {
    return this.getPrompts(serviceId).filter((p) => p.category === category);
  }

  /**
   * ID로 프롬프트 조회
   */
  getPrompt(promptId: string): PromptDefinition | undefined {
    return this.prompts.get(promptId);
  }

  /**
   * 서비스 기본 프롬프트 조회 (처음 보여줄 제안들)
   */
  getDefaultPrompts(serviceId: ServiceId): PromptDefinition[] {
    return this.getPrompts(serviceId).filter((p) => p.isDefault);
  }

  /**
   * 사용자 프롬프트 빌드 (템플릿 변수 치환)
   */
  buildUserPrompt(promptId: string, context: PromptContext): string {
    const prompt = this.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    let userPrompt = prompt.userPromptTemplate;

    // 기본 변수 치환
    userPrompt = userPrompt.replace(/\{\{userName\}\}/g, context.userName || '사용자');
    userPrompt = userPrompt.replace(/\{\{currentDate\}\}/g, context.currentDate);
    userPrompt = userPrompt.replace(/\{\{serviceId\}\}/g, context.serviceId);

    // 추가 데이터 변수 치환
    if (context.additionalData) {
      Object.entries(context.additionalData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        userPrompt = userPrompt.replace(regex, String(value));
      });
    }

    return userPrompt;
  }

  /**
   * 시스템 프롬프트 가져오기
   */
  getSystemPrompt(promptId: string): string {
    const prompt = this.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }
    return prompt.systemPrompt;
  }

  /**
   * 등록된 모든 서비스 ID 조회
   */
  getRegisteredServices(): ServiceId[] {
    return Array.from(this.promptsByService.keys());
  }

  /**
   * 레지스트리 초기화
   */
  clear(): void {
    this.prompts.clear();
    this.promptsByService.clear();
  }
}

// 싱글톤 인스턴스
export const promptRegistry = new PromptRegistry();

export default PromptRegistry;
