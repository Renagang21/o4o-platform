# CHECK — WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1` |
| 검증일 | 2026-08-06 |
| 환경 | 프로덕션 (`https://api.neture.co.kr` · `https://pharmacyhub.co.kr`) |
| 구현 커밋 | `6beff7479` feat(pharmacy-hub): add store content and library |
| 결과 | **PASS** (블로그 공개 URL 미구현은 작업요청서 §범위에 따른 의도된 제외) |

---

## 0. 진행 중 중지 없음

작업요청서의 중지 조건 10개는 어느 것도 발생하지 않았다. 단, 다음 2건은 **조사 단계에서 판단이 필요했으므로 근거를 남긴다.**

**(a) 블로그 공개 URL 계약 부재 — 중지 아님**

Pharmacy-Hub 에는 매장 블로그 공개 URL(공개 storefront slug 라우트)이 아직 없다. 작업요청서는 이 경우
"블로그 공개 URL 부재 **단독**은 WO 전체를 중지할 사유가 아니며, 저작·관리까지만 구현한다" 로 명시하고 있다.
따라서 발행은 `store_blog_posts.status='published'` 기록까지 수행하고, 화면에서 공개 URL 이 아직 없음을 안내한다.

**(b) 공통 API 를 그대로 마운트하지 않고 PH adapter 를 둔 이유**

공통 `/api/v1/store/{content,library}` · `{svc}/stores/:slug/blog/staff` 라우트는 `createRequireStoreOwner()` / `resolveStoreAccess()` 로
**KPA·GlycoPharm·K-Cosmetics 기준의 조직**을 해석한다. Pharmacy-Hub enrollment 조직을 해석하지 않으므로 그대로 마운트하면
`STORE_OWNER_REQUIRED` 로 전량 차단된다. 공통 가드를 고치는 것은 금지 항목이므로 **W7 과 동일한 B안(service-extraction)** 을 적용했다.

- 공통 로직 → `apps/api-server/src/services/store/store-{content,library,blog}.service.ts`
  - `organizationId` 를 **인자로** 받는다. 인증·조직 해석·envelope 렌더링을 하지 않는다.
  - 중립 결과 객체 `{ok:true,data}` | `{ok:false,status,code,message}` 를 반환한다.
- 기존 공통 라우트는 **같은 계약으로 위임 전환** — 로직 복제 0, 응답 형태 불변(nested envelope).
- PH 컨트롤러는 `resolvePharmacyHubStoreOrganization()` 로 조직만 결정하고 PH flat envelope 로 응답한다.

---

## 1. 구현 범위

### 1-1. 백엔드 — 공통 서비스 추출

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/services/store/store-content.service.ts` | 매장 콘텐츠(`kpa_store_contents`) CRUD |
| `apps/api-server/src/services/store/store-library.service.ts` | 자료함(`store_execution_assets`) CRUD |
| `apps/api-server/src/services/store/store-blog.service.ts` | 블로그(`store_blog_posts`) CRUD + publish/archive |

기존 공통 컨트롤러 3개(`o4o-store/controllers/store-content.controller.ts` · `store-library.controller.ts` · `blog.controller.ts`)는
자체 구현을 제거하고 위 서비스에 위임한다 (**-541 / +156 lines**).

### 1-2. 백엔드 — Pharmacy-Hub adapter

| 파일 | 라우트 수 |
|------|:---:|
| `controllers/pharmacy-hub/PharmacyHubStoreContentController.ts` | 5 |
| `controllers/pharmacy-hub/PharmacyHubStoreLibraryController.ts` | 4 |
| `controllers/pharmacy-hub/PharmacyHubStoreBlogController.ts` | 7 |

`routes/pharmacy-hub/pharmacy-hub.routes.ts` 에 **16 라우트** 등록, 전부
`storeOwnerGuards = [requireAuth, requirePharmacyHubScope('pharmacy-hub:store_owner')]` 뒤에 마운트.

조직 해석은 W5/W7 과 동일 계약:

| enrollment 수 | 읽기 | 쓰기 |
|:---:|------|------|
| 0 | 200 + 빈 목록 + `storeConnection='not_connected'` | 409 `STORE_NOT_CONNECTED` |
| 1 | 해당 조직만 | 해당 조직만 |
| 2+ | 200 + 빈 목록 + `storeConnection='ambiguous'` | 409 `AMBIGUOUS_STORE_CONNECTION` |

### 1-3. 프론트 — 화면 6개

| 라우트 | 컴포넌트 |
|--------|----------|
| `/store-owner/content` | `ContentPage.tsx` |
| `/store-owner/library` | `LibraryPage.tsx` |
| `/store-owner/library/resources` | `LibraryResourcesPage.tsx` |
| `/store-owner/blog` | `BlogPage.tsx` |
| `/store-owner/blog/new` · `/store-owner/blog/:id/edit` | `BlogEditorPage.tsx` |

- 자료함 목록은 공통 `StoreProductionMaterialsView` + `mergeProductionMaterials` 재사용 (KPA·KCos 화면 복사 0).
- 편집기는 표준 `RichTextEditor(@o4o/content-editor)` — 서비스 전용 편집기 0.
- 사이드바에 `콘텐츠·자료함` 섹션 추가 (`storeMenuConfig.ts`, 키 `store-contents` / `library` / `blog`).

### 1-4. 공통 컴포넌트 확장 (하위호환)

`StoreProductionMaterialsView` 에 `crossCreateLinks` · `guideLink` optional prop 추가.
PH 는 `/store/marketing/*` route 가 없으므로 PH route 로 override 하고 guideLink 는 숨긴다 (**데드링크 0**).
미주입 시 기존 3서비스 동작은 그대로다.

### 1-5. 원장 (신규 테이블 0)

| 축 | 테이블 | 경계 |
|----|--------|------|
| 매장 콘텐츠 | `kpa_store_contents` (legacy physical name · service-neutral Store Production Material) | `organization_id` |
| 자료함 | `store_execution_assets` | `organization_id` |
| 블로그 | `store_blog_posts` | `store_id`(=`organizations.id`) + `service_key` |

---

## 2. 변경 금지 항목 준수

| 금지 항목 | 준수 | 근거 |
|-----------|:---:|------|
| DB schema 변경 / migration | ✅ | 신규 migration 파일 0, `git show --stat` 에 `migrations/` 없음 |
| 신규 Pharmacy-Hub 전용 콘텐츠 테이블 | ✅ | 위 3개 공통 원장만 사용 |
| 공통 `resolveStoreAccess()` 변경 | ✅ | 미수정 |
| 공통 store-owner 가드 변경 | ✅ | `createRequireStoreOwner()` 미수정 |
| 공급자·운영자 원본 직접 수정 | ✅ | 매장 사본 row 만 write |
| 원본·사본 row 공유 | ✅ | PH write 는 전부 자기 조직 row 신규 생성 |
| QR·POP·태블릿·사이니지 구현 | ✅ | 범위 외 · 미구현 |
| KPA·K-Cosmetics 화면 복사 | ✅ | 공통 컴포넌트 재사용 |

---

## 3. 정적 검증

| 검증 | 결과 |
|------|------|
| `pnpm --filter @o4o/api-server typecheck` | PASS |
| `pnpm --filter @o4o/web-pharmacy-hub build` | PASS |
| GlycoPharm · K-Cosmetics · KPA 빌드 | PASS (공통 컴포넌트 prop 추가가 optional 임을 확인) |
| `pnpm-lock.yaml` | dependency 실변경(`@o4o/content-editor` workspace 추가) 있으므로 포함 |
| `services/web-pharmacy-hub/Dockerfile` | 신규 workspace dependency COPY 2줄 + build 1줄 추가 (누락 시 빌드 실패하는 알려진 함정) |

### 3-1. 배포 상태 (`6beff7479`)

| 워크플로 | 결과 |
|----------|------|
| Deploy API Server (Cloud Run) | ✅ success |
| Deploy Web Services (Cloud Run) | ✅ success |
| Deploy Admin Dashboard | ✅ success |
| CodeQL | ✅ success |
| CI Pipeline | ❌ failure — **본 WO 무관 선행 결함** |

CI Pipeline 실패는 `apps/admin-dashboard/src/tests/admin-menu-batch2.test.ts` (메뉴 45개 기대 / 실제 40개).
**직전 커밋 `0b0511a22` 에서 동일하게 실패**함을 확인했으므로 본 WO 로 인한 회귀가 아니다.

---

## 4. 프로덕션 스모크

검증 계정은 `[E2E_TEST]` 접두 계정을 **정식 가입 → 운영자 승인** 경로로 생성했다.
임시 비밀번호는 검증 프로세스 메모리에서 생성했고 소스·문서·CHECK·로그·환경 파일 어디에도 기록하지 않았다.

### 4-1. 미인증 — 16/16 차단

PH store-owner 16 라우트 전부 **401 `AUTH_REQUIRED`**. 무방비 라우트 0.

### 4-2. 연결된 매장 — 전 축 CRUD·lifecycle

| 축 | 동작 | 결과 |
|----|------|------|
| content | 목록(등록 전) → 생성 → 상세 → 수정 → 목록(등록 후) | 200 / 201 / 200 / 200 / total 1 |
| library | 목록 → 생성(`content`) → 생성(`external-link`) → 수정 → 목록 | 200 / 201 / 201 / 200 / total 2 |
| blog | 목록 → 생성 → 상세 → 수정 → publish → archive | 200 / 201 / 200 / 200 / `status=published`+`publishedAt` / `status=archived` |

### 4-3. 입력 가드 (음성 케이스)

| 요청 | 기대 | 실제 |
|------|------|------|
| `POST content {organizationId}` | 400 `FIELD_NOT_ACCEPTED` | ✅ |
| `POST library {organizationId}` | 400 `FIELD_NOT_ACCEPTED` | ✅ |
| `POST blog {storeId}` | 400 `FIELD_NOT_ACCEPTED` | ✅ |
| `POST blog {serviceKey}` | 400 `FIELD_NOT_ACCEPTED` | ✅ |
| `GET content/not-a-uuid` | 400 `INVALID_ID` | ✅ |
| `PUT library/not-a-uuid` | 404 `LIBRARY_ITEM_NOT_FOUND` | ✅ |
| `GET blog/not-a-uuid` | 404 `POST_NOT_FOUND` | ✅ |
| `POST content {title:'  '}` | 400 `VALIDATION_ERROR` | ✅ |
| `POST library {assetType:'bogus'}` | 400 `VALIDATION_ERROR` | ✅ |
| `POST library external-link (url 누락)` | 400 `VALIDATION_ERROR` | ✅ |
| `POST blog (title 누락)` | 400 `VALIDATION_ERROR` | ✅ |
| `POST content {productRef 타 매장}` | 400 `INVALID_PRODUCT_REF` | ✅ |

매장은 **서버가 결정**하며 클라이언트가 조직·매장·서비스를 지정할 수 있는 경로는 없다.

### 4-4. 스코프 가드

`pharmacy-hub:operator` 토큰으로 store-owner 라우트 3종 호출 → **403** (content / library / blog 전부).

### 4-5. 미연결 계정 (PH enrollment 0)

| 요청 | 결과 |
|------|------|
| `GET content` / `library` / `blog` | 200 + 빈 목록 + `storeConnection='not_connected'` |
| `POST content` / `library` / `blog` | 409 `STORE_NOT_CONNECTED` |

### 4-6. 교차 조직 격리

다른 `[E2E_TEST]` 조직 소유 자료함 row 에 대해 `PUT` · `DELETE` → **404** (존재 자체가 노출되지 않음).

### 4-7. 브라우저 스모크 (`https://pharmacyhub.co.kr`)

| 항목 | 결과 |
|------|------|
| 6개 라우트 렌더 | 전부 정상 |
| 사이드바 `콘텐츠·자료함` 섹션 | 노출 |
| console error / pageerror | **0** |
| `/store-owner/*` 링크 데드링크 | **0** |
| 블로그 발행 안내 문구 | 공개 URL 미제공 사실 표기 확인 |

---

## 5. 공통 라우트 회귀 (서비스 추출 후 동작 불변)

공통 컨트롤러 3개를 서비스 위임으로 전환했으므로 기존 3서비스 소비처를 재확인했다 (읽기 전용).

| 라우트 | 매장 owner | 비-owner | 미인증 |
|--------|-----------|----------|--------|
| `GET /api/v1/kpa/store-contents` | 200 · 15건 | 200 · 0건 | 401 `AUTH_REQUIRED` |
| `GET /api/v1/kpa/store-library/contents` | 200 · 18건 | — | 401 |
| `GET /api/v1/glycopharm/pharmacy/library` | 200 · 7건 | 403 `STORE_OWNER_REQUIRED` | 401 |
| `GET /api/v1/cosmetics/pharmacy/library` | 200 · 7건 | 403 `STORE_OWNER_REQUIRED` | 401 |
| `GET /api/v1/cosmetics/stores/:slug/blog` (미존재 slug) | 404 `STORE_NOT_FOUND` (nested envelope 불변) | — | — |

응답 키 구성(`items` / `page` / `limit` / `total`)과 실패 envelope(nested `{error:{code,message}}`)가 추출 전과 동일하다.

**한계(솔직 표시)** — 공통 블로그 staff 라우트의 **성공 경로**는 이번 회차에 실측하지 못했다.
검증 계정에 접근 가능한 KPA/GP/KCos 매장 slug 를 확보하지 못했기 때문이다.
대신 (a) 같은 추출 서비스(`store-blog.service.ts`)를 사용하는 PH 블로그 CRUD·publish·archive 전 경로가 green 이고,
(b) 공통 블로그 라우트가 정상 마운트되어 원래 envelope 로 응답함을 확인했으며,
(c) diff 상 컨트롤러 변경이 순수 위임 전환임을 확인했다.

---

## 6. 테스트 데이터 원상 복구

| 대상 | 처리 |
|------|------|
| content 1건 | API `DELETE` → 목록 0건 확인 |
| library 2건 | API `DELETE`(soft, `is_active=false`) → 목록 0건 확인 |
| blog 1건 | API `DELETE` → 목록 0건 확인 |
| `[E2E_TEST] w8` 잔재 멤버십 | 운영자 반려 처리 |
| `[E2E_TEST] w8c` 멤버십 | 데이터 미생성 · 운영자 반려 처리 |
| `[E2E_TEST] w8b` 멤버십/조직 `a80ddfee-…` | 데이터 row 0 상태로 잔존 (W7 선례와 동일) |

`renagang21` 및 KPA·K-Cosmetics·Neture 조직에 대한 write 0.
`[E2E_TEST]` 계정과 해당 E2E 조직 외 DB write 0.

**한계(솔직 표시)** — DB 레벨 write 격리 SQL 은 이번 회차에 재측정하지 못했다 (DB 자격증명 취득 경로가 도구 정책상 차단).
대신 §4-6 의 API 레벨 교차 조직 404 격리와 §4-3 의 조직 지정 필드 전면 거부로 격리를 입증한다.

---

## 7. 후속 (본 WO 범위 외)

1. **블로그 공개 URL** — Pharmacy-Hub 공개 storefront slug 라우트가 생기면 `status='published'` 글의 공개 경로를 연결한다.
2. **QR·POP·태블릿·사이니지** — 매장 실행 자산 축은 별도 WO.
3. **CI Pipeline `admin-menu-batch2.test.ts`** — 선행 결함, 별도 정리 필요.
