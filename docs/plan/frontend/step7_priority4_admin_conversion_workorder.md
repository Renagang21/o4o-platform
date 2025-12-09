# 📄 **Priority 4 — Admin Function Component 변환 Work Order**

## NextGen Frontend Admin Migration Package

Version: 2025-12
Author: ChatGPT PM
경로: `/docs/nextgen-frontend/tasks/step7_priority4_admin_conversion_workorder.md`

---

## 0. 목표

Admin 영역(Platform 관리자 전용)은:

* 전체 시스템 운영
* 판매자/공급자 승인
* 플랫폼 통계
* 주문/정산 모니터링
* 사용자 관리

등을 포함하는 핵심 관리 기능이다.

이번 Priority 4에서는 **Admin Shortcode 기반 컴포넌트 전체를
NextGen Function Component + UI Component + View JSON 구조로 변경**한다.

---

## 1. 변환 대상 컴포넌트 (총 6개)

| 카테고리                | 컴포넌트                | 역할        |
| ------------------- | ------------------- | --------- |
| Dashboard           | AdminStats          | 플랫폼 전체 통계 |
| Dashboard           | AdminDashboard      | 관리자 홈     |
| Seller Management   | AdminSellerList     | 판매자 목록    |
| Seller Management   | AdminSellerDetail   | 판매자 상세    |
| Supplier Management | AdminSupplierList   | 공급자 목록    |
| Supplier Management | AdminSupplierDetail | 공급자 상세    |

필요시 확장될 수 있는 컴포넌트:

* Partner Management
* Category/Admin Settings
* Order/Settlement Monitoring (차후)

---

## 2. 폴더 구조 (NextGen Admin 전용)

```
apps/main-site-nextgen/src/
  shortcodes/_functions/admin/
      adminStats.ts
      adminDashboard.ts
      adminSellerList.ts
      adminSellerDetail.ts
      adminSupplierList.ts
      adminSupplierDetail.ts

  hooks/queries/admin/
      useAdminStats.ts
      useAdminSellerList.ts
      useAdminSellerDetail.ts
      useAdminSupplierList.ts
      useAdminSupplierDetail.ts

  components/ui/admin/
      AdminStatsCard.tsx
      AdminDashboardPanel.tsx
      AdminSellerRow.tsx
      AdminSupplierRow.tsx
      AdminSellerDetailView.tsx
      AdminSupplierDetailView.tsx

  views/
      admin-stats.json
      admin-dashboard.json
      admin-seller-list.json
      admin-seller-detail.json
      admin-supplier-list.json
      admin-supplier-detail.json
```

---

## 3. Fetch Hooks (예시)

### 플랫폼 통계

```ts
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => axios.get("/api/admin/stats").then(r => r.data),
  });
}
```

### 판매자 목록

```ts
export function useAdminSellerList() {
  return useQuery({
    queryKey: ["admin-seller-list"],
    queryFn: () => axios.get("/api/admin/sellers").then(r => r.data),
  });
}
```

### 공급자 상세

```ts
export function useAdminSupplierDetail({ id }) {
  return useQuery({
    queryKey: ["admin-supplier-detail", id],
    queryFn: () => axios.get(`/api/admin/suppliers/${id}`).then(r => r.data),
  });
}
```

---

## 4. Function Component 템플릿

### AdminStats

```ts
export const adminStats = (props, context) => {
  const data = props.data;

  return {
    type: "AdminStatsCard",
    props: {
      users: data.users,
      products: data.products,
      ordersToday: data.ordersToday,
      revenue: data.revenue
    }
  };
};
```

### AdminSellerList

```ts
export const adminSellerList = (props, context) => {
  return {
    type: "AdminSellerRow",
    props: { items: props.data.items }
  };
};
```

---

## 5. UI Component 템플릿

### AdminStatsCard.tsx

```tsx
export function AdminStatsCard({ users, products, ordersToday, revenue }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-6 bg-white rounded shadow">Users: {users}</div>
      <div className="p-6 bg-white rounded shadow">Products: {products}</div>
      <div className="p-6 bg-white rounded shadow">Orders Today: {ordersToday}</div>
      <div className="p-6 bg-white rounded shadow">Revenue: {revenue}</div>
    </div>
  );
}
```

판매자 리스트 예시:

```tsx
export function AdminSellerRow({ items }) {
  return (
    <table className="min-w-full bg-white rounded shadow">
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td className="p-4 border-b">{item.name}</td>
            <td className="p-4 border-b">{item.email}</td>
            <td className="p-4 border-b">{item.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 6. View JSON 템플릿

### admin-dashboard.json

```json
{
  "viewId": "admin-dashboard",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "adminStats",
      "props": {
        "fetch": {
          "queryKey": ["admin-stats"],
          "url": "/api/admin/stats"
        }
      }
    }
  ]
}
```

### admin-seller-list.json

```json
{
  "viewId": "admin-seller-list",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "adminSellerList",
      "props": {
        "fetch": {
          "queryKey": ["admin-seller-list"],
          "url": "/api/admin/sellers"
        }
      }
    }
  ]
}
```

---

## 7. URL 매핑

`view/loader.ts`에 추가:

```ts
"/admin": "admin-dashboard",
"/admin/sellers": "admin-seller-list",
"/admin/sellers/:id": "admin-seller-detail",
"/admin/suppliers": "admin-supplier-list",
"/admin/suppliers/:id": "admin-supplier-detail",
```

---

## 8. Registry 등록

### Function Registry

```ts
export const FunctionRegistry = {
  adminStats,
  adminDashboard,
  adminSellerList,
  adminSellerDetail,
  adminSupplierList,
  adminSupplierDetail,
};
```

### UI Registry

```ts
export const UIComponentRegistry = {
  AdminStatsCard,
  AdminDashboardPanel,
  AdminSellerRow,
  AdminSellerDetailView,
  AdminSupplierRow,
  AdminSupplierDetailView,
};
```

---

## 9. 성공 기준 (DoD)

* [ ] Admin Dashboard 정상 렌더링
* [ ] 플랫폼 통계 정상 표시
* [ ] 판매자/공급자 목록 렌더링
* [ ] 상세 페이지 정상 표시
* [ ] TypeScript 오류 없음
* [ ] 콘솔 에러 없음
* [ ] Layout 적용 정상
* [ ] API 연동 문제 없음

---

## 10. 예상 개발 시간

총: **약 12시간**

* Hooks: 2h
* Function Components: 4h
* UI Components: 4h
* View JSON: 1h
* Registry 등록/테스트: 1h

---

## ✔ Priority 4 — Admin Work Order 생성 완료

---
