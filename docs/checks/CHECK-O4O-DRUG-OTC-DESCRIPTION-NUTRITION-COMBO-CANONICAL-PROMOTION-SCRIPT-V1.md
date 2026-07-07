# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-SCRIPT-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-SCRIPT-V1
- 일자: 2026-07-07
- 모드: **스크립트 구현 + DRY-RUN** (승인 토큰 미부여 → DB write 0)
- 선행: REVIEW-PREP CHECK `455892206` / CANONICAL-APPLY-V1 dry-run
- 산출물: `apps/api-server/src/scripts/drug-otc-nutrition-combo-canonical-promotion.ts`

## 0. 정책 반영 (사용자 확정)
- pass 20건은 검수 완료 → 신규 SPD 는 `status='canonical'` INSERT (needs_review 중간 적재 없음).
- canonical 부재 master 에만 신규 INSERT / 기존 canonical 보존(UPDATE 금지) / master 당 canonical 1개.
- excluded 3건 완전 제외.

---

## 1. 스크립트 설계 요지

| 요소 | 구현 |
|------|------|
| 대상 | `PASS_CANDIDATE_IDS` 20 (REVIEW-PREP §5 SSOT) — run+needs_review+not-excluded 재조회, 20건 아니면 abort |
| 제외 | `EXCLUDED_CANDIDATE_IDS` 3 — pass 목록과 교집합 시 abort |
| **Enumeration 안전 게이트** | 그룹별 master 를 **재현 가능한 축(atc7 + name-parsed doseForm)** 으로 전개 → 재현 수가 `seed_json.groupScope.masterTotal` 과 **정확히 일치**하면 ELIGIBLE, 아니면 `ENUM_MISMATCH` 로 차단 |
| 신규 INSERT | ELIGIBLE 그룹의 master 중 **canonical 부재** 만 `status='canonical'` INSERT |
| source_type | `mfds_easy_drug` (entity union 기존값 — 신규 enum 불필요, 파생 출처 동일) + `source_ref_id=draft candidate_id`(추적) |
| DB write 게이트 | `--apply` **AND** `DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES` 둘 다 있을 때만. 그 외 dry-run |
| 재실행 안전 | INSERT 는 `NOT EXISTS(canonical)` 조건 → 재실행 시 이미 canonical 존재로 자동 no-op. `alreadyApplied`(source_ref 기준) 별도 계측 |

### 게이트의 정당성 (집합 동일성 증명)
그룹키는 `drug_otc::…::{atc7}::{조성}::{form}` 이므로 **그룹 ⊆ (atc7, form)** 이 항상 성립한다.
재현 집합 = "(atc7, form) 의 otc master 전체". 따라서 `|재현| == masterTotal(=|그룹|)` 이면
부분집합이면서 크기가 같으므로 **그룹 = 재현 집합** 이 증명된다(휴리스틱이 아님).
→ ELIGIBLE 그룹은 틀린 master 에 붙을 수 없다.

---

## 2. DRY-RUN 결과

```
passTargets 20 / excludedEnforced 3
ELIGIBLE 4 / ENUM_MISMATCH 16
expectedNewCanonicalInsert 523 / dbWrite 0
```

### 2-1. ELIGIBLE 4그룹 (승격 가능 — 집합 동일성 증명됨)

| title | atc7/form | declared=reproduced | 기존 canonical(보존) | 신규 canonical INSERT |
|-------|-----------|:---:|:---:|:---:|
| 비오틴 5mg 정제 — 손발톱·모발 | A11HA05/tablet | 30 | 22 | **8** |
| 칼슘·비타민 D 정제 | A12AX/tablet | 598 | 281 | **317** |
| 비타민 D·E·C 복합 정제 | A11JA/tablet | 259 | 121 | **138** |
| 비타민 B1·B2·B6·C 복합 정제 | A11EB/tablet | 95 | 35 | **60** |
| **합계** | | **982** | **459** | **523** |

→ 승격 시 신규 canonical 523 INSERT, 기존 canonical 459 보존(UPDATE 0).

### 2-2. ENUM_MISMATCH 16그룹 (차단 — 멤버십 미저장)

재현 축(atc7+form)이 그룹보다 넓어 정확 집합 재현 불가. 두 원인:

- **강도밴드 세분** (같은 atc7·form 내 함량 밴드로 분할): 비타민 C 1000mg(31 vs 51), 비타민 E 100/400/1000 IU(8·9·20 vs 37), Mg·B6 290/470/940mg급(3·4·21 vs 32), Mg·B2·B6 액제(101 vs 115).
- **조성 세분** (같은 atc7·form 내 비타민A/철 유무·성분조합으로 분할): A11JC tablet(20·709 vs 760), A11JC soft_capsule(118·769 vs 887), A11EX tablet(4 vs 365), A11JB tablet(320 vs 351), A11JB soft_capsule(29·240 vs 269).

이들은 **draft 생성 시 조성/강도 분류로 산출된 masterTotal 을 재현할 축이 커밋 코드·저장 데이터에 없다**(seed_json 에 master ID 미보존, active_ingredients 비-UTF8 손상, dosage_form 컬럼 NULL). 게이트가 정상적으로 차단.

---

## 3. 실제 apply 전 잔여 blocker

1. **승인 토큰 2종** (`--apply` + `…_CONFIRM=YES`) — 후속 apply WO 에서 부여.
2. **16 MISMATCH 그룹의 master↔그룹 멤버십 미저장** — 가장 큰 blocker. 해소안(택1):
   - (a) nutrition draft 생성 로직을 재실행하여 그룹별 **master ID 목록을 seed_json 에 persist** (권장, 재현 가능·검증 가능).
   - (b) 강도밴드·조성 분류기를 커밋 + active_ingredients 인코딩 복구 후 스크립트가 재현.
   → 멤버십이 persist 되면 스크립트의 enumeration 축을 "저장된 master ID"로 교체해 16그룹도 게이트 통과 가능.
3. **content 포맷** — SPD.content 는 HTML 계약이나 draft `content_html`은 null → 현재 스크립트는 `bodyMarkdown`(마크다운)으로 폴백. 실제 apply 전 markdown→HTML 렌더 여부 결정 필요.

---

## 4. 금지사항 준수 (본 WO)

- [x] 실제 DB write 0 (dry-run)
- [x] shared_product_descriptions INSERT/UPDATE 0
- [x] 기존 canonical UPDATE 경로 없음 (INSERT-only, NOT EXISTS 가드)
- [x] excluded 3건 미포함 (스크립트 abort 가드 + dry-run 확인)
- [x] ProductMaster/ProductIdentifier 미변경
- [x] draft content_json/seed_json 미변경
- [x] 매장/QR/POP/태블릿 연결 없음

## 5. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| nutrition combo 전용 promotion apply 스크립트 작성 | ✅ `drug-otc-nutrition-combo-canonical-promotion.ts` |
| pass 20 groupScope 기준 target master 전개 | ✅ (게이트 검증 포함) |
| 기존 canonical 보유 master 제외 | ✅ (NOT EXISTS canonical) |
| canonical 없는 master 에만 신규 INSERT 준비 | ✅ |
| candidate/source/groupKey 추적 메타 보존 | ✅ (source_ref_id=candidate_id, source_type) |
| dry-run 예상 insert 수 산출 | ✅ 523 (ELIGIBLE 4그룹) |
| 중복·충돌·excluded 검증 | ✅ (pass 20 정확 조회, excluded 3 제외, 재실행 no-op 설계) |
| 재실행 abort/no-op 안전장치 | ✅ (NOT EXISTS + 토큰 게이트 + 20건/excluded abort) |
| DB write 0 | ✅ |

## 6. 예상 스코프 재산출 (CANONICAL-APPLY-V1 추정 대비)

- 이전 추정: target 3,388 / 기존 SPD 1,708 / 신규 canonical 약 1,680 (**전 20그룹 가정**).
- 본 스크립트 dry-run 실측: **현재 안전 승격 가능 = 4그룹 / 신규 523**. 나머지 16그룹(≈나머지 인서트)은 멤버십 persist 전까지 **차단**.
- 즉 "약 1,680"은 멤버십 재현이 전제였고, 재현 불가로 인해 **즉시 승격 가능분은 523으로 축소**됨. 전량 승격은 §3-2 해소 후 가능.

## 7. 다음 단계

1. (권장) **멤버십 persist 선행 WO** — nutrition plan 재실행으로 그룹별 master ID 저장 → 16그룹 잠금 해제.
2. content markdown→HTML 정책 결정(§3-3).
3. 승인 토큰 부여 후 apply WO: 우선 ELIGIBLE 4그룹(523) 승격 가능, 멤버십 persist 후 전량.
4. #14/#13 제목 충돌 별도 처리.
