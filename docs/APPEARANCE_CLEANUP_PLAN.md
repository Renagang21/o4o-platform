# 외모(Appearance) 시스템 정비 실행 계획

## 목표
디자인 토큰과 CSS 생성 로직을 **단일 패키지로 통합**하여 코드 중복을 제거하고 유지보수성을 극대화

## Phase 1: 통합 패키지 생성 (2일)

### 1.1 패키지 구조 생성
```bash
# 실행 명령
mkdir -p packages/appearance-system/src/{tokens,generators,injectors,types}
cd packages/appearance-system
pnpm init
```

### 1.2 패키지 구성
```typescript
// packages/appearance-system/package.json
{
  "name": "@o4o/appearance-system",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./tokens": "./dist/tokens/index.js",
    "./generators": "./dist/generators/index.js"
  }
}
```

### 1.3 핵심 모듈 구현
```typescript
// src/tokens/index.ts - 디자인 토큰 정의
export const tokens = {
  colors: { /* 통합된 색상 토큰 */ },
  spacing: { /* 간격 토큰 */ },
  typography: { /* 타이포그래피 토큰 */ }
};

// src/generators/index.ts - CSS 생성기 통합
export { generateCSS } from './css-generator';
export { generateButtonCSS } from './button';
export { generateBreadcrumbCSS } from './breadcrumb';
// ... 기타 생성기

// src/types/index.ts - 타입 정의
export interface DesignTokens { /* ... */ }
export interface CustomizerSettings { /* ... */ }
```

### 체크리스트
- [x] 패키지 디렉토리 생성
- [x] package.json 설정
- [x] TypeScript 설정
- [x] 빌드 스크립트 구성
- [ ] 테스트 환경 설정 (Phase 2)

## Phase 2: 기존 코드 마이그레이션 (3일)

### 2.1 CSS 생성기 통합
```typescript
// 이전 (3곳에 중복)
// apps/admin-dashboard/src/.../css-generator.ts
// apps/main-site/src/utils/css-generator.ts
// apps/api-server/src/utils/customizer/css-generator.ts

// 이후 (통합)
import { generateCSS } from '@o4o/appearance-system';
```

### 2.2 수정 대상 파일 목록
| 파일 경로 | 작업 | 우선순위 |
|-----------|------|----------|
| admin-dashboard/.../css-generator.ts | 패키지 import로 교체 | 1 |
| main-site/utils/css-generator.ts | 패키지 import로 교체 | 1 |
| api-server/.../css-generator.ts | 패키지 import로 교체 | 1 |
| CustomizerContext.tsx | generateCSS import 변경 | 2 |
| GlobalStyleInjector.tsx | generateCSS import 변경 | 2 |

### 체크리스트
- [ ] Admin Dashboard 마이그레이션
- [ ] Main Site 마이그레이션
- [ ] API Server 마이그레이션
- [ ] 빌드 테스트 통과
- [ ] 기능 테스트 통과

## Phase 3: 컴포넌트 CSS 변수 전환 (1주)

### 3.1 우선순위별 컴포넌트 목록

#### 🔴 긴급 (하드코딩 100%)
1. **Button**
   - 현재: Tailwind 클래스 직접 사용
   - 목표: CSS 변수 기반 클래스

2. **ScrollToTop**
   - 현재: 인라인 스타일
   - 목표: CSS 변수 참조

3. **BlogCard**
   - 현재: Tailwind 하드코딩
   - 목표: 테마 대응 가능

#### 🟡 중요 (부분적 사용)
1. **Breadcrumbs** (50% 변수 사용)
2. **Header** (30% 변수 사용)
3. **MiniCart**

### 3.2 마이그레이션 예시
```tsx
// Before
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">

// After
<button className="btn-primary">
// CSS
.btn-primary {
  background: var(--o4o-button-primary-bg);
  color: var(--o4o-button-primary-text);
  padding: var(--o4o-button-padding-y) var(--o4o-button-padding-x);
  border-radius: var(--o4o-button-radius);
}
```

### 체크리스트
- [ ] Button 컴포넌트 전환
- [ ] ScrollToTop 전환
- [ ] BlogCard 전환
- [ ] Breadcrumbs 완전 전환
- [ ] Header 완전 전환
- [ ] 시각적 회귀 테스트

## Phase 4: 네이밍 표준화 (2일)

### 4.1 새로운 네이밍 컨벤션
```css
/* 기존 혼재된 변수들 */
--wp-color-primary
--ast-primary-color
--button-bg

/* 통합 네이밍 */
--o4o-color-primary
--o4o-button-bg
--o4o-spacing-xs
```

### 4.2 마이그레이션 전략
1. 새 변수 추가 (공존 기간)
2. 컴포넌트 점진적 업데이트
3. 레거시 변수 제거

### 체크리스트
- [x] 네이밍 규칙 문서화
- [x] 변수 매핑 테이블 작성
- [x] 자동 변환 스크립트 작성
- [x] 레거시 호환성 레이어 구현
- [x] 최종 레거시 제거

### Phase 4 완료 보고 (2025-11-06)

**실행 내용**:
1. ✅ **CSS 생성기 정리** (`packages/appearance-system/src/css-generators.ts`)
   - 레거시 변수 생성 제거 (`--button-*`, `--breadcrumb-*`, `--scroll-top-*`)
   - `--o4o-*` 표준 변수만 생성하도록 변경
   - Button, Breadcrumb, ScrollToTop 생성기 모두 업데이트

2. ✅ **유틸리티 CSS 정리** (`apps/main-site/src/styles/appearance-utilities.css`)
   - 3-tier 폴백 체인 제거 → 1-tier로 단순화
   - `var(--o4o-*, var(--legacy-*, #hex))` → `var(--o4o-*)`로 변경
   - @deprecated 섹션 및 문서 정리
   - "Phase 4: Legacy Variable Removal Complete" 헤더 추가

3. ✅ **Breadcrumbs 컴포넌트** (`apps/main-site/src/components/common/Breadcrumbs.tsx`)
   - `${settings.hoverColor}` 폴백 제거
   - `${settings.linkColor}` 폴백 제거
   - @deprecated 주석 제거
   - CSS 변수만 사용하도록 정리

4. ✅ **WordPress Blocks CSS** (`apps/main-site/src/styles/wordpress-blocks.css`)
   - 모든 레거시 변수를 `--o4o-*`로 변경
   - Button: `--button-primary-*` → `--o4o-button-*`
   - Breadcrumb: `--breadcrumb-*-color` → `--o4o-breadcrumb-*`
   - Scroll-to-top: `--scroll-top-*` → `--o4o-scroll-top-*`

5. ✅ **Custom CSS Autocomplete** (`apps/admin-dashboard/.../CustomCSSSection.tsx`)
   - `--o4o-*` 표준 변수 추가 (우선 표시)
   - 레거시 변수는 하위 호환성 위해 유지 (deprecated 표시)

**검증 결과**:
- ✅ TypeScript 빌드 성공 (appearance-system)
- ✅ Main-site 빌드 성공
- ✅ Admin-dashboard 타입 체크 완료
- ✅ 레거시 변수 검색 결과: 테스트/deprecated 파일에만 존재

**영향 범위**:
- 5개 파일 수정
- 0개 파일 추가
- 0개 파일 삭제
- Bundle 크기 변화: 영향 없음 (CSS 변수명만 변경)

### Phase 6 완료 보고 (2025-11-06)

**실행 내용**:
1. ✅ **CSS 생성기 정리**
   - 레거시 Button/Breadcrumb/ScrollToTop 함수 제거
   - Admin-dashboard, Main-site, API-server 모두 업데이트
   - @deprecated 주석 추가 (Phase 7 migration 안내)

2. ✅ **테스트 업데이트**
   - 레거시 변수 기대값 제거 (`--button-primary-*`, `--breadcrumb-*-color`, `--scroll-top-*`)
   - 표준 변수만 검증 (`--o4o-*`)

3. ✅ **빌드 검증**
   - appearance-system: 빌드 성공
   - main-site: 빌드 성공 (4.82s)
   - 레거시 변수 검색: CustomCSSSection.tsx만 남음 (의도적 유지 for autocomplete)

**검증 결과**:
- ✅ TypeScript 빌드 성공 (appearance-system)
- ✅ Main-site 빌드 성공 (4.82s)
- ✅ 레거시 변수 제거 완료 (autocomplete 제외)
- ✅ 테스트 기대값 업데이트 완료

**영향 범위**:
- 6개 파일 수정
- ~150줄 삭제 (레거시 함수 제거)
- 0개 파일 추가
- Bundle 크기 변화: 영향 없음 (legacy generation만 제거)

**Status**: ✅ Phase 6 Complete

**Next Steps (Phase 7)**:
- Expand @o4o/appearance-system to handle header, footer, typography, blog CSS
- Remove deprecated css-generator files completely
- Full migration to centralized appearance system

## Phase 5: 문서화 및 가이드 (2일)

### 5.1 작성할 문서
1. **APPEARANCE_TOKENS.md**
   - 모든 디자인 토큰 레퍼런스
   - 사용 예시

2. **STYLING_GUIDE.md**
   - 컴포넌트 스타일링 규칙
   - 금지/권장 패턴

3. **MIGRATION_GUIDE.md**
   - 레거시 → 신규 전환 가이드
   - 체크리스트

### 체크리스트
- [ ] 토큰 레퍼런스 작성
- [ ] 스타일링 가이드 작성
- [ ] 마이그레이션 가이드 작성
- [ ] Storybook 통합
- [ ] 팀 교육 자료 준비

## 검증 및 품질 보증

### 테스트 전략
1. **단위 테스트**: 각 CSS 생성 함수
2. **통합 테스트**: 전체 CSS 생성 파이프라인
3. **시각적 테스트**: Storybook/Chromatic
4. **성능 테스트**: 빌드 크기, 렌더링 속도

### 스모크 테스트 시나리오
- [ ] Admin에서 색상 변경 → Main Site 반영 확인
- [ ] 다크모드 토글 → 전체 컴포넌트 확인
- [ ] 버튼 스타일 변경 → 모든 버튼 확인
- [ ] 브레드크럼 스타일 → 경로 표시 확인
- [ ] 스크롤투탑 → 위치/스타일 확인

## 롤백 계획

### Phase별 롤백 포인트
1. **Phase 1 롤백**: 패키지 제거만
2. **Phase 2 롤백**: import 원복 (git revert)
3. **Phase 3 롤백**: 컴포넌트별 개별 롤백
4. **Phase 4 롤백**: 레거시 변수 유지
5. **Phase 5 롤백**: 해당 없음 (문서만)

## 일정 및 마일스톤

| Phase | 기간 | 시작일 | 완료일 | 담당자 |
|-------|------|--------|--------|--------|
| Phase 1 | 2일 | 11/6 | 11/7 | - |
| Phase 2 | 3일 | 11/8 | 11/10 | - |
| Phase 3 | 5일 | 11/11 | 11/15 | - |
| Phase 4 | 2일 | 11/16 | 11/17 | - |
| Phase 5 | 2일 | 11/18 | 11/19 | - |

**총 소요 기간**: 14일 (2주)

## 성공 지표

### 정량적 지표
- 코드 중복: 2,100줄 → 0줄 (100% 제거)
- 빌드 크기: 15KB 감소
- 유지보수 시간: 67% 감소
- CSS 변수 사용률: 30% → 100%

### 정성적 지표
- 테마 변경 용이성 대폭 향상
- 개발자 경험 개선
- 디자인 일관성 확보
- 확장성 향상

## 위험 요소 및 대응

| 위험 | 확률 | 영향 | 대응 방안 |
|------|------|------|-----------|
| 시각적 회귀 | 중 | 높음 | Storybook 스냅샷 테스트 |
| 성능 저하 | 낮음 | 중간 | 벤치마크 테스트 |
| 레거시 호환성 | 중 | 낮음 | 점진적 마이그레이션 |
| 빌드 실패 | 낮음 | 높음 | CI/CD 파이프라인 강화 |

## 다음 단계 체크리스트

### 즉시 시작 (Day 1)
- [ ] 프로젝트 킥오프 미팅
- [ ] 패키지 디렉토리 생성
- [ ] 기본 구조 설정

### 1주차 완료 목표
- [ ] Phase 1-2 완료
- [ ] 핵심 통합 완료
- [ ] 테스트 통과

### 2주차 완료 목표
- [ ] Phase 3-5 완료
- [ ] 전체 마이그레이션 완료
- [ ] 문서화 완료

---

*작성일: 2024-11-05*
*작성자: Claude*
*승인 필요: 프로젝트 리드*