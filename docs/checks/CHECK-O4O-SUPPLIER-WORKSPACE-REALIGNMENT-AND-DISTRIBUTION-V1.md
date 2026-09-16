# CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1

> **WO**: `WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1`
> **일자**: 2026-09-16 · **기준 main**: `cb204f341` (Content Boundary Alignment CLOSED 직후)
> **성격**: Supplier 업무공간 IA 재정렬 + §2-1 두 제공 경로 구현. 새 테이블 0 · migration 0 · schema 변경 0 · 기능 재작성 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2 · §2-1 · §2-2 · §9-1(4단계) · 선행 [`CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1`](CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1.md) §9-3

---

## 0. 한 줄 결론

공급자 화면을 **`공급자 홈 / 상품 / 주문 / 콘텐츠 / 설정`** 으로 재정렬했다(기능 재작성 없음 · route rename 없음). 사이드바의 Supplier 전용 Community 진입(`공급자 포럼 · 내 포럼`)은 은퇴시키고 라우트는 deep-link 로 보존했다. 공급자 콘텐츠의 canonical 원장 `neture_supplier_library_items` 를 사이드바 콘텐츠 축의 첫 진입점(`콘텐츠 라이브러리`)으로 승격하고 종전 "개인 보관함(KEEP_HIDDEN)" 판정을 폐기했다. Architecture §2-1 의 두 공식 경로를 실제 계약으로 연결했다 — **`Supplier → Store Hub`** = Hub source adapter `sourceDomain=supplier-library`(`is_public` 재사용, schema 변경 없음) · **`Supplier → Service Operator`** = `POST /neture/library/:id/handoff {serviceKey}` (대상 = canonical catalog 파생, 수신 = 기존 `cms_contents` supplier pending 계약 재사용). 통합 엔진 · 새 원장 · 상태 기계 · 특정 매장 전송은 만들지 않았다.

---

## 1. Fresh Census (§2) — origin/main `cb204f341`

### 1-1. Supplier 화면 · 라우트 판정표

| 진입 (사이드바 / route) | 실체 | 판정 | 처리 |
|---|---|---|---|
| `/supplier/dashboard` | `SupplierDashboardPage` (KPI · 처리 필요 · 바로가기 · 운영 현황) | UTILITY | 홈. 바로가기 · 운영 현황을 3축 어휘로 재정렬 (KPI 전부 소비 중 → 삭제 0) |
| `/supplier/products` · `/products/register` · `/products/bulk` · `/products/import-assistant` | 상품 CRUD · 대량 · 도우미 | PRODUCTS | 그대로 |
| `/supplier/b2b-content` | 거래 상품 정보 (B2B 상품 콘텐츠) | PRODUCTS | 라벨 `제품 콘텐츠` → `거래 상품 정보`, 콘텐츠 축에서 상품 축으로 이동 |
| `/supplier/supply-offers` | 공급 오퍼 | PRODUCTS | 그대로 |
| `/supplier/services/pharmacy-hub` (`SupplierServiceDeliveryPage`) | Pharmacy-Hub 오퍼 제공 opt-in | PRODUCTS | 라벨 `서비스 제공 설정`. 오퍼(상품) 제공이며 콘텐츠 제공이 아님 |
| `/supplier/recruitments` · `/market-trial` · `/event-offers` | 판매자 모집 · 유통참여형 펀딩 · 이벤트 오퍼 | PRODUCTS (유통 활동) | 상품 축 하단으로 |
| `/supplier/orders` · `/inventory` · `/settlements` | 주문 · 재고 · 정산 | ORDERS | 주문 축 (신규 그룹) |
| `/supplier/library` (`SupplierLibraryPage`) | `neture_supplier_library_items` CRUD | **CONTENT (canonical 원천)** | 사이드바 노출 · 제목 `자료실`→`콘텐츠 라이브러리` · KEEP_HIDDEN 배너 폐기 · `서비스에 제공` 액션 추가 |
| `/supplier/store-descriptions` · `/tablet-screen-sets` · `/signage` · `/store-materials-status` | 매장용 설명서 · 태블릿 화면 · 사이니지 · 검수·게시 현황 | CONTENT | 콘텐츠 축 |
| `/mypage/business-profile` | 사업자 정보 | UTILITY | 설정 |
| 사이드바 `공급자 포럼`(`/supplier/forum`) · `내 포럼`(`/supplier/my-forum`) | Community(forum) 의 Supplier 전용 진입 | **RETIRE (진입만)** | 사이드바 그룹 제거. 라우트 5개(`/supplier/forum` · `/write` · `/post/:slug` · `/my-forum` · `/forum/request-category`) 는 deep-link 보존 · redirect chain 0 |
| `/workspace/supplier/library` → `/supplier/library` redirect (App.tsx) | 구 경로 호환 | UTILITY | 유지 (단일 redirect · chain 아님) |
| `SupplierOpsLayout` | admin/operator 전용 | MOVE_OUT_OF_SUPPLIER (이미 밖) | 무변경 |
| `SupplierLandingPage` | `/register` 링크만 | UTILITY | 무변경 |

### 1-2. 콘텐츠 제공 관련 API · 소비처

| 대상 | 실체 | 판정 |
|---|---|---|
| `GET/POST/PATCH/DELETE /neture/library*` (`neture-library.routes.ts`) | canonical 원장 CRUD. 헤더 주석 "HUB 독립" | CONTENT — 헤더 주석을 §2-1 계약으로 교체 |
| `hub-content.service.ts` `VALID_DOMAINS` / `queryMixed` | cms · signage · blog · pop · qr · video · screen-set. supplier-library 없음 | CONTENT — `supplier-library` 단일 도메인 adapter 추가 (mixed 미편입) |
| `POST /kpa/supplier/content-submissions` (`supplier-content.service.ts submit`) | cms `authorRole=supplier status=pending serviceKey='kpa'` + `kpa_approval_requests` (KPA 고정) · web-neture 소비처 0 | CONTENT — Operator handoff 수신 계약으로 재정렬 (`serviceKey` 인자화 · KPA 외 서비스는 cms 행만) |
| `content-approval.service.ts` · `SupplierContentApprovalPage.tsx`(web-kpa-society) | KPA 운영자 승인 콘솔 | CONTENT (운영자 측) — 무변경 |
| `cms-content-query.handler.ts` `?status=pending&authorRole=supplier` | 공통 CMS 운영자 목록 | k-cosmetics · pharmacy-hub 운영자의 수신 화면 = 공통 CMS pending 목록 (별도 콘솔 신설 0) |
| `supplier-campaign-request.controller.ts` | 사이니지 캠페인 요청 → 운영자 (매장 대상 없음) | CONTENT — 무변경 |
| `services/web-kpa-society/src/api/storeExecutionAssets.ts` `getNetureLibraryItem` (`/library/public/:id`) | backend route 부재 · 호출처 0 | **RETIRE** (`netureClient` · `NetureLibraryItem` 함께 제거) |
| `isPublic` (`neture_supplier_library_items.is_public`) | 원장 컬럼. 종전 UI 라벨 "비인증 사용자도 조회 가능" · public 조회 route 는 없음 | **재사용** — 의미를 "Store Hub 공개" 로 확정. schema 변경 불필요 |

### 1-3. 프로덕션 read-only (선행 CHECK §2 재인용)

`neture_supplier_library_items` 0행 (2026-09-16 Content Boundary Alignment 시점). 이번 WO 는 프로덕션 read 를 추가하지 않았다(write 0).

---

## 2. 결정 (§3 ~ §13)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 목표 IA = `공급자 홈 / 상품 / 주문 / 콘텐츠 / 설정` (`SupplierSpaceLayout` 5그룹) | WO §3 · Architecture §2 |
| D2 | Supplier 전용 Community 진입 사이드바 은퇴. Forum 기능 · 라우트 보존 (deep-link) | WO §4 · §5 |
| D3 | canonical 원장 = `neture_supplier_library_items` 유지. 새 원장 · 통합 테이블 0 | WO §7 · §13 |
| D4 | `Supplier → Store Hub` = Hub source adapter `supplier-library` (단일 도메인). `is_public=true` 행 · producer 고정 `supplier` · serviceKey gate = catalog `storeWorkspaceEnabled` · 사본 0 · 특정 매장 0. mixed 편입 · Store Hub UI 탭 = Store Workspace 단계 | WO §8 · §11 · §13 |
| D5 | `Supplier → Service Operator` = `POST /neture/library/:id/handoff`. 대상 = `listSupplierContentHandoffTargets()` (catalog `operatorWorkspaceEnabled=true && workspaceMode='standard'` → kpa-society · k-cosmetics · pharmacy-hub. neture/kpa-branch/cafe24-b2b 자동 제외 — 하드코딩 없음). 수신 = `SupplierContentService.submit` 재사용 | WO §9 · §10 |
| D6 | cms 물리 serviceKey: kpa-society → `'kpa'` (KPA Store Hub 는 `'kpa'` 정확일치 조회), 그 외 canonical 키. `kpa_approval_requests` 는 KPA 만 (다른 서비스는 공통 CMS pending 목록으로 수신) | 기존 소비처 계약 유지 |
| D7 | 제공 후 상태 추적 · 회수 · lineage 없음 — "제공 = 공급자 책임 종료" | WO §9 |
| D8 | Dashboard KPI · ActionItems 삭제 0 (전부 소비 중). 바로가기를 상품/주문/콘텐츠 3축 그룹으로 | WO §6 |
| D9 | `isPublic` 라벨 `비인증 사용자도 조회 가능` → `매장 HUB 의 공급자 콘텐츠로 노출 · 비인증 조회 가능` (의미 확정, schema 0) | WO §8 |
| D10 | KPA Store Hub 가 cms 를 `'kpa'` 로 조회하는 legacy drift 는 이번 범위 밖 — supplier-library adapter 는 `getServiceWorkspaceCapability('kpa')` 미등록 → 빈 응답. Store Hub UI 편입 시 canonical 키 정렬과 함께 처리 | 범위 외 · FOLLOWUP |

---

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/types/src/hub-content.ts` | `HubSourceDomain` + `'supplier-library'` · `HubContentItemResponse` 선택 필드(`fileUrl/fileName/mimeType/category/contentType`) · 라벨 |
| `apps/api-server/src/modules/hub-content/hub-content.controller.ts` | `VALID_DOMAINS` + `supplier-library` |
| `apps/api-server/src/modules/hub-content/hub-content.service.ts` | `querySupplierLibrary` adapter + `mapSupplierLibraryItem` (mixed 미편입) |
| `apps/api-server/src/modules/neture/constants/supplier-content-handoff-targets.ts` (신규) | catalog 파생 대상 · cms 물리 키 매핑 |
| `apps/api-server/src/modules/neture/services/supplier-library-handoff.service.ts` (신규) | handoff (원장 조회 → `submit` 재사용) · `toCmsContentType` |
| `apps/api-server/src/modules/neture/neture-library.routes.ts` | `GET /library/handoff-targets` · `POST /library/:id/handoff` · 헤더 주석 §2-1 |
| `apps/api-server/src/modules/neture/services/neture-library.service.ts` | 헤더 주석 (canonical 원장) |
| `apps/api-server/src/routes/kpa/services/supplier-content.service.ts` | `serviceKey` 인자화 · `kpa_approval_requests` 는 `'kpa'` 일 때만 |
| `apps/api-server/src/__tests__/supplier-workspace-realignment.spec.ts` (신규) | 16 tests |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 5그룹 IA · Community 그룹 제거 · 미사용 import 정리 |
| `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx` | 바로가기 3축 그룹 · `콘텐츠` 블록(라이브러리 진입) · 유통 활동 = 상품 축 |
| `services/web-neture/src/pages/supplier/SupplierLibraryPage.tsx` | 제목 · 안내 문구 · `서비스에 제공` 액션 + 서비스 선택 모달 |
| `services/web-neture/src/pages/supplier/SupplierLibraryFormPage.tsx` | `isPublic` 라벨 |
| `services/web-neture/src/lib/api/supplier.ts` · `index.ts` | `getLibraryHandoffTargets` · `handoffLibraryItem` · 타입 |
| `services/web-neture/src/App.tsx` | forum 라우트 주석 (legacy deep-link 보존) — 라우트 무변경 |
| `services/web-kpa-society/src/api/storeExecutionAssets.ts` | dead `getNetureLibraryItem` · `netureClient` · `NetureLibraryItem` RETIRE |
| `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md` | §2-1 구현 계약 상세화 · §9-1 4단계 완료 · 최종 갱신 |
| `docs/checks/CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1.md` (신규) | 본 문서 |

미변경: route path 전부 · `neture_supplier_library_items` schema · `cms_contents` schema · `HubProducer` 4종 · `service-catalog.ts` · Order contract · 타 서비스 권한/guard.

---

## 4. 검증 (§15)

| 항목 | 결과 |
|---|---|
| `packages/types` build | PASS (dist 재생성 후 api-server tsc 통과) |
| `packages/ui` · `packages/account-ui` build | PASS — web-neture tsc 가 stale dist 로 `logoutLabel` 오류 2건을 냈고(이번 변경과 무관 · 소스에는 존재) 재빌드로 해소 |
| `services/web-neture` `tsc --noEmit` | PASS |
| `services/web-neture` `npm run build` | PASS (vite built in 15.98s) |
| `services/web-kpa-society` `tsc --noEmit` | PASS |
| `apps/api-server` `tsc --noEmit` | PASS |
| jest — `supplier-workspace-realignment.spec.ts` | 16/16 PASS (대상 서비스 집합·제외 · cms 키 매핑 · Hub adapter is_public/producer/serviceKey gate/mixed 미편입 · submit KPA 2 INSERT vs 타 서비스 1 INSERT · type 매핑) |
| jest — 기존 Supplier 관련 8 suites (`content-boundary-alignment` · `service-tenant-foundation` · `market-trial-neture-forum-sync` · `supplier-offer-*` 2 · `b2b-supplier-to-store-order-canonical-contract` · `frozen-auth-permissions-and-kpa-supplier-final-closure` · `auth-runtime-and-legacy-package-final-closure`) | 9 suites 131/131 PASS |
| UI 확인 (사이드바 5그룹 · 대시보드 3축 · 라이브러리 제공 모달) | PASS — 배포 후 실브라우저 확인(§4-1) |
| production smoke | PASS — §4-1 (배포 de728b3e6 · 2026-09-16) |

---

### 4-1. Production smoke (배포 de728b3e6 후 · 읽기 전용 · 2026-09-16)

공급자 표준 계정(`docs/local/TEST-ACCOUNTS.local.md` · supplier-6967ebe0)으로 API · 브라우저 확인. 쓰기 호출 0 (handoff 는 유효하지 않은 대상으로 400 거부만 확인).

| 항목 | 결과 |
|---|---|
| `GET /api/v1/neture/library/handoff-targets` (공급자 인증) | 200 · `kpa-society / k-cosmetics / pharmacy-hub` 3건 — catalog 파생과 일치, `kpa-branch`·`cafe24-b2b`·`neture` 없음 |
| 동일 endpoint 비인증 | 401 |
| `POST /neture/library/{uuid}/handoff {serviceKey:"kpa-branch"}` | 400 `INVALID_HANDOFF_TARGET` — 원장 조회 전 거부, write 0 |
| `GET /api/v1/hub/contents?serviceKey=kpa-society&sourceDomain=supplier-library` | 200 · total 0 (프로덕션 원장 0행과 정합 · 오류 없음) |
| 동일 · `serviceKey=neture` / `kpa-branch` (store workspace 없음) | 200 · 빈 응답 |
| `GET /neture/library` (공급자) | 200 · 0건 (원장 0행 정합) |
| 브라우저 `/supplier/dashboard` 사이드바 | `대시보드 / 상품 / 주문 / 콘텐츠 / 공급자 정보` — `공급자 포럼`·`내 포럼` 링크 0 (`a[href*="/supplier/forum"]` = 0) |
| 브라우저 대시보드 업무 바로가기 | 상품(상품 목록·상품 등록·거래 상품 정보·공급 오퍼) / 주문(주문 현황·재고 관리·정산 내역) / 콘텐츠(콘텐츠 라이브러리·매장용 상품 설명서·검수·게시 현황) |
| 브라우저 `/supplier/library` | 제목 `콘텐츠 라이브러리` · 두 경로 안내(공개=매장 HUB · 서비스에 제공=운영자 · 특정 매장 직접 전송 없음) 렌더 · 공개 필터 라벨 반영 |
| 제공 모달 실제 제출 | 미실행 — 프로덕션 원장에 자료 0행이며 write smoke 는 WO 범위 밖(cms_contents pending 행 생성). 단위 테스트(§4)로 계약 검증 |

## 5. Re-census (§16)

| 항목 | 결과 |
|---|---|
| Supplier 사이드바 축 | `공급자 홈(utility) / 상품 / 주문 / 콘텐츠 / 설정(utility)` — Products / Orders / Content 3축 |
| Supplier-only Community entry | **0** (사이드바 `forum|포럼` 매치 = 주석 2줄만) · 라우트 5개 보존 |
| Legacy Partner entry | **0** (Supplier 화면 3종에서 `partner` 매치 = 선행 WO 주석 2줄만) |
| canonical Supplier content source | **1** (`neture_supplier_library_items` — entity · service · routes · hub adapter · handoff 전부 동일 원장) |
| Supplier → specific Store path | **0** (library routes · handoff service 에 `storeId/organizationId` 0) |
| `Supplier → Store Hub` 계약 | `GET /hub/contents?serviceKey=<store svc>&sourceDomain=supplier-library` (테스트로 확인) |
| `Supplier → Service Operator` 계약 | `GET /neture/library/handoff-targets` · `POST /neture/library/:id/handoff` (테스트로 submit 계약 확인) |
| 새 원장 · 통합 엔진 · 상태 기계 | 0 |

---

## 6. 문서 정합 (§14)

| 문서 | 발견 | 처리 |
|---|---|---|
| `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §9-1 · §2-1 | 4단계 미완료 표기 · 구현 계약 미기재 | 본 WO 권한으로 상세화 (§10 허용 범위 · 모순 0) |
| `O4O-BUSINESS-PHILOSOPHY-V1` §3 "공급자는 O4O 내부에서 콘텐츠를 직접 제작·등록하는 주체가 아니다" | Architecture §2-1 과 충돌 (§8 표에 UPDATE_REQUIRED 로 이미 기록) | **별도 WO 제안** (동급 사업 정본 본문 정정 — 인라인 금지 §16-4) |
| `docs/platform/content/CONTENT-META-PRODUCTION-READY-V1.md:153` "공급자 자료실" | 명칭만 (물리 테이블 설명) | 보고만 — 판정 변경 아님 |
| `docs/platform/store/IR-STORE-CONTENT-UX-PRINCIPLE-ALIGNMENT-AUDIT-V1.md:106` "Neture 공급자 자료실(public)과 Store Library 간 자동 연결 경로 없음" | 과거 시점 IR 기록 (이번 adapter 로 Hub 경로 생김) | 보고만 — 기록물 |
| `O4O-3-ROLE-FLOW-BASELINE-V1` | 이미 SUPERSEDED 헤더 | 무변경 |

`문서 정합: 발견 4건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`

---

## 7. 후속 (FOLLOWUP)

1. **Store Hub UI 편입** — `supplier-library` 를 Store Hub 탭/mixed 목록에 노출 · KPA Store Hub 의 cms serviceKey `'kpa'` legacy drift 정렬 · `HubProducer` 축소 · TEMP_COMPAT 제거 → Store Workspace 단계(§9-1 5).
2. **k-cosmetics · pharmacy-hub 운영자 수신 화면** — 공통 CMS pending 목록으로 수신 가능하나 "공급자 제공 콘텐츠" 전용 뷰는 없음 → Service Operator Workspace 단계(§9-1 6).
3. **PHILOSOPHY §3 본문 정정** — 별도 WO.
4. production smoke 결과 — §4-1 기록 완료 (2026-09-16).

---

## 8. 최종 판정

```
SUPPLIER_WORKSPACE=PASS
PRODUCTS_AXIS=PASS
ORDERS_AXIS=PASS
CONTENT_AXIS=PASS
SUPPLIER_COMMUNITY_ENTRY=RETIRED
SUPPLIER_CONTENT_SOURCE=CANONICAL
TO_STORE_HUB=PASS
TO_SERVICE_OPERATOR=PASS
TO_SPECIFIC_STORE=0
NEW_UNIVERSAL_ENGINE=0
NEXT=GO_STORE_WORKSPACE
```

구현 commit: `de728b3e6` (2026-09-16 · push 완료 · Deploy API/Web/Admin success). smoke 기록: 본 커밋.
