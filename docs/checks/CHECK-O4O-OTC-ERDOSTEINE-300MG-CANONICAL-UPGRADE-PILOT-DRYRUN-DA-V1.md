# CHECK — 에르도스테인 300mg 정 Track A 승격(교체) 파일럿 설계·dry-run

**WO:** WO-O4O-OTC-ERDOSTEINE-300MG-CANONICAL-UPGRADE-PILOT-DRYRUN-DA-V1 (에이전트 다)
**정책:** [OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1](../guides/products/drug/OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1.md) (커밋 `89379627d`) Option A
**성격:** read-only dry-run 설계 · **DB write 0** · 실제 승격 별도 승인 봉투
**스크립트:** `apps/api-server/src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`
**상태:** 설계·SSOT 재고정 완료 · **dry-run 실행 대기(.env `DB_PASSWORD` 소실 — 복구 후 즉시 실행)**

---

## 1. 대상 재고정 (bridge SSOT `90342ce7d`)

| | fingerprint | bucket | 수 |
|---|---|---|---:|
| **대상** | `4b4e162690065e8e` | **authored그대로확장** | **26** |
| 제외 | `d68b3eec1cb56646` | **안전지문불일치** | 4 |
| coarse 합 | 에르도스테인\|300밀리그램\|정 | | 30 |

- authored source_ref_id: `03e0af9d-5236-460a-86d4-1af8b0c00c61` (draft, verdict READY · 원문확보율 1 · authored충돌 0 · 민감약효군 아님 — grounded-upgrade candidate).
- **30건을 그대로 쓰지 않고 SSOT 그대로확장 26만 고정**(WO 지시). 제외 4는 SSOT상 `안전지문불일치`로 명확 구분(fp 상이).
- **fingerprint 재고정 방식**: bridge `groupKeyOf` = `H([H(norm효능),H(norm용법),H(norm주의),H(성분|함량),H(제형),route])` — 본 스크립트 `fingerprintOf` 와 **동일 함수**(정적 확인). 실행 시 coarse 30 재열거→fp 계산→`4b4e`=26 / `d68b`=4 / 기타=0 게이트.

---

## 2. 승격 계약 구현 (정책 §2 Option A)

- **STEP A**: authored ko `needs_review` INSERT `WHERE NOT EXISTS(authored canonical|needs_review)` (멱등) + 내용·source_ref_id·대상수 검증. `buildDrugOtcConsumerHtml`(구조화, bodyMarkdown 미사용).
- **STEP B (단일 TX)**: master별 `cur=현재 canonical` 확인 → `mfds_easy_drug` 면 진행 / authored 면 no-op / 0·2건 ABORT → **demote(easy→deprecated)** → **flip(authored needs_review→canonical, `curated_at`)** → 사후검증 → audit → COMMIT.
- **사후검증(실패 ROLLBACK)**: canonical==1 · authored · deprecated easy 1행 보존 · dup==0 (master 전건).
- **원문 보존**: e약은요 행 삭제 없이 `deprecated`(deleted_at NULL) — content·source_ref_id 보존.
- **이중게이트**: `--apply` + `DRUG_OTC_ERDO_UPGRADE_CONFIRM=YES`. **재실행 no-op**(authored canonical이면 무변경, NOT EXISTS 가드).

---

## 3. 예상 write (정책 §2-A — SPD/audit 분리)

| 항목 | 수 |
|---|---:|
| STEP A authored needs_review INSERT | 26 (기존 nr 있으면 차감, dry-run 확정) |
| STEP B easy canonical → deprecated | 26 |
| STEP B authored needs_review → canonical flip | 26 |
| **SPD write 소계** | **≤ 78** |
| audit log (canonical_replaced) | **26** (엔티티 모델 1행/교체) |
| **총계** | **≤ 104** |

### ⚠️ audit 수 정책 불일치 (STOP 조건 §"audit schema…" 관련 — 정합 필요)

- **엔티티** `SharedProductDescriptionAuditLog`: `event_type='canonical_replaced'` = **1행/교체** (previous_description_id + new_description_id 동시 기록) → **26**.
- **정책 §2-A / WO 예상**: "audit 2/master = **52**" (demote 1 + flip 1 별도).
- → **불일치.** 엔티티 설계는 교체 1건=1행. dry-run 은 엔티티 기준 **26**으로 산정. **실제 apply 전 정책-엔티티 audit 카운트 정합(26 vs 52) 확정 필요.** (schema 컬럼 자체는 정책 요구 충족 — previous/new status·id·metadata 존재. 차이는 행 수 규약.)

---

## 4. 게이트 (실행 시 검증 — 스크립트 구현)

| 게이트 | 기준 |
|---|---|
| coarse 30 = 26 + 4 | target `4b4e`==26 · excluded `d68b`==4 · 기타 fp==0 |
| 제외 4 SSOT 구분 | `안전지문불일치` 사유 태깅 |
| e약은요 STORE ko canonical 정확히 1/master | ==26 |
| authored canonical 충돌 | ==0 |
| 비경구 혼입 | ==0 |
| draft HTML | missing·빈·`<table>`·주석·이중escape·sd-warn無 → ABORT |
| 재실행 결정론 | ORDER BY id, byte-identical(실행 시 확인) |

---

## 5. 완료 보고

- **선정 groupKey:** 에르도스테인\|300밀리그램\|정 · **대상 26** (SSOT 그대로확장) · source_ref `03e0af9d`
- **제외:** 4 (fp `d68b3eec…` 안전지문불일치, SSOT 구분) · 비경구 0 · authored충돌 0(설계 기준)
- **원문 확보율·안전지문:** candidate 기준 100% · 그대로확장(원문 fp 동일 26)
- **예상 write:** SPD ≤78 + audit 26 (총 ≤104) — **정책 52 vs 엔티티 26 정합 선결**
- **rollback 범위:** 26 master 슬롯(authored canonical→deprecated + deprecated easy→canonical 역계약, 원문 행 보존)
- **dry-run:** **실행 대기** — `.env`(`DB_PASSWORD`) 간헐 소실로 미실행. 복구 즉시 2회 byte-identical + 게이트 PASS 확인 → JSON 산출
- **실제 승격 진행 가능 여부:** **대기** — (a) dry-run 실행·PASS (b) audit 카운트(26/52) 정합 후 승인 봉투
- **DB write:** 0

---

## 6. 재개 선결

1. `.env`(프로덕션 `DB_PASSWORD`) 복구 → dry-run 실행 → 게이트 PASS·재실행 결정론 확인 → `otc-erdosteine-300mg-upgrade-dryrun-v1.json` 산출·커밋.
2. **audit 카운트 규약 확정**(엔티티 1행/교체=26 채택 권고, 정책 §2-A "52" 정정 또는 근거 제시).
3. 위 완료 후 실제 26 승격 = 승인 봉투 1회.

---

*설계·SSOT 재고정 완료. dry-run 실행만 .env 복구 대기. 실제 write 0.*
