# 🛠️ 블록 플러그인 구현 가이드

## 📌 개요
이 문서는 O4O Platform의 블록을 독립적인 플러그인으로 분리하여 번들 사이즈를 최적화하는 구체적인 구현 방법을 제공합니다.

## 🎯 구현 목표

### 핵심 원칙
1. **최소 초기 로드**: 필수 블록만 초기 로드
2. **점진적 로딩**: 필요한 블록만 동적 로드
3. **독립성**: 각 플러그인은 독립적으로 작동
4. **재사용성**: 공통 컴포넌트는 별도 패키지로
5. **확장성**: 새로운 블록 추가가 용이한 구조

## 📁 프로젝트 구조

```
o4o-platform/
├── packages/
│   ├── block-core/                 # 블록 시스템 코어
│   │   ├── src/
│   │   │   ├── BlockManager.ts
│   │   │   ├── BlockRegistry.ts
│   │   │   ├── PluginLoader.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── block-common/               # 공통 컴포넌트 & 유틸리티
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── blocks/                     # 개별 블록 플러그인들
│       ├── essential/              # 필수 블록
│       │   ├── src/
│       │   │   ├── paragraph/
│       │   │   ├── heading/
│       │   │   ├── image/
│       │   │   └── index.ts
│       │   └── package.json
│       │
│       ├── layout/                 # 레이아웃 블록
│       │   ├── src/
│       │   │   ├── columns/
│       │   │   ├── group/
│       │   │   ├── spacer/
│       │   │   └── index.ts
│       │   └── package.json
│       │
│       └── media/                  # 미디어 블록
│           ├── src/
│           │   ├── gallery/
│           │   ├── video/
│           │   ├── audio/
│           │   └── index.ts
│           └── package.json
```

## 🔨 단계별 구현

### Step 1: 블록 코어 시스템 구축

#### BlockManager 구현

```typescript
// packages/block-core/src/BlockManager.ts
export class BlockManager {
  private static instance: BlockManager;
  private plugins: Map<string, BlockPlugin> = new Map();
  private loadedChunks: Set<string> = new Set();
  
  static getInstance(): BlockManager {
    if (!BlockManager.instance) {
      BlockManager.instance = new BlockManager();
    }
    return BlockManager.instance;
  }
  
  async loadPlugin(pluginId: string): Promise<void> {
    if (this.plugins.has(pluginId)) {
      return;
    }
    
    try {
      const module = await this.dynamicImport(pluginId);
      const plugin = module.default as BlockPlugin;
      
      await this.validatePlugin(plugin);
      await this.registerPlugin(plugin);
      
      console.log(`✅ Plugin loaded: ${pluginId}`);
    } catch (error) {
      console.error(`❌ Failed to load plugin: ${pluginId}`, error);
      throw error;
    }
  }
  
  private async dynamicImport(pluginId: string): Promise<any> {
    // 웹팩 매직 코멘트를 활용한 동적 임포트
    switch(pluginId) {
      case 'essential':
        return import(
          /* webpackChunkName: "blocks-essential" */
          /* webpackPreload: true */
          '@o4o/blocks-essential'
        );
      
      case 'layout':
        return import(
          /* webpackChunkName: "blocks-layout" */
          /* webpackPrefetch: true */
          '@o4o/blocks-layout'
        );
      
      case 'media':
        return import(
          /* webpackChunkName: "blocks-media" */
          '@o4o/blocks-media'
        );
      
      default:
        throw new Error(`Unknown plugin: ${pluginId}`);
    }
  }
  
  private async validatePlugin(plugin: BlockPlugin): Promise<void> {
    const required = ['id', 'name', 'version', 'blocks'];
    for (const field of required) {
      if (!plugin[field]) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }
  }
  
  private async registerPlugin(plugin: BlockPlugin): Promise<void> {
    // 의존성 확인
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          await this.loadPlugin(dep);
        }
      }
    }
    
    // 플러그인 활성화
    await plugin.activate();
    this.plugins.set(plugin.id, plugin);
    
    // 블록 등록
    plugin.blocks.forEach(block => {
      this.registerBlock(block);
    });
  }
  
  private registerBlock(block: BlockDefinition): void {
    if (window.wp?.blocks?.registerBlockType) {
      window.wp.blocks.registerBlockType(block.name, block);
    }
  }
}
```

### Step 2: 플러그인 인터페이스 정의

```typescript
// packages/block-core/src/types.ts
export interface BlockPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  dependencies?: string[];
  blocks: BlockDefinition[];
  settings?: PluginSettings;
  
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  
  // 옵션 메서드들
  onLoad?(): void;
  onUnload?(): void;
  getSettings?(): PluginSettings;
  updateSettings?(settings: Partial<PluginSettings>): void;
}

export interface BlockDefinition {
  name: string;
  title: string;
  category: string;
  icon: React.ComponentType | string;
  description?: string;
  keywords?: string[];
  attributes?: Record<string, any>;
  supports?: BlockSupports;
  
  edit: React.ComponentType<any>;
  save: React.ComponentType<any>;
  
  // 선택적 컴포넌트
  deprecated?: any[];
  transforms?: any;
  variations?: any[];
  example?: any;
}

export interface BlockSupports {
  align?: boolean | string[];
  anchor?: boolean;
  className?: boolean;
  color?: {
    background?: boolean;
    gradients?: boolean;
    text?: boolean;
  };
  spacing?: {
    margin?: boolean;
    padding?: boolean;
  };
}

export interface PluginSettings {
  enabled: boolean;
  autoLoad?: boolean;
  priority?: number;
  config?: Record<string, any>;
}
```

### Step 3: Essential 블록 플러그인 구현

```typescript
// packages/blocks/essential/src/index.ts
import { BlockPlugin, BlockDefinition } from '@o4o/block-core';
import ParagraphBlock from './paragraph';
import HeadingBlock from './heading';
import ImageBlock from './image';

class EssentialBlocksPlugin implements BlockPlugin {
  id = 'essential';
  name = 'Essential Blocks';
  version = '1.0.0';
  description = 'Core blocks for basic content editing';
  author = 'O4O Platform Team';
  license = 'MIT';
  
  blocks: BlockDefinition[] = [
    ParagraphBlock,
    HeadingBlock,
    ImageBlock
  ];
  
  async activate(): Promise<void> {
    console.log('Activating Essential Blocks Plugin');
    
    // 필수 스타일 로드
    await this.loadStyles();
    
    // 이벤트 리스너 등록
    this.setupEventListeners();
  }
  
  async deactivate(): Promise<void> {
    console.log('Deactivating Essential Blocks Plugin');
    
    // 정리 작업
    this.cleanup();
  }
  
  private async loadStyles(): Promise<void> {
    // 플러그인 스타일 동적 로드
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/plugins/essential/styles.css';
    document.head.appendChild(link);
  }
  
  private setupEventListeners(): void {
    // 필요한 이벤트 리스너 설정
  }
  
  private cleanup(): void {
    // 리소스 정리
  }
}

export default new EssentialBlocksPlugin();
```

### Step 4: 개별 블록 구현

```typescript
// packages/blocks/essential/src/paragraph/index.tsx
import { BlockDefinition } from '@o4o/block-core';
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

const ParagraphBlock: BlockDefinition = {
  name: 'o4o/paragraph',
  title: __('Paragraph', 'o4o'),
  category: 'text',
  icon: 'editor-paragraph',
  description: __('Start with the basic building block of all narrative.'),
  keywords: ['text', 'paragraph', 'p'],
  
  attributes: {
    content: {
      type: 'string',
      source: 'html',
      selector: 'p',
      default: ''
    },
    align: {
      type: 'string',
      default: 'left'
    },
    dropCap: {
      type: 'boolean',
      default: false
    }
  },
  
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
      gradients: true
    },
    spacing: {
      margin: true,
      padding: true
    }
  },
  
  edit: ({ attributes, setAttributes }) => {
    const { content, align, dropCap } = attributes;
    const blockProps = useBlockProps({
      className: `align-${align} ${dropCap ? 'has-drop-cap' : ''}`
    });
    
    return (
      <RichText
        {...blockProps}
        tagName="p"
        value={content}
        onChange={(value) => setAttributes({ content: value })}
        placeholder={__('Write your paragraph...', 'o4o')}
      />
    );
  },
  
  save: ({ attributes }) => {
    const { content, align, dropCap } = attributes;
    const blockProps = useBlockProps.save({
      className: `align-${align} ${dropCap ? 'has-drop-cap' : ''}`
    });
    
    return (
      <RichText.Content
        {...blockProps}
        tagName="p"
        value={content}
      />
    );
  }
};

export default ParagraphBlock;
```

### Step 5: 플러그인 로더 구현

```typescript
// packages/block-core/src/PluginLoader.ts
export class PluginLoader {
  private manager: BlockManager;
  private loadQueue: string[] = [];
  private loadingPromises: Map<string, Promise<void>> = new Map();
  
  constructor() {
    this.manager = BlockManager.getInstance();
  }
  
  // 초기 로드 전략
  async initialize(): Promise<void> {
    // 1. 필수 플러그인 즉시 로드
    await this.loadEssentials();
    
    // 2. 자주 사용되는 플러그인 프리페치
    this.prefetchCommon();
    
    // 3. 사용 패턴 기반 예측 로딩
    this.predictiveLoad();
  }
  
  private async loadEssentials(): Promise<void> {
    const essentials = ['essential'];
    await Promise.all(
      essentials.map(id => this.manager.loadPlugin(id))
    );
  }
  
  private prefetchCommon(): void {
    const common = ['layout', 'media'];
    
    // requestIdleCallback을 사용한 유휴 시간 로딩
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        common.forEach(id => {
          this.prefetchPlugin(id);
        });
      });
    } else {
      // 폴백: setTimeout 사용
      setTimeout(() => {
        common.forEach(id => {
          this.prefetchPlugin(id);
        });
      }, 2000);
    }
  }
  
  private async prefetchPlugin(pluginId: string): Promise<void> {
    // 웹팩 프리페치 힌트 사용
    switch(pluginId) {
      case 'layout':
        import(/* webpackPrefetch: true */ '@o4o/blocks-layout');
        break;
      case 'media':
        import(/* webpackPrefetch: true */ '@o4o/blocks-media');
        break;
    }
  }
  
  private predictiveLoad(): void {
    // 사용자 패턴 분석 기반 예측 로딩
    const userPattern = this.analyzeUserPattern();
    
    if (userPattern.usesMedia) {
      this.scheduleLoad('media');
    }
    
    if (userPattern.usesLayouts) {
      this.scheduleLoad('layout');
    }
    
    if (userPattern.usesForms) {
      this.scheduleLoad('forms');
    }
  }
  
  private analyzeUserPattern(): any {
    // localStorage나 쿠키에서 사용 패턴 분석
    const history = localStorage.getItem('blockUsageHistory');
    if (!history) return {};
    
    const parsed = JSON.parse(history);
    return {
      usesMedia: parsed.media > 10,
      usesLayouts: parsed.layout > 5,
      usesForms: parsed.forms > 3
    };
  }
  
  private scheduleLoad(pluginId: string): void {
    // IntersectionObserver나 특정 트리거 기반 로딩
    this.loadQueue.push(pluginId);
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.loadQueue.length === 0) return;
    
    const pluginId = this.loadQueue.shift()!;
    
    if (!this.loadingPromises.has(pluginId)) {
      const promise = this.manager.loadPlugin(pluginId);
      this.loadingPromises.set(pluginId, promise);
    }
    
    await this.loadingPromises.get(pluginId);
    
    // 다음 항목 처리
    if (this.loadQueue.length > 0) {
      requestAnimationFrame(() => this.processQueue());
    }
  }
}
```

### Step 6: 빌드 설정

#### Webpack 설정

```javascript
// webpack.config.js
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  entry: {
    // 코어 시스템
    'block-core': './packages/block-core/src/index.ts',
    
    // 플러그인들 (각각 별도 엔트리)
    'blocks-essential': './packages/blocks/essential/src/index.ts',
    'blocks-layout': './packages/blocks/layout/src/index.ts',
    'blocks-media': './packages/blocks/media/src/index.ts',
    'blocks-forms': './packages/blocks/forms/src/index.ts',
    'blocks-commerce': './packages/blocks/commerce/src/index.ts',
    'blocks-advanced': './packages/blocks/advanced/src/index.ts',
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/plugins'),
    filename: '[name]/bundle.[contenthash].js',
    chunkFilename: '[name]/chunk.[contenthash].js',
    publicPath: '/plugins/',
    
    // 라이브러리로 export
    library: {
      name: '@o4o/[name]',
      type: 'umd',
    },
  },
  
  optimization: {
    usedExports: true,
    sideEffects: false,
    
    splitChunks: {
      chunks: 'all',
      maxAsyncRequests: 30,
      maxInitialRequests: 5,
      
      cacheGroups: {
        // WordPress 패키지 공통 번들
        wordpress: {
          test: /[\\/]node_modules[\\/]@wordpress[\\/]/,
          name: 'wordpress-vendor',
          priority: 30,
          reuseExistingChunk: true,
        },
        
        // React 관련
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          priority: 25,
        },
        
        // 공통 유틸리티
        common: {
          test: /[\\/]packages[\\/]block-common[\\/]/,
          name: 'block-common',
          priority: 20,
          minChunks: 2,
        },
        
        // 기본값
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    
    // 런타임 청크 분리
    runtimeChunk: {
      name: 'runtime',
    },
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
        ],
      },
    ],
  },
  
  plugins: [
    // 번들 분석
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: '../reports/bundle-analysis.html',
    }),
  ],
};
```

#### Package.json 스크립트

```json
{
  "scripts": {
    "build:plugins": "webpack --mode production",
    "build:plugin": "webpack --mode production --entry",
    "analyze": "webpack --mode production --analyze",
    "watch": "webpack --mode development --watch",
    
    "plugin:create": "node scripts/create-plugin.js",
    "plugin:build": "node scripts/build-plugin.js",
    "plugin:test": "jest --testPathPattern=packages/blocks",
    "plugin:publish": "node scripts/publish-plugin.js"
  }
}
```

## 🚀 배포 전략

### 플러그인 배포 프로세스

```bash
# 1. 플러그인 빌드
npm run build:plugin -- --name=essential

# 2. 번들 크기 확인
npm run analyze -- --plugin=essential

# 3. 테스트
npm run plugin:test essential

# 4. 버전 업데이트
npm version patch --workspace=@o4o/blocks-essential

# 5. 배포
npm run plugin:publish essential
```

### CDN 배포

```javascript
// CDN 설정
const CDN_BASE = 'https://cdn.o4o-platform.com/plugins';

// 플러그인 로드 URL
const getPluginUrl = (pluginId, version) => {
  return `${CDN_BASE}/${pluginId}/${version}/bundle.js`;
};

// 동적 로드
const loadFromCDN = async (pluginId) => {
  const script = document.createElement('script');
  script.src = getPluginUrl(pluginId, 'latest');
  script.async = true;
  
  return new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
```

## 📈 성능 모니터링

### 메트릭 수집

```typescript
// 플러그인 로드 성능 추적
class PerformanceMonitor {
  trackPluginLoad(pluginId: string) {
    const startTime = performance.now();
    
    return {
      complete: () => {
        const loadTime = performance.now() - startTime;
        
        // 분석 서버로 전송
        this.sendMetrics({
          type: 'plugin_load',
          pluginId,
          loadTime,
          timestamp: Date.now(),
          
          // 추가 컨텍스트
          connectionType: navigator.connection?.effectiveType,
          deviceMemory: navigator.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
        });
      }
    };
  }
  
  sendMetrics(data: any) {
    // 배치 처리를 위해 큐에 추가
    this.metricsQueue.push(data);
    
    // 디바운스된 전송
    this.scheduleSend();
  }
}
```

## 🔧 트러블슈팅

### 일반적인 문제 해결

#### 1. 플러그인 로드 실패
```javascript
// 재시도 로직
const loadWithRetry = async (pluginId, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await loadPlugin(pluginId);
      return;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${pluginId}`);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 지수 백오프
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
};
```

#### 2. 순환 의존성
```javascript
// 의존성 검증
const validateDependencies = (plugins) => {
  const graph = buildDependencyGraph(plugins);
  const cycles = detectCycles(graph);
  
  if (cycles.length > 0) {
    throw new Error(`Circular dependencies detected: ${cycles.join(', ')}`);
  }
};
```

## 📝 체크리스트

### 플러그인 개발 체크리스트

- [ ] 플러그인 메타데이터 정의
- [ ] 블록 정의 및 구현
- [ ] 스타일시트 분리
- [ ] 의존성 명시
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 번들 크기 최적화
- [ ] 문서화
- [ ] 버전 관리
- [ ] 배포 준비

---

*최종 업데이트: 2025년 8월*
*구현 가이드 버전: 1.0.0*