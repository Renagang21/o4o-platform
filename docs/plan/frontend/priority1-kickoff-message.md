# Priority 1 Dropshipping 변환 작업 시작 메시지

**새 개발 채팅방에 아래 메시지를 그대로 복사하여 붙여넣으세요.**

---

# 🚀 Priority 1 — Dropshipping Function Component 변환 작업

## 작업 개요

O4O Platform NextGen Frontend의 가장 중요한 핵심 기능인
**Dropshipping Dashboard 컴포넌트 7-8개**를
기존 shortcode 방식에서 **NextGen Function Component + View JSON** 방식으로 변환합니다.

---

## 기술 스택

- **Framework**: React 19, TypeScript
- **Build**: Vite 6
- **Routing**: React Router v7
- **State/Data**: @tanstack/react-query
- **HTTP**: axios
- **Styling**: Tailwind CSS

---

## 작업 대상

### 변환할 컴포넌트 (Priority 1)

1. **SellerDashboard** (3곳)
   - `apps/main-site/src/components/shortcodes/SellerDashboard.tsx`
   - `packages/dropshipping-core/src/main-site/pages/dashboard/SellerDashboard.tsx`
   - Admin dashboard 버전

2. **SupplierDashboard** (2곳)
   - `apps/main-site/src/components/shortcodes/SupplierDashboard.tsx`
   - `packages/dropshipping-core/src/main-site/pages/dashboard/SupplierDashboard.tsx`

3. **PartnerDashboard**
   - `apps/main-site/src/components/shortcodes/PartnerDashboard.tsx`

4. **ProductAuthorizationPanel**
   - 승인 관련 UI 컴포넌트

---

## 작업 위치

**작업 경로**: `/home/dev/o4o-platform/apps/main-site-nextgen/`

이미 구축된 NextGen 구조:
```
apps/main-site-nextgen/src/
  ├── view/                    # ViewRenderer (완성)
  ├── components/registry/     # Component Registry (완성)
  ├── layouts/                 # 5가지 Layout (완성)
  └── views/                   # View JSON 파일들
```

---

## 작업 절차

### Phase 1: 디렉토리 생성

다음 폴더들을 생성해주세요:

```bash
mkdir -p apps/main-site-nextgen/src/shortcodes/_functions/dropshipping
mkdir -p apps/main-site-nextgen/src/hooks/queries
mkdir -p apps/main-site-nextgen/src/components/ui/dropshipping
```

### Phase 2: React Query Hooks 작성

각 대시보드별로 데이터 fetching hook을 작성:

**파일**: `src/hooks/queries/useSellerDashboardData.ts`
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

동일 패턴으로:
- `useSupplierDashboardData.ts`
- `usePartnerDashboardData.ts`

### Phase 3: Function Component 작성

**파일**: `src/shortcodes/_functions/dropshipping/sellerDashboard.ts`

```ts
import type { FunctionComponent } from '@/components/registry/function';

export const sellerDashboard: FunctionComponent = (props, context) => {
  const data = props.data || {};

  return {
    type: "KPIGrid",
    props: {
      columns: 4,
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

**중요**:
- 레이아웃 코드는 절대 포함하지 마세요
- UI 컴포넌트 호출을 위한 `{ type, props }` 반환만 하세요
- 데이터 가공/변환 로직만 포함하세요

### Phase 4: UI Component 작성

**파일**: `src/components/ui/dropshipping/KPIGrid.tsx`

```tsx
export function KPIGrid({
  items,
  columns = 4
}: {
  items: Array<{ label: string; value: number | string }>;
  columns?: number;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4 mb-6`}>
      {items.map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">{item.label}</div>
          <div className="text-3xl font-bold text-gray-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
```

### Phase 5: Component Registry 등록

**파일**: `src/components/registry/function.ts`에 추가:

```ts
import { sellerDashboard } from "@/shortcodes/_functions/dropshipping/sellerDashboard";
import { supplierDashboard } from "@/shortcodes/_functions/dropshipping/supplierDashboard";
import { partnerDashboard } from "@/shortcodes/_functions/dropshipping/partnerDashboard";

export const FunctionRegistry = {
  // 기존 항목들...
  SellerDashboard: sellerDashboard,
  SupplierDashboard: supplierDashboard,
  PartnerDashboard: partnerDashboard,
};
```

**파일**: `src/components/registry/ui.tsx`에 추가:

```tsx
import { KPIGrid } from '@/components/ui/dropshipping/KPIGrid';

export const UIComponentRegistry: Record<string, React.ComponentType<any>> = {
  // 기존 항목들...
  KPIGrid,
};
```

### Phase 6: View JSON 작성

**파일**: `src/views/seller-dashboard.json`

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

동일 패턴으로:
- `supplier-dashboard.json`
- `partner-dashboard.json`

### Phase 7: URL 매핑 추가

**파일**: `src/view/loader.ts`에 추가:

```ts
const URL_VIEW_MAP: Record<string, string> = {
  // 기존 항목들...
  '/dashboard/seller': 'seller-dashboard',
  '/dashboard/supplier': 'supplier-dashboard',
  '/dashboard/partner': 'partner-dashboard',
};
```

---

## 성공 기준 (DoD)

작업이 완료되면 다음이 모두 정상 작동해야 합니다:

- [ ] `http://localhost:5175/dashboard/seller` 접속 시 KPI 그리드 표시
- [ ] `http://localhost:5175/dashboard/supplier` 접속 시 공급자 대시보드 표시
- [ ] `http://localhost:5175/dashboard/partner` 접속 시 파트너 대시보드 표시
- [ ] 콘솔 에러 없음
- [ ] TypeScript 빌드 에러 없음
- [ ] Layout이 올바르게 적용됨 (DashboardLayout with sidebar)
- [ ] fetch 실패 시 에러 메시지 표시
- [ ] 로딩 상태 표시

---

## 참고 문서

- Work Order 전체: `/home/dev/o4o-platform/docs/nextgen-frontend/tasks/step4_priority1_conversion_workorder.md`
- View Schema 스펙: `/home/dev/o4o-platform/docs/nextgen-frontend/specs/view-schema.md`
- Function Component 스펙: `/home/dev/o4o-platform/docs/nextgen-frontend/specs/shortcode-function-component-spec.md`
- Component Registry 스펙: `/home/dev/o4o-platform/docs/nextgen-frontend/specs/component-registry-spec.md`

---

## 시작 명령

**작업을 시작해주세요!**

위 절차에 따라 Phase 1부터 순서대로 진행하고,
각 Phase 완료 시마다 결과를 보고해주세요.

우선 **Phase 1 (디렉토리 생성)**부터 시작하면 됩니다.
