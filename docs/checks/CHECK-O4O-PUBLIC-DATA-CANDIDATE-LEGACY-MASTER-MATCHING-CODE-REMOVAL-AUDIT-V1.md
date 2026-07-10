# CHECK-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-CODE-REMOVAL-AUDIT-V1

> WO: `WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-CODE-REMOVAL-AUDIT-V1`
> 성격: **read-only 의존성 조사 (Dry-run)** — 코드 삭제 0 / API 제거 0 / DB 컬럼 삭제 0 / migration 0 / 상태변경 0 / 배포 0
> 선행: `CHECK-...-UNMATCHED-FULL-AUDIT-...-V1`(데이터), `WO-...-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1`(표시 정리)
> 조사일: 2026-07-10 · DB read-only(cloud-sql-proxy, o4o_api) + 정적 코드 분석

---

## 0. 결론 요약

공공데이터 후보의 **‘기존 ProductMaster 사전 매칭’ 서브시스템은 제거 가능**하다. 핵심 근거:

1. **`matched_identifier_id` = 0건, `confidence_score` = 0건** (전체 394,491 후보에서 단 한 건도 채워지지 않음) → 데이터 손실 없이 즉시 컬럼 삭제 가능.
2. **`matched_product_master_id` = 198,387건**은 **사전 매칭이 아니라 등록(승격) 시점의 링크**다 (배치 승격이 create→`approved_new_master`/link→`matched` 로 기록). → **유지 필수** (link-to-listing·refine·역참조 소비).
3. 사전 매칭 로직(`matchCandidate`/`computeMatch`/`manuallyMatchCandidate`)은 **중복 방지 목적이지만, 실제 중복 방지는 이미 등록 트랜잭션 내부 dedup(`promoteOne`, KOREA_DRUG_CODE/barcode 기준 link/create/conflict)이 수행**한다 → 운영자 사전 매칭은 잉여.
4. **주의 — 소비처가 admin 화면 하나가 아니다**: ① `services/web-neture` 오퍼레이터 화면(ProductCandidateReviewPage)도 `/match`·`/manual-match` 를 사용, ② **모바일 드래프트 전환**(mobile-product-draft.service)이 `matchCandidate` 를 호출. 제거 WO는 이 두 소비처를 반드시 포함해야 한다.

---

## 1. 컴포넌트 인벤토리

### 1.1 백엔드
| 파일 | 매칭 관련 요소 |
|---|---|
| `services/product-candidate.service.ts` | `createCandidateFromIdentifier`(auto-match), `matchCandidate`, `computeMatch`, `outcomeFromIdentifierHits`, `manuallyMatchCandidate`, `getConflictInfo`(Master 매칭 부분), `evaluatePromotable`(matchStatus 게이트) |
| `controllers/product-candidate.controller.ts` | 라우트 `POST /:id/match`, `POST /:id/manual-match`, `GET /:id/conflict-info`, `POST /`(식별자 있으면 auto-match), 목록 `matchStatus` 필터 |
| `services/product-identifier.service.ts` | `findByIdentifier`, `findByNormalizedValue` (소비처 = computeMatch **단독**) |
| `services/mobile-product-draft.service.ts` | L219-224 `matchCandidate` 호출 (best-effort) — **cross-flow** |
| `entities/ProductCandidate.entity.ts` | `matchStatus`, `matchedIdentifierId`, `confidenceScore`, `ProductCandidateMatchStatus` 타입, 인덱스 `idx_product_candidates_match_status` |
| import services (medical-device/hff/quasi/easy-drug) | 재import 시 `match_status` write (medical device = `UDI_DI_DUP_CONFLICT` → 'conflict') |

### 1.2 프론트엔드 (소비처 2곳)
| 앱 | 파일 | 매칭 관련 요소 |
|---|---|---|
| admin-dashboard | `ProductCandidatesPage.tsx` | "기본상품 매칭" 컬럼(현재 표시정리됨), 행 액션 |
| admin-dashboard | `CandidateConflictDrawer.tsx` | 수동 매칭 검색(`listProductMasters`+`manualMatchCandidate`), "동일 식별자 다른 후보", "식별자 일치 기본상품" |
| admin-dashboard | `ProductCandidateDetailPage.tsx`(레거시 라우트) | 매칭 필드 표시 |
| admin-dashboard | `candidate-status.util.ts` | `matchStatusBusinessLabel`, `isConflictCandidate` |
| admin-dashboard | `api/o4o-product-db.api.ts` | `getCandidateConflictInfo`, `manualMatchCandidate`, `matchStatus` 파라미터, `ProductCandidateRow.matchStatus/confidenceScore` |
| **web-neture** | `pages/operator/ProductCandidateReviewPage.tsx` | **활성 오퍼레이터 화면** — 매칭/수동매칭/matchStatus 필터 (App.tsx 라우팅 + operatorMenuGroups 메뉴) |
| **web-neture** | `lib/api/operatorProductCandidates.ts` | `/:id/match`(rematch), `manualMatch`, matchStatus |

---

## 2. 의존성 분류표 (제거 가능 / 유지 필요 / 대체 필요)

| 대상 | 판정 | 근거 |
|---|---|---|
| `matchCandidate` / `computeMatch` / `outcomeFromIdentifierHits` | **제거 가능** | 사전 매칭 전용. 소비처 = 후보 create·rematch·mobile draft 뿐 |
| `manuallyMatchCandidate` + `POST /:id/manual-match` | **제거 가능** | 운영자 사전 매칭 업무 자체가 제거 대상 |
| `POST /:id/match` (rematch) | **제거 가능** | admin·web-neture 재매칭 버튼 전용 |
| `createCandidateFromIdentifier` → `matchCandidate` (auto-match) | **대체(단순화)** | `createCandidate` 로 대체(식별자 있어도 auto-match 안 함). 중복 방지는 등록 시 dedup |
| `getConflictInfo` 의 `conflictingCandidates`(동일 식별자 후보) + `possibleMasters`(barcode 일치) | **제거 가능** | 사전 매칭 UI 근거. `promotable`+`rawPayloadSummary` 만 남기거나 상세 API 로 대체 |
| `mobile-product-draft.service` L219-224 matchCandidate | **제거 가능** | best-effort 호출. 제거 시 mobile 후보가 pre-match 안 됨(= 신 정책과 일치) |
| `ProductIdentifierService.findByIdentifier/findByNormalizedValue` | **유지(서비스), 소비 중단** | 범용 Identifier 서비스. 메서드는 남기고 candidate 소비만 제거. 승격 dedup 은 별도 경로(`DbPromotionMasterStore`) |
| `evaluatePromotable` 의 `matchStatus` 게이트 (L565) | **대체 필요** | `matchStatus IN (matched/exact/possible)` 차단 → `matched_product_master_id IS NULL` 로 대체 |
| 목록 `matchStatus` 필터 (controller L83, service L258) | **제거 가능** | 업무 필터는 candidate_status 3그룹으로 충분 |
| `match_status` 컬럼 + `ProductCandidateMatchStatus` 타입 + 인덱스 | **제거 가능(코드 선행)** | 사용값 3종뿐(exact/unmatched/conflict), 매칭·import·표시에서만 사용. import conflict write 제거 후 삭제 |
| `matched_identifier_id` 컬럼 (FK product_identifiers) | **제거 가능(데이터 0)** | **non-null 0건**. write 경로 = 매칭뿐. 소비 read 없음 |
| `confidence_score` 컬럼 | **제거 가능(데이터 0)** | **non-null 0건**. write = 매칭뿐, read = 표시뿐. (ai-core/supplier/cockpit 의 confidence_score 는 무관 도메인) |
| **`matched_product_master_id` 컬럼** | **유지 필수** | **non-null 198,387건 = 등록 링크**. 소비: `link-to-listing`, `refine-drug-category`, `product-library.controller`(역참조 L177), drug-otc 스크립트 JOIN. write = 승격 배치 |
| `promoteMasterFromCandidate` / `approveAsNewProductMaster`(`promoteOne`) | **유지 필수(=대체 수단)** | 등록 + **내부 dedup**(barcode/KOREA_DRUG_CODE → link/create/conflict). 사전 매칭의 정당한 대체 |
| `bulk-action` / `reject` / `archive` / `refine-drug-category` / `link-to-listing` | **유지** | 상태 처리·후속 흐름. (refine/link 는 matched_product_master_id 의존) |
| candidate_status (등록전/등록완료/제외) | **유지** | 업무 상태 SSOT |

---

## 3. 핵심 질문별 판정 (WO §조사)

1. **후보 매칭 전용 코드**: §2 "제거 가능" 행 전체 (matchCandidate/computeMatch/outcome/manuallyMatch/match·manual-match 라우트/conflict-info 매칭부/matchStatus 필터·컬럼).
2. **타 흐름 사용 여부**: ⚠️ **2곳**. ① web-neture 오퍼레이터 화면(활성), ② mobile-product-draft 전환. 공급자/매장/주문/콘텐츠 흐름은 **미사용**(grep 결과 supplier/store/order/content 는 자체 confidence_score/다른 컨텍스트 — ProductCandidate 매칭 무관).
3. **제거 시 영향 API/화면**: 라우트 `/match`·`/manual-match`·`/conflict-info`; admin(ProductCandidatesPage·CandidateConflictDrawer·DetailPage) + web-neture(ProductCandidateReviewPage). 목록 `matchStatus` 파라미터.
4. **`match_status` 삭제 가능?** → **가능**. 매칭·import·표시에서만 사용. 선행: import conflict write 제거 + evaluatePromotable 게이트 대체 + 필터 제거.
5. **`matched_product_master_id` 계속 필요?** → **예, 필수**. 등록 완료 링크(198,387건)이자 link-to-listing/refine/역참조의 소비 대상. 단 **write 주체를 "사전 매칭"에서 "등록(승격)"으로 확정** — 배치 승격은 이미 이를 기록(`drug-master-promotion-apply.db.ts:486-488`).
6. **`matched_identifier_id` 삭제 가능?** → **예**. non-null 0건, 소비 read 없음.
7. **`confidence_score` 타 흐름 사용?** → **없음**(ProductCandidate 기준 non-null 0건). ai-core/공급자/cockpit 의 동명 필드는 별도 도메인.
8. **마이그레이션 필요?** → 컬럼 3개(match_status·matched_identifier_id·confidence_score) DROP + 인덱스 `idx_product_candidates_match_status` DROP + 타입 제거. matched_identifier_id/confidence_score = 데이터 0(무해). match_status = 표시 전용이라 코드 선행 후 무해. **데이터 정규화 불필요**.
9. **등록 완료 판정을 candidate_status 만으로?** → **거의 가능**. `candidate_status IN (approved_new_master, matched, linked)` = 등록완료. 단 링크 필요 시 `matched_product_master_id` 병행. (참고: approved_new_master 중 53,209건 + matched 219건 = **matched_product_master_id NULL 결손** — 별도 데이터 정합 WO 후보, 본 제거와 분리).
10. **등록 시 dedup 으로 완전 대체?** → **예**. `promoteOne`(DbPromotionMasterStore) 가 공식 식별자 존재 시 신규 생성 대신 link + candidate 등록완료 처리. 단 현재 dedup 은 **DRUG 소스 게이트**(evaluatePromotable NOT_DRUG_SOURCE) — 의약외품/건기식/의료기기 확장은 **별도 "공통 승격 설계" WO**(본 제거와 무관, 병행 트랙).

---

## 4. dedup-on-create 대체 검증

**현재 사전 매칭 흐름 (제거 대상):**
```
후보 생성 → (식별자) auto matchCandidate → computeMatch(identifier/normalized/barcode/name ILIKE)
          → match_status/matched_identifier_id/confidence_score 기록 (운영자 검토용)
운영자: /match 재시도 · /manual-match 수동 연결 · conflict-info 로 동일식별자/일치Master 비교
```

**대체 (등록 트랜잭션 내부 dedup):**
```
후보 → 등록 대상 → promoteMasterFromCandidate → approveAsNewProductMaster → promoteOne(TX)
   ├─ 동일 KOREA_DRUG_CODE/barcode Master 존재 → outcome 'link'  → candidate_status='matched'   + matched_product_master_id
   ├─ 없음                                    → outcome 'create'→ candidate_status='approved_new_master' + matched_product_master_id + ProductIdentifier
   └─ 식별자 다른 Master 충돌               → outcome 'conflict'(생성 거부)
후보 → 비대상 → reject/archive (제외)
```
→ 운영자 사전 매칭 없이도 **중복 생성 방지·기존 Master 재사용·등록완료 링크**가 트랜잭션 내부에서 자동 성립. UI 로 "기본상품 매칭 업무" 노출 불필요.

---

## 5. 실제 제거 WO 권장 작업 순서 (구체)

> 별도 승인 전까지 착수 금지. 아래는 제거 WO 초안 순서.

1. **프론트 매칭 UI 제거 (2 앱)**
   - admin: `CandidateConflictDrawer` 수동매칭 검색·"동일 식별자 다른 후보"·"식별자 일치 기본상품" 제거, "기본상품 매칭" 컬럼·`candidate-status.util` 매칭 라벨 제거, `ProductCandidateDetailPage` 매칭 필드 제거.
   - **web-neture: `ProductCandidateReviewPage` 매칭/수동매칭/matchStatus UI 제거** (누락 금지).
2. **프론트 API 바인딩 제거**: admin `manualMatchCandidate`·`getCandidateConflictInfo`(매칭부)·`matchStatus` 파라미터·`ProductCandidateRow.matchStatus/confidenceScore`; web-neture `operatorProductCandidates` rematch/manualMatch/matchStatus.
3. **백엔드 매칭 엔드포인트 제거**: `POST /:id/match`, `POST /:id/manual-match`; `GET /:id/conflict-info` → 슬림(promotable+rawPayloadSummary만) 또는 상세 API 통합.
4. **자동 매칭 서비스 제거**: `matchCandidate`·`computeMatch`·`outcomeFromIdentifierHits`·`manuallyMatchCandidate` 삭제. `product-identifier.service` 메서드는 유지(소비만 제거).
5. **후보 생성 매칭 호출 제거**: 컨트롤러 `POST /` → 항상 `createCandidate`(auto-match 분기 제거). **mobile-product-draft.service L219-224 matchCandidate 호출 제거**.
6. **import 매칭 write 제거**: medical-device(UDI_DI_DUP_CONFLICT)·기타 import 의 `match_status` 세팅 제거.
7. **등록 판정/게이트 정리**: `evaluatePromotable` 의 matchStatus 차단 → `matched_product_master_id IS NULL` 기반. 등록완료 = candidate_status(+matched_product_master_id).
8. **migration(컬럼 제거)**: DROP `match_status`, `matched_identifier_id`, `confidence_score`; DROP INDEX `idx_product_candidates_match_status`; `ProductCandidateMatchStatus` 타입·`MatchOutcome` 인터페이스 제거. (matched_identifier_id/confidence_score = 데이터 0, match_status = 코드 선행 후 무해)
9. **배포 + 회귀 검증**: 모바일 드래프트 전환, 후보 목록/상세, 승격(promote link/create), link-to-listing, refine-drug-category, 등록완료/제외 필터.

**분리 권고(본 제거와 무관, 별도 WO):**
- (A) 공통 승격 설계 — 의약외품/건기식/의료기기 등록(바코드 없는 O4O 내부코드). 제거 WO의 선결이 아니라 병행.
- (B) `matched_product_master_id` NULL 결손(approved 53,209 + matched 219) 데이터 정합.

---

## 6. 안전 확인 (write 0 / migration 0 / code 0 / deploy 0)

- 실행 쿼리: 전량 SELECT/COUNT (`audit_fields.sql`). INSERT/UPDATE/DELETE/DDL **0건**.
- 코드 수정 **0**, migration 파일 **0**, 배포 **0**, 후보 상태 변경 **0**, ProductMaster/Identifier 생성·수정 **0**.
- 접속: cloud-sql-proxy read-only(o4o_api). 개인정보 컬럼 미조회(상태/카운트/식별자 채움 여부만).
- 산출물: 본 CHECK 문서 1건.

---

## 7. 최종 보고 요약

- **제거 가능**: 사전 매칭 서브시스템(matchCandidate/computeMatch/outcome/manuallyMatch, /match·/manual-match, conflict-info 매칭부, auto-match, matchStatus 필터·컬럼, matched_identifier_id·confidence_score 컬럼[데이터 0]).
- **유지 필수**: ProductMaster·ProductIdentifier, promote(=내부 dedup), matched_product_master_id(등록 링크 198,387건), candidate_status 3상태, link/refine/reject/archive.
- **대체**: 중복 방지 = 등록 트랜잭션 dedup(`promoteOne`). auto-match 제거, evaluatePromotable 게이트를 matched_product_master_id 기반으로 전환.
- **필수 주의**: 소비처가 admin + **web-neture 오퍼레이터** + **mobile draft** 3곳 — 제거 WO 범위에 모두 포함.
- **migration**: 컬럼 3 + 인덱스 1 DROP, 데이터 정규화 불필요.
