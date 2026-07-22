# CHECK-O4O-OTC-NUTRITION-COMBO-COMPLEX-EN-3H-PILOT-NA-V1 — 복합제 EN-only 파일럿 (에이전트 나)

WO: `WO-O4O-OTC-NUTRITION-COMBO-COMPLEX-EN-3H-PILOT-NA-V1` · 일자: 2026-07-22 · 상태: **완료 — READY_SIMPLE_COMBO 2그룹/325 master EN 완결 LIVE. 다효능·상호작용 복합제는 HOLD, 안전 후보 소진으로 종료.**
runner: `otc-nutrition-combo-en-only-runner-na.ts`(자기 전용, 공용 registry 미수정) · config: `otc-nutrition-combo-complex-en-na.config.json` · claim: `otc-production-claim.na.json` · 채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production.

---

## 0. 결론

> **복합제 nutrition_combo EN-only 계약을 확정** — 판정 경계 = **단일 통합 목적(single unified purpose)** 그룹만 READY_SIMPLE_COMBO. 이 계약으로 **비오틴 5mg(8, 단일성분) + 칼슘·비타민D(317, 2성분·단일 목적 뼈 건강) = 325 master 의 영문 STORE 설명서를 fresh 번역 → en canonical 완결(LIVE)**. en write 650(persist 325 + flip 325). **ko canonical 전량 불변**(count·지문 사후검증). 전 그룹 dry-run 2회 byte-identical · TX 사후검증 PASS · 독립검증 PASS · 재실행 ALREADY_COMPLETE(write 0). **다효능(종합비타민·B복합)·상호작용 복합제(마그네슘+B6)는 HOLD**. 안전 후보 소진으로 정상 종료.

---

## 1. 배정 상한·실제 시간·시작 상태

| 항목 | 값 |
|---|---|
| 배정 상한 | 최대 3시간 |
| 실제 작업 | 감사·계약 확정 + 2그룹 생산(<3시간) |
| 시작 | main==origin/main(0/0) · 미완료 자기 작업 0 · 타 에이전트 claim 0(nutrition_combo) · 자기 claim/config만 · 공용 runner registry 수정 0 |
| 종료 이유 | 단일 통합 목적 안전 후보 소진 — 잔여는 다효능/상호작용 HOLD |

---

## 2. 잔여 그룹 감사 (WO §1) — 12그룹, 상태별 결과

전 그룹 ko 지문 균일(md5 kinds=1). master 오름차순·성분 수 기준.

| 그룹(source_ref) | master | 성분 | 목적 | 상태 |
|---|---:|---|---|---|
| 비오틴 5mg `79a515f0` | 8 | 단일(비오틴) | 손발톱·모발(단일) | **READY_SIMPLE_COMBO** ✅완결 |
| 칼슘·비타민D `2bb82579` | 317 | 2성분 | 뼈 건강(단일 통합) | **READY_SIMPLE_COMBO** ✅완결 |
| 마그네슘·B6 `91d2a67d` | 16 | 2성분 | B6 보급 **+** 마그네슘 근육경련(2목적) · 레보도파 상호작용 | **HOLD_INTERACTION_COMPLEX** / MULTI_EFFECT |
| 비타민B1·B2·B6·C `db7c085e` | 60 | 4성분 | 피로+구내염(2목적) | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 비타민D·E·C `b96f3977` | 138 | 3성분 | 영양보급·혈행 | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 종합비타민 E·B군+마그네슘 `029b8650` | 169 | 다성분 | 육체피로·근육경련·말초혈행 | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 종합비타민·미네랄 D·E·B·C+아연 `b21c54a6` | 208 | 다성분 | 육체피로·영양보급 | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 종합비타민 B·C·D·E+아연 `26c2af33` | 331 | 다성분 | 육체피로·영양보급 | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 종합비타민·미네랄 E·B+마그네슘·아연 `d29b1340` | 585 | 다성분 | 육체피로·말초혈행 | **HOLD_MULTI_EFFECT_SYNTHESIS** |
| 종합비타민 A·B·C·D·E `fcf616ee`·`5a342fe9`·`270a10a2` | 4·5·21 | 다성분(비타민A 포함) | 영양보급 | **HOLD_MULTI_EFFECT_SYNTHESIS** |

- **판정 경계(확정)**: **READY = 단일 통합 목적**(효능이 ko 에서 하나의 목적으로 완결, 성분별 분해/합성 불필요). **HOLD = 2개 이상 별도 목적**(성분별 효능을 한 EN 설명서에 담을 때 인과·결합 암시 위험) 또는 **복잡 상호작용 해석 필요**.
- 대형 종합비타민부터 시작하지 않음(WO 준수). 최소·최단순(비오틴 8)부터.

---

## 3. 복합제 번역 계약 (WO §2, 확정)

| 항목 | 계약 |
|---|---|
| 원문 | 기존 ko canonical 유일(fresh 번역) |
| 성분별 새 효능 | **추가 0** — ko 에 함께 기재된 효능만 보존 |
| 효능 재조합/인과 | **금지** — ko 문장 구조 그대로. 단일 통합 목적 그룹만 대상(다효능 HOLD) |
| 금기·상호작용·주의 | 축약·약화 **없이** 전량 보존(칼슘+D: 인산염·칼슘염·테트라사이클린·제산제·강심배당체 / 비오틴: 날계란·항경련제·항생제) |
| 수치·단위·횟수·기간·연령 | 보존(칼슘+D: 만 8세 이상 1일 1회 1정 / 비오틴: 1일 1회 1정 식전) |
| ko 항목 축 | ko 의 효능/용법/주의/성분 축을 EN 도 동일 유지(sd-* efficacy/usage/caution/summaryTable) |
| 새 의료 해석 필요 | **HOLD** (다효능·복잡 상호작용) |
| 빌더·source·write·ko 불변 | [이전 EN-only 계약](CHECK-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1.md) 그대로: sd-* 빌더·source_type `mfds_drug_otc_nutrition_combo`·2T·이중게이트·koUnchanged·구조 게이트 |

---

## 4. 완료 그룹·writePlan/Actual·ko 불변 (WO §3-4)

| 그룹 | master(T) | writePlan(2T) | writeActual | en canonical | ko 불변 | no-op |
|---|---:|---:|---:|---:|:-:|:-:|
| 비오틴 5mg (combo) | 8 | 16 | 16 | 8 | ✅ | ALREADY_COMPLETE |
| 칼슘·비타민D | 317 | 634 | 634 | 317 | ✅ | ALREADY_COMPLETE |
| **합계** | **325** | **650** | **650** | **325** | ✅ | — |

- TX 사후검증 PASS: en canonical=T·nr 0·dup 0·**koUnchanged true**(지문·count 전후 동일). writeActual==2T(초과 0)·대상 밖 write 0.
- 독립검증(별도 psql): 비오틴 en 8/ko 8, 칼슘+D en 317/ko 317 (각 균일 md5·ko 불변)·전역 canonical duplicate 0.
- dry-run 2회 byte-identical(양 그룹). 재실행 ALREADY_COMPLETE·write 0.

---

## 5. TEST-LOG (WO §2, 수치·단위·연령·횟수·금기·상호작용 보존)

| 그룹 | 효능(ko→en) | 용법·연령 | 금기·상호작용 | fact-0 |
|---|---|---|---|:-:|
| 비오틴 5mg | 비오틴 결핍성 손발톱·모발 성장장애 → 보존(단일) | 1일 1회 1정 식전 → `one tablet once a day, before a meal` | 과민·3개월미만 금기 / 임부수유부 상담 / **날계란 병용금지·항경련제(카르바마제핀·페니토인)·항생제 상담** 보존 | ✅ |
| 칼슘·비타민D | 임신/수유/발육기/노년기 비타민D 보급 + 칼슘 결핍·기타 칼슘 보급 + 뼈·이 발육불량·구루병 예방 → **ko 통합 문장 그대로** 보존 | 만 8세 이상·성인 1일 1회 1정 → `aged 8 years and over ... once a day` | 금기(고칼슘혈증·유육종증·신장질환·신장결석·심한신부전·12개월미만) / 상담(심장순환신장·강심배당체) / **병용금지(인산염·칼슘염·테트라사이클린·제산제)** 보존 | ✅ |

> ko 에 없는 새 medical fact **0**. 성분별 효능 합성·재조합 **0**(칼슘+D 는 ko 통합 목적 문장을 그대로 옮김). 금기·상호작용 축약·약화 **0**.

---

## 6. HOLD 목록·구체 사유 (WO 중지 조건)

| 그룹 | 사유(구체) |
|---|---|
| 마그네슘·B6 `91d2a67d`(16) | **2개 별도 목적**(B6 보급 + 마그네슘 근육경련) + **레보도파 상호작용**(B6-레보도파 임상적 상호작용 — 해석 여지) → HOLD_INTERACTION_COMPLEX |
| 비타민B1·B2·B6·C `db7c085e`(60) | 4성분·피로+구내염 2목적 → HOLD_MULTI_EFFECT_SYNTHESIS |
| 비타민D·E·C `b96f3977`(138) | 3성분·영양보급+혈행 → HOLD_MULTI_EFFECT_SYNTHESIS |
| 종합비타민(±미네랄) `029b8650`·`b21c54a6`·`26c2af33`·`d29b1340`·`fcf616ee`·`5a342fe9`·`270a10a2` | 다성분·다목적(육체피로·영양보급·혈행 등) — 성분별 효능을 한 EN 에 담을 때 결합·인과 암시 위험 → HOLD_MULTI_EFFECT_SYNTHESIS |

> **중지 조건 발동 없음**(성분·함량 차이 0[ko 균일]·target 밖 write 0·ko 변경 0·writeActual>2T 0·dup 0·오류 반복 0). 다효능/상호작용 그룹은 계약 밖으로 **HOLD 후 다음 후보 검사**, 단일-목적 안전 후보 소진으로 정상 종료.

---

## 7. 준수 / claim

- source_type=`mfds_drug_otc_nutrition_combo` · 기존 ko canonical 변경 0 · EN 없는 그룹만 · master_id source_ref 고정 · 공용 runner registry(.ts) 수정 0(자기 전용) · writeActual>2T/대상밖/dup 0 · git add . 미사용.
- 자기 claim 1개(`otc-production-claim.na.json`) — 각 그룹 착수 전 claim→commit→push→fetch→교집합 0(양 그룹 교집합 0). 완료 status=DONE.

---

## 8. 완료 보고 요약

- **배정 3h / 실제 <3h**, 종료=단일-목적 안전 후보 소진
- **감사 12그룹**: READY_SIMPLE_COMBO 2(완결) · HOLD 10(다효능/상호작용)
- **완료 2그룹 / 325 master EN LIVE**(비오틴 8 + 칼슘·비타민D 317) · en write 650(plan==actual)
- **ko 불변** 전 그룹 · 독립검증 PASS · ALREADY_COMPLETE no-op(write 0) · 전역 dup 0
- **복합제 계약 확정**: READY=단일 통합 목적만 · fresh 번역·효능 합성 0·금기/상호작용 보존
- **시간당 master**: 계약 확정 포함 325 master(칼슘+D 317 단일 그룹 포함)
- **다음 병렬 생산 가능 여부**: 단일-목적 복합제는 소진(비오틴·칼슘+D 완결). 잔여 10그룹(다효능·상호작용, ~1,500 master)은 **콘텐츠 정책(다성분 효능 표현·상호작용 해석) 확정 후** 별도 WO — 현 계약으로는 병렬 생산 부적합
- **commit SHA**: ↓ · origin/main 동기 · 미푸시 자기 산출물 0

> 단일-목적 복합제 안전 파일럿 완결(325 master). 다효능·상호작용 복합제는 정책 선결. 계약·runner 재사용 가능.
