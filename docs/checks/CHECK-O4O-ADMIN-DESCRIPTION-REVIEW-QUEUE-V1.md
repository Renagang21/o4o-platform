# CHECK-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 배포(52317ee) + 프로덕션 smoke PASS (2026-07-09)
WO: `WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1`
선행: `WO-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1`(집계 대시보드)
폐기: `WO-O4O-ADMIN-DESCRIPTION-REVIEW-LIST-V1`(단순 통합목록) — 커밋 `b4ff36fc5` 를 `61cb8d22f` 로 **revert**. 설명서 검토는 단순 List 가 아니라 **Group 중심 Review Queue** 로 재설계.

Scope: admin.neture.co.kr **"상품관리 › 설명서 검토"**. 운영자가 설명서를 목록이 아니라 **(성분·함량·제형) Group 단위**로 검토하는 업무동선의 시작. Queue 조회 + 검색/상태/Source 필터 + 정렬 + **Group Detail(적용 대상 Master 목록 + 상담 블록)**. **조회 전용 — DB write·migration·Draft 구조 변경·ProductMaster 변경 없음.**

**제외(다음 WO)**: Approve / Reject / Editor / Preview / History / Rollback / Canonical Apply.

---

## 1. 설계 결정 — 왜 Queue(Group 중심)인가

Dashboard 구축 결과: 설명서는 (성분·함량·제형) **Group** 단위로 운영하는 것이 효율적. 운영자는 설명서 하나가 아니라 **검토 대상(Group)** 을 처리한다. 따라서 단순 flat List(폐기)가 아니라 Group 을 행으로 하는 Queue 로 구현.

- Queue 행 = OTC 초안(`product_candidate_description_drafts`) 의 `source_identifier_value`(=groupKey) 집계 단위.
- 적용 Master 수 = 초안 `seed_json.groupScope.spdMasters/masterTotal` (목록은 가볍게, join 안 함).
- Group Detail 의 **적용 대상 Master 목록** = description-status 통합뷰와 동일한 **결정적 parse join** 으로만 해석: `(name 괄호 성분)=ingredient AND (spec 첫 토큰)=strengthToken AND (제형 키워드)=doseForm AND drug_category='otc'`. 추정 매칭 없음.

---

## 2. 백엔드 (api-server) — 신규 endpoint 3 (전부 read-only)

mount **`/api/v1/admin/o4o-product-db/description-review-queue`** (guard = dashboard/description-status 와 동일 ADMIN 롤셋).

| 엔드포인트 | 역할 |
| --- | --- |
| `GET /` | Group 중심 Queue 목록. CTE 로 groupKey 집계(대표 초안 draftId, ingredient, primaryUse=content_json.efficacy 요약, sourceLabel, reviewStatus, groupScope masterTotal/spdMasters, author=ai_provider, reviewer=reviewed_by). **서버 페이지네이션**(limit 20, ≤100) + COUNT 분리. 필터 q(group/ingredient/title/primaryUse)·status(review_status)·source(source_label). 정렬 applied_master(기본=적용 Master 많은순)·updated_at·group. 본문 대량 전송 없음(primaryUse 160자 slice) |
| `GET /filter-options` | source_label·review_status 분포(Toolbar 채움) |
| `GET /:draftId` | Group Detail(읽기 전용): 상담 블록(bodyMarkdown/efficacy/ingredientSelection/usage/caution/usageLabel/contentSource) + **적용 대상 Master 목록**(parse join, canonical/needs_review 플래그, 상위 100 + 전체 count). 404 처리 |

파일: `services/product-description-review-queue.service.ts`(신규), `controllers/product-description-review-queue.controller.ts`(신규), `bootstrap/register-routes.ts`(등록 1블록).

**SQL 정합 검증(prod read-only 2026-07-09)**: 목록 CTE 95 그룹, 적용 Master 많은순 정렬(407/373/302…). detail parse join = 에르도스테인 그룹 440 매칭(seed_json masterTotal 440 일치), canonical 플래그 정상.

---

## 3. 프론트 (admin-dashboard)

- api client: `getDescriptionReviewQueue()` / `getReviewQueueFilterOptions()` / `getReviewQueueDetail()` + 타입.
- **`DescriptionReviewQueuePage.tsx`**(신규):
  - Toolbar: 검색(debounce 400) · 상태 · Source · 정렬 select · 새로고침 · 총 그룹수.
  - **BaseTable**(group 컬럼): 검토 그룹(성분+주요 용도) / Source / 적용 Master(적용/그룹) / 상태 / 최근 수정 / 작성자 / 검토자. 서버 페이지네이션 footer.
  - 행 클릭 → **BaseDetailDrawer(읽기 전용)**: 메타(그룹키·함량/제형·Source·작성일·작성자·검토자·원문출처·reviewFlags) + 상담 블록(주요 용도/선택/상담/안전) + 대표 설명 원문(bodyMarkdown) + **적용 대상 기본상품 목록**(공식/검토 뱃지, 총 count·상위 100 표시). 닫기 액션만.
- 탭 추가: `ProductDbLayout` 에 `설명서 검토`(description-review-queue) — 설명서 운영과 설명 상태 사이.
- 라우트 추가: `description-review-queue` lazy child.
- **Dashboard 연결**: DescriptionDashboardPage `검토 필요` Summary Card → `/admin/o4o-product-db/description-review-queue?status=needs_review`.

---

## 4. 안전 / 제외 (WO 준수)

- **Read Only** — INSERT/UPDATE/DELETE·migration·Draft 구조 변경·ProductMaster 변경 **없음**. 전부 SELECT.
- Approve/Reject/Editor/Preview/History/Rollback/Canonical Apply **미구현**(다음 WO).
- 본문 대량 전송 금지: 목록은 primaryUse 요약(160자)만, 전문(bodyMarkdown)은 Detail 단건에서만.
- 적용 Master 목록 상위 100 + 전체 count(대량 행 프론트 로딩 방지).

---

## 5. 검증

| 항목 | 결과 |
| --- | --- |
| api-server build(tsconfig.build) typecheck | **에러 0** |
| admin-dashboard typecheck | **에러 0** |
| admin-dashboard build (vite) | **EXIT 0** |
| 목록/상세 SQL prod read-only 정합 | 95 그룹·적용 Master 정렬·parse join(440 매칭) 정상 |
| 변경 파일 | 백엔드 3(service/controller 신규 + register 1블록) + 프론트 5(api client/page 신규 + layout/routes/dashboard 카드) |
| DB write | **0** |
| 프로덕션 smoke | **PASS** (admin.neture.co.kr, 2026-07-09) |

### smoke 결과 (admin.neture.co.kr `/admin/o4o-product-db/description-review-queue`)

배포: API+Admin Cloud Run `52317ee` 모두 success. **Console Error 0**.

| 항목 | 결과 |
| --- | --- |
| 목록 렌더 | 총 **95 그룹**, 정렬 = 적용 Master 많은순(407/709 → 373/440 → 302/598 …), 페이지 1/5 ✅ |
| Toolbar 필터 | 상태 select(검토 필요 95) · Source select(MFDS_DRUG_OTC 95) · 정렬 3옵션 · 검색 |
| 컬럼 | 검토 그룹(성분+주요 용도)/Source/적용 Master(적용/그룹)/상태/최근 수정/작성자(AI 생성)/검토자(미배정) ✅ |
| 검색 필터 | q="아세틸시스테인" → **총 2 그룹**(서버 필터링) ✅ |
| Group Detail Drawer(에르도스테인) | 메타(그룹키·함량/제형 300밀리그램/캡슐·Source·작성자·검토자·원문출처·reviewFlags[auto,spd_overlap]) + 상담 4블록(주요 용도/선택/상담/안전) + 대표 설명 원문(bodyMarkdown) + **적용 대상 기본상품 440건(상위 100 표시)·전부 공식 뱃지** ✅ |
| Dashboard 연결 | `검토 필요` Summary Card → `/description-review-queue?status=needs_review` (코드 반영) ✅ |
| DB write | **0** (조회 전용) |

적용 Master parse join 실측 = 에르도스테인 440건(seed_json masterTotal 440 일치), 전부 canonical(공식).

---

## 6. 다음 WO (업무동선 순서)

Queue 완성 후: `DETAIL-DIFF → EDITOR → PREVIEW → APPROVE-REJECT → HISTORY`. 각 단계는 이 Queue → Group Detail 동선 위에 mutation 을 얹는다. 승인/반려 이력 로그 테이블 신설 시 Dashboard recentActivities 를 실제 액션 로그로 승격.
