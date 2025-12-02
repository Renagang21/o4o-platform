# Priority 1 — Dropshipping 기능 컴포넌트 전환 Work Order

## NextGen Frontend Function Component Migration

Version: 2025-12
Author: ChatGPT PM

---

## 0. 목적

본 문서는 기존 main-site에서 사용하던
**Dropshipping 관련 Shortcode 컴포넌트 전체를**
NextGen 구조의 **Function Component + UI Component + View(JSON)**
조합으로 변환하기 위한 실행 지시서이다.

Priority 1 범위는 플랫폼에서 가장 중요하며
어려움도가 가장 높은 **7~8개의 핵심 대시보드 컴포넌트**를 의미한다.

---

## 1. 변환 대상 목록 (Priority 1 전체)

아래 shortcode 컴포넌트는 반드시 NextGen Function Component로 변환해야 함.

### Seller (판매자)

1. SellerDashboard (main-site)
2. SellerDashboard (package seller-app)
3. SellerDashboard (admin-dashboard)

### Supplier (공급자)

4. SupplierDashboard (main-site)
5. SupplierDashboard (dropshipping-core)

### Partner (파트너)

6. PartnerDashboard
7. AffiliateDashboard (필요시)

### Authorization / Status Panels

8. ProductAuthorizationPanel (2곳)

총 7–8개 대상.

---

## 2. 변환 후 필요한 파일 구조

NextGen에서는 아래 구조로 정리한다:

```
apps/main-site-nextgen/src/
  shortcodes/_functions/dropshipping/
      sellerDashboard.ts
      supplierDashboard.ts
      partnerDashboard.ts
      adminSellerDashboard.ts
      productAuthorizationPanel.ts
  hooks/queries/
      useSellerDashboardData.ts
      useSupplierDashboardData.ts
      usePartnerDashboardData.ts
      useAdminSellerDashboardData.ts
  components/ui/dropshipping/
      SellerKPI.tsx
      SupplierKPI.tsx
      PartnerKPI.tsx
      AuthorizationCard.tsx
  views/
      seller-dashboard.json
      supplier-dashboard.json
      partner-dashboard.json
      admin-seller-dashboard.json
```

※ 기존 main-site의 위치와 전혀 다름 → **완전 신규 구조**

---

## 3. Function Component 템플릿 (필수)

파일:
`shortcodes/_functions/dropshipping/sellerDashboard.ts`

```ts
import type { FunctionComponent } from '@/components/registry/function';

export const sellerDashboard: FunctionComponent = (props, context) => {
  const data = props.data;  // fetch 데이터 자동 주입

  return {
    type: "KPIGrid",
    props: {
      columns: 3,
      items: [
        { label: "Pending Approval", value: data.pending || 0 },
        { label: "New Opportunities", value: data.available || 0 },
        { label: "Training Required", value: data.incompleteCourses || 0 },
        { label: "Orders Today", value: data.ordersToday || 0 }
      ]
    }
  };
};
```

공급자 / 파트너 / 어드민도 동일 패턴.

---

## 4. React Query 기반 Fetch Hook 템플릿

파일:
`hooks/queries/useSellerDashboardData.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useSellerDashboardData() {
  return useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: async () => {
      const response = await axios.get("/api/seller/dashboard");
      return response.data;
    },
  });
}
```

---

## 5. UI Component 템플릿

파일:
`components/ui/dropshipping/SellerKPI.tsx`

```tsx
export function SellerKPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="text-gray-600 text-sm mb-2">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
```

KPIGrid는:

```tsx
import { SellerKPI } from './SellerKPI';

export function KPIGrid({
  items,
  columns = 3
}: {
  items: Array<{ label: string; value: number }>;
  columns?: number;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {items.map((item, idx) => (
        <SellerKPI key={idx} {...item} />
      ))}
    </div>
  );
}
```

---

## 6. View JSON 템플릿

파일:
`views/seller-dashboard.json`

```json
{
  "viewId": "seller-dashboard",
  "meta": {
    "title": "Seller Dashboard",
    "authRequired": true,
    "roles": ["seller"]
  },
  "layout": {
    "type": "DashboardLayout"
  },
  "components": [
    {
      "type": "SellerDashboard",
      "props": {
        "fetch": {
          "queryKey": ["seller-dashboard"],
          "url": "/api/seller/dashboard"
        }
      }
    }
  ]
}
```

---

## 7. Component Registry 등록 규칙

`components/registry/function.ts`

```ts
import { sellerDashboard } from "@/shortcodes/_functions/dropshipping/sellerDashboard";
import { supplierDashboard } from "@/shortcodes/_functions/dropshipping/supplierDashboard";
import { partnerDashboard } from "@/shortcodes/_functions/dropshipping/partnerDashboard";

export const FunctionRegistry = {
  SellerDashboard: sellerDashboard,
  SupplierDashboard: supplierDashboard,
  PartnerDashboard: partnerDashboard,
  // ... more
};
```

`components/registry/ui.tsx`

```tsx
import { KPIGrid } from '@/components/ui/dropshipping/KPIGrid';
import { SellerKPI } from '@/components/ui/dropshipping/SellerKPI';
// ... more imports

export const UIComponentRegistry: Record<string, React.ComponentType<any>> = {
  KPIGrid,
  SellerKPI,
  SupplierKPI,
  PartnerKPI,
  AuthorizationCard,
  // ... more
};
```

---

## 8. 샘플 테스트 계획

테스트 파일:

```
views/test-dropshipping.json
```

내용:

```json
{
  "viewId": "test-dropshipping",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "SellerDashboard",
      "props": {
        "fetch": {
          "queryKey": ["seller-dashboard"],
          "url": "http://43.202.242.215:4000/api/seller/dashboard"
        }
      }
    }
  ]
}
```

테스트 절차:

1. `/dashboard/seller` 접근
2. layout 정상 렌더링 확인
3. fetch 데이터 UI 반영 확인
4. KPI 그리드 확인
5. 콘솔 에러 없음 확인

---

## 9. 개발 에이전트 작업 절차 (Phase A → E)

### **Phase A — 준비 (2h)**

* 대상 파일 위치 스캔
* 파일 분리 계획 작성
* 기존 코드 분석

### **Phase B — Fetch Hooks 생성 (6h)**

* seller, supplier, partner, admin 각각의 query hook 생성
* API 엔드포인트 확인
* 에러 처리 추가

### **Phase C — Function Component 생성 (12h)**

* 비즈니스 로직 포함
* UI props 반환 구조 확정
* 데이터 변환 로직 구현

### **Phase D — UI Component 생성 (8h)**

* KPIGrid
* KPIItem
* AuthorizationCard
* Role-based KPI

### **Phase E — View JSON + Registry 연결 (4h)**

* view JSON 생성
* registry 연결
* test view 렌더링
* 개발자 검증

총 예상: **32시간**

---

## 10. 성공 판정 기준 (DoD - Definition of Done)

* [ ] 모든 Function Component 레이아웃 코드 제거됨
* [ ] fetch → props.data 자동 연동됨
* [ ] Function → UI로 변환 정상
* [ ] seller/supplier/partner 대시보드 렌더링 성공
* [ ] View JSON 테스트 정상
* [ ] Component Registry 연결 정상
* [ ] Console Error 없음
* [ ] TypeScript 타입 에러 없음
* [ ] 기존 기능 모두 동작 (기능 손실 없음)

---

## 11. 기존 코드 참조 위치

변환 시 참고할 기존 파일들:

### Seller Dashboard
```
apps/main-site/src/components/shortcodes/SellerDashboard.tsx
packages/dropshipping-core/src/main-site/pages/dashboard/SellerDashboard.tsx
```

### Supplier Dashboard
```
apps/main-site/src/components/shortcodes/SupplierDashboard.tsx
packages/dropshipping-core/src/main-site/pages/dashboard/SupplierDashboard.tsx
```

### Partner Dashboard
```
apps/main-site/src/components/shortcodes/PartnerDashboard.tsx
packages/dropshipping-core/src/main-site/pages/dashboard/PartnerDashboard.tsx
```

---

## 12. 주의사항

### ❌ 금지사항
- Function Component에 레이아웃 코드 포함 금지
- Function Component에서 직접 fetch 호출 금지
- UI Component에 비즈니스 로직 포함 금지
- 기존 main-site 파일 수정 금지 (읽기만 허용)

### ✅ 필수사항
- 모든 컴포넌트는 TypeScript로 작성
- Props 타입 명시 필수
- 에러 처리 추가
- 로딩 상태 처리
- null/undefined 안전 처리

---

# ✔ Priority 1 — Dropshipping 기능 컴포넌트 전환 Work Order 완성
