# CHECK — HFF 단일 비타민·미네랄 연속 End-to-End 생산

- WO: `WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1` (Agent B)
- 일자: 2026-07-17
- 성격: 단일 영양소 그룹을 적격 규모 큰 순서로 **연속 생산 → 프로덕션 LIVE 적재**(§8 조건부 apply 사전승인). HFF 전용(의약품 미접촉).
- 선행 완료(재처리 안 함): 비타민 C 100 LIVE · 비타민 D 417 LIVE.
- **최종 상태: 19개 단일 영양소 그룹 완료(적격 모집단 소진). LIVE 1,036제품 / SPD 2,072 / write 4,144. BLOCKED 0.**

---

## 1. 결과 — 그룹별 LIVE (독립검증 전 그룹 PASS)

단일 기능성 = BASE_STANDARD 표시량 스펙 **정확히 1개 = 대상 영양소**. 적격 = 고형·비벌크·비수출·grounding·기능성 en 매핑. 정상 status = **COMPLETED_WITH_HOLDS**.

| # | 영양소(slug) | 적격/LIVE | SPD | REVIEW(코팅 등) | 단위 |
|---|---|---:|---:|---:|---|
| 1 | 아연 (zinc) | 190 | 380 | 11 | mg |
| 2 | 마그네슘 (magnesium) | 150 | 300 | 11 | mg |
| 3 | 비타민 E (vitamin-e) | 147 | 294 | 0 | mg |
| 4 | 칼슘 (calcium) | 122 | 244 | 8 | mg |
| 5 | 비오틴 (biotin) | 88 | 176 | 7 | μg |
| 6 | 철 (iron) | 65 | 130 | 4 | mg |
| 7 | 엽산 (folate) | 55 | 110 | 2 | μg |
| 8 | 비타민 A (vitamin-a) | 42 | 84 | 1 | μg(RE) |
| 9 | 셀레늄 (selenium) | 39 | 78 | 1 | μg |
| 10 | 나이아신 (niacin) | 37 | 74 | 0 | mg |
| 11 | 비타민 K (vitamin-k) | 21 | 42 | 0 | μg |
| 12 | 비타민 B1 (vitamin-b1) | 14 | 28 | 1 | mg |
| 13 | 비타민 B6 (vitamin-b6) | 13 | 26 | 0 | mg |
| 14 | 비타민 B12 (vitamin-b12) | 13 | 26 | 0 | μg |
| 15 | 판토텐산 (pantothenic-acid) | 12 | 24 | 0 | mg |
| 16 | 비타민 B2 (vitamin-b2) | 9 | 18 | 0 | mg |
| 17 | 구리 (copper) | 9 | 18 | 0 | μg |
| 18 | 요오드 (iodine) | 7 | 14 | 0 | μg |
| 19 | 망간 (manganese) | 3 | 6 | 0 | mg |
| | **합계** | **1,036** | **2,072** | ~46 | |

REVIEW = 전부 공식 성상 "코팅정" `D-CLAIM-GROUNDED-002`(주장 아님, known-safe, VD/유산균 선례 동격). **BLOCKED 0 · 실제 콘텐츠 위반 0.**

미처리: 크롬(chromium) 0 — 표시량 추출 실패(원문 포맷 상이, 6건). **HOLD_GROUNDING** 로 격리, 재개 조건 = 추출 포맷 보강.

## 2. DB 적재 (프로덕션, 독립검증)

각 그룹 dry-run(프리로드 9종 + 실제 INSERT/UPDATE → 사후검증 → ROLLBACK) → apply(COMMIT) → **별도 연결 독립검증 13종 PASS**.

```text
그룹 19 · product_masters 1,036 · product_candidates UPDATE(approved_new_master) 1,036
         shared_product_descriptions STORE canonical 2,072 (ko 1,036 + en 1,036)
         실제 write 4,144
고정값: regulatory_type=건강기능식품 · barcode NULL · description_type=STORE · status=canonical
        source_type=o4o_hff_generated · mfds_permit_number=STTEMNT_NO · tags=[batch:single-nutrient-{slug}]
검증: master N · candidate N · ko N · en N · source_type 2N · canonicalDup 0 · 신고번호유일 N · barcodeNULL N · 실제write 4N · 롤백매니페스트
```

HFF `o4o_hff_generated` STORE canonical 전체(유산균 192+VC 100+VD 417+단일영양소 1,036+타 에이전트) = master 2,216.

## 3. 생산 파이프라인 (영양소 파라미터화)

```text
hff-nutrient-inventory.ts    그룹 집계·우선순위 (raw, read-only)
hff-nutrient-registry.ts     공식 기능성 ko→en 매핑 SSOT + 영양소 메타(slug/표시명)
hff-nutrient-select.ts       --nutrient → 단일 그룹 적격 풀 + HOLD
hff-nutrient-compose.ts      결정적 grounded composer (기능성 ko=원문추출·en=레지스트리)
hff-nutrient-generate.ts     compose + Guard 전수 + json/HTML
hff-nutrient-store-canonical-apply.ts  프리로드 9종 + dry-run(exec+rollback) / --apply(COMMIT)
hff-nutrient-verify-committed.ts       별도 연결 독립 사후검증
```

**grounding 원칙**: 단일 기능성=표시량 스펙 1개. 기능성 ko=MAIN_FNCTN 추출(원문 verbatim), en=레지스트리 매핑(미매핑→HOLD_GROUNDING, 임의 번역 금지). IU·μg 무환산. 물(G-WATER) 원문 근거. per-unit 미생성(calc=false). 골다공증(칼슘 121건) 등 위험감소 기능 원문 verbatim("발생 위험 감소에 도움을 줌", 예방/치료 0).

## 4. 생산 중 규칙화 (공통 Guard 무수정)

1. **기능 문구 내부 쉼표** — "지방, 탄수화물, 단백질 대사…"(비오틴·판토텐산)를 기능 구분자로 오분할 → 종결어 뒤 쉼표만 구분(비오틴 0→88).
2. **철 라벨 `\b철\b`** — 한글에 ASCII 단어경계 미성립 → `철\s*[:(]|피로인산철` 등으로 교정(철 0→65).
3. **표시량 콤마** — "10,000μg/200mg" 콤마 미지원 → 콤마 허용(아연 131→190 등).
4. **섭취단위 개·매·스푼·젤리·필름** — 자체 파서(비타민 D 라인 이식).
5. **을/를 조사** — "{영양소}를"(아연를) → "{영양소} 섭취를" 로 조사 의존 제거.

## 5. 완료 판정 (§19)

- 19개 그룹 전부 **COMPLETED_WITH_HOLDS**(정상 LIVE + 예외 HOLD 격리). 크롬만 미처리(6건, 추출 보강 시 재개).
- 목표(§3) 충족: 단일 영양소 그룹 **19개 ≥ 5**, 적격 모집단 소진(단일 총 ~1,244 중 1,036 LIVE + HOLD/미매핑 격리).
- BLOCKED 0 · 실제 위반 REVIEW 0 · 예방/치료 0 · 근거없는 물·고함량 0 · 신고번호/ProductMaster 중복 0 · DB 독립검증 전 그룹 PASS.

## 6. HOLD 레지스트리(요약)

각 그룹 `hff-{slug}.json` 옆 select 시 `*.hold.json`(scratchpad). 주요 HOLD: 복합(→Agent D) 최다 · 액상(→Agent F) · 수출전용 · grounding(표시량/기능성 미매핑=대개 복합 누수) · 벌크.
