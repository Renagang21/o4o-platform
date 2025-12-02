# 📄 **Step 16 — NextGen AppStore Integration Work Order**

## O4O Platform – App Store (NextGen) Unified Install/Remove Engine

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목표

NextGen Frontend는 이미:

* ViewRenderer
* ViewGenerator
* AI Generator
* Layout System
* Function Component
* UI Component
* Routing AutoLoader
* Legacy Cleanup (Steps 13/14)

까지 완성된 상태이다.

이제 **NextGen AppStore**를 구축하여:

1. Dropshipping, Commerce, Customer, Admin 등
   모든 도메인을 "App 단위"로 관리
2. 앱 설치/제거/활성화 기능 제공
3. 각 앱이 자체 View, Function Component, UI Component, manifest를 가짐
4. NextGen Frontend가 앱 기반 확장 구조로 재구성됨
5. 미래 앱(약사회 앱, cosmetics 앱, signage 앱 등)도 쉽게 추가 가능

즉, AppStore는 O4O Platform의 **운영·확장·SaaS 전개의 중심 엔진**이다.

---

# 1. NextGen App 구조 (App Package Structure)

각 앱은 다음 구조를 가진다:

```
packages/@o4o-apps/<app-name>/
  ├── manifest.json
  ├── views/
  ├── functions/
  ├── ui/
  ├── assets/
  ├── README.md
  └── migrations/ (optional)
```

---

## 1.1 manifest.json 예시

```json
{
  "id": "dropshipping",
  "name": "Dropshipping App",
  "version": "2.0.0",
  "enabled": true,
  "entrypoint": "views/app-root.json",
  "components": {
    "SellerDashboard": "functions/sellerDashboard.ts",
    "SupplierDashboard": "functions/supplierDashboard.ts"
  },
  "views": [
    "views/seller-dashboard.json",
    "views/supplier-dashboard.json"
  ]
}
```

---

# 2. App Registry (프론트엔드 앱 등록 시스템)

NextGen main-site에 포함:

```
apps/main-site/src/appstore/registry.ts
```

내용:

```ts
export const AppRegistry = [
  {
    id: "dropshipping",
    label: "Dropshipping",
    enabled: true,
    manifest: "@o4o-apps/dropshipping/manifest.json"
  },
  {
    id: "commerce",
    label: "E-Commerce",
    enabled: true,
    manifest: "@o4o-apps/commerce/manifest.json"
  },
  {
    id: "customer",
    label: "Customer",
    enabled: true,
    manifest: "@o4o-apps/customer/manifest.json"
  }
];
```

---

# 3. App Loader (앱 로딩 엔진)

새 파일 생성:

```
apps/main-site/src/appstore/loader.ts
```

핵심 역할:

1. manifest.json 읽기
2. views/ 폴더 자동 merge
3. Function Component Registry auto-merge
4. UI Component Registry auto-merge
5. AppStore 설정에 따라 앱 활성/비활성 처리

코드 예시:

```ts
export async function loadApp(app) {
  const manifest = await import(app.manifest);
  if (!manifest.enabled) return;

  // load views
  manifest.views.forEach(v => registerView(v));

  // load functions
  Object.entries(manifest.components).forEach(([key, file]) => {
    const func = require(file).default;
    FunctionRegistry[key] = func;
  });

  // load UI
  // similar pattern...
}
```

---

# 4. AppStore UI (앱 설치/제거 화면)

View JSON 기반으로 생성:

### 앱 목록 화면 `/admin/apps`

`views/admin-apps.json`:

```json
{
  "viewId": "admin-app-list",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "appList",
      "props": {
        "fetch": {
          "queryKey": ["app-list"],
          "url": "/api/appstore/apps"
        }
      }
    }
  ]
}
```

### AppStore UI 컴포넌트

```
apps/main-site/src/components/ui/appstore/
  AppCard.tsx
  AppList.tsx
  AppInstallButton.tsx
  AppRemoveButton.tsx
```

예:

```tsx
export function AppCard({ app }) {
  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="font-bold">{app.name}</h3>
      <p className="text-sm">{app.version}</p>
      <AppInstallButton app={app} />
    </div>
  );
}
```

---

# 5. AppStore API (Admin Dashboard → API Server 연동)

### API 엔드포인트

```
GET  /api/appstore/apps
POST /api/appstore/install
POST /api/appstore/uninstall
POST /api/appstore/enable
POST /api/appstore/disable
```

NextGen API Server는 다음을 수행:

* manifest.json 읽기
* NextGen repo 경로에서 앱 검색
* 설치/제거 시 enabled 변경
* 캐시 삭제 → routing refresh

---

# 6. 작업 단계 (Phase A~H)

### Phase A — AppStore 폴더 생성 (1h)

```
apps/main-site/src/appstore/
```

### Phase B — manifest 로더 구현 (3h)

### Phase C — App Registry / Loader 작성 (2h)

### Phase D — Function/UI Registry 자동 merge (1h)

### Phase E — View JSON merge (1h)

### Phase F — AppStore UI 생성 (2h)

### Phase G — API Server Endpoints 생성 (4–6h)

### Phase H — 통합 테스트 (1–2h)

총 예상: **10–14시간**

---

# 7. 성공 기준 (DoD)

* [ ] AppStore 화면 렌더링됨
* [ ] 앱 목록 API 정상 동작
* [ ] enable/disable 작동
* [ ] manifest 기반 Function/UI/Views 자동 로딩
* [ ] NextGen main-site routing과 충돌 없음
* [ ] 설치/제거 후 자동 refresh
* [ ] TS 오류 없음
* [ ] 콘솔 오류 없음
* [ ] NextGen dropshipping / commerce / customer / admin 모두 App으로 관리됨

---

# ✔ Step 16 — NextGen AppStore Integration Work Order 생성 완료!

---

이제 이 문서를 새 개발 채팅방에 붙여넣으면
Codex / Claude Code / Cursor가
**NextGen AppStore 엔진**을 바로 구현하기 시작합니다.
