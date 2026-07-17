# RUNBOOK · HFF 유산균 통합 적재 준비 (WO-O4O-HFF-PROBIOTICS-LOAD-PREP-CONSOLIDATION-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·Agent B·의약품 미접촉.
- 일자: 2026-07-18
- status: **PAUSED_EXTERNAL_DEPENDENCY_DB_WRITE_PERMISSION** — DB 프록시/apply 는 권한 세션에서만. 본 문서는 문서·매니페스트만(코드·rules.ts·apply 미수정).
- 목적: 권한 세션이 **즉시 실행**할 수 있도록 5개 그룹 294건의 적재 절차를 통합 정리.

---

## 0. 총괄

| 그룹 | 작성(적재대상) | 데이터 파일 | 기대 write | 재검 |
|---|---|---|---|---|
| G1 Batch003 | **226** | `hff-probiotics-prod-c-cp01~12.json` | 904 | PASS(오케스트레이터 f82de45f5) |
| G2 P1-잔여 | **1** | `hff-probiotics-prod-d-cp01.json` | 4 | PASS |
| G3 KW-파일럿 | **19** | `hff-probiotics-kw-cp01.json` | 76 | PASS(오케스트레이터) |
| G4 KW-확대 | **46** | `hff-probiotics-kw-cp02~04.json` | 184 | PASS(오케스트레이터) |
| G5 INFANT | **2** | `hff-probiotics-kw-inf-cp01.json` | 8 | PASS(오케스트레이터, 별도 재검 완료) |
| **계** | **294** | — | **1,176** | — |

기대 write = master N + candidate N(승격 UPDATE) + SPD 2N(ko+en). 294 → master 294 + candidate 294 + SPD 588 = **1,176**.

## 1. 공통 계약 (전 그룹 동일 — b3 계약)

**기준 스크립트**: `apps/api-server/src/scripts/hff-b3-store-canonical-apply.ts` (오케스트레이터 커밋 f82de45f5). 다른 그룹은 **동 계약 재사용** — `loadTargets()` 를 그룹 데이터 파일로, `TARGET` 를 그룹 건수로 지정한 thin 변형 또는 `loadTargets`/`TARGET` 파라미터화(권장: env `HFF_APPLY_FILES`/`HFF_APPLY_TARGET`). **본 WO 범위는 문서화까지 — 스크립트 신규 생성/수정은 권한 세션 소관.**

- **접속**: Cloud SQL Auth Proxy v2 — `./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" --port 5460 netureyoutube:asia-northeast3:o4o-platform-db` (run_in_background, `&` 없이). ready 로그 즉시 tsx 실행(프록시 수명 짧음). DB 계정 = `.env` DB_USERNAME/PASSWORD/DB_NAME, host 127.0.0.1, **ssl:false**, `PROXY_PORT=5460`.
- **env 이중게이트**: dry-run 기본. apply = `HFF_B3_CANONICAL_APPLY_CONFIRM=YES ... --apply`.
- **candidate 매칭축**: `product_candidates.raw_payload::jsonb->'source'->>'STTEMNT_NO'` = 그룹 statementNo, `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'`, `deleted_at IS NULL`.
- **사전조건(트랜잭션 내 가드, 위반 시 throw·롤백)**: `CANDIDATE_MISSING=0` · `CANDIDATE_AMBIGUOUS=0`(1:1) · `ALREADY_PROMOTED=0`(matched_product_master_id NULL) · `MASTER_EXISTS=0`(mfds_permit_number 부재).
- **write 3문(단일 트랜잭션, bulk unnest)**:
  1. `product_masters` INSERT — `barcode=NULL` · `regulatory_type='건강기능식품'` · `name=manufacturer=제품명/제조사` · `mfds_permit_number=STTEMNT_NO` · `is_mfds_verified=true` · `status='ACTIVE'` · tags(그룹별 `batch:probiotics-prod-003` 등).
  2. `product_candidates` UPDATE — `matched_product_master_id=신규master` · `candidate_status='approved_new_master'`.
  3. `shared_product_descriptions` INSERT — `content=sanitizeDescriptionHtml(draft)` · `source_type='o4o_hff_generated'` · `source_ref_id=candidate.id` · `status='canonical'` · `language∈{ko,en}` · `description_type='STORE'`.
- **트랜잭션 내 사후검증(불일치 시 자동 ROLLBACK+exit 2)**: `masters=N` · `spdKo=N` · `spdEn=N` · `canonicalDup=0`(partial-unique (master_id,description_type,coalesce(language,'ko')) where canonical) · `candidatesLinked=N`.
- **롤백 매니페스트**: COMMIT 직전 `scratchpad/hff-<group>-apply-rollback-manifest.json` (`createdMasters[]` · `createdSpd[]` · `candIds[]` · `snapshot[prev_status]` · `outcomes[]`). 롤백 = createdSpd DELETE → createdMasters DELETE → candidate status 를 snapshot.prev_status 로 복원.

## 2. 그룹별 파라미터

| 그룹 | loadTargets | TARGET | env 게이트 | tags | 롤백매니페스트 |
|---|---|---|---|---|---|
| G1 | prod-c-cp01..12 (12파일) | 226 | `HFF_B3_CANONICAL_APPLY_CONFIRM=YES` | `batch:probiotics-prod-003` | `hff-b3-apply-rollback-manifest.json` |
| G2 | prod-d-cp01 | 1 | 동 계약(게이트명 그룹 접미 권장) | `batch:probiotics-prod-003`(P1잔여) | `hff-d-apply-rollback-manifest.json` |
| G3 | kw-cp01 | 19 | 동 계약 | `batch:probiotics-kids-womens` | `hff-kw01-...` |
| G4 | kw-cp02,03,04 | 46 | 동 계약 | `batch:probiotics-kids-womens` | `hff-kw-exp-...` |
| G5 | kw-inf-cp01 | 2 | 동 계약 | `batch:probiotics-kids-womens-infant` | `hff-kwinf-...` |

> PROXY_PORT=5460 공통. G1 은 기존 b3 스크립트 그대로 실행 가능. G2~G5 는 loadTargets/TARGET 만 교체.

## 3. 순차 처리 순서 · 의존성

- **전 그룹 독립**: 서로 다른 statementNo(전 그룹 유일, 교집합 0), 그룹마다 자체 master/candidate/SPD 생성. **공유 master 없음, cross-group FK 없음** → **임의 순서·병렬 가능**.
- 안전 권장 순서(트랜잭션 경합 최소화 위해 순차): **G1 → G2 → G3 → G4 → G5**. 각 그룹은 독립 트랜잭션·독립 롤백매니페스트라 중간 실패 시 그 그룹만 롤백, 앞 그룹 LIVE 유지.
- **멱등성**: `MASTER_EXISTS=0` 가드가 재실행 시 이미 적재된 그룹을 자동 차단(throw) → 중복 적재 없음. 부분 성공 후 재개 안전.
- **G5 INFANT**: 오케스트레이터 별도 재검 **완료(PASS)** → 적재 게이트 해제. 규제 민감 그룹이므로 로그·사후검증 별도 확인 권장.

## 4. 독립 사후검증 (커밋 밖 새 연결, 그룹별)

각 그룹 apply 후 **별도 연결**로:
1. 신규 `product_masters` count = TARGET · `barcode IS NULL` = TARGET · `regulatory_type='건강기능식품'` = TARGET.
2. `product_candidates` `candidate_status='approved_new_master'` (그룹 master 링크) = TARGET.
3. `shared_product_descriptions` STORE canonical `source_type='o4o_hff_generated'` ko=TARGET·en=TARGET · canonicalDup=0.
4. 신고번호 유일 = TARGET · 실제 write = 4×TARGET.
5. 기존 Batch001/002 및 타 그룹 master/canonical **무변경**.
6. HOLD 건(§5) master/candidate/SPD **미생성 확인**.
7. 롤백 매니페스트 보존.

**실패 시**: 해당 그룹 자동 ROLLBACK(트랜잭션 내) 또는 롤백매니페스트로 수동 복원 → `PAUSED_COMMON_DEFECT` 보고, 다음 그룹 진행 금지.

## 5. HOLD 레지스트리 (누계 14 · 적재 대상 아님)

> HOLD = "지금 이 라인에서 적재 안 함" 격리. master/candidate/SPD 미생성. 코드별 재개 경로 상이.

### 5.1 데이터 결함 — `HOLD_SOURCE_ABNORMAL` (4) · 재개 = **원문 표기 정정**

원문 CFU 이중표기(정수+한글 gloss)가 파서/가드에 상충값으로 읽힘(H-COUNT-MISMATCH / PRE-SRC-CFU-UNVERIFIABLE). 값은 일관하나 표기 정정 필요.

| statementNo | 제품 | 표기 |
|---|---|---|
| 20040017014432 | 셀립라이프타임가족유산균 | `120,000,000(1억2천만)` |
| 20040017014271 | 락토베베F | `102,000,000(1억2백만)` |
| 20120019007110 | 일양살아있는프로바이오틱스장용캡슐 | `수(CFU/500mg):표시량(100,000,000)` 값·단위 분리 |
| 202000124466 | 17종 생유산균 프로바이오틱스 | `300,000.000cfu` 소수점·천단위 혼용 |

### 5.2 명칭 함의 — `HOLD_NAME_UNGROUNDED_CLAIM` (3) · 재개 = **명칭 정정 또는 기능성 근거 확보**

공식 제품명에 인정 기능성(장 건강) 범위 밖 함의(특허/질병/면역). 명칭 임의 변경 금지 원칙상 격리. 규제 민감.

| statementNo | 제품 | 함의 |
|---|---|---|
| 200700170352826 | 특허받은 듀얼액션 유산균 | '특허받은'(효능 특허) — guard D-CLAIM-UNGROUNDED-001 BLOCKED |
| 200700170352210 | Kids Garden® AntiAller Pro | 'AntiAller'(항알러지) — 아동 알레르기 예방 함의 |
| 200700170353212 | Kids Garden® immStar® Beta Kids | 'immStar'(면역) — 아동 면역강화 함의 |

> AntiAller·immStar 는 **가드 영문 claim 토큰 미감지 갭**을 사람이 보수적으로 격리한 사례. 공통코드 가드 강화는 **오케스트레이터 소관**(rules.ts 미수정).

### 5.3 범위 밖(선정 필터 갭) — `HOLD_OUT_OF_SCOPE_*` (7) · 재개 = **선정 필터 정정 + 대상 라인 별도 검증**

데이터·grounding 정상이나 선정 필터(KIDS/WOMENS/INFANT)가 철자 갭으로 놓친 제품. Batch003 frozen selection 유입분 in-place 격리(보충 안 함).

- KIDS(4): 리웰키드업 / 바이오스타임…포 칠드런 / 코알라팔스 포도맛·딸기맛
- WOMENS(2): 닥터에디션 페미퓨어 / 시크릿 프로바이오틱스
- INFANT(1): 活性益生菌粉(중국어명+분유 혼합)

> **오케스트레이터 포커스 4건**(신규 코드 확립분): `HOLD_SOURCE_ABNORMAL` 락토베베F + `HOLD_NAME_UNGROUNDED_CLAIM` 특허/AntiAller/immStar. 위 표는 전 트랙 누계(14)로 확장 기재.

## 6. 파일풀 소진 상태 · 다음 트랙 후보 (read-only 목록 — 작성 아님)

- **파일기반 유산균 소진**: poolA-remaining(735) 유래 작성 = **68**(P1잔여 1 + KW파일럿 19 + 확대 46 + INFANT 2; 아동/여성 소계 67) — Batch003 226 은 앞선 트랙(별도). poolA 미사용 잔여 = **28** 뿐(액상 6 + scope/held/parse 22). **표준·아동·여성 P1 유산균 전량 처리 완료.**
- **다음 트랙 후보(유산균 계열, 파일풀 내)**:
  - `액상/mL 6건` → `HOLD_UNSUPPORTED_DIMENSION` 계열(부피·밀도 모델 확장 필요). 별도 액상 파일럿 대상.
  - `복합/2nd기능성 0건`(poolA 내) → 복합형은 별도 모집단 필요.
- **파일풀 밖 추가 대량**: 전체 프로바이오틱스 `product_candidates` 모집단(HFF Gate A 44,885 중 프로바이오틱스 부분집합, 파일 export=735 는 부분) 조회는 **DB read-only 필요** → 동일 프록시 권한 게이트. 권한 세션에서 candidate 재쿼리로 잔여 유산균 모집단 확정 후 P1 연장 가능.
- **타 HFF 카테고리**(비타민 잔여·복합형·액상 등)는 **본 유산균 트랙 밖**(비타민=Agent B 소관). 목록화도 해당 모집단은 DB/타 세션 pool 이 필요하므로 여기서는 유산균 계열만 기재. (Agent B 파일 미접촉.)

## 7. 산출 파일

- 본 런북.
- 통합 큐 매니페스트(기계판독): `docs/guides/products/health-functional-food/HFF-PROBIOTICS-LOAD-QUEUE-CONSOLIDATED-MANIFEST.json` (294 항목 그룹·statementNo·slug·데이터파일·기대write 색인).
- 그룹별 매니페스트/CHECK(기존): batch-probiotics-prod-003 PRELOAD · prod-004 PARTB · kids-womens-pilot PILOT/EXPANSION/INFANT.
