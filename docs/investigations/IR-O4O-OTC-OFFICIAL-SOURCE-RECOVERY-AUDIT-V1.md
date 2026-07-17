# IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1 — 공식 원천 복구 조사

WO: `IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1` · 일자: 2026-07-16 · 상태: 완료 (조사)
근거: [SAFETY-OMISSION-AUDIT §4](../checks/CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1.md) (원문 유실) · [GROUP-SPLIT-AUDIT §1](../checks/CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md) (첨가제 원천 필요)

> **read-only 조사.** DB write **0** · 콘텐츠 변경 **0** · 코드 변경 **0**. SELECT + 코드 정독 + raw 파일 확인만.

---

## 1. 결론

> **두 준비 과제(e약은요 원문 유실 · 첨가제 원천)는 동일한 하나의 공식 원천으로 해결된다 — 「의약품 제품 허가정보(완제의약품 허가상세)」.** 연결 키(품목기준코드)는 대상 master 에 **100% 존재**한다.
>
> | 과제 | 유실/부재 지점 | 복구 원천 | 연결 키 |
> |---|---|---|---|
> | **① e약은요 원문 유실** | **e약은요 API 자체**(우리 처리 아님) | 제품허가정보 **허가사항 문서**(사용상주의사항 등 원문) | 품목기준코드 |
> | **② 첨가제 부재** | e약은요·DUR 에 첨가제 정보 없음 | 제품허가정보 **원료약품 및 그 분량**(유효성분+첨가제) | 품목기준코드 |
>
> **e약은요 재수집은 무의미**(원본 API 가 이미 유실). **DUR API 는 첨가제 원천이 아님**(병용·연령·임부 금기 규칙만). **완제의약품 허가상세 = 두 문제 공통 원천.**

---

## 2. ① e약은요 원문 유실 — 지점 확정

### 2-1. 유실 지점 추적 (우리 처리는 무결)

`< 10 mL/min` 같은 부등호 구간이 사라진 지점을 파이프라인 역방향으로 추적:

| 단계 | 코드 | 유실? |
|---|---|:---:|
| SPD 렌더(composer→sanitize) | `easy-drug-shared-description-derive.service.ts:60` — 텍스트를 esc 없이 `<p>` 삽입 후 `sanitizeDescriptionHtml`(DOMPurify) | 이 단계도 삼킬 수 있으나 **입력이 이미 유실** |
| candidate 원천 | `product_candidates.raw_payload.officialConsumerText.caution` | **이미 유실** ("청소율 \n\n이 약을…") |
| mapper | `easy-drug-info-candidate.mapper.ts:112-120` — `caution: item.atpnQesitm ?? null` **verbatim** | 무결(가공 0) |
| parser | `easy-drug-info-jsonl.parser.ts:79` — `JSON.parse(line)` **verbatim** | 무결 |
| **원본 raw JSONL** | `G:\...\public-data-api-samples\mfds-easy-drug-info-raw.jsonl` (2026-07-02 수집) | **이미 유실** — 28라인 전부 "청소율 \n\n이 약을…" |

> **결정적**: 우리가 수집한 **raw JSONL 자체가 유실 상태**다(우리 파서·mapper·derive 는 verbatim/무결). → **유실은 e약은요 openAPI 응답 자체**. MFDS 가 e약은요 소비자 요약을 생성할 때 `<` 기호를 HTML 처리에서 흘린 것으로 추정.

### 2-2. 유실 규모 (실측)

| 항목 | 수 |
|---|---:|
| e약은요 SPD canonical 전체 | 19,177 |
| **크레아티닌 청소율 뒤 수치 유실** | **145** |
| **괄호 미닫힘형 유실(부등호 등)** | **172** |
| 원천 candidate 도 동일 유실 | 27 (크레아티닌) |

### 2-3. 함의

- **e약은요 재수집으로는 복구 불가** — 원본 API 가 이미 유실.
- **e약은요는 소비자 요약이지 authoritative 허가사항이 아니다.** 완전한 임상 원문(사용상주의사항)은 **제품허가정보**에 있다.
- 복구 = e약은요 SPD 를 **제품허가정보 허가사항 문서로 대체/보강**.

---

## 3. ② 첨가제 원천

> **⚠️ 표본 검증 정정(2026-07-17, [SAMPLE-VALIDATION §0](../checks/CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1.md)):** 이 절의 원 예측 — 「MATERIAL_NAME(원료약품 및 그 분량)이 첨가제 원천」 — 은 **틀렸다**. 실호출 결과 **MATERIAL_NAME 은 유효성분만** 담는다(인테스캡슐200mg = "성분명: 아세틸시스테인"만, 아스파탐 없음). **첨가제 식별 원천은 `NB_DOC_DATA`(사용상주의사항)** 다 — 아스파탐 제품 NB_DOC 에 "아스파탐 … 페닐케톤뇨증 환자에는 투여하지 말 것"이 명시된다. 즉 NB_DOC 하나가 ①유실복구와 ②첨가제 식별을 모두 담당한다.

| 원천 | 첨가제 제공? |
|---|---|
| e약은요(efcyQesitm 등) | ❌ 소비자 요약, 첨가제 없음 |
| **DUR 품목정보 API**(data.go.kr 15059486) | ❌ **병용·연령·임부·용량 금기 규칙**만. 첨가제 조성 아님(WO 지적대로) |
| ~~MATERIAL_NAME(원료약품 및 그 분량)~~ | ❌ **정정: 유효성분만**(첨가제 미포함) — 검증 실측 |
| **의약품 제품 허가정보 — NB_DOC_DATA(사용상주의사항)** | ✅ **첨가제 경고문**(아스파탐→PKU, 대두유→과민증, 색소→과민증)으로 함유 서브그룹 식별 |

> **아스파탐·대두유·색소 함유는 사용상주의사항(NB_DOC) 경고문**으로 식별한다(예: "아스파탐 … 페닐케톤뇨증", "대두유 … 과민증"). MATERIAL_NAME 은 유효성분 표시만이라 첨가제 판정에 쓰지 않는다.

---

## 4. 복구·확인 공통 원천 — 제품허가정보 API

| 항목 | 내용 |
|---|---|
| **원천** | 식품의약품안전처_**의약품 제품 허가정보**(완제의약품 허가상세) — nedrug.mfds.go.kr / data.go.kr 오픈API |
| 허가사항 문서 | **EE_DOC_DATA**(효능효과) · **UD_DOC_DATA**(용법용량) · **NB_DOC_DATA**(사용상주의사항) — 전문 원문. 부등호는 `&lt;` 엔티티로 보존(`크레아티닌 청소율 &lt; 10mL/min` 실측 온전) |
| 첨가제 | **NB_DOC_DATA 경고문**(정정 — MATERIAL_NAME 아님, §3 참조). MATERIAL_NAME 은 유효성분만 |
| **endpoint** | `DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq06` · 필터 `item_seq` · type=json · User-Agent 필수 (검증 확정) |
| 연결 키 | **품목기준코드(ITEM_SEQ)** — 우리 `product_identifiers.MFDS_CODE` 와 동일 축 |

> ⚠️ **미검증**: 제품허가정보 NB_DOC 이 실제로 부등호 구간을 온전히 담는지는 **테스트 호출로 확인 필요**(read-only 조사 범위 밖 — 외부 API 호출). 다만 (a) 허가사항 원문은 e약은요보다 완전하고 (b) 임상 표기가 "미만" 한글이라 truncation 회피 개연성이 높다. **후속 재수집 WO 의 1단계 = 유실 148건 itemSeq 표본 호출로 NB_DOC 온전성 확인.**

---

## 5. 연결 키 — 품목기준코드 100% 보유 (실측)

| 대상 | master | **MFDS_CODE 보유** |
|---|---:|:---:|
| 분리 13그룹 공개 master | 325 | **325 (100%)** |
| 아스파탐 우선(아세틸시스테인 200) | 59 | **59** |
| 아스파탐 우선(아세트아미노펜 160) | 12 | **12** |

> **모든 대상 master 가 품목기준코드를 가진다** → 제품명 키워드 매칭 불필요. e약은요·제품허가정보 모두 ITEM_SEQ 축이므로 **직접 조인**. (원문 없는 제품은 조인 결과가 비면 **배정하지 않고 보류** — 임의 분류 금지 원칙 유지.)

---

## 6. 재수집 예상 범위·호출량

| 목적 | 대상 | 호출 |
|---|---:|---|
| e약은요 유실 복구(허가사항 문서) | **유실 172건**(우선) 또는 e약은요 전체 19,177 재기반화 | itemSeq 당 1콜(상세). 172콜(유실 우선) ~ 19,177콜(전면) |
| 첨가제(분리 13그룹) | 공개 325 master | 품목당 1콜 = **325콜** |
| 첨가제(아스파탐 우선) | 71 master | **71콜**(최우선) |

> 페이지네이션·rate limit 은 후속 WO 에서 설계. 표본(아스파탐 71 + 유실 172)부터 소규모 검증 후 확대.

---

## 7. 후속 WO 범위 (제안)

| # | WO | 내용 | write |
|---|---|---|---|
| **1** | 제품허가정보 원천 검증(표본) | 유실 172 + 아스파탐 71 itemSeq 로 NB_DOC·MATERIAL_NAME **테스트 호출** → 온전성·첨가제 제공 실증 | 0(raw 저장만) |
| 2 | e약은요 원문 복구 | 검증 후 유실 SPD 를 제품허가정보 허가사항으로 보강/대체(sanitize 시 **esc-before-sanitize** 로 부등호 보존) | canonical UPDATE |
| 3 | 첨가제 서브그룹 분리 | 원료약품 분량으로 아스파탐/대두/유당/색소 함유 master 식별 → 서브그룹 재승격([GROUP-SPLIT-AUDIT §5](../checks/CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md)) | INSERT/UPDATE |
| — | 코드 보강 | composer 의 **텍스트 esc 누락**(`derive.service.ts:60`) 수정 — 향후 부등호 재유실 차단 | 코드 |

> **부수 발견(코드 결함)**: `composeEasyDrugContent` 가 원문 텍스트를 **HTML-escape 없이** `<p>` 에 넣어, 만약 원문에 `<` 가 있으면 후속 sanitize 가 삼킨다. 현재는 원본이 이미 유실이라 무증상이나, **제품허가정보 재수집 시 원문에 `<` 가 있으면 같은 유실 재발** → §7-4 로 선반영 필요.

---

## 8. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| e약은요 재수집 원천 확정 | ✅ **제품허가정보 허가사항 문서**(e약은요 API 는 유실 원천 → 무의미) |
| 첨가제 확인 원천 확정/부재 판정 | ✅ **제품허가정보 원료약품 및 그 분량**(DUR·e약은요 는 부재) |
| 연결 키·예상 대상 수 | ✅ 품목기준코드 100% · 유실 172 / 첨가제 325(아스파탐 71 우선) |
| 후속 재수집·복구 WO 범위 | ✅ §7 (검증 표본 → 복구 → 첨가제 분리 + 코드 보강) |
| 코드·DB 변경 0 | ✅ SELECT + 정독만 |
| commit·push | ✅ |

---

## 9. 원칙 준수 확인

| 원칙 | 결과 |
|---|---|
| 식약처/공공데이터포털 공식 원천만 | ✅ 제품허가정보(MFDS) |
| 제품명 키워드만으로 연결 금지 | ✅ 품목기준코드 조인(100% 보유) |
| HTML 변환 전 원시값 보존 | ✅ §7-4 esc-before-sanitize 로 원시 보존 설계 |
| 조사 단계 DB write·콘텐츠 수정 0 | ✅ |
