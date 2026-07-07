# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-APPLY-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-APPLY-V1
- 일자: 2026-07-07
- 모드: **DRY-RUN** (승인 토큰 부재 → DB write 0)
- 선행: REVIEW-CANONICAL-PREP CHECK 커밋 완료 (`455892206`, `docs: add OTC nutrition combo canonical review prep check`)

## 0. 승인 토큰 판정 → apply 미수행

| 토큰 | 요구 | 관측 | 결과 |
|------|------|------|------|
| `--apply` | 필요 | 없음 | ❌ |
| `DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES` | 필요 | 없음 | ❌ |

WO 규정("토큰이 없으면 dry-run까지만 수행")에 따라 **DB write 0**. canonical 승격 INSERT/UPDATE 미수행. 아래는 승격 시 발생할 스코프의 read-only 산출이다.

---

## 1. 대상 candidate 재조회 (read-only)

- 필터: `seed_json->>'applyRunId' = 'otc-nutrition-combo-draft-v1'` AND `review_status='needs_review'`
- run 전체: **23건** / pass **20건** / excluded **3건**

### 1-1. 무결성 검사

| 검사 | 결과 |
|------|:----:|
| candidate_id 중복 (run 내) | **0** (중복 없음) |
| candidate 당 활성 draft 수 (전 run) | **모두 1** (double-promote 위험 없음) |
| excluded 3건 pass 목록 포함 여부 | **미포함** (정상) |

### 1-2. excluded 3건 확정

| CHECK # | candidate_id | groupKey | 제외 사유 |
|:-:|-----|----------|-----------|
| #1 | `a3c46e34…` | `drug_otc::single::oral::a12cc::5mg::tablet` | strengthToken 5mg 이상치 (revise) |
| #12 | `1eb608e0…` | `drug_otc::combo::oral::a11db::Bcomplex::tablet` | subgroup_pending / 효능범위 초과 (hold) |
| #14 | `d5265213…` | `drug_otc::combo::oral::a11ex::noA-noFe::tablet` | #13과 제목 충돌 (revise) |

→ 3건 모두 승격 대상에서 제외됨을 SQL로 확인.

---

## 2. 승격 스코프 (declared groupScope 기준, read-only)

각 pass draft는 자기 그룹의 `groupScope`(masterTotal/otc/spdMasters)를 seed 단계에서 보유. group 축은 `(atc7, 조성, 제형)` 이며 master는 조성·제형이 각 1개이므로 그룹 간 분리(disjoint).

| 지표 | 합계 |
|------|-----:|
| pass 그룹 수 | 20 |
| target master (masterTotal 합) | **3,388** |
| 그 중 OTC | **3,388** (전부 OTC) |
| 기존 SPD 보유 master (spdMasters 합) | **1,708** |
| 설명 전무 master (추정 = 3,388 − 1,708) | **≈1,680** |

### 그룹별 스코프 (masterTotal 내림차순)

| title | masterTotal | otc | spdMasters(기존) |
|-------|-----:|-----:|-----:|
| 종합비타민·미네랄 연질캡슐 — E·B군 + Mg·아연 (A·철없음) | 769 | 769 | 277 |
| 종합비타민 정제 — B군·C·D·E + 아연 (A·철없음) **#13** | 709 | 709 | 407 |
| 칼슘·비타민 D 정제 | 598 | 598 | 302 |
| 종합비타민·미네랄 정제 — D·E·B군·C + 아연 (A·철없음) | 320 | 320 | 117 |
| 비타민 D·E·C 복합 정제 | 259 | 259 | 160 |
| 종합비타민 연질캡슐 — E·B군 + Mg (A·철없음) | 240 | 240 | 76 |
| 종합비타민 연질캡슐 — A·B군·C·E (철없음) | 118 | 118 | 118 |
| 마그네슘·비타민 B2·B6 액제 | 101 | 101 | 77 |
| 비타민 B1·B2·B6·C 복합 정제 | 95 | 95 | 49 |
| 비타민 C 1000mg 정제 | 31 | 31 | 11 |
| 비오틴 5mg 정제 — 손발톱·모발 | 30 | 30 | 28 |
| 종합비타민 연질캡슐 — A·E·B군·C (철없음) | 29 | 29 | 29 |
| 마그네슘·비타민 B6 정제 470mg급 | 21 | 21 | 5 |
| 비타민 E 1000 IU 연질캡슐 | 20 | 20 | 14 |
| 종합비타민 정제 — A·B군·C·D·E (철없음) | 20 | 20 | 20 |
| 비타민 E 400 IU 연질캡슐 | 9 | 9 | 2 |
| 비타민 E 100 IU 연질캡슐 | 8 | 8 | 5 |
| 종합비타민 정제 — A·D·B군 (철없음) | 4 | 4 | 4 |
| 마그네슘·비타민 B6 정제 940mg급 | 4 | 4 | 4 |
| 마그네슘·비타민 B6 정제 290mg급 | 3 | 3 | 3 |

> `spdMasters`는 그룹 내 master 중 **어떤 형태로든 SPD를 이미 보유**한 수(대부분 e약은요 canonical). 승격 정책상 이 기존 SPD/canonical은 **보존** 대상이다(§4).

---

## 3. #13 / #14 제목 충돌 — 승격 안전성 판정

- #13(`26c2af33`, A11JC, noA-noFe, tablet) = **pass → 승격 포함**
- #14(`d5265213`, A11EX, noA-noFe, tablet) = **revise → 승격 제외**
- 두 그룹은 **atc7 상이(A11JC vs A11EX)** → master 집합 disjoint → #13 승격이 #14의 master를 건드리지 않음.
- 따라서 #13 단독 승격은 **master-level 안전**. 남는 이슈는 draft 목록의 동일 제목 표시뿐이며, #14는 미승격 상태이므로 SPD/canonical 층에는 동일 제목 1건만 존재.
- 후속: #14 처리(제목 분리 or #13 병합)는 별도 WO. 본 apply는 #13 포함으로 진행 가능.

---

## 4. apply 실행 전 해소 필요 blocker (실 승격 차단 요인)

> 아래 3가지가 해소되고 승인 토큰 2종이 부여될 때 실제 apply가 가능하다.

1. **승인 토큰 부재** — `--apply` + `DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES` 미제공.
2. **promotion(draft→SPD) apply 스크립트 부재(run 전용)** — 기존 `drug-otc-combo-description-draft-apply.ts`는 **draft 생성**용(runId `otc-combo-draft-v1`)이고, `drug-otc-description-promotion-dryrun.ts`는 단일그룹(ingredient/strength/form 파싱)용 read-only dry-run이다. `otc-nutrition-combo-draft-v1`의 조성·제형 granular 그룹을 SPD로 전개·삽입하는 apply 경로는 아직 없음 → 별도 구현 필요.
3. **삽입 status 정책 미확정** — 대상 23건 guard verdict가 전부 `INSERT_nutrition_review`. 표시 경로는 `(master_id, status='canonical')`만 노출하고 `needs_review`는 비노출(안전). 검수 통과(pass) 20건을 (a) `needs_review` SPD로 넣고 후속 canonicalize할지, (b) canonical 부재 master에 한해 바로 `canonical`로 넣을지 **정책 결정 필요**. 어느 쪽이든 기존 canonical(§2의 1,708 보존축) UPDATE 금지 — master 당 canonical 1개 partial-unique 계약 준수.

---

## 5. 금지사항 준수 (본 dry-run)

- [x] 제외 3건 미승격 (SQL 확인)
- [x] content_json / seed_json 미수정
- [x] shared_product_descriptions 미변경 (INSERT/UPDATE 0)
- [x] ProductMaster / ProductIdentifier 미변경
- [x] 매장/QR/POP/태블릿 연결 없음, 노출 경로 연결 없음
- [x] DB write **0**

---

## 6. 완료 기준 대비

| 완료 기준 | 상태 |
|-----------|------|
| 승격 대상 20건 재확인 | ✅ (candidate_id·groupKey 확정) |
| excluded 3건 미승격 확인 | ✅ (SQL) |
| canonical 신규/갱신 수량 검증 | ⏸ dry-run — 실 삽입은 apply 스크립트+토큰 필요 (declared target 3,388 / 기존 SPD 1,708 산출) |
| 기존 canonical 충돌 0 or 처리 내역 | ✅ 보존 정책 명시(§4-3), #13/#14 master disjoint(§3) |
| DB write 범위 제한 | ✅ write 0 |
| post-apply CHECK 작성 | ✅ 본 문서(dry-run 결과) |

## 7. 다음 단계

1. **정책 결정**: pass 20건 삽입 status(§4-3, needs_review→canonicalize vs 조건부 canonical).
2. **apply 스크립트 구현**: `otc-nutrition-combo-draft-v1` 전용 promotion(draft→SPD, 조성·제형 granular 전개, 기존 canonical 보존).
3. 승인 토큰 2종 부여 후 단일 트랜잭션 apply + post-count 검증 → 본 CHECK에 apply 결과 append.
4. #14/#13 제목 충돌 해소(별도 WO).
