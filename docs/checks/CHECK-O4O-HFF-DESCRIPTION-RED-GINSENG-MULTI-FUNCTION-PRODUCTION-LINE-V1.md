# CHECK-O4O-HFF-DESCRIPTION-RED-GINSENG-MULTI-FUNCTION-PRODUCTION-LINE-V1

> **작업명:** 홍삼 다기능 표준형 매장용 설명서 생산 라인 (Agent C)
> **유형:** 후보 재분류 + 대량 생성·검증 — **DB write 0 · ProductMaster 0 · canonical 0 · candidate 상태변경 0**
> **결과: 생산 확정 271건(PASS 251 / grounded-REVIEW 20 / BLOCKED 0) · HOLD 16 · 파일럿 20 PASS · 홍삼 그룹 재분류 완료**
> **근거 WO:** WO-O4O-HFF-DESCRIPTION-RED-GINSENG-MULTI-FUNCTION-PRODUCTION-LINE-V1 (Agent C 전용)
> **선행:** [`CHECK-O4O-HFF-CANDIDATE-INGREDIENT-COMPOSITION-GROUPING-AUDIT-V1`](CHECK-O4O-HFF-CANDIDATE-INGREDIENT-COMPOSITION-GROUPING-AUDIT-V1.md) · 규칙 SSOT [`HFF-DESCRIPTION-RULES-SSOT-V1`](../guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md)
> **산출 데이터:** `data/product-description-guard/hff-red-ginseng-{20,production,hold}.json`
> **실측일:** 2026-07-17 (프로덕션 read-only, Cloud SQL Auth Proxy)

---

## 0. 결론

식약처 건강기능식품 후보에서 **홍삼 universe 3,577건**을 §5.1 기준으로 A/B/C/D 재분류했다. **홍삼 단일 원료·표준 다기능(A) = 734건**(면역·피로·혈행·기억·항산화 5기능 625 + 갱년기 포함 6기능 109), **변형 조합(B) = 21**, **홍삼+타 기능성 원료(C, Agent D/E 이관) = 482**, **액상·원료·정체불명(D) = 2,340**.

A 등급 중 **고형·진세노사이드 완전 기준량·섭취 파싱 적격 = 287건**을 대상으로 파일럿 20 → 추가 30(cp01~03) → 잔여 연속 생산으로 전개했다. 최신 Guard 전수 + 수동 사각지대 검증 결과 **생산 확정 271건(BLOCKED 0)**, **HOLD 16건**(개별 격리, 라인 미중지). DB write 0 — 적재는 별도 승인·이중게이트 후.

---

## 1. 범위와 무변경 확인

```text
코드(운영) 0 · DB write 0 · migration 0 · deploy 0 · ProductMaster 0 · candidate 상태변경 0 · canonical 0
DB 접근 read-only (product_candidates 집계·grounding 덤프) · 후보 삭제/archived 0
산출물 = CHECK + 설명서 초안 JSON(ko/en) + HOLD 레지스트리 + 그룹 정의표
접속 = Cloud SQL Auth Proxy(127.0.0.1) · SELECT only
```

- 대상: `product_candidates` `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` (live 41,261) 중 홍삼.
- 범위 밖(WO §1): 유산균·비타민·2~3원료 복합형·고복합·**액상 mL 모델**·HOLD 정비. 홍삼+타 기능성 원료는 **Agent D/E 이관**(포함하지 않음).

## 2. 단계 A — 홍삼 그룹 재분류 (그룹 정의표)

홍삼 universe = PRDUCT·BASE_STANDARD·MAIN_FNCTN 중 하나라도 `홍삼` 포함 = **3,577건**.

| 등급 | 정의 (§5.1) | 품목 | 처리 |
|---|---|---:|---|
| **A** | 홍삼 단일 기능성 원료 + **표준 다기능**(면역+피로+혈행+기억+항산화, ±갱년기) | **734** | 이번 생산 라인 대상 |
| **B** | 홍삼 단일 원료지만 기능성 조합 변형(축소·특이) | 21 | 세부 그룹 분리 후 후속 |
| **C** | 홍삼 + **다른 기능성 원료**(비타민·아연·바나바/코로솔산·프로바이오틱스 등) | 482 | **Agent D/E 이관** |
| **D** | 액상·원료·벌크·수출·정체불명 | 2,340 | HOLD/범위 밖 |

**A 기능성 조합 분포:** `면역+피로+혈행+기억+항산화` **625** · `+갱년기` **109**. (제조사 129곳)

**D(HOLD) 세부:** `HOLD_UNSUPPORTED_DIMENSION`(액상 성상 = 홍삼정/농축액/스틱) **1,902** · `HOLD_IDENTITY`(홍삼농축액 원료명·name-only) 437 · `HOLD_DATA_CONFLICT` 1. (C 482 중 4건은 강화 재분류에서 A/B→C 이관: co-ingredient 1 + extra-function 3 — 예 `홍삼바나바`의 "식후 혈당상승 억제" + 코로솔산 지표.)

> ⚠️ **홍삼의 대표 제형은 액상(홍삼정·농축액·스틱)이다.** universe의 과반(1,902/3,577)이 액상 성상이라 §5.2에 따라 `HOLD_UNSUPPORTED_DIMENSION`으로 분리하고, **고형·중량형으로 20건 및 이후 생산을 구성**했다.

- 판별: 액상 = 성상(SUNGSANG) 액제/농축액/시럽/점조성 액 → UNSUPPORTED. 복합 = MAIN_FNCTN·BASE에 홍삼 6기능 외 기능/원료. 물 200mL 등 **섭취 시 물 언급은 액상으로 오판하지 않음**(§8.10).

## 3. 단계 B — 파일럿 20 (고형·다양성)

A 적격 287(고형·진세노사이드 완전 기준량·섭취 파싱) 중 **제형 쿼터 + 제조사 유일 + 5/6기능 + 진세노사이드·섭취 스프레드**로 20건 선정.

- **제형:** 캡슐 4 · 젤리 4 · 정제 3 · 과립 3 · 환 3 · 분말 3
- **기능형:** 6기능(갱년기 포함) 4 / 5기능 16 · **진세노사이드** Rg1+Rb1+Rg3 합 1mg~25mg · **섭취** 1일 1·2·3회 · **제조사 20곳 유일**(한국인삼공사·서흥·알피바이오 등)

**판정: PASS 18 · REVIEW 2 · BLOCKED 0.** REVIEW 2 = `E-NAME-DERIVED-GROUNDED-002`(제품명 `홍삼 면역 젤리`·`홍이장군 면역젤리` — 명칭의 `면역`이 **공식 기능(면역력 증진)과 일치**하므로 grounded, 사람 확인용 REVIEW이며 위반 아님).

## 4. 단계 C·D — 추가 30 + 잔여 연속 생산

파일럿 통과 후 동일 grounded 생성기로 **A 적격 287 전수**를 생성·검증(cp01~cp03 = Stage C 30건 체크포인트, 이후 cp04~ = Stage D). 결과:

| 지표 | 값 |
|---|---:|
| 생성 대상(A 적격 고형) | 287 |
| **생산 확정 (clean)** | **271** (파일럿 20 + cp01~cp26) |
| PASS / grounded-REVIEW / **BLOCKED** | 251 / 20 / **0** |
| **HOLD** | **16** |

- **grounded-REVIEW 20:** `E-NAME-DERIVED-GROUNDED-002` 14(제품명=공식기능 일치) + `PRE-SRC-BASIS-UNVERIFIABLE-003` 8(표시량 표기형식이 파서 자동검증 밖이나 수치는 원문과 일치). 둘 다 사람 확인 신호이며 BLOCKED 아님.
- 271건 최종 재검사: **BLOCKED 0** 재확인. 500건 상한 대비 A 적격 풀(287)을 전량 처리(271 확정 + 16 HOLD).

## 5. HOLD 레지스트리 (16 · 개별 격리)

| HOLD 코드 | 수 | 트리거 | 예 |
|---|---:|---|---|
| `HOLD_DATA_CONFLICT` | 5 | `F-AGE-BOUNDARY-001` 연령별 섭취량 처리 필요 | 고려홍삼차골드, 홍삼분캡슐로얄 |
| `HOLD_SOURCE_ABNORMAL` | 5 | `H-COUNT-MISMATCH`·`PRE-SRC-BASIS-MISMATCH`·`Q-TRUNCATED`·진세노사이드 표기 이상 | 6년근고려홍삼차골드 |
| `HOLD_IDENTITY` | 3 | `PRE-SRC-BULK-004`(차·물에 타서), `E-NAME-DERIVED-001`(명칭 비인정 확대) | 홍삼차, 동영제 면역강화 발효홍삼 캡슐 |
| `HOLD_UNSUPPORTED_DIMENSION` | 3 | `G-CHEWABLE-002`(씹는 타브렛), `G-FORM-GENERALIZATION` | 홍삼타브렛 |

개별 HOLD는 전체 생산 라인을 중지하지 않는다(WO §7·§14). 상세 = `data/product-description-guard/hff-red-ginseng-hold.json`.

## 6. 홍삼 전용 위험 통제 (WO §8) — 검증 결과

전 271건 수동 사각지대 검증 **문제 0** — 아래 전부 충족:

- **§8.1 조합 과잉 0 / §8.2 누락 0:** ko/en 기능성 개수가 제품 원문 조합과 **정확 일치**(5기능 or 6기능). 원문에 갱년기 없으면 미기재, 있으면 기재.
- **§8.3 진세노사이드:** 원문 `Rg1+Rb1+Rg3 합 표시량(N mg/기준량)`만 사용. **고함량·진한 홍삼·흡수율·프리미엄(제품명 외) 0.** 성상 인용의 `코팅` 등 트리거어는 제거.
- **§8.4~8.8:** 공식 문구 그대로 — `혈소판 응집 억제를 통한 혈액흐름`(혈액순환·혈전·심혈관 확대 0), `기억력 개선`(치매·집중력 확대 0), `면역력 증진/피로개선`(감기·강화 0), `갱년기 여성 건강`(증상 치료·호르몬 0), `항산화`(노화방지 0). en 강화동사(improves/prevents/treats/boosts/enhances) 0.
- **§8.10 물:** 원문 섭취에 물/음용수 있을 때만 `물과 함께` — 전건 정합(ungrounded water = HOLD).

## 7. ko/en 언어 정책

- ko 정본 + en(MFDS-recognized 프레임, `may help …`). 숫자·함량·기능성 범위 동일. `H-COUNT`/진세노사이드 수치 양어 존재 전건 확인.

## 8. 반응형·형식

- 시맨틱 `sd-*` HTML, `<style>` 없음, `sd-theme-red`. 렌더러(`ContentRenderer` `storeDescriptionCss`)가 반응형 담당(계약 = STORE-DESCRIPTION-CLASS-CONTRACT). 저장 시 `sanitizeDescriptionHtml` 통과 전제(유산균 경로 재사용).

## 9. DB write / 적재 (별도 승인)

이번 WO는 **후보 확정까지만.** 적재는 승인 후 유산균 경로 재사용:

```text
최종 대상 고정(271) → 프리로드 9종 검사 → dry-run(트랜잭션 롤백) → 결과 보고 → apply(이중게이트 CONFIRM)
```

- 저장: `product_masters`(barcode NULL, regulatory_type='건강기능식품', mfds_permit_number=STTEMNT_NO) + `shared_product_descriptions`(status='canonical', description_type='STORE', source_type='o4o_hff_generated', language ko/en) + candidate `approved_new_master` 링크. canonical 불변식 = (master, type, coalesce(language,'ko')) partial-unique.
- **신고번호 유일 271 확인**(중복 0). 중복 ProductMaster/candidate 승격 없음(적재 스크립트 프리로드에서 재확인).

## 10. 완료 보고 (WO §20)

```text
홍삼 그룹 정의: universe 3,577 → A 734 / B 21 / C 482(Agent D/E) / D 2,340
20건 파일럿: PASS 18 · REVIEW 2(grounded) · BLOCKED 0
추가 30(cp01~03) 포함 전개: A 적격 287 전수
생산 전환 판정: 최종 BLOCKED 0 · 기능 누락·추가 0 · ko/en 조합 불일치 0 · 진세노사이드 오류 0 · 질병확대 0 → GO
전체 선정 287 / 작성 완료 271 / HOLD 16
PASS 251 · grounded-REVIEW 20 · BLOCKED 0
HOLD 유형: DATA_CONFLICT 5 · SOURCE_ABNORMAL 5 · IDENTITY 3 · UNSUPPORTED 3
기능 조합: 5기능 261 · 6기능 10 (확정분)
진세노사이드 표기: Rg1+Rb1+Rg3 합 표시량(mg/기준량) — 1~25mg
신규 실패 유형: 없음(복합 누출·차/물타서·연령대·씹는 타브렛은 기존 규칙으로 HOLD 격리)
자동검사: 최신 Guard 전수 + 수동 사각지대 271/271
실화면 검수: 표본(6기능·면역젤리·긴 제품명·차 계열) — 위반 0
최종 적재 후보: 271 (신고번호 유일)
프리로드 가능: 예(승인 후)
DB write: 0
```

## 11. 커밋

- 본 CHECK + `data/product-description-guard/hff-red-ginseng-{20,production,hold}.json`. 무관 파일·다른 Agent 미커밋 파일 0. 배포 없음.
