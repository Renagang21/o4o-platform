# WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1

## 0. 목적

`admin.neture.co.kr > O4O 상품 DB > 기본상품 상세`의 placeholder 섹션을 **조회 전용(GET-only)** 실제 정보로 보강한다. 데이터 정비 작업이 아니다.

> 핵심 문장: 이번 WO는 상품 데이터를 고치는 작업이 아니라, 기본상품 상세 콘솔에서 관리자가 식별자·설명·원천·사용 상태를 조회할 수 있도록 GET-only 정보를 보강하는 작업이다.

원칙:

```
GET-only / mutation 0 / backend write 0 / DB write 0
```

선행 WO: `WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1` (커밋 d25de0af7).

---

## 1. 채택 방식 — A안 (상세 응답 enrichment)

`GET /neture/products/library/:id` 응답에 additive 필드 추가 (별도 API 미신설):

```ts
{
  identifiers?: ProductIdentifierSummary[];
  descriptions?: ProductDescriptionSummary[];
  sourceLinks?: ProductSourceLinkSummary[];
  usageSummary?: ProductUsageSummary;
}
```

이유: 상세 화면 1건 조회 · 로딩 단순 · 배포 안정성. 병렬(Promise.all) read-only 쿼리로 N+1 회피.

---

## 2. 데이터 소스 (실측 확인)

| 영역 | 테이블 | 연결 키 |
| --- | --- | --- |
| identifiers | `product_identifiers` | `product_master_id` (soft-delete 제외) |
| descriptions | `shared_product_descriptions` | `master_id` (soft-delete 제외), status 우선순위 정렬, 상한 20 |
| sourceLinks | `product_candidates` | `matched_product_master_id`, 최신순, 상한 20 |
| usageSummary | `organization_product_listings`(master_id) + `store_local_products`(barcode) | count only |

주의:
- `store_local_products` 는 barcode 기반 loose 연결(off-catalog, master FK 없음) — count 표시에 "barcode 기준" 명시.
- offer/QR/콘텐츠 count 는 직접 링크 부재로 이번 WO 제외 (타입상 optional).

---

## 3. 표시 (read-only)

- **식별자**: 유형(한글 라벨)/값/출처/검증 상태/primary. 없으면 "등록된 식별자가 없습니다."
- **설명 후보**: status 배지(canonical/needs_review/candidate/…)/source/언어/품질/요약 preview. 없으면 "표시할 설명 데이터가 없습니다."
- **후보/원천 연결**: 후보명/제조사/source/후보상태/매칭상태/생성일. 없으면 "연결된 원천 후보가 없습니다."
- **사용 상태**: organizationListingCount + storeLocalProductCount count 카드.
- 관리 메모 / 작업 이력: 후속 write/audit placeholder 유지.

---

## 4. 금지 (이번 WO)

ProductMaster/Identifier/Candidate 수정·삭제·승격·병합, 설명 생성·승인·수정, 이미지 업로드/교체, 매장/주문/Offer/QR 연결 생성, bulk, DB migration(조회 index 필요 시 별도 보고).

---

## 5. 변경 파일

- `apps/api-server/src/modules/neture/controllers/product-library.controller.ts` — 상세 핸들러 enrichment (additive)
- `apps/admin-dashboard/src/api/o4o-product-db.api.ts` — enrichment 타입 추가
- `apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx` — placeholder → 실데이터

---

## 6. 검증 기준

```bash
pnpm --dir apps/admin-dashboard type-check
pnpm --dir apps/admin-dashboard build:prod
pnpm --dir apps/api-server type-check
git diff --check
```

프로덕션 smoke: 현황/목록 회귀 없음, 상세 4개 섹션(식별자/설명/원천/사용상태) 렌더 또는 empty state, 후보 회귀 없음, 데이터 정비 준비중 유지, 네트워크 GET only, mutation 0.

배포 후 stale chunk 시 `/login?cb=YYYYMMDD`.

---

## 7. 완료 기준

placeholder 4개 영역이 GET-only 실데이터 또는 empty state로 대체 · write 0 · mutation 0 · typecheck/build/deploy/smoke 통과 · 완료 보고에 API/화면/네트워크 검증 기록.

---

## 8. 후속 WO 후보

- `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-SHELL-V1`
- `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1`
- `WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-USAGE-LINKS-READONLY-V1`

---

*Author: 사용자 초안 접수 → Claude Code 실행. GET-only / mutation 0 / api-server(상세 응답 additive) + admin-dashboard.*
