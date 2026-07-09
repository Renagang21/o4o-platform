# CHECK-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 배포(dc1f738) + 프로덕션 smoke PASS (2026-07-09)
WO: `WO-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1`
관련: `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1`(displaySummary 재사용), `WO-O4O-ADMIN-O4O-PRODUCT-DASHBOARD-OPERATION-UX-V1`(운영 대시보드 UX 패턴)

Scope: admin.neture.co.kr **"상품관리 › 설명서 운영"** 첫 화면. 운영자가 Review 로 들어가기 전에 설명 작성/검토/canonical 현황·그룹별 진행률·source/우선순위 분포를 한눈에 파악하는 **조회 전용 Dashboard**. **DB Write 없음 · Migration 없음 · Description 생성 로직 변경 없음.**

향후 의약품(기타)·의료기기·의약외품·건강기능식품 설명 운영까지 동일 구조로 확장 가능한 공통 운영 화면.

---

## 1. 조사 — 설명서 데이터 모델 (2 store)

| store | 테이블 | 핵심 컬럼 | 현재 데이터(prod read-only 2026-07-09) |
| --- | --- | --- | --- |
| **SPD (canonical store)** | `shared_product_descriptions` | `status`(canonical/needs_review/hidden/deprecated/candidate), `source_type`, `description_type`, `master_id`, `curated_by`/`curated_at`, `updated_at`, `deleted_at` | **21,346** (canonical 17,877 / needs_review 3,469). source_type: mfds_easy_drug 19,431 + mfds_drug_otc_nutrition_combo 1,915. 전부 STORE·OTC drug. `curated_by` 전량 NULL |
| **OTC 초안** | `product_candidate_description_drafts` | `review_status`(draft/needs_review/approved/rejected/…), `source_label`, `source_identifier_value`(=groupKey), `seed_json.groupScope{masterTotal,otc,spdMasters}`, `reviewed_by`, `updated_at` | **95** (전부 needs_review · MFDS_DRUG_OTC · store_description). `reviewed_by` 전량 NULL |

- **group_key/approved_at/rejected_at 컬럼 없음**: 그룹은 초안의 `source_identifier_value`, 검토 시각은 SPD `curated_at`/초안 `reviewed_at`, canonical 유일성은 partial unique index 로 표현.
- **reviewer 미기록**: 배치 시드라 `curated_by`/`reviewed_by` 전량 NULL → Reviewer Summary 는 "미기록 (배치 시드 · 검토자 없음)" 단일 버킷으로 정직하게 표기.
- `otc_curated_v1` source_type 은 설계 문서 제안일 뿐 엔티티 union 미포함 → 라벨 맵에만 예비로 둠.

---

## 2. 백엔드 (api-server) — 신규 endpoint 1 (read-only)

mount **`GET /api/v1/admin/o4o-product-db/description-dashboard`** (guard = description-status 와 동일 ADMIN 롤셋 `authenticate + requireRole(ADMIN_ROLES)`).

`ProductDescriptionDashboardService.dashboard()` — 단일 `Promise.all` 로 10개 read-only 집계를 병렬 수행 후 조립. 전부 parameterized/static SELECT. mutation 0.

| 섹션 | 근거 |
| --- | --- |
| `summary` | SPD status 집계 + 초안 review_status 집계 조합 (canonical / needsReview[SPD+초안] / draft / approved / rejected / other / spdTotal / draftTotal / lastUpdatedAt) |
| `categorySummary` | OTC = active(실데이터), 의약품기타·의료기기·의약외품·건기식 = active:false("준비중"). 확장 시 동일 shape |
| `workflow` | draft → review → approved → canonical 단계별 개수 |
| `groupSummary` | 초안 `source_identifier_value` GROUP BY + seed_json.groupScope(masterTotal/otc/spdMasters), 대표 title, review_status 배열, 최근 수정순 상위 200 |
| `reviewerSummary` | SPD curated_by + 초안 reviewed_by 병합. NULL → "미기록" 버킷 |
| `sourceSummary` | SPD source_type 분포 + 초안 source_label 분포 |
| `displaySummary` | **기존 `ProductDescriptionStatusService.summary()` 재사용**(master 축 final_status: canonical/needs_review/draft/none) |
| `recentActivities` | SPD(+master name) ∪ 초안 UNION, updated_at DESC 20건 |

파일: `services/product-description-dashboard.service.ts`(신규), `controllers/product-description-dashboard.controller.ts`(신규), `bootstrap/register-routes.ts`(등록 1블록 추가).

**엔드포인트 경로**: WO 예시는 `/admin/descriptions/dashboard` 이나, 기존 형제 규약(`/api/v1/admin/o4o-product-db/description-status`, `.../image-quality`)에 정렬해 `/api/v1/admin/o4o-product-db/description-dashboard` 로 mount.

---

## 3. 프론트 (admin-dashboard)

- api client: `getDescriptionDashboard()` + 타입(`DescriptionDashboard` 등) 추가.
- **`DescriptionDashboardPage.tsx`**(신규) — 단일 API 1회 호출. **Card + BaseTable + admin 상품관리 스타일만**, **Chart 라이브러리 미사용**(진행률 바는 CSS div).
  1. Summary Card 4(공식/검토/초안/반려) + SPD/초안 총계 caption
  2. Category Summary(OTC 운영중 + 나머지 준비중 카드)
  3. Workflow Summary(초안→검토→승인→공식 가로 흐름)
  4. **Group Summary — BaseTable**(그룹 성분/대표설명/그룹 상품수/적용 상품수/적용률/Canonical/검토상태/최근수정) *가장 중요*
  5. 최근 변경 — BaseTable 20건(초안 행 클릭 → 초안 상세)
  6. Reviewer Summary(검토자별 승인/검토/반려, 현재 "미기록" 버킷)
  7. Source Summary(SPD source_type + 초안 source_label 분포)
  8. Display Priority Summary(displaySummary 공식→검토→초안→없음)
- 탭 추가: `ProductDbLayout` TABS 에 `설명서 운영`(description-dashboard) — 이미지 상태와 설명 상태 사이.
- 라우트 추가: `o4o-product-db.routes.tsx` `description-dashboard` lazy child.

---

## 4. 안전 / 제외 (WO 준수)

- **Read Only** — INSERT/UPDATE/DELETE·migration·Description 생성 로직 변경 **없음**. 전부 SELECT.
- 이번 WO 제외 항목 미구현(계획대로): Description 수정 / Approve / Reject / Preview / History / Editor / AI 생성 / Canonical 생성.
- Summary Card·Group Table 링크는 **기존 화면(review/drug-description-drafts/…)** 으로만 이동(신규 mutation 경로 없음).

---

## 5. 검증

| 항목 | 결과 |
| --- | --- |
| api-server build(tsconfig.build) typecheck | **에러 0** (src/scripts/* 는 build exclude, 기존 이슈) |
| admin-dashboard typecheck | **에러 0** |
| admin-dashboard build (vite) | **EXIT 0** |
| dashboard SQL prod read-only 정합 | group/recent UNION/reviewer NULL 버킷/last_updated 전부 정상 실행·정상값 |
| 변경 파일 | 백엔드 3(service/controller 신규 + register 1블록) + 프론트 4(api client/page 신규 + layout/routes) |
| DB write | **0** (mutation·migration 없음) |
| 프로덕션 smoke | **PASS** (admin.neture.co.kr, 2026-07-09) |

### smoke 결과 (admin.neture.co.kr `/admin/o4o-product-db/description-dashboard`)

배포: API+Admin Cloud Run `dc1f738` 모두 success. 8 섹션 전부 렌더 + 수치 DB 정합 + **Console Error 0**.

| 섹션 | 렌더 값(실측) | DB 정합 |
| --- | --- | --- |
| Summary Card | 공식 17,877 / 검토 필요 3,564 / 초안 0 / 반려 0 · SPD 총 21,346 · 초안 총 95 | ✅ (canonical 17,877 · needsReview = SPD 3,469 + 초안 95) |
| Category | OTC 운영중(공식 17,877/검토 3,564/초안 95) · 의약품기타·의료기기·의약외품·건기식 "준비중" | ✅ |
| Workflow | 초안 0 → 검토 3,564 → 승인 0 → 공식 17,877 | ✅ |
| Group(BaseTable) | 그룹별 그룹 상품수/적용 상품수/적용률/CANONICAL/검토상태 (예: 38→11 29%, 3→3 100%) | ✅ seed_json.groupScope 반영 |
| Source | e약은요 19,431(91%) / OTC·영양제 복합 1,915(9%) + 초안 MFDS_DRUG_OTC 95 | ✅ |
| Display Priority | 공식 17,877 / 검토 3,215 / 초안 1,294 / 없음 176,003 (master 축) | ✅ (displaySummary 재사용) |
| Reviewer | "미기록 (배치 시드 · 검토자 없음)" 승인 17,877·검토 3,564·반려 0 | ✅ curated_by/reviewed_by NULL |
| 최근 변경 | SPD canonical 20건(상품명·출처·변경일 2026-07-07) | ✅ |

DB write 0 (조회 전용 확인). 탭 "설명서 운영" 노출·진입 정상.

**응답 구조 (실측):**
```
{ success, data: {
  summary: { canonical:17877, needsReview:3564, draft:0, approved:0, rejected:0, other:0, spdTotal:21346, draftTotal:95, lastUpdatedAt },
  categorySummary: [ {otc active:true …}, {의약품기타/의료기기/의약외품/건기식 active:false} ],
  workflow: { draft:0, review:3564, approved:0, canonical:17877 },
  groupSummary: [ {groupKey, ingredient, masterTotal, spdMasters, canonical, reviewStatuses, updatedAt} … ≤200 ],
  reviewerSummary: [ {reviewerId:null, reviewerLabel:'미기록…', approved:17877, pending:3564, rejected:0} ],
  sourceSummary: { spdBySourceType:[mfds_easy_drug 19431, combo 1915], draftBySourceLabel:[MFDS_DRUG_OTC 95] },
  displaySummary: { canonical, needs_review, draft, none },
  recentActivities: [ 20 ],
  generatedAt } }
```

---

## 6. 성능

- 단일 요청 = `Promise.all` 10 쿼리 병렬. 최대 비용은 `displaySummary`(master 198k JOIN CTE) — 기존 Overview 가 이미 호출하던 동일 쿼리라 신규 부하 아님. group/recent/source 는 소규모(SPD 21k/초안 95) 집계.

---

## 7. 후속 (다음 WO — 이번 범위 밖)

`WO-...-DESCRIPTION-REVIEW-LIST-V1 → -DETAIL-DIFF-V1 → -EDITOR-V1 → -PREVIEW-V1 → -APPROVE-REJECT-V1 → -HISTORY-V1`. 승인/반려 이력 로그 테이블 신설 시 `recentActivities` 를 실제 액션 로그로 승격 가능. 비-OTC 카테고리 활성화는 각 유형 설명 적재 후.
