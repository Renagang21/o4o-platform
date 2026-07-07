# CHECK-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1

Status: DONE — 운영 DB read-only + 100그룹 후보 큐 산출 (2026-07-07)
WO: `WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1`
Scope: OTC 매장 설명서 100그룹 **후보 큐 + 초안 작성 대상** 확정. **DB write 0. SharedProductDescription/canonical apply 0. AI 대량 생성 0.**

> **결론: GO — 100그룹 후보 구성 완료 (단일 32 + 복합 경구 68 = 100).** 단 draftEligibility 는 **약사 검토 강화가 지배적(review 89 / ready 3 / hold 8)** 이다 — 이는 의약품 안전 특성상 정상이며 결함이 아니다. 복합제는 조합 성분·함량이 DB 구조화 필드에 없어 전량 `pharmacist_review_required`. 다음은 초안 실제 작성이 아니라 **약사 검토 큐(REVIEW WO)** 로 이어간다.

---

## 1. 작업 일시 / 채널 / 준수

| 항목 | 값 |
| --- | --- |
| 조사 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(`cloud-sql-proxy`, 127.0.0.1:5445~5448) → psql SELECT |
| write | **0** (SELECT/GROUP BY 전용) |

```text
DB write 0 · SharedProductDescription/canonical apply 0 · ProductDrugExtension 변경 0
매장 콘텐츠 연결 변경 0 · 배포 0 · 마이그레이션 0 · AI 대량 생성 apply 0
병렬 세션(drug-otc-description-draft-*) 파일 수정 0
```

## 2. 사용한 선행 문서

| 문서 | 활용 |
| --- | --- |
| `CHECK-...-COMBINATION-GROUPING-RULE-V1.md`(정정판 59b3712a4) | 복합제 Key C 규칙·과병합 예외·경구 groupable 137 |
| `CHECK-...-GROUPING-DICTIONARY-SEED-V1.md` | 표기변형·노이즈·ATC7 hybrid |
| `CHECK-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | 단일 NET 신규 32 목록(§13) |
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | 초안 블록·근거 원칙·민감군(§3.9) |
| `CHECK-...-50-GROUP-DRAFT-V1` 외 완료 그룹 CHECK | anti-join(완료 57 트리플) |

## 3. 후보 산출 기준

```text
공통: drug_category='otc' · 수출/군납/비매/해외/수출명 제외 · 완료 57 트리플 제외 · grounded(e약은요) 필수
단일: NET 신규 32 (선행 §13, 단일·경구·route 제외)
복합: Key C(조합 ATC코드 + 함량 + 제형) · NON-R05X specific 조합코드 · 경구(정/캡슐/연질/과립/액)
      · mfr≥2 & grounded · 과병합 예외 제외(R05X 감기약 · 점안 S01 · 외용 D · 생균 A07FA51 · 비타민 A11)
```

## 4. 최종 100그룹 구성

| 구분 | 그룹 수 | 비고 |
| --- | ---: | --- |
| 단일제 신규 | **32** | 자동 3 / 검토강화 21 / 저grounding 8 (선행 §13) |
| 복합 경구(Key C) | **68** | ATC 조합코드 14계열, mfr≥2 & grounded |
| **합계** | **100** | 단일 32 + 복합 68 |
| 예비(reserve) | 26+ | 비타민복합 A11(2) · 생균 A07FA51(4) · 과립/액 overflow · 단일 함량변형 D-tier |

### 4.1 복합 68 — ATC 계열 분포 (전체 목록 = CSV 아티팩트)

| ATC | 약효군(대표) | Key C 그룹 | 대표 제품 |
| --- | --- | ---: | --- |
| A06AB52 | 자극성 완하(변비) | 14 | 비센큐정·씨락정·쾌통정 |
| R01BA52 | 경구 비충혈(코감기) | 11 | 가네카정·코코엔캡슐 |
| R06AB54 | 항히스타민 복합(콘택 계열) | 8 | 콘택골드캡슐·감콜파워캡슐 |
| N02BE51 | 아세트아미노펜 복합(해열진통) | 8 | 편해정·수프리정 |
| M01AE51 | 이부프로펜 복합(소염진통) | 6 | 원펜정·이브엔연질캡슐 |
| R01BA53 | 경구 비충혈 복합 | 5 | 콜민-에이정 |
| A04AD51 | 진토(멀미) 복합 | 4 | 메카인정·키미테정 |
| M03BB53 | 근이완 복합 | 3 | 담엔쿨정·리렉사정 |
| M09AB52·A06AC51·A02BA53·R06AA52·P03AC51·C05CA53 | 근골격·완하·위산·항히스타민·구충·정맥 복합 | 9 | 인플라정·파모컴정·프라본정 등 |

> 전체 68행 = `docs/checks/artifacts/o4o-drug-otc-description-100-group-combo-candidates-v1.csv` (groupNo·atc·strength·form·productCount·mfrCount·groundedCount·대표제품).

### 4.2 단일 32 (선행 §13 재수록, 요약)

- **자동 3:** 아세트아미노펜 325mg 정 · 브롬화부틸스코폴라민 10mg 정 · 비타민E 1000IU 연질캡슐
- **검토강화 21:** 밀크시슬엑스 350 연질캡슐 · 은행엽엑스 120/40 정 · 미세정제플라보노이드 500 정 · 콘드로이친 400 캡슐 · 콜레칼시페롤 정 · 카페인무수물 50 정 · 브롬헥신 8 정 · 철-아세틸트랜스페린 200 캡슐 · 아셀렌산 · 인산벤프로페린 · 아스피린 100 캡슐 · 건조수산화알루미늄겔 정 · 덱시부프로펜 150 정 · 아세트아미노펜 350/80 정 · 폴산 0.4 정 등
- **저grounding 8:** 밀크시슬 175 · 아스코르빈산 1000 정 · 나프록센 250 정 · 디시클로민 · 하이페리시 · 이부프로펜 200 캡슐 · 니코틴산아미드 · 덱시부프로펜 300 캡슐

## 5. 그룹별 초안 재료 필드 (큐 스키마)

각 그룹은 아래 필드로 큐에 적재(운영 시). CSV 는 복합 68 을 우선 담았다.

```text
groupNo · sourceType(single|combination) · groupKey · representativeAtc · ingredientOrComboName
strength · dosageForm · route · representativeProducts · manufacturerCount · productCount
groundingSource(e약은요) · riskLevel · draftEligibility · reviewReason
```

## 6. draftEligibility 통계

| draftEligibility | 그룹 | 구성 | 사유 |
| --- | ---: | --- | --- |
| `ready` | **3** | 단일 자동 3 | 단일성분·고grounding·경로명확 |
| `pharmacist_review_required` | **89** | 복합 68 + 단일 검토강화 21 | 복합=조합 성분·함량 원문 확인 필수 / 단일 검토강화 |
| `hold` | **8** | 단일 저grounding 8 | e약은요 ≤2, 근거 부족 |
| `exclude` | (별도) | R05X·점안·외용·생균·비타민·RX | §3 제외 기준 |

**균형 판정:** 복합 68 / 단일 32 — 복합이 다수이나 서로 다른 약효군(변비·비충혈·해열진통·항히스타민·근이완 등)으로 분산되어 과대표집 아님. **review 비율 89%는 의약품 특성상 정상**(단일제조차 약사 확인이 기본, 복합은 조합 근거 원문 필수). ready 3 은 설계상 작다.

## 7. 초안 작성 기준 · 대표 스켈레톤

> **이번 WO 는 후보 큐까지.** 각 그룹 실제 초안 본문은 **REVIEW WO 에서 e약은요 원문 grounding + 약사 확인 후** 작성한다. 효능 확대·질환 과장·복용법 일반화·주의 생략·AI 추정·광고 문구 **금지**(가이드). 아래는 **형식 스켈레톤**(효능·주의는 원문 확정 전까지 placeholder).

```text
[그룹 초안 스켈레톤 — 예: A06AB52 자극성 완하 복합(변비), 5mg 정]
1. 어떤 제품군인가: 자극성 완하 성분 복합 OTC(변비 완화). 대표=비센큐정 등(제조사 16)
2. 매장 설명 핵심: [e약은요 효능효과 원문 확정 후 기입]
3. 복용/사용 확인: [용법용량 원문 확정 후 기입]
4. 주의가 필요한 경우: [사용상주의 원문 확정 후 기입 — 장기 복용 주의 등]
5. 약사 확인 필요 문구: "복용 전 약사와 상담하세요"(복합제 기본)
6. grounding 메모: e약은요 grounded={groundedCount}/{productCount}, ATC=A06AB52
```

> 단일 파일럿(에르도스테인 300 캡슐)의 완성형 초안은 `CHECK-...-ONE-GROUP-...-PILOT-V1` 에 있으며 본 큐의 형식 exemplar 로 재사용한다.

## 8. 100개 달성 여부 판정 (WO §5.5)

| 질문 | 답 |
| --- | --- |
| 100개 후보 안전 구성? | ✅ 32 + 68 = 100 (전량 grounded·noise/완료/과병합 예외 제외) |
| ready/review/hold 비율? | 3 / 89 / 8 — **review 지배적(정상, 의약품 특성)** |
| 복합제 과대표집? | 68/100 복합이나 14 ATC 계열 분산 → 균형 OK |
| route 큐레이션 WO 필요? | 병행 권장(감기약 R05X·점안·외용은 별도) — 본 100 에는 미포함 |

## 9. 판정 = GO

100 후보 구성·grounding 확인·제외 기준 명확·검토 큐 스키마 확정. 단 **자동 초안(ready)은 3 뿐**이므로, 실제 본문은 약사 검토 기반으로 진행한다(자동 대량 생성 아님).

## 10. 다음 WO 제안

| 우선 | WO | 사유 |
| --- | --- | --- |
| 1 | `WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-REVIEW-V1` | 100 큐 중 pharmacist_review_required 89 를 e약은요 원문 grounding + 약사 확인으로 초안 확정 |
| 2 | `WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-APPLY-PLAN-V1` | 확정 초안의 draft DB 적재/SPD 승격 계획(승인 필요) |
| 3 | `WO-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1` | R05X 감기약·점안·외용 복합 route별 큐레이션(병행) |

## 11. 완료 기준 대조 (WO §8)

| 기준 | 충족 |
| --- | --- |
| DB write 0 / SPD apply 0 | ✅ §1 |
| 최종 100그룹 후보 목록 | ✅ §4 + CSV 아티팩트 |
| ready/review/hold 통계 | ✅ §6 (3/89/8) |
| 복합제 Key C 적용 확인 | ✅ §3·§4.1 |
| R05X/route/생균/비타민 예외 제외 확인 | ✅ §3 |
| CHECK 커밋·푸시 | ✅ 본 문서 |

---

**최종: OTC 매장 설명서 100그룹 후보를 단일 32 + 복합 경구 68(Key C, R05X·점안·외용·생균·비타민 제외)로 구성했다(GO). draftEligibility 는 ready 3 / pharmacist_review_required 89 / hold 8 로 약사 검토가 지배적이며, 이는 의약품 안전 특성상 정상이다. 복합제는 조합 성분·함량이 DB 구조화 필드에 없어 전량 약사 검토 큐로 이관하며, 실제 초안 본문은 REVIEW WO 에서 e약은요 원문 grounding + 약사 확인 후 작성한다. DB write 0.**
