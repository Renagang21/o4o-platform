# 📦 O4O Platform 블록 플러그인 아키텍처 문서

## 📌 개요

O4O Platform의 블록 시스템을 플러그인 기반 아키텍처로 재구성하여 번들 크기를 최적화하고 확장성을 향상시킵니다.

## 🎯 목표

1. **번들 크기 최소화**: 핵심 기능만 기본 로드, 나머지는 필요시 로드
2. **모듈화**: 기능별로 독립적인 플러그인으로 분리
3. **확장성**: 새로운 블록 추가가 쉬운 구조
4. **성능 최적화**: 사용하지 않는 블록은 로드하지 않음
5. **유지보수성**: 각 플러그인별 독립적인 개발/배포 가능

## 📊 현재 블록 분석

### 발견된 블록 구조

```
/apps/admin-dashboard/src/blocks/
├── core/           # 기본 블록 (paragraph, heading, list 등)
├── layout/         # 레이아웃 블록 (columns, group, spacer 등)
├── media/          # 미디어 블록 (image, gallery, video 등)
├── cpt-acf-loop/   # 커스텀 포스트 타입 & ACF 블록
├── columns/        # 컬럼 레이아웃 블록
└── group/          # 그룹 블록

/apps/main-site/src/components/
├── TemplateRenderer/blocks/    # 템플릿 렌더링 블록
├── WordPressBlockRenderer/blocks/  # WordPress 블록 렌더러
└── blocks/         # 사이트 구조 블록 (header, footer, navigation 등)
```

### 블록 분류

#### 1. **Core Blocks (핵심 블록)**
- ParagraphBlock
- HeadingBlock
- ListBlock
- QuoteBlock
- CodeBlock
- HtmlBlock

#### 2. **Layout Blocks (레이아웃 블록)**
- ColumnsBlock / ColumnBlock
- GroupBlock
- SpacerBlock
- SeparatorBlock
- CoverBlock

#### 3. **Media Blocks (미디어 블록)**
- ImageBlock
- GalleryBlock
- VideoBlock
- AudioBlock
- EmbedBlock

#### 4. **Interactive Blocks (인터랙티브 블록)**
- ButtonBlock / ButtonsBlock
- SearchBlock
- TableBlock
- FormBlocks (Spectra)

#### 5. **Site Structure Blocks (사이트 구조 블록)**
- SiteHeader
- SiteFooter
- Navigation
- SiteLogo
- SiteTitle
- SiteTagline
- SocialLinks

#### 6. **Advanced Blocks (고급 블록)**
- ShortcodeBlock
- ReusableBlockRenderer
- CPT-ACF Loop Block
- SpectraBlocks

## 🏗️ 제안하는 플러그인 구조

### 플러그인 그룹화 전략

```
@o4o/blocks-core (필수)
├── paragraph
├── heading
├── list
├── quote
└── code

@o4o/blocks-layout
├── columns
├── group
├── spacer
├── separator
└── cover

@o4o/blocks-media
├── image
├── gallery
├── video
├── audio
└── embed

@o4o/blocks-interactive
├── button
├── search
├── table
└── forms

@o4o/blocks-site
├── header
├── footer
├── navigation
├── logo
└── social

@o4o/blocks-advanced
├── shortcode
├── reusable
├── cpt-acf
└── spectra
```

## 🔧 기술 아키텍처

### 1. 플러그인 시스템 코어

```typescript
// packages/block-plugin-core/src/index.ts
export interface BlockPlugin {
  id: string;
  name: string;
  version: string;
  blocks: BlockDefinition[];
  dependencies?: string[];
  settings?: PluginSettings;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export interface BlockDefinition {
  name: string;
  category: string;
  icon: ReactElement;
  edit: ComponentType;
  save: ComponentType;
  attributes?: BlockAttributes;
  supports?: BlockSupports;
}

export class BlockPluginManager {
  private plugins: Map<string, BlockPlugin> = new Map();
  private loadedBlocks: Set<string> = new Set();
  
  async register(plugin: BlockPlugin): Promise<void> {
    // 플러그인 등록 로직
  }
  
  async activate(pluginId: string): Promise<void> {
    // 플러그인 활성화 및 블록 등록
  }
  
  async deactivate(pluginId: string): Promise<void> {
    // 플러그인 비활성화 및 블록 해제
  }
  
  async loadOnDemand(blockName: string): Promise<void> {
    // 필요시 동적 로드
  }
}
```

### 2. 동적 로딩 시스템

```typescript
// packages/block-loader/src/index.ts
export class DynamicBlockLoader {
  private loadingPromises: Map<string, Promise<any>> = new Map();
  
  async loadPlugin(pluginId: string): Promise<BlockPlugin> {
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId);
    }
    
    const promise = import(
      /* webpackChunkName: "[request]" */
      `@o4o/blocks-${pluginId}`
    );
    
    this.loadingPromises.set(pluginId, promise);
    return promise;
  }
  
  async preloadEssentials(): Promise<void> {
    // 핵심 블록들 미리 로드
    await this.loadPlugin('core');
  }
  
  async loadByCategory(category: string): Promise<void> {
    // 카테고리별 로드
    const plugins = this.getPluginsByCategory(category);
    await Promise.all(plugins.map(p => this.loadPlugin(p)));
  }
}
```

### 3. 블록 레지스트리

```typescript
// packages/block-registry/src/index.ts
export class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  
  register(blockName: string, definition: BlockDefinition): void {
    this.blocks.set(blockName, definition);
    this.addToCategory(definition.category, blockName);
  }
  
  unregister(blockName: string): void {
    const block = this.blocks.get(blockName);
    if (block) {
      this.removeFromCategory(block.category, blockName);
      this.blocks.delete(blockName);
    }
  }
  
  getBlock(blockName: string): BlockDefinition | undefined {
    return this.blocks.get(blockName);
  }
  
  getBlocksByCategory(category: string): BlockDefinition[] {
    const blockNames = this.categories.get(category) || new Set();
    return Array.from(blockNames)
      .map(name => this.blocks.get(name))
      .filter(Boolean) as BlockDefinition[];
  }
}
```

## 📈 성능 최적화 전략

### 1. Code Splitting

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        core: {
          test: /[\\/]blocks-core[\\/]/,
          name: 'blocks-core',
          priority: 30,
          enforce: true
        },
        layout: {
          test: /[\\/]blocks-layout[\\/]/,
          name: 'blocks-layout',
          priority: 20,
          chunks: 'async'
        },
        media: {
          test: /[\\/]blocks-media[\\/]/,
          name: 'blocks-media',
          priority: 20,
          chunks: 'async'
        },
        advanced: {
          test: /[\\/]blocks-advanced[\\/]/,
          name: 'blocks-advanced',
          priority: 10,
          chunks: 'async'
        }
      }
    }
  }
};
```

### 2. Lazy Loading

```typescript
// 사용 예시
const MediaBlocksPlugin = React.lazy(() => 
  import(
    /* webpackChunkName: "blocks-media" */
    /* webpackPrefetch: true */
    '@o4o/blocks-media'
  )
);

// 필요시에만 로드
function EditorWithMediaBlocks() {
  const [showMedia, setShowMedia] = useState(false);
  
  return (
    <>
      {showMedia && (
        <Suspense fallback={<LoadingSpinner />}>
          <MediaBlocksPlugin />
        </Suspense>
      )}
    </>
  );
}
```

### 3. Bundle Analysis

```bash
# 번들 크기 분석
npm run analyze

# 예상 번들 크기 감소
Before: 2.5MB (모든 블록 포함)
After:
  - Core: 200KB (필수)
  - Layout: 150KB (선택)
  - Media: 400KB (선택)
  - Interactive: 300KB (선택)
  - Advanced: 500KB (선택)
  
Initial Load: 200KB (-92%)
```

## 🔄 마이그레이션 전략

### Phase 1: 준비 (1-2주)
1. 현재 블록 인벤토리 완성
2. 의존성 매핑
3. 플러그인 경계 정의

### Phase 2: 코어 개발 (2-3주)
1. 플러그인 시스템 코어 구현
2. 동적 로더 구현
3. 레지스트리 시스템 구현

### Phase 3: 블록 마이그레이션 (3-4주)
1. Core blocks 분리
2. Layout blocks 분리
3. Media blocks 분리
4. Interactive blocks 분리
5. Advanced blocks 분리

### Phase 4: 통합 테스트 (1-2주)
1. 성능 테스트
2. 호환성 테스트
3. 사용자 테스트

### Phase 5: 배포 (1주)
1. 점진적 롤아웃
2. 모니터링
3. 피드백 수집

## 🛠️ 개발 가이드라인

### 플러그인 개발 템플릿

```typescript
// packages/blocks-{category}/src/index.ts
import { BlockPlugin, BlockDefinition } from '@o4o/block-plugin-core';

class MyBlockPlugin implements BlockPlugin {
  id = 'my-blocks';
  name = 'My Custom Blocks';
  version = '1.0.0';
  
  blocks: BlockDefinition[] = [
    // 블록 정의들
  ];
  
  async activate(): Promise<void> {
    // 활성화 로직
    this.blocks.forEach(block => {
      window.wp.blocks.registerBlockType(block.name, block);
    });
  }
  
  async deactivate(): Promise<void> {
    // 비활성화 로직
    this.blocks.forEach(block => {
      window.wp.blocks.unregisterBlockType(block.name);
    });
  }
}

export default new MyBlockPlugin();
```

### 블록 정의 예시

```typescript
const paragraphBlock: BlockDefinition = {
  name: 'o4o/paragraph',
  category: 'text',
  icon: <ParagraphIcon />,
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: 'p'
    },
    align: {
      type: 'string'
    }
  },
  edit: ParagraphEdit,
  save: ParagraphSave,
  supports: {
    className: true,
    anchor: true,
    color: true,
    fontSize: true
  }
};
```

## 📊 모니터링 및 분석

### 플러그인 사용 통계

```typescript
interface PluginMetrics {
  pluginId: string;
  loadCount: number;
  avgLoadTime: number;
  blockUsage: Map<string, number>;
  errorRate: number;
}

class PluginAnalytics {
  track(event: 'load' | 'activate' | 'error', data: any): void {
    // 분석 데이터 수집
  }
  
  getMetrics(pluginId: string): PluginMetrics {
    // 메트릭 반환
  }
  
  generateReport(): AnalyticsReport {
    // 리포트 생성
  }
}
```

## 🔗 참고 자료

- [WordPress Gutenberg Architecture](https://developer.wordpress.org/block-editor/explanations/architecture/)
- [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [React Lazy Loading](https://reactjs.org/docs/code-splitting.html)
- [Plugin Architecture Patterns](https://martinfowler.com/articles/injection.html)

## 📝 다음 단계

1. **POC 개발**: Core blocks 플러그인으로 개념 증명
2. **성능 벤치마킹**: 현재 vs 플러그인 아키텍처 비교
3. **개발자 문서**: 플러그인 개발 가이드 작성
4. **도구 개발**: 플러그인 생성 CLI 도구

---

*최종 업데이트: 2025년 8월*
*작성자: O4O Platform Development Team*