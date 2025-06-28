export interface ExtensionMapping {
  name: string;
  module: string;
  config?: Record<string, any>;
  dependencies?: string[];
  priority: number; // 로딩 순서 (낮을수록 먼저)
}

export interface LoadedExtension {
  name: string;
  extension: any;
  config?: Record<string, any>;
}

export interface LoadingResult {
  loaded: LoadedExtension[];
  failed: Array<{ name: string; error: string }>;
  totalCount: number;
  successCount: number;
}

export class ExtensionLoader {
  private extensionRegistry: Map<string, ExtensionMapping>;
  private loadedExtensions: Map<string, LoadedExtension>;
  private loadingPromises: Map<string, Promise<any>>;

  constructor() {
    this.extensionRegistry = new Map();
    this.loadedExtensions = new Map();
    this.loadingPromises = new Map();
    
    this.initializeRegistry();
  }

  /**
   * 확장 레지스트리 초기화
   */
  private initializeRegistry(): void {
    const extensions: ExtensionMapping[] = [
      // 기본 텍스트 확장
      {
        name: 'document',
        module: '@tiptap/extension-document',
        priority: 1
      },
      {
        name: 'paragraph',
        module: '@tiptap/extension-paragraph',
        priority: 2
      },
      {
        name: 'text',
        module: '@tiptap/extension-text',
        priority: 3
      },
      
      // 포맷팅 확장
      {
        name: 'bold',
        module: '@tiptap/extension-bold',
        priority: 10
      },
      {
        name: 'italic',
        module: '@tiptap/extension-italic',
        priority: 11
      },
      {
        name: 'underline',
        module: '@tiptap/extension-underline',
        priority: 12
      },
      {
        name: 'strike',
        module: '@tiptap/extension-strike',
        priority: 13
      },
      {
        name: 'code',
        module: '@tiptap/extension-code',
        priority: 14
      },
      
      // 블록 확장
      {
        name: 'heading',
        module: '@tiptap/extension-heading',
        config: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        priority: 20
      },
      {
        name: 'blockquote',
        module: '@tiptap/extension-blockquote',
        priority: 21
      },
      {
        name: 'bulletList',
        module: '@tiptap/extension-bullet-list',
        dependencies: ['listItem'],
        priority: 22
      },
      {
        name: 'orderedList',
        module: '@tiptap/extension-ordered-list',
        dependencies: ['listItem'],
        priority: 23
      },
      {
        name: 'listItem',
        module: '@tiptap/extension-list-item',
        priority: 24
      },
      {
        name: 'codeBlock',
        module: '@tiptap/extension-code-block',
        config: {
          languageClassPrefix: 'language-'
        },
        priority: 25
      },
      {
        name: 'horizontalRule',
        module: '@tiptap/extension-horizontal-rule',
        priority: 26
      },
      
      // 링크 확장
      {
        name: 'link',
        module: '@tiptap/extension-link',
        config: {
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        },
        priority: 30
      },
      
      // 미디어 확장
      {
        name: 'image',
        module: '@tiptap/extension-image',
        config: {
          HTMLAttributes: {
            class: 'tiptap-image'
          }
        },
        priority: 40
      },
      
      // 테이블 확장
      {
        name: 'table',
        module: '@tiptap/extension-table',
        dependencies: ['tableRow', 'tableHeader', 'tableCell'],
        config: {
          resizable: true
        },
        priority: 50
      },
      {
        name: 'tableRow',
        module: '@tiptap/extension-table-row',
        priority: 51
      },
      {
        name: 'tableHeader',
        module: '@tiptap/extension-table-header',
        priority: 52
      },
      {
        name: 'tableCell',
        module: '@tiptap/extension-table-cell',
        priority: 53
      },
      
      // 유틸리티 확장
      {
        name: 'history',
        module: '@tiptap/extension-history',
        priority: 100
      },
      {
        name: 'dropCursor',
        module: '@tiptap/extension-dropcursor',
        priority: 101
      },
      {
        name: 'gapCursor',
        module: '@tiptap/extension-gapcursor',
        priority: 102
      },
      
      // 커스텀 확장 (존재하는 경우)
      {
        name: 'youtube',
        module: '@shared/components/editor/extensions/YouTube',
        priority: 200
      }
    ];

    extensions.forEach(ext => {
      this.extensionRegistry.set(ext.name, ext);
    });
  }

  /**
   * 필요한 확장들을 자동으로 로드
   */
  async loadRequiredExtensions(requiredExtensions: string[]): Promise<LoadingResult> {
    const result: LoadingResult = {
      loaded: [],
      failed: [],
      totalCount: 0,
      successCount: 0
    };

    // 의존성을 포함한 전체 확장 목록 계산
    const allRequired = this.resolveDependencies(requiredExtensions);
    result.totalCount = allRequired.length;

    // 우선순위에 따라 정렬
    const sortedExtensions = allRequired
      .map(name => this.extensionRegistry.get(name))
      .filter(Boolean) as ExtensionMapping[]
      .sort((a, b) => a.priority - b.priority);

    // 확장 로딩
    for (const extensionMapping of sortedExtensions) {
      try {
        const loadedExtension = await this.loadExtension(extensionMapping);
        result.loaded.push(loadedExtension);
        result.successCount++;
      } catch (error) {
        result.failed.push({
          name: extensionMapping.name,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    return result;
  }

  /**
   * 의존성 해결
   */
  private resolveDependencies(requiredExtensions: string[]): string[] {
    const resolved = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (resolved.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`순환 의존성 감지: ${name}`);
      }

      visiting.add(name);
      
      const extension = this.extensionRegistry.get(name);
      if (extension && extension.dependencies) {
        extension.dependencies.forEach(dep => visit(dep));
      }
      
      visiting.delete(name);
      resolved.add(name);
    };

    // 항상 필요한 기본 확장들 추가
    const coreExtensions = ['document', 'paragraph', 'text'];
    [...coreExtensions, ...requiredExtensions].forEach(name => {
      try {
        visit(name);
      } catch (error) {
        console.warn(`확장 의존성 해결 실패: ${name}`, error);
      }
    });

    return Array.from(resolved);
  }

  /**
   * 개별 확장 로드
   */
  private async loadExtension(mapping: ExtensionMapping): Promise<LoadedExtension> {
    // 이미 로드된 확장은 재사용
    if (this.loadedExtensions.has(mapping.name)) {
      return this.loadedExtensions.get(mapping.name)!;
    }

    // 현재 로딩 중인 확장은 대기
    if (this.loadingPromises.has(mapping.name)) {
      const extension = await this.loadingPromises.get(mapping.name)!;
      return this.loadedExtensions.get(mapping.name)!;
    }

    // 새로운 확장 로딩 시작
    const loadingPromise = this.doLoadExtension(mapping);
    this.loadingPromises.set(mapping.name, loadingPromise);

    try {
      const extension = await loadingPromise;
      const loadedExtension: LoadedExtension = {
        name: mapping.name,
        extension,
        config: mapping.config
      };
      
      this.loadedExtensions.set(mapping.name, loadedExtension);
      return loadedExtension;
      
    } finally {
      this.loadingPromises.delete(mapping.name);
    }
  }

  /**
   * 실제 확장 모듈 로딩
   */
  private async doLoadExtension(mapping: ExtensionMapping): Promise<any> {
    try {
      // 동적 import로 확장 로드
      const module = await import(mapping.module);
      
      // 기본 export 또는 named export 처리
      const Extension = module.default || module[this.getExtensionClassName(mapping.name)];
      
      if (!Extension) {
        throw new Error(`확장을 찾을 수 없습니다: ${mapping.module}`);
      }

      // 설정이 있는 경우 적용
      if (mapping.config) {
        return Extension.configure(mapping.config);
      }
      
      return Extension;
      
    } catch (error) {
      // 확장 로딩 실패 시 fallback 처리
      if (this.isCoreExtension(mapping.name)) {
        throw error; // 핵심 확장은 실패하면 안됨
      }
      
      console.warn(`확장 로딩 실패, fallback 사용: ${mapping.name}`, error);
      return this.createFallbackExtension(mapping.name);
    }
  }

  /**
   * 확장 클래스 이름 생성
   */
  private getExtensionClassName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * 핵심 확장 여부 확인
   */
  private isCoreExtension(name: string): boolean {
    const coreExtensions = ['document', 'paragraph', 'text'];
    return coreExtensions.includes(name);
  }

  /**
   * Fallback 확장 생성
   */
  private createFallbackExtension(name: string): any {
    // 매우 기본적인 fallback extension 반환
    return {
      name,
      addOptions() {
        return {};
      },
      addStorage() {
        return {};
      }
    };
  }

  /**
   * 로드된 확장들을 Tiptap 에디터 설정에 맞는 형태로 변환
   */
  formatExtensionsForEditor(loadedExtensions: LoadedExtension[]): any[] {
    return loadedExtensions.map(({ extension, config }) => {
      if (config && typeof extension.configure === 'function') {
        return extension.configure(config);
      }
      return extension;
    });
  }

  /**
   * 확장 사전 로딩 (성능 최적화)
   */
  async preloadCommonExtensions(): Promise<void> {
    const commonExtensions = [
      'document', 'paragraph', 'text', 'bold', 'italic', 
      'heading', 'bulletList', 'orderedList', 'listItem'
    ];
    
    try {
      await this.loadRequiredExtensions(commonExtensions);
    } catch (error) {
      console.warn('공통 확장 사전 로딩 실패:', error);
    }
  }

  /**
   * 확장 레지스트리에 커스텀 확장 추가
   */
  registerCustomExtension(mapping: ExtensionMapping): void {
    this.extensionRegistry.set(mapping.name, mapping);
  }

  /**
   * 로드된 확장 정보 조회
   */
  getLoadedExtensionInfo(): Array<{ name: string; hasConfig: boolean }> {
    return Array.from(this.loadedExtensions.values()).map(({ name, config }) => ({
      name,
      hasConfig: !!config
    }));
  }

  /**
   * 확장 로딩 상태 초기화
   */
  reset(): void {
    this.loadedExtensions.clear();
    this.loadingPromises.clear();
  }

  /**
   * 특정 확장이 로드되었는지 확인
   */
  isExtensionLoaded(name: string): boolean {
    return this.loadedExtensions.has(name);
  }

  /**
   * 로딩 진행률 계산
   */
  calculateProgress(requiredExtensions: string[], currentLoaded: string[]): number {
    if (requiredExtensions.length === 0) return 100;
    
    const loadedCount = currentLoaded.filter(name => 
      requiredExtensions.includes(name)
    ).length;
    
    return Math.round((loadedCount / requiredExtensions.length) * 100);
  }
}