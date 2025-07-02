import { 
  ImportType, 
  ImportStep, 
  createWordPressImportSteps,
  createHtmlImportSteps,
  createMarkdownImportSteps,
  HtmlAnalyzer,
  TiptapConverter,
  CorsProxyService,
  ExtensionLoader,
  ConversionResult
} from './index';

export interface ImportManagerOptions {
  onStepUpdate?: (step: ImportStep) => void;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: (result: ConversionResult) => void;
  onError?: (error: string) => void;
}

export class ImportManager {
  private htmlAnalyzer: HtmlAnalyzer;
  private tiptapConverter: TiptapConverter;
  private corsProxy: CorsProxyService;
  private extensionLoader: ExtensionLoader;
  private currentSteps: ImportStep[] = [];
  private options: ImportManagerOptions;

  constructor(options: ImportManagerOptions = {}) {
    this.htmlAnalyzer = new HtmlAnalyzer();
    this.tiptapConverter = new TiptapConverter();
    this.corsProxy = new CorsProxyService();
    this.extensionLoader = new ExtensionLoader();
    this.options = options;
  }

  /**
   * 메인 가져오기 함수
   */
  async importContent(type: ImportType, content: string): Promise<ConversionResult> {
    try {
      // 단계 초기화
      this.initializeSteps(type, content);
      
      let result: ConversionResult;
      
      switch (type) {
        case 'wordpress':
          result = await this.importWordPressContent(content);
          break;
        case 'html':
          result = await this.importHtmlContent(content);
          break;
        case 'markdown':
          result = await this.importMarkdownContent(content);
          break;
        default:
          throw new Error(`지원하지 않는 가져오기 타입: ${type}`);
      }

      this.options.onComplete?.(result);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      this.updateStepStatus('error', errorMessage);
      this.options.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * WordPress 콘텐츠 가져오기
   */
  private async importWordPressContent(url: string): Promise<ConversionResult> {
    // 1. WordPress 페이지 가져오기
    this.updateStepStatus('fetch', 'loading');
    const proxyResponse = await this.corsProxy.fetchContent(url);
    this.updateStepStatus('fetch', 'completed');
    this.updateProgress(15);

    // 2. HTML 구조 분석
    this.updateStepStatus('parse', 'loading');
    const securityCheck = this.corsProxy.performSecurityCheck(proxyResponse.content);
    if (!securityCheck.isSafe) {
      throw new Error('보안 검사를 통과하지 못했습니다.');
    }
    this.updateStepStatus('parse', 'completed');
    this.updateProgress(30);

    // 3. 콘텐츠 정리
    this.updateStepStatus('clean', 'loading');
    const analyzed = this.htmlAnalyzer.analyzeHtmlString(
      securityCheck.sanitizedContent!,
      { isWordPress: true, sourceUrl: url }
    );
    this.updateStepStatus('clean', 'completed');
    this.updateProgress(50);

    // 4. Tiptap 블록 변환
    this.updateStepStatus('convert', 'loading');
    const conversionResult = this.tiptapConverter.convertAnalyzedContent(analyzed);
    this.updateStepStatus('convert', 'completed');
    this.updateProgress(70);

    // 5. 필요한 확장 로딩
    this.updateStepStatus('extensions', 'loading');
    await this.extensionLoader.loadRequiredExtensions(conversionResult.requiredExtensions);
    this.updateStepStatus('extensions', 'completed');
    this.updateProgress(90);

    // 6. 에디터에 삽입 준비
    this.updateStepStatus('insert', 'loading');
    this.updateStepStatus('insert', 'completed');
    this.updateProgress(100);

    return conversionResult;
  }

  /**
   * HTML 콘텐츠 가져오기
   */
  private async importHtmlContent(html: string): Promise<ConversionResult> {
    // 1. HTML 유효성 검사
    this.updateStepStatus('validate', 'loading');
    if (!html.trim()) {
      throw new Error('HTML 콘텐츠가 비어있습니다.');
    }
    this.updateStepStatus('validate', 'completed');
    this.updateProgress(20);

    // 2. 보안 검사
    this.updateStepStatus('sanitize', 'loading');
    const securityCheck = this.corsProxy.performSecurityCheck(html);
    if (!securityCheck.isSafe) {
      throw new Error('보안 검사를 통과하지 못했습니다.');
    }
    this.updateStepStatus('sanitize', 'completed');
    this.updateProgress(40);

    // 3. Tiptap 블록 변환
    this.updateStepStatus('convert', 'loading');
    const conversionResult = this.tiptapConverter.convertHtmlString(securityCheck.sanitizedContent!);
    this.updateStepStatus('convert', 'completed');
    this.updateProgress(70);

    // 4. 필요한 확장 로딩
    this.updateStepStatus('extensions', 'loading');
    await this.extensionLoader.loadRequiredExtensions(conversionResult.requiredExtensions);
    this.updateStepStatus('extensions', 'completed');
    this.updateProgress(90);

    // 5. 에디터에 삽입 준비
    this.updateStepStatus('insert', 'loading');
    this.updateStepStatus('insert', 'completed');
    this.updateProgress(100);

    return conversionResult;
  }

  /**
   * 마크다운 콘텐츠 가져오기
   */
  private async importMarkdownContent(markdown: string): Promise<ConversionResult> {
    // 1. 마크다운 파싱
    this.updateStepStatus('parse', 'loading');
    if (!markdown.trim()) {
      throw new Error('마크다운 콘텐츠가 비어있습니다.');
    }
    this.updateStepStatus('parse', 'completed');
    this.updateProgress(25);

    // 2. HTML 변환
    this.updateStepStatus('convert', 'loading');
    this.updateProgress(50);

    // 3. Tiptap 블록 변환
    this.updateStepStatus('tiptap', 'loading');
    const conversionResult = this.tiptapConverter.convertMarkdown(markdown);
    this.updateStepStatus('convert', 'completed');
    this.updateStepStatus('tiptap', 'completed');
    this.updateProgress(75);

    // 4. 필요한 확장 로딩
    this.updateStepStatus('extensions', 'loading');
    await this.extensionLoader.loadRequiredExtensions(conversionResult.requiredExtensions);
    this.updateStepStatus('extensions', 'completed');
    this.updateProgress(90);

    // 5. 에디터에 삽입 준비
    this.updateStepStatus('insert', 'loading');
    this.updateStepStatus('insert', 'completed');
    this.updateProgress(100);

    return conversionResult;
  }

  /**
   * 단계 초기화
   */
  private initializeSteps(type: ImportType, content: string): void {
    switch (type) {
      case 'wordpress':
        this.currentSteps = createWordPressImportSteps(content);
        break;
      case 'html':
        this.currentSteps = createHtmlImportSteps();
        break;
      case 'markdown':
        this.currentSteps = createMarkdownImportSteps();
        break;
    }
    this.updateProgress(0);
  }

  /**
   * 단계 상태 업데이트
   */
  private updateStepStatus(stepId: string, status: ImportStep['status'], error?: string): void {
    const step = this.currentSteps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (error) {
        step.error = error;
      }
      this.options.onStepUpdate?.(step);
    }
  }

  /**
   * 진행률 업데이트
   */
  private updateProgress(progress: number): void {
    this.options.onProgressUpdate?.(progress);
  }

  /**
   * 현재 단계 목록 반환
   */
  getCurrentSteps(): ImportStep[] {
    return [...this.currentSteps];
  }

  /**
   * 가져오기 취소
   */
  cancel(): void {
    this.currentSteps.forEach(step => {
      if (step.status === 'loading') {
        step.status = 'pending';
      }
    });
    this.updateProgress(0);
  }

  /**
   * URL 미리 검증
   */
  async validateUrl(url: string): Promise<{ isValid: boolean; reason?: string }> {
    return this.corsProxy.validateUrl(url);
  }

  /**
   * 콘텐츠 품질 평가
   */
  assessContentQuality(html: string) {
    return this.corsProxy.assessContentQuality(html);
  }

  /**
   * 확장 로더 인스턴스 반환
   */
  getExtensionLoader(): ExtensionLoader {
    return this.extensionLoader;
  }

  /**
   * 변환 결과 검증
   */
  validateConversionResult(result: ConversionResult): { isValid: boolean; errors: string[] } {
    return this.tiptapConverter.validateConversion(result);
  }

  /**
   * Tiptap 문서를 HTML로 변환 (미리보기용)
   */
  convertToHtmlPreview(result: ConversionResult): string {
    return this.tiptapConverter.convertTiptapToHtml(result.document);
  }
}