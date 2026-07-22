# CHECK — WO-O4O-OTC-NUTRITION-COMBO-MULTI-EFFECT-EN-3H-PILOT-GA-V1

**에이전트 가 · read-only 감사·분류 + 조기 종료 (DB write 0) · 2026-07-22**

## 0. 결론

nutrition_combo(source_type `mfds_drug_otc_nutrition_combo`) EN-only 잔여 **10 그룹을 감사·분류**한 결과,
**안전(READY) 후보 0** — 전 10그룹이 **HOLD**. 따라서 WO "안전 후보 소진·정책 판단 필요 시 조기 종료" 에 따라
**실제 EN 생산 없이 조기 종료**한다. **DB write 0 · ko 불변 · 공용 runner 미수정 · 타 세션 파일 미접촉.**

- 배정 상한 3시간 / **실제 작업 ~25분** (조사·분류) / **종료 이유 = 안전 후보 소진(전 그룹 HOLD)**
- 이 도메인은 **에이전트 나 소유·활성**: 나가 EN-only 계약 확정 + 안전 단일비타민 4그룹(비타민E 100/400/1000 IU·비타민C 1000mg, 53 master) 완결 후, **진짜 복합제는 효능 합성/다약물 상호작용 위험으로 HOLD** 선언([CHECK-...-NA-V1](CHECK-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1.md)). 본 감사는 그 판정을 독립 재확인함.

## 1. landscape (read-only)

| 항목 | 값 |
|---|---|
| combo STORE ko canonical | 1,915 · en canonical 378 (6그룹 완결) |
| EN-pending 그룹 | **10** (전부 en_canon=0 = **first-EN, byte-identical 재사용 경로 없음**) |
| 완결 combo EN 형식 | sd-* (`buildDrugOtcEnConsumerHtml`) — ko table → en sd-* 재포맷 |
| 나 claim(완결/진행) | 비타민E 100/400/1000 IU · 비타민C 1000mg (단일) · 비오틴 5mg · 칼슘·비타민D combo |
| 내 10 pending | 나 config 밖(미claim)이나 **나의 활성 복합제 도메인**과 동일 대상 |

## 2. 잔여 10그룹 분류 (전 그룹 ko 지문 균일 md5=1, first-EN)

| ref | 대표 제품 | ko master | 상호작용 | 성분/효능 구조 | 분류 |
|---|---|:-:|:-:|---|---|
| `fcf616ee` | 벤포벨브이정 | 4 | X | 종합비타민 A·B군·C·D·E(+아연), 3효능축(영양보급·눈·뼈) | **HOLD_MEDICAL_SYNTHESIS** |
| `5a342fe9` | 셀레트론플러스연질캡슐 | 5 | X | 종합비타민 A·E·B군·C, 다효능(영양·눈·말초혈행·출혈예방) | **HOLD_MEDICAL_SYNTHESIS** |
| `91d2a67d` | 마그신정(수출용) | 16 | O | 마그네슘+B6, **다약물 상호작용** | **HOLD_INTERACTION_INTERPRETATION** |
| `270a10a2` | 눈모아연질캡슐 | 21 | X | 눈 종합비타민, 다효능 | **HOLD_MEDICAL_SYNTHESIS** |
| `db7c085e` | 레날비타정 | 60 | O | 신장용 복합비타민, **상호작용** | **HOLD_INTERACTION_INTERPRETATION** |
| `b96f3977` | 티티아민정(수출) | 138 | X | 티아민 복합, 다성분·다효능 | **HOLD_MEDICAL_SYNTHESIS** |
| `029b8650` | 셀타골드에스연질캡슐 | 169 | X | 종합비타민, 다효능 | **HOLD_MEDICAL_SYNTHESIS** |
| `b21c54a6` | 비타콤보씨플러스정 | 208 | X | 종합비타민C 복합, 다효능 | **HOLD_MEDICAL_SYNTHESIS** |
| `26c2af33` | 센트본정 | 331 | X | 종합비타민·미네랄, 다효능 | **HOLD_MEDICAL_SYNTHESIS** |
| `d29b1340` | 진셀몬큐디플러스연질캡슐 | 585 | X | 종합비타민 다성분, 다효능 (**500+ 대형**) | **HOLD_MEDICAL_SYNTHESIS** + 대형 |

**상태별 집계**: READY_PARALLEL_PRESERVE 0 · READY_SINGLE_INTEGRATED_PURPOSE 0 · HOLD_MEDICAL_SYNTHESIS 8 · HOLD_INTERACTION_INTERPRETATION 2 · (전 그룹 공통) HOLD_POLICY(도메인 나 소유·기 HOLD).

## 3. HOLD 구체 사유 (WO 중지 조건 대응)

- **HOLD_MEDICAL_SYNTHESIS (8)**: 진짜 종합비타민(다성분·다효능). ko 효능이 제품 전체 다축(예 벤포벨브이 = 영양보급 + 눈 건조/야맹증 + 뼈/이·구루병)으로, first-EN(byte-identical 참조본 부재) fresh 번역 시 **성분별 효능 연결/효능 합성 없이** 안전하게 옮기려면 도메인 소유자(나)의 확정 계약과 판정이 선행돼야 함. 나가 이미 이 부류를 "효능 합성 위험" 으로 HOLD. → WO 중지: "성분별 효능을 새로 연결해야 번역 성립", "정책 판단 필요".
- **HOLD_INTERACTION_INTERPRETATION (2, 마그신·레날비타)**: 다약물 상호작용 문구 포함 → 번역만으로 의미 보존 여부에 **해석 판단** 필요. → WO 중지: "상호작용 의미를 해석해야 함".
- **HOLD_POLICY (전 그룹)**: nutrition_combo EN-only 는 **에이전트 나 소유·활성 도메인**(runner `otc-nutrition-combo-en-only-runner-na.ts`, 오늘자 `complex-en-3h` round, READY_SIMPLE_COMBO 한정 계약). 소유자가 동일 10그룹을 이미 HOLD. 독립 재분류로 READY 로 뒤집는 것은 소유권·계약 침해 → 코디네이터 지정 "나의 재분류·claim 계약 완료 후 분배" 시퀀스 준수.

## 4. 미수행 항목(안전 후보 부재로 생략)

fresh EN 번역 / TEST-LOG / dry-run / apply / 독립검증 — **해당 READY 그룹 0 이라 미수행**. EN writePlan/writeActual = **0**.

## 5. 게이트·규칙 준수

- DB write **0** (read-only 조사만) · ko canonical 불변(미접촉) · canonical duplicate 0(무write) · 대상 밖 write 0.
- 공용 runner registry .ts **미수정** · 나의 combo config/translation/runner **미접촉**(읽기만) · 공통 DB·runner 장애 0.
- 자기 산출물 = 본 CHECK 1건. `git commit -- <명시 경로>` 로 커밋.

## 6. 병렬 생산 가능성 판단

**현재 불가.** 잔여 10그룹은 (a) 다효능 합성 위험, (b) 상호작용 해석 필요, (c) 도메인 소유자(나) 기 HOLD.
가·나·다 분배 병렬 생산은 **나의 nutrition_combo 재분류·claim 계약 확정 + 다효능 번역 계약(합성 금지·병렬 보존)의 그룹별 세부 승인** 이 선행돼야 안전. 그 전까지 본 도메인은 HOLD 유지 권고.

**보고 요약**: 배정 3h / 실작업 ~25m / 종료=안전 후보 소진 / 감사 10그룹 / READY 0·HOLD 10 / 완료 master 0 / EN write 0 / ko 불변 / HOLD 10(§3) / 장애 0 / 미푸시 자기 산출물 0.
