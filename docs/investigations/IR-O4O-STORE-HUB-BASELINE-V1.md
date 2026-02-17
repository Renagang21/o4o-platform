# IR-0: O4O "약국 매장 허브" 기준 정의 조사

> **조사일자**: 2026-02-17
> **조사자**: Claude Code (Opus 4.5)
> **상태**: 완료
> **버전**: V1

---

## 1. 조사 목적

1. O4O 표준 "매장 허브"의 정확한 정의 확정
2. GlycoPharm이 그 허브를 그대로 사용하는지, 확장하는지, 별도 구현했는지 확인
3. 약국(매장 주인)의 실제 진입점과 메뉴 트리 확정

---

## 2. 허브 엔트리 URL

### 2.1 역할 기반 라우팅 메커니즘

**파일**: `services/web-glycopharm/src/App.tsx` (L195-209)

```typescript
function RoleBasedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.roles[0]) {
      const target = getDefaultRouteByRole(user.roles[0]);
      if (target !== '/') {
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate]);

  return <HomePage />;
}
```

**역할별 기본 경로** (`auth-utils.ts`):

| 역할 | 기본 URL | 비고 |
|------|----------|------|
| `admin` | `/admin` | 관리자 대시보드 |
| `pharmacy` | `/pharmacy` | ⚠️ **제거됨** |
| `operator` | `/operator` | 운영자 대시보드 |
| `supplier` | `/supplier` | 공급자 대시보드 |
| `partner` | `/partner` | 파트너 대시보드 |
| `consumer` | `/` | 홈페이지 |

### 2.2 약국 주인 진입점 문제

**발견된 문제**: `/pharmacy` 경로가 제거됨

```typescript
// App.tsx (L287)
{/* /pharmacy removed — WO-PHARMACY-FULL-REMOVAL-V1 */}
```

**현재 상태**:
- `pharmacy` 역할 → `/pharmacy` 리다이렉트 시도 → **404 에러**
- 실제 약국 관리 기능은 `/store` 경로에 존재
- **auth-utils.ts 수정 필요**: `pharmacy: '/store'`로 변경해야 함

### 2.3 실제 약국 주인 허브 진입점

| URL | 페이지 | 설명 |
|-----|--------|------|
| `/store` | `StoreOverviewPage` | 5-Section HubLayout (O4O 표준) |
| `/store/identity` | `StoreMainPage` | 5-Block Cockpit (실제 운영 핵심) |

---

## 3. 허브 메뉴 트리 (실제 코드 기준)

### 3.1 Pharmacy 역할 사이드바 메뉴 (14개)

**파일**: `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx`

```
약국 관리 (pharmacy)
├─ 대시보드         → /store
├─ 매장 메인        → /store/identity
├─ B2B 주문         → /store/b2b-order
├─ 상품 관리        → /store/products
├─ 주문 내역        → /store/orders
├─ 고객 관리        → /store/services
├─ 스마트 디스플레이 → /store/display
├─ 콘텐츠 가져오기   → /store/content
├─ 콘텐츠 라이브러리 → /store/signage/library
├─ 내 사이니지      → /store/signage/my
├─ Market Trial    → /store/market-trial
├─ 전환 퍼널        → /store/funnel
├─ 약국 경영        → /store/management
└─ 설정            → /store/settings
```

### 3.2 StoreOverviewPage 5-Section Hub 구조

**파일**: `services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx`

```
StoreOverviewPage (HubLayout from @o4o/hub-core)
│
├─ Section 1: Care 운영 (4 cards)
│   ├─ 고위험 환자 관리  → /store/services (signal: glycopharm.high_risk)
│   ├─ 상담 세션        → /store/services (signal: glycopharm.coaching)
│   ├─ CGM 분석        → /store/services (signal: glycopharm.analysis)
│   └─ AI 요약 리포트   → /store (signal: glycopharm.ai_summary)
│
├─ Section 2: 매출 / 매장 (4 cards)
│   ├─ 매출 요약        → /store/orders (signal: glycopharm.revenue)
│   ├─ 미처리 요청      → /store/requests (signal: glycopharm.pending_requests)
│   ├─ 상품 관리        → /store/products (signal: glycopharm.products)
│   └─ 사이니지         → /store/signage/my (signal: glycopharm.signage)
│
├─ Section 3: 관리자 전용 (roles: ['operator', 'glycopharm:admin'])
│   ├─ 약국 등록 승인    → /operator/applications
│   └─ 정책 설정        → /operator/settings
│
├─ beforeSections: AI 운영 요약 (AI Summary Card)
│
└─ 새로고침 및 푸터
```

### 3.3 StoreMainPage 5-Block Cockpit 구조

**파일**: `services/web-glycopharm/src/pages/pharmacy/StoreMainPage.tsx`

```
StoreMainPage (5-Block Cockpit)
│
├─ Block 1: 매장 현황 요약 (Status Summary)
│   ├─ 활성 서비스 (count)
│   ├─ 주문 가능 상품 (count)
│   ├─ 승인 대기 (count badge)
│   └─ 활성 채널 (count)
│
├─ Block 2: 바로 이용 가능 (Ready to Use)
│   └─ OPEN 정책 상품 → /store/products
│
├─ Block 3: 확장 가능 (Expandable)
│   ├─ REQUEST_REQUIRED (pending/rejected)
│   └─ LIMITED 상태 상품
│
├─ Block 4: 빠른 이동 (Quick Actions)
│   ├─ 상품 관리     → /store/products
│   ├─ 주문 확인     → /store/orders
│   ├─ 콘텐츠 관리   → /store/content
│   ├─ 매장 설정     → /store/settings
│   ├─ 승인 현황     → /store/apply
│   └─ B2B 주문      → /store/b2b-order
│
└─ Block 5: AI 매장 요약 (Rule-based)
    ├─ AI 메시지
    └─ 추천 사항 태그
```

---

## 4. 허브가 사용하는 주요 API 목록

### 4.1 KPA 약국 관련 API (Authenticated)

| 엔드포인트 | 메서드 | 조건 | 설명 |
|-----------|--------|------|------|
| `/api/v1/kpa/pharmacy/store/config` | GET | `pharmacy_owner` | 매장 설정 조회 |
| `/api/v1/kpa/pharmacy/store/config` | PUT | `pharmacy_owner` | 매장 설정 저장 |
| `/api/v1/kpa/pharmacy/products/apply` | POST | `pharmacy_owner` | 상품 판매 신청 |
| `/api/v1/kpa/pharmacy/products/applications` | GET | `pharmacy_owner` | 내 신청 목록 |
| `/api/v1/kpa/pharmacy/products/approved` | GET | `pharmacy_owner` | 승인된 상품 |
| `/api/v1/kpa/pharmacy/products/listings` | GET | `pharmacy_owner` | 진열 상품 목록 |
| `/api/v1/kpa/pharmacy/products/listings/:id` | PUT | `pharmacy_owner` | 진열 상품 수정 |
| `/api/v1/kpa/pharmacy/products/listings/:id/channels` | GET/PUT | `pharmacy_owner` | 채널별 설정 |

### 4.2 GlycoPharm 약국 관련 API

| 엔드포인트 | 메서드 | 조건 | 설명 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/pharmacy/products` | GET | `requireAuth` | 약국 상품 목록 |
| `/api/v1/glycopharm/pharmacy/categories` | GET | `requireAuth` | 상품 카테고리 |
| `/api/v1/glycopharm/pharmacy/orders` | GET | `requireAuth` | 주문 목록 |
| `/api/v1/glycopharm/pharmacy/customers` | GET | `requireAuth` | 고객 목록 |

### 4.3 스토어 공개 API

| 엔드포인트 | 메서드 | 조건 | 설명 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/stores/:slug` | GET | Public | 매장 정보 |
| `/api/v1/glycopharm/stores/:slug/storefront-config` | PUT | owner 검증 | 스토어 설정 |
| `/api/v1/glycopharm/stores/:slug/hero` | PUT | owner 검증 | Hero 콘텐츠 |

---

## 5. 약국 주인 권한 스코프 구조

### 5.1 스코프 결정 메커니즘

```
1. 로그인 → JWT에 user.id + pharmacistRole 저장
2. API 호출 → userId로 KpaMember.organization_id 조회
3. 쿼리 실행 → WHERE organization_id = ? 자동 필터링
4. 역할 검증 → pharmacistRole !== 'pharmacy_owner' → 403
```

### 5.2 조직 ID 추출 로직

**파일**: `apps/api-server/src/routes/kpa/controllers/pharmacy-store-config.controller.ts`

```typescript
async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;  // ← 약국 ID 반환
}
```

### 5.3 권한 분리 매트릭스

| 역할 | JWT Claim | 권한 영역 | API 접근 범위 |
|------|-----------|---------|-------------|
| **Pharmacy Owner** | `pharmacistRole: 'pharmacy_owner'` | 자신의 약국만 | `/kpa/pharmacy/*` (자신의 orgId만) |
| **KPA Admin** | `roles: ['kpa:admin']` | 모든 약국 (관리) | `/kpa/admin/*` 모든 신청/회원 관리 |
| **KPA Operator** | `roles: ['kpa:operator']` | 운영 전체 | `/kpa/operator/*` 콘텐츠/중재 관리 |
| **GlycoPharm Admin** | `roles: ['glycopharm:admin']` | GlycoPharm 전체 | `/glycopharm/admin/*` |

---

## 6. GlycoPharm과 O4O 표준 허브의 관계

### 6.1 O4O 표준 허브 사용 여부: **YES**

**증거 1**: StoreOverviewPage에서 표준 허브 import

```typescript
// services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx (L17-18)
import { HubLayout } from '@o4o/hub-core';
import type { HubSectionDefinition } from '@o4o/hub-core';
```

**증거 2**: App.tsx에서 StoreDashboardLayout 사용

```typescript
// App.tsx (L104-105)
import { StoreDashboardLayout, GLYCOPHARM_STORE_CONFIG } from '@o4o/operator-core';
```

### 6.2 레이아웃 계층 구조

| 층 | 컴포넌트 | 출처 | 역할 |
|---|---------|------|------|
| 외부 | `StoreDashboardLayout` | `@o4o/operator-core` | O4O 표준 매장 대시보드 쉘 |
| 내부 | `HubLayout` | `@o4o/hub-core` | O4O 표준 5-Section 허브 |
| 커스텀 | `StoreMainPage` | GlycoPharm 자체 | 5-Block Cockpit (확장) |

### 6.3 공통 vs 확장

| 항목 | 공통 (O4O 표준) | 확장 (GlycoPharm) |
|-----|---------------|------------------|
| 메뉴 시스템 | 9개 표준 메뉴 (`storeMenuConfig.ts`) | 14개 메뉴 (DashboardLayout) |
| Hub 레이아웃 | `HubLayout` 5-Section | `StoreOverviewPage` 커스텀 섹션 |
| Cockpit | 없음 | `StoreMainPage` 5-Block |
| Signal 체계 | `@o4o/hub-core` 표준 | `glycopharm.*` 커스텀 시그널 |

---

## 7. Operator vs 약국 주인 화면 분리

### 7.1 라우트 분리: **완전히 분리됨**

| 라우트 | 역할 | Protected | Layout |
|--------|------|----------|--------|
| `/operator/*` | `operator` | Yes | `DashboardLayout` |
| `/admin/*` | `admin` | Yes | `DashboardLayout` |
| `/store/*` | `pharmacy` | Yes | `StoreDashboardLayout` |

### 7.2 메뉴 분리

**Operator (16개)**:
```
대시보드, 신청 관리, 상품 관리, 주문 관리, 재고/공급, 정산 관리,
분석/리포트, 청구 리포트, 청구 미리보기, 인보이스, 마케팅,
포럼 신청, 포럼 관리, Trial 관리, 콘텐츠 허브, 내 사이니지
```

**Admin (4개)**:
```
대시보드, 약국 네트워크, 회원 관리, 설정
```

**Pharmacy (14개)**:
```
대시보드, 매장 메인, B2B 주문, 상품 관리, 주문 내역, 고객 관리,
스마트 디스플레이, 콘텐츠 가져오기, 콘텐츠 라이브러리, 내 사이니지,
Market Trial, 전환 퍼널, 약국 경영, 설정
```

### 7.3 대시보드 분리

| 대상 | 대시보드 | 구조 |
|-----|---------|------|
| Operator + Admin | `GlycoPharmOperatorDashboard` | 5-Block (KPI, AI, Action, Activity, Quick) |
| Pharmacy | `StoreOverviewPage` + `StoreMainPage` | 5-Section Hub + 5-Block Cockpit |

---

## 8. 문제점 및 구조 리스크

### 8.1 Critical Issues

| 문제 | 심각도 | 설명 |
|-----|--------|------|
| **pharmacy 역할 리다이렉트 오류** | 🔴 Critical | `/pharmacy` 경로 제거됨, auth-utils.ts 수정 필요 |
| **메뉴 이중 정의** | 🟡 Medium | DashboardLayout에 14개 + storeMenuConfig에 9개 |

### 8.2 구조적 혼란

| 항목 | 현상 | 권장 조치 |
|-----|-----|----------|
| Hub vs Cockpit | `/store`는 Hub, `/store/identity`는 Cockpit | 진입점 통일 필요 |
| 메뉴 출처 | DashboardLayout vs operator-core | 단일 출처로 통합 필요 |
| 역할 명명 | `pharmacy` vs `pharmacy_owner` | 일관성 확보 필요 |

### 8.3 권장 조치

1. **즉시 조치**: `auth-utils.ts`에서 `pharmacy: '/store'`로 변경
2. **단기 조치**: DashboardLayout의 pharmacy 메뉴를 `@o4o/operator-core` storeMenuConfig로 마이그레이션
3. **중기 조치**: Hub(`/store`)와 Cockpit(`/store/identity`) 역할 명확화 문서화

---

## 9. 다른 서비스와의 비교

### 9.1 operator-core 공통 사용 현황

| 서비스 | StoreDashboardLayout | HubLayout | 5-Block Operator |
|--------|---------------------|-----------|------------------|
| K-Cosmetics | ✓ | - | ✓ (StoreCockpitPage) |
| GlycoPharm | ✓ | ✓ | ✓ (StoreMainPage) |
| Neture | - | - | ✓ (NetureOperatorDashboard) |
| KPA Society | - | - | - (WordPress 스타일) |

### 9.2 공통 패턴

```
@o4o/operator-core (Frozen)
├─ StoreDashboardLayout (매장 대시보드 쉘)
├─ storeMenuConfig (9개 표준 메뉴)
└─ types.ts (StoreDashboardConfig 등)

@o4o/hub-core (Frozen)
├─ HubLayout (5-Section 표준)
├─ SignalCard (KPI 표시)
└─ QuickAction (빠른 이동)
```

---

## 10. 결론

### 10.1 핵심 발견사항

1. **GlycoPharm은 O4O 표준 허브를 사용한다** (`StoreDashboardLayout` + `HubLayout`)
2. **추가로 5-Block Cockpit을 확장 구현했다** (`StoreMainPage`)
3. **약국 주인 역할 리다이렉트에 버그가 있다** (`/pharmacy` → 404)
4. **권한 스코프는 `organization_id` 기반으로 작동한다**

### 10.2 다음 조사 (IR-1) 예고

**IR-1: Role / RBAC / Operator 구조 전수 맵**

조사 대상:
- admin 역할의 실제 화면/권한/데이터 범위
- operator 역할의 실제 화면/권한/데이터 범위
- pharmacy (약국 주인) 역할의 화면/권한/데이터 범위
- pharmacist (약사) 역할의 화면/권한/데이터 범위

---

*조사 완료: 2026-02-17*
*다음 단계: IR-1 진행 또는 구조 재정의*
