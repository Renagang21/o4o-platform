# NB_DOC 대량 수집 결과 — WO-O4O-OTC-NB-DOC-BULK-FETCH-V1

> 식약처 완제의약품 허가상세 API(`DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq06`)에서 OTC 대상의 **`NB_DOC_DATA`(사용상주의사항) 원문**을 대량 수집한 결과. **수집·보존만** — DB write·설명서 수정 없음.

## 구성

| 파일 | 내용 |
|---|---|
| `targets.json` | 대상 236 item_seq (Set A 유실 136 + Set B 13그룹 100, 중복 0). 각 item_seq 의 setA/setB·lossReason·groupKeys |
| `responses/<item_seq>.json` | 품목별 **원본 응답 body**(가공 없음). 236개 |
| `manifest.json` | 조회 결과 — 품목별 status·NB_DOC 길이·크레아티닌 복구·첨가제 식별 + 집계 |

## 대상 선정 (read-only DB 도출)

- **Set A (e약은요 원문 유실)**: `shared_product_descriptions`(source_type=`mfds_easy_drug`, status=canonical) 중 유실 신호 → distinct `item_seq`(=MFDS_CODE) 136.
  - `creatinine` 27: "크레아티닌 청소율" 뒤 수치 유실 (감사 §4 = 145 master / 27 원천 candidate 와 일치).
  - `paren_suspect` 109: 문단내 미닫힘 괄호(`[(][^)]*</p>`) — `<…>` 제거로 괄호가 닫히지 않은 신호(일부 원본 서식 오탐 가능, 복구 판정은 NB_DOC 대조로 후속 WO).
- **Set B (첨가제 분류 13그룹)**: [GROUP-SPLIT-AUDIT](../../../checks/CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md) 13그룹 공개 master 325 → canonical STORE(`mfds_drug_otc`) + draft groupKey 로 식별 → distinct `item_seq` 100.

## 보안

- serviceKey·요청 URL 을 **파일·로그에 미기록**. 응답 body 만 저장. 전 파일 키 유출 검사 **0**.
- 원문 없는 품목(no_item 39)은 임의 보완 없이 **누락으로 기록**.

## 결과 요약 (manifest.aggregate)

| 항목 | 수 |
|---|---:|
| 대상 item_seq | 236 |
| NB_DOC 확보(ok) | 197 |
| 취소/변경(no_item, total=0) | 39 |
| 크레아티닌 유실 복구 (27 중) | **26** (1건은 NB_DOC 이 다른 표현 사용) |
| 괄호의심 109 중 NB_DOC 확보 | 109 |
| 첨가제 함유 선언 — 아스파탐 / 대두유 / 유당 / 색소 | 1 / 2 / 81 / 82 |

> **첨가제 지표 주의**: `아스파탐 1` 은 실제 결과 — 공개 아세틸시스테인200·아세트아미노펜160 제품(무테린·무코테인 등)은 대부분 아스파탐 무함유(인테스캡슐 등 아스파탐 제품은 공개 master 집합에 없음). `유당 81·색소 82` 는 흔한 부형제라 높음. **함유 vs 일반 언급·부정문("함유하지 않음")의 정밀 판정은 후속 첨가제 서브그룹 분리 WO** 에서 NB_DOC 원문 대조로 확정.

> 다음: 유실 SPD 를 NB_DOC 로 보강/대체(esc-before-sanitize 재사용) · 첨가제 함유 master 서브그룹 재승격.
