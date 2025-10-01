/**
 * AI 블록 가이드 로더
 * blocks-guide.md 파일을 로드하고 AI 프롬프트로 변환
 */

interface BlockGuide {
  content: string;
  lastUpdated: Date;
  version: string;
}

class BlockGuideLoader {
  private static instance: BlockGuideLoader;
  private cachedGuide: BlockGuide | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30분

  private constructor() {}

  static getInstance(): BlockGuideLoader {
    if (!BlockGuideLoader.instance) {
      BlockGuideLoader.instance = new BlockGuideLoader();
    }
    return BlockGuideLoader.instance;
  }

  /**
   * blocks-guide.md 로드 및 캐싱
   */
  async loadGuide(forceRefresh = false): Promise<string> {
    // 캐시 확인
    if (!forceRefresh && this.cachedGuide && this.isCacheValid()) {
      return this.cachedGuide.content;
    }

    try {
      // Vite의 ?raw import를 사용하여 마크다운 파일 로드
      const guideModule = await import('./blocks-guide.md?raw');
      const content = guideModule.default;
      
      // 캐시 업데이트
      this.cachedGuide = {
        content,
        lastUpdated: new Date(),
        version: this.extractVersion(content)
      };

      return content;
    } catch (error) {
      console.error('블록 가이드 로드 실패:', error);
      
      // 캐시된 가이드가 있으면 사용
      if (this.cachedGuide) {
        return this.cachedGuide.content;
      }
      
      // 기본 가이드 반환
      return this.getDefaultGuide();
    }
  }

  /**
   * AI 프롬프트용으로 가이드 변환
   */
  async getAIPrompt(): Promise<string> {
    const guide = await this.loadGuide();
    
    // 마크다운을 AI가 이해하기 쉬운 형태로 변환
    return this.convertToAIPrompt(guide);
  }

  /**
   * 가이드 재로드 (개발용)
   */
  async reloadGuide(): Promise<void> {
    await this.loadGuide(true);
  }

  /**
   * 캐시 상태 확인
   */
  getCacheStatus(): { cached: boolean; lastUpdated?: Date; version?: string } {
    if (!this.cachedGuide) {
      return { cached: false };
    }

    return {
      cached: true,
      lastUpdated: this.cachedGuide.lastUpdated,
      version: this.cachedGuide.version
    };
  }

  private isCacheValid(): boolean {
    if (!this.cachedGuide) return false;
    
    const now = new Date().getTime();
    const lastUpdated = this.cachedGuide.lastUpdated.getTime();
    
    return (now - lastUpdated) < this.CACHE_DURATION;
  }

  private extractVersion(content: string): string {
    const versionMatch = content.match(/\*\*버전\*\*:\s*([\d.]+)/);
    return versionMatch ? versionMatch[1] : '1.0';
  }

  private convertToAIPrompt(markdownContent: string): string {
    // 마크다운 헤더 제거 및 정리
    let prompt = markdownContent
      .replace(/^#+ /gm, '') // 헤더 마크 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/`([^`]+)`/g, '$1') // 인라인 코드 제거
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거 (예시는 유지하되 마크다운 제거)
      .replace(/\|.*\|/g, '') // 테이블 제거
      .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 정리
      .trim();

    // AI 전용 프롬프트 헤더 추가
    return `
WordPress Gutenberg 블록 생성 가이드:

${prompt}

중요 지침:
1. 반드시 JSON 배열 형식으로 응답하세요
2. 사용자 요청을 분석하여 가장 적절한 블록을 선택하세요  
3. 슬라이드/갤러리 요청 시 enhanced/gallery 또는 core/gallery 사용
4. 버튼 그룹 요청 시 core/columns + core/button 조합 사용
5. 이미지 src는 절대 포함하지 마세요 (alt만 사용)
6. 실제 URL 대신 "#" 사용
`.trim();
  }

  private getDefaultGuide(): string {
    // 기본 가이드 (fallback)
    return `
기본 블록 가이드:

사용 가능한 블록:
- core/heading: 제목
- core/paragraph: 본문
- core/image: 이미지  
- core/button: 버튼
- core/columns: 다단 레이아웃
- core/separator: 구분선
- enhanced/gallery: 갤러리/슬라이더
- enhanced/social-icons: 소셜 아이콘

중요: 슬라이드 요청 시 enhanced/gallery 사용, core/image 반복 금지
`.trim();
  }
}

// 싱글톤 인스턴스 내보내기
export const blockGuideLoader = BlockGuideLoader.getInstance();
export type { BlockGuide };