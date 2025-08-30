# 🔍 Zone System 추가 조사 보고서

**작성일**: 2024년 8월 30일  
**조사자**: Claude Code  
**목적**: Zone 시스템과 블록 시스템의 차이점 및 종속성 분석

## 1. Zone 시스템 구조 분석

### 1.1 Zone 디렉토리 구성
```
apps/admin-dashboard/src/components/editor/zone/
├── ZoneEditor.tsx          # 메인 Zone 편집기
├── ZoneCanvas.tsx          # Zone 렌더링 캔버스
├── ZoneSelector.tsx        # Zone 선택 UI
├── ZoneBlockRenderer.tsx   # Zone 내 블록 렌더링
├── ZoneConstraintIndicator.tsx  # Zone 제약사항 표시
└── BlockInserter.tsx       # Zone용 블록 추가 UI
```

### 1.2 Zone 전용 블록
Zone 시스템에서만 사용되는 블록:
- **site-logo**: 사이트 로고 (Zone 전용)
- **navigation**: 네비게이션 메뉴 (Zone 전용)

이 블록들은 일반 편집기에서는 등록되지 않았고, Zone 시스템에서만 작동합니다.

### 1.3 Zone과 일반 편집기의 차이점

| 특성 | 일반 편집기 (GutenbergBlockEditor) | Zone 편집기 (ZoneEditor) |
|-----|-----------------------------------|------------------------|
| 구조 | 단일 블록 리스트 | 영역별 블록 그룹 |
| 제약사항 | 없음 | Zone별 허용 블록 제한 |
| 블록 타입 | 모든 블록 사용 가능 | Zone별 허용된 블록만 |
| 레이아웃 | 수직 배열 | Zone 기반 레이아웃 |
| 특수 블록 | 없음 | site-logo, navigation |

## 2. Simplified 블록 종속성 분석

### 2.1 SimplifiedParagraphBlock 사용처
```
총 3개 파일에서 사용:
1. /utils/block-registry.ts (등록)
2. /components/editor/GutenbergBlockEditor.tsx (렌더링)
3. /components/editor/zone/ZoneBlockRenderer.tsx (Zone 렌더링)
```

### 2.2 EnhancedHeadingBlock 사용처
```
총 3개 파일에서 사용:
1. /utils/block-registry.ts (등록)
2. /components/editor/GutenbergBlockEditor.tsx (렌더링)
3. /components/editor/zone/ZoneBlockRenderer.tsx (Zone 렌더링)
```

### 2.3 SimplifiedListBlock 사용처
```
총 2개 파일에서 사용:
1. /utils/block-registry.ts (등록)
2. /components/editor/GutenbergBlockEditor.tsx (렌더링)
```

### 2.4 삭제 영향도 평가
- **낮음**: 모든 Simplified 블록은 2-3개 파일에서만 사용
- **대체 가능**: Enhanced 버전으로 쉽게 교체 가능
- **Zone 시스템 영향**: Zone도 동일한 블록 컴포넌트 사용

## 3. SpectraBlocks 사용 현황

### 3.1 실제 사용처
```
- /pages/test/GutenbergPage.tsx: 주석 처리됨 (사용 안 함)
- /pages/SpectraBlocksDemo.tsx: 데모 페이지 (메인 앱)
- 기타: 문서 파일에만 언급
```

### 3.2 결론
SpectraBlocks는 실제로 사용되지 않고 있으며, 테스트 및 데모 목적으로만 존재합니다.

## 4. 현재 편집기 매핑 시스템

### 4.1 GutenbergBlockEditor의 블록 렌더링 (renderBlock 함수)
```typescript
switch (block.type) {
  case 'core/paragraph':
  case 'paragraph':
    return <SimplifiedParagraphBlock />
  
  case 'core/heading':
  case 'heading':
    return <EnhancedHeadingBlock />
  
  case 'core/list':
  case 'list':
    return <SimplifiedListBlock />
  
  case 'core/image':
  case 'image':
    return <EnhancedImageBlock />
  
  // ... 기타 블록들
}
```

### 4.2 블록 타입 이중 지원
- 모든 블록은 `core/` 프리픽스 있는 버전과 없는 버전 모두 지원
- 예: `core/paragraph`와 `paragraph` 모두 동일하게 처리

### 4.3 Enhanced vs Simplified 선택 알고리즘
**현재 로직**:
- **Paragraph**: Simplified 버전 사용
- **Heading**: Enhanced 버전 사용  
- **List**: Simplified 버전 사용
- **Image**: Enhanced 버전 사용

**패턴 분석**: 
- 복잡한 UI가 필요한 블록(Heading, Image) → Enhanced
- 단순한 텍스트 입력 블록(Paragraph, List) → Simplified

## 5. blocks/ 디렉토리 참조 분석

### 5.1 직접 import 사용처
```
3개 파일에서 "from 'blocks'" 패턴 발견:
1. /pages/appearance/TemplatePartEditor.tsx
2. /components/editor/WordPressBlockEditor.tsx
3. /components/editor/WordPressBlockEditorDynamic.tsx
```

### 5.2 block-manager.ts의 동적 import
```typescript
// block-manager.ts에서 동적 import 시도
case 'core':
  module = await import('@/blocks/core')
case 'layout':
  module = await import('@/blocks/layout')
case 'media':
  module = await import('@/blocks/media')
```

**문제점**: 이 디렉토리들이 실제로 존재하지 않음

## 6. 실제 편집기 작동 테스트 필요 항목

### 6.1 테스트 시나리오
1. **블록 추가 테스트**
   - BlockInserter에서 각 블록 클릭 시 실제 로드되는 컴포넌트 확인
   - 동적 로딩 vs 즉시 로딩 확인

2. **Zone 편집기 테스트**
   - Zone별 블록 제한 작동 확인
   - site-logo, navigation 블록 작동 여부

3. **블록 변환 테스트**
   - Paragraph ↔ Heading 변환 시 컴포넌트 교체 확인

### 6.2 발견된 문제점
1. **block-manager.ts의 동적 import 경로 오류**
   - `@/blocks/core`, `@/blocks/layout` 등 존재하지 않는 경로
   - 실제 블록은 `@/components/editor/blocks/` 디렉토리에 위치

2. **Zone 시스템과 일반 편집기 통합 부재**
   - 두 시스템이 독립적으로 작동
   - 블록 컴포넌트는 공유하지만 등록 시스템은 별개

3. **블록 등록 시스템 파편화**
   - block-registry.ts (새로 생성)
   - BlockInserter의 blockTypes 배열
   - GutenbergBlockEditor의 renderBlock switch문
   - 세 곳이 동기화되지 않음

## 7. 권장 조치 사항

### 즉시 조치 필요
1. **block-manager.ts 수정**
   - 동적 import 경로를 실제 경로로 수정
   - 또는 block-manager.ts 삭제 (사용되지 않음)

2. **블록 등록 통합**
   - block-registry.ts를 유일한 source of truth로 만들기
   - BlockInserter와 GutenbergBlockEditor가 registry 사용하도록 수정

3. **Simplified 버전 정리**
   - SimplifiedParagraphBlock → EnhancedParagraphBlock 통합
   - SimplifiedListBlock → EnhancedListBlock 통합

### 중기 계획
1. **Zone 시스템 통합**
   - Zone 전용 블록을 block-registry에 추가
   - Zone 제약사항을 registry에서 관리

2. **동적 로딩 구현**
   - 실제 작동하는 lazy loading 구현
   - 번들 크기 최적화

## 8. 결론

### 핵심 발견 사항
1. **Zone 시스템은 독립적으로 작동**: 일반 편집기와 별개 시스템
2. **Simplified 블록은 삭제 가능**: 종속성이 적고 Enhanced로 대체 가능
3. **block-manager.ts는 작동하지 않음**: 잘못된 import 경로
4. **블록 등록이 3곳에 분산**: 통합 필요

### 최종 권장사항
1. block-registry.ts를 중심으로 블록 시스템 통합
2. Simplified 버전을 Enhanced 버전으로 통합
3. Zone 시스템과 일반 편집기 통합 계획 수립
4. 동적 로딩은 실제 경로 수정 후 구현

---

**다음 단계**: 
- 실제 편집기에서 블록 추가/수정 테스트
- block-registry.ts 기반 통합 구현
- Zone 시스템 통합 계획 수립