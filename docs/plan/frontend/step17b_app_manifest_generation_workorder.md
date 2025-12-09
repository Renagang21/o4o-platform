# 📄 **Step 17-B — App Manifest 생성 Work Order**

## O4O Platform NextGen — AppStore Manifest Integration

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목적

NextGen AppStore UI & Loader가 완성된 현재,
각 앱의 기능·컴포넌트·View를 AppStore에서 관리하려면
**각 앱 패키지에 공식 manifest.json 파일이 반드시 필요함.**

이 Work Order는 다음 앱들에 대해 manifest.json을 생성하고
NextGen AppStore와 완전히 연동되도록 만드는 절차를 정의한다:

* Commerce App
* Customer App
* Admin App
* Forum App
* Forum-Yaksa App
* Forum-Neture App
* (Optional) Cosmetics App (향후)

---

# 1. Manifest 파일 위치

각 앱 패키지에서 다음 경로에 생성한다:

```
packages/@o4o-apps/<app-name>/manifest.json
```

예시:

```
packages/@o4o-apps/commerce/manifest.json
packages/@o4o-apps/customer/manifest.json
packages/@o4o-apps/admin/manifest.json
packages/@o4o-apps/forum/manifest.json
packages/@o4o-apps/forum-yaksa/manifest.json
packages/@o4o-apps/forum-neture/manifest.json
```

---

# 2. 공통 manifest 구조 (표준)

모든 앱 manifest는 아래 구조를 따른다:

```json
{
  "id": "commerce",
  "name": "E-Commerce",
  "version": "2.0.0",
  "enabled": true,
  "views": {
    "product-list": "views/product-list.json",
    "product-detail": "views/product-detail.json",
    "cart": "views/cart.json",
    "checkout": "views/checkout.json",
    "order-list": "views/order-list.json",
    "order-detail": "views/order-detail.json"
  },
  "functions": {
    "productList": "functions/productList.ts",
    "productDetail": "functions/productDetail.ts",
    "cart": "functions/cart.ts",
    "checkout": "functions/checkout.ts",
    "orderList": "functions/orderList.ts",
    "orderDetail": "functions/orderDetail.ts"
  },
  "ui": {
    "ProductCard": "ui/ProductCard.tsx",
    "ProductGrid": "ui/ProductGrid.tsx",
    "ProductDetailView": "ui/ProductDetailView.tsx",
    "CartItem": "ui/CartItem.tsx",
    "CartSummary": "ui/CartSummary.tsx",
    "OrderRow": "ui/OrderRow.tsx",
    "OrderDetailView": "ui/OrderDetailView.tsx"
  }
}
```

변경되는 부분은 id, name, views, functions, ui 세트뿐임.

---

# 3. 앱별 manifest 템플릿

이제 각 앱 별 manifest 초안을 제공합니다.
작업 에이전트는 템플릿을 기반으로 실제 파일 생성만 하면 됩니다.

---

## 3.1 Commerce App

**`packages/@o4o-apps/commerce/manifest.json`**

```json
{
  "id": "commerce",
  "name": "E-Commerce",
  "version": "2.0.0",
  "enabled": true,
  "views": {
    "product-list": "views/product-list.json",
    "product-detail": "views/product-detail.json",
    "cart": "views/cart.json",
    "checkout": "views/checkout.json",
    "order-list": "views/order-list.json",
    "order-detail": "views/order-detail.json"
  },
  "functions": {
    "productList": "functions/productList.ts",
    "productDetail": "functions/productDetail.ts",
    "cart": "functions/cart.ts",
    "checkout": "functions/checkout.ts",
    "orderList": "functions/orderList.ts",
    "orderDetail": "functions/orderDetail.ts"
  },
  "ui": {
    "ProductCard": "ui/ProductCard.tsx",
    "ProductGrid": "ui/ProductGrid.tsx",
    "ProductDetailView": "ui/ProductDetailView.tsx",
    "CartItem": "ui/CartItem.tsx",
    "CartSummary": "ui/CartSummary.tsx",
    "OrderRow": "ui/OrderRow.tsx",
    "OrderDetailView": "ui/OrderDetailView.tsx"
  }
}
```

---

## 3.2 Customer App

**`packages/@o4o-apps/customer/manifest.json`**

```json
{
  "id": "customer",
  "name": "Customer Portal",
  "version": "2.0.0",
  "enabled": true,
  "views": {
    "login": "views/login.json",
    "signup": "views/signup.json",
    "reset-password": "views/reset-password.json",
    "my-account": "views/my-account.json",
    "wishlist": "views/wishlist.json",
    "profile": "views/profile.json"
  },
  "functions": {
    "login": "functions/login.ts",
    "signup": "functions/signup.ts",
    "resetPassword": "functions/resetPassword.ts",
    "myAccount": "functions/myAccount.ts",
    "wishlist": "functions/wishlist.ts",
    "profile": "functions/profile.ts"
  },
  "ui": {
    "LoginForm": "ui/LoginForm.tsx",
    "SignupForm": "ui/SignupForm.tsx",
    "ResetPasswordForm": "ui/ResetPasswordForm.tsx",
    "CustomerOverview": "ui/CustomerOverview.tsx",
    "WishlistList": "ui/WishlistList.tsx",
    "ProfileForm": "ui/ProfileForm.tsx"
  }
}
```

---

## 3.3 Admin App

**`packages/@o4o-apps/admin/manifest.json`**

```json
{
  "id": "admin",
  "name": "Admin Dashboard",
  "version": "2.0.0",
  "enabled": true,
  "views": {
    "admin-dashboard": "views/admin-dashboard.json",
    "admin-seller-list": "views/admin-seller-list.json",
    "admin-seller-detail": "views/admin-seller-detail.json",
    "admin-supplier-list": "views/admin-supplier-list.json",
    "admin-supplier-detail": "views/admin-supplier-detail.json"
  },
  "functions": {
    "adminDashboard": "functions/adminDashboard.ts",
    "adminSellerList": "functions/adminSellerList.ts",
    "adminSellerDetail": "functions/adminSellerDetail.ts",
    "adminSupplierList": "functions/adminSupplierList.ts",
    "adminSupplierDetail": "functions/adminSupplierDetail.ts"
  },
  "ui": {
    "AdminStatsCard": "ui/AdminStatsCard.tsx",
    "AdminDashboardPanel": "ui/AdminDashboardPanel.tsx",
    "AdminSellerListView": "ui/AdminSellerListView.tsx",
    "AdminSellerDetailView": "ui/AdminSellerDetailView.tsx",
    "AdminSupplierListView": "ui/AdminSupplierListView.tsx",
    "AdminSupplierDetailView": "ui/AdminSupplierDetailView.tsx"
  }
}
```

---

## 3.4 Forum Apps

### Forum App (`forum`)

```json
{
  "id": "forum",
  "name": "Community Forum",
  "version": "2.0.0",
  "enabled": true,
  "views": {},
  "functions": {},
  "ui": {}
}
```

(Forum UI는 NextGen 이전의 형태가 많으므로 최소 구조만 유지)

---

### Forum-Yaksa / Forum-Neture

두 앱 모두 동일 구조의 manifest 사용:

```json
{
  "id": "forum-yaksa",
  "name": "Yaksa Forum",
  "version": "2.0.0",
  "enabled": true,
  "views": {},
  "functions": {},
  "ui": {}
}
```

```json
{
  "id": "forum-neture",
  "name": "Neture Forum",
  "version": "2.0.0",
  "enabled": true,
  "views": {},
  "functions": {},
  "ui": {}
}
```

---

# 4. 프론트 AppStore 등록 변경

`apps/main-site/src/appstore/registry.ts` 업데이트:

```ts
export const AppRegistry = [
  { id: "commerce", manifest: "@o4o-apps/commerce/manifest.json" },
  { id: "customer", manifest: "@o4o-apps/customer/manifest.json" },
  { id: "admin", manifest: "@o4o-apps/admin/manifest.json" },
  { id: "forum", manifest: "@o4o-apps/forum/manifest.json" },
  { id: "forum-yaksa", manifest: "@o4o-apps/forum-yaksa/manifest.json" },
  { id: "forum-neture", manifest: "@o4o-apps/forum-neture/manifest.json" }
];
```

---

# 5. 성공 기준 (DoD)

* [ ] 모든 앱 패키지에 manifest.json 생성
* [ ] AppStore Loader가 manifest.json을 자동 로딩
* [ ] Function/UI/View Registry 병합 정상
* [ ] AppStore UI에 앱 상세 정보 표시
* [ ] manifest 기반 enable/disable 정상 작동
* [ ] TypeScript 오류 없음
* [ ] build 성공
* [ ] AppStore 기능이 "운영 수준"으로 완성

---

# ✔ Step 17-B — App Manifest 생성 Work Order 생성 완료!
