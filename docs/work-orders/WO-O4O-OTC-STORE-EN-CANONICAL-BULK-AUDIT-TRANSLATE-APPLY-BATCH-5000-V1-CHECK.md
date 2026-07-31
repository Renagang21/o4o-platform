# WO-O4O-OTC-STORE-EN-CANONICAL-BULK-AUDIT-TRANSLATE-APPLY-BATCH-5000-V1 — CHECK

- 결론: **READ_ONLY_COMPLETE** — 배치 1(5,000) 전수 점검 완료. 번역·DB write 가 필요한 대상이 사실상 없어 **DB write 0**
- 실행일: 2026-07-31 ~ 2026-08-01
- 실행 폴더: `C:\Users\sohae\o4o-platform` · 브랜치 `main`
- 착수 HEAD: `305c829f6` (= origin/main) · 종료 HEAD: 본 CHECK 커밋
- 선행 커밋 `09dd966ca` · `305c829f6` origin/main 포함 확인
- 보호한 다른 세션 파일: `pnpm-lock.yaml`(MM) · 미추적 `hff-en-batch-01-*` 13건 — **미접촉**
- 중지된 136문장 작업: 산출물 없음(중지 시 DB write 0 · 저장소 변경 0). 이번 작업에 포함하지 않았다

---

## 1. 모집단 — 인계 수치와 다르다 (실측 정정)

WO 는 "현재 일반의약품 모집단 약 3,476" 을 전제로 "이번 5,000 배치에서 전량 처리" 를 예상했다.
**LIVE 재산출 결과 그 값은 모집단이 아니라 V4 생산 코호트다.**

| 축 | 값 | 근거 |
|---|---:|---|
| 저작 leaflet KO STORE canonical **전체** | **22,011** | `mfds_drug_otc` 15,908 + `mfds_drug_otc_nutrition_combo` 3,545 + `o4o_drug_otc_topical` 2,558 |
| DISTINCT master | 22,011 | master 당 canonical 1건, **중복 0** |
| ProductMaster 연결 실패 / 비-ACTIVE | 0 / 0 | 전건 유효 |
| V4 공식대상 3,809 − terminal·exclude 330 → 후보 3,479 → KO canonical 보유 | **3,476** | 인계 수치의 정체 = **코호트**(모집단 아님) |
| `mfds_easy_drug` KO canonical | 353 | **모집단 제외** — 저작 설명서가 아니라 공식 원문 문서(sd-card **0** · `<p><strong>` 원문 구조 **353/353** · 대응 EN **0**) |

> 모집단이 22,011 이므로 WO §4 규칙에 따라 **고정 정렬(master_id, ko id) 상위 5,000 = 배치 1** 만 처리했다.
> 전체를 덮으려면 배치 5회가 필요하다(잔여 17,011).

## 2. EN 미보유 = 0 (번역 신규 생성 불필요)

| source_type | KO canonical | EN canonical | EN 미보유 |
|---|---:|---:|---:|
| `mfds_drug_otc` | 15,908 | 15,908 | **0** |
| `mfds_drug_otc_nutrition_combo` | 3,545 | 3,545 | **0** |
| `o4o_drug_otc_topical` | 2,558 | 2,558 | **0** |

KO↔EN 은 `(master_id, source_type)` 기준 **정확히 1:1**(22,011/22,011, 중복 0).
→ `TRANSLATED_MISSING` 은 배치 1 뿐 아니라 **모집단 전체에서 0** 이다.

## 3. 배치 1 판정 결과

[otc-store-en-bulk-audit.ga.ts](../../apps/api-server/src/scripts/otc-store-en-bulk-audit.ga.ts) (READ-ONLY · DB write 0)

| 분류 | 문서 | 비율 |
|---|---:|---:|
| `PASS_EXISTING` | **4,751** | 95.0% |
| `REVIEW_REQUIRED` | **248** | 5.0% |
| `RETRANSLATED_INVALID` | **1** | 0.02% |
| `TRANSLATED_MISSING` | **0** | — |
| **합계** | **5,000 = manifest PASS** | |

| 검토 사유 | 문서 |
|---|---:|
| `NUMERIC_VALUE_MISSING_IN_EN` | 211 |
| **`DOSE_LIMIT_SENTENCE_MISSING`** | **55** |
| `POSSIBLE_ROUTE_VERB_ISSUE` | 31 |

## 4. 판정 기준 — 과탐을 3회 실측으로 잡았다

WO §6 은 "단순 키워드 검출로 오역을 확정하지 말라" 고 못 박는다. 1차 규칙은 그 반대로 동작했고,
표본 실측으로 세 번 좁혀 **검토율 96.6% → 5.0%** 로 정정했다. 규칙은 코드가 아니라 데이터가 정했다.

| 차수 | REVIEW | 원인 | 정정 |
|---:|---:|---|---|
| 1차 | 4,832 (96.6%) | 경구제까지 `take it` 을 route 오류로 계수(3,366) · EN summary 공란을 결함 취급(2,609) · 단위 없는 숫자 전량 대조(4,552) | route 신호를 **KO 에 경구 표현이 전무할 때만** · summary 공란은 관측값으로 강등 · 수치는 **단위가 붙은 값만** |
| 2차 | 921 (18.4%) | 빈도 단위의 `1`·`2` 소실을 정보 손실로 계수(1: 467건, 2: 344건) — 영어는 `a day`·`twice` 로 흡수 | 빈도·수량 단위의 1·2 제외, `once/twice/thrice` 수사 매핑 추가 |
| 3차 | 306 (6.1%) | **제품명 속 수치**를 대조(`리도킨연고5%` → EN 은 `Topical medicine (MFDS …)` 로 일반 표기) | 대조 범위를 **본문 영역**(intro·intake·warn·core·foot)으로 한정 |
| 확정 | **248 (5.0%)** | — | 안전 상한 소실 신호 신설 |

`RETRANSLATED_INVALID` 는 해석 여지가 없는 객관적 결함(한글 잔존 · 필수 구조 결손 · 번역 실패 마커 ·
HTML 붕괴 · 비정상 반복 · 수치 전량 소실 · 고정 길이 절단)에만 부여했고, **의미 판단이 필요한 신호는 전부 검토로 분리**했다.
번역 지침 T-07 이 문장 분할·결합·어순 조정을 허용하므로 문장 수·`<li>` 수 대응은 결함 근거로 쓰지 않았다.

## 5. 최우선 발견 — 안전 상한 문장 소실 55건

KO 가 **일일 최대 용량을 수치로** 명시했는데 EN 에는 수치 상한이 **어떤 형태로도** 없는 문서가 55건이다.
아세트아미노펜 군집을 표본으로 정량 확인했다(KO 4,000 mg 경고 보유 53건 기준):

| 지표 | 건수 |
|---|---:|
| KO 에 최대 용량 수치 경고 존재 | **53 / 53** |
| EN 에 `acetaminophen`·`paracetamol` 언급 | 1 |
| EN 에 `4,000 mg` | **0** |
| EN 에 `4 g`(단위 변환형) | 3 |
| EN 에 `maximum daily`·`do not exceed` 류 | 4 |
| EN 에 간손상 경고는 유지 | 42 |
| **세 형태 어디에도 상한이 없음** | **49** |

```
KO : 아세트아미노펜으로 일일 최대 용량(4,000 mg)을 초과하여 복용하지 마십시오. 간손상을 일으킬 수 있습니다.
EN : (간손상 경고는 있으나 4,000 mg 상한 문장 자체가 없음)
```

간손상 경고는 남기고 **수치 상한만 사라진** 형태라 소비자가 상한을 알 수 없다.
번역 지침 T-02(수치 유지)·T-03(안전 조건 누락 금지) 위반이며 **안전 관련 정보 손실**이다.
다만 처리 방식(전체 재번역 vs 상한 문장 복원)이 WO 규정과 충돌하므로 §7 에서 판단을 요청한다.

## 6. 확정 결함 1건

`05607729-c6b6-48c4-bf87-fe55f653efee` 일양아이콤연질캡슐 — `ABNORMAL_REPETITION`.
EN `sd-warn` 에 동일 `<li>` 가 **연속 중복**한다(실측 확인).

```html
<li>If there is no improvement in symptoms after about 1 month of taking it, stop taking it immediately and consult a pharmacist.</li>
<li>If there is no improvement in symptoms after about 1 month of taking it, stop taking it immediately and consult a pharmacist.</li>
```

나머지 본문은 KO 와 정합한다(수치 소실 0 · 구조 정상 · 한글 0).

## 7. DB write 를 하지 않은 사유

| 대상 | WO 규정 | 실제 상황 | 판단 |
|---|---|---|---|
| `TRANSLATED_MISSING` 0 | 신규 번역·INSERT | 대상 없음 | write 불필요 |
| `RETRANSLATED_INVALID` 1 | **부분 교정 금지 · 전체 재번역** | 결함은 `<li>` 1개 중복. 전체 재번역은 정상 문장 전량 교체를 뜻함 | 비례성 문제 → §8 판단 요청 |
| 안전 상한 소실 55 | 판정상 `REVIEW_REQUIRED` | 근거는 객관적이나 규정상 자동 확정 대상 아님 | 자동 수정 금지 준수 |

또한 이 저장소의 OTC EN 번역 채널은 **LLM API 가 아니다**.
[OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md) §3 는
`GUIDE V0.5 + GLOSSARY V0.2` 기준 **그룹당 번역 1건 저작 → 빌더 전개 → TEST-LOG 검수 → 이중 게이트** 를 규정한다.
DeepSeek 등 외부 모델 설정·키는 저장소·`.env` 어디에도 없다(실측). 병렬 HFF EN 세션도 LLM 이 아니라
**승인 사전·용어집 기반 결정적 슬롯 치환**을 쓴다. 따라서 "번역 모델 설정" 은 불명확한 것이 아니라 **해당 없음**이며,
이번 배치는 번역 대상이 사실상 없어 이 경로를 밟을 필요가 없었다.

## 8. 판단 요청 (다음 단계)

1. **안전 상한 소실 55건** — ① KO 기준 전체 재번역(WO 문자 준수) ② 소실된 상한 문장만 복원(비례적이나 "부분 교정") ③ 보류.
2. **확정 결함 1건** — ① 전체 재번역 ② 중복 `<li>` 1줄 제거 ③ 보류.
3. **잔여 배치** — 배치 2~5(17,011)를 같은 판정기로 이어서 처리할지.

## 9. 산출물

| 파일 | 역할 |
|---|---|
| [otc-store-en-bulk-audit.ga.ts](../../apps/api-server/src/scripts/otc-store-en-bulk-audit.ga.ts) | 모집단 산출 + 배치 manifest + 전수 판정 (READ-ONLY) |
| `data/otc-store-en-audit-batch01-manifest.ga.json` | **불변 manifest** — 모집단 조건·정렬·시작/종료 식별자·5,000건 KO/EN hash |
| `data/otc-store-en-audit-batch01-ledger.ga.json` | 전수 판정 원장 5,000행 |
| `data/otc-store-en-audit-batch01-pass-existing.ga.json` | 통과 4,751 |
| `data/otc-store-en-audit-batch01-review-required.ga.json` | 검토 248 |
| `data/otc-store-en-audit-batch01-retranslate-invalid.ga.json` | 확정 결함 1 |
| `data/otc-store-en-audit-batch01-translated-missing.ga.json` | 0건(계약상 생성) |
| `data/otc-store-en-audit-batch01-summary.ga.json` / `.md` | 요약 + 사람이 읽는 요약 |

dry-run / apply / rollback / post-verify 원장은 **없다** — DB write 대상이 없어 실행하지 않았기 때문이다.

## 10. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `git fetch` · 선행 커밋 확인 | HEAD = origin/main = `305c829f6`, 선행 2건 포함 |
| `pnpm install --frozen-lockfile` | exit 0 |
| proxy 기동(`--port 5542`) | ready |
| 모집단 probe | 22,011 · 중복 0 · PM 연결 100% · easy_drug 353 성격 판별 |
| `tsx otc-store-en-bulk-audit.ga.ts` | 5,000 판정 · 합계 PASS · **DB write 0** |
| 아세트아미노펜 군집 정량 확인 | 53건 중 49건 상한 부재 |
| 전체 build | 미실행(코드·공용 패키지 변경 없음, WO §17) |
