# CHECK — 비타민 D 단일형 생산 라인 (Agent B)

- 일자: 2026-07-17
- WO: `WO-O4O-HFF-DESCRIPTION-VITAMIN-D-PRODUCTION-LINE-V1` (Agent B 전용)
- 성격: **작성·검증·적재 후보 확정** — DB write 0 (ProductMaster/candidate/SPD/canonical/QR 무변경). 적재는 별도 승인 게이트.
- 판정: **PASS — 생산 라인 전환 완료.** 파일럿 20 회귀 + 신규 30 검증 + 잔여 387 연속 생산 = **총 417 단일 비타민 D 완제품** 작성. 최종 `BLOCKED 0`.

---

## 1. 결과 요약 (WO §18)

| 항목 | 결과 |
|---|---|
| 기존 20건 회귀 | **PASS 17 · REVIEW 3 · BLOCKED 0** (최신 Guard, 파일럿과 동일). REVIEW 3 = 드롭 CFU 파서 오탐(알려진 사각지대, 콘텐츠 clean) |
| 신규 30건 검증 | **PASS 30 · REVIEW 0 · BLOCKED 0** (VD-CP01/02/03 각 10건 전부 정상) |
| 50-게이트 (파일럿 20 + 신규 30) | **PASS 47 · REVIEW 3 · BLOCKED 0** → 생산 전환 승인 |
| 생산 387건 | **PASS 384 · REVIEW 3 · BLOCKED 0** |
| **전체 417 (신규 30 + 생산 387)** | **PASS 414 · REVIEW 3 · BLOCKED 0** |
| 전체 선정 수 | 417 (적격 단일 VD 완제품 전량, ≤500) |
| 작성 완료 수 | 417 (ko+en 834 HTML) |
| HOLD 유형별 | MULTI 8,983 · GROUNDING 151 · UNSUPPORTED(액상) 41 · EXPORT 28 · BULK 7 |
| IU·μg 환산 제품 | 표시량 IU 선언 2건(환산 안 함, 원문 단위 유지) · 제품명에 IU 포함 25건(본문은 원문 표시량 μg) |
| 골다공증 위험감소 표현 | **417/417 공식 verbatim "발생 위험 감소에 도움을 줌"** · 예방/치료 단정 0 |
| 신규 실패 유형 | 0 (발생분은 즉시 규칙화 — §4) |
| 자동검사(반응형 프록시) | style/script 0 · sd-card 834/834 · 미분절 토큰>34 0 · **PASS** |
| 실화면 검수 | 표본 다형태(연질캡슐/정/캡슐/츄어블/젤리/필름/분말) · IU · 다회섭취 · 물무근거 전수 통과 |
| 최종 적재 후보 수 | **417** (`hff-vitamin-d-preload-417.json` 고정) |
| 프리로드 가능 | ✅ (ID/신고번호 유일 417/417 · 파일럿 중복 0 · ko/en·grounding 결손 0) |
| **DB write** | **0** |

---

## 2. 대상 풀 선정 (§6/§7)

raw `mfds-health-functional-food-info-raw.jsonl` (44,885) 스트리밍 파싱 →

```text
비타민 D 언급           9,647
─────────────────────────────
✅ 적격 단일 VD 완제품    417   (기존 20 제외)
   HOLD_MULTI(복합)      8,983  → Agent D
   HOLD_GROUNDING          151
   HOLD_UNSUPPORTED(액상)   41  → Agent F
   HOLD_EXPORT_ONLY         28
   BULK                      7
```

**단일 기능성 판정(강함):** ⓪ MAIN_FNCTN 에서 VD 공식 3대 기능 문구·라벨 제거 후 잔여 실질 텍스트 >4자 → 복합 · ⓪-b BASE_STANDARD 성분별 `표시량(N…)` 스펙 ≥2 → 복합 · 라벨 인접 비-VD 영양소 → 복합. (칼슘·인은 VD 기능 텍스트라 오탐 없음.) 결과 적격 417 중 규격 비율 416×`80~180%` + 1×`80~150%` (전량 순수 VD 스펙), **CFU 토큰 0**, 골다공증 기능 417/417.

**제형 분포:** softgel 276 · tablet 96 · chewable 13 · powder 12 · capsule 10 · gummy 8 · film 2.
**단위:** μg 414 · IU 2 · mg 1.

액상·드롭(41)은 Agent F 이관(현 모델 미지원), 복합(8,983)은 Agent D 이관 — `hff-vitamin-d-hold-registry.json`.

---

## 3. 작성 방식 — 결정적 grounded composer

파일럿 20(5ba84233f, 독립검수 PASS)의 시맨틱 `sd-*` 템플릿을 **공식 원문 grounding 필드로만 구동**하는 결정적 composer(`hff-vd-compose.ts`). 외부 LLM 자유생성 아님. 보장:

- **물(G-WATER):** 원문 SRV_USE 에 물/음용수 명시 시에만 "물과 함께". 씹어/녹여/그대로는 원문 근거 시에만 칩 표기.
- **함량:** 표시량(declaredAmount)만 기술 · `calculationAllowed=false` · per-unit/1일총량 파생수치 미생성. IU·μg 환산 안 함(원문 단위 유지, §8.2).
- **기능성:** MAIN_FNCTN 존재 기능만(칼슘·인/뼈/골다공증). 제품명(키즈·본·골드 등) 유도 확대 0.
- **주의사항:** 공식 원문의 판촉 토큰("안심하고" 등)을 draft 로 옮기지 않도록 **표준 경고 요소 감지형 재구성** + 라벨 확인 포인터(누락 방지).
- **공식 자유서술(성상·보관):** 판촉 문장만 제거하고 나머지는 원문 부분문자열 유지(ruleB 인용 제거 정합 — "최대한 차단" 등 오탐 방지).
- **ko/en 수치 동치:** 표시량·기준량·비율을 양 언어 동일 토큰. 영어 기능성 "may help / recognised as helping" 프레임(강화 0). 영문 제조사명 창작 금지(한국어 법인명 보존).

---

## 4. REVIEW·신규 규칙화 내역

| 신호 | 수 | 판정 |
|---|---|---|
| `D-CLAIM-GROUNDED-002` "코팅" (공식 성상 = 코팅정) | 3 | **known-safe REVIEW** — 공식 제형 서술(주장 아님), 사람 확인. 파일럿 CFU-오탐 REVIEW 선례와 동격. |
| 파일럿 `PRE-SRC-CFU/BASIS-UNVERIFIABLE-003` (드롭) | 3 | 기존 파일럿 알려진 사각지대(비-프로바이오틱 CFU 오탐). 신규 라인은 액상 제외로 재발 0. |

**생산 중 규칙화(선반영, 공통 가드 무수정):**
1. **복합 누수** — 유산균·MSM·콘드로이친·이소플라본 등 비-VD 원료가 표시량 미인접/denylist 외로 누수 → 잔여-텍스트 + `표시량≥2` 판정으로 차단(pool 535→417).
2. **판촉 토큰 유입** — storage/성상 verbatim 의 "안심하고"(BLOCKED)·"최대한"(오탐) → 판촉 문장 제거 + 마커 보존.
3. **섭취단위 미파싱** — 개·매·스푼·젤리·필름 → 자체 파서로 해소(미파싱 12→0).

신규 실패 유형은 즉시 규칙화 완료. 미해결 신규 유형 0.

---

## 5. 사람 검수(§10) 결과

- IU 선언 2건(환산 없이 원문 IU 유지) · 다회섭취 4건(1일 섭취량 총량 서술 회피, 표시량만) · 골다공증 표현 417건(전부 공식 verbatim, 예방/치료 0) · 물 무근거 103건(물 문구 미부가 확인) — 전수 위반 0.
- 표본 실화면(연질캡슐/정/캡슐/츄어블/젤리/필름/분말, IU, 다회, 물무근거) 판독: 자기모순·수치단위 오류·기능성 범위 이탈·제품명 유도·근거없는 물/흡수율/고함량 0.
- 금지 토큰 전수 스캔(예방·치료·골절·흡수율·고함량·면역강화·프리미엄품질 / prevents·treats·deficiency·high-dose 등): **0/417**.

---

## 6. 반응형 (§11)

콘텐츠는 `<style>` 없는 시맨틱 `sd-*` HTML — 반응형은 렌더러(ContentRenderer variant="store-description") 책임(파일럿과 동일 구조 → 검증 계승). 자동 프록시 전수: style/script 0 · sd-card 834/834 · 미분절 토큰>34 0 · ko/en 균형. 최장 콘텐츠(긴 성상·제품명·수치) 오버플로 위험 토큰 0.

---

## 7. 산출물

```text
apps/api-server/src/scripts/
  hff-vd-select-pool.ts     raw → 단일 VD 적격 풀(417) + HOLD (read-only)
  hff-vd-compose.ts         결정적 grounded composer (ko/en)
  hff-vd-generate.ts        compose + Guard 전수 + HTML/JSON 출력
  hff-vd-verify.ts          50-게이트 + 417 Guard + 프리로드 + HOLD 요약
docs/checks/data/product-description-guard/
  hff-vitamin-d-new-30.json         신규 30 (Guard 입력, grounding+ko/en)
  hff-vitamin-d-production.json      생산 387
  hff-vitamin-d-preload-417.json     적재 후보 고정 목록 (id/신고번호/제품명/제조사)
  hff-vitamin-d-hold-registry.json   HOLD 요약 + 비-MULTI 이관 목록(액상→F/복합→D)
docs/guides/products/health-functional-food/production-vitamin-d/drafts/
  vdp-001..417 .ko.html / .en.html   (834)
```

---

## 8. 생산 전환 기준 충족 (§16) · 완료 판정 (§17)

```text
최종 BLOCKED 0                 ✅
실제 사람 검수 위반 0           ✅
수치·단위 불일치 0             ✅
ko/en 기능성 불일치 0          ✅
질병 예방·치료 표현 0          ✅
근거 없는 물·흡수율·고함량 0    ✅
신규 실패 유형 0(즉시 규칙화)   ✅
기존 20 중복 0                 ✅
HOLD 유형별 격리               ✅
반응형 오류 0                  ✅
최종 적재 후보 고정(417)        ✅
DB write 0                     ✅
```

**PASS.** 총 50건 생산 전환 판정 후 적격 잔여 전량(387) 연속 생산 완료(≤500). 다음 단계 = 최신 DB 기준 대상 고정 → 프리로드 9종 → dry-run → 결과 보고 → **apply 별도 승인**(ProductMaster/candidate 승격/SPD STORE canonical). 본 WO 범위 내 DB write 없음.
