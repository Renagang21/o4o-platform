# CHECK — WO-O4O-OTC-KO-STRUCTURAL-TRUNCATION-RECOVERY-AND-1891-VALID-DOC-RESTORE-V1

**LIVE KO canonical 925건 복구 완료.** EN·zh·ja 변경 0 / ProductMaster 변경 0 / 신규 row 0 /
sourceRef·canonical 변경 0 / 대상 밖 update 0.

---

## 1. 시작 상태

| 항목 | 값 |
|---|---|
| 시작 HEAD | `8bc6264a60f5732d7f3121fff551b5b9ab25c2bc` |
| branch | `main` |
| 자기 pathspec | clean (타 세션 HFF-zh 파일만 존재, 미접촉) |
| 선행 커밋 | `68c131365` · `42b1c2077` 포함 확인 |

---

## 2~3. 모집단 독립 재현

**기억된 1,891 을 쓰지 않았다.** LIVE DB 와 공식 원문에서 다시 산출했다.

| 분류 | 문서 |
|---|---:|
| KO_CONTENT_VALID_AND_STRUCTURE_READY | 17,651 |
| **KO_CONTENT_VALID_BUT_TRUNCATED** | **1,561** |
| KO_CONTENT_HOLD | 2,362 |
| KO_CONTENT_INVALID | 834 |
| KO_STRUCTURE_FALSE_POSITIVE | 0 |
| KO_SOURCE_UNRESOLVED | 0 |
| 합계 | **22,408** (상호배타 · 정확히 일치) |

> 기억값 1,891 과 실측 1,561 의 차이는 데이터 변화가 아니라 **측정 정의 차이**다.
> 1,891 은 구버전 구조 원장(`otc-ko-ready.ga.json`) 기준이었고, 1,561 은 LIVE content 에
> 현행 공용 판정기를 직접 돌린 값이다. WO 지시대로 **재산출값을 실행 모집단으로 썼다.**

---

## 4. 복구 대상 산출

복구 근거는 하나뿐이다 — **같은 master 의 e약은요 공식 원문에서, 현재 잘린 텍스트가 그 원문
문장의 구조적 절단임이 증명될 때.** 다른 제품 원문·성분군·ATC·제품명은 근거로 쓰지 않았다.

| 단계 | 문서 |
|---|---:|
| 내용 유효 + 구조 절단 | 1,561 |
| 복구 게이트 통과 (계획) | **943** |
| 게이트 차단 | 618 |
| 적용 전 최종 검증 통과 | **925** |
| 역패치 불변 실패로 차단 | 18 |

### 차단 사유
| 사유 | 문서 |
|---|---:|
| `NOT_FOUND_IN_OFFICIAL` (공식 원문에 해당 문장 없음) | 609 |
| `STRUCTURE_MARKER_NOT_UNIQUE` | 7 |
| `NUMERIC_CONFLICT` | 2 |
| `REVERSE_PATCH_MISMATCH` | 18 |

---

## 5. 절단 유형별 분포

모집단 1,561 문서의 절단 슬롯 기준:

| 유형 | 슬롯 |
|---|---:|
| **FIXED_LENGTH_TRUNCATION** | **1,523** |
| SENTENCE_MIDCUT | 73 |
| STRUCTURE_EXTRACTION_TRUNCATION | 47 |
| PARENTHESIS_MIDCUT | 18 |
| ENUMERATION_MIDCUT | 15 |

실제 복구한 945 fix 기준: FIXED_LENGTH 883 · STRUCTURE_EXTRACTION 40 · PARENTHESIS 18 · ENUMERATION 4
슬롯 종류: `warn` 899 · `intake` 28 · `tile` 18

---

## 6. 조사 중 잡은 결함 — 섹션 라벨 침범

첫 구현은 공식 원문을 **평문 한 덩어리**로 펼쳐 문장 경계까지 확장했다.
그 결과 다른 항목의 문장이 섞여 들어왔다:

```
이상반응 절단본  → `… 출혈이 오래 지속되거나, 저장방법 습기와 빛을 피해 실온에서 보관하십시오.`
용법 절단본      → `… 부드러운 음식(pH < 5.5) 사용상 주의사항 이 약 또는 소고기…`
```

**공식 원문을 섹션별로 분해하고, 확장을 섹션 안으로 제한**했다.
확장분에 섹션 라벨(`효능·효과`/`용법·용량`/`사용상 주의사항`/`상호작용`/`이상반응`/`저장방법`)이
섞이면 후보에서 제외한다. 수정 후 945 fix 전건 재검사에서 **라벨 침범 0**.

전건 안전 스캔: 라벨 침범 0 · 축소 0 · 수치 손실 0 · 금기 강도 손실 0 · 접두 불일치 0.

---

## 7. 실제 생성 코드 경로와 최소 변경

**원인 지점**: `apps/api-server/src/scripts/otc-unproduced-oral-unit-approval.ts:210`

```ts
official: { indication: indP.slice(0, 260), dosage: dosP.slice(0, 260), caution: cauP.slice(0, 260) }
```

승인 SSOT 가 공식 원문을 **저장 단계에서 260자로 잘라** 보관했고, 하류 저작 러너가 그 잘린 값을
원문 입력으로 소비해 LIVE KO canonical 에 하드컷이 그대로 굳었다.
FIXED_LENGTH_TRUNCATION 이 절단 유형의 압도적 다수(1,523/1,676)라는 실측이 이 경로와 일치한다.

**최소 변경**: 세 개의 `.slice(0, 260)` 제거 — 원문을 자르지 않고 그대로 저장한다.
원문 보존은 SSOT 의 책임이고 표시 길이 제한은 표시 계층의 책임이다. 저장 단계에서 자르면
되돌릴 근거가 사라진다는 주석을 남겼다. 대규모 리팩터링은 하지 않았다.

> 코드 존재만으로 모집단을 만들지 않았다. LIVE content 와 공식 원문 대조로 결함을 먼저 증명하고,
> 그 뒤에 코드 원인을 연결했다.

---

## 8. 대표 샘플

```
통케어정 | warn | FIXED_LENGTH_TRUNCATION
 BEFORE(260) …여러 차례 복용하여도 증상의 개선이 없
 AFTER (317) …여러 차례 복용하여도 증상의 개선이 없을 경우에는 이 약의 복용을 즉각 중지하고
              의사 또는 약사와 상의하십시오.

이노엔비타메진캡슐 | tile | PARENTHESIS_MIDCUT
 BEFORE(78)  …신경통, 근육통, 관절통(요통
 AFTER (161) …관절통(요통, 어깨결림 등), 각기, 눈의 피로, 구각염(입꼬리염), … 완화에 사용합니다.

화일알벤다졸정 | intake | FIXED_LENGTH_TRUNCATION
 BEFORE(260) …치료 3주
 AFTER (309) …치료 3주 후 검사를 하여 치료되지 않았으면 경우에 따라 2차 투여를 실시할 수 있습니다.

세노바퀵연질캡슐 | warn | STRUCTURE_EXTRACTION_TRUNCATION
 BEFORE(62)  …신부전 환자(크레아티닌 청소율 < 10 mL/min)
 AFTER (177) …(크레아티닌 청소율 < 10 mL/min) 이 약을 복용하기 전에 신장애, 간장애 환자, 노인,
              간질 환자 및 발작 위험성이 있는 환자, … 의사 또는 약사와 상의하십시오.
```

효능·용법·금기·연령·괄호·열거 유형이 모두 포함됐고, 어느 샘플에서도 수치·연령·횟수·1회량·
부정어·경고 강도·route 가 바뀌지 않았다.

---

## 9~11. dry-run · rollback-test · 역패치 불변

| 단계 | 결과 |
|---|---|
| **dry-run 2회** | ready 925 / planDigest `f60e1570…29fd4` **동일**, 산출 파일 **byte-identical** (`968108dd…eea8`) |
| **rollback-test** | LIVE 와 동일 UPDATE 경로로 925건 실행 후 **전건 강제 rollback** — `rolledBack 925`, `guardMiss 0` |
| **rollback 잔여** | rollback 직후 계획 재산출이 dry-run 과 **byte-identical** → 잔여 **0** |
| **역패치 불변** | 복구본을 원래 절단값으로 되돌린 hash = 적용 전 content hash. **불일치 18건은 적용하지 않았다.** |

역패치가 성립하면 허용 위치 외 HTML·다른 섹션·수치·연령·기간·경고 강도·route·footer·
sourceRef·canonical 이 모두 불변임이 기계적으로 증명된다.

---

## 12. LIVE 적용

| 항목 | 값 |
|---|---:|
| 계획 대상 | 943 |
| 최종 준비 | 925 |
| **UPDATE 성공** | **925** |
| 가드 불일치 | 0 |
| 예외 차단 | 18 (`REVERSE_PATCH_MISMATCH`) |
| 복구 슬롯 | 927 |
| 부분 복구 문서 | 20 (증명된 슬롯만 복구, 나머지 슬롯은 그대로 둠) |

가드: `id + master_id + description_type + status + language + deleted_at + 현재 content 원문 일치`.
master 단위 트랜잭션이며 실패 시 그 master 만 rollback 하고 나머지는 계속했다.

---

## 13. 멱등 재실행

| 항목 | 결과 |
|---|---|
| 계획 재산출 | 대상 **18** (역패치 실패분만 남음) |
| apply 재실행 | ready **0**, 신규 update **0**, 신규 audit **0** |
| content hash 변경 | 0 |

구조 READY 문서: **17,651 → 18,556 (+905)**
구조 절단 문서: **1,561 → 656 (−905)**
(925 적용 중 20건은 부분 복구라 여전히 절단 슬롯을 가진다. 925 − 20 = 905 ✓)

---

## 14~15. 독립검증

검증기는 **`otc-zh-slots` / `otc-ko-truncation-policy` 를 import 하지 않는다.**
텍스트 추출·절단 판정·지문 비교를 독립 구현해 다른 경로로 같은 결론에 도달하는지 확인했다.

| 항목 | 결과 |
|---|---|
| 적용 건수 = 원장 건수 | 925 = 925 |
| after content hash 전건 일치 | ✅ |
| canonical / language / description_type 불변 | ✅ (flip 0) |
| 연령 지문 손실 | 0 |
| 섹션 라벨 침범 | 0 |
| 성공 + 예외 = 계획 대상 | 925 + 18 = 943 ✅ |
| 적용분 잔존 절단 | 24 문서 |
| **판정** | **VERIFIED** |

> 잔존 절단 24는 **이번에 복구한 슬롯이 아니라 같은 문서의 다른 슬롯**이다.
> 계획 단계의 부분 복구 20건(공식 원문에서 완결본을 증명하지 못한 슬롯 보유)과,
> 독립 판정기가 정책 판정기보다 엄격한 데서 오는 차이가 합쳐진 수다.

---

## 16. 영어 시작 가능 모집단 재산출

| 기준 | 수 |
|---|---:|
| 대상 모집단 (OTC · ACTIVE · KO canonical) | 22,318 |
| **공용 판정기 기준 영어 시작 가능** | **18,223** |
| 독립 검증기(더 엄격) 기준 | 16,950 |
| 여전히 구조 절단 | 656 |
| 내용 HOLD·INVALID | 3,106 |
| nutrition_combo 비-DIRECT 제외 | 333 |
| 회계 | 22,318 = 16,950 + 1,929 + 3,106 + 333 ✅ (독립 기준) |

### 이전 17,021 과의 관계

- 이번 복구가 기여한 증가는 **+905** 다(구조 READY 17,651 → 18,556, 동일 측정 기준).
- 18,223 과 17,021 의 나머지 차이(약 300)는 **측정 정의 차이**다. 17,021 은 구버전 구조 원장
  (`otc-ko-ready.ga.json`, 제목 슬롯 없는 문서 333건 등을 추가로 제외)을 썼고,
  18,223 은 LIVE content 에 공용 판정기만 적용한 값이다.
- 목표 참고값 19,212 와의 차이 약 1,000 은 **공식 원문에 완결본이 없어 복구하지 못한 609건**과
  부분 복구·역패치 실패분이다. **예상값을 맞추려고 강제 분류하지 않았다.**

**권장: 영어 작업은 보수적으로 독립 검증기 기준 16,950 부터 시작하고,
공용 판정기 기준 18,223 과의 차이 1,273 은 표본 확인 후 편입한다.**

---

## 17. EN 240건 준비 상태 (수정 없음)

입력: `otc-en-coverage-incomplete-list.ga.json` (`rows` 240건, master 기준)

| 항목 | 값 |
|---|---:|
| 총 건수 | 240 |
| masterId 보유 | 240 |
| **KO canonical 연결 성공** | **240 / 240** |
| KO 연결 결손 | 0 |
| 이번 복구의 영향을 받은 건 | **0** |
| sourceRef drift (koSourceRef ≠ enSourceRef) | **0** |
| **다음 EN 재분류 착수 가능** | **가능** |

이번 복구가 240건을 건드리지 않았으므로 **EN 원문 대조 기준은 최신화가 필요 없다.**
EN 은 이번 WO 에서 한 건도 수정하지 않았다.

---

## 18. 보호 범위 준수

- EN·zh·ja canonical 변경 **0** (UPDATE 가드 `COALESCE(language,'ko')='ko'` 로 구조적 차단)
- ProductMaster 변경 0 / 신규 row 0 / canonical flip 0 / sourceRef 변경 0
- 대상 밖 update 0 / nutrition_combo HOLD·INVALID 문서 update 0 (계획 단계에서 제외)
- `.env` · `pnpm-lock.yaml` · HFF · 타 세션 파일 **무접촉**
- 전체 build 미실행 — 변경 스크립트 타입 검사 + 회귀시험 62 pass 만 실행

---

## 19. 산출물

| 파일 | 내용 |
|---|---|
| `otc-ko-structural-recovery-audit.ga.ts` | 모집단 독립 재현 + 복구 근거 산출 (READ-ONLY) |
| `otc-ko-structural-recovery-apply.ga.ts` | dry-run / rollback-test / apply (역패치 불변 포함) |
| `otc-ko-structural-recovery-verify.ga.ts` | 독립검증 (공용 함수 미사용) |
| `otc-unproduced-oral-unit-approval.ts` | 원인 지점 `slice(0, 260)` 3개 제거 |
| `…/data/otc-ko-structural-recovery-plan.ga.json` | 대상·차단·절단 유형 원장 |
| `…/data/otc-ko-structural-recovery-dryrun-{a,b,c}.ga.json` | dry-run 2회 + rollback 후 재산출 |
| `…/data/otc-ko-structural-recovery-rollback.ga.json` | rollback-test 결과 |
| `…/data/otc-ko-structural-recovery-applied.ga.json` | 적용 원장(before/after hash) |
| `…/data/otc-ko-structural-recovery-verify.ga.json` | 독립검증 결과 |

---

## 20. 다음 작업

1. **EN 240건 원문 대조** — 착수 가능(연결 240/240, drift 0).
2. 남은 구조 절단 656 중 609건은 공식 원문에 완결본이 없다 → MFDS 재수집 트랙.
3. 영어 모집단 16,950(보수) ~ 18,223(공용 판정기) 사이의 1,273건 표본 확인.
