# CHECK-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-TITLE-ATTR-REFINEMENT-V1

> 작업 성격: **parser refinement + read-only dry-run.** 운영 DB write 0, ProductCandidate/Master/Identifier/SPD/Image 생성·변경 0, 배포 0.
> 작성일: 2026-07-07
> WO: `WO-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-TITLE-ATTR-REFINEMENT-V1`
> 트랙: **의약외품 전용**
> 선행: `CHECK-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-DRYRUN-V1`(HOLD — title 속성 누락 발견)
> 채널: 로컬 파서 dry-run(순수 파서, DB 무관) + `jest`. 운영 DB 는 candidate 기준선만 read-only(선행 CHECK 재사용).

---

## 0. 한 줄 결론

**판정 = GO.** 기존 파서에 `title` 속성 편입을 추가해 NB(사용상주의사항) 추출을 **12,553 → 22,886 (54.8% → 99.7%)** 로 끌어올렸다. EE/UD 도 99.98% 로 소폭 개선. **회귀 0** — 기존 9 테스트 전량 통과, title 없는 문서의 본문 추출 동작 불변. 신규 파서를 만들지 않고 기존 순수 파서 1개 함수만 보강했다. 잔여 미추출은 **원문 자체가 결측(empty)** 이거나 **DOC 섹션 라벨만 있고 본문이 없는(failed 8건)** 케이스뿐 — 데이터에 없는 내용을 만들지 않았다.

---

## 1. 수정 내용 (신규 파서 없음)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-official-text.parser.ts` | `xmlDocToPlainText` 에 (2) title 속성 편입 + (6) 연속 중복 줄 제거 추가, (7) 공백 정리 단일 줄바꿈화. `dedupeConsecutiveLines` 헬퍼 추가 |
| `.../__tests__/quasi-drug-permit-official-text.parser.test.ts` | 기존 9 유지 + title 케이스 8 추가 = **17 PASS** |

### 1.1 title 편입 규칙

```
ARTICLE / SECTION / PARAGRAPH 의 title 속성 → 여는 태그 위치에 본문으로 편입 (순서 유지)
DOC 의 title 은 제외 (효능효과/용법용량/사용상주의사항 = 섹션 라벨, 본문 아님)
"…" / '…' 양 따옴표 처리 · HTML entity 디코드 · title==body 연속 중복 제거
```

**DOC title 을 제외한 이유 (설계 결정):** 실 데이터에서 `<DOC title="효능효과">` 의 title 은 섹션 이름(라벨)이지 내용이 아니다. 편입하면 (a) 22,953×3 출력마다 섹션명 헤더가 중복 주입되고, (b) 기존 테스트 3건(`xmlDocToPlainText(EE)==='구중청량, 구취제거'` 등, DOC title 미포함을 단언)이 깨진다. 실제 본문은 **ARTICLE title** 에 저장되므로(§2 근거), ARTICLE/SECTION/PARAGRAPH 만 편입한다. → WO §5.3 의 예시(DOC title 포함)와는 이 지점만 다르며, 회귀 금지·데이터 실측에 근거한 판단이다.

---

## 2. 근거 — 원문 역분석 (DOC 라벨 제외, 22,953 전량)

| 섹션 | 원문 존재 | 본문 추출 | **ARTICLE/SECTION title 회복(실 내용)** | DOC 라벨만(내용無) | 진짜 빈값 |
|---|---:|---:|---:|---:|---:|
| EE | 22,950 | 22,617 | 329 | 4 | **0** |
| UD | 22,948 | 22,206 | 739 | 3 | **0** |
| NB | 22,893 | 12,553 | **10,333** | 7 | **0** |

→ 회복 대상은 전부 ARTICLE title 에 실재하는 내용. DOC 라벨만 있는 14 section-instance(≈8 rows)는 내용이 없어 편입 대상이 아니다.

---

## 3. 전량 dry-run — 보강 전/후 (22,953, 파서 예외 0)

| 섹션 | 보강 전 parsed | **보강 후 parsed** | 보강 후 empty(원문결측) | 보강 후 failed(내용無) | 개선 |
|---|---:|---:|---:|---:|---:|
| EE 효능효과 | 22,617 (98.5%) | **22,946 (99.98%)** | 3 | 4 | +329 |
| UD 용법용량 | 22,206 (96.8%) | **22,945 (99.98%)** | 5 | 3 | +739 |
| NB 사용상주의사항 | 12,553 (54.8%) | **22,886 (99.7%)** | 60 | 7 | **+10,333** |

| 종합 | 보강 전 | 보강 후 |
|---|---:|---:|
| 세 섹션 모두 parsed | 12,259 | **22,881** |
| 세 섹션 모두 empty | 47 | **4** |
| 하나라도 failed | 10,632 | **8** |
| 파서 throw | 0 | 0 |

**title 속성 누락 해소 = +11,401 section-parse** (EE 329 + UD 739 + NB 10,333).

### 3.1 허가 상태별 (보강 후 parsed)

| CANCEL_CODE_NAME | total | EE | UD | NB |
|---|---:|---:|---:|---:|
| 정상 | 18,070 | 18,066 | 18,064 | 18,014 |
| 폐업 | 2,456 | 2,454 | 2,454 | 2,452 |
| 행정(취소) | 1,433 | 1,432 | 1,433 | 1,433 |
| 취하 | 990 | 990 | 990 | 983 |
| 취소 | 4 | 4 | 4 | 4 |

정상 품목 NB: 10,966 → **18,014 / 18,070 (99.7%)**.

---

## 4. 샘플 검증

| 샘플 | 관찰 |
|---|---|
| 기존 failed → title 보강 후 parsed (recovered) | 30건 확인. 예: 치약류 NB "1. 이 치약의 불소 함유량은 1,000ppm임 …" — ARTICLE title 에 저장된 실 주의사항 정상 추출 |
| NB title-only parsed | 다수. 본문 없이 ARTICLE title 만 있던 케이스가 평문화됨 |
| 기존 parsed 회귀 | **없음.** 17 테스트 PASS, title 없는 문서(본문 CDATA형)는 이전과 동일 출력 |
| 여전히 failed/empty (최대 50) | **8 rows** — 전부 해당 섹션이 DOC 라벨만 있고 내용 없음(마스크/드레싱류). 예: `에블린엔젤마스크(KF94)` EE/UD/NB 모두 내용 부재. **없는 내용을 만들지 않음** |

---

## 5. WO §10 판정 = GO

| 조건 | 충족 |
|---|---|
| EE/UD/NB 모두 99%대 근접 | ✅ 99.98 / 99.98 / 99.7% |
| NB 55% → 99% 안팎 개선 | ✅ 54.8% → 99.7% |
| 기존 parsed 회귀 없음 | ✅ 17 테스트 PASS, 본문 추출 불변 |
| 샘플 원문 의미 보존 | ✅ title 텍스트 원문 그대로(재작성·강화·AI 없음) |

→ **GO.** 다음 = candidate official text staging 설계.

---

## 6. 다음 단계

| 순서 | 작업 | 비고 |
|---|---|---|
| 1 | **candidate staging 설계 WO** | `WO-O4O-QUASI-DRUG-CANDIDATE-OFFICIAL-TEXT-STAGING-DESIGN-V1`. 보강 파서 평문을 `raw_payload.derivedOfficialText.{efficacy,dosage,caution}` 로 스테이징(원문 XML 무손실 유지, SPD 아님). apply 시 사용자 승인 |
| 2 | (대기) SPD 파생 | ProductMaster(Gate B) 이후. 현재 Master 0 |

> 매장용 설명서 생성·AI 재작성은 본 트랙 범위 밖.

---

## 7. 준수 확인

| 항목 | 결과 |
|---|---|
| 운영 DB write / apply | 0 |
| ProductCandidate insert/update/delete/rawPayload 변경 | 0 |
| ProductMaster / Identifier / SPD / Image 생성 | 0 |
| 신규 파서 생성 | 0 (기존 함수 보강) |
| 기존 테스트 회귀 | 0 (9 유지 + 8 신규 = 17 PASS) |
| 배포 / migration | 0 |
| raw 대용량 파일 커밋 | 0 (로컬 dry-run artifact 만) |
| 병렬 세션(drug-otc-*) 파일 수정 | 0 (path-specific 커밋) |

이번 커밋 = 파서 1 + 테스트 1 + 본 CHECK 1.

---

**최종: 의약외품 공식원문 파서에 title 속성 편입(ARTICLE/SECTION/PARAGRAPH, DOC 라벨 제외)을 추가해 NB 54.8% → 99.7%, EE/UD 99.98% 로 개선했다. 회귀 0(17 PASS), 데이터에 없는 내용 생성 0. 판정 = GO → candidate `derivedOfficialText` 스테이징 설계로 진행(원문 무손실, SPD 는 Gate B 이후).**
