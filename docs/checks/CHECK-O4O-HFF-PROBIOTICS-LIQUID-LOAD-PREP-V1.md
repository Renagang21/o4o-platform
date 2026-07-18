# RUNBOOK · HFF 유산균 **액상** 6건 별도 LIVE 적재 준비 (WO-O4O-HFF-PROBIOTICS-LIQUID-LOAD-PREP-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·Agent B·의약품·고형 294큐 미접촉.
- 일자: 2026-07-18
- status: **READY_FOR_PRIVILEGED_SESSION** — 본 문서는 문서·매니페스트만. **DB 접속·write·apply 스크립트 신규 생성은 권한 세션 소관**(코드·rules.ts·프록시 미접촉).
- 선행: `WO-O4O-HFF-PROBIOTICS-LIQUID-MODEL-PILOT-6-V1` **COMPLETED**(PASS 6 / HOLD 0, commit `1bcd80382`). G-LIQUID 6규칙 공통 가드 `product-description-guard@1.2.0` 승격 완료.
- **경계**: 액상 6은 고형 294와 **합치지 않는다**. 별도 batch · 별도 dry-run · 별도 apply · 별도 롤백. [`고형 294 런북`](CHECK-O4O-HFF-PROBIOTICS-LOAD-PREP-CONSOLIDATION-V1.md) 의 5그룹 경계는 **불변**(본 WO 미접촉).

---

## 0. 총괄

| 항목 | 값 |
|---|---|
| 대상 | **6** (액상 유산균, poolA 잔여 전량) |
| 고정 매니페스트 | `docs/guides/products/health-functional-food/batch-probiotics-liquid-pilot/LIQUID-PILOT-MANIFEST.json` (PASS 6 / HOLD 0, verdict 고정) |
| 데이터 파일 | `docs/checks/data/product-description-guard/hff-probiotics-liq-cp01.json` (6 항목, ko/en drafts + liquidGrounding + grounding 스텁) |
| **기대 write** | **24** |
| tags | `batch:probiotics-liquid-pilot` |
| 롤백 매니페스트 | `scratchpad/hff-liq-apply-rollback-manifest.json` |
| env 게이트 | `HFF_LIQ_CANONICAL_APPLY_CONFIRM=YES` (dry-run 기본) |

### 기대 write 24 내역

```text
ProductMaster INSERT                 6   (신규 master, barcode NULL)
product_candidates UPDATE            6   (approved_new_master 승격)
STORE canonical SPD INSERT          12   (ko 6 + en 6, description_type='STORE' status='canonical')
──────────────────────────────────────
총 예상 write                       24   = 4 × 6
```

## 1. 대상 6건 (고정 — statementNo 축)

| # | statementNo | 제품 | slug | cfuBasisType | verdict |
|---|---|---|---|---|---|
| 1 | 200700170352801 | 차일드라이프 베이비 액상 유산균 드롭스 | liq-cp01-01-childlife-baby-liquid-probioti | per-serving | PASS_LIQUID_MODEL |
| 2 | 200700170351676 | 닥터드랍비 | liq-cp01-02-dr-drop-b | per-serving | PASS_LIQUID_MODEL |
| 3 | 200700170352069 | Kids Garden® Babyflora Probiotic drops | liq-cp01-03-kids-garden-babyflora-probioti | per-serving | PASS_LIQUID_MODEL |
| 4 | 200700170352352 | 락티브 베베 우리아이 유산균 프로바이오틱스 드롭 | liq-cp01-04-lactive-bebe-our-child-probiot | per-serving | PASS_LIQUID_MODEL |
| 5 | 200700170351715 | 신터액트 베이비 오일드롭 | liq-cp01-05-synteract-baby-oil-drop | per-serving | PASS_LIQUID_MODEL |
| 6 | 2014001710730 | 야쿠르트 프리미엄 라이트 | liq-cp01-06-yakult-premium-light | per-volume-unit-unknown | PASS_LIQUID_MODEL |

- 신고번호 전 6건 유일(교집합 0). 고형 294 statementNo 집합과도 교집합 0 → 상호 독립.

## 2. 최신 Guard 재실행 (적재 직전 필수)

**가드**: `product-description-guard@1.2.0` (`runGuard`). 액상은 `liquidGrounding` 존재 → 자동으로 `runLiquidGuard`(G-LIQUID 6규칙) 경로. 고형 A~H·PRE-SRC 미실행.

- 재실행 명령(로컬, DB 불요):
  ```bash
  cd apps/api-server
  npx tsx src/scripts/product-description-guard-cli.ts \
    --input ../../docs/checks/data/product-description-guard/hff-probiotics-liq-cp01.json --category hff
  ```
- **적재 게이트**: 6건 전량 `overallStatus=PASS` · `BLOCKED 0` 이어야 함(현재 확인값: PASS 6 / BLOCKED 0, exit 0). BLOCKED ≥1 이면 적재 중단.
- 회귀 근거: content-guard 162/162 PASS, 페어테스트 `__tests__/liquid-guard.test.ts` 21/21 PASS.

## 3. apply 스크립트 — b3 계약 재사용 + **액상 델타** (권한 세션 신규 생성)

기준 스크립트: [`hff-b3-store-canonical-apply.ts`](../../apps/api-server/src/scripts/hff-b3-store-canonical-apply.ts) (고형 226). 액상은 **동 계약을 재사용**하되 아래 델타만 반영한 thin 변형(`hff-liq-store-canonical-apply.ts`)이 필요하다. **본 WO 범위는 문서화까지** — 스크립트 신규 생성/실행은 권한 세션 소관.

### 3.1 그대로 재사용 (b3 계약 불변)

- **접속**: Cloud SQL Auth Proxy v2 — `./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" --port 5460 netureyoutube:asia-northeast3:o4o-platform-db` (run_in_background, `&` 없이). ready 로그 즉시 tsx 실행. DB 계정 = `.env` DB_USERNAME/PASSWORD/DB_NAME, host 127.0.0.1, **ssl:false**, `PROXY_PORT=5460`.
- **candidate 매칭축**: `product_candidates.raw_payload::jsonb->'source'->>'STTEMNT_NO'` = 6 statementNo, `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'`, `deleted_at IS NULL`.
- **사전조건(트랜잭션 내 가드, 위반 시 throw·롤백)**: `CANDIDATE_MISSING=0` · `CANDIDATE_AMBIGUOUS=0`(1:1) · `ALREADY_PROMOTED=0`(matched_product_master_id NULL) · `MASTER_EXISTS=0`(mfds_permit_number 부재).
- **write 3문(단일 트랜잭션, bulk unnest)**: ① `product_masters` INSERT(barcode NULL · regulatory_type='건강기능식품' · name=제품명 · manufacturer_name=제조사 · mfds_permit_number=STTEMNT_NO · is_mfds_verified=true · status='ACTIVE') ② `product_candidates` UPDATE(matched_product_master_id · candidate_status='approved_new_master') ③ `shared_product_descriptions` INSERT(content=`sanitizeDescriptionHtml(draft)` · source_type='o4o_hff_generated' · source_ref_id=candidate.id · status='canonical' · language∈{ko,en} · description_type='STORE').
- **트랜잭션 내 사후검증(불일치 시 자동 ROLLBACK+exit 2)**: masters=6 · spdKo=6 · spdEn=6 · canonicalDup=0(partial-unique (master_id,description_type,coalesce(language,'ko')) where canonical) · candidatesLinked=6.
- **멱등성**: `MASTER_EXISTS=0` 가드로 재실행 시 이미 적재분 자동 차단(throw).

### 3.2 액상 델타 (b3 대비 **반드시** 바꿔야 하는 지점)

| 항목 | b3(고형) | 액상 | 사유 |
|---|---|---|---|
| `TARGET` | 226 | **6** | 대상 수 |
| `loadTargets()` | prod-c-cp01..12 (12파일) | **hff-probiotics-liq-cp01.json (1파일 6건)** | 데이터 파일 |
| **가드A grounding 완전성 검사** | `if (!g.declaredCfu \|\| !g.serving \|\| !g.declaredAmount) missGround++` | **`if (!it.liquidGrounding \|\| it.liquidGrounding.cfu?.state!=='PARSED' \|\| !it.liquidGrounding.serving \|\| it.liquidGrounding.cfuBasis?.state!=='PARSED') missGround++`** | **선결 ② 핵심**: 액상은 solid `declaredAmount/declaredCfu` 가 스텁(null)이라 b3 가드A 를 그대로 두면 `missGround=6` 으로 GUARD_FAIL throw → 적재 불가. grounded 축을 `liquidGrounding` 로 교체해야 함. |
| env 게이트명 | `HFF_B3_CANONICAL_APPLY_CONFIRM` | **`HFF_LIQ_CANONICAL_APPLY_CONFIRM`** | 그룹 분리 |
| tags | `batch:probiotics-prod-003` | **`batch:probiotics-liquid-pilot`** | batch 분리 |
| 롤백 매니페스트 | `hff-b3-apply-rollback-manifest.json` | **`hff-liq-apply-rollback-manifest.json`** | 롤백 분리 |
| DATA 경로 | (오케스트레이터 세션 경로) | **`<repo>/docs/checks/data/product-description-guard`** | 클론 #1 canonical |

> **불변**: `runGuard` 는 액상 델타 없이도 `liquidGrounding` 을 보고 자동으로 액상 경로를 탄다(BLOCKED 0). 델타는 **apply 스크립트의 grounding-완전성 사전검사**에만 필요하다(가드 로직 자체는 이미 1.2.0 에서 액상 지원). SPD content 는 액상도 동일하게 `sanitizeDescriptionHtml(it.drafts.ko/en)` — 별도 처리 불요.

## 4. 프리로드 검사 (권한 세션, dry-run 이 자동 수행)

dry-run(=env 게이트 없이 실행)이 트랜잭션 내에서 아래를 SELECT 후 **롤백**(write 0). 통과해야 apply 진입:

1. `candidate 6 존재` — 6 statementNo 각 1건, source_label MFDS_HEALTH_FUNCTIONAL_FOOD, deleted_at NULL.
2. `1:1 (AMBIGUOUS 0)` · `미승격 (ALREADY_PROMOTED 0)`.
3. `MASTER_EXISTS 0` — 6 permit 중 `product_masters.mfds_permit_number` 부재.
4. `sanitize 비어있지 않음` — ko/en 각 6 sanitize 후 non-empty.
5. dry-run 산출: `scratchpad/hff-liq-apply-dryrun-plan.json` (planned: masters 6 / candidateLinks 6 / spdKo 6 / spdEn 6 / totalWrites 24).

> candidate 존재는 **DB read 필요** → 권한 세션에서만 확인. 파일풀 candidateId(`liq-cp01:...`)는 파일 내부 식별자이며 **매칭축은 statementNo**(위 6개)임에 유의.

## 5. dry-run · apply 명령 (권한 세션)

```bash
# 0) 프록시 기동 (run_in_background, ready 로그 확인)
./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
  --port 5460 netureyoutube:asia-northeast3:o4o-platform-db

# 1) dry-run (기본 — write 0, 트랜잭션 롤백)
cd apps/api-server
PROXY_PORT=5460 npx tsx src/scripts/hff-liq-store-canonical-apply.ts
#   기대: planned.totalWrites=24, masterDup=0, candMatch=6, BLOCKED 0

# 2) apply (env 이중게이트)
HFF_LIQ_CANONICAL_APPLY_CONFIRM=YES PROXY_PORT=5460 \
  npx tsx src/scripts/hff-liq-store-canonical-apply.ts --apply
#   기대: COMMIT, verify{masters:6, spdKo:6, spdEn:6, canonicalDup:0, candidatesLinked:6}
#         롤백 매니페스트 → scratchpad/hff-liq-apply-rollback-manifest.json
```

## 6. 독립 사후검증 (커밋 밖 새 연결)

apply 후 **별도 연결**로:

1. 신규 `product_masters` count=6 · `barcode IS NULL`=6 · `regulatory_type='건강기능식품'`=6 · `mfds_permit_number` = 6 permit.
2. `product_candidates` `candidate_status='approved_new_master'`(6 master 링크)=6.
3. `shared_product_descriptions` STORE canonical `source_type='o4o_hff_generated'` ko=6 · en=6 · canonicalDup=0.
4. 신고번호 유일=6 · 실제 write=24.
5. **고형 294 및 Batch001/002 master/canonical 무변경** · 액상이 고형 큐에 유입되지 않았음.
6. 롤백 매니페스트 보존.

**실패 시**: 트랜잭션 내 자동 ROLLBACK(사후검증 불일치) 또는 롤백 매니페스트 수동 복원 → `PAUSED_COMMON_DEFECT` 보고.

## 7. 롤백 절차 (독립)

`scratchpad/hff-liq-apply-rollback-manifest.json` (`createdMasters[6]` · `createdSpd[12]` · `candIds[6]` · `snapshot[prev_status]` · `outcomes[]`) 기준, 역순:

1. `shared_product_descriptions` DELETE WHERE id = ANY(createdSpd) — 12행.
2. `product_masters` DELETE WHERE id = ANY(createdMasters) — 6행.
3. `product_candidates` UPDATE candidate_status = snapshot.prev_status, matched_product_master_id=NULL WHERE id = ANY(candIds) — 6행.

→ 고형 294 큐·기존 LIVE에 영향 없음(액상 master/candidate/SPD 만 대상).

## 8. 후속 선결 (본 WO 밖)

- **선결 ②**(§3.2 가드A 델타)를 반영한 `hff-liq-store-canonical-apply.ts` **신규 생성** = 권한 세션/후속 WO. 본 런북이 델타를 명시하므로 즉시 착수 가능.
- 액상 적재는 고형 294 적재와 **독립·병렬 가능**(교집합 0). 순서 무관.

## 9. 산출 파일

- 본 런북.
- 고정 매니페스트(기존): `LIQUID-PILOT-MANIFEST.json` (PASS 6, verdict·write24 근거).
- 데이터: `hff-probiotics-liq-cp01.json`.
- 파일럿 CHECK(기존): `CHECK-O4O-HFF-PROBIOTICS-LIQUID-MODEL-PILOT-6-V1.md`.
