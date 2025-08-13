# 빌드 최적화 - 제거/최적화 대상 파일 리스트

## 1. 즉시 제거 가능한 파일들
- [ ] `/src/blocks/cpt-acf-loop/render.php` (30KB) - PHP 파일, React 앱에서 불필요
- [ ] `/src/blocks/cpt-acf-loop/test-cpt-plugin.php` (26KB) - PHP 테스트 파일
- [ ] 중복 파일: ProductVariationManager.tsx가 2개 존재
  - `/src/components/products/ProductVariationManager.tsx` (22KB)
  - `/src/components/ecommerce/ProductVariationManager.tsx` (23KB)

## 2. 테스트 관련 파일들 (총 624KB)
**프로덕션 빌드에서는 자동 제외되지만 소스 크기 감소 가능**
- `/src/test-utils/mocks/handlers.ts` (31KB)
- `/src/components/users/__tests__/` 디렉토리 (80KB)
- `/src/pages/Users/__tests__/` 디렉토리 (36KB)
- `/src/test/` 디렉토리 (392KB)
- 19개의 *.test.tsx, *.spec.tsx 파일들

## 3. 대용량 소스 파일들 (최적화 필요)
### 코드 분할 대상
- **App.tsx** (41KB, 897줄) - 85개 라우트 포함
  - 라우트를 별도 파일로 분리 권장
  
- **types/dashboard-api.ts** (48KB, 1715줄)
  - 타입 정의를 도메인별로 분리 권장
  
- **GutenbergEditor.tsx** (41KB, 1026줄)
  - WordPress 편집기 - 동적 import로 변경 필요

### 컴포넌트 최적화 대상
- **WidgetBuilder.tsx** (30KB, 904줄)
- **TemplateBuilder.tsx** (25KB)
- **GutenbergStyleEditor.tsx** (25KB)
- **BlockEditor.tsx** (23KB)

## 4. WordPress 블록 관련 (총 약 200KB)
**편집기 페이지에서만 필요, 다른 페이지에서는 불필요**
- `/src/blocks/` 디렉토리 전체
- 특히 cover 블록 (12KB)은 사용 빈도 낮음

## 5. 빌드 캐시 파일
- **tsconfig.tsbuildinfo** (947KB) - gitignore 되어있지만 로컬 빌드 속도 저하

## 권장 조치 사항

### 즉시 실행
1. PHP 파일 제거 (56KB 절감)
2. 중복 ProductVariationManager 통합 (22KB 절감)
3. App.tsx 라우트 분리 (코드 가독성 + 번들 크기 개선)

### 단계적 실행
1. WordPress 블록 동적 로딩 구현
2. 대용량 컴포넌트 코드 분할
3. 타입 정의 파일 도메인별 분리

### 예상 효과
- 초기 번들 크기 약 30-40% 감소
- 빌드 시간 단축
- 코드 유지보수성 향상