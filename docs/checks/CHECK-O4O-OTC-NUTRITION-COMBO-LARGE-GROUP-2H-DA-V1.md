# CHECK-O4O-OTC-NUTRITION-COMBO-LARGE-GROUP-2H-DA-V1 — 진셀몬큐디플러스 585 대형 그룹 EN 완결 (에이전트 다)

WO: `WO-O4O-OTC-NUTRITION-COMBO-LARGE-GROUP-2H-DA-V1` · 일자: 2026-07-22 · 상태: **완료 — EN 585 canonical LIVE (ko 불변·no-op PASS)** · 실제 소요 약 45분(2h 이내 조기 종료)
runner: `otc-nutrition-combo-en-only-runner-da.ts`(나 검증 계약 verbatim 복제) · config: `otc-nutrition-combo-jinselmon-da.config.json` · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **진셀몬큐디플러스연질캡슐 nutrition_combo 대형 그룹 585 master 를 다효능 병렬 보존 계약으로 EN 완결. fresh 번역(ko canonical 유일 원문·en 전례 0). dry-run 2회 byte-identical → apply → en needs_review 585 → canonical 585(write 1,170=2T). TX 사후검증 PASS(enCanonical 585·nr 0·dup 0·**koUnchanged true**). 독립검증 585/585·ko 585 불변·en md5 1종. 재실행 ALREADY_COMPLETE(write 0). writePlan 1,170 == writeActual 1,170.**

---

## 1. 소유권 · claim

| 항목 | 값 |
|---|---|
| claim | `otc-production-claim.da.json`(자기 소유 1개) · 선점 commit `2cff63544` → push → fetch 교집합 0 재확인 |
| groupKey | `진셀몬큐디플러스연질캡슐` · sourceRef `d29b1340-498e-4128-b6e1-b667e0135035` · sourceType `mfds_drug_otc_nutrition_combo` |
| 가·나 claim 교집합 | **0** (선점 전/후 재확인) |
| 공용 runner 수정 | **0** (나 `-na` 계약을 `-da` 로 verbatim 복제 — 로직 완전 동일, WO id·헤더만 차이) |

---

## 2. target 고정 · 균일성 (WO 3·4)

| 항목 | 값 | 판정 |
|---|---|:---:|
| target master (ko canonical) | **585** (distinct 585) | ✅ 고정 |
| ko canonical fingerprint 종수 | **1** (md5 `1eb3b9df83e99f31560e4e38e0c47928`) | ✅ 균일 |
| ko-기술 성분 구성 | 「종합비타민·미네랄 — 비타민 E·B군 + 마그네슘·아연 (비타민A·철 없음)」 단일 클래스 | ✅ 일치 |
| en 전례 | canonical 0 · needs_review 0 | ✅ EN_ONLY(fresh) |

> 제품 master name 226·spec 159 종은 combo 그룹 특성(동일 성분 클래스, 브랜드·팩 다양). ko-기술 성분 구성은 1 fingerprint 로 **균일** → 중지 조건 "ko fingerprint/성분 구성 불일치" 미해당.

---

## 3. 다효능 병렬 번역 TEST-LOG (WO 5·6·7)

fresh 번역 · ko 효능 순서·축 그대로 병렬 · **합성 0·성분별 인과 생성 0·마케팅 0**. build md5 `197e90721518422ab546ca178ae02482`.

| 축 | ko canonical | en (병렬 보존) | 보존 |
|---|---|---|:---:|
| 효능① | 육체피로·체력저하·노년기 비타민 E·B1·B2·B6 **보급** | supply vitamins E, B1, B2 and B6 in physical fatigue, reduced stamina and old age | ✅ |
| 효능② | 말초혈행장애·수족냉증 | peripheral circulation problems and cold hands and feet | ✅ |
| 효능③ | 신경통·근육통 | neuralgia and muscle pain | ✅ |
| 효능④ | 구각염·구내염 완화 | relieve angular cheilitis and mouth sores | ✅ |
| 효능⑤ | 아연 보급 | supply zinc | ✅ |
| 효능⑥ | 마그네슘 결핍 근육경련 | muscle cramps caused by magnesium deficiency | ✅ |
| 용법(연령·횟수) | 만 **12세 이상**·성인 **1일 2회, 1회 1캡슐** | aged **12 and over** take **one capsule twice a day** | ✅ |
| 금기 | 대두유·콩·땅콩 과민·**12개월 미만** 영아·심한 신부전 복용 안 함 | Do not take … soybean oil, soya or peanuts, a baby under 12 months, or severe kidney failure | ✅ |
| 주의(상호작용) | 에스트로겐 피임약·혈전 소인 + 비타민E → **혈전 위험** 상담 | estrogen-containing contraceptive or prone to blood clots … vitamin E may increase the risk of clots, so seek advice | ✅ |

> 6개 효능 **동일 순서·개별 축 보존**(하나의 종합효능으로 합성 안 함). 수치·연령(12세/12개월)·용법(2회/1캡슐)·금기·상호작용 전수 보존. ko 에 없는 정보·성분별 인과·마케팅 표현 **0**. ko legacy `<table>` 미승계(sd-* conformant, ko 미변경).

---

## 4. 실행 (WO 8·9·10·11)

| 단계 | 결과 |
|---|---|
| dry-run 2회 | **byte-identical** (run.json diff 0) · target 585 · ko fpkinds 1 · en 0 · writePlan **1,170**(2T) · 이상 0 |
| apply(이중게이트) | STEP1 en needs_review INSERT **585** · STEP2 canonical flip **585** = **1,170** |
| TX 사후검증 | enCanonical **585** · nr **0** · dup **0** · **koUnchanged true**(ko md5·count 전후 동일) → COMMIT |
| 독립 검증(별도 pg) | en canonical 585 · en 정확히1 585 · nr 0 · dup 0 · **ko canonical 585 불변·ko fpkinds 1 불변** · en md5 1종(=build `197e9072`, n=585) |
| 재실행 no-op | **ALREADY_COMPLETE** · dbWrite 0 |
| **writePlan == writeActual** | **1,170 == 1,170** (초과 0) |

- **대형 그룹 가드**: apply 직전 target 585 재확인 ✅ · writePlan 1,170 = 실제 ✅ · 대상 밖 write 0(source_ref+source_type+ko canonical 스코프) · dup 0 · TX 사후검증 통과.
- DB write = en INSERT/flip 만. **ko UPDATE 0·DELETE 0·audit 0**.

---

## 5. DB 연결 안정성

- 단일 그룹·배치 statement(INSERT…SELECT unnest 1회 + UPDATE flip 1회, 585 round-trip 아님) → 연결 사용 최소. apply 중 연결 경합·`remaining connection slots` **0**. child 프로세스·pool 이슈 무관(직접 실행).

---

## 6. 완료 보고

| 항목 | 값 |
|---|---|
| 실제 소요 | 약 45분 (최대 2h 이내 조기 종료) |
| target 수 | **585** (재확인 일치) |
| writePlan / writeActual | **1,170 / 1,170** |
| 다효능 TEST-LOG | 효능 6축 순서보존·용법·금기·상호작용 전수 보존, 합성·마케팅 0 (§3) |
| ko 불변 | ✅ (koUnchanged true · 독립검증 ko 585·fpkinds 1 불변) |
| 독립검증 | ✅ en 585·exactly1 585·dup 0 |
| no-op | ✅ ALREADY_COMPLETE(write 0) |
| DB 연결 안정성 | ✅ 경합·slot 0 |
| commit SHA | claim `2cff63544` · 본문 (본 커밋) |
| 미푸시 자기 산출물 | 0 (예정) |

> 중지 조건 미해당(ko fingerprint/성분 구성 균일·target 585 불변·writeActual 1,170 미초과·대상 밖 write 0·dup 0·DB 무장애). 범위 확장 없음(진셀몬 그룹만).
