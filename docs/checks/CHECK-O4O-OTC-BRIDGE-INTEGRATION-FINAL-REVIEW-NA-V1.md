# CHECK-O4O-OTC-BRIDGE-INTEGRATION-FINAL-REVIEW-NA-V1 — bridge 통합 결과 검토 (에이전트 나)

WO: `WO-O4O-OTC-BRIDGE-INTEGRATION-RESULT-REVIEW-NA-V1` · 일자: 2026-07-18 · 성격: **read-only 검토** (코드·DB·재실행 0)
검토 대상: 에이전트 가 최종 산출물 커밋 **`350aefb8b`** (정본 스크립트 `f2c819451` 실행)
검토 산출물: 본 문서 1개. 스크립트·JSON·conflict 기준 **무변경**.

> **검토 결론: 최종 게이트 PASS (byte-determinism 1항목만 부분 — 수치 무영향). 확정 수치 사용 가능, 1차 apply 진행 가능.**

---

## 0. 검토 범위·원칙 준수

- ✅ 코드 오류 없음 → **스크립트 미수정**. conflict 기준(full-content=12) **미변경**. **DB 재실행 안 함**. 타 에이전트 apply **미개입**.
- 검토는 GA 산출물(`otc-full-corpus-authored-bridge-{summary,groups,exceptions}-v1.json` + `CHECK-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1.md`) 정적 분석 + 내부 정합 재계산으로 수행.

---

## 1. 게이트 재검증

| 게이트 | 기준 | 실측 | 판정 | 근거 |
|---|---|---|:--:|---|
| grounded distinct | 19,131 | **19,131** | ✅ | `integrity_grounded_no_dup=true`, `gate_grounded_19131=true` |
| grounded 누락·중복 | 0 | **0** | ✅ | masterPartition 합 = 19,131 = grounded_distinct (아래 §3) |
| authored distinct + drift 설명 | 3,128 + 설명 | **3,149** (+21) | ✅ | drift +21 = 알파칼시돌 ko canonical **승격**(직전 WO, `created_at` 신규 0·status 전환) → superset, **손실 0**(`authored_no_loss=true`) |
| full-content conflict 12 전부 자동 제외 | 12 | **12 / 193그룹 全 검토후확장, leak 0** | ✅ | exceptions `authoredConflictKeys`=12, 해당 pharmKey 그룹 193개 전부 `bucket=검토후확장`, 타 버킷 유출 **0** (§4) |
| safety-conflict | 6 | **6** | ✅ | `authored_safety_conflict_groups=6` (12 부분집합) |
| grounded 그룹 | 6,216→정본 | **6,261** (+45) | ✅ | baseline 6,216=shard-merge 근사, 정본=단일패스 재계산. group 합=6,261, group-masters=19,131 (§3) |
| 재실행 byte-identical | byte-identical | **summary ✅ byte-identical(4회 md5 `16742508…`) / groups·exceptions ◑ content-identical(요소순서만 변동)** | ◑ | §5 |
| DB write | 0 | **0** | ✅ | `dbWrite=0` |

> **종합 PASS.** 유일한 부분항목은 byte-determinism(§5) — **수치·판정·집계에 영향 없음**(요소 나열 순서만). 나머지 전 게이트 완전 통과.

---

## 2. 스크립트 ↔ 산출물 생성 기준 동일성

- 산출물 커밋 `350aefb8b` 메시지 = "f2c819451 실행". 산출물 gate 특징이 **f2c819451 고유**(full-content `conflict=12` · 드리프트 게이트 필드 `authored_drift`/`groups_drift` · 배치 read)와 일치. 폐기본 `686d795fa`였다면 `conflict=6`·구 게이트 구조 → **불일치**였을 것. 즉 **산출물은 정본 f2c819451 산출로 확증**.
- `summary.wo = WO-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1`, `inputs.grounded_commit=0aa64a0ef`, `authored_commit=d7b3017ad` 로 입력 계보 명시.
- ⚠️ **경미(비차단)**: summary 에 실행 **스크립트 커밋 SHA**가 임베드되어 있지 않음(입력 커밋만). 커밋 메시지·gate 특징으로 추적 가능하나, 향후 스크립트에 `scriptCommit` 필드 1줄이면 완전 자기증명(권고, 이번 미수정).

---

## 3. 구획 합계 정합 (재계산)

| 구획 | master | 그룹 |
|---|---:|---:|
| authored 그대로확장 | 1,201 | 157 |
| 검토후확장 | 1,182 | 193 |
| 안전지문 불일치 | 1,424 | 410 |
| 새설명서 필요 | 9,101 | 2,882 |
| 비경구 별도트랙 | 6,223 | 2,619 |
| **합** | **19,131** ✅ | **6,261** ✅ |

- master 합 = 19,131 = grounded_distinct → **누락·중복 0 실증**.
- group 합 = 6,261 = grounded_groups_recomputed, group-masters 합 = 19,131 → 그룹↔마스터 정합 ✅.
- 재사용 가능 grounded = 그대로확장 1,201 + 검토후확장 1,182 = **2,383** (required 일치).
- 무성분명 7,301 ATC bridge: 그대로확장 295 / 검토후확장 314 / 안전불일치 418 / 새설명서 6,274 (합 7,301 ✅, ATC코드없음 0).
- 커버리지: 대표설명서 134개, top10 56% · top50 86.4% · top100 96.7% (총 apply 대상 2,383).

---

## 4. 안전조건 — 충돌 12 자동 확장 제외 실증

- exceptions `authoredConflictKeys` = **12** (norm_full 기준, authored audit 계승).
- 이 12 pharmKey 에 해당하는 grounded fingerprint 그룹 = **193개** (1 pharmKey → 다(多) 그룹: 동일 pharmKey, content 상이 → 별 fingerprint).
- **193개 전부 `bucket=검토후확장`**, `authored그대로확장`·`안전지문불일치` 등 **타 버킷 유출 0**.
- 근거: `classify()` 가 `authoredConflict.has(pharmKey)` 를 안전지문 대조 **이전에** 검토후확장으로 라우팅 → 구조적으로 충돌키의 자동(그대로) 확장 불가. 정적 교차검증에서도 leak 0 확인.
- 예: 에르도스테인·아세틸시스테인·세티리진·A11JC(비타민류) 등 총량 상위 대표가 authored 충돌 → **전부 review 트랙**. 1차 배치에서 자동 제외됨.

---

## 5. 재실행 결정론 판정

| 파일 | 판정 | 비고 |
|---|---|---|
| summary-v1.json | **byte-identical** ✅ | GA 4회 실행 md5 `16742508…` 동일 — **수치·집계·판정 완전 재현** |
| groups-v1.json | content-identical ◑ | fingerprint set·정렬 내용 동일, **요소 나열 순서만** 실행마다 변동 |
| exceptions-v1.json | content-identical ◑ | 하위 배열 set 동일, **요소 순서만** 변동 |

**원인**: grounded/authored DB read 에 `ORDER BY` 부재 → Postgres row 순서 실행마다 가변 → (a) 동률 그룹 정렬 순서, (b) 샘플 배열 요소 순서, (c) `dominantSafetyOf` 동률 시 tiebreak 이 iteration 순서 의존. **집계 수치는 불변**(동률 dominant 선택이 바뀌어도 카운트 합은 동일; summary byte-identical 4회가 이를 실증).

**판정**: "엄밀 byte-identical" 기준으로 groups/exceptions 는 **부분**(content-identical). **수치 신뢰도에는 영향 없음** — apply 판단은 summary/집계 기반이므로 진행 가능.

**최소 수정안 (권고 · 이번 미실행 — 경계 준수)**: 정본 스크립트(에이전트 나 소유)에 stable tiebreaker 반영 시 3개 파일 모두 byte-identical 가능.
1. `groundedMeta` 쿼리에 `ORDER BY pm.id` (+ authored 쿼리에 `ORDER BY master_id, source_type`).
2. `dominantSafetyOf`: `sort((a,b)=> b[1]-a[1] || (a[0]<b[0]?-1:1))` (동률 시 safety 문자열 오름차순 고정).
3. `groupList`/`applyList` 정렬에 2차 키: `... || (a.fingerprint<b.fingerprint?-1:1)` / `|| a.pharmKey.localeCompare(b.pharmKey)`.
> 이는 **코드 오류가 아니라 robustness 개선**(수치 무영향)이므로 이번 검토에서 스크립트 미수정. 반영이 필요하면 **소유 세션(에이전트 나)** 이 별도 최소 WO 로 수행하고, 실제 재생성은 인증 환경(에이전트 가)에서 진행.

---

## 6. 확정 사용 가능 수치 vs 폐기 수치

### ✅ 확정 (apply/후속 근거로 사용 가능) — 정본 f2c819451 / `350aefb8b`
- grounded **19,131** · authored **3,149**(baseline 3,128 +21) · 그룹 **6,261**.
- 구획: 그대로확장 **1,201**/157 · 검토후확장 **1,182**/193 · 안전불일치 **1,424**/410 · 새설명서 **9,101**/2,882 · 비경구 **6,223**/2,619.
- 재사용 가능 grounded **2,383** · 무성분명 ATC bridge(대상 7,301: 그대로 295·검토후 314·불일치 418·새 6,274).
- 커버리지 top10 56% / top50 86.4% / top100 96.7% (대표 134).
- **1차 대량 apply 후보 = authored 그대로확장 157 그룹 / 1,201 제품** (무충돌 + grounded 안전 대표프로파일).

### ⛔ 폐기 (참고값 — 최종 아님)
- 폐기본 `686d795fa`(conflict=6/section-based) 및 그 중간 실행 수치: 재사용 2,102 · 그대로확장 1,243 · 검토후확장 859 · 안전불일치 1,705 · top100 96.2%. **정본 conflict=12 로 대체됨 — 사용 금지.**

### ⚠️ 사용 주의
- **검토후확장 1,182 은 "확장 가능 후보"이지 자동 apply 대상 아님** (full-content 충돌 12 포함 → 사람 검토 필수).
- groups/exceptions 의 **요소 나열 순서에 의존 금지**(§5) — set/key 기반 접근만.
- 커버리지·bridge grounded 매칭은 pharmKey(성분/ATC) 파생 — apply 시 **안전지문 재검증(이중 게이트)** 필수.

---

## 7. 후속 apply 진행 가능 여부

**가능.** 단, 트랙 분리:
- **1차 배치(진행 가능)**: authored 그대로확장 **157 그룹 / 1,201 제품**. 별도 apply WO 로 — 이중 게이트 · 단일 TX · 멱등 · ko↔en 정합 · **안전지문 재검증** 설계.
- **후속(사람 검토 후)**: 검토후확장 1,182(충돌 12 포함) → 대표 선정·안전 대조 후 / 안전불일치 1,424 → 하위 그룹 분리 후. **충돌 12 자동 확장 금지 원칙 유지.**
- **재사용 범위 밖**: 새설명서 9,101(신규 authoring) · 비경구 6,223(별도 트랙).

> apply 스크립트 작성·실행은 **에이전트 가/소유 세션 소관**. 본 검토는 read-only.

---

## 8. 완료 보고

```text
WO-O4O-OTC-BRIDGE-INTEGRATION-RESULT-REVIEW-NA-V1 완료 (read-only 검토)

- 최종 게이트: PASS
  · grounded 19,131 ✅ / 누락·중복 0 ✅
  · authored 3,149 (baseline 3,128 +21 알파칼시돌 승격, 손실 0) ✅
  · full-content conflict 12 → 193그룹 전부 검토후확장, leak 0 ✅
  · summary byte-identical(4회) ✅ / groups·exceptions content-identical(요소순서만 변동) ◑
  · DB write 0 ✅
- 구획 합계: master 19,131 ✅ / group 6,261 ✅ (재사용 2,383 = 그대로 1,201 + 검토후 1,182)
- 스크립트↔산출물 기준: f2c819451 로 확증(gate 특징 일치). 경미: summary 에 scriptCommit 미임베드(권고).
- 확정 사용 가능: 정본 conflict=12 수치 전체(§6 ✅). 1차 apply = 그대로확장 157그룹/1,201제품.
- 폐기: 폐기본 686d795fa conflict=6 계열 수치(재사용 2,102 등) — 사용 금지.
- 후속 apply: 가능(1차=그대로확장 1,201, 별도 이중게이트 WO). 검토후/안전불일치는 사람 검토 후.
- 발견 이슈: byte-determinism 부분(요소순서) — 코드오류 아님(수치 무영향). 최소 수정안 §5 제시, 스크립트 미수정(경계 준수).
- 코드 변경 0 / DB write 0 / conflict 기준 변경 0 / 재실행 0
```
