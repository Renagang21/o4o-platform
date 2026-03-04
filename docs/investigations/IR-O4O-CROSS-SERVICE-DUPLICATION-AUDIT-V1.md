# IR-O4O-CROSS-SERVICE-DUPLICATION-AUDIT-V1

> **O4O 서비스 간 중복 코드 조사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 목적: 중복 코드를 제거하는 것이 아니라 **공통 Core 라이브러리로 승격할 후보를 찾는 것**

---

## 1. 조사 대상

| # | 서비스 | 경로 |
|---|--------|------|
| 1 | Neture | `services/web-neture/` |
| 2 | KPA Society | `services/web-kpa-society/` |
| 3 | GlycoPharm | `services/web-glycopharm/` |
| 4 | K-Cosmetics | `services/web-k-cosmetics/` |
| 5 | GlucoseView | `services/web-glucoseview/` |
| 6 | Admin Dashboard | `apps/admin-dashboard/` |

---

## 2. 중복 수치 요약

### 전체 중복량

| 분류 | 파일 수 | 추정 줄수 | 심각도 |
|------|--------|----------|--------|
| IDENTICAL (100%) | 6개 주요 파일 | ~742줄 | **CRITICAL** |
| SIMILAR (80~98%) | 8개 주요 파일 | ~3,455줄 | **HIGH** |
| PATTERN (70~79%) | 4개 주요 파일 | ~805줄 | MEDIUM |
| **합계** | **18개 파일군** | **~5,000줄** | |

### 서비스별 중복 부하

| 서비스 | 중복 LOC | 중복 비율 | 비고 |
|--------|---------|----------|------|
| GlucoseView | ~1,500 | ~75% | 코드베이스 최소, 중복 비율 최대 |
| K-Cosmetics | ~1,900 | ~70% | GlycoPharm 미러 구조 |
| GlycoPharm | ~2,200 | ~65% | 중복 LOC 최대 |
| KPA Society | ~2,100 | ~60% | 고유 API 18+ 모듈 보유 |
| Neture | ~1,600 | ~55% | 고유 레이아웃 다수 |
| Admin Dashboard | ~500 | ~20% | 가장 독립적 |

---

## 3. 중복 컴포넌트 상세

### Tier 1: CRITICAL (5개 서비스, 거의 동일)

| 컴포넌트 | 서비스 | 줄수 | 분류 |
|----------|--------|------|------|
| **AuthContext.tsx** | kpa, glyco, cosmetics, glucose, neture | 191~477 | SIMILAR (95%+) |
| **RoleGuard.tsx** | kpa, glyco, cosmetics, glucose, neture | ~40 | IDENTICAL (99%) |
| **LoginModal.tsx** | kpa, glyco, cosmetics, glucose | 80~120 | PATTERN (85%+) |
| **AiPreviewModal.tsx** | kpa, glyco, cosmetics, glucose, neture | ~100 | IDENTICAL (98%+) |
| **AiSummaryButton.tsx** | kpa, glyco, cosmetics, glucose, neture | ~80 | IDENTICAL (98%+) |
| **AiSummaryModal.tsx** | kpa, glyco, cosmetics, glucose, neture | ~100 | SIMILAR (95%+) |

### Tier 2: HIGH (3~4개 서비스)

| 컴포넌트 | 서비스 | 줄수 | 분류 |
|----------|--------|------|------|
| **ai/icons.tsx** | glyco, cosmetics, kpa | 141 | IDENTICAL (100%) |
| **TestGuideLayout.tsx** | 5개 전부 | 59~130 | SIMILAR (80%+) |
| **LoginModalContext.tsx** | glyco, cosmetics, neture, glucose | 60~66 | SIMILAR (90%+) |
| **Header.tsx** | kpa, glyco, cosmetics | 50~100 | PATTERN (75%+) |
| **Footer.tsx** | kpa, glyco, cosmetics | 50~155 | PATTERN (70%+) |

### Tier 3: MEDIUM (2~3개 서비스)

| 컴포넌트 | 서비스 | 줄수 | 분류 |
|----------|--------|------|------|
| **PartnerLayout.tsx** | glyco, cosmetics, glucose | 162~237 | SIMILAR (75%+) |
| **DashboardLayout.tsx** | glyco, cosmetics | 393~443 | SIMILAR (80%+) |
| **MainLayout.tsx** | glyco, cosmetics, neture | 15~101 | PATTERN (70%+) |

---

## 4. API Client 중복

### IDENTICAL (거의 동일)

| API 모듈 | 서비스 | 줄수 | 차이점 |
|----------|--------|------|--------|
| **health.ts** | kpa, glyco, cosmetics, neture | 34 | 없음 |
| **cms.ts** | glyco, cosmetics | 121 | serviceKey 2줄만 다름 |
| **signageV2.ts** | glyco, cosmetics, kpa, neture | 40+ | type import만 다름 |

### SIMILAR (구조 유사)

| API 모듈 | 서비스 | 비고 |
|----------|--------|------|
| **assetSnapshot.ts** | glyco (50줄), kpa (239줄) | KPA가 확장 버전 |
| **pharmacyProducts.ts** | glyco, kpa | 동일 엔드포인트, 네이밍 차이 |

### 서비스별 고유 API (중복 아님)

| 서비스 | 고유 API 수 | 주요 모듈 |
|--------|------------|----------|
| KPA Society | 18+ | forum, groupbuy, lms, admin, blog, tablet, operator 등 |
| GlycoPharm | 6 | glycopharm, store, pharmacy, public |
| Neture | 3 | products, trial |
| K-Cosmetics | 3 | cosmetics-specific |
| GlucoseView | 2 | glucoseview-specific |

---

## 5. Hooks 중복

**결과: 최소한의 중복**

각 서비스가 특화된 hooks를 자체 구현. 서비스 간 동일 hook 발견되지 않음.

| 항목 | 결과 |
|------|------|
| useAuth | 각 서비스 AuthContext에 내장 (Context 중복의 일부) |
| usePagination | 발견 안 됨 |
| useDebounce | 발견 안 됨 |
| useFetch | 발견 안 됨 |

**판정**: Hooks 중복은 AuthContext에 포함된 useAuth만 해당. 독립 hooks 중복은 없음.

---

## 6. Utils/Lib 중복

| 파일 | 서비스 | 줄수 | 분류 |
|------|--------|------|------|
| **auth-utils.ts** | glyco (23줄), kpa (19줄) | 동일 | IDENTICAL (95%) — SSOT role mapping |
| **signageV2.ts** | glyco, cosmetics, kpa, neture | 40+ | SIMILAR (90%) — type import만 다름 |

**판정**: Utils 중복은 auth-utils와 signage API에 집중. formatDate, slugify 등 일반 유틸리티 중복은 미발견.

---

## 7. Styles/Theme 중복

| 항목 | 결과 |
|------|------|
| 공유 theme.ts | ❌ 없음 |
| 공유 Design Token | ❌ 없음 |
| KPA | `styles/theme.ts`에서 `colors.primary` 사용 |
| 기타 서비스 | Tailwind CSS 직접 사용 |

**판정**: 테마 시스템이 표준화되어 있지 않음. KPA만 자체 테마 파일 보유. 다른 서비스는 Tailwind 직접 사용.

---

## 8. Auth/Context 중복 (가장 심각)

### AuthContext — 5개 서비스 중복

| 서비스 | 줄수 | 포함 기능 |
|--------|------|----------|
| KPA Society | 477 | 가장 완전 (Service User, 역할 매핑, 게스트 auth) |
| GlycoPharm | ~350 | Service User, 역할 매핑 |
| K-Cosmetics | ~300 | 표준 인증 |
| GlucoseView | 191 | 최소 구현 |
| Neture | ~250 | 표준 인증 |

**공통 패턴 (95%+ 동일):**
- JWT 토큰 관리 (localStorage)
- 토큰 갱신 (refreshToken)
- Service User 인증
- 역할 정보 추출
- 로그아웃 처리

**차이점**: 서비스별 역할 매핑 로직, Service User 엔드포인트

### RoleGuard — 5개 서비스 100% 동일

```tsx
// 모든 서비스에서 동일한 ~40줄
function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.some(r => user.roles?.includes(r))) return <AccessDenied />;
  return children;
}
```

---

## 9. Layout 중복

### 자주 중복되는 레이아웃

| Layout | 서비스 | 줄수 | 분류 |
|--------|--------|------|------|
| TestGuideLayout | 5개 전부 | 59~130 | SIMILAR (80%) |
| PartnerLayout | glyco, cosmetics, glucose | 162~237 | SIMILAR (75%) |
| DashboardLayout | glyco, cosmetics | 393~443 | SIMILAR (80%) |
| MainLayout | glyco, cosmetics, neture | 15~101 | PATTERN (70%) |

### 고유 레이아웃 (중복 아님)

| Layout | 서비스 | 줄수 |
|--------|--------|------|
| StoreLayout | glyco | 329 |
| TabletLayout | glyco | 439 |
| KioskLayout | glyco | 245 |
| OperatorLayout | glucose | 107 |
| AdminVaultLayout | neture | 117 |
| SupplierOpsLayout | neture | 148 |

---

## 10. 공통 라이브러리 승격 후보

### Phase 1: CRITICAL (즉시 추출, ~1주)

| 패키지 | 포함 파일 | 예상 효과 |
|--------|----------|----------|
| **@o4o/auth-context-ui** | AuthContext.tsx, RoleGuard.tsx, useAuth, Service User utils | 5개 서비스 × ~400줄 = ~2,000줄 통합 |
| **@o4o/ai-components** | ai/icons.tsx, AiSummaryModal, AiPreviewModal, AiSummaryButton | 5개 서비스 × ~300줄 = ~1,500줄 통합 |
| **@o4o/cms-api** | cms.ts (serviceKey 파라미터화) | 2개 서비스 × 121줄 = ~240줄 통합 |

### Phase 2: HIGH (2주 내, ~1주)

| 패키지 | 포함 파일 | 예상 효과 |
|--------|----------|----------|
| **@o4o/auth-modals** | LoginModal.tsx, LoginModalContext.tsx, RegisterModal.tsx | 4개 서비스 × ~100줄 = ~400줄 통합 |
| **@o4o/auth-utils** | auth-utils.ts, role-constants.ts, ROLE_LABELS | 2개 서비스 × ~20줄 = ~40줄 통합 |
| **@o4o/common-layouts** | TestGuideLayout.tsx, PartnerLayout.tsx (파라미터화) | 5개 서비스 × ~150줄 = ~750줄 통합 |

### Phase 3: MEDIUM (4주 내)

| 패키지 | 포함 파일 | 예상 효과 |
|--------|----------|----------|
| **@o4o/signage-api** | signageV2.ts 통합 | 4개 서비스 × ~40줄 = ~160줄 통합 |
| **@o4o/health-api** | health.ts 통합 | 4개 서비스 × ~34줄 = ~136줄 통합 |

---

## 11. 기존 공유 패키지 현황

이미 존재하는 공유 패키지:

| 패키지 | 용도 | 서비스 |
|--------|------|--------|
| `@o4o/auth-client` | API 인증 클라이언트 | 전체 |
| `@o4o/types/*` | 공유 타입 | 전체 |
| `@o4o/store-ui-core` | Store 대시보드 UI | kpa, glyco, cosmetics, glucose |

**관찰**: `@o4o/auth-client`가 이미 존재하지만, 각 서비스의 **AuthContext (React Context)** 는 공유되지 않고 복사되어 있음.

---

## 12. 핵심 결론

### 가장 큰 중복: Auth 시스템

**AuthContext.tsx + RoleGuard.tsx + LoginModal.tsx** = 서비스당 ~500줄 × 5개 = **~2,500줄 중복**

이것은 전체 중복의 **50%**를 차지. 이 영역 하나만 공유 패키지로 추출해도 중복의 절반이 해소됨.

### 두 번째 큰 중복: AI 컴포넌트

**icons.tsx + AiSummaryModal + AiPreviewModal + AiSummaryButton** = 서비스당 ~300줄 × 5개 = **~1,500줄 중복**

100% 동일한 코드가 5곳에 복사되어 있음. 즉시 추출 가능.

### 중복이 없는 영역

| 영역 | 결과 |
|------|------|
| Custom Hooks | 중복 없음 (AuthContext 내장 제외) |
| 일반 Utils (formatDate 등) | 중복 없음 |
| 서비스 고유 Pages | 중복 없음 (각 서비스 독자적) |
| 서비스 고유 API | 중복 없음 |

---

## 13. 추천 추출 로드맵

```
Week 1: @o4o/auth-context-ui + @o4o/ai-components
         → 중복 3,500줄 해소 (70%)

Week 2: @o4o/auth-modals + @o4o/common-layouts
         → 중복 1,150줄 추가 해소 (93%)

Week 3: @o4o/cms-api + @o4o/signage-api + @o4o/health-api
         → 나머지 536줄 해소 (100%)
```

**3주 작업으로 ~5,000줄 중복 해소 가능.**

---

## 14. 중요 원칙

이번 조사에서는 다음 작업을 **수행하지 않았다**:
- 코드 삭제
- 리팩토링
- 공통 패키지 생성

---

## 15. 다음 단계

```
WO-O4O-COMMON-LIB-EXTRACTION-V1
```

포함 내용:
1. `@o4o/auth-context-ui` 패키지 생성
2. `@o4o/ai-components` 패키지 생성
3. `@o4o/auth-modals` 패키지 생성
4. `@o4o/common-layouts` 패키지 생성
5. 각 서비스에서 공유 패키지로 전환

---

*IR-O4O-CROSS-SERVICE-DUPLICATION-AUDIT-V1 완료*
*조사 일자: 2026-03-04*
