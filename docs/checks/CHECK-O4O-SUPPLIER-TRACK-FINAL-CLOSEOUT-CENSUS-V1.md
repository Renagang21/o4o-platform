# CHECK — Supplier 트랙 최종 closeout census

- **일자**: 2026-09-23
- **기준 commit**: census = `origin/main` ce79a97b7 / 최종 보정(F3·F4) = `origin/main` f8d0c1384 (Gate 0 충족 — 누락 3파일 PRESENT · Code Quality Check / API Server Jest 둘 다 `success`, skipped 아님)
- **작업 단위**: 단일 closeout. 새 기능 개발 없음 · 새 WO 분할 없음.
- **선행**: `WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1` (CHECK `b3cff7952`)

---

## 1. 14축 census 결과

| # | 축 | 방법 | 결과 |
|---|---|---|---|
| 1 | 진입/IA/메뉴/route | `App.tsx` `/supplier*` 39 route 파싱 + `SupplierSpaceLayout` nav 18항목 route 해석 | 죽은 nav 0 · 고아 route 0. **F1 발견 → 정리** |
| 2 | 가입·승인·membership/role 경계 | supplier controller 60 route 정적 파싱 후 guard 확인 | `requireAuth` + `requireActiveSupplier`/`requireLinkedSupplier`(alias `createRequireSupplier` 포함) 전수 적용. 무가드는 `POST /register`(가입 전 · 설계상 정상) 와 `GET /products/:masterId/images`(읽기, `requireAuth`) 뿐 |
| 3 | Candidate → Master → Offer 흐름 | 등록 3경로 추적 | `POST /product-candidates`(신규) · `POST /products/from-master`(기존 Master) · `POST /products/bulk-candidates`(대량→운영자 승인). Supplier 의 Master 직접 create 경로 0 |
| 4 | 등록 후 = Offer-first / Master read-only | `product-detail/` 4 섹션 확인 | `MasterReadOnlySection` 편집 진입점 0 · `OfferEditSection` 은 Offer 필드(B2B/B2C 설명)만 · `OfferDistributionSection` 은 공급 방식·가격만 |
| 5 | 이미지 ownership/write 경계 | supplier controller 내 ProductMaster write grep | `productMasterRepo`/`INSERT·UPDATE product_masters` 0건. 이미지 write 4 route 전부 `requireActiveSupplier` |
| 6 | 콘텐츠/자료/마케팅 제공 | library · store-descriptions · tablet · signage 7 화면 | 전부 live · 은퇴 route 참조 0 |
| 7 | 내부 LLM 잔존 | supplier controller 12종 + `pages/supplier` grep | 내부 LLM 호출 0. 외부 ChatGPT 경로(`SupplierProductLlmAssistPanel`) 1개만 · 중복 없음. `supplier-copilot` 은 SQL 집계 전용 |
| 8 | CSV/import · legacy Master-create | backend route · entity · frontend | CSV import route/service/entity 0 (은퇴 주석만). `SupplierBulkRegisterPage` CSV 는 클라이언트 전용 파싱 → `bulk-candidates` 제출 |
| 9 | retired B2B/SupplyOffers 잔재 | 전 저장소 grep | 코드 잔재 0(redirect route 4개는 의도적 유지). **F2 발견 → 정리** |
| 10 | 후속 업무 연결 | orders · recruitments · event-offers · settlements · inventory · market-trial | 6축 전부 화면+API 연결 확인 |
| 11 | dead endpoint / component / stale copy | `pages/supplier` inbound 0 스캔 + route↔소비처 대조 | dead component 0. **F3 발견 → 보고(제거 보류)** |
| 12 | 서비스별 소비자 계약 회귀 | `SupplierProductOffer` 소비 controller(admin·operator·hub) 확인 | 이번 재편에서 제거된 API 0 → 회귀 없음 |
| 13 | consumer 0 entity 잔재 | neture entity 14종 소비처 계수 | 최소 2 이상 · 0건 없음. CSV entity 2종은 선행 WO 에서 제거(물리 테이블은 보존) |
| 14 | 문서 정합 | 기준 문서군 grep | **F4 발견 → 보고(§16-4 인라인 금지)** |

---

## 2. 발견 · 처리

### F1 — `SupplierOpsLayout` 스코프 불일치 + 죽은 사이드바 (정리함)

`App.tsx` 는 이 레이아웃을 Admin/Operator 전용 `/workspace/*` 로 좁혔는데, 파일 헤더는 여전히
"공급자 운영 서비스 레이아웃 · 스코프: /workspace 하위 모든 페이지" 라고 자기를 설명했다.
사이드바 4항목 중 3개가 레이아웃 밖으로 나갔다 — `홈 /workspace` 와 `콘텐츠 /workspace/content` 는
`/` 로 튕기는 **죽은 항목**이었고, `상품 관리 /workspace/supplier/products` 는 redirect alias 였다.

- 헤더 스코프 문구를 실제와 일치시켰다.
- `/` 로 튕기던 2항목을 제거했다.
- `상품 관리` 를 canonical `/supplier/products` 로 직접 연결했다.
- 살아 있는 `허브 /workspace/hub` 는 그대로다.

### F2 — Guide copy 의 은퇴한 `/supplier/b2b-content` 전제 (정리함)

`packages/shared-space-ui/src/guide/copy/neture.ts` 가 B2B 콘텐츠를 **별도 화면**으로 안내했다.
그 route 는 `/supplier/products` 로 redirect 된 지 오래이고, 실제 작성 위치는 제품 상세의 B2B 편집이다.
`guideRouteContract` 테스트는 redirect route 도 "존재"로 보기 때문에 이 staleness 를 잡지 못했다.

수정 5곳 — `routeLabel`(L433) · `primaryRoute`(L533) · hero `primaryAction`(L810) ·
기능 안내 본문 2곳. 소비처는 `GuideFeatureB2BContentPage` 1곳으로 확인했다(공통 모듈 변경 절차).
`/guide/features/b2b-content` **문서 route 자체는 유지**한다 — 개념 안내는 여전히 유효하다.
따라서 `GuideHomePage.tsx:113` 의 링크도 유효하며 손대지 않았다.

### F3 — frontend 소비처 0 인 backend endpoint 3건 (감사 시점 = 보고 → **최종 처분 = REMOVED**)

| endpoint | census 상태 | 처분 |
|---|---|---|
| `GET /neture/supplier/profile/completeness` | guard 정상 · 소비처 0 | 제거 |
| `PATCH /neture/supplier/regulated-categories/:category` | guard 정상 · 소비처 0 | 제거 |
| `POST /neture/supplier/regulated-categories/:category/submit` | guard 정상 · 소비처 0 | 제거 |

뒤 2건은 사고가 아니라 설계 이동의 결과다 — 프로필 단계를 **선택 전용**으로 바꾸면서
번호 입력·검토 요청 UI 를 걷어냈다(`SupplierProfilePage.tsx:424,864` 주석). backend 만 남았다.
census 시점에서는 route·API contract 변경이 `CLAUDE.md` 중지 조건이라 보고만 했고,
**팀장 승인(2026-09-23) 후 동일 closeout 안에서 제거**했다.

함께 제거한 dead code (그 endpoint 만 소비하던 것):

- `NetureService.computeProfileCompleteness()` (facade)
- `NetureSupplierService.computeProfileCompleteness()` (구현 + 섹션 헤더)
- `SupplierRegulatedCategoryService.updateCategory()` · `.submitForReview()`
- frontend `ProfileCompleteness` 타입 + `lib/api/index.ts` 재내보내기 (재-census 결과 소비처 0 확인 후 제거)

**유지(제거하지 않음)** — 규제 품목군 기능 자체는 살아 있다:

```text
GET    /supplier/regulated-categories
POST   /supplier/regulated-categories
DELETE /supplier/regulated-categories/:category
POST   /supplier/regulated-categories/:category/document
GET    /supplier/regulated-categories/:category/document/download
Operator/Admin 품목군 검토 API 전부
```

검토 흐름도 끊기지 않는다 — `uploadEvidence()` 가 status 를 `'submitted'` 로 올린다.
신규 기능·대체 API 를 만들지 않았다. 회귀 방지를 위해 controller 에 은퇴 사유 주석을 남겼다.

### F4 — 기준 문서의 stale CSV staging 서술 (감사 시점 = 보고 → **최종 처분 = CORRECTED**)

`docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md` 가 runtime 은퇴된 `csv_import_rows` /
삭제된 `SupplierCsvImportRow.entity.ts` 를 **현존 canonical 로** 서술했다. 1곳이 아니라 3곳이었다.

| 위치 | 수정 |
|---|---|
| L37-38 ASCII 다이어그램 `(현존) csv_import_rows` | 해당 줄 제거 · 분기 기호 정리 |
| L75 구성요소 표 | `catalog_import_rows` / `CatalogImportRow` **단일** · "현재 active import staging" · 존재하는 경로만 표기 |
| L158 §8.2 서술 | `catalog_import_rows` 단일 참조 |

더불어 표 아래에 legacy 명시 블록을 추가했다 —
`supplier_csv_import_batches` / `supplier_csv_import_rows` = **runtime RETIRED · 물리 스키마·migration 보존 ·
canonical Product Core 구성요소 아님 · DB DROP 은 별도 cleanup 대상**.

없는 entity 파일을 다른 경로로 억지 대체하지 않았고, migration · DB schema 는 손대지 않았다.
사실 근거: `entities.ts:211,689` 은퇴 주석 · `canonical-schema-baseline.ts:4358,4372` 물리 테이블 존재.
본 수정은 팀장이 명시 승인한 closeout 범위다(§16-4 예외 승인).

---

## 3. 검증

| 항목 | 결과 |
|---|---|
| `vitest` — `packages/shared-space-ui/src/guide` (route/coverage/intro contract) | **3 files / 41 tests PASS** |
| `tsc --noEmit` — `services/web-neture` · 수정 2파일 | **오류 0** (그 외 오류는 신규 worktree 의 `build:deps` 미빌드 · 본 변경과 무관) |
| `jest` — api-server **전체** | **347 suites PASS / 4 skipped · 5,829 tests PASS / 32 skipped · 1,245s** (`--testPathPattern` 이 jest 30 에서 무시돼 전 suite 실행 — 본 closeout 에는 오히려 적합) |

**F3·F4 최종 보정 후 재검증 (`origin/main` f8d0c1384 기준)**

| 항목 | 결과 |
|---|---|
| `jest` — api-server **전체** | **347 suites PASS / 4 skipped · 5,829 tests PASS / 32 skipped · 766s · exit 0** (이 저장소의 jest 는 `--testPathPattern` 을 받지만 실제 필터링되지 않아 전 suite 실행 — 제거된 endpoint·service 에 대한 회귀 없음을 전수로 확인) |
| `tsc --noEmit` — `apps/api-server` · 수정 4파일 | **오류 0** |
| `tsc --noEmit` — `services/web-neture` · 수정 2파일 | **오류 0** |
| 잔존 참조 grep (`computeProfileCompleteness` · `ProfileCompleteness` · `profile/completeness` · supplier `updateCategory`/`submitForReview`) | **0건** (남은 동명 심볼은 LMS · catalog category · user 모듈 · Operator/Admin 검토 — 전부 무관한 유지 대상) |

두 `tsc` 모두 전체 출력에는 `@o4o/*` `TS2307` 가 다수 남는다 — 신규 worktree 의 `build:deps` 미빌드 때문이고 본 변경과 무관하다.
전체 빌드는 같은 이유로 이 worktree 에서 수행하지 않았고 **PASS 로 보고하지 않는다** — CI 게이트가 정본이다.

브라우저 smoke 는 수행하지 않았다 — 본 closeout 의 코드 변경은 프런트 2파일(죽은 nav 제거 · 안내 문구)뿐이고
배포 후 확인 대상이다. 이를 PASS 로 보고하지 않는다.

---

## 4. Supplier 최종 판정표

```text
SUPPLIER_ENTRY                = PASS
SUPPLIER_IDENTITY_RBAC        = PASS
SUPPLIER_PRODUCT_REGISTRATION = PASS
SUPPLIER_OFFER_MANAGEMENT     = PASS
SUPPLIER_MASTER_WRITE         = 0
SUPPLIER_INTERNAL_LLM         = 0
SUPPLIER_LEGACY_CSV_IMPORT    = 0
SUPPLIER_DEAD_RUNTIME         = 0            (F3 = REMOVED)
SUPPLIER_STALE_USER_COPY      = 0
CROSSSURFACE_CONTRACT         = PASS
DOCUMENT_ALIGNMENT            = PASS          (F4 = CORRECTED)

SUPPLIER_TRACK                = CLOSED
```

추가 census 없이 **Supplier 트랙을 CLOSED 로 확정**한다(팀장 승인 2026-09-23).
열려 있는 후속은 본 트랙 밖이다 — `supplier_csv_import_*` 물리 테이블 DROP 은 별도 DB cleanup 대상이고,
프런트 2파일 변경의 브라우저 smoke 는 배포 후 확인 대상이다.
