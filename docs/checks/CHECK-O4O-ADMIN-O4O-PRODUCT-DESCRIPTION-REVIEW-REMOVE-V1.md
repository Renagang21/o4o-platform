# CHECK — O4O 상품 DB 설명서 검토 워크플로우 제거

**WO:** WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1
**Date:** 2026-07-09
**Status:** 구현 완료 · 타입체크 PASS · 배포/마이그레이션 대기

---

## 1. 목적

O4O 상품 설명은 법적 검토 대상이 아니라 정부/공공 원문 또는 O4O 내부 활용 자료다.
따라서 admin `O4O 상품 DB` 에서 **"설명서 검토"라는 관리자 업무(검토 큐·상태 분류·승격/반려 흐름)**를 제거한다.
설명 데이터 자체와 canonical 조회는 유지한다. (설명서를 없애는 것이 아니라 검토 워크플로우를 없애는 것)

---

## 2. 사용자 결정 (확정)

1. `needs_review` 로 검토 대상에 분류된 설명은 **모두 검토 대상에서 제외(승인)**한다.
2. 정부/공공 자료 기반 설명은 별도 법적 검토 큐를 거치지 않는다.
3. admin 은 상품 DB 품질/이미지/후보/기본상품/데이터 정비만 관리한다.
4. 설명은 매장 활용 후 피드백에 따라 수정하는 자료 — "관리자 검토 승인" 워크플로우 없음.
5. "설명서 검토" 메뉴/화면/상태 분류/큐 API/프론트 코드/문구를 제거한다.

---

## 3. 변경 내역

### 3-1. Frontend (admin-dashboard)

| 구분 | 파일 | 내용 |
|------|------|------|
| 탭 제거 | `pages/o4o-product-db/ProductDbLayout.tsx` | 설명서 운영 / 설명서 검토 / 설명 상태 / 설명 검토 / OTC 설명 초안 5개 탭 제거 → 현황·공공데이터 후보·기본 상품·이미지 상태·데이터 정비만 유지 |
| 메뉴 제거 | `admin/menu/admin-menu.static.tsx` | `o4o-product-db-review` (설명 검토) 항목 제거 |
| 라우트 | `routes/o4o-product-db.routes.tsx` | review / review/:id / drug-description-drafts(+:id) / description-dashboard / description-review-queue / description-status → `masters` 로 `<Navigate replace>` 리다이렉트(북마크 호환). lazy import 제거 |
| 페이지 삭제 | `pages/o4o-product-db/` | DescriptionReviewPage · DescriptionReviewDetailPage · DescriptionStatusPage · DescriptionReviewQueuePage · DrugDescriptionDraftsPage · DrugDescriptionDraftDetailPage · DescriptionDashboardPage (7개) |
| API client | `api/o4o-product-db.api.ts` | 검토 관련 블록 제거: DescriptionReview* / DrugDescriptionDraft* / DescriptionStatus* / DescriptionDashboard* / ReviewQueue* / setDescriptionCanonical / setDescriptionStatus / getBulkCanonicalDryRun |
| Overview | `pages/o4o-product-db/ProductDbOverviewPage.tsx` | `getDescriptionStatusSummary` 의존 제거. 설명 검토/OTC 초안 task 카드 + 공식 설명 보유율 KPI 제거 |
| 목록 badge | `pages/o4o-product-db/ProductMastersPage.tsx` | 설명서 badge 의 `needs_review`("검토") 분기 제거(있음/초안/없음만). "설명 보기"(→ /review/:id) 액션 제거 — 설명은 상세 화면에서 확인 |
| 상세 | `pages/o4o-product-db/ProductMasterDetailPage.tsx` | 설명 후보 pill 의 `needs_review` 분기 + /review/:id "보기" 버튼 제거. 상태 tone 맵에서 needs_review 제거 |

**유지:** 기본 상품 목록/상세, canonical 설명 조회, 설명/QR 요약 badge(`getProductDescriptionQrSummary`), 이미지 상태/후보/정비, 대표 QR(`getProductLandingQr`), 수동 상품 등록(`createProductMaster`).

### 3-2. Backend (api-server)

| 구분 | 대상 |
|------|------|
| 라우트 mount 제거 | `bootstrap/register-routes.ts` — `/admin/shared-product-descriptions`, `/admin/product-candidate-description-drafts`, `/admin/o4o-product-db/description-status`, `.../description-dashboard`, `.../description-review-queue` |
| 컨트롤러 삭제 | shared-product-description · product-candidate-description-draft · product-description-status · product-description-dashboard · product-description-review-queue |
| 서비스 삭제 | product-description-status · product-description-dashboard · product-description-review-queue · product-candidate-description-draft |
| 테스트 삭제 | `__tests__/product-candidate-description-draft.service.test.ts` |

**유지(데이터 파이프라인·조회):**
- `services/shared-product-description.service.ts` (canonical 대표 + bulk-canonical job 사용)
- `entities/SharedProductDescription.entity.ts`, `entities/ProductCandidateDescriptionDraft.entity.ts`
- `drug-import/*` 초안 생성 plan, `easy-drug-shared-description-derive.service.ts`, seed/derive job, 관련 script
- `product-library.controller.ts` 의 `canonicalDescription` 조회, `product-description-qr-summary.controller.ts`

### 3-3. DB migration

`database/migrations/20261226000000-ApproveNeedsReviewSharedProductDescriptions.ts`

`shared_product_descriptions.status = 'needs_review'` 전량 승인 처리. canonical 은
`(master_id, description_type)` 당 1개 partial unique(Freeze #2/F12) 제약이 있으므로:

1. `(master_id, description_type)` 그룹에 활성 canonical 이 **없으면** 대표 1건
   (`quality_score DESC → updated_at DESC → id`)을 `canonical` 로 승격.
2. 나머지 needs_review 는 `candidate`(승인된 설명 풀)로 전환 → 검토 대기 소멸.
3. up 종료 시 needs_review 잔여가 0 이 아니면 throw(롤백).

비가역 data migration(down = no-op). 설명 데이터·테이블은 삭제하지 않음.
main 배포 → CI/CD 자동 실행(PRODUCTION-MIGRATION-STANDARD).

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| admin-dashboard `tsc --noEmit` | **PASS (exit 0)** — o4o-product-db 관련 에러 0 |
| api-server `tsc --noEmit` | 내 변경 파일 에러 **0** (TS2307 module-resolution 0). 남은 20건은 사전 존재하던 `src/scripts/drug-otc-*.ts` 전역 스코프 충돌(TS2451/2393) — 본 WO 무관 |
| admin src 잔여 참조 sweep | 설명서 검토/설명 검토/OTC 설명 초안/설명 상태/설명서 운영 라벨·라우트·삭제 API 참조 0 (WO 주석 제외) |
| 삭제 backend 모듈 import sweep | 잔여 import 0 |

### 배포 후 화면 검증(대기)

- `admin.neture.co.kr/admin/o4o-product-db` 탭 = 현황 / 공공데이터 후보 / 기본 상품 / 이미지 상태 / 데이터 정비
- 기존 `/review`, `/description-*`, `/drug-description-drafts` 딥링크 → `masters` 로 리다이렉트
- 마이그레이션 후 `SELECT status, count(*) FROM shared_product_descriptions GROUP BY status` 에서 `needs_review = 0`

---

## 5. 남은 작업

- main 배포 → 마이그레이션 자동 실행 확인(로그 `[Migration] ApproveNeedsReview: promoted N → canonical, parked M → candidate`)
- 배포 후 브라우저 smoke(sohae/admin 계정, 탭·리다이렉트·상세 설명 표시)
- (선택) `product_candidate_description_drafts.review_status` 는 파이프라인 아티팩트로 잔존 — UI 노출 없음. 필요 시 별도 정리 WO.
