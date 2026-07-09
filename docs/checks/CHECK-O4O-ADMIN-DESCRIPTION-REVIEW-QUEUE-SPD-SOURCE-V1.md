# CHECK-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-SPD-SOURCE-V1

Status: **DONE** — 코드 완료(`8b3b36a27`) + typecheck 통과 + 배포(API+Admin success) + 프로덕션 smoke PASS (2026-07-09)
WO: `WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-SPD-SOURCE-V1`
선행: `WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1`(Group 중심 Queue, DONE `52317ee`)

## 배경 — 왜 이 WO인가 (요청 재해석)
사용자가 건넨 `WO-O4O-ADMIN-DESCRIPTION-REVIEW-LIST-V1` 는 이미 구현(`b4ff36fc5`)됐다가 **의도적으로 revert(`61cb8d22f`)** 되고 Group 중심 **Review Queue** 로 대체된 상태였다(폐기 선언). Queue 는 **OTC 초안 그룹(95)** 만 노출하여 **SPD needs_review(3,469)** 가 빠지는 gap 이 있었다. 사용자 결정: **List 재구현이 아니라 배포된 Queue 에 SPD needs_review 소스를 추가**. 본 WO 가 그 확장이다.

## 범위
Review Queue 에 **SPD(공식 설명서 needs_review)** 를 **두 번째 검토 소스**로 추가. OTC 초안(그룹) + SPD(master 단위 개별) 를 **공통 row 로 정규화·UNION**. 조회 전용 — DB write·migration·ProductMaster 변경 없음.

## 변경 파일 (commit `8b3b36a27`)
- `apps/api-server/.../services/product-description-review-queue.service.ts`
  - `UNIFIED_CTE` 신설: 기존 OTC `grp` CTE **UNION ALL** `shared_product_descriptions(status='needs_review') JOIN product_masters` — 20컬럼 공통 정규화.
  - `ReviewQueueParams`: `sourceStore('all'|'otc_draft'|'spd')`, `descriptionType` 추가. `ReviewQueueRow`: `sourceStore`/`reviewItemId`/`detailKind`/`detailKey`/`masterId`/`productName`/`manufacturerName`/`descriptionType` 추가.
  - `buildOuterWhere` unified 컬럼 기준(sourceStore/status/source/descriptionType/q). 기본 정렬 = `updated_at`(혼합), applied_master NULLS LAST.
  - `filterOptions`: `sourceStores`(otc_draft/spd 카운트) 추가.
- `apps/api-server/.../controllers/product-description-review-queue.controller.ts` — `sourceStore`/`descriptionType` 파싱.
- `apps/admin-dashboard/src/api/o4o-product-db.api.ts` — 타입/파라미터 확장, filter-options `sourceStores`.
- `apps/admin-dashboard/src/pages/o4o-product-db/DescriptionReviewQueuePage.tsx` — `sourceStore` 필터 + '구분' 배지 컬럼 + 상품명 표시 + row click 분기(OTC→그룹 Drawer, **SPD→기존 기본상품 상세 `/masters/:id`**).

엔드포인트 (기존 mount 재사용, 신규 없음): `GET /api/v1/admin/o4o-product-db/description-review-queue` (+ `/filter-options`).

## 배포
- Deploy API Server (Cloud Run) — success (`8b3b36a27`)
- Deploy Admin Dashboard (Cloud Run) — success (`8b3b36a27`)

## 프로덕션 smoke (admin.neture.co.kr, admin 계정)
| # | 항목 | 결과 |
|---|------|------|
| 1 | 상품관리 › 설명서 검토 진입 | ✅ |
| 2 | **총계 = 3,564 건** (OTC 그룹 95 + SPD needs_review 3,469) | ✅ (WO §3 수치 일치) |
| 3 | 소스 필터: 전체 / OTC 초안 (95) / 공식 설명서(SPD) (3,469) | ✅ |
| 4 | '구분' 배지(OTC 초안 / 공식 설명서) | ✅ |
| 5 | source=SPD → 3,469 건, SPD row 정규화(상품명·제조사·STORE·mfds_easy_drug) | ✅ (174 페이지) |
| 6 | SPD row 클릭 → 기본상품 상세 `/masters/419104b1-…`(이텍스암브록솔시럽) | ✅ |
| 7 | OTC row 클릭 → 기존 그룹 상세 Drawer | ✅ (기존 유지) |
| 8 | 서버 페이지네이션(179/174 페이지)·검색 | ✅ |

## 검증 원칙 (WO §12 대응)
- read-only — INSERT/UPDATE/DELETE·migration 0. ProductMaster 무변경.
- parameterized SELECT. 본문 대량 전송 없음(SPD summary 160자 slice, primaryUse 160자).
- 서버 페이지네이션(limit 20, ≤100) + COUNT 분리. typecheck PASS 양쪽.

## 후속 (제외 — 다음 WO)
- descriptionType/category **UI** 필터(백엔드 param 은 이미 지원, UI select 미노출).
- Approve/Reject/Editor/Preview/History (Queue V1 과 동일 제외 범위).
