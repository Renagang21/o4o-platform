# 📄 **Step 24 — NextGen Multi-Site Builder Work Order**

## O4O Platform — Automated Site Creation Engine (Site Scaffolding System)

Version: 2025-12
Author: ChatGPT PM
Date: 2025-12-03

---

## 0. 목적

NextGen O4O Platform은 이미:

* ViewRenderer
* ViewGenerator
* AI Generator
* CMS Builder
* AppStore
* Deployment Manager (Step 23)

모두 구축되어 있다.

이제 Step 24에서는
**새로운 사이트(NextGen Instance)의 초기 구조를 자동으로 생성**하는 기능을 구축한다.

즉:

> **"사이트 생성(Create New Site)" 버튼 →
> 서버 생성 + 기본 페이지 + 기본 레이아웃 + 앱 설치 + CMS 초기화까지 자동 완료**

완전한 Multi-Instance SaaS가 된다.

---

## 1. 전체 아키텍처 개요

Multi-Site Builder는 다음 5개 요소로 구성됩니다:

```
apps/admin-dashboard/
  └─ pages/site-builder/      ← UI (관리자용)

apps/api-server/
  └─ modules/sites/           ← 사이트 관리 API

services/deployment-service/
  └─ site-template/           ← 템플릿 JSON/레이아웃/기본 페이지

cms builder (Step 19)
  └─ site JSON 저장

appstore
  └─ apps pre-install
```

---

## 2. Phase 구조 (A~H)

* Phase A — Site Template 정의
* Phase B — Site API Module 생성
* Phase C — Site Scaffolding Engine 구현
* Phase D — AppStore App 자동 설치
* Phase E — CMS 초기 페이지 생성
* Phase F — Layout/Theme 자동 구성
* Phase G — admin-dashboard UI 구축
* Phase H — End-to-End 실 배포 테스트

---

## 3. Phase A — Site Template 정의

새로운 사이트를 자동 생성하기 위한 초기 파일 구조:

```
/services/deployment-service/site-template/
  ├── pages/
  │     home.json
  │     login.json
  │     dashboard.json
  │     shop.json
  │     contact.json
  ├── layout/
  │     header.json
  │     footer.json
  ├── cms/
  │     theme.json
  │     navigation.json
  └── apps.json    ← 자동 설치할 AppStore 앱 목록
```

템플릿 형태:

### apps.json

```json
["commerce", "customer", "admin"]
```

### home.json

```json
{
  "viewId": "home",
  "layout": { "type": "DefaultLayout" },
  "components": [
    { "type": "HeroBanner", "props": { "title": "Welcome!", "subtitle": "New Site" } },
    { "type": "ShopFeatured", "props": {} }
  ]
}
```

---

## 4. Phase B — Site API Module 생성 (API Server)

경로:

```
apps/api-server/src/modules/sites/
```

파일:

* sites.controller.ts
* sites.service.ts
* sites.routes.ts
* site.entity.ts
* dto/create-site.dto.ts

### site.entity.ts

```ts
@Entity()
export class Site {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  domain: string;

  @Column("jsonb")
  config: any;      // template + installed apps + theme

  @Column()
  status: string;   // pending / deploying / ready

  @CreateDateColumn()
  createdAt: Date;
}
```

### REST Endpoints

| Method | URL                   | 기능        |
| ------ | --------------------- | --------- |
| GET    | /api/sites            | 사이트 목록    |
| POST   | /api/sites            | 신규 사이트 생성 |
| GET    | /api/sites/:id        | 상세        |
| POST   | /api/sites/:id/scaffold | 스캐폴딩 실행        |
| POST   | /api/sites/:id/apps   | 앱 설치      |

---

## 5. Phase C — Site Scaffolding Engine

(핵심)

역할:

```
Site Template + Selected Apps
       ↓
CMS 초기 페이지 생성
       ↓
AppStore 앱 설치
       ↓
Layout/Header/Footer 구성
       ↓
Deployment Manager로 전달
```

핵심 함수:

```ts
export async function scaffoldSite(template, domain, installApps) {
  const cmsPages = template.pages;
  const layout = template.layout;
  const theme = template.theme;

  await cmsService.createPages(domain, cmsPages);
  await cmsService.setLayout(domain, layout);
  await appStoreService.installApps(domain, installApps);

  return { success: true };
}
```

---

## 6. Phase D — AppStore 자동 설치

배포 시 선택된 앱 목록을 자동 설치:

```
POST /api/deployment/install-apps {
  domain,
  apps: ["commerce", "customer", "admin"]
}
```

AppStore manifest 기반 설치:

```
await installApp(appId)
```

CMS와 ViewRegistry 자동 업데이트.

---

## 7. Phase E — CMS 초기 페이지 생성

사이트 생성 시 자동 생성되는 페이지:

| 페이지       | 목적       |
| --------- | -------- |
| home      | 홈 화면     |
| login     | 로그인      |
| dashboard | 사용자 대시보드 |
| shop      | 기본 상품 목록 |
| contact   | 문의 페이지   |

CMS API 호출:

```
POST /api/cms/views
{
  "viewId": "home",
  "url": "/",
  "json": { ... }
}
```

---

## 8. Phase F — Layout / Theme 자동 구성

Tenant별 테마 적용 가능:

* primary 색
* secondary 색
* 로고 설정
* Footer 구조
* Header 메뉴 구성

테마 JSON 예시:

```json
{
  "theme": {
    "colors": { "primary": "#1A73E8", "accent": "#F97316" },
    "logo": "/media/logo.png",
    "navigation": [
      { "label": "Home", "href": "/" },
      { "label": "Shop", "href": "/shop" }
    ]
  }
}
```

---

## 9. Phase G — Admin-dashboard UI 구축

경로:

```
apps/admin-dashboard/src/pages/site-builder/
```

생성 파일:

* SiteBuilder.tsx
* CreateSiteForm.tsx
* SiteCard.tsx
* SiteDetail.tsx

UI 기능:

* 새로운 사이트 생성
* 템플릿 선택
* 설치할 앱 선택
* 테마 선택
* CMS 페이지 자동 생성 진행 bar
* 배포 완료 시 링크 제공

---

## 10. Phase H — E2E 테스트

테스트 절차:

1. Admin → "Create Site" 클릭
2. domain 입력
3. 템플릿 선택
4. 앱 선택
5. Scaffold 시작
6. CMS 페이지 자동 생성 확인
7. Deployment Manager로 서버 생성
8. 신규 사이트 접근 → 정상 동작 확인

---

## 11. 성공 기준 (DoD)

* [ ] site-template json 구조 완성
* [ ] /api/sites 전체 구현
* [ ] scaffoldSite 함수가 정상적으로 모든 작업 수행
* [ ] CMS Builder에서 페이지 정상 생성
* [ ] AppStore 앱 자동 설치
* [ ] admin-dashboard에서 UI 정상 표시
* [ ] test domain에서 사이트 생성 성공
* [ ] Step 23 + Step 24 완전 연동 성공

---

## 12. 구현 순서

1. **Phase A**: Site Template JSON 파일 생성
2. **Phase B**: API Server에 Sites Module 생성
3. **Phase C**: Scaffolding Engine 구현
4. **Phase D**: AppStore 연동
5. **Phase E**: CMS 페이지 생성기
6. **Phase F**: Theme/Layout 자동 구성
7. **Phase G**: Admin UI 구현
8. **Phase H**: 통합 테스트

---

## ✔ Step 24 — Multi-Site Builder Work Order 완료!

이 시스템이 완성되면 O4O Platform은 **완전한 Website-as-a-Service**가 됩니다.
