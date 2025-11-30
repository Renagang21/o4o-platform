# 📦 블록 번들 사이즈 최적화 전략

## 🎯 목표
현재 모든 블록이 하나의 번들에 포함되어 초기 로딩 시간이 길어지는 문제를 해결하기 위해, 블록들을 여러 개의 독립적인 플러그인으로 분리하여 번들 사이즈를 최소화합니다.

## 📊 현재 상황 분석

### 문제점
1. **단일 번들 문제**: 모든 블록이 하나의 번들에 포함 (~2.5MB+)
2. **불필요한 로딩**: 사용하지 않는 블록도 모두 로드
3. **WordPress 의존성**: @wordpress/* 패키지들의 중복 로딩
4. **초기 로딩 지연**: 큰 번들 사이즈로 인한 FCP/TTI 지연

### 현재 블록 구조 및 의존성

```
블록 카테고리별 의존성:
- Core Blocks: @wordpress/block-editor, @wordpress/components
- Media Blocks: @wordpress/media-utils, 이미지 처리 라이브러리
- Layout Blocks: CSS Grid/Flexbox 유틸리티
- Interactive: Form 라이브러리, 검증 로직
- Advanced: ACF API, CPT 관련 로직
```

## 🔍 번들 사이즈 영향도 분석

### 예상 번들 크기 (압축 전)

| 블록 그룹 | 포함 블록 | 예상 크기 | 의존성 |
|---------|----------|---------|--------|
| **Core Essential** | paragraph, heading, list | ~100KB | 최소 WP 의존성 |
| **Core Extended** | quote, code, html | ~80KB | 추가 포맷팅 |
| **Layout Basic** | columns, group, spacer | ~120KB | 레이아웃 CSS |
| **Layout Advanced** | cover, separator | ~100KB | 고급 레이아웃 |
| **Media Basic** | image, gallery | ~200KB | 이미지 처리 |
| **Media Rich** | video, audio, embed | ~300KB | 미디어 플레이어 |
| **Interactive** | button, search, table | ~150KB | 이벤트 핸들러 |
| **Forms** | form, input, select | ~250KB | 검증 로직 |
| **Site Structure** | header, footer, nav | ~180KB | 사이트 구조 |
| **E-commerce** | product, cart, checkout | ~400KB | 상거래 로직 |
| **Advanced** | shortcode, cpt-acf | ~350KB | 커스텀 로직 |

## 📈 사용 빈도 기반 분류

### Tier 1: 필수 (항상 로드)
```
@o4o/blocks-essential (약 100KB)
├── paragraph
├── heading
└── image
```

### Tier 2: 자주 사용 (Lazy Load)
```
@o4o/blocks-common (약 200KB)
├── list
├── columns
├── button
└── gallery
```

### Tier 3: 특정 용도 (On-Demand)
```
@o4o/blocks-media (약 300KB)
├── video
├── audio
└── embed

@o4o/blocks-forms (약 250KB)
├── form
├── input
└── validation

@o4o/blocks-commerce (약 400KB)
├── product
├── cart
└── checkout
```

### Tier 4: 고급 기능 (선택적)
```
@o4o/blocks-advanced (약 350KB)
├── cpt-acf-loop
├── shortcode
└── reusable
```

## 🎨 최적화된 플러그인 구조

### 1. 초소형 플러그인 전략 (권장)

```javascript
// 각 플러그인을 10-15개 블록으로 제한
// 총 15-20개의 작은 플러그인으로 분할

플러그인 구조:
├── @o4o/blocks-text (50KB)
│   ├── paragraph
│   ├── heading
│   └── list
│
├── @o4o/blocks-media-basic (80KB)
│   ├── image
│   └── gallery
│
├── @o4o/blocks-media-video (150KB)
│   ├── video
│   └── youtube-embed
│
├── @o4o/blocks-layout-grid (60KB)
│   ├── columns
│   └── grid
│
└── @o4o/blocks-layout-spacing (40KB)
    ├── spacer
    └── separator
```

### 2. 기능별 그룹화 전략

```javascript
// 관련 기능끼리 묶어서 5-7개의 중간 크기 플러그인

플러그인 구조:
├── @o4o/blocks-content (200KB)
│   ├── text blocks
│   └── formatting blocks
│
├── @o4o/blocks-media (350KB)
│   ├── image blocks
│   └── video blocks
│
├── @o4o/blocks-layout (250KB)
│   ├── container blocks
│   └── spacing blocks
│
├── @o4o/blocks-interactive (300KB)
│   ├── form blocks
│   └── dynamic blocks
│
└── @o4o/blocks-commerce (400KB)
    ├── product blocks
    └── checkout blocks
```

## 🚀 구현 우선순위

### Phase 1: 핵심 분리 (1주)
```
목표: 가장 자주 사용되는 블록들을 별도 플러그인으로
- @o4o/blocks-essential 생성
- 번들 크기 100KB 이하 목표
- 즉시 로드
```

### Phase 2: 미디어 분리 (1주)
```
목표: 무거운 미디어 블록들을 분리
- @o4o/blocks-media-image
- @o4o/blocks-media-video
- Lazy loading 구현
```

### Phase 3: 레이아웃 분리 (1주)
```
목표: 레이아웃 관련 블록 최적화
- @o4o/blocks-layout-basic
- @o4o/blocks-layout-advanced
- CSS 최적화 포함
```

### Phase 4: 고급 기능 분리 (2주)
```
목표: 특수 목적 블록들 분리
- @o4o/blocks-forms
- @o4o/blocks-commerce
- @o4o/blocks-advanced
- 조건부 로딩 구현
```

## 📉 예상 효과

### Before (현재)
```
Initial Bundle: 2.5MB
- 모든 블록 포함
- 모든 의존성 포함
- First Load: 3-5초 (3G)
```

### After (최적화 후)
```
Initial Bundle: 100KB (-96%)
- 필수 블록만 포함
- 최소 의존성

Lazy Loaded:
- Common: +200KB (필요시)
- Media: +300KB (필요시)
- Advanced: +350KB (필요시)

First Load: 0.5-1초 (3G)
Total Potential: 1.25MB (-50%)
```

## 🔧 기술적 구현

### 1. Webpack 설정

```javascript
// webpack.config.js
module.exports = {
  entry: {
    'blocks-essential': './src/plugins/essential/index.ts',
    'blocks-media': './src/plugins/media/index.ts',
    'blocks-layout': './src/plugins/layout/index.ts',
    // ... 각 플러그인별 엔트리
  },
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        wordpress: {
          test: /[\\/]node_modules[\\/]@wordpress[\\/]/,
          name: 'wordpress-vendor',
          priority: 30,
        },
        common: {
          minChunks: 2,
          priority: 20,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
  },
  
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
};
```

### 2. 동적 임포트 전략

```typescript
// 블록 로더
class BlockLoader {
  private loadedPlugins = new Set<string>();
  
  async loadPlugin(pluginName: string) {
    if (this.loadedPlugins.has(pluginName)) {
      return;
    }
    
    switch(pluginName) {
      case 'media':
        await import(
          /* webpackChunkName: "blocks-media" */
          /* webpackPreload: true */
          '@o4o/blocks-media'
        );
        break;
        
      case 'forms':
        await import(
          /* webpackChunkName: "blocks-forms" */
          /* webpackPrefetch: true */
          '@o4o/blocks-forms'
        );
        break;
        
      // ... 다른 플러그인들
    }
    
    this.loadedPlugins.add(pluginName);
  }
  
  // 사용 패턴 분석 기반 프리로딩
  async preloadCommon() {
    const commonPlugins = ['layout', 'media-basic'];
    await Promise.all(
      commonPlugins.map(p => this.loadPlugin(p))
    );
  }
}
```

### 3. 플러그인 매니페스트

```json
// plugin-manifest.json
{
  "plugins": [
    {
      "id": "blocks-essential",
      "name": "Essential Blocks",
      "version": "1.0.0",
      "size": "100KB",
      "blocks": ["paragraph", "heading", "image"],
      "loadStrategy": "immediate",
      "dependencies": []
    },
    {
      "id": "blocks-media",
      "name": "Media Blocks",
      "version": "1.0.0",
      "size": "300KB",
      "blocks": ["video", "audio", "gallery"],
      "loadStrategy": "lazy",
      "dependencies": ["blocks-essential"]
    },
    {
      "id": "blocks-forms",
      "name": "Form Blocks",
      "version": "1.0.0",
      "size": "250KB",
      "blocks": ["form", "input", "select"],
      "loadStrategy": "on-demand",
      "dependencies": ["blocks-essential"]
    }
  ]
}
```

## 📊 모니터링 메트릭

### 추적할 지표

1. **번들 크기**
   - 각 플러그인별 크기
   - 총 다운로드 크기
   - 압축률

2. **로딩 성능**
   - FCP (First Contentful Paint)
   - TTI (Time to Interactive)
   - 블록 렌더링 시간

3. **사용 패턴**
   - 가장 많이 사용되는 블록
   - 플러그인 활성화 빈도
   - 사용자별 블록 조합

### 분석 도구

```typescript
// 플러그인 사용 분석
class PluginAnalytics {
  trackPluginLoad(pluginId: string, loadTime: number) {
    analytics.track('plugin_loaded', {
      pluginId,
      loadTime,
      bundleSize: this.getPluginSize(pluginId),
      timestamp: Date.now()
    });
  }
  
  getOptimizationSuggestions() {
    const usage = this.getUsagePatterns();
    return {
      preload: usage.frequent,
      lazy: usage.occasional,
      onDemand: usage.rare
    };
  }
}
```

## 🎯 성공 지표

### 단기 목표 (1개월)
- [ ] 초기 번들 크기 80% 감소
- [ ] FCP 2초 이내 (3G)
- [ ] 코어 블록 분리 완료

### 중기 목표 (3개월)
- [ ] 모든 블록 플러그인화
- [ ] 동적 로딩 시스템 구축
- [ ] 사용 패턴 기반 최적화

### 장기 목표 (6개월)
- [ ] 플러그인 마켓플레이스
- [ ] 서드파티 블록 지원
- [ ] 자동 최적화 시스템

## 📝 체크리스트

### 플러그인 분리 시 고려사항

- [ ] 블록 간 의존성 분석
- [ ] 공통 컴포넌트 추출
- [ ] CSS/스타일 분리
- [ ] 아이콘/이미지 최적화
- [ ] Tree shaking 적용
- [ ] 중복 코드 제거
- [ ] 번들 분석 리포트
- [ ] 성능 테스트
- [ ] 사용자 테스트
- [ ] 문서화

---

*최종 업데이트: 2025년 8월*
*목표: 번들 사이즈 최소화를 통한 성능 최적화*