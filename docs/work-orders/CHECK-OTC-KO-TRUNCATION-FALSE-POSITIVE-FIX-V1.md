# CHECK — WO-O4O-OTC-KO-TRUNCATION-FALSE-POSITIVE-FIX-RECURRENCE-GUARD-AND-RELEASE-V1

**모드: 코드 수정 + READ-ONLY 검증.**
DB write **0** · KO·EN·zh·ja canonical 변경 **0** · ProductMaster 변경 **0** ·
zh 대응표(`otc-zh-unit-map.ga.json`) 변경 **0** · HOLD 원장 변경 **0** · `pnpm-lock.yaml` 변경 **0**.

기준 커밋: `a226b630a` (절단 원인 전수조사)

---

## 0. 이 작업의 판정 기준을 먼저 고정한다

새 판정기가 답하는 질문은 하나다 — **"이 유닛을 번역해도 되는가."**
"이 문서의 KO 가 완결됐는가"는 **다른 트랙(하드컷 복구·공식 원문 재확보)의 질문**이다.

- 문장이 문법적으로 완결돼 있으면, 그 **뒤 문장이 하드컷으로 사라졌더라도** 그 유닛 자체를 번역하는 것은 안전하다.
- 반대로 **어절 중간에서 끊긴 조각**은 번역하면 절단이 그대로 번역문에 전파된다.

이 경계를 분리하지 않았기 때문에 구 판정기가 861 을 한 덩어리로 취급했다.

---

## 1. 변경 전후 절단 유닛 수

| 축 | 변경 전 | 변경 후 | 차이 |
|---|---:|---:|---:|
| 선정기 `truncatedKoUnits` | **861** | **353** | −508 |
| 형식적 절단 유닛(고유) | 732 | 224 차단 유지 | 508 해제 |
| 선정기 `docsBlockedByHoldUnit` | **1,397** | **659** | −738 |
| 절단으로 차단된 문서 | 1,148 | 409 | **739 완전 해제** |

`353 = 224(계속 차단) + 133(기존 HOLD 원장) − 4(중복)` — 정확히 일치한다.
`1,148 = 739 + 409` — 문서 회계도 정확히 일치한다.
(해제 유닛과 차단 유닛이 한 문서에 공존할 수 있으므로 "해제 문서"는 단순 합이 아니라
**이전엔 차단 유닛이 있었고 지금은 하나도 없는 문서**로 계산했다.)

---

## 2. 원인별 해제 결과

| 구 원인 | 유닛 | 해제 | 차단 유지 | 해제 근거 reason code |
|---|---:|---:|---:|---|
| **D_SUMMARY_NOUN_PHRASE** | 270 | **266** | 4 | `DISPLAY_SUMMARY_ALLOWED` |
| **E_DETECTOR_FALSE_POSITIVE** | 41 | **41** | 0 | `KOREAN_TERMINATOR_COMPLETE` |
| **C_UNIT_SPLIT** | 8 | **4** | 4 | `TERMINATED` 1 · `KOREAN_TERMINATOR_COMPLETE` 2 · `STRUCTURAL_SPLIT` 1 |
| A_KO_CONTENT_TRUNCATED | 226 | 190 | 36 | `DISPLAY_SUMMARY_ELLIPSIS` (표시용 파생) |
| G_UNCLASSIFIED_NO_TERMINATOR | 187 | 7 | 180 | `TERMINATED` (종결부호 뒤 괄호 주석) |
| **합계** | **732** | **508** | **224** | |

### 목표와 다른 4건씩 — 왜 해제하지 않았는가

- **D 잔여 4**: 표시용 카드지만 괄호가 닫히지 않았거나(`OPEN_DELIMITER` 2) 접속어로 끝난다(`INCOMPLETE_GRAMMAR` 2).
  슬롯 이름이 표시용이라는 이유만으로 넓게 통과시키지 않았다.
- **C 잔여 4**: 3건은 `…중증 신장장애(크레아티닌 청소율이< 25 mL/min)` 형태의 **금기 열거 항목**이다.
  괄호 주석을 벗기면 명사로 끝나는데, **이것이 정상 열거인지 하드컷인지 텍스트만으로는 구별되지 않는다.**
  1건은 쉼표로 끝나면서 `</li><li>` 경계 너머로 이어져 **독립 항목 병합 금지 원칙**에 걸린다.
  → WO 실행 C-4 "독립된 용법·주의사항·금기 항목은 병합하지 않는다" 를 지켜 **차단 유지(보수적)** 했다.

### 신규 차단 = **0**
기존에 정상이던 유닛이 새로 차단된 사례는 없다. 전수 재판정에서 `newlyBlocked: 0` 으로 확인했다.

---

## 3. R1 190 재분류 — 카드 UI 계약을 유지한 처리

| 분류 | 수 | 처리 |
|---|---:|---|
| **R1-SUMMARY** | **190** (badge 95 · tile 95) | KO 무변경. 카드 길이·역할 유지. 번역만 완결본에서 파생 |
| **R1-ACTUAL** | **0** | 해당 없음 |

R1 190 은 **전부 표시용 카드 슬롯**이고 **전부 말줄임표로 끝나며**, 186 건이 정확히 59 자다.
저작기가 `intro` 를 고정 길이로 자르고 `…` 를 붙여 만든 것이 확정된다. 본문 슬롯은 하나도 없다.

### 처리 방식 (`otc-card-summary.ga.ts`)

**KO 카드를 intro 전문으로 치환하지 않는다.** 번역 **근거**만 완결본으로 바꾸고,
번역문에 **같은 요약 규칙을 다시 적용**한다.

```
KO 카드 : 위산과다, … 소화불량, 식욕…              (59자, 어절 중간 절단 → 번역 원문 부적합)
KO 완결본: 위산과다, … 위부팽만감에 사용하는 일반의약품입니다.  (109자)
             ↓ 번역 근거만 완결본으로 교체
zh 완결본: 本品为非处方药，用于胃酸过多、…、消化不良引起的胃胀。
             ↓ 같은 소비 비율(59/109)을 적용 + 구분자 경계까지 후퇴
zh 카드  : 本品为非处方药，用于胃酸过多、烧心、胃部不适、胃胀、积食、…
```

- 길이 규칙은 **고정 글자 수가 아니라 원문 소비 비율**이다. 중국어는 같은 내용이 짧으므로
  58 자를 그대로 쓰면 카드가 요약이 아니라 본문이 된다.
- 자르는 자리는 **항상 구분자 경계**까지 물러난다. 물러날 구분자가 없으면 **파생을 포기**한다
  (수치·단위를 절대 쪼개지 않는다. 임의 문구도 만들지 않는다).
- KO canonical **무변경**, 카드 블록 타입·표시 계약 **무변경**, 공용 저장 계약·schema 변경 **없음**.

### G3 대체 검증
파생 카드는 KO 카드와 수치 지문을 맞출 수 없다(자르는 지점이 언어마다 다르다).
대신 **완결본 번역의 엄격한 접두**임을 검증한다(`verifyDerivedCard`).
접두가 보장되면 없던 수치가 생길 수 없고, 수치 검증은 완결본 슬롯에서 이미 끝난다.

---

## 4. 계속 HOLD 인 실제 손상

| reason code | 유닛 | 의미 |
|---|---:|---|
| `HARD_CUT_RESIDUE` | 160 | 종결 근거 없이 끝난 본문(260자 하드컷 잔재 다수) |
| `INCOMPLETE_WORD` | 34 | 어절 중간 절단 |
| `INCOMPLETE_GRAMMAR` | 28 | 조사·접속어·부사·쉼표 뒤 종료 |
| `OPEN_DELIMITER` | 2 | 괄호가 닫히지 않음 |
| **합계** | **224** | **문서 409** |

이 중 구 원장 기준 **R4_HOLD 216 건이 그대로 차단 유지**된다 — 근거 없는 자동 복원은 하지 않았다.

---

## 5. EN 절단 전파 전수검증 (실행 G)

모집단 **1,137 master** (신 판정 관심 슬롯을 가진 문서 기준). **EN canonical 결측 0**.

두 축을 분리해 판정했다. 축 1 이 실제로 답해야 하는 질문이다.

| 축 | 내용 |
|---|---|
| **축 1 — EN 자체 절단** | EN 본문 슬롯을 KO 대응과 무관하게 단독 검사. 항상 성립하는 판정 |
| **축 2 — KO↔EN 슬롯 대응** | EN 이 KO 슬롯 치환 산출물인지. 어긋나면 슬롯 단위 전파를 물을 수 없다 |

| 분류 | 수 |
|---|---:|
| **EN-TRUNCATED** | **0** |
| EN-INTRO-DIVERGENT | 1,037 |
| EN-OTHER | 83 |
| EN-CLEAN | 17 |
| EN-SUMMARY-VALID | 0 |

### 결론: **KO 절단이 EN 에 전파된 사례는 실측 0 건이다.**

- **EN-INTRO-DIVERGENT 1,037 은 손상이 아니라 구조적 사실**이다. EN 은 KO 슬롯을 치환해 만든
  산출물이 **아니고** 독립 저작물이다(슬롯 수 ko=18 en=16/17/19/21/23/24/31/32/33 … 로 갈린다).
  그래서 KO 의 하드컷이 EN 으로 기계적으로 옮겨갈 경로 자체가 없었다.
- `KO_CARD_ELLIPSIS_EN_FULL` 122 건 — KO 카드는 `…` 로 잘렸는데 **EN 카드는 완결 문장**이다.
  말줄임 절단이 **KO 저작기 쪽 산물**임을 반대편에서 확인해 준다.
- `NUMERIC` 96 건 중 대부분은 `1일`·`1회` 의 `1` 이 "once daily / three times a day" 로 흡수된
  기존 허용 사례다. **자동 판단 불가 7 건**만 `needsReview` 로 분리했다
  (`invented=6` 계열, `missing=43000 invented=201506622` 1 건 + 그 건의 `NEGATION_WEAKENED`).
- 부정·금기 강도 약화 **1 건**, 종결부호 없는 EN 목록 항목 **1 건** — 둘 다 `needsReview` 에 있다.

**EN canonical UPDATE 0.** 교정 큐(`correctionQueue`)는 0 건, 확인 필요(`needsReview`) 7 건이다.

---

## 6. 재발 방지 (실행 E)

### 공용 판정기 SSOT
`otc-ko-truncation-policy.ga.ts` — **언어 무관**. zh·ja 등 언어별 선정기는 이 모듈만 import 한다.

판정 입력에 다음 문맥을 포함한다: **슬롯 종류 · 슬롯 역할 · 태그 구조 · 원문 텍스트 ·
앞뒤 sibling · 같은 문서의 완결본 후보**.

슬롯 역할은 **실제 저작 스키마에서 확인된 것만** 넣었다. 이름을 추측해 넓게 제외하지 않는다.

| 역할 | 슬롯 | 정책 |
|---|---|---|
| display | `badge` `tile` `meta` | 명사구 완결 허용 · 말줄임은 완결본 근거가 있을 때만 파생 |
| body | `intro` `intake` `warn` `foot` `para` `li` | 종결부호 또는 한국어 종결어미 필요 |
| label | `h1` `h2` `h3` `tag` `small` `th` `td` `strong` `em` `b` `span` | 판정 대상 아님 |

### reason code 9종 (이유 없는 generic truncated 판정 없음)

통과 — `NOT_APPLICABLE` · `TERMINATED` · `KOREAN_TERMINATOR_COMPLETE` ·
`DISPLAY_SUMMARY_ALLOWED` · `DISPLAY_SUMMARY_ELLIPSIS` · `LIST_ITEM_NOUN_PHRASE` · `STRUCTURAL_SPLIT`
차단 — `INCOMPLETE_WORD` · `OPEN_DELIMITER` · `INCOMPLETE_GRAMMAR` · `HARD_CUT_RESIDUE`

`BLOCKING` 집합과 `blocked` 플래그의 일치는 회귀시험의 불변식으로 검사한다.

### 한국어 완결형
`습니다 | 십시오 | 하세요 | 마세요 | 입니다 | 합니다 | 됩니다 | 바랍니다 | 드립니다 | 주십시오`
suffix 목록을 무제한 확장하지 않았다. 조사 원장과 실제 KO canonical 에서 확인된 것만 넣었다.

**부정·금기 강도는 훼손하지 않는다** — `복용하지 마십시오` 는 `십시오` 로 완결이지만,
그 절단본 `복용하지 마` 는 어절중간 패턴(`하지 마$`)으로 계속 차단된다. 회귀시험에 고정돼 있다.

### 끝에 붙은 괄호 주석 처리
```
…수유를 중단하십시오. (야간용)                → 벗기면 …중단하십시오.  → 완결
…투여하지 마세요(비타민 A결핍증 환자는 제외)  → 벗기면 …마세요        → 완결
…베타차단제(아테놀올,메토프로롤,프로프라놀롤) → 벗기면 …베타차단제    → 명사 → 차단 유지
```
같은 규칙이 완결과 하드컷을 정확히 갈라낸다. 세 사례 모두 회귀시험에 있다.

### 회귀시험 — **51 통과 / 0 실패**

반드시 정상으로 판정: 명사구 카드 요약 3종 · `…에 사용합니다` · `…복용하지 마십시오` ·
`…상의하십시오` · 종결부호 뒤 괄호 주석 · 종결어미 뒤 괄호 주석 · 전체 괄호 주석 · 라벨 슬롯 · 짧은 표현
반드시 절단으로 판정: `…노년기의 비…` · `…복용하지 마` · `…있습니` · `…리토나비` ·
열린 괄호 · `…빈번히` · `…피해야` · 쉼표 종료 · 괄호 벗겨도 명사 · 근거 없는 카드 말줄임
문맥 규칙 4종 · 구조 분해 5종(+ 슬롯 오프셋 원본 재구성 불변식) · 단위 6종 · 카드 파생 7종

### 강제 가드
- 선정기·조립기는 기동 시 `assertSpec()` 을 호출한다. **회귀시험이 깨지면 생산이 진행되지 않는다.**
- 구 판정기는 `legacyIsTruncatedKo` 로 개명했다. **구 이름으로 import 하면 컴파일 단계에서 실패한다.**
  구 함수는 전수 재판정의 before 축으로만 남는다.
- 판정 규칙은 언어별 선정기에 복제하지 않았다. ja 선정기도 같은 모듈을 import 하면 그대로 적용된다.

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| 조사 원장 732 유닛 전수 재판정 | **732/732 재현, 누락 0** |
| R3 목표 319 유닛 | 508 해제(319 목표 대비 초과 — A 190 표시용 파생 포함) |
| 신규 차단 | **0** |
| 회귀시험 | **51 pass / 0 fail** |
| 기존 zh canonical 1,289 독립검증 | **GREEN** (실패 0) |
| G1 태그 골격 / G2 한글 잔존 / G3 수치 / G4 슬롯 수 / G5 빈 값 | **gateFailed 0** |
| 기존 canonical 내용 불변 | dry-run `planned 1,289` = 기존과 동일, `docsAlreadyFull 1,289` 불변 |
| 재실행 동일성 | `inserted 0` / `alreadyExists 0` — 멱등 |
| 타입 검사 | 변경 스크립트 7개 `tsc --noEmit --strict` 통과 |

전체 build 는 실행하지 않았다(공용 패키지 미변경 — 변경 범위는 `apps/api-server/src/scripts` 뿐).

---

## 8. zh 후속 생산 반영 (실행 H)

| 항목 | 값 |
|---|---:|
| 새 판정기로 추가 확보된 유닛 | **508** |
| 그 유닛이 속한 문서 | **779** |
| 그중 파생 카드(자체 번역 불필요) | **190** |
| 구조 분해 그룹 | 1 |
| 다음 800 유닛 배치 예상 완성 문서 | **1,626** (이전 동일 예산 대비 대폭 증가) |
| 미번역 유닛 총량 | 7,831 → 10,521 (막혀 있던 문서가 열려 유닛이 새로 보이게 됨) |

- 기존 zh 대응표·canonical **변경 0**. 신규 중국어 번역 **작성 0**. DB apply **미실행**.
- 다음 zh 생산은 선정기가 자동으로 새 판정기를 쓴다(같은 모듈 import + `assertSpec` 게이트).

---

## 9. 남은 R4 — 공식 원문 확보 대상

**224 유닛 / 409 문서.** 이번 작업에서 문장을 만들어 넣지 않았다.
`HARD_CUT_RESIDUE` 160 · `INCOMPLETE_WORD` 34 · `INCOMPLETE_GRAMMAR` 28 · `OPEN_DELIMITER` 2.
대부분 `warn` 260자 하드컷 잔재이므로, **MFDS 공식 원문 재확보 트랙**으로 분리한다.

---

## 10. 산출물

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/scripts/otc-ko-truncation-policy.ga.ts` | **공용 절단 판정기 SSOT** (언어 무관) |
| `apps/api-server/src/scripts/otc-ko-truncation-policy.spec.ga.ts` | 절단 판정 + 구조 분해 + 카드 파생 회귀시험 |
| `apps/api-server/src/scripts/otc-card-summary.ga.ts` | 카드 요약 파생 규칙 (zh·ja 공용) |
| `apps/api-server/src/scripts/otc-ko-truncation-readjudicate.ga.ts` | 전수 재판정 (READ-ONLY) |
| `apps/api-server/src/scripts/otc-en-truncation-propagation-audit.ga.ts` | EN 전파 전수검증 (READ-ONLY) |
| `apps/api-server/src/scripts/otc-zh-slots.ga.ts` | 구 판정기 `legacyIsTruncatedKo` 로 개명(회귀 가드) |
| `apps/api-server/src/scripts/otc-zh-unit-select.ga.ts` | 신 판정기 연결 + `assertSpec` + 파생/그룹 원장 |
| `apps/api-server/src/scripts/otc-zh-batch01-apply.ga.ts` | 파생 카드 조립 + G3 대체 검증 + `assertSpec` |
| `…/data/otc-ko-truncation-readjudication.ga.json` | 수정 전후 전수 재판정 원장 |
| `…/data/otc-ko-truncation-r1-reclassification.ga.json` | R1 SUMMARY/ACTUAL 재분류 원장 |
| `…/data/otc-en-truncation-propagation.ga.json` | EN 1,137 전파 조사 원장(비-CLEAN 1,120 전건, 무절단) |
| `…/data/otc-zh-release-population.ga.json` | zh 후속 생산 해제 모집단 |
| `…/data/otc-zh-unit-select.ga.json` | 신 판정기로 재산출한 선정 원장 |
| `docs/work-orders/CHECK-OTC-KO-TRUNCATION-FALSE-POSITIVE-FIX-V1.md` | 본 문서 |

## 11. 보호 범위 준수

- DB write **0** (모든 조사 스크립트 `SET default_transaction_read_only = on`, apply 는 dry-run)
- KO·EN·zh·ja canonical **무변경** / ProductMaster **무변경**
- zh 대응표 `otc-zh-unit-map.ga.json` **무변경** / HOLD 원장 **무변경** (재분류는 별도 산출물)
- `pnpm-lock.yaml` **무접촉** / HFF·다른 세션 파일 **무접촉** (pathspec 명시 커밋)
- 전체 build 미실행 — 변경 스크립트 타입 검사와 회귀시험만 실행
