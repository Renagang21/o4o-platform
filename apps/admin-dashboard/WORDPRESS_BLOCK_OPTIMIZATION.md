# WordPress Block Editor 최적화 전략

## 현재 문제점
- `wp-block-editor-D39fBYcr.js`: **2.0MB** (gzip: 474KB)
- 초기 로드 시 너무 큰 용량으로 성능 저하
- 모든 블록 기능이 한 번에 로드됨

## 최적화 전략

### 1. 블록 그룹화 전략

#### 기본 블록 (Core) - 우선순위: 높음
- 단락 (Paragraph)
- 제목 (Heading)
- 리스트 (List)
- 이미지 (Image)
- **목표 크기**: ~200KB

#### 레이아웃 블록 (Layout) - 우선순위: 중간
- 컬럼 (Columns)
- 그룹 (Group)
- 구분선 (Separator)
- 스페이서 (Spacer)
- **목표 크기**: ~150KB

#### 미디어 블록 (Media) - 우선순위: 낮음
- 갤러리 (Gallery)
- 비디오 (Video)
- 오디오 (Audio)
- 파일 (File)
- **목표 크기**: ~100KB

#### 고급 블록 (Advanced) - 우선순위: 낮음
- 테이블 (Table)
- 코드 (Code)
- 사용자 정의 HTML
- 재사용 블록
- **목표 크기**: ~100KB

### 2. 구현 계획

#### 즉시 구현 (Phase 1)
1. WordPress 모듈 동적 임포트 최적화
2. 블록 레지스트리 지연 로딩
3. 필수 블록만 초기 로드

#### 단기 구현 (Phase 2)
1. 블록별 코드 스플리팅
2. 사용자 패턴 분석 기반 프리로딩
3. 블록 에디터 컴포넌트 트리 쉐이킹

#### 중기 구현 (Phase 3)
1. 블록 에디터 커스텀 빌드
2. 사용하지 않는 블록 제거
3. 블록 기능 모듈화

## 예상 효과
- **현재**: 2.0MB (gzip: 474KB)
- **목표**: 550KB (gzip: ~150KB)
- **감소율**: 66% 크기 감소

## 기술적 구현

### Vite 설정 최적화
```typescript
// 블록 에디터를 기능별로 분리
manualChunks: {
  'wp-block-editor-core': [
    '@wordpress/block-editor/build/components/block-list',
    '@wordpress/block-editor/build/components/block-tools',
    '@wordpress/block-editor/build/components/writing-flow'
  ],
  'wp-block-editor-ui': [
    '@wordpress/block-editor/build/components/block-inspector',
    '@wordpress/block-editor/build/components/block-toolbar',
    '@wordpress/block-editor/build/components/inserter'
  ],
  'wp-block-editor-formats': [
    '@wordpress/block-editor/build/components/rich-text',
    '@wordpress/block-editor/build/components/url-input',
    '@wordpress/block-editor/build/components/link-control'
  ]
}
```

### 동적 로딩 구현
```typescript
// 블록을 필요할 때만 로드
const loadBlockModule = async (blockType: string) => {
  switch(blockType) {
    case 'core':
      return import(/* webpackChunkName: "blocks-core" */ './blocks/core');
    case 'layout':
      return import(/* webpackChunkName: "blocks-layout" */ './blocks/layout');
    case 'media':
      return import(/* webpackChunkName: "blocks-media" */ './blocks/media');
    case 'advanced':
      return import(/* webpackChunkName: "blocks-advanced" */ './blocks/advanced');
  }
};
```

## 모니터링 지표
- 초기 로드 시간 (Time to Interactive)
- 블록 에디터 초기화 시간
- 메모리 사용량
- 네트워크 전송량