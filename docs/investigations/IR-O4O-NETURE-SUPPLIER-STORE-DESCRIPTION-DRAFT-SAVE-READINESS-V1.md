# IR-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-READINESS-V1

> 성격: **read-only 조사(IR)**. 코드/스키마/마이그레이션/DB write/배포 없음.
> 목적: `WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1` 을 바로 진행해도 되는지 판단.
> 작성일: 2026-07-12 · 상태: 조사 완료
> 상위 근거: [`IR-...-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1`](IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1.md) · [`IR-...-QR-TABLET-FLOW-AUDIT-V1`](IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1.md) · [`DECISION-...-D1-D4-V1`](DECISION-O4O-NETURE-SUPPLIER-STORE-CONTENT-D1-D4-V1.md)

## 결론 (먼저)

**판정: HOLD (+ SPLIT 권고). 지금 바로 draft 저장 구현으로 진입하지 않는다.**

두 개의 blocker가 있다.

1. **[전제 미충족] `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` 이 구현되지 않았다.** `created_by_supplier_id` / `submitted_at` 컬럼이 엔티티에도, 마이그레이션에도 없다. 설계 IR 만 존재(승인·구현 대기). → draft 저장 WO 의 목표(`created_by_supplier_id`/`submitted_at` 세팅)를 물리적으로 수행할 수 없다.
2. **[하류 소비면 부재] 운영자 SPD 검수 큐가 이전 WO 로 제거되었다.** (`WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1`) `needs_review`/`candidate` 를 cross-master 로 보는 운영자 화면/라우트가 현재 라이브에 없다. → draft 저장이 만들어낼 "운영자 검수 대기" 행을 볼 화면이 없다.

fallback 정합(AUTO-CREDIT)·편집기·상품 선택·진입점 등 **나머지 기반은 모두 준비되어 있다.** 문제는 위 2개의 구조적 선행 조건이다.

---

## 1. 조사 방법 / 위치

- 로컬 checkout: `c:\Users\sohae\o4o-platform` (origin/main 기준, `git fetch` 후). `/workspace/...` 가정하지 않음.
- 무관 dirty 파일 2개(`docs/guides/products/health-functional-food/README.md`, `services/web-kpa-society/.../TabletScreenSetManager.tsx`)는 건드리지 않음 — 본 IR 과 무관.
- write/migration/deploy/DB write **없음**. 정적 코드 분석 + git 이력만.
- 프로덕션 DB 직접 쿼리 안 함 — 아래 §3 근거로 불필요(코드에 컬럼·마이그레이션 자체가 없으므로 CI/CD 로 프로덕션에 존재할 수 없음).

## 2. 전제 작업 반영 여부 (origin/main)

| 전제 WO | 반영 | 근거 |
|---------|:---:|------|
| AUTO-CREDIT (`WO-...-AUTO-CREDIT-V1`) | ✅ | `37f7f83e4` feat + `2a23805ac` CHECK(배포 성공 기록) |
| ENTRY-AND-ONBOARDING (`WO-...-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1`) | ✅ | `SupplierStoreDescriptionsPage.tsx` 존재(진입점, "작성" 버튼 disabled) |
| SPD-AUTHOR-SUBJECT metadata **설계** | ✅ (IR만) | `1ebb3e51e` docs — `IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1.md` (상태: "설계안 도출(구현 승인 대기)") |
| **`WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` 구현** | ❌ | 커밋 없음(`git log --grep "SPD-AUTHOR-SUBJECT"` = 0건, 설계 docs 커밋만). 엔티티/마이그레이션 미반영(§3) |

## 3. 핵심 확인 — SPD-AUTHOR-SUBJECT 메타데이터 (BLOCKER 1)

`apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` 실측:

| 확인 항목 | 결과 |
|-----------|:---:|
| `created_by_supplier_id` 컬럼 | ❌ 없음 |
| `submitted_at` 컬럼 | ❌ 없음 |
| 엔티티 매핑 | ❌ 없음 (`createdBy`(user uuid)·`curatedBy`/`curatedAt` 만 존재 — L145-158) |
| 마이그레이션 | ❌ 없음 (`grep created_by_supplier_id` in `database/migrations` = 0건) |
| 운영 DB 반영 | ❌ (마이그레이션 부재 → CI/CD 반영 불가) |
| CHECK/배포 결과 | ❌ 없음 |

→ **작성 주체 = `created_by`(user uuid) 만.** "어떤 공급자가 썼나"는 여전히 `created_by → users → neture_suppliers.user_id` 조인 필요. 제출 시각(`submitted_at`)은 아예 없음. 설계 IR §5.1 의 최소 2컬럼이 **미구현**.

## 4. AUTO-CREDIT fallback 정합 (온전 — 회귀 없음)

`apps/api-server/src/modules/neture/services/product-landing.service.ts` `resolveSupplierCredit()` (L149-178):

- 조건: `source_type='supplier'` **AND** `source_ref_id` 존재해야 crediting.
- 체인: `source_ref_id → supplier_product_offers.id → supplier_id → neture_suppliers → organizations`.
- 공개 허용 연락처만(`*_visibility='public'`), 조직 비활성/이름없음/깨진 체인 → `null`(본문 무영향).
- 비로그인(`authRequired`) 시 본문·canonical 미포함(별도 게이트, L185-189).

정합 판정:

| 확인 | 결과 |
|------|:---:|
| 기존 `source_ref_id` fallback 유지 | ✅ (유일 경로로 현재 동작) |
| `created_by_supplier_id` 우선 조회 | ❌ 아직 미구현(컬럼 부재라 참조 불가) — **정상**. 메타 WO 후 우선순위 로직 추가 예정 |
| 깨진 체인에서도 본문 조회 실패 없음 | ✅ (`catch → null`, 본문 정상) |
| O4O 공통 설명서에 supplier credit 미표시 | ✅ (`source_type!=='supplier'` → null) |
| 비로그인 supplier credit 미노출 | ✅ (auth 게이트) |

→ 메타 컬럼이 없어도 fallback 은 **깨지지 않는다.** 오히려 메타 WO 는 이 fallback 위에 "우선순위 1" 을 얹는 additive 확장이며(설계 IR §7), 현재 상태를 회귀시키지 않는다.

## 5. 다음 WO 진입 조건 체크리스트

| 조건 | 충족 | 비고 |
|------|:---:|------|
| `created_by_supplier_id` 컬럼 존재 | ❌ | **BLOCKER 1** |
| `submitted_at` 컬럼 존재 | ❌ | **BLOCKER 1** |
| entity 매핑 완료 | ❌ | BLOCKER 1 |
| migration 운영 반영 완료 | ❌ | BLOCKER 1 |
| AUTO-CREDIT fallback 유지 | ✅ | §4 |
| `description_type=STORE` 정책 유지 | ✅ | entity default `STORE`, 진입점 docblock 명시 |
| `SUPPLIER_STORE` 신규 사용 없음 | ✅ (주의) | 타입 값은 union/컨트롤러/마이그레이션에 **역사적으로 존재**하나 신규 흐름은 STORE 사용. 신규 코드가 SUPPLIER_STORE 를 쓰지 않도록 WO 에서 가드 |
| 공급자 대시보드 진입점 존재 | ✅ | `SupplierStoreDescriptionsPage.tsx` (작성 버튼 disabled=플러그인 지점) |
| PENDING/ACTIVE 게이트 정상 | ✅ | 진입점=`supplierProfileApi.getProfile` status / 백엔드=`requireActiveSupplier`(write) vs `requireLinkedSupplier`(read) |
| **(추가) 운영자 검수 대기 소비면 존재** | ❌ | **BLOCKER 2** (§6.4) — 원 체크리스트에 없던 항목, 조사 중 발견 |

**하나라도 미충족 → blocker 보고.** 2개 blocker 확인.

## 6. 다음 WO 가 필요로 하는 기존 기능 (재사용성)

### 6.1 공급자 상품 선택 — ✅ 완비

- 목록 API: `GET /supplier/products` — `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` (L105), 페이지네이션/검색/필터. supplierId 는 **미들웨어가 auth 에서 주입**(클라 입력 아님).
- ACTIVE 게이트: `neture-identity.middleware.ts` — `createRequireActiveSupplier`(L41, write 용, `status!=='ACTIVE'` → 403 `SUPPLIER_NOT_ACTIVE`) / `createRequireLinkedSupplier`(L75, read 용, 모든 status 허용).
- offer→master 링크: `SupplierProductOffer.masterId` + `@ManyToOne('ProductMaster','offers')`. `offer.service.ts` 가 `master`(name/category/brand/barcode/images) 조인.
- 프론트 UI: `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx`(엑셀형 목록, `EditableDataTable`) — route `/supplier/products`. 상세 편집 `ProductDetailDrawer.tsx`.

### 6.2 표준 편집기 — ✅ 완비 (재사용 가능)

- `@o4o/content-editor` `RichTextEditor` (`packages/content-editor/src/components/RichTextEditor.tsx`). 이미 공급자 드로어(`ProductDetailDrawer.tsx`)가 소비 중.
- 이미지 삽입(`onImageUpload`/`ImageInsertModal`/paste), 템플릿 적용(`showTemplateActions templateCategory="product"`/`TemplateModal`), **860px 레이아웃**(`extensions/productDetailLayout.ts` `ProductDetailLayout`, builtin `product-detail-860`).
- 저장 포맷 = **HTML(sanitized)** (`onChange`/`onSave` → `{html, json}`, HTML 권위). 서버 jsdom+DOMPurify sanitize.
- 렌더러: `ContentRenderer variant="store-description"`(반응형 `@container` sd-* 디자인 시스템, L269) 존재 — 뷰어 재사용 가능.

### 6.3 SPD 저장 API — △ 서비스는 있으나 공급자용 미분리, 유일 라우트는 admin 전용·즉시 canonical

- 유일한 create 경로: `shared-product-description.service.ts` `createCandidate()`(L230). default `status='candidate'`, `descriptionType='STORE'`, `language='ko'`. content sanitize, 빈 값 throw. **`source_type='supplier'` 는 cosmetic write guard 면제**(L234-236).
- 마운트된 유일 엔드포인트: `POST /api/v1/admin/o4o-product-db/masters/:id/store-descriptions` (`product-master-description.controller.ts` L97) — `requireRole(ADMIN_ROLES)` **admin/operator 전용**. 흐름 = `createCandidate({sourceType:'manual'}) → setCanonical` = **저장 즉시 canonical 승격**(검수 단계 없음). → 공급자 draft(검수 대기) 의미와 다름.
- **공급자용 create 경로는 없다.** (관련: `WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1.md` 는 승인 시 seed 제안이나 **미구현** — `offer.service.ts` `approveProduct()`(L185)에 SPD write 없음. 별개 접근.)
- unique 제약: `20261228000000-CanonicalPerMasterTypeLanguage.ts` — `(master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical'`. **canonical 행에만 적용.** 즉 `candidate`/`needs_review` 중복은 허용 → 공급자 draft 저장이 unique 충돌 안 남. ✅

### 6.4 운영자 검수 대기 연결 — ❌ BLOCKER 2 (소비면 제거됨)

- `register-routes.ts` L443-448: `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1` 로 **검수 라우트 일괄 제거** — `shared-product-descriptions`, `product-candidate-description-drafts`, `description-status`, `description-dashboard`, `description-review-queue` 삭제. 남은 것 = canonical read / QR badge / seed·derive job / 테이블 자체.
- `listForReview()`/`getReviewDetail()`(service L513/600)는 `sourceType` 필터 지원하나 **어떤 라우트에도 마운트 안 됨**(HTTP dead code, CLI job 만 사용).
- **orphan 프론트**: `services/web-neture/src/lib/api/sharedProductDescription.ts` + `pages/admin/ProductDescriptionCurationModal.tsx` 가 제거된 `/admin/shared-product-descriptions/...` 를 호출 — 현재 API 대비 **비동작**.
- admin UI 는 per-master 단일 패널만(`ProductMasterDetailPage → StoreDescriptionPanel`), cross-master 검수 큐 아님. `o4o-product-db.api.ts:817` 주석 "needs_review 폐지" — 관리자 UI 는 needs_review 를 폐지로 간주.
- listing 이 `created_by`/작성자 미노출(`listForReview` SQL 미선택, live GET 은 id/type/language/status/summary/content/updatedAt 만).

→ draft 저장 WO 가 `status='needs_review'` 행을 만들어도 **운영자가 볼 화면이 없다.** DECISION D2("운영자 검수 후 canonical") 흐름의 소비면이 현재 부재.

### 6.5 참고 draft 엔티티 (재사용 후보 아님, 구조 참고용)

- `ProductCandidateDescriptionDraft` — master 없는 ProductCandidate 용 AI draft 풀(HFF). `reviewStatus`(default `needs_review`)+`reviewed_by/at` 관례는 좋은 **구조 템플릿**이나 candidate-scoped(master_id 없음). 라우트도 REVIEW-REMOVE 로 제거됨.
- `MobileProductDraft` — 모바일 상품 **식별정보** 캡처(설명 아님). owner-scoped draft→review→candidate 승격의 아키텍처 아날로그이나 콘텐츠 저장소 아님.

## 7. 정책 재확인 (준수 확인)

```
description_type = 용도(STORE/B2B/B2C)
source_type / created_by_supplier_id = 작성 주체
```

공급자 매장용 설명서 목표 형태:

```
description_type       = STORE
source_type            = supplier
created_by_supplier_id = 현재 공급자        ← BLOCKER 1: 컬럼 부재
created_by             = 현재 사용자        ✅ 기존 컬럼
submitted_at           = 검수 요청 시점      ← BLOCKER 1: 컬럼 부재
status                 = needs_review       (candidate 허용, canonical 금지)
```

금지 준수(WO 에서 가드 필요): `SUPPLIER_STORE` 신규 사용 금지 · description_type 을 작성자 구분용으로 사용 금지 · 공급자 직접 canonical 생성 금지(§6.3 admin 경로는 즉시 canonical 이므로 공급자용으로 재사용 불가) · 운영자 검수 없이 매장 노출 금지 · QR 자동생성/태블릿 세트/product landing 수정 금지.

## 8. blocker 목록

| # | blocker | 해소 조건 |
|---|---------|-----------|
| B1 | SPD 에 `created_by_supplier_id`/`submitted_at` 부재(엔티티·마이그레이션·운영 반영 모두 없음) | `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` 구현·배포·CHECK 완료 |
| B2 | 운영자 SPD 검수 큐(cross-master, source_type='supplier'/needs_review, 작성자 노출) 부재 — 이전 WO 로 제거됨 | 검수 소비면 재도입 WO(별도) 또는 draft-save WO 범위에 포함 |

## 9. 판정 및 권장 구현 범위 — HOLD + SPLIT

**진행 보류(HOLD).** B1 미해소 상태에서 draft 저장을 구현하면 `created_by_supplier_id`/`submitted_at` 세팅 불가 → 설계 목표 미달·나중 backfill 부채.

**추가로 SPLIT 권장.** 단일 "draft 저장" WO 로 묶기엔 범위가 큼. 아래 순서로 분리:

```
[선행] WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1
       - created_by_supplier_id(uuid null, @ManyToOne('NetureSupplier') onDelete SET NULL)
       - submitted_at(timestamp null)
       - nullable·backfill 없음·canonical unique 무영향(설계 IR §5)
       - migration = CI/CD 자동
         ↓ (배포·CHECK 후)
[본체] WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1
       - 공급자용 create 엔드포인트(requireActiveSupplier):
         createCandidate({ sourceType:'supplier', descriptionType:'STORE',
           status:'needs_review', createdBySupplierId, createdBy(user),
           submittedAt }) — admin 즉시-canonical 경로 재사용 금지
       - SupplierStoreDescriptionsPage 의 disabled 버튼 활성화 +
         RichTextEditor(product-detail-860 템플릿) 마운트 + 상품 선택(/supplier/products 재사용)
       - 저장=HTML sanitized. canonical 승격은 절대 안 함
         ↓
[하류] WO-...-OPERATOR-SPD-REVIEW-QUEUE-(RE)V1  ← B2 해소
       - needs_review/candidate cross-master 큐 재도입, source_type='supplier' 필터,
         created_by_supplier_id/created_by/submitted_at 노출, canonical 승격 액션
       - orphan(ProductDescriptionCurationModal / sharedProductDescription.ts) 정리 또는 재배선
```

> 하류(B2)를 draft-save 본체와 합칠지 분리할지는 승인자 판단. **최소한 B1 은 반드시 선행**이어야 draft-save 가 성립한다. B2 를 미루면 "저장은 되나 검수 화면이 없는" 반쪽 상태가 되므로, 본체와 근접 배치를 권장.

## 10. 건드리면 안 되는 파일/영역

- `ProductMaster` 엔티티 — FK/역참조 신설 금지(F12 불변식 ⑥, SPD→master 단방향 유지).
- `product-landing.service.ts` `resolveSupplierCredit` — fallback 회귀 금지. 메타 WO 에서 "우선순위 1" additive 만(fallback 유지).
- `product-master-description.controller.ts` 의 admin `store-descriptions`(즉시 canonical) — 공급자용으로 전용/변형 금지, 별도 공급자 엔드포인트 신설.
- canonical partial unique 인덱스 3종(`20261114/1223/1228` 마이그레이션) — 변경 금지.
- QR/signage/tablet(screen-set)/product landing 렌더 — 이번 범위 밖, 무수정.
- 무관 dirty 파일(HFF README, TabletScreenSetManager) — 본 트랙과 무관, 커밋에 포함 금지.

## 11. 비고 — 명칭·순서 정리

- 본 후보 WO 명은 지시상 `WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1`. 설계 IR §8 은 동일 의도를 `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1` 로 지칭 — **동일 작업, 명칭만 상이.** 착수 시 하나로 확정 필요.
- `WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1`(승인 시 자동 seed)은 본 "공급자 수기 draft 작성" 과 **다른 접근**이며 미구현. 두 경로를 혼동하지 말 것.
- 실데이터(기존 SPD source_type/status 분포) 미확인 — 필요 시 Cloud Console read-only:
  `SELECT source_type, description_type, status, count(*) FROM shared_product_descriptions GROUP BY 1,2,3 ORDER BY 1,2,3;`
