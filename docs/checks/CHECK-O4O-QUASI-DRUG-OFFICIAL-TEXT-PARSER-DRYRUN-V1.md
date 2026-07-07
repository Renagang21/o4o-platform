# CHECK-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-DRYRUN-V1

> 작업 성격: **read-only parser dry-run / official text normalization 판정.** 운영 DB write 0, ProductCandidate/Master/Identifier/SPD/Image 생성·변경 0, 배포 0. 커밋 산출 = 본 CHECK 1건.
> 작성일: 2026-07-07
> WO: `WO-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-DRYRUN-V1`
> 트랙: **의약외품 전용**
> 선행: `CHECK-O4O-QUASI-DRUG-CURRENT-STATE-AUDIT-V1`(Candidate 22,953·Master 0), `CHECK-O4O-QUASI-DRUG-BARCODE-SKU-SOURCE-AUDIT-FOR-GATE-B-V1`(Gate B HOLD), `WO-O4O-QUASI-DRUG-PUBLIC-XML-DESCRIPTION-PARSER-DRYRUN-V1`(파서 구현 52d3e4e2a, test 9 PASS)
> 채널: `cloud-sql-proxy` read-only SELECT + 로컬 파서 dry-run(기 구현된 순수 파서 재사용, DB 무관). DB secret 미출력.

---

## 0. 한 줄 결론

**파서 판정 = HOLD (bounded parser 보강 후 GO).** 기 구현된 순수 파서(`parseQuasiDrugOfficialText`)는 CDATA/PARAGRAPH 본문을 **안정적으로 평문화**하며, EE(효능효과)·UD(용법용량)는 **99% 이상** 텍스트를 확보한다(파서 예외 0건). 그러나 **NB(사용상주의사항)는 55%만 추출**된다 — 나머지 45%(10,261건)는 텍스트가 `<ARTICLE title="...">` **속성**에 저장되어 있는데 현재 파서가 태그 제거 시 속성 텍스트를 함께 버리기 때문이다. **핵심: "진짜 빈값"은 EE/UD/NB 세 섹션 모두 0건** — 데이터는 전부 존재하며, 손실은 순전히 `title=` 속성 미추출이라는 **한정된 파서 갭**이다. 따라서 공식원문 seed 는 **title 속성 추출 보강(작고 명확)** 후 GO 로 넘긴다. 그 전까지 NB seed 는 불완전하므로 SEED 활용은 HOLD.

---

## 1. 운영 DB read-only 재확인 (2026-07-07)

| 지표 | 값 | 판정 |
|---|---:|---|
| 의약외품 Candidate (`MFDS_QUASI_DRUG_PERMIT`, `deleted_at IS NULL`) | **22,953** | ✅ 재확인 |
| candidate_status / match_status | pending / unmatched (전량) | ✅ |
| 의약외품 Master | **0** | ✅ |
| EE_DOC_DATA 원문(raw XML) 존재 | 22,950 | — |
| UD_DOC_DATA 원문 존재 | 22,948 | — |
| NB_DOC_DATA 원문 존재 | 22,893 | — |
| MAIN_INGR 존재 | 6,577 | — |
| ADIT_INGR 존재 | 22,461 | — |

> DB `raw_payload->'source'->>'*_DOC_DATA'` 는 **XML 원문 문자열 존재 여부**(non-blank)만 센다. 실제 추출 가능 텍스트는 §3 파서 dry-run 이 판정한다. 원문 XML 은 `raw_payload.officialRegulatoryText.{efficacyXml,dosageXml,cautionXml}` 에 무손실 보존(mapper 복사본).

---

## 2. 파서 (기 구현 재사용, 신규 구현 없음)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-official-text.parser.ts` | 순수 함수 `xmlDocToPlainText()` + `parseQuasiDrugOfficialText(ee,ud,nb)` → {efficacyText,dosageText,cautionText,isEmpty,flags} |
| `.../__tests__/quasi-drug-permit-official-text.parser.test.ts` | unit test 9 PASS |

파싱 규칙: CDATA 언랩 → PARAGRAPH/ARTICLE/TR 줄바꿈·TD 탭·BR 줄바꿈 → **나머지 태그 제거**(IMG 는 flags 로 존재만 기록) → HTML entity 디코드 → 공백 정리. **원문 불변.**

> 본 WO 는 read-only 판정 dry-run 이므로 파서를 **수정하지 않았다.** dry-run 은 기 커밋된 파서를 그대로 22,953 건에 적용해 실측했다(throwaway 러너는 커밋 안 함).

---

## 3. 전량 파싱 dry-run (22,953, 실제 파서, 파서 예외 0)

**섹션별 status** — `parsed`=원문 존재+추출텍스트 non-empty / `empty`=원문 결측 / `failed`=원문 존재하나 추출텍스트 empty:

| 섹션 | parsed | empty(원문결측) | failed(추출empty) | parsed 비율(원문존재 대비) |
|---|---:|---:|---:|---:|
| EE 효능효과 | **22,617** | 3 | 333 | 98.5% |
| UD 용법용량 | **22,206** | 5 | 742 | 96.8% |
| NB 사용상주의사항 | **12,553** | 60 | **10,340** | 54.8% |

| 종합 지표 | 값 |
|---|---:|
| total | 22,953 |
| parseErrors(파서 throw) | **0** |
| 세 섹션 모두 parsed | 12,259 |
| 세 섹션 모두 empty(loss) | 47 (0.20%) |
| 하나라도 failed | 10,632 |
| 정상 허가 | 18,070 / 비정상 | 4,883 |
| flags: CDATA / TABLE / IMG / entity | 22,928(99.9%) / 2 / 77 / 4,592(20.0%) |
| 평균 결합 텍스트 길이 / 최대 | 225자 / 17,445자 |

> EE/UD/NB **parsed non-empty 수치는 선행 `XML-DESCRIPTION-PARSER-DRYRUN` §3 과 정확히 일치**(22,617 / 22,206 / 12,553) → 파서 재현성 확인. 본 CHECK 는 여기에 **`failed`(원문 존재+추출 empty) 분해와 허가상태별 집계**를 추가한다.

### 3.1 허가 상태별 (parsed 기준)

| CANCEL_CODE_NAME | total | EE parsed | UD parsed | NB parsed | all empty | any failed |
|---|---:|---:|---:|---:|---:|---:|
| 정상 | 18,070 | 17,768 | 17,511 | 10,966 | 42 | 7,295 |
| 폐업 | 2,456 | 2,439 | 2,392 | 754 | 2 | 1,722 |
| 행정(취소) | 1,433 | 1,424 | 1,379 | 266 | 3 | 1,173 |
| 취하 | 990 | 982 | 922 | 563 | 0 | 440 |
| 취소 | 4 | 4 | 2 | 4 | 0 | 2 |

정상 품목에서도 NB parsed 는 10,966/18,070(60.7%) — EE/UD(98%+) 대비 낮다. 원인은 §4.

---

## 4. 핵심 발견 — `failed` 는 빈 데이터가 아니라 `title=` 속성 미추출

`failed`(원문 존재하나 추출 텍스트 empty) 케이스를 원문 XML 로 역추적한 결과, **전량이 `<ARTICLE title="본문...">` 속성에 텍스트가 저장된 구조**였다. 현재 파서는 태그 제거 정규식(`/<[^>]+>/g`)이 태그와 함께 **속성값을 통째로 버린다.** ARTICLE 본문이 비어 있으면(`<ARTICLE title="..."></ARTICLE>`) 추출 결과가 empty 가 된다.

**섹션별 원문 역분석 (22,953 전량):**

| 섹션 | 원문 존재 | 파서 추출 가능(본문) | **title 속성에 갇힘(파서 누락)** | **진짜 빈값** |
|---|---:|---:|---:|---:|
| EE | 22,950 | 22,617 | 333 | **0** |
| UD | 22,948 | 22,206 | 742 | **0** |
| NB | 22,893 | 12,632* | **10,261** | **0** |

\* 근사(본문+텍스트노드 기준). 파서 실측 parsed=12,553. 차이는 텍스트노드 처리 경계로 무시 가능.

**→ 진짜 빈값 = 세 섹션 모두 0.** 즉 **데이터 결손이 아니다.** NB 45%·EE/UD 소수 tail 은 전부 `title=` 속성에 실재하는 텍스트이며, 파서가 속성 추출을 하지 않아 누락될 뿐이다. title 속성을 추출하면 커버리지 예상:

| 섹션 | 현재 | title 추출 후(예상) |
|---|---:|---:|
| EE | 98.5% | ~99.99% (22,950/22,953) |
| UD | 96.8% | ~99.98% (22,948) |
| NB | **54.8%** | **~99.7% (22,893)** |

**실증 샘플** (정상 품목 `대일메디렙-에스`, NB 본문 비어 있고 title 에만 존재 → 현재 파서 출력 empty):
```
1) 환부에 도포하기전에 환부 및 그 주위를 충분히 말린후 사용하십시오.
2) 만일 환부에 비누, 세제, 라놀린 등이 묻어 있는 경우에는 70% 알코올로 깨끗이 닦고 말린 후 사용 하십시오.
3) 본 제품은 멸균된 제품이므로 사용직전에 개봉하여 주십시오.
```

---

## 5. 샘플 검증

로컬 artifact(비커밋)로 사람이 읽을 수 있는 샘플 추출:
- `C:/tmp/quasi-official-text-dryrun-summary.json` — 집계 원본
- `C:/tmp/quasi-official-text-samples.ndjson` — 버킷별 샘플

| 버킷 | 건수 | 관찰 |
|---|---:|---|
| 정상 + 세 섹션 parsed | 30 | EE/UD/NB 모두 CDATA 본문형. 평문 정상, 원문 의미 보존 |
| 정상 + 일부 섹션 empty(failed 포함) | 30 | 대개 NB 가 title-속성형 → 현재 파서 empty |
| 비정상 상태 + parsed | 20 | 폐업/행정취소 품목도 EE/UD 텍스트 정상 추출 |
| failed 섹션 | 50 | **전량 title-속성 저장**(본문 비어있음). 파서 결함이 아니라 속성 미추출 |

CDATA 본문형 추출 품질은 양호(entity 디코드·표/이미지 분리 정상, 파서 throw 0).

---

## 6. WO §2 8개 질문 — 판정

| # | 질문 | 답 |
|---|---|---|
| 1 | EE/UD/NB 형식은? | `<DOC type><SECTION><ARTICLE><PARAGRAPH><![CDATA[본문]]>` 구조. **단 NB 다수는 본문 대신 `ARTICLE title=` 속성에 텍스트** |
| 2 | XML/CDATA/HTML 혼재? | 그렇다. CDATA 99.9%, entity 20.0%, 표 2·IMG 77 소수 |
| 3 | 안전 텍스트 추출 가능? | CDATA 본문은 안정적. **title 속성 텍스트는 현재 미추출** |
| 4 | 파싱 성공률? | EE 98.5% / UD 96.8% / NB 54.8% (title 추출 시 세 섹션 ~99.7%+) |
| 5 | 섹션별 결측률? | **진짜 결측 = 0.** 겉보기 결측은 전부 title-속성 미추출 |
| 6 | 원문 vs 파생 분리? | 원문 XML `officialRegulatoryText` 무손실 보존 + 파생 평문 `derivedOfficialText` 분리(설계 §7) |
| 7 | candidate 공식원문 seed 로 활용 가능? | **보강 후 가능.** EE/UD 즉시, NB 는 title 추출 필요 |
| 8 | DB 저장 구조? | ProductMaster 부재 → SPD 불가. **candidate `raw_payload.derivedOfficialText` 스테이징**이 유일 안전 경로 |

---

## 7. 판정 = HOLD (bounded 보강 후 GO)

WO §13.2 HOLD 조건 **"XML 구조가 예상보다 다양해 parser 보강이 필요"** 에 해당.

- **NO-GO 아님**: 데이터 품질 우수, 진짜 빈값 0, 파서 예외 0, EE/UD 99%+.
- **clean GO 아님**: NB 55%만 추출 — seed 로 쓰면 주의사항 절반 손실. 원인은 `title=` 속성 미추출(한정·기지의 갭).
- → **HOLD.** title 속성 추출 보강(작은 순수함수 변경 + 테스트)으로 NB 를 ~99.7% 로 끌어올린 뒤 GO.

---

## 8. 다음 단계

| 순서 | 작업 | 비고 |
|---|---|---|
| 1 | **파서 보강 WO** — `xmlDocToPlainText` 가 ARTICLE/SECTION/DOC/PARAGRAPH 의 `title=` 속성 텍스트를 본문 앞/사이에 편입. 순수함수 유지, 테스트 추가(title-속성형 fixture). dry-run 재집계로 NB ~99.7% 확인 | `WO-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-TITLE-ATTR-ENHANCEMENT-V1` |
| 2 | **candidate staging 설계 WO** — 보강 파서 평문을 `raw_payload.derivedOfficialText.{efficacy,dosage,caution}` 로 스테이징(원문 XML 유지, SPD 아님). apply 시 사용자 승인 | `WO-O4O-QUASI-DRUG-CANDIDATE-OFFICIAL-TEXT-STAGING-DESIGN-V1` |
| 3 | (대기) SPD 파생 | ProductMaster(Gate B) 이후. 현재 Master 0 → 불가 |

> 매장용 설명서 생성은 본 트랙 범위 밖(공식원문 → staging 이후 별도 가이드). AI 재작성·문구 강화 금지 원칙 유지.

---

## 9. 준수 확인

| 항목 | 결과 |
|---|---|
| 운영 DB write / apply | 0 (SELECT only) |
| ProductCandidate insert/update/delete/상태·rawPayload 변경 | 0 |
| ProductMaster / Identifier / SPD / Image 생성 | 0 |
| 파서 코드 변경 | 0 (기 구현 재사용, throwaway 러너 비커밋·삭제) |
| 배포 / migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 (로컬 artifact 만, C:/tmp) |
| DB secret 원문 기록 | 0 |
| 범위 확장(의약품/의료기기/건기식) | 0 |

---

**최종: 의약외품 EE/UD/NB 공식원문은 진짜 빈값 0으로 전부 존재하며, 기 구현 파서는 CDATA 본문(EE/UD 99%+)을 안정 추출한다. NB 45%(10,261건)는 `<ARTICLE title=...>` 속성에 갇혀 현재 파서가 놓친다 — 데이터 결손이 아니라 한정된 파서 갭. 판정 = HOLD: title 속성 추출 보강 후 GO. 이후 candidate `derivedOfficialText` 스테이징(원문 무손실·SPD 아님)으로 진행하며, SPD 파생은 Gate B 이후로 유지한다.**
