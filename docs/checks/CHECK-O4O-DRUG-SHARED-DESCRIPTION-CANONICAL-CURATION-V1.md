# CHECK-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1

> **작업명**: WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1 (1단계 — read-only 조사)
> **일자**: 2026-07-04 · **성격**: read-only 조사 CHECK — 코드/DB write 0. 산출물 = 본 문서 1개. **UI/엔드포인트 미구현(2단계~).**
> **선행**: `CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1`(파생 19,431), `CHECK-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-DRYRUN-V1`, `IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1`.
> **목적**: e약은요 파생 SharedProductDescription 19,431(needs_review) 을 admin.neture.co.kr O4O 상품 DB 에서 **검토·단건 canonical 승격**하는 운영 도구 기반 마련. **ProductMaster/Identifier/Image/Representative 미생성. 대량 canonical apply 미실행.**

---

## 1. 한 줄 결론

**단건 canonical 승격 백엔드(`PATCH /:id/canonical`, `setCanonical`)는 이미 존재. 부족한 것은 (a) needs_review 를 master 횡단으로 조회하는 목록/검색·상세 엔드포인트, (b) bulk 후보 dry-run 엔드포인트, (c) admin-dashboard O4O 상품 DB 의 "설명 검토" 화면. bulk dry-run 실측: needs_review 19,431 중 안전 후보 15,962(다제조사 3,469 제외).**

---

## 2. 스키마 실측 (`shared_product_descriptions`)

| 항목 | 값 |
|---|---|
| status 값 | `candidate` / `canonical` / `hidden` / `needs_review` / `deprecated` (varchar union) |
| canonical 제약 | **master 당 canonical 1개** — partial unique index (migration `20261114000000`) |
| source_type | supplier/operator/ai/store_contribution/drug_extension/**mfds_easy_drug**/migration/manual |
| content/summary | `content` text(HTML, sanitize-on-write), `summary` text nullable |
| audit 필드 | `curated_by`/`curated_at`(canonical 승격 시), `created_by`/`updated_by`, `created_at`/`updated_at`, `deleted_at`(soft) |
| master 연결 | `master_id` uuid NOT NULL, ManyToOne(ProductMaster) ON DELETE CASCADE |

> **reviewedAt 컬럼 없음** — 검토 흔적은 `curated_at`/`curated_by`(canonical 시) + `updated_by`. status='needs_review' 자체가 미검토 표식.

---

## 3. 기존 백엔드 (재사용 가능 여부)

**서비스** `SharedProductDescriptionService`:
| 메서드 | 용도 | 재사용 |
|---|---|:---:|
| `setCanonical(id, actorId)` | canonical 승격 + 기존 canonical 강등(트랜잭션, partial-unique 안전) | ✅ **그대로** |
| `getCanonical(masterId)` / `listByMaster(masterId)` | master 단위 조회 | ✅ (상세용) |
| `setStatus(id, status, actorId)` | hidden/needs_review/deprecated/candidate 전환 | ✅ (reject 등) |
| `createCandidate` / `seedFrom*` / `softDelete` | 후보 생성/흡수/삭제 | 범위 밖 |

**컨트롤러** `/api/v1/admin/shared-product-descriptions` (auth + requireRole ADMIN_ROLES):
- `GET /by-master/:masterId`, `GET /by-master/:masterId/canonical`, `POST /by-master/:masterId`, `POST .../seed`, **`PATCH /:id/canonical` ✅**, `PATCH /:id/status`, `DELETE /:id`.
- ⚠️ **부재: master 횡단 목록/검색, 상세(join), bulk dry-run.** → 신규 추가 필요.

---

## 4. 프론트 실측 (admin-dashboard = admin.neture.co.kr)

- 위치: `apps/admin-dashboard/src/pages/o4o-product-db/` — 탭 `공공데이터 후보`(candidates) / `기본 상품`(masters) / `데이터 정비`(maintenance).
- 레이아웃: `ProductDbLayout.tsx`(NavLink 탭), 라우트: `o4o-product-db.routes.tsx`(`/admin/o4o-product-db`, `AdminProtectedRoute requiredRoles=['admin','super_admin']`).
- API client: `@/api/o4o-product-db.api.ts` (`authClient` 기반, read-only). 목록 페이지 패턴 = 서버 페이지네이션(meta) + 검색 + 테이블 + row 클릭 상세.
- → **"설명 검토"(review) 탭 + 라우트 + 페이지(목록/상세) 신규 추가.**

---

## 5. bulk canonical 후보 dry-run (운영 실측, read-only)

| 지표 | 값 |
|---|---:|
| totalNeedsReview (mfds_easy_drug) | **19,431** |
| distinct master | 19,431 (master당 1개) |
| excludedEmptyContent | **0** |
| excludedAmbiguous (master당 >1) | **0** |
| excludedExistingCanonical | **0** |
| excludedMultiManufacturer (대표 flag) | **3,469** |
| (참고) multiName 대표 소속 | 3,138 |
| **eligibleForBulkCanonical** (단건·비어있지 않음·기존 canonical 없음·다제조사 아님) | **15,962** |

> bulk apply 는 본 WO 에서 실행하지 않음. dry-run 수치 확정만. 다제조사 3,469 는 수동 큐레이션 대상.

---

## 6. 구현 계획 (2~4단계)

**백엔드** (`shared-product-description.controller.ts` + service 확장):
1. `GET /api/v1/admin/shared-product-descriptions` — 목록/검색. 파라미터: `status`(needs_review/canonical/all…), `sourceType`(mfds_easy_drug), `q`(상품명/mfdsCode/barcode), `multiManufacturer`, `multiName`, `page`, `limit`. join: master(name/manufacturer/barcode) + representative(display_name/mfdsCode/flags/thumbnail). meta 페이지네이션.
2. `GET /api/v1/admin/shared-product-descriptions/:id/detail` — 상세(master/representative/identifier 요약/content/reviewFlags/thumbnail).
3. `GET /api/v1/admin/shared-product-descriptions/bulk-canonical/dry-run` — §5 수치 산출(write 0).
4. `PATCH /:id/canonical` — **기존 재사용**(단건 승격).

**프론트** (`apps/admin-dashboard/src/pages/o4o-product-db/`):
5. `ProductDbLayout` 탭에 `설명 검토`(review) 추가.
6. `o4o-product-db.routes.tsx` 에 `review`, `review/:id` 라우트.
7. `DescriptionReviewPage.tsx`(목록/필터/검색) + `DescriptionReviewDetailPage.tsx`(상세 + canonical 승격 버튼).
8. `o4o-product-db.api.ts` 에 목록/상세/setCanonical/bulk-dry-run client 함수.

---

## 7. 금지/미변경 (WO 경계)

생성·수정 금지: ProductMaster / ProductIdentifier / RepresentativeProduct / ProductImage / StoreLocalProduct / Offer / Listing / ProductDrugExtension(설명 복사 금지) / AI 설명. **대량 canonical apply 금지.** 허용: 운영자 단건 `setCanonical`(기존 API), 신규 read-only 목록/상세/dry-run 엔드포인트, admin UI.

---

## 8. 후속 작업 제안

1. **bulk canonical apply** (별도 Gate) — eligible 15,962 자동 승격(다제조사 제외). 본 WO dry-run 근거.
2. 다제조사 3,469 / multiName 3,138 수동 큐레이션.
3. canonical 설명 → 공개 상품 상세/매장 출력 연결(CANONICAL-OUTPUT-LINK).
4. 매장용 AI 설명 생성(별도 메뉴).

---

## 9. 준수 확인 (본 문서)

| 항목 | 결과 |
|---|---|
| 코드/DB write | **0** (1단계 조사) |
| ProductMaster/Identifier/Image/Representative 생성 | 0 |
| 대량 canonical apply | 0 |
| DB 검증 | authorized-network 임시 등록 후 원복, secret 미기록 |
| 병렬 세션 파일 수정 | 0 |

---

**작성**: O4O Platform 조사 CHECK · 2026-07-04 · read-only(1단계). 2~4단계(엔드포인트+UI+dry-run) 는 후속 커밋. serviceKey·비밀 미출력.
