# CHECK — HFF 단일 비타민·미네랄 연속 End-to-End 생산

- WO: `WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1` (Agent B)
- 시작: 2026-07-17
- 성격: 단일 영양소 그룹을 적격 규모 큰 순서로 **연속 생산 → LIVE 적재**. 정상 그룹 status = COMPLETED_WITH_HOLDS.
- 선행 완료(재처리 안 함): 비타민 C 100 LIVE · 비타민 D 417 LIVE.

---

## 1. 단일 영양소 우선순위표 (인벤토리, raw 44,885)

단일 기능성 = BASE_STANDARD 표시량 스펙 **정확히 1개**. 적격 = 고형·비벌크·비수출·grounding·기능성 en 매핑.

| 영양소 | 적격 | 상태 | LIVE |
|---|---:|---|---:|
| 아연 | 190 | **COMPLETED_WITH_HOLDS** | 190 |
| 비타민 E | 188 | 대기 | — |
| 칼슘 | 176 | 대기 | — |
| 마그네슘 | 159 | 대기 | — |
| 비오틴 | 91 | 대기 | — |
| 비타민 A | 76 | 대기 | — |
| 철 | 69 | 대기 | — |
| 엽산 | 61 | 대기 | — |
| 셀레늄 | 51 | 대기 | — |
| 나이아신 | 38 | 대기 | — |
| 비타민 K | 22 | 대기 | — |
| 비타민 B1/B2/B6/B12·판토텐산·구리·요오드·크롬·망간 | ~90 | 대기 | — |

> 단일 영양소 적격 모집단(VC·VD 제외) 총 ~1,244. 2,000 목표는 단일 모집단 규모상 상회 불가 →
> **적격 모집단 소진**까지 진행(§3 종료조건).

인벤토리 산출 = `hff-nutrient-inventory.ts` → scratchpad/nutrient-inventory.json.

## 2. 생산 파이프라인 (영양소 파라미터화)

```text
hff-nutrient-inventory.ts   그룹 집계·우선순위
hff-nutrient-registry.ts    공식 기능성 ko→en 매핑 + 영양소 메타(slug/표시명)
hff-nutrient-select.ts      --nutrient → 단일 그룹 적격 풀 + HOLD (raw, read-only)
hff-nutrient-compose.ts     결정적 grounded composer (기능성 ko=원문추출·en=레지스트리)
hff-nutrient-generate.ts    compose + Guard 전수 + json/HTML
hff-nutrient-store-canonical-apply.ts   프리로드 9종 + dry-run(exec+rollback) / --apply(COMMIT)
hff-nutrient-verify-committed.ts        별도 연결 독립 사후검증
```

핵심 grounding 원칙: 단일 기능성 = 표시량 스펙 1개. 기능성 ko = MAIN_FNCTN 추출(원문), en = 레지스트리 매핑(미매핑→HOLD_GROUNDING, 임의 번역 금지). IU·μg 무환산. 물(G-WATER) 원문 근거. per-unit 미생성(calc=false). 골다공증 등 위험감소 기능은 원문 verbatim.

고정 적재값: regulatory_type=건강기능식품 · barcode NULL · description_type=STORE · status=canonical · source_type=o4o_hff_generated · mfds_permit_number=STTEMNT_NO · tags=[batch:single-nutrient-{slug}].

## 3. 그룹별 결과

### 3.1 아연 (zinc) — COMPLETED_WITH_HOLDS · LIVE 190

- 선정: mention 11,161 → 적격 **190**. HOLD: 복합 10,792 · 액상 91 · 수출 50 · grounding 36(표시량추출 18 + 기능성미매핑 18=프로바이오틱 등 복합) · 벌크 2.
- 생성: **PASS 179 · REVIEW 11 · BLOCKED 0**. REVIEW 11 = 공식 성상 "코팅정" D-CLAIM-GROUNDED-002(known-safe, VD 선례 동격).
- 기능성: 정상적인 면역기능에 필요 / 정상적인 세포분열에 필요 (원문 verbatim + en 매핑). 단위 mg 190/190.
- 적재: dry-run 프리로드 9/9 PASS → **apply COMMIT** → 독립검증 13/13 PASS. write **760**(master 190 + candidate 190 + SPD 380). barcode NULL 190 · canonicalDup 0 · source_type 380.
- 산출: `hff-zinc.json` · `production-single-nutrient/zinc/drafts/zinc-001..190.{ko,en}.html` · rollback-manifest.

---

## (진행 중) 누적

| 지표 | 값 |
|---|---:|
| 완료 그룹 | 1 (아연) |
| LIVE 신규 ProductMaster | 190 |
| LIVE STORE canonical SPD | 380 |
| 실제 DB write 누적 | 760 |
| BLOCKED | 0 |
