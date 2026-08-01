# CHECK — WO-O4O-OTC-KO-CANONICAL-FULL-AUDIT-REPAIR-AND-POPULATION-LOCK-V1

**최종 판정: `KO_BASELINE_LOCKED_WITH_HOLD`** — HOLD 를 정확히 격리했고, 나머지 모집단은 검증됐다.
영어 전체 일괄 작업을 **KO_READY 20,093 문서 기준으로 시작할 수 있다.**

선행 커밋 확인: `6f211a2c1` · `8b8d222c0` 모두 main 에 포함(공용 절단 판정 계약 동일).

---

## 1. 공식 KO 전체 모집단

모집단은 **규제 속성만으로** 정의한다 — `product_masters.regulatory_type='DRUG' AND
drug_category='otc' AND status='ACTIVE'`. "canonical 이 있으니 대상" 도 "canonical 이니 정상" 도
쓰지 않는다. 대상 선정과 품질 판정은 완전히 독립적으로 계산했다.

| 항목 | 값 |
|---|---:|
| **공식 대상 ProductMaster** | **57,572** |
| terminal(비-ACTIVE) | 0 |
| KO 기준본 보유 문서 | 22,408 |
| 그중 대상 내(on-target) | 22,318 |
| 대상 밖 귀속(off-target) | 90 |
| **KO 미저작** | **35,254** |
| 검사 슬롯 | 494,624 |

`57,572 = 22,318(저작) + 35,254(미저작)` — 정확히 일치.

**이전 라운드까지의 5,000 문서는 zh 배치 매니페스트 범위였고, 실제 KO 모집단은 22,408 이다.**
이번 감사는 처음으로 전량을 대상으로 했다. 그래서 절단 유닛이 224 → 438 로 늘었다 —
새 손상이 아니라 **처음으로 전체를 본 결과**다.

### 저작 레이아웃 4종 (중요)
| 레이아웃 | 문서 | 슬롯 구성 |
|---|---:|---|
| CARD (sd-*) | 20,111 | h1·intro·badge·tile·intake·warn·foot |
| TABLE | 1,915 | h2·table(th/td)·`<p><strong>섹션</strong>` |
| PARA | 353 | para 만 |
| OTHER (manual) | 29 | div·h3·h4·li·span·style |

> **최초 감사에서 h1/intro 를 전 모집단에 요구했더니 정상 문서 2,286 건이 결함으로 잡혔다.**
> 특정 레이아웃의 kind 이름을 전체에 강요한 내 오류였다. 필수 조건을 **의미 단위**
> (제목 슬롯 1개 이상 + 본문 슬롯 1개 이상)로 바꿔 재계산했고, 회귀시험에 고정했다.

---

## 2~3. 작업 전 상태와 오류 유형

| 상태 | 문서 |
|---|---:|
| 정상 | 20,051 |
| 오류 보유 | 2,357 |
| 대상 밖 귀속 | 90 |

| 오류 유형 | 발생 | 고유 유닛 | 문서 |
|---|---:|---:|---:|
| `TRUNCATION_HARD_CUT_RESIDUE` | 1,474 | 336 | — |
| `TRUNCATION_INCOMPLETE_WORD` | 375 | 45 | — |
| `TRUNCATION_INCOMPLETE_GRAMMAR` | 340 | 51 | — |
| `TRUNCATION_OPEN_DELIMITER` | 20 | 6 | — |
| 절단 소계 | 2,209 | **438** | **1,979** |
| `TITLE_SLOT_MISSING` | 353 | — | 353 |
| `MASTER_ATTRIBUTION_OFF_TARGET` | 90 | — | 90 |
| `INLINE_STYLE_BLOCK` | 29 | — | 29 |

**0 으로 확인된 항목**: 태그 불균형 · 빈 슬롯 · 빈 본문 · canonical 중복 · 의미 없는 중복 블록 ·
부정·금기 강도 손실 · 복용법 수치 이상 · 슬롯 오배치.

---

## 4~6. 자동 복원

### 확보 가능한 근거가 무엇이었나 — 먼저 확인한 사실

`product_drug_extensions` 는 **MFDS 원문 보존처가 아니다.** 실측:

| 필드 | 값이 있는 행 |
|---|---:|
| 전체 행 | 177,413 |
| `efficacy_text` / `dosage_text` / `caution_text` / `contraindication_text` | **0** |
| `active_ingredients` / `dosage_form` / `strength` / `ingredient_summary` | **0** |
| `atc_code` | 176,962 |

즉 **공식 원문도, 성분·제형 구조 데이터도 DB 에 없다.** WO 가 요구한 안전지문 12축 중
성분 목록·투여경로·첨가제·단일/복합 구분은 **이 DB 만으로는 계산 자체가 불가능**하다.
그래서 확인 가능한 축만 쓰고, 확인 불가 축은 원장에 명시했다.

### 실제로 사용한 복원 근거와 안전지문

근거는 **다른 문서에 실재하는 검증된 완결본**뿐이다. 문장을 만들지 않았다.

| 안전지문 축 | 방법 | 결과 |
|---|---|---|
| 엄격한 접두 | 절단본이 후보의 접두(공백·구두점 무시) | 통과분만 채택 |
| 접두 최소 길이 | 실질 60자 이상이어야 지문으로 인정 | 8 유닛 탈락 |
| 수치·함량·연령·횟수·기간 | 절단본의 수치 전량 보존 | 통과 |
| 금기·부정 강도 | 금지 표현이 약해지지 않음 | 통과 |
| 후보 완결성 | 확장분이 종결됨(잘린 것을 잘린 것으로 바꾸지 않음) | 통과 |
| **약효분류 + 함량 + 제형** | ATC + `specification` 의 함량·제형 일치 | 3 유닛 탈락 |
| 성분 목록·투여경로·첨가제 | **DB 미보유 — 확인 불가** | 원장에 명시 |

> **정형 문구는 제품 단위로 판정해야 한다.** 절단된 warn 문장은 수십 개 제품이 공유한다.
> 유닛 전체에 대해 "모든 대상 제품이 동일 성분"을 요구하면 정형 문구는 영원히 복원되지 않는다.
> 그래서 지문을 **대상 master 하나하나**에 적용해 통과한 제품만 복원했다.

### 결과

| 항목 | 값 |
|---|---:|
| 근거 확보 유닛 | **10** (전체 438 중) |
| 안전지문 탈락 유닛 | 10 (ATC·함량·제형 불일치 3 / 접두 길이 부족 8, 중복 포함) |
| 근거 없음 | 418 |
| 복원 자격 master | 67 |
| dry-run 계획 문서 | 67 (게이트 탈락 0) |
| **실제 UPDATE 한 KO canonical** | **67** |
| 가드 불일치(동시 변경) | 0 |
| 복원 출처별 | 같은 kind 완결본 9 · 다른 kind 완결본 1 |
| 공식 원문(MFDS)에서 복원 | **0** (원문 미보유) |

적용 예시 — 260자에서 잘린 금기 문장이 같은 ATC·함량·제형 제품의 완결본으로 복원됐다:
```
BEFORE(260): …아세트아미노펜으로 일일 최대 용량 (4,000 mg)을 초과하여 복용하지 마
AFTER (260): …아세트아미노펜으로 일일 최대 용량(4,000 mg)을 초과하여 복용하지 마십시오
```
> 글자 수가 같다는 점에 주의 — 완결본이 공백을 덜 쓴다. **raw length 로 확장을 판정했더니
> 정상 복원 25건이 오탈락**했다. 실질 내용 길이로 바꿔 고쳤고 회귀시험에 고정했다.

### 자동 반복
`전수검사 → 근거 추출 → 교정 → 적용 → 재검사` 를 반복했다. 2회차에서 추가 복원 대상 **0**,
3회차 재검사 결과 **완전히 동일** → 수렴 조건 충족으로 종료.

---

## 7~11. 최종 모집단 잠금

| 집합 | 문서 | 비고 |
|---|---:|---|
| **KO_READY** | **20,093** | 후속 다국어 번역 기준본 |
| **KO_HOLD** | **2,225** | 공식 원문/사람 판단 필요 |
| **KO_EXCLUDED** | **90** | 번역 대상 아님 |
| 합계 | **22,408** | = KO 기준본 전체 |
| (참고) KO_NOT_AUTHORED | 35,254 | 잠금 밖 — 별도 생산 트랙 |

**`22,408 = 20,093 + 2,225 + 90`** · **`57,572 = 22,318 + 35,254`** — 둘 다 정확히 일치.
집합 간 중복 **0**, 미분류 **0**.

### KO_HOLD 사유
| reason code | 문서 | 다음 조치 |
|---|---:|---|
| `TRUNCATION_HARD_CUT_RESIDUE` | 1,333 | MFDS 공식 원문 재확보 후 재저작 |
| `TRUNCATION_INCOMPLETE_GRAMMAR` | 339 | 〃 |
| `TITLE_SLOT_MISSING` | 333 | 구조 결함 교정(제목 슬롯 신설) |
| `TRUNCATION_INCOMPLETE_WORD` | 265 | MFDS 공식 원문 재확보 후 재저작 |
| `TRUNCATION_OPEN_DELIMITER` | 18 | 〃 |

HOLD 원장에는 master ID · 제품명 · source_type · 슬롯 번호 · kind · reason code · 현재 KO 꼬리 ·
확보 후보(없음 사유 포함) · 다음 조치를 건별로 기록했다.

### KO_EXCLUDED 사유
| reason code | 문서 |
|---|---:|
| `NOT_OTC_PRESCRIPTION_ONLY` (전문의약품) | 42 |
| `NOT_OTC_HEALTH_FUNCTIONAL_FOOD` (건강기능식품) | 30 |
| `NOT_OTC_GENERAL_GOODS` | 14 |
| `DRUG_CATEGORY_UNDETERMINED` | 4 |

건강기능식품 30 건은 **분류만 했고 일절 건드리지 않았다**(HFF 무접촉).

---

## 12. 잔여 R4 224유닛 처리 결과

직전 라운드의 224 유닛은 5,000 문서 범위 기준이었다. 전량(22,408) 기준으로 다시 세면 **438 유닛**이다.
그중 10 유닛(67 문서)을 근거 기반으로 복원했고, **428 유닛은 HOLD 를 유지**했다.
공식 원문이 DB 에 없으므로 **문장을 만들어 넣지 않았다** — 이것이 이번 작업의 가장 중요한 절제다.

---

## 13~16. 검증 결과

### 카드 UI 및 표시 계약
카드 요약 슬롯은 이번에 **일절 수정하지 않았다.** 직전 라운드에서 확립한 계약
(KO 카드를 intro 전문으로 치환하지 않고 번역만 파생)이 그대로 유지된다.
복원은 `warn`·`intake`·`para` 본문 슬롯에만 적용했다.

### 최종 독립검증 (생산 스크립트와 분리된 별도 검증기)
| 항목 | 결과 |
|---|---|
| KO_READY 20,093 전건 DB 재판정 | **절단 0 · 빈 슬롯 0 · 태그 골격 이상 0 · 슬롯 없음 0** |
| 검사 건수 = 원장 건수 | 20,093 = 20,093 |
| OTC KO 변경 = 적용 원장 | 67 = 67, **예상 밖 KO write 0** |
| EN·zh 변경 | UPDATE 가드 `COALESCE(language,'ko')='ko'` 로 구조적 차단 |
| 기존 OTC zh canonical | **1,289 불변** |
| zh 독립검증(G1~G5) | **GREEN** — 실패 0 |
| canonical 중복 | 0 |
| 절단 판정 회귀시험 | **62 pass / 0 fail** |
| 타입 검사 | 신규·변경 스크립트 5개 `tsc --strict` 통과 |
| 재실행 멱등성 | 재감사 결과 동일 · 재복원 계획 **0** · 잠금 회계 동일 |

> **시각 창만으로는 "내가 바꾼 것"을 가릴 수 없다.** 같은 DB 에서 병렬 HFF EN 세션이 동시에
> 쓰고 있어(창 안에 `o4o_hff_generated` EN 147 건) 시각 기준 검사는 처음에 오탐을 냈다.
> 대상 축(OTC + ko)으로 좁혀 적용 원장과 건별 대조하는 방식으로 바꿨다.

---

## 19. EN 조사 11건 차이의 회계 원인

직전 라운드에서 KO 차단 문서는 1,148, EN 조사 모집단은 1,137 로 보고했다.

**원인**: EN 조사 스크립트의 "관심 슬롯" 집합에 `TERMINATED` 를 넣지 않았다.
재판정에서 `G_UNCLASSIFIED_NO_TERMINATOR → TERMINATED` 로 해제된 유닛만 가진 문서는
그 필터에 걸리지 않아 EN 모집단에서 빠졌다. **데이터 손실이 아니라 모집단 정의 차이다.**

원장 기준으로 다시 계산하면 현재 값은 1,133 이다(이번 라운드에서 67 문서 내용이 바뀌어 4 건이 더 이동).
**EN canonical 은 이번에도 수정하지 않았다.**

---

## 20~22. 보호 범위 준수

- EN·zh·ja 및 기타 언어 canonical **변경 0** (UPDATE 가드로 구조적 차단 + 원장 대조)
- ProductMaster **변경 0** (읽기만)
- 대상 밖 DB write **0** (OTC ko 67건 외 예상 밖 write 0)
- HFF **무접촉** — 건강기능식품 30 건은 분류만 하고 수정하지 않음
- `pnpm-lock.yaml` **무접촉** / 다른 세션 파일 **무접촉** (pathspec 명시 커밋)
- 신규 번역 생산 **0** / DB schema 변경 **0** / 공용 저장 계약 변경 **0**
- 전체 build 미실행 — 변경 스크립트 타입 검사와 회귀시험만 실행

---

## 23. 산출물

| 파일 | 내용 |
|---|---|
| `otc-ko-canonical-audit.ga.ts` | 전체 모집단 + 전수 품질검사 + 복원 근거 수집 (READ-ONLY) |
| `otc-ko-repair-apply.ga.ts` | 근거 기반 좁은 트랜잭션 복원 (dry-run/apply) |
| `otc-ko-population-lock.ga.ts` | READY/HOLD/EXCLUDED 잠금 + 회계 검증 (READ-ONLY) |
| `otc-ko-final-verify.ga.ts` | 생산과 분리된 최종 독립검증 (READ-ONLY) |
| `otc-ko-truncation-policy.spec.ga.ts` | 회귀시험 62건 (레이아웃·복원 안전 규칙 추가) |
| `…/data/otc-ko-canonical-population.ga.json` | 모집단 원장 |
| `…/data/otc-ko-canonical-quality.ga.json` | 품질검사 원장 |
| `…/data/otc-ko-repair-evidence.ga.json` | 복원 근거 원장(지문 판정 포함) |
| `…/data/otc-ko-repair-dryrun.ga.json` · `otc-ko-repair-applied.ga.json` | dry-run · 적용 원장(전후 diff) |
| `…/data/otc-ko-ready.ga.json` · `otc-ko-hold.ga.json` · `otc-ko-excluded.ga.json` | 최종 3집합 원장 |
| `…/data/otc-ko-population-lock.ga.json` · `otc-ko-final-verify.ga.json` | 잠금 · 최종 독립검증 결과 |

---

## 25. 최종 판정

### `KO_BASELINE_LOCKED_WITH_HOLD`

- **KO_READY 20,093 문서**로 영어 전체 일괄 작업을 시작할 수 있다.
- **KO_HOLD 2,225 문서**는 reason code 와 함께 정확히 격리됐다. 영어 작업에서 제외한다.
- **KO_EXCLUDED 90 문서**는 번역 대상이 아니다.
- 세 집합 회계가 정확히 맞고, 집합 간 중복·미분류가 없다.

### 다음 작업 전 알아야 할 것

1. **KO 미저작 35,254 master 는 잠금 밖이다.** 영어 작업의 모집단은 KO_READY 20,093 이지
   공식 대상 57,572 이 아니다. 두 수를 혼동하면 진척률이 실제의 3배로 보인다.
2. **MFDS 공식 원문이 DB 에 없다.** HOLD 1,955 건(절단 계열)의 복구는 외부 원문 재수집이
   선행돼야 한다. 이 작업은 별도 트랙이다.
3. 기존 EN canonical 은 62,079 건 존재하며, 그중 OTC 분은 이미 대부분 저작돼 있다.
   영어 일괄 작업은 **KO_READY ∩ EN 미보유** 를 먼저 산출하는 것으로 시작하면 된다.
