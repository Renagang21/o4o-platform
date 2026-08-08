# CHECK — WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1` (매장 실행 자산 — QR / POP / 태블릿 / 사이니지 / 상품 설명서) |
| 검증일 | 2026-08-08 |
| 구현 커밋 | `b3aae68b1` (QR · 상품 설명서) / POP · 사이니지 (본 커밋) |
| 결과 | **PASS with TABLET_DEFERRED** — A·B·D·E 4개 축 구현 완료 / C(태블릿)는 병행 세션 충돌로 분리 |

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

### 5-5. 수행하지 않은 검증 — 숨기지 않고 명시한다

| 항목 | 상태 |
|---|---|
| KPA QR **인증 경로** CRUD·출력(PNG/SVG/PDF)·스캔통계 브라우저 실측 | ❌ 미수행 |
| 공개 랜딩 **분기별**(page/product/video/screen_set) 실데이터 실측 | ❌ 미수행 (404 분기만 확인) |
| screen_set QR 멱등 재사용 **프로덕션** 실측 | ❌ 미수행 (단위 테스트로만 고정) |
| GlycoPharm · K-Cosmetics QR 목록/생성 실측 | ❌ 미수행 (공개 랜딩만 확인) |
| PH QR·POP·사이니지·설명서 브라우저 smoke | ❌ 미수행 |
| 미연결(renagang21) · AMBIGUOUS 계정 실측 | ❌ 미수행 (코드 경로 검토만) |
| 교차 조직 격리 실측 (2개 자산 유형) | ❌ 미수행 |
| W1~W8 런타임 회귀 | ❌ 미수행 |
| POP·사이니지 프로덕션 배포 | ❌ 미수행 |

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

### 6-2. POP · 사이니지는 미배포

본 커밋 시점 기준 프로덕션에 없다(§5-4 의 404). 다음 배포에 함께 나간다.

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
| 1 | QR 관리 정상 | ✅ 구현 완료 · LIVE (인증 경로 브라우저 실측 미수행) |
| 2 | POP 관리 정상 | ✅ 구현 완료 (미배포) |
| 3 | 태블릿 screen-set 관리 정상 | ⏸ **HOLD** — 병행 세션 충돌, 후속 WO 분리 |
| 4 | 디지털 사이니지 관리 정상 | ✅ 구현 완료 (미배포) |
| 5 | 상품 설명서 조회 정상 | ✅ 구현 완료 · LIVE |
| 6 | 전부 PH enrollment 조직으로 격리 | ✅ 4개 축 전부 `resolvePharmacyHubStoreOrganization()` 단일 경로 |
| 7 | 원본·사본 독립성 유지 | ✅ §4 — POP 은 단위 테스트로 고정 |
| 8 | 미연결·ambiguous write 0 | ✅ 코드 경로상 write 전부 `sendWriteBlocked` 선행 — **실계정 실측 미수행** |
| 9 | 메뉴·route 정합 | ✅ '매장 실행' 그룹 = QR · POP · 디지털 사이니지 · 상품 설명서 |
| 10 | dead link · 준비 중 화면 0 | ✅ 태블릿은 메뉴를 만들지 않았다 |
| 11 | W1~W8 및 타 서비스 회귀 0 | ⚠️ typecheck·build 5개 + 단위테스트 33개 + 공개 랜딩 4서비스 실측 PASS / **인증 경로 런타임 회귀 미수행** |
| 12 | 테스트 자산 원상 복구 | — 해당 없음 (DB write 미수행) |
| 13 | 배포 · production smoke PASS | ⚠️ QR·설명서 배포됨(§6-1) + 공개 랜딩 smoke PASS / POP·사이니지 미배포 / 브라우저 smoke 미수행 |
| 14 | CHECK · commit · push 완료 | ✅ CHECK · commit 완료 (push 는 §6-1 참조) |

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
