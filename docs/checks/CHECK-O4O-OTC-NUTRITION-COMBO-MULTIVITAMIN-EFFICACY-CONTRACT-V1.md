# CHECK-O4O-OTC-NUTRITION-COMBO-MULTIVITAMIN-EFFICACY-CONTRACT-V1 — 종합비타민 다성분 효능 표현 계약 확정 · 생산 가능 여부 판정

WO: `WO-O4O-OTC-NUTRITION-COMBO-MULTIVITAMIN-EFFICACY-CONTRACT-V1` · 일자: 2026-07-25 · 담당: **드럭 OTC 에이전트 나**
성격: **read-only 조사 + 계약 통합 문서화.** **DB write 0** · apply 0 · 신규 저작 0 · 러너/config/translation 미수정.
근거 채널: committed 아티팩트(run.json · config · translation JSON · 선행 CHECK). **프로덕션 DB 미접속**(본 클론 자격증명 부재 — §7).

---

## 0. 결론 — `CONTRACT_ALREADY_ESTABLISHED · PRODUCTION_COMPLETE`

> **본 WO 의 전제(“잔여 8그룹 1,461 master 미생산 · 다성분 효능 표현 계약 미확정”)는 이미 해소되어 있다.**
>
> 1. **표현 계약은 2026-07-22 에 확정됨** — 「다효능 **병렬 보존** 계약」(에이전트 가) + 「상호작용 **직접 번역** 계약」(나·가). 본 WO 가 제시한 핵심 원칙 8개는 **기존 계약과 1:1로 일치**하며 상충 0 (§3).
> 2. **대상 8그룹 1,461 master 전량 EN canonical LIVE** — 가 6그룹 738 · 다 1그룹 585 · 가 1그룹 138 (§2).
> 3. `mfds_drug_otc_nutrition_combo` **풀 전체 16그룹 / 1,915 master 완결** (나 8그룹 454 + 위 1,461). **잔여 생산 물량 0.**
>
> → **신규 생산 WO 불필요**(§8). 본 문서는 3개 세션에 흩어진 계약을 **단일 정본으로 통합**하고 재사용 기준을 고정하는 것으로 종결한다.

> ⚠️ **선행 보고 정정**: 직전 [RESUME-NA-QUEUE-AUDIT](CHECK-O4O-OTC-PRODUCTION-RESUME-NA-QUEUE-AUDIT-V1.md) §3 의 “잔여 종합비타민 7그룹 ≈1,461 master HOLD” 는 **나 트랙 CHECK(2026-07-22 시점)만 근거로 한 수치**였고, **같은 날 가·다 세션이 전량 생산 완료**한 사실이 반영되지 않았다. 실제 잔여는 **0**. 본 문서가 최신 정본이다.

---

## 1. 대상 8그룹 — fingerprint / master (WO 보고 1·2)

전 그룹 **ko canonical fingerprint 종수 = 1**(md5 균일) → 그룹 공통 설명 성립. 중지 조건 “제품별 편차로 그룹 공통 설명 불가” **미해당**.

| # | source_ref | 대표 제품 | master | ko fp종 | en canonical | 생산 세션 | 적용 계약 |
|---:|---|---|---:|:---:|---:|:---:|---|
| 1 | `d29b1340` | 진셀몬큐디플러스연질캡슐 | **585** | 1 | 585 | **다** | 다효능 병렬(대형) |
| 2 | `26c2af33` | 센트본정 | **331** | 1 | 331 | 가 | 다효능 병렬 |
| 3 | `b21c54a6` | 비타콤보씨플러스정 | **208** | 1 | 208 | 가 | 다효능 병렬 |
| 4 | `029b8650` | 셀타골드에스연질캡슐 | **169** | 1 | 169 | 가 | 다효능 병렬 |
| 5 | `b96f3977` | 티티아민정(비타민 D·E·C 복합) | **138** | 1 | 138 | 가 | 다효능 병렬 **+ 상호작용 직접번역** |
| 6 | `270a10a2` | 눈모아연질캡슐 | **21** | 1 | 21 | 가 | 다효능 병렬(7절) |
| 7 | `5a342fe9` | 셀레트론플러스연질캡슐 | **5** | 1 | 5 | 가 | 다효능 병렬 |
| 8 | `fcf616ee` | 벤포벨브이정 | **4** | 1 | 4 | 가 | 다효능 병렬 |
| | **합계** | | **1,461** | | **1,461** | | |

- WO 표기 “7그룹”은 선행 보고의 근사치이며 **실제 8그룹 · 정확히 1,461 master**.
- 전 그룹 `run.json` 재실행 상태 **`ALREADY_COMPLETE` · `dbWrite 0` · `enCanonical == targetMasters`** (본 세션 read-only 확인).
- 풀 전체 정합: 1,461(본 문서) + 454(나 8그룹) = **1,915** = reclassify CHECK 총계와 일치.

## 2. 생산 근거 CHECK

| 세션 | CHECK | 범위 |
|---|---|---|
| 가 (분류) | [MULTI-EFFECT-EN-3H-PILOT-GA-V1](CHECK-O4O-OTC-NUTRITION-COMBO-MULTI-EFFECT-EN-3H-PILOT-GA-V1.md) | 10그룹 감사 → 전량 HOLD(계약 미확립 시점) |
| 가 (생산) | [MULTI-EFFECT-EN-PRODUCTION-GA-V1](CHECK-O4O-OTC-NUTRITION-COMBO-MULTI-EFFECT-EN-PRODUCTION-GA-V1.md) | **6그룹 738 master**, en write 1,476 (2T) |
| 가 (상호작용) | [INTERACTION-2H-GA-V1](CHECK-O4O-OTC-NUTRITION-COMBO-INTERACTION-2H-GA-V1.md) | **티티아민 138**, en write 276 (2T) |
| 다 (대형) | [LARGE-GROUP-2H-DA-V1](CHECK-O4O-OTC-NUTRITION-COMBO-LARGE-GROUP-2H-DA-V1.md) | **진셀몬 585**, en write 1,170 (2T) |
| 나 (선행 계약) | [EN-ONLY-3H](CHECK-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1.md) · [COMPLEX-3H](CHECK-O4O-OTC-NUTRITION-COMBO-COMPLEX-EN-3H-PILOT-NA-V1.md) · [MULTI-INTERACTION-2H](CHECK-O4O-OTC-NUTRITION-COMBO-MULTI-INTERACTION-2H-NA-V1.md) | EN-only 계약 원형 + 8그룹 454 master |

공통 검증 결과(4개 생산 CHECK 전건): `writePlan == writeActual`(2T) · **koUnchanged true** · en needs_review 0 · **canonicalDup 0** · 한글 0 · `<table>` 0 · ko/en 1:1 · 대상 밖 write 0 · 재실행 ALREADY_COMPLETE.

## 3. 표현 계약 (정본 통합) — WO 보고 3

### 3-1. WO 핵심 원칙 ↔ 기존 계약 대조 (**상충 0**)

| # | WO 원칙 | 기존 계약 조항 | 일치 |
|---:|---|---|:---:|
| 1 | 공식 KO 효능의 정보 단위 보존 | 「ko 효능을 **동일 순서·축**으로 병렬 번역」 | ✅ |
| 2 | 성분별 효능을 새 종합 효능으로 합성 금지 | 「여러 효능을 하나로 **합성 금지** · **성분별 인과 생성 금지**」 | ✅ |
| 3 | 질환명·증상명·적응 표현 임의 삭제·약화 금지 | 「상호작용/금기/주의 **축약·완화 금지**」 + 질환명 보존(야맹증·구각염·신경통 등 전수) | ✅ |
| 4 | 동일 의미의 명백한 반복만 최소화 | 계약상 명문 조항 **없음** — 실제 산출물도 **반복 병합 0**(전 그룹 ko 절 수 == en 절 수) → **더 보수적**으로 운용됨 | ✅(포함) |
| 5 | 서로 다른 효능은 병렬 항목 유지 | 「병렬 보존」 핵심 조항 (진셀몬 6절·눈모아 7절·티티아민 4절 그대로) | ✅ |
| 6 | KO에 없는 효능을 EN에 추가 금지 | 「ko 에 없는 정보 추가 금지」 · fact-0 게이트 | ✅ |
| 7 | 영어는 KO 정보층·순서 보존 | 「동일 순서·축 병렬」 + TEST-LOG 전수 축 대조 | ✅ |
| 8 | 근거 관계 훼손하는 축약 금지 | 「성분명·귀속 보존」 (진셀몬 title 에 `no Vitamin A or Iron` 까지 명시) | ✅ |

> **판정**: 본 WO 가 요구한 계약은 **이미 시행 중인 계약과 동일**하다. 신규 계약 제정 불필요 — 아래 3-2 를 정본으로 고정한다.

### 3-2. 정본 계약 (nutrition_combo 다성분 EN-only)

| 축 | 계약 |
|---|---|
| **원문** | ko canonical 유일 (`source_type=mfds_drug_otc_nutrition_combo`). sibling EN 재사용 없음 → **fresh 번역**(first-EN) |
| **효능** | ko 효능 **절 단위 병렬 보존**. 합성 0 · 성분별 인과 신규 생성 0 · 순서 변경 0 · 절 병합 0 |
| **성분 귀속** | ko 가 명시한 귀속만 유지. 미함유 사실(예: 비타민A·철 없음)도 ko 명시 시 보존, 미명시 시 추가 금지 |
| **상호작용** | **직접 번역** — 대상 약물·조건·행동 3요소 그대로. **원인·기전·결과 신규 설명 0**(해석 금지 경계) |
| **금기·주의** | 수치·연령·기간 전수 보존(비타민A 5,000 IU / 임신 3개월 / 12개월 미만 / 3개월 미만 등 그룹별 정확값) |
| **ko 변경** | **0** — UPDATE·승격·deprecate·audit write 없음. md5+count 전후 동일 in-TX 사후검증(ROLLBACK 가드) |
| **빌더** | 공용 `buildDrugOtcEnConsumerHtml`(sd-* 계약 CR-020). ko legacy `<table>` 미승계 |
| **write** | 그룹당 **2T** (en needs_review INSERT T + canonical flip T). 이중게이트(`--apply` + `DRUG_OTC_COMBO_EN_CONFIRM=YES`) |
| **게이트** | dry-run 2회 byte-identical → TEST-LOG 전수 축 대조 → 구조(한글0·table0·주석0·이중escape0·sd-warn) → in-TX 사후검증 → 러너 밖 독립검증 |
| **러너** | `otc-nutrition-combo-en-only-runner-na.ts`(정본) / `-da.ts`(verbatim 복제). **공용 registry 미수정**, 세션별 config·translation·claim 분리 |

## 4. 중복 효능 유형 · 병렬형/상호작용형 구분 (WO 조사 항목)

| 유형 | 그룹 | 처리 |
|---|---|---|
| **단순 병렬형**(상호작용 문구 없음) | 진셀몬 · 센트본 · 비타콤보씨플러스 · 셀타골드에스 · 눈모아 · 셀레트론플러스 · 벤포벨브이 (7) | 병렬 보존만으로 성립. 해석 0 |
| **상호작용 포함형** | 티티아민 (1) — 에스트로겐 피임약·혈전 소인 | 병렬 보존 **+ 상호작용 직접 번역**(3요소 보존, 기전 설명 0) |

**중복 효능 유형(실측)**: 그룹 간 반복되는 축은 ①비타민 보급 ②말초혈행·수족냉증 ③신경통·근육통 ④구각염·구내염 ⑤색소침착·출혈예방 ⑥눈(건조·야맹증). 다만 **그룹 내부에서는 동일 의미 절의 중복이 발생하지 않아**(ko 절 수 == en 절 수, 전 그룹) WO 원칙 4의 “반복 최소화”가 **실제로 발동한 사례 0**. 그룹 간 축 재사용은 각 그룹 ko 원문에 독립적으로 존재하므로 병합 대상 아님.

**마그신·레날비타 계약 재사용 가능 여부**: **가능하며 실제 재사용됨** — 티티아민이 동일한 「ko 열거 그대로 병렬 보존 + 상호작용 직접 번역」 계약으로 완결(138 master, 병용문구 138 전건 보존 독립검증).

## 5. 샘플 3그룹 KO/EN (WO 보고 4)

committed translation 아티팩트에서 추출(신규 생성 0). KO 축은 각 생산 CHECK 의 TEST-LOG 기준.

### 5-1. 진셀몬큐디플러스연질캡슐 `d29b1340` (585) — 대형·6절 병렬

| KO 효능 축 | EN (병렬 보존) |
|---|---|
| ① 육체피로·체력저하·노년기 비타민 E·B1·B2·B6 보급 | supply vitamins E, B1, B2 and B6 in physical fatigue, reduced stamina and old age |
| ② 말초혈행장애·수족냉증 | peripheral circulation problems and cold hands and feet |
| ③ 신경통·근육통 | neuralgia and muscle pain |
| ④ 구각염·구내염 완화 | relieve angular cheilitis and mouth sores |
| ⑤ 아연 보급 | supply zinc |
| ⑥ 마그네슘 결핍 근육경련 | muscle cramps caused by magnesium deficiency |

- 용법: 만 12세 이상·1일 2회 1캡슐 → `aged 12 and over take one capsule twice a day`
- 금기: 대두유·콩·땅콩 과민 / 12개월 미만 영아 / 심한 신부전 → 3항 전수 보존
- 주의: 에스트로겐 피임약·혈전 소인 + 비타민E → 혈전 위험 상담 (직접 번역)
- title 에 `no Vitamin A or Iron` 명시 — **ko 성분 구성 사실 보존**(원칙 8)

### 5-2. 티티아민정 `b96f3977` (138) — 상호작용형·4절 병렬

> EN: *“This medicine is used to supply vitamins D, E and C during physical fatigue, pregnancy and breastfeeding, low energy during and after illness, the growth period and old age; to relieve peripheral circulation problems and cold hands and feet; to relieve skin pigmentation such as melasma and freckles; and to help prevent bleeding of the gums and nose.”*

- 4절(보급 / 말초혈행 / 색소침착 / 출혈예방) **세미콜론 병렬** — 합성 0
- 상호작용: `If you are prone to blood clots or are taking estrogen-containing contraceptives, consult a pharmacist.` — 대상·조건·행동 3요소 보존, 기전 설명 0
- 연령 정확도: ko `만 3개월 미만` → `under 3 months`(타 그룹의 12개월과 구분되어 보존)

### 5-3. 눈모아연질캡슐 `270a10a2` (21) — 최다 7절 병렬

> EN: *“…supply vitamins A, B1, B2, B6, C and E during physical fatigue, low energy and old age; to relieve eye dryness and night blindness; for neuralgia and muscle pain; for angular cheilitis and mouth sores; to help prevent skin pigmentation and bleeding of the gums and nose; to relieve peripheral circulation problems and cold hands and feet; and to supply zinc.”*

- **7개 축 전부 개별 유지** — 질환명(야맹증 night blindness · 구각염 angular cheilitis · 신경통 neuralgia) 삭제·약화 0
- 금기: 비타민A 5,000 IU 초과 시 기형 위험 → 임신 3개월 이내·임신 가능성 여성 복용 금지, 대두유/콩/땅콩 과민, 12개월 미만 — **수치·기간 전수 보존**

## 6. 판정 (WO 보고 5·6·7)

| 구분 | 그룹 | master | 내용 |
|---|:---:|---:|---|
| **PASS — 생산 완료** | **8** | **1,461** | 전 그룹 EN canonical LIVE · 독립검증 통과 · 재실행 no-op |
| **자동 생산 가능(잔여)** | **0** | **0** | 대상 소진. 계약·러너는 **향후 동일 유형에 재사용 가능** |
| **약사 검토 필요(신규)** | **0** | **0** | 상호작용 1그룹은 직접번역 계약으로 이미 해소(해석 0) |
| **HOLD** | **0** | **0** | 선행 `HOLD_MEDICAL_SYNTHESIS` 8 · `HOLD_INTERACTION_INTERPRETATION` 2 **전부 해소** |

**중지 조건 점검 — 발동 0**

| 중지 조건 | 결과 |
|---|---|
| 공식 근거에서 성분별 효능 귀속 불가 | 미해당 — 귀속을 **새로 만들지 않고** ko 절 단위 병렬 보존으로 회피 |
| 효능 통합 시 의미 변형 | 미해당 — **통합 자체를 하지 않음**(절 병합 0) |
| 기존 러너가 정보층 보존 못함 | 미해당 — 4개 CHECK 전건 TEST-LOG 축 대조 통과, ko/en 절 수 일치 |
| 제품별 편차로 그룹 공통 설명 불가 | 미해당 — 전 그룹 ko fingerprint 종수 **1**(균일) |

## 7. 검증 채널 한계 (명시)

- 본 클론(#1)에 프로덕션 자격증명 부재(`.env.apiserver` · `apps/api-server/.env` 없음) → **DB 실측 미수행**. 127.0.0.1:5442 프록시는 기동 중이나 미사용·상태 무변경.
- 따라서 §1 의 `en canonical` 수치는 **committed `run.json` 아티팩트의 재실행 결과**(`ALREADY_COMPLETE` · `existingEnCanonical == targetMasters` · `dbWrite 0`)와 **4개 생산 CHECK 의 독립검증 기록**에 근거한다. 두 축이 그룹별로 일치한다.
- 본 문서는 DB 를 변경하지 않으므로 판정 오차가 있어도 LIVE 영향 0. 실측 재확인이 필요하면 자격증명 보유 세션에서 러너 dry-run(`ALREADY_COMPLETE` 기대) 또는 독립검증 쿼리로 재현 가능.

## 8. 후속 생산 WO 분할안 (WO 보고 8)

> **`NO_PRODUCTION_WO_NEEDED`** — 분할할 잔여 물량이 없다. 아래는 생산 WO 가 **아닌** 정리 항목.

| # | 항목 | 성격 | 권고 |
|---:|---|---|---|
| 1 | 본 문서를 nutrition_combo 다성분 EN 계약 **정본**으로 고정 | 문서 | 완료(본 커밋) |
| 2 | `mfds_drug_otc_nutrition_combo` 풀 **16그룹 / 1,915 master 완결** 선언 | 문서 | 선행 CHECK 4건 + 본 문서로 충족. 별도 WO 불요 |
| 3 | 계약의 **타 source_type 확장**(예 HFF 복합형 EN) | 신규 설계 | 필요 시 별도 WO. 본 계약(병렬 보존 + 직접 번역)이 출발점으로 재사용 가능 |
| 4 | 나 claim 파일과 실제 완결 상태의 **장부 정합**(가·다 생산분은 나 claim 밖) | 정리 | 각 세션 claim 은 소유자 관리. 교차 수정 금지 — 현행 유지 |

## 9. 준수 / 금지 (WO 보고 9)

| 항목 | 결과 |
|---|---|
| **DB write** | **0** |
| apply / 신규 저작 / 신규 shard | 0 / 0 / 0 |
| 러너·config·translation·타 세션 claim | **미수정**(읽기만) — 가·다 산출물 무접촉 |
| canonicalDup | 신규 write 0 → 해당 없음(기존 검증 기록 0 유지) |
| LIVE drift | **0** |
| `_msm.mjs` / `_msmx.mjs` / `.env` / 라 census | **미접촉** |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| 자기 산출물 | 본 CHECK 1건 |
