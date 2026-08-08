# CHECK — WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1` (매장 실행 자산 — QR / POP / 태블릿 / 사이니지 / 상품 설명서) |
| 검증일 | 2026-08-08 |
| 구현 커밋 | `b3aae68b1` (QR · 상품 설명서) / POP · 사이니지 (본 커밋) |
| 결과 | **IMPLEMENTATION_COMPLETE / PENDING_PRODUCTION_VERIFICATION / TABLET_DEFERRED** |

> **아직 `PASS` 로 닫지 않는다.** A·B·D·E 4개 축의 **구현**은 끝났지만 POP·사이니지 배포와
> 인증 사용자 프로덕션 실측이 남아 있다. §5-5 의 미수행 항목이 모두 PASS 한 뒤에만
> 최종 판정을 `PASS with TABLET_DEFERRED` 로 확정한다.
>
> 태블릿은 작업요청서의 중지 조건("병행 세션 파일과 실제 충돌")에 실제로 해당해 분리했다.
> 작업요청서가 "한 축이 중지 조건에 걸려도 나머지는 계속 진행" 하도록 지시했으므로
> 나머지 4개 축을 완결하고 태블릿만 후속 WO 로 넘긴다.

---

## 0. 축별 결론

| 축 | 상태 | 프로덕션 |
|---|---|---|
| A. QR | **완료** (backend + frontend + 공개 랜딩 + 메뉴) | **LIVE** (§6-1) |
| B. POP | **완료** (backend + frontend + 메뉴) | 미배포 |
| D. 디지털 사이니지 | **완료** (backend + frontend + 메뉴) | 미배포 |
| E. 상품 설명서 | **완료** (조회 전용, 설명서 write 0) | **LIVE** (§6-1) |
| C. 태블릿 | **HOLD** → `WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1` | — |

---

## 1. Canonical SSOT 조사 결과 (5개 축 전부)

판정 기준이 둘 이상인 축은 없었다.

| 축 | 저장 SSOT | 공통 API 위치 | 기존 조직 해석 |
|---|---|---|---|
| QR | `store_qr_codes` + `store_qr_scan_events` | `o4o-store/store-qr-landing.controller.ts` | `createRequireStoreOwner` ❌ |
| POP | `store_pops` (author_role='store' 사본) | `o4o-store/pop.controller.ts` (`/stores/:slug/pop/staff`) | slug + `created_by_user_id` ❌ |
| 태블릿 | `store_tablets` · `store_tablet_screen_sets` | `platform/store-tablet.routes.ts` | `createRequireStoreOwner` (serviceKey **미지정**) ❌ |
| 사이니지 | `store_playlists`(+items) → `o4o_asset_snapshots` | `o4o-store/store-playlist.controller.ts` + `StorePlaylistRepository` | `resolveStoreAccess` ❌ |
| 설명서 | `shared_product_descriptions` (`STORE`/`canonical`) + `product_landings` | `platform/store-handled-products.routes.ts` · `ProductLandingService` | `resolveStoreAccess` ❌ |

### 1-1. QR 이 둘로 보이는 것 — 중복 아님

`store_qr_codes`(매장 발행 QR, `/qr/{slug}`)와 제품 Landing QR(`/p/{key}`)은 F12 **다른 계층**이다.
계층1 Product Resource(master 기준·매장 무관·QR 비저장) vs 계층2 Store Production Material(매장 소유·slug 원장·스캔 추적).
QR 화면은 전자를 쓰지 않고, 설명서 화면은 후자를 쓰지 않는다 → 중지 조건 미해당.

### 1-2. 5개 축 공통 — 공통 조직 해석을 쓸 수 없는 이유

`isStoreOwner()` 는 `organization_members` 를 **ORDER BY 없이 LIMIT 1**, service enrollment 조건 없이 고른다.
공통 가드 변경은 금지 항목이므로 W7/W8 과 동일하게 **공통 service 추출 + PH adapter** 를 적용했다.

---

## 2. 공통 service 추출 (로직 복제 0)

| 신규 service | 위임 전환된 공통 controller | 소비 서비스 |
|---|---|---|
| `services/store/store-qr.service.ts` | `o4o-store/store-qr-landing.controller.ts` | KPA · GlycoPharm · K-Cosmetics · **PH** |
| `services/store/store-pop.service.ts` | `o4o-store/pop.controller.ts` | KPA · GlycoPharm · K-Cosmetics · **PH** |
| (추출 불필요) `StorePlaylistRepository` | — 이미 org-scoped 클래스라 그대로 재사용 | KPA · **PH** |

세 경우 모두 **인터페이스·응답 envelope·상태코드 무변경**의 기계적 위임 전환이며,
조직 해석(`createRequireStoreOwner` / slug+`created_by`)은 손대지 않았다.

`store_pops` 위임에서 기존 계약 2가지를 그대로 보존했다:
목록은 `data`=배열 + `meta`=페이지 정보, import 응답은 사본 필드 + `importSource` 평탄화.

---

## 3. Pharmacy-Hub adapter

| 컨트롤러 | 라우트 | 핵심 |
|---|:--:|---|
| `PharmacyHubStoreQrController` | 8 | slug 서버 발급 · 연결 대상 매장 소유 검증 · 공개 랜딩 |
| `PharmacyHubStorePopController` | 9 | 매장 직접 작성 · HUB import · publish/archive |
| `PharmacyHubStoreSignageController` | 10 | 재생 목록 CRUD · 항목(자료함/매장 미디어) · 순서 |
| `PharmacyHubStoreManualController` | 3 | canonical 설명서 조회 · 상품 QR 멱등 발급 |

전부 `resolvePharmacyHubStoreOrganization()` **단일 경로**로만 조직을 정하고,
`storeOwnerGuards = [requireAuth, requirePharmacyHubScope('pharmacy-hub:store_owner')]` 뒤에 마운트했다.

### 3-1. 설계 판단 (근거를 남길 만한 것만)

**QR — 생성 후 목적지·주소 수정 불가.** `store_qr_codes.slug` 는 전역 unique 라 서버가 발급한다.
수정은 이름·설명·상담 CTA 로 제한했다. 이미 인쇄해 매장에 붙인 QR 이 조용히 다른 곳을 가리키면
매장 밖에 나가 있는 인쇄물을 회수할 방법이 없기 때문이다. 목적지를 바꾸려면 새 QR 을 만든다.

**QR — V1 연결 유형 = page · product · link.** `video`·`screen_set` 은 공통 service 가 이미 지원하지만
Pharmacy-Hub 에 매장 동영상·태블릿 화면 축이 없어 **스캔하면 빈 화면이 되는 QR** 이 된다. 열지 않았다.

**QR — 공개 랜딩을 같은 WO 에서 함께 열었다.** payload 가 `https://pharmacyhub.co.kr/qr/{slug}` 이므로
이 화면이 없으면 인쇄한 QR 이 아무 데도 닿지 못한다. 관리 화면만 만드는 것은 미완성이다.

**POP — 억지 HUB 를 만들지 않았다.** PH 에는 운영자 POP 원본이 없다(운영자 콘솔이 회원 승인까지만 구현).
PH 전용 운영자 HUB 를 신설하는 대신, 기존 구조가 **이미 허용하는** 매장 직접 작성
(`POST /stores/:slug/pop/staff` — WO-O4O-POP-SAVE-AS-CONTENT-V1)을 주 경로로 뒀다.
`/pop/hub` 는 같은 계약을 노출할 뿐이며 원본이 없으면 정상적으로 빈 목록이고,
프론트는 원본이 실제로 있을 때만 "가져오기" 버튼을 노출한다(빈 버튼 0).

**사이니지 — 신규 미디어 등록 경로를 만들지 않았다.** `signage_media` 원본 작성은 운영자·공급자 영역이다.
매장은 자기 자료함(W8)에서 항목을 가져오는 것이 주 경로이고, `signage_media` 는 **매장 소유**
(`organizationId` 일치)만 추가 대상이다.

**설명서 — 조회 시 write 0.** KPA 는 `GET /handled-products/qr` 에서 Landing 을 mint 하지만,
여기서는 목록·상세를 순수 읽기(`getByMaster`)로 두고 발급은 명시적 `POST .../qr` 에서만 한다.

---

## 4. 원본·사본 독립성 (작업요청서 §자산 소유·복사 원칙)

| 축 | 사본 생성 | 원본 보호 |
|---|---|---|
| QR (page) | `ensureStoreCopyForPageTarget` → `store_execution_assets` 매장 사본 | content_hub 원본 직접 참조 0 |
| POP (import) | 새 id · 매장 `store_id` · `status='draft'` **값 복사** | 원본 FK 없음 → 원본 수정·삭제가 사본에 무영향 (테스트로 고정, §5) |
| 사이니지 | `AssetCopyService.copyResolved()` → 매장 소유 `o4o_asset_snapshots` | 원본 무수정 · row 공유 0 · 재추가 시 스냅샷 재사용 |
| 설명서 | **사본 없음** — 계층1 Product Resource 라 매장별 복제 자체가 금지 | write 0 |

---

## 5. 검증 — 실측 결과

### 5-1. 신규 단위 테스트 (배포 전 회귀 근거)

두 공통 service 는 4개 서비스가 공유하는데 **그동안 테스트가 0** 이었다. 위임 전환으로 계약이
바뀌지 않았음을 고정하기 위해 신규 작성했다.

| 파일 | 결과 |
|---|---|
| `services/store/__tests__/store-qr.service.test.ts` | ✅ **15/15 PASS** |
| `services/store/__tests__/store-pop.service.test.ts` | ✅ **18/18 PASS** |

고정한 불변식:

- QR: slug 전역 충돌 409 / screen_set 미존재 404 / **screen_set 멱등 재사용(`reused:true`, 신규 save 0, `public_qr_slug` 동기화)** /
  product 미승인 400 / 상담 CTA 는 page 에서만 ON / 비활성 일반 QR 404 vs 비활성 screen_set **410** /
  soft delete(`is_active=false`) / 타 매장 404(존재 여부 미노출) / 스캔 이벤트는 **IP 해시만** 저장
- POP: `(store_id, service_key, author_role='store')` 복합 경계 / body 로 `authorRole`·`storeId`·`status` 뒤집기 불가 /
  import 원본은 `operator`+`published`+같은 서비스만 / 사본에 원본 FK 없음 / 매장 내 slug 충돌 회피 /
  **publishedAt 은 최초 발행에만 기록**(보관 후 재발행이 최초 발행일을 덮지 않음)

### 5-2. typecheck · build

| 대상 | 결과 |
|---|---|
| `api-server` tsc --noEmit | ✅ PASS |
| `pharmacy-hub-web` type-check + build | ✅ PASS (3,482 modules) |
| `web-kpa-society` tsc --noEmit | ✅ PASS |
| `web-glycopharm` type-check | ✅ PASS |
| `web-k-cosmetics` tsc --noEmit | ✅ PASS |

`store-ui-core` 메뉴 config 를 바꿨으므로 **4개 소비 서비스 전부** 확인했다.

### 5-3. 프로덕션 API smoke — 공개 QR 랜딩 (4개 서비스)

위임 전환의 최대 위험은 KPA·GlycoPharm·K-Cosmetics 의 QR 회귀였다. 실측 결과:

| 서비스 | 응답 | envelope |
|---|---|---|
| `kpa` | `404` `QR_NOT_FOUND` | nested `{error:{code,message}}` — **기존 계약 그대로** |
| `glycopharm` | `404` `QR_NOT_FOUND` | nested — 동일 |
| `cosmetics` | `404` `QR_NOT_FOUND` | nested — 동일 |
| `pharmacy-hub` | `404` `QR_NOT_FOUND` | flat `{error,code}` — **PH 계약대로** |

500 없음 = 위임된 `resolvePublicQrLanding` 이 프로덕션 DB 위에서 정상 실행된다.
3개 기존 서비스의 envelope 이 nested 로 보존됐고 PH 만 flat 이라는 점까지 확인했다.

### 5-4. 프로덕션 라우트 마운트

| endpoint | 응답 | 해석 |
|---|---|---|
| `/pharmacy-hub/store-owner/qr` | `401 AUTH_REQUIRED` | 마운트 + 가드 정상 |
| `/pharmacy-hub/store-owner/qr/sources` | `401 AUTH_REQUIRED` | 동일 |
| `/pharmacy-hub/store-owner/manuals` | `401 AUTH_REQUIRED` | 동일 |
| `/pharmacy-hub/store-owner/pop` | `404` | **미배포** (본 커밋 대상) |
| `/pharmacy-hub/store-owner/signage/playlists` | `404` | **미배포** (본 커밋 대상) |

### 5-5. 배포 후 프로덕션 실측 (2026-08-08, 커밋 `79e611c57` 배포분)

| 워크플로 | 커밋 | 결과 |
|---|---|---|
| Deploy API Server (Cloud Run) | `79e611c57` | ✅ success |
| Deploy Admin Dashboard (Cloud Run) | `79e611c57` | ✅ success |
| Deploy Web Services (Cloud Run) | `4e9ccc303` (내 커밋의 자손) | ✅ success |
| CI Pipeline · CodeQL | `79e611c57` | ⚠️ cancelled — 병행 세션의 후속 push 가 `concurrency: cancel-in-progress` 로 대체. 자손 커밋 `a7486832a`·`4e9ccc303` 의 CodeQL success 로 대체 확인 |

**엔드포인트 마운트 · 가드 (전 축)**

| endpoint | 결과 |
|---|---|
| `store-owner/qr` · `qr/sources` · `pop` · `pop/hub` · `signage/playlists` · `signage/sources` · `manuals` | 전부 `401 AUTH_REQUIRED` — 마운트 + 가드 정상 |
| 쓰기 8종 (POST qr / pop / pop·import / signage·playlists, PUT qr/:id, PATCH pop/:id/publish, DELETE signage/playlists/:id, POST manuals/:id/qr) | 전부 `401` — **500·200 0건** (미인증 write 차단 확인) |

**공개 QR 랜딩 4개 서비스** (위임 전환 최대 위험 축)

| 서비스 | 응답 | envelope |
|---|---|---|
| kpa · glycopharm · cosmetics | `404 QR_NOT_FOUND` | nested `{error:{code,message}}` — **기존 계약 보존** |
| pharmacy-hub | `404 QR_NOT_FOUND` | flat `{error,code}` — PH 계약대로 |

**PH 웹 배포 확인** — `https://pharmacyhub.co.kr` 200, 번들(`index-BJKehv_A.js`)에
`디지털 사이니지` · `상품 설명서` · `재생 목록 만들기` · `POP 작성` · `QR 만들기` ·
`store-owner/signage` · `store-owner/pop` · `qr/public` 전부 포함 — 4개 축 화면·메뉴 배포됨.

**런타임 오류** — 배포 후 25분간 `o4o-core-api` severity≥ERROR 로그 **0건**.

### 5-7. 인증 사용자 실측 (2026-08-08, 자격증명 갱신 후 재수행)

`docs/local/TEST-ACCOUNTS.local.md` 갱신으로 **`pharmacy-hub:store_owner` 계정을 확보**했다.
`renagang21@gmail.com` — PH membership `active`, roleType `store_owner`(2026-07-30 승인),
`entryPoints.storeOwner=true`. §5-6 의 BLOCKED 는 아래 범위에서 해소됐다.

#### (A) 검증 6 — 조직 격리 · 미연결 계정 : **23/23 PASS**

`renagang21` 은 PH 에서 `not_connected`(candidateCount=0) 이면서 **타 서비스에는 실제 자산이 있다** —
공통 `/api/v1/store/handled-products` 20건, `/api/v1/kpa/pharmacy/qr` **41건**.
즉 공통 해석기(`resolveStoreAccess`)라면 다른 서비스 조직을 반환했을 계정이다.

| 검증 | 건수 | 결과 |
|---|:--:|---|
| PH 읽기 7종 — 200 + `not_connected` + **노출 0건** | 7 | ✅ 전부 PASS |
| PH write 11종 — `409 STORE_NOT_CONNECTED` | 11 | ✅ 전부 PASS |
| client 주입 차단 — `organizationId`·`storeId`·`serviceKey`·`authorRole` → `400 FIELD_NOT_ACCEPTED` | 5 | ✅ 전부 PASS |

**"타 서비스 조직 fallback 금지" 가 프로덕션에서 실증됐다.** 같은 세션·같은 사용자로
공통 경로는 20~41건을 반환하는데 PH 경로는 전부 0건이고 write 는 전부 차단된다.
(부채 ① 도 같은 실측으로 재확인 — §8)

#### (B) 검증 2 — 기존 서비스 QR 회귀 : **PASS (위임 전환 회귀 0)**

`renagang21` 은 KPA 매장(`네뚜레-약국`) 경영자라 owner 경로까지 실측했다. **write 0 · 읽기 전용.**

| 항목 | 결과 |
|---|---|
| KPA QR 목록 | `200` · 41건 · `success:true` · 파생 필드(`scanCount`·`landingType`·`slug`·`aiDescriptionMode`) 전부 유지 |
| 스캔 통계 | `200` · `totalScans`/`deviceStats` 정상 |
| 스캔 통계 경계 | 타 매장 id → `404 QR_NOT_FOUND` (nested envelope) |
| QR 출력 (page QR) | PNG `200 image/png` 21,160B · SVG `200 image/svg+xml` 1,602B · PDF `200 application/pdf` 11,653B |
| QR 이미지 `/image` | `200 image/png` 3,165B |
| 공개 랜딩 `page` | `200` · 본문 렌더(`pageContent` 있음) · `storeSlug=네뚜레-약국` · `Cache-Control: no-store` |
| 공개 랜딩 `screen_set`(비활성) | `410 SCREEN_SET_INACTIVE` + 종료 안내 문구 — **의도된 계약** |
| 공개 랜딩 없는 slug | `404 QR_NOT_FOUND` (nested) |
| 비활성 QR 출력 | `404` — 비활성 QR 출력 차단(기존 계약, 병행 세션 M-1 과도 정합) |
| GlycoPharm QR owner | `200` · 20건 |
| K-Cosmetics QR owner | `200` · 20건 |

> 초회 실행에서 4건이 FAIL 로 보였으나 **전부 검증 스크립트의 기대값 오류**였다.
> 첫 항목이 비활성 `screen_set` QR 이어서 출력 404·랜딩 410 이 나온 것이고,
> `page` 타입으로 재실행하니 출력 3종 모두 200 이다. **코드 결함 아님**을 확인하고 정정했다.

#### (C) 검증 1·3·4·5 — PH 정상 경로 : **여전히 BLOCKED (매장 조직 미프로비저닝)**

`renagang21` 은 store_owner 승인까지 끝났으나 **PH enrollment 를 가진 매장 조직이 없다.**
운영자 콘솔 실측: PH membership `active` 2건, `pending` 0건 — 그러나 PH 매장 조직 0개.

| 필요 조건 | 현재 |
|---|:--:|
| `role_assignments` = `pharmacy-hub:store_owner` | ✅ |
| `service_memberships` = `pharmacy-hub` / `active` | ✅ |
| `organization_members` (owner/admin/manager, left_at IS NULL) | ❌ |
| `organization_service_enrollments` = `pharmacy-hub` / `active` | ❌ |

따라서 QR 생성·POP 작성/발행/보관·사이니지 재생목록/항목·설명서 조회의 **정상 경로**와
**교차 조직 격리**(PH 조직 2개 필요)는 아직 실측할 수 없다.
이는 W9 구현 결함이 아니라 **검증 대상 데이터 부재**이며,
매장 조직 생성은 프로덕션 조직·RBAC write 라 임의로 수행하지 않았다(§9 승격 조건).

> **부수 발견(후속 관측 대상)**: PH store_owner 로 **승인 완료(2026-07-30)** 된 계정에
> 매장 조직이 만들어져 있지 않다. W1 프로비저닝
> (`CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1`)이 이 계정에는 적용되지 않은 것으로 보인다.
> 승인된 매장 경영자가 자기 매장 없이 남는 상태라 **제품 갭일 수 있다** — W9 범위 밖이므로
> 고치지 않고 기록만 남긴다.

### 5-6. (경과) 인증 사용자 실측이 한때 BLOCKED 였던 이유

> **이 절은 경과 기록이다.** 사용자가 비밀번호를 일괄 교체하고 SSOT 문서에 Pharmacy-Hub
> 절을 추가해 §5-7 로 재수행했다 — `renagang21@gmail.com` 이 `pharmacy-hub:store_owner`
> 로 정상 로그인되며, 검증 2·6 은 완료됐다.

작업요청서가 요구한 실측 7개 항목 중 **1·3·4·5·6·7 은 인증된 `pharmacy-hub:store_owner`
세션이 있어야 한다.** 당시에는 확보하지 못했다.

| 계정 | 로그인 결과 (자격증명 갱신 **전**) |
|---|---|
| `sohae2100@gmail.com` | `401 INVALID_CREDENTIALS` — SSOT 문서의 비밀번호가 프로덕션과 불일치 |
| `sohae21@naver.com` | `403 ACCOUNT_NOT_ACTIVE` |
| `renagang21@gmail.com` | SSOT 문서에 이미 **무효** 로 기록됨 (2026-08-03 정정) |

더 근본적으로, `docs/local/TEST-ACCOUNTS.local.md` 의 역할 인벤토리상
**`pharmacy-hub:store_owner` 를 가진 계정이 하나도 없다.**
`sohae2100` = `pharmacy-hub:operator`, `sohae21` = `pharmacy-hub:supplier` 뿐이다.
즉 비밀번호를 되살려도 **PH 매장 경영자 화면에는 진입할 수 없다.**

이는 CLAUDE.md 중지 조건 **"실제 계정 · 자격정보 · 외부 서비스 승인 필요"** 에 해당한다.
해소하려면 프로덕션에서 (a) 계정 비밀번호 재설정 또는 (b) `pharmacy-hub:store_owner`
role 부여 + 매장 조직 enrollment 가 필요한데, 둘 다 **RBAC·운영 데이터 write** 이고
작업요청서도 "운영 fixture 는 만들지 않는다" 로 금지한다. **임의로 수행하지 않았다.**

| 미수행 항목 | 사유 |
|---|---|
| PH QR 목록/생성/상세 · 공개 랜딩 정상 분기 · screen_set 멱등 재사용 실측 | 인증 세션 없음 |
| PH POP 작성·조회·수정·publish/archive · HUB 빈 상태 · import 독립성 | 인증 세션 없음 |
| PH 사이니지 목록·항목 추가·스냅샷 생성·제거·원본 불변 | 인증 세션 없음 |
| PH 설명서 canonical 조회 · 언어 전환 · 빈 상태 | 인증 세션 없음 |
| 조직 격리(미연결 · 교차 조직 · client organizationId 주입 차단) | 인증 세션 없음 |
| AMBIGUOUS | 실계정 없음 — 작업요청서 지시대로 **fixture 만들지 않고** 코드 경로 + 후속 관측으로 기록 |
| KPA · GlycoPharm · K-Cosmetics QR **owner CRUD** 실측 | 인증 세션 없음 (공개 랜딩 계약은 확인 §5-5) |
| W1~W8 브라우저 회귀 | 인증 세션 없음 |

> 코드 경로 근거는 남아 있다: 조직 해석은 4개 컨트롤러 모두
> `resolvePharmacyHubStoreOrganization()` 단일 경로이고, write 는 전부
> `sendWriteBlocked()` 선행, client `organizationId`/`storeId`/`serviceKey`/`authorRole` 은
> `rejectsOrganizationId`/`rejectsForeignKeys` 로 400 거부, 교차 조직은
> `(organization_id)` · `(store_id, service_key)` 복합 WHERE 로 404 처리된다(§5-1 단위 테스트로 고정).
> **다만 이는 정적 근거이며 프로덕션 실측을 대체하지 않는다.**

---

## 6. 배포 상태 — 예정과 달라진 부분 (중요)

### 6-1. QR · 설명서는 이미 프로덕션 LIVE 다

사용자 지시는 "`b3aae68b1` 을 push·배포하지 않고 POP·사이니지 완료 후 일괄 배포" 였다.
그러나 **병행 세션이 자기 작업을 push 하면서 내 커밋 `b3aae68b1` 이 조상으로 함께 올라갔고**,
그 tree 로 Cloud Run 배포(`90aef6023`, Deploy API Server ✅ success)가 실행됐다.

- `b3aae68b1` 은 `origin/main` 에 포함되어 있다 (`git merge-base --is-ancestor` 확인).
- §5-3 · §5-4 실측이 이를 뒷받침한다 — PH QR·설명서 라우트가 프로덕션에서 응답한다.
- 즉 **QR 축의 "배포 전 회귀 검증" 기회는 이미 지나갔다.** 사후 확인으로 §5-3 을 수행했고
  3개 기존 서비스의 공개 랜딩 계약이 보존됐음을 확인했다. 인증 경로 실측은 여전히 미수행이다(§5-5).

> **병행 세션 환경의 구조적 함정**: main 에 로컬 커밋을 만들어 두면, 병행 세션의 다음 push 가
> 그 커밋을 함께 밀어낸다. "커밋하되 push 하지 않는다" 는 두 세션이 같은 브랜치에서 동시에
> 작업하는 동안에는 **성립하지 않는다.** 배포를 실제로 막으려면 별도 브랜치가 필요하다.

### 6-2. POP · 사이니지 — 배포 완료

사용자 결정에 따라 `6aa6a2dab` + `79e611c57` 을 main 에 명시적으로 push 했고
(`e30358f92..79e611c57`), Deploy API Server / Web Services 모두 success 다.
§5-5 실측으로 4개 축 전부 프로덕션에서 응답함을 확인했다.

### 6-3. 다음 회차 권고 — 병렬 개발 격리

같은 checkout 의 `main` 에서 여러 세션이 동시에 작업하면 "내 커밋은 push 하지 않는다" 가
기술적으로 보장되지 않는다(§6-1 이 실제 사례). 다음 작업부터는 세션별
**`git worktree` + 작업 브랜치** 분리를 권고한다 — commit·checkout·build·push 가
서로 간섭하지 않는다. 이번 WO 를 닫은 뒤 개발환경 정비 항목으로 잡는다.

---

## 7. 범위 C(태블릿) — HOLD 근거

작업 중 병행 세션이 태블릿·Screen Set 축을 동시 수정했다(세션 시작 시점에는 clean):

```
store-tablet.routes.ts · store-public-screen-set-resolve.ts · store-screen-set-qr.service.ts
packages/tablet-kiosk-core · packages/tablet-screen-set-editor
services/web-kpa-society/.../Tablet*.tsx (외 KPA/Neture screen-set 화면 다수)
```

PH 태블릿을 구현하려면 `store-tablet.routes.ts`(2,325줄)에서 tablet/screen-set 계약을 추출해야
하는데 그 파일이 다른 세션의 작업 대상이었다. **조사까지만 하고 수정하지 않았다.**

양 세션이 대칭적으로 규율을 지켰다 — 병행 세션의 커밋 `90aef6023` 은 M-1 항목을
"수정 지점이 병렬 세션의 미커밋 파일(`store-qr-landing.controller.ts`, 신규 `store-qr.service.ts`)이라 미착수" 로 기록했다.
이후 내가 그 파일들을 커밋하자 병행 세션이 M-1 을 이어받았다(현재 `store-qr.service.ts` 에 그쪽 변경 진행 중).

**후속 WO**: `WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1`

---

## 8. 발견 부채 (이번 범위에서 고치지 않음)

① **`/api/v1/store/tablets` · `/screen-sets` 의 조직 해석이 service scope 없이 열려 있다.**
`store-tablet.routes.ts` 가 `createRequireStoreOwner(dataSource)` 를 serviceKey 없이 호출한다 →
back-compat 경로가 `pharmacy-hub:store_owner` 를 포함한 **모든** store_owner role 을 통과시키고,
조직은 정렬 없는 `organization_members LIMIT 1` 로 정해진다. 교차 **사용자** 누출은 아니지만
다중 조직 계정에서 의도하지 않은 자기 조직이 선택될 수 있다. **별도 WO 필요.**

② `store-qr-landing.controller.ts` 에 **NUL 바이트 1개**가 있어 git 이 binary 로 취급한다
(`git diff` 가 텍스트로 표시되지 않아 리뷰 가시성을 해친다). HEAD 에도 있는 기존 상태이며 이번 변경과 무관.

③ PH QR 의 `video`·`screen_set` 연결 유형은 해당 축이 PH 에 생긴 뒤 `ALLOWED_LANDING_TYPES` 확장만으로 열린다.

---

## 9. 작업요청서 §완료 기준 대조

| # | 기준 | 결과 |
|:--:|---|---|
| 1 | QR 관리 정상 | ⚠️ 구현·배포·가드 PASS / 미연결 경로 PASS — **정상 경로 실측 BLOCKED (§5-7C)** |
| 2 | POP 관리 정상 | ⚠️ 동일 |
| 3 | 태블릿 screen-set 관리 정상 | ⏸ **HOLD** — 병행 세션 충돌, 후속 WO 분리 |
| 4 | 디지털 사이니지 관리 정상 | ⚠️ 동일 |
| 5 | 상품 설명서 조회 정상 | ⚠️ 동일 |
| 6 | 전부 PH enrollment 조직으로 격리 | ✅ **PASS** — 미연결 계정 실측 23/23 (§5-7A). 타 서비스 20~41건 보유 계정에서 PH 노출 0건 |
| 7 | 원본·사본 독립성 유지 | ✅ §4 — POP import 원본 FK 부재는 단위 테스트로 고정 |
| 8 | 미연결·ambiguous write 0 | ✅ **PASS(미연결)** — write 11종 전부 `409 STORE_NOT_CONNECTED` · 주입 5종 `400` (§5-7A). AMBIGUOUS 는 실계정 부재 — fixture 미생성 |
| 9 | 메뉴·route 정합 | ✅ '매장 실행' = QR · POP · 디지털 사이니지 · 상품 설명서 (번들 실측 확인) |
| 10 | dead link · 준비 중 화면 0 | ✅ 태블릿은 메뉴를 만들지 않았다 |
| 11 | W1~W8 및 타 서비스 회귀 0 | ✅ **타 서비스 회귀 0 PASS** (§5-7B: KPA owner CRUD·출력·랜딩 + GP·KCos 각 20건) / PH W1~W8 브라우저 회귀는 매장 조직 부재로 미수행 |
| 12 | 테스트 자산 원상 복구 | ✅ 해당 없음 — **프로덕션 DB write 0** (전 검증 읽기 전용) |
| 13 | 배포 · production smoke PASS | ⚠️ 배포 ✅ / 미인증 smoke ✅ / 미연결·회귀 smoke ✅ / **PH 정상 경로 BLOCKED** |
| 14 | CHECK · commit · push 완료 | ✅ |

**최종 판정**: `IMPLEMENTATION_COMPLETE / PENDING_PRODUCTION_VERIFICATION / TABLET_DEFERRED`

`PASS with TABLET_DEFERRED` 로 닫지 **않는다.** 검증 6·2·8·11 은 실측 PASS 했으나
1·3·4·5 의 **PH 정상 경로**가 매장 조직 부재로 남아 있다(§5-7C).
구현·배포 결함이 아니라 **검증 대상 데이터 부재**다.

### 판정 승격에 필요한 것 (사용자 결정 사항)

1. **PH 매장 조직 1개** — `renagang21@gmail.com` 을 `organization_members`(owner) 로 두고
   `organization_service_enrollments(service_code='pharmacy-hub', status='active')` 를 가진 조직.
   role·membership 은 **이미 충족**돼 있으므로 이 두 가지만 채우면 1·3·4·5 를 즉시 실측할 수 있다.
   → 정석 경로는 W1 프로비저닝(`CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1`) 이며,
     수동 SQL 은 운영 데이터 write 라 승인 없이 수행하지 않는다.
2. 교차 조직 격리 실측에는 **서로 다른 PH 조직 2개**에 각각 매장 경영자가 필요하다.
3. AMBIGUOUS 실측에는 한 사용자가 PH 조직 2개에 소속돼야 한다 —
   작업요청서가 운영 fixture 생성을 금지하므로 **만들지 않았고**, 코드 경로 + 단위 테스트로만 고정했다.

---

## 10. 변경 파일

### 신규 (본 커밋)

```
apps/api-server/src/services/store/store-pop.service.ts
apps/api-server/src/services/store/__tests__/store-qr.service.test.ts
apps/api-server/src/services/store/__tests__/store-pop.service.test.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStorePopController.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStoreSignageController.ts
services/web-pharmacy-hub/src/lib/api/pharmacyHubStorePop.ts
services/web-pharmacy-hub/src/lib/api/pharmacyHubStoreSignage.ts
services/web-pharmacy-hub/src/pages/store-owner/PopPage.tsx
services/web-pharmacy-hub/src/pages/store-owner/SignagePage.tsx
```

### 수정 (본 커밋)

```
apps/api-server/src/routes/o4o-store/controllers/pop.controller.ts   (자체 구현 → 공통 service 위임)
apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts       (+19 라우트)
packages/store-ui-core/src/config/storeMenuConfig.ts                 (PH 메뉴 — POP · 사이니지 추가)
services/web-pharmacy-hub/src/App.tsx                                (+2 라우트)
```

### 선행 커밋 `b3aae68b1` (QR · 설명서)

```
신규: store-qr.service.ts · PharmacyHubStoreQrController · PharmacyHubStoreManualController
      pharmacyHubStoreQr.ts · pharmacyHubStoreManual.ts
      QrPage · ManualsPage · ManualDetailPage · QrLandingPage
수정: store-qr-landing.controller.ts · pharmacy-hub.routes.ts · App.tsx
```

### 변경하지 않음 (금지 항목 준수)

DB schema · migration · PH 전용 실행자산 테이블 · 공통 `resolveStoreAccess` · 공통 store-owner 가드 ·
ProductMaster 복제 · 설명서 신규 생성/번역 · 실제 결제 · 실운영 태블릿 · 공급자/운영자 원본 ·
원본·사본 row 공유 — **전부 무접촉.**

병행 세션이 진행 중인 파일(`store-qr.service.ts` 의 M-1 변경, 태블릿·screen-set 축, audit 스크립트)은
**stage 하지 않았다** — 수정·revert·stash·정리 모두 하지 않았다.
