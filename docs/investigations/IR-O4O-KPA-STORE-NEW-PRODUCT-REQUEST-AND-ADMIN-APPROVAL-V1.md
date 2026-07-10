# IR-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1

**WO:** WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1
**성격:** 설계 IR (조사 + 재사용 매핑 + 상태머신 + 엔드포인트 + 알림 + 동시작업 조율). 코드/DB 변경 없음.
**일자:** 2026-07-10 · 환경: 프로덕션 기준

---

## 1. 목적 / 결론 요약

매장이 O4O DB에 없는 신규 상품 등록을 **요청**하고, 관리자가 검토·승인해 O4O 표준 상품(ProductMaster)으로 등록하며, 승인 시 요청 매장의 **매장 경영활용 제품**으로 자동 연결한다.

**결론: 새 테이블 불필요.** 기존 `product_candidates`(+admin candidate 액션) + `Notification` + `GET /store/products/search` + `linkCandidateToOrganizationListing`(org listing 생성) 재사용으로 구현. 신규 코드는 그 위의 **wiring**(매장 제출/상태 UI·엔드포인트, admin store-request 뷰, 보완요청 액션, 비-drug 신규승인 경로, 알림)뿐.

---

## 2. 재사용 매핑 (핵심)

| WO 요구 | 재사용 대상 | 비고 |
|---|---|---|
| 요청 저장소 | `product_candidates` (`source_type='store_web'`) | 새 테이블 X |
| 입력: 상품명/분류/제조사/규격·용량/이미지 | `candidate_name / candidate_category / candidate_manufacturer / candidate_spec(+unit) / candidate_image_url` | 매장 표시 상품명·기타명 입력란 없음(요구대로) |
| 입력: 바코드 | `identifier_type='KOREA_DRUG_CODE'\|'GTIN'` + `identifier_value` | 정규화 값 `normalized_identifier_value` |
| 요청 매장 / 제출자 | `organization_id` / `submitted_by` | Store Ops 경계(§7) |
| 검토 흔적 / 보완 메모 | `review_note / reviewed_by / reviewed_at` | |
| 기존 상품 연결 결과 | `matched_product_master_id` | 단방향 nullable |
| 상태 | `candidate_status` (varchar union) | §3 매핑 |
| 관리자 승인(신규) | `promoteMasterFromCandidate`→`approveAsNewProductMaster`(=promoteOne, TX, Master+Identifier 생성) | **drug 표준코드 전용 게이트** → §5 gap |
| 관리자 연결(기존) + 매장 자동연결 | `linkCandidateToOrganizationListing({organizationId, serviceKey, ...})` → `INSERT organization_product_listings` | 승인 후 요청 매장 org listing 생성 |
| 관리자 반려 | `rejectCandidate` | 등록 불가 |
| 중복 검색 | `GET /api/v1/store/products/search`(상품명/바코드) | 매장 제출 前 |
| 알림 | `Notification`(userId/serviceKey/organizationId/actorId/type/metadata/isRead) | member.registration_* 동일 패턴 |

---

## 3. 상태 머신 (candidate_status ↔ 매장 표시 상태)

매장에는 **4개 상태만** 표시(요구):

| 매장 표시 | candidate_status | 전이 |
|---|---|---|
| 검토 중 | `pending`, `reviewing` | 제출 시 pending. 관리자 열람 시 reviewing(선택) |
| 보완 요청 | `revision_requested` **(신규)** | 관리자 보완요청. 매장이 수정 재제출 → `pending` |
| 등록 완료 | `linked`, `approved_new_master`(+listing 생성 완료) | 관리자 연결/신규승인 |
| 등록 불가 | `rejected`(+`merged`/`archived` 포함) | 관리자 반려 |

- `revision_requested`는 **varchar union 값 추가**(엔티티 타입 + `PRODUCT_CANDIDATE_STATUSES`)로 **migration 불필요**.
- 매장 상태 매핑은 admin candidate 콘솔의 기존 status-group util과 별개(매장 전용 4버킷).

---

## 4. 엔드포인트 설계

### 4.1 매장 (신규, kpa store-owner scope)
- `GET  /api/v1/store/product-requests` — 내 매장 요청 목록(org 스코프) + 매장 표시 상태.
- `POST /api/v1/store/product-requests` — 요청 제출. 서버가 `createCandidate({sourceType:'store_web', organizationId(resolveStoreAccess), serviceKey, submittedBy, identifierType/Value(barcode), candidate_*})`. **상세설명/B2B·B2C/허가번호/가격·재고 미수신**(요구).
- `PUT  /api/v1/store/product-requests/:id` — 보완요청(`revision_requested`) 상태에서만 수정+재제출 → `pending`. (본인 org·본인 요청만)
- 중복 검색은 별도 신규 없이 **기존 `/store/products/search` 재사용**(제출 前 프론트에서 호출, 기존 상품 있으면 등록요청 중단 → `POST /store/products/list`로 매장 추가 유도).

### 4.2 관리자 (기존 candidate 컨트롤러 확장, ADMIN scope)
- 목록/상세: 기존 candidate list에 **`source_type=store_web` 필터** = "상품 등록 요청" 뷰. 상세에 **중복 후보(바코드/상품명/제조사/규격)** 표시.
- `POST /:id/request-revision` **(신규)** — `revision_requested` + review_note + 매장 알림.
- `POST /:id/reject` (기존) — 등록 불가 + 매장 알림.
- **기존 상품 연결**: candidate.matchedProductMasterId=기존 master 지정 → `link-to-listing`(org=candidate.organizationId, serviceKey) → listing 생성 + `linked` + 매장 알림.
- **신규 승인**: 비-drug 포함 신규 master 생성(§5) → `matched_product_master_id` 세팅 → `link-to-listing` → listing 생성 + `approved_new_master` + 매장 알림. **승인+매장연결 단일 TX 권장**.

---

## 5. 미해결/결정 필요 — 신규 master 승인의 drug 게이트

`promoteMasterFromCandidate`는 **의약품 표준코드 소스(`mfds-drug-master-standard-code*`) 전용 게이트**(`NOT_PROMOTABLE_*`). 매장 요청(store_web, 일반 상품/바코드)은 이 게이트를 통과하지 못한다.

**옵션:**
- (A) `store_web` 전용 승인 경로 신설 — `approveAsNewProductMaster`(=promoteOne) 를 drug 게이트 없이 호출하되, **바코드 필수 + 중복(dedup) 가드 + regulatory/classification 은 candidate_category 기반 매핑**. (권장, 격리적)
- (B) 게이트를 `store_web`에도 열도록 완화 — 기존 drug 파이프라인과 결합도↑, 회귀위험.

`approveAsNewProductMaster`(promoteOne)가 비-drug 후보(promotionFieldsFromCandidate)에서 안전 동작하는지 **선행 확인** 필요. 안 되면 store_web 전용 최소 Master+Identifier 생성 트랜잭션을 작성.

---

## 6. 알림 (Notification 재사용)

신규 `NotificationType`(union 값 추가, varchar라 migration 불필요) 또는 `custom`+metadata:
- `product_request.submitted` → **관리자**(수신자 해석: service admin/operator 역할 사용자 — member.registration_pending 패턴 참조).
- `product_request.revision_requested` / `.approved` / `.rejected` → **요청 매장 제출자(submitted_by)**.
- metadata: `{ requestId, productName }`, link = 매장/관리자 요청 상세 경로. 클릭 시 상세 이동.
- 수신자(관리자) 해석 방식은 기존 알림 helper(예: member registration)와 동일 규칙 재사용.

---

## 7. 프론트엔드

### 매장 (services/web-kpa-society)
- `/store/handled-products` 상단: `[O4O 표준 상품에서 추가] [신규 상품 등록 요청]`.
- 신규 요청 모달: **1단계 중복검색(상품명/바코드)** → 기존 상품 있으면 "기존 상품 추가"로 전환(모달 재사용) / 없으면 **요청 폼**(상품명·분류·바코드·제조사·규격/용량·이미지(선택)). 상세설명/가격 등 입력란 없음.
- 내 요청 상태 목록(검토 중/보완 요청/등록 완료/등록 불가). 보완요청 → 수정 재제출.

### 관리자 (apps/admin-dashboard, O4O 상품 DB 영역)
- "상품 등록 요청" 목록(store_web) + 상세 검토(중복 후보 표시) + 액션(기존연결/신규승인/보완요청/등록불가).

---

## 8. 동시작업 조율 (중요)

- **다른 세션이 `product_candidates` + admin candidate 콘솔을 활발히 수정 중**(legacy-match 제거, 분류 컬럼, "candidate 필터 최소화" 5ffde7577). admin "상품 등록 요청" 뷰는 **기존 콘솔 코어를 침범하지 않는 별도 하위 뷰/필터**로 얹고, 서비스 메서드는 **추가만**(기존 시그니처 무변경).
- `product_candidates` 엔티티 union 값 추가(`revision_requested`) + `NotificationType` 추가는 additive.
- 커밋은 path-specific, 동시세션 미커밋 파일 제외.

---

## 9. 제외 범위 (WO)
매장용 상세설명서 생성 · AI 상세설명 · 상세설명 canonical 승격 · 전자상거래 입점/판매 승인 · 기존 상품 일괄 정비. (입력·생성 어디에도 상세설명 관련 없음)

---

## 10. 권장 Phasing
- **P1(매장 제출·상태)**: 엔티티 `revision_requested` 추가 + 매장 3 엔드포인트(create/list/resubmit=candidate 재사용) + kpa-web UI(중복검색→요청폼→상태목록).
- **P2(관리자 검토·승인·자동연결)**: admin store-request 필터 뷰 + `request-revision` + 신규 master 승인(§5) + link-to-listing 자동연결(승인 TX).
- **P3(알림)**: submitted→admin, revision/approved/rejected→store, 클릭 상세 이동.
각 Phase 배포·smoke 후 진행(동시작업 충돌 최소화).

---

## 11. 완료 기준 대응
매장 요청 가능(P1) · 중복검색+기존연결(P1 검색·P2 link) · 관리자 목록/상세/승인(P2) · 승인 후 Master/기존연결(P2 §4.2) · 매장 자동 org listing(linkCandidateToOrganizationListing) · 알림(P3) · 상세설명 입력/생성 없음(설계 전반) · 타입체크·빌드·smoke(각 Phase).
