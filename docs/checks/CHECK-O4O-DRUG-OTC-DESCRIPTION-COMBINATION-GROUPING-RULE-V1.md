# CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1

Status: DONE (정정판 v2) — 운영 DB read-only 조사 + 복합제 그룹핑 규칙 설계 (2026-07-07)
WO: `WO-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1`
Scope: OTC 복합제 후보 그룹핑 규칙 + 병합/분리 + 과병합 예외 + 100그룹 기여도. **DB write 0. 신규 설명서 작성 0.**

> **핵심 결론(정정): 복합제 경구 기여는 6~14그룹이 아니라 실제로는 훨씬 크다.** 복합제 탐지를 **ATC 조합코드**로 직접 하면 경구 특정-조합 복합제 = **1,611 품목 / 40 ATC 패밀리**이며, mfr≥2 & grounded 기준 **ATC 패밀리 31 / Key C(ATC+함량+제형) 137 그룹**이다. → **단일 32 + 복합 경구로 100그룹 도달 가능(GO)**. 단 복합제는 조합 성분·함량이 DB 구조화 필드에 없어 **기본값 `약사 검토 강화`**(자동초안 아님)이며, **감기약 R05X(3,535품목·331처방)는 catch-all 과병합으로 auto 제외**, 점안·외용 복합은 route WO 이관.

---

## 0. 정정 사유 (이전 커밋 `acdc02314` 대비)

이전 v1(커밋 `acdc02314`)은 복합제 탐지를 **name 마케팅 키워드(`복합|플러스|더블|파워|+`) → 그 안에서 ATC 조합코드** 순으로 게이트했다. 그 결과 경구 진짜-복합제 = **75 품목**, 그룹 6~14, "복합제만으론 100 불가·route가 결정적" 으로 결론냈다.

**문제:** 실제 복합제 다수는 이름에 마케팅 키워드가 없는 **브랜드명**이다(뇌선 N02BE51, 콘택골드 R06AB54, 비큐정 A06AB52, 원펜정 M01AE51, 노플정 R01BA52…). name-키워드 게이트가 이들을 전부 탈락시켰다.

**실측 증명(경구 특정-조합 복합제 1,611품목 대상):**

| 구분 | 품목 |
| --- | ---: |
| ATC 조합코드 경구 복합제(정/캡슐) 전체 | **1,611** |
| ↳ name 키워드 보유(=v1 게이트가 잡은 것) | **75** |
| ↳ name 키워드 없음(=v1 게이트가 버린 진짜 복합제) | **1,536** |

v1 의 "75"는 1,611의 **4.7%**에 불과했다. 따라서 v1의 "경구 6~14"와 "route가 100의 유일 경로" 결론을 정정한다. (v1은 git `acdc02314`에 보존.)

## 1. 작업 일시 / 채널

| 항목 | 값 |
| --- | --- |
| 조사 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(`cloud-sql-proxy`, 127.0.0.1:5439~5444) → psql SELECT |
| 인스턴스 | `netureyoutube:asia-northeast3:o4o-platform-db` / DB 계정 `o4o_api`(read-only) |
| write | **0** (SELECT/GROUP BY 전용) |

## 2. 사용한 선행 문서

| 문서 | 활용 |
| --- | --- |
| `CHECK-...-GROUPING-DICTIONARY-SEED-V1.md` | 표기변형·노이즈·ATC7 hybrid·과병합 예외(생균/인공눈물) |
| `CHECK-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | 단일 NET 신규 32, route/RX 필터 |
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | §3.5 함량·§3.6 제형·§3.9 민감군 |
| 이전 v1 `CHECK-...-COMBINATION-GROUPING-RULE-V1`(acdc02314) | 정정 대상, 병합/분리 조건·grounding 상향 원칙 계승 |

## 3. 복합제 탐지 방식 (확정)

**복합제는 성분 괄호 나열이 아니라 ATC 조합코드로 식별한다.**

- name 끝 괄호에 성분 구분자(`,·/+`) 보유 = 7건뿐, 복합제 다수는 브랜드명(괄호 없음).
- `product_drug_extensions.active_ingredients`/`ingredient_summary` = OTC 전부 NULL(보수정책). `specification` 함량 = 대표 1개만.
- 한 master 의 ATC = 1개. **ATC 5th-level 조합코드**가 성분 조합을 인코딩.

**판정식:**
```text
combo = (len(ATC)=7 AND substr(ATC,6,2)::int >= 50)  OR  ATC ~ '^R05X'  OR  ATC ~ '^R05F'
(master 당 최장 ATC, 노이즈 수출/군납/비매/해외/수출명 제외)
예: N02BE51 아세트아미노펜조합 · M01AE51 이부프로펜조합 · R06AB54 클로르페니라민조합 · A06AB52 자극완하조합
```

## 4. 복합제 후보 수 (dry-run, 정정 수치)

| 단계 | 수 |
| --- | ---: |
| 원본 복합제 master(combo 판정식, 노이즈 제외) | **7,471** |
| grounding(e약은요) 있는 master | 2,407 |
| R05X/R05F 감기약 catch-all | 3,535 |
| **specific 조합코드(NON-R05X)** | **3,936** |
| ↳ 경구(정/캡슐) | **1,611** |
| NON-R05X distinct ATC(조합코드) | 40 |
| **NON-R05X Key C(ATC+함량+제형) mfr≥2 & grounded** | **137** |
| NON-R05X Key A(ATC 패밀리) mfr≥2 & grounded | **31** |

## 5. 그룹 key 비교

| key | 정의 | 그룹 수 | 과병합 | 과분할 | 판정 |
| --- | --- | ---: | --- | --- | --- |
| A | ATC 조합코드 | 41 | **큼**(R05X 1코드 5천품목) | 낮음 | ❌ 단독 불가 |
| B | ATC+함량 | 690 | 중 | 중 | △ |
| C | **ATC+함량+제형** | 906 | 낮음(R05X 제외 시) | 중(함량/제형 변형 분리) | ✅ **권장** |
| D | C+route | 906 | 낮음 | 낮음 | **= C**(route 는 ATC 파생, 추가 분할 0) |

**권장 규칙:** `복합제 그룹 = (조합 ATC코드, 함량, 제형)` [Key C]. 조합 ATC코드 = `normalized_ingredient_set` 프록시. 같은 ATC코드 내 함량/제형 변형은 효능·주의 skeleton 공유·용법만 분기(roll-up 허용). route 는 ATC 에 내포되어 별도 축 불필요.

## 6. 과병합 예외 (반드시 별도)

| 유형 | ATC | 규모 | 판정 | 사유 |
| --- | --- | ---: | --- | --- |
| **감기약 복합 catch-all** | R05X | **3,535품목/331처방** | **no_merge** | 1코드에 해열진통+항히스타민+진해+비충혈 다양조합, 성분조합 미고정 |
| 생균 복합 | A07FA51 | 161/22사 | manual_review | 균주 조합 다양 |
| 점안 복합 | S01GA51 | 91 | route WO 이관 | 점안 route |
| 외용 복합 | D08AC52·D06BB53·D02AE51 | ~200 | route WO 이관 | 도포 route |
| 비타민·미네랄 복합 | A11CC55 등 | 소수 | manual_review | 함량비 다양 |
| 해열진통/비충혈/완하 경구 복합 | N02BE51·M01AE51·R06AB54·A06AB52·R01BA52·M03BB53 | 다수 | **groupable(검토강화)** | 조합코드 고정·grounded 높음 |

> R05X 는 규모(전체 47%)로 최대이나 조합 미고정 → 자동 그룹 최대 리스크(생균·인공눈물 계열, 규모 최대).

## 7. 100그룹 기여 (등급) — 정정

복합제는 조합 성분·함량이 DB 구조화 필드에 없어(§3) **자동초안 0, 기본값 약사 검토 강화**다(v1의 grounding 상향 원칙 계승). 단 **groupable 후보 자체는 많다.**

| 등급 | 의미 | 규모(경구 복합) |
| --- | --- | ---: |
| A 자동초안 | 조합 성분·함량 자동확인 | **0** (DB 구조화 부재) |
| B 약사검토강화(groupable) | 조합코드 고정·mfr≥2·grounded, 원문 확인 전제 | **Key C 137 / ATC 패밀리 31** |
| C 보류 | R05X 감기약 catch-all | 331처방(별도 큐레이션) |
| D route 이관 | 점안·외용 복합 | ~290 |

**질문 답변(정정):**

| 질문 | 답 |
| --- | --- |
| 복합제 축만으로 100 충분? | 경구 복합 groupable = **31 ATC 패밀리 ~ 137 Key C**. 단일 32 + 복합으로 **100 도달 가능** |
| 단일 32 + 복합 = 몇? | ATC 패밀리: 32+31=63 / Key C: 32+137=**169**(100 초과) |
| route WO 필수? | **100 draft 에 불필요**(경구 조합만으로 충분). 점안·외용·R05X 안전 처리 위해 **병행 권장**(v1은 route 를 유일경로로 봤으나 정정) |

## 8. 최종 추천 규칙

```text
1. 복합제 판정 = ATC 조합코드((len7 & 6-7≥50) or R05X/R05F)  ← name 키워드 게이트 금지(v1 오류)
2. 그룹 key = (조합 ATC코드, 함량, 제형)  [Key C]
3. R05X/R05F 감기약 = no_merge(별도 큐레이션)
4. 점안/외용(S01/D06/D08) = route WO 이관
5. 생균·비타민 복합 = manual_review
6. 경구 조합코드(N02BE51·M01AE51·R06AB54·A06AB52·R01BA52·M03BB53·M09AB52·A02BA53…)
   = groupable, 기본값 약사검토강화(조합 성분·함량 원문 확인 후 확정), 함량/제형 roll-up
7. mfr≥2 & grounded(e약은요) 필터로 후보 확정
```

## 9. 판정 = GO (조건부)

| 기준 | 충족 |
| --- | --- |
| 그룹핑 key 확정 | ✅ Key C |
| groupable 후보 충분 | ✅ 137 Key C / 31 ATC 패밀리(경구) → 100 도달 가능 |
| 과병합 예외 문서화 | ✅ §6 (R05X·생균·점안·외용) |
| 100 경로 수치화 | ✅ §7 (32+31~137) |

조건: 복합제 기본값 **약사검토강화**(자동초안 아님), **R05X auto 제외**, 점안/외용 route 이관.

## 10. 다음 WO 제안

| 우선 | WO | 사유 |
| --- | --- | --- |
| 1 | `WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1` | 단일 32 + 복합 경구(Key C, R05X·route 제외) 혼합 축 100 초안. **착수 가능** |
| 2 | `WO-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1` | R05X 감기약·점안/외용 복합 route별 템플릿·수동 큐레이션(병행) |
| 3 | `WO-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-REFINEMENT-V1` | R05X 를 e약은요 원문으로 세분 가능한지 후속 |

## 11. 준수 확인

```text
DB write 0 · 신규 설명서 0 · SPD/ProductDrugExtension/canonical 변경 0
매장 콘텐츠 연결 변경 0 · 배포 0 · 마이그레이션 0 · SELECT 전용
병렬 세션(drug-otc-description-draft-*) 파일 수정 0
```

## 12. 완료 기준 대조 (WO §8)

| 기준 | 충족 |
| --- | --- |
| 복합제 후보 수 변화 | ✅ §4 (7,471 → NON-R05X 3,936 → 경구 1,611 → Key C GO 137) |
| 그룹 key별 비교 | ✅ §5 (A41/B690/C906/D=C) |
| 과병합 예외 | ✅ §6 |
| 최종 추천 규칙 | ✅ §8 (Key C, name 게이트 금지) |
| 100 도달 재판정 | ✅ §7 (GO, 32+31~137) |
| DB write 0 / 설명서 0 | ✅ §11 |

---

**최종(정정): OTC 복합제는 ATC 조합코드로 식별해야 하며(name 키워드 게이트는 진짜 복합제의 95%를 탈락시킴 — v1 오류 정정), 경구 특정-조합 복합제는 1,611품목/31 ATC 패밀리/137 Key C(mfr≥2 & grounded)로 충분히 크다. 그룹핑 규칙 = (조합 ATC코드 + 함량 + 제형)=Key C, 기본값 약사검토강화(조합 성분·함량 DB 부재로 원문 확인 필수). 단일 32 + 복합 경구로 100그룹 도달 가능(GO). R05X 감기약(3,535품목·331처방)은 catch-all 과병합으로 auto 제외, 점안·외용 복합은 route WO 이관. DB write 0.**
