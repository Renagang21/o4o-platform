# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1
> **성격:** 단일제 경구 OTC 설명서 초안 작성 **dry-run** (DB write 0 · registry 직접 변경 0 · canonical 승격 0)
> **결과 요약:** 대상 32 확정(registry 필터 일치) · drafted 3 · needs_review 27 · manual_curation 1 · blocked 1 · excluded 0 · 기존 imported 66 대비 exact 중복 0(제형/함량 근접군 다수, 모두 정당 분리)

---

## 1. 작업 일시

- 작성일: 2026-07-07
- 환경: 문서 registry 기준 (production DB 신규 read/write 없음)

---

## 2. 사용한 선행 문서

| 문서 | 사용 |
|---|---|
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | 템플릿·문체·금지표현·§3.5 함량축·§3.6 route·§3.8 저grounding·§3.9 민감군 |
| `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` | 대상 추출(필터)·imported 66 대조·상태값·batch 정의 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md` | registry 채움 출처 확인 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1.md` | 선행 초안 관행 확인 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | source_basis(NORMALIZATION §13) 참조 |
| `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md` | 성분 표기변형 정규화 사전 참조 |

## 3. 누락된 선행 문서와 처리

- 위 6개 문서는 현재 checkout에 **모두 존재**(추가 CHECK 다수 포함). 누락 없음.
- 단, **e약은요/허가 원문 텍스트(itemSeq 단위 raw)** 는 이 세션에서 직접 조회하지 않았다. registry는 **원문 건수(grounding count)** 만 제공한다. 따라서 초안은 §5·§6 방식으로 한정한다(아래 §8 근거 처리 원칙).

---

## 4. 대상 추출 기준

registry §5 표에서 다음 필터로만 추출:

```text
assigned_batch = BATCH-ORAL-SINGLE
status         = candidate
single_or_combo = single
route          = oral
```

- registry 물리적 위치: `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 라인 169~200 (연속 32행).
- imported 66행(라인 103~168, `status=imported`, vaginal 1행 포함)은 제외 대상으로 별도 대조에만 사용.

**count 게이트:** 추출 결과 **32행** — WO 명시치(32)와 **일치**. 보정/추가 없음.

---

## 5. 대상 32개 목록

| No | ingredient(표기) | strength | form | grounding(e약은요) | risk_class(registry) | source_basis | decision |
|-:|---|---|---|-:|---|---|---|
| 1 | 아세트아미노펜 | 325mg | tablet | 28 | normal | NORMALIZATION §13 (N02BE01) | drafted |
| 2 | 브롬화부틸스코폴라민 | 10mg | tablet | 7 | normal | NORMALIZATION §13 (A03BB01) | drafted |
| 3 | 비타민이(비타민E) | 1000iu | soft_capsule | 14 | normal | NORMALIZATION §13 (A11HA03) | drafted |
| 4 | 밀크시슬엑스 | 350mg | soft_capsule | 3 | review_required | NORMALIZATION §13 (A05BA03) | needs_review |
| 5 | 은행엽엑스 | 120mg | tablet | 3 | review_required | NORMALIZATION §13 (N06DX02) | needs_review |
| 6 | 은행엽엑스 | 40mg | tablet | 3 | review_required | NORMALIZATION §13 (N06DX02) | needs_review |
| 7 | 미세정제플라보노이드분획물 | 500mg | tablet | 4 | review_required | NORMALIZATION §13 (C05CA53) | needs_review |
| 8 | 덱시부프로펜 | 150mg | tablet | 5 | review_required | NORMALIZATION §13 (M01AE14) | needs_review |
| 9 | 아세트아미노펜 | 350mg | tablet | 3 | review_required | NORMALIZATION §13 (N02BE01) | needs_review |
| 10 | 인산벤프로페린 | 26.33mg | tablet | 3 | review_required | NORMALIZATION §13 (R05DB02) | needs_review |
| 11 | 비타민이(비타민E) | 100mg | soft_capsule | 5 | review_required | NORMALIZATION §13 (A11HA03) | needs_review |
| 12 | 콘드로이친황산나트륨 | 400mg | capsule | 4 | review_required | NORMALIZATION §13 (M01AX25) | needs_review |
| 13 | 아세트아미노펜 | 80mg | tablet | 3 | review_required | NORMALIZATION §13 (N02BE01) | needs_review |
| 14 | 아스피린 | 100mg | capsule | 17 | review_required | NORMALIZATION §13 (B01AC06) | needs_review |
| 15 | 건조수산화알루미늄겔 | 392mg | tablet | 11 | review_required | NORMALIZATION §13 (A02AB01) | needs_review |
| 16 | 콜레칼시페롤과립 | 10mg | tablet | 9 | review_required | NORMALIZATION §13 (A11CC05) | **blocked** |
| 17 | 카페인무수물 | 50mg | tablet | 9 | review_required | NORMALIZATION §13 (N06BC01) | needs_review |
| 18 | 바실루스리케니포르미스균 | 500mg | capsule | 8 | review_required | NORMALIZATION §13 (A07FA01) | needs_review |
| 19 | 폴산 | 0.4mg | tablet | 8 | review_required | NORMALIZATION §13 (B03BB01) | needs_review |
| 20 | 브롬헥신염산염 | 8mg | tablet | 7 | review_required | NORMALIZATION §13 (R05CB02) | needs_review |
| 21 | 철아세틸트랜스페린 | 200mg | capsule | 6 | review_required | NORMALIZATION §13 (B03AB08) | needs_review |
| 22 | 아셀렌산나트륨오수화물 | 0.333mg | tablet | 6 | review_required | NORMALIZATION §13 (A12CE02) | needs_review |
| 23 | 바실루스리케니포르미스균 | 200mg | capsule | 6 | review_required | NORMALIZATION §13 (A07FA01) | needs_review |
| 24 | 바실루스리케니포르미스균 | 100mg | tablet | 3 | review_required | NORMALIZATION §13 (A07FA01) | needs_review |
| 25 | 밀크시슬엑스 | 175mg | soft_capsule | 2 | review_required | NORMALIZATION §13 (A05BA03) | needs_review |
| 26 | 아스코르빈산(비타민C) | 1000mg | tablet | 2 | review_required | NORMALIZATION §13 (A11GA01) | needs_review |
| 27 | 나프록센 | 250mg | tablet | 2 | review_required | NORMALIZATION §13 (M01AE02) | needs_review |
| 28 | 디시클로민염산염 | 10mg | capsule | 2 | review_required | NORMALIZATION §13 (A03AA07) | needs_review |
| 29 | 건조하이페리시엑스(세인트존스워트) | 300mg | tablet | 2 | review_required | NORMALIZATION §13 (N06AX25) | **manual_curation** |
| 30 | 이부프로펜 | 200mg | capsule | 2 | review_required | NORMALIZATION §13 (M01AE01) | needs_review |
| 31 | 니코틴산아미드 | 500mg | tablet | 1 | review_required | NORMALIZATION §13 (A11HA01) | needs_review |
| 32 | 덱시부프로펜 | 300mg | capsule | 1 | review_required | NORMALIZATION §13 (M01AE14) | needs_review |

> group_key = `drug_otc::single::oral::{ingredient}::{strength}::{form}` (registry 원본 그대로). 위 표는 가독성을 위해 성분/함량/제형 컬럼으로 분리.

---

## 6. 기존 imported 66개와 중복/충돌 확인

**exact 중복(성분 정규화 + 함량 + 제형 + route 4축 완전 일치): 0건.**
registry 자체가 group_key 중복 0을 보증하며, 4축 대조에서도 exact 일치 없음.

**근접군(같은 성분, 제형 또는 함량만 다름 — §3.4/§3.5/§3.6에 따라 정당하게 분리):**

| 후보(candidate) | 근접 imported | 차이축 | 판단 |
|---|---|---|---|
| 아세트아미노펜 325mg **tablet** (No.1) | 아세트아미노펜 325mg **soft_capsule** (imported) | 제형 | 정당 분리(§3.4). 별도 그룹 |
| 아세트아미노펜 350mg/80mg tablet (9·13) | 아세트아미노펜 650/325/160 (imported) | 함량 | 정당 분리(§3.5) |
| 이부프로펜 200mg **capsule** (30) | 이부프로펜 200mg soft_capsule·tablet, 400mg (imported) | 제형 | 정당 분리(§3.4·§3.6) |
| 덱시부프로펜 150mg tablet(8)·300mg **capsule**(32) | 덱시부프로펜 300mg **tablet** (imported) | 함량·제형 | 정당 분리 |
| 나프록센 250mg **tablet** (27) | 나프록센 250mg **soft_capsule** (imported) | 제형 | 정당 분리 |
| 아스피린 100mg **capsule** (14) | 아스피린 100mg **tablet** (imported) | 제형 | 정당 분리(내용 유사·주의 동일) |
| 폴산 0.4mg (19) | 폴산 1mg (imported) | 함량 | 정당 분리(§3.5, 0.4mg=예방/임신 용량축) |
| 바실루스리케니포르미스균 500/200 cap·100 tab (18·23·24) | 동균 250mg capsule (imported) | 함량·제형 | 정당 분리 |
| 비타민E 1000iu·100mg (3·11) | (imported 없음) | — | 신규. 단 iu↔mg 단위 불일치는 §11 flag |

**충돌(conflict:) 없음.** 위는 모두 근접이지 충돌이 아니다. 새 초안을 원본 위에 덮어쓰는 경우 없음.

---

## 7. 제외/보류 대상

| decision | No | 사유 |
|---|---|---|
| blocked | 16 콜레칼시페롤과립 10mg tablet | **그룹 기준(함량) 불명확.** 콜레칼시페롤 순물질 10mg = 약 40만 IU로 비현실적. "과립" 희석 제형의 표시 함량(과립 mg vs 역가 IU)이 원문 확인 없이 모호. §3.5 함량축 검증 불가 → 초안 미작성. 원문 재확인 후 재분류 권장 |
| manual_curation | 29 건조하이페리시엑스 300mg tablet | **세인트존스워트(성 요한풀).** CYP3A4 등 강력 효소 유도 → 경구피임·항응고·항우울 등 다수 상호작용, 세로토닌 관련 위험. grounding 2로 얇음. 자동 초안 위험(§3.9 상호작용 다수 계열) → 수동 큐레이션 |

---

## 8. 각 그룹 grounding 근거

**근거 처리 원칙(§3.8 준수):**
- 이 세션은 e약은요 **원문 텍스트**를 직접 조회하지 않고 registry의 **원문 건수**만 보유.
- 따라서 초안의 **효능·효과/주의 대상**은 해당 성분의 **공표된 on-label 적응증 계열**(공공 라벨 수준)로 한정하고, **구체 용법·용량 수치는 창작하지 않고** "허가된 용법·용량에 따라"로 처리(가이드 §7.1·§7.2 방식).
- 그 결과 원문 대조로 수치·금기를 확정해야 하는 그룹은 **needs_review**로 분류(초안은 제공하되 약사/원문 검토 필요).

| No | 효능·효과 근거 | 복용법 근거 | 주의 대상 근거 | 성분 작용 근거 | 판단 |
|-:|---|---|---|---|---|
| 1 아세트아미노펜325 | 해열·진통(확립) | 허가용법 참조 | 간질환·음주·중복복용(확립) | 확립 | drafted |
| 2 부틸스코폴라민10 | 위장관 경련성 복통(확립) | 허가용법 | 녹내장·전립선비대·심질환(항콜린) | 확립 | drafted |
| 3 비타민E 1000iu | 비타민E 결핍 예방·보급(확립) | 허가용법 | 항응고제 병용·고용량(확립) | 확립 | drafted |
| 4 밀크시슬350 | 간기능 보조(실리마린, 라벨 계열) | 원문 필요 | 간담도 민감(§3.9)·grounding 3 | 계열 확립 | needs_review |
| 5·6 은행엽40/120 | 말초·인지 순환 개선(계열) | 원문 필요 | 출혈·항응고 병용·grounding 3 | 계열 | needs_review |
| 7 MPFF500 | 정맥부전·치질 증상(계열) | 원문 필요 | 임부·grounding 4·combo코드 혼재(§11) | 계열 | needs_review |
| 8 덱시부프로펜150 | 해열·진통·소염(확립) | 허가용법 | NSAID 민감(§3.9)·저함량축 | 확립 | needs_review |
| 9 아세트아미노펜350 | 해열·진통(확립) | 허가용법 | 단일 350mg 함량 비전형(§11) | 확립 | needs_review |
| 10 벤프로페린26.33 | 진해(계열) | 원문 필요 | grounding 3·성분 인지도 낮음 | 계열 | needs_review |
| 11 비타민E 100mg | 비타민E 보급(확립) | 허가용법 | 단위 iu↔mg 정합(§11) | 확립 | needs_review |
| 12 콘드로이친400 | 관절·연골 보조(계열) | 원문 필요 | grounding 4 | 계열 | needs_review |
| 13 아세트아미노펜80 | 소아 해열·진통(확립) | 허가용법(소아 체중) | 소아 용량·보호자(§3.9 소아) | 확립 | needs_review |
| 14 아스피린100 cap | 항혈전(저용량)(확립) | 허가용법 | 항혈전 민감(§3.9)·출혈·소아 라이증후군 | 확립 | needs_review |
| 15 수산화알루미늄겔392 | 제산(위산과다·속쓰림)(확립) | 허가용법 | 신장애·장기복용·병용흡수 | 확립 | needs_review |
| 17 카페인무수50 | 각성·피로/두통 보조(확립) | 허가용법 | 불면·심계·과다섭취 | 확립 | needs_review |
| 18·23·24 바실루스균 | 정장(장내균총 개선)(확립) | 허가용법 | 발열·혈변 지속시 상담 | 확립 | needs_review |
| 19 폴산0.4 | 엽산 보급·결핍 예방(확립) | 허가용법 | 임신 계획·B12 결핍 은폐 | 확립 | needs_review |
| 20 브롬헥신8 | 거담(점액용해)(확립) | 허가용법 | 소화성궤양·기침 지속 | 확립 | needs_review |
| 21 철아세틸트랜스페린200 | 철결핍성 빈혈(확립) | 허가용법 | 철분 민감(§3.9)·과량·소아 | 확립 | needs_review |
| 22 아셀렌산나트륨0.333 | 셀레늄 보급(계열) | 원문 필요 | 미량원소 과량 독성 | 계열 | needs_review |
| 25 밀크시슬175 | 간기능 보조(계열) | 원문 필요 | grounding 2·간담도 민감 | 계열 | needs_review |
| 26 아스코르빈산1000 | 비타민C 보급·결핍(확립) | 허가용법 | grounding 2·고용량 신결석 | 확립 | needs_review |
| 27 나프록센250 tab | 해열·진통·소염(확립) | 허가용법 | NSAID 민감·grounding 2 | 확립 | needs_review |
| 28 디시클로민10 | 위장관 경련성 복통(계열) | 원문 필요 | 항콜린 금기·grounding 2 | 계열 | needs_review |
| 30 이부프로펜200 cap | 해열·진통·소염(확립) | 허가용법 | NSAID 민감·grounding 2 | 확립 | needs_review |
| 31 니코틴산아미드500 | 니아신 결핍 예방·보급(확립) | 허가용법 | grounding 1·고용량 홍조 | 확립 | needs_review |
| 32 덱시부프로펜300 cap | 해열·진통·소염(확립) | 허가용법 | NSAID 민감·grounding 1 | 확립 | needs_review |
| 16 콜레칼시페롤과립10 | — | — | 함량 불명확 | — | blocked |
| 29 하이페리시300 | — | — | 상호작용 다수 | — | manual_curation |

---

## 9. 설명서 초안

> 공통: 모든 초안 하단에 가이드 §6 GMP/성분 기준 선택 문구를 포함(중복 표기를 피하기 위해 초안별로 축약 표기하고, 실제 반영 시 §6 전문을 삽입). 초안의 구체 용법·용량은 원문 확정 전까지 "허가된 용법·용량에 따라"로 둔다(§3.8).

### 9.1 [drafted] 아세트아미노펜 325mg 정

| 항목 | 내용 |
|---|---|
| 성분 | 아세트아미노펜 325mg |
| 분류 | 일반의약품 |
| 작용 | 해열, 진통 |
| 주요 증상 | 발열, 두통, 치통, 생리통, 근육통, 감기 몸살 |
| 선택 포인트 | 위장 부담이 적은 해열진통 성분, 325mg 함량 |
| 주의 대상 | 간질환, 잦은 음주, 다른 해열진통제 병용 |

**효능·효과** 발열 및 두통·치통·생리통·근육통 등 통증 완화.
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 감기약·몸살약·진통제에 같은 성분이 함께 들어 있는 경우가 많아 중복 복용을 확인해야 합니다.
**주의 대상** 간질환, 음주가 잦은 경우, 다른 아세트아미노펜 함유 제품 복용 중인 경우. 발열·통증이 반복되면 약사 또는 의사 상담이 필요합니다.
**성분 기준 선택** (§6 공통 문구)

### 9.2 [drafted] 브롬화부틸스코폴라민 10mg 정

| 항목 | 내용 |
|---|---|
| 성분 | 브롬화부틸스코폴라민 10mg |
| 분류 | 일반의약품 |
| 작용 | 위장관 진경(경련 완화) |
| 주요 증상 | 위·장의 경련성 복통, 위경련, 생리통 |
| 선택 포인트 | 쥐어짜는 듯한 경련성 복통에 사용하는 진경 성분 |
| 주의 대상 | 녹내장, 전립선비대(배뇨장애), 심장질환 |

**효능·효과** 위·십이지장·대장의 경련성 통증 및 경련성 복통 완화.
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 증상이 있을 때 복용하며 장기 연용하지 않습니다.
**주의 대상** 녹내장, 전립선비대에 의한 배뇨장애, 심한 심장질환, 마비성 장폐색이 있으면 복용하지 않습니다. 입마름·눈부심 등이 나타날 수 있으며 증상이 지속·악화되면 약사 또는 의사 상담이 필요합니다.
**성분 기준 선택** (§6 공통 문구)

### 9.3 [drafted] 비타민E 1000IU 연질캡슐

| 항목 | 내용 |
|---|---|
| 성분 | 비타민E(토코페롤) 1000IU |
| 분류 | 일반의약품 |
| 작용 | 항산화, 비타민E 보급 |
| 주요 증상 | 비타민E 결핍 예방 및 보급 |
| 선택 포인트 | 고함량(1000IU) 비타민E 보급 |
| 주의 대상 | 항응고제 복용자, 수술 예정자, 고용량 장기복용 |

**효능·효과** 비타민E의 보급 및 결핍 예방.
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 고함량 제형이므로 다른 비타민E 보충제와 중복되지 않도록 확인합니다.
**주의 대상** 항응고제(와파린 등) 복용자, 출혈 경향이 있거나 수술 예정인 경우 복용 전 약사와 상담하세요. 고용량 장기복용은 권장되지 않습니다.
**성분 기준 선택** (§6 공통 문구)

### 9.4 [needs_review] 밀크시슬엑스(실리마린) 350mg 연질캡슐 / 175mg 연질캡슐 (No.4·25 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 밀크시슬 건조엑스(실리마린) |
| 분류 | 일반의약품 |
| 작용 | 간 기능 보조 |
| 주요 증상 | 독성·염증성 간질환의 보조 요법(라벨 계열) |
| 선택 포인트 | 실리마린 성분의 간 기능 보조 |
| 주의 대상 | 간질환 진행 상태, 임부·수유부 |

**효능·효과** 독성·염증성 간질환의 보조 및 만성 간질환 보조에 사용합니다(구체 적응증은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다.
**주의 대상** 간질환이 진행 중이거나 증상이 지속되면 약사 또는 의사 상담이 필요합니다. 임부·수유부는 복용 전 상담하세요.
**⚠ 검토 필요:** 간·담도계 민감군(§3.9), e약은요 근거 얇음(350mg=3·175mg=2). 적응증·용법 원문 확정 필요.
**성분 기준 선택** (§6 공통 문구)

### 9.5 [needs_review] 은행엽엑스 40mg 정 / 120mg 정 (No.5·6 공유)

| 항목 | 내용 |
|---|---|
| 성분 | 은행엽 건조엑스 |
| 분류 | 일반의약품 |
| 작용 | 말초·뇌 혈류 순환 개선(라벨 계열) |
| 주요 증상 | 말초순환장애, 어지럼·이명·기억력 저하 보조 |
| 선택 포인트 | 함량(40mg/120mg)에 따른 순환 개선 성분 |
| 주의 대상 | 항응고·항혈소판제 병용, 수술 예정 |

**효능·효과** 말초동맥순환장애 및 어지럼·이명 등 순환 관련 증상의 보조(구체 적응증은 원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다.
**주의 대상** 항응고제·항혈소판제 복용자, 출혈 경향, 수술 예정자는 복용 전 약사와 상담하세요.
**⚠ 검토 필요:** 출혈 위험 계열, grounding 3. **정규화 이슈:** registry ingredient_key `은행엽엑스` ↔ imported `은행엽건조엑스`(80mg) 불일치 → §11 참조.
**성분 기준 선택** (§6 공통 문구)

### 9.6 [needs_review] 미세정제플라보노이드분획물(MPFF) 500mg 정 (No.7)

| 항목 | 내용 |
|---|---|
| 성분 | 미세정제플라보노이드분획물(디오스민+헤스페리딘 분획) |
| 분류 | 일반의약품 |
| 작용 | 정맥 긴장 개선, 정맥·림프 순환 보조 |
| 주요 증상 | 만성 정맥부전(다리 무거움·부종), 치질의 증상 완화 |
| 선택 포인트 | 정맥 순환 개선 플라보노이드 분획 |
| 주의 대상 | 임부·수유부 |

**효능·효과** 만성 정맥·림프 부전 관련 증상 및 치질의 급성 증상 완화 보조(원문 확인).
**복용 안내** 허가된 용법·용량에 따라 복용합니다.
**주의 대상** 임부·수유부는 복용 전 약사와 상담하세요. 치질 증상이 지속·악화되면 상담이 필요합니다.
**⚠ 검토 필요:** registry에서 동 성분이 single(No.7)과 combo(`c05ca53_combo` 프라본정, 라인 237)로 혼재 → 분류 정합 필요(§11).
**성분 기준 선택** (§6 공통 문구)

### 9.7 [needs_review] NSAID 계열 (덱시부프로펜 150mg 정·300mg 캡슐, 나프록센 250mg 정, 이부프로펜 200mg 캡슐 — No.8·32·27·30)

> 공통 골격(가이드 §7.2·§7.3·§7.8 준용). 성분·함량·제형만 치환.

| 항목 | 내용 |
|---|---|
| 성분 | (해당 성분·함량) |
| 분류 | 허가 구분 확인 필요(현장 판매구분 약사 확인, §3.4 주의) |
| 작용 | 해열, 진통, 소염 |
| 주요 증상 | 발열, 두통, 치통, 생리통, 근육통, 관절통, 인후통 |
| 선택 포인트 | 통증·염증을 함께 고려할 때 선택 |
| 주의 대상 | 위장장애, 심혈관·신장 질환, 항응고제 병용, 임신 후기 |

**효능·효과** 발열 및 두통·치통·생리통·근육통·관절통 등 통증·염증 완화.
**복용 안내** 허가된 용법·용량에 따라 복용합니다. 위장 불편감이 있을 수 있어 위가 약하면 식후 복용을 권장하고, 다른 소염진통제(NSAID)와 중복 복용하지 않습니다.
**주의 대상** 위궤양·위장출혈 병력, 천식, 신장·심혈관질환, 항응고제 복용자, 임신 후기. 위통·흑색변·발진·호흡곤란 시 복용 중단 후 상담.
**⚠ 검토 필요:** NSAID 민감군(§3.9) 기본 검토 강화. 덱시부프로펜은 이부프로펜 계열 개량 성분(§3.4). 나프록센 250mg·이부프로펜 200mg capsule은 grounding 2로 원문 확정 필요.
**성분 기준 선택** (§6 공통 문구)

### 9.8 [needs_review] 아세트아미노펜 350mg 정 / 80mg 정 (No.9·13)

- **350mg(No.9):** 골격은 §9.1 준용. **⚠ 검토 필요:** 단일제 350mg는 국내 단일 아세트아미노펜으로 비전형(통상 160/325/500/650) → 실제 단일제 여부/복합제 오분류 여부 원문 확인(§11).
- **80mg(No.13):** 소아 해열·진통. 요약표 "주의 대상"에 **소아 체중별 용량·보호자 확인** 명시. **⚠ 검토 필요:** 소아 용량은 원문 용법 확정 필수(§3.9 소아).

### 9.9 [needs_review] 아스피린 100mg 캡슐 (No.14)

| 항목 | 내용 |
|---|---|
| 성분 | 아스피린 100mg |
| 분류 | 일반의약품 |
| 작용 | 항혈소판(혈전 예방) |
| 주요 증상 | 혈전 생성 억제(심혈관계 예방 목적, 의사 지시 하) |
| 선택 포인트 | 저용량(100mg) 항혈전 성분 |
| 주의 대상 | 출혈 경향, 소화성궤양, 수술 예정, 소아(라이증후군) |

**효능·효과** 혈전·색전 형성의 억제(저용량 아스피린). 사용 목적·기간은 의사 지시에 따릅니다.
**복용 안내** 허가된 용법·용량 및 의사 지시에 따라 복용합니다.
**주의 대상** 출혈성 질환·소화성궤양·수술 예정자는 복용 전 반드시 상담하세요. 소아·청소년은 라이증후군 위험으로 자가복용하지 않습니다.
**⚠ 검토 필요:** 항혈전/저용량 아스피린 민감군(§3.9). imported `아스피린 100mg 정`과 내용 유사(제형만 상이) → 초안 정합 유지.
**성분 기준 선택** (§6 공통 문구)

### 9.10 [needs_review] 소화기 — 제산/정장/진경 (No.15·18·23·24·28)

- **건조수산화알루미늄겔 392mg 정(15):** 제산(속쓰림·위산과다). 골격 가이드 §7.7 준용. 신장애·장기복용·테트라사이클린 병용 주의. **⚠ 검토 필요:** 용법 원문.
- **바실루스리케니포르미스균 500mg 캡슐/200mg 캡슐/100mg 정(18·23·24):** 정장(장내균총 개선). 발열·혈변 지속 시 상담. 셋은 동일 성분 함량·제형 변형 → 동일 골격 공유.
- **디시클로민염산염 10mg 캡슐(28):** 위장관 경련성 복통 진경(항콜린). 녹내장·전립선비대·심질환 주의. **⚠ 검토 필요:** grounding 2, 항콜린 금기 원문 확인.

### 9.11 [needs_review] 거담 — 브롬헥신 / 진해 — 벤프로페린 (No.20·10)

- **브롬헥신염산염 8mg 정(20):** 거담(점액용해). 소화성궤양 주의, 기침·가래 지속 시 상담. 골격 §7.4(에르도스테인) 준용.
- **인산벤프로페린 26.33mg 정(10):** 진해(기침 억제). **⚠ 검토 필요:** 성분 인지도 낮고 grounding 3 → 적응증·용법 원문 확정. 초안은 계열(진해) 수준으로만 제공.

### 9.12 [needs_review] 영양/보급 — 비타민·미네랄·철분 (No.11·19·21·22·26·31·12·17)

각 성분의 **보급/결핍 예방** 적응증 계열로 골격 제공(구체 용법 "허가된 용법·용량에 따라"):

- **비타민E 100mg 연질캡슐(11):** §9.3 준용. **⚠ 단위 정합:** iu↔mg(§11).
- **폴산 0.4mg 정(19):** 엽산 보급·결핍 예방(임신 계획 포함). B12 결핍 은폐 주의.
- **철아세틸트랜스페린 200mg 캡슐(21):** 철결핍성 빈혈. **철분 민감군(§3.9)** — 과량·소아 보관·변색·변비 주의.
- **아셀렌산나트륨오수화물 0.333mg 정(22):** 셀레늄 보급. **미량원소 과량 독성** 주의.
- **아스코르빈산(비타민C) 1000mg 정(26):** 비타민C 보급·결핍. 고용량 신결석 주의. **⚠ grounding 2.**
- **니코틴산아미드 500mg 정(31):** 니아신(B3) 결핍 예방·보급. 고용량 홍조. **⚠ grounding 1.**
- **콘드로이친황산나트륨 400mg 캡슐(12):** 관절·연골 보조(계열). **⚠ 적응증 원문 확인.**
- **카페인무수물 50mg 정(17):** 각성·피로/두통 보조. 불면·심계·카페인 총량 과다 주의.

> 위 영양/보급군은 요약표(성분·분류·작용·주요 증상·선택 포인트·주의 대상) + 효능·효과(보급/결핍 예방) + 복용 안내(허가 용법) + 주의 대상 + §6 공통 문구 구조로 개별 전개 가능하며, 실제 반영 시 §9.1 형식으로 확장한다.

### 9.13 [blocked] 콜레칼시페롤과립 10mg 정 (No.16) — 초안 미작성

- 사유: §7 참조(함량 단위 불명확). 원문에서 과립 표시 함량 vs 역가(IU) 확정 후 재분류.

### 9.14 [manual_curation] 건조하이페리시엑스 300mg 정 (No.29) — 초안 미작성

- 사유: §7 참조(세인트존스워트 상호작용 다수, 자동 초안 위험). 수동 큐레이션 대상.

---

## 10. 분류 집계

| 분류 | 건수 | No |
|---|-:|---|
| drafted | 3 | 1, 2, 3 |
| needs_review | 27 | 4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32 |
| manual_curation | 1 | 29 |
| blocked | 1 | 16 |
| excluded | 0 | — |
| **합계** | **32** | |

- 초안 제공(drafted + needs_review): **30건** (일부는 성분/함량/제형 변형을 골격 공유로 전개).
- 초안 미작성(manual_curation + blocked): **2건**.

---

## 11. registry 업데이트 제안 (직접 변경 아님 — 중앙 승인 대상)

> 본 CHECK는 registry 파일을 **변경하지 않는다**. 아래는 제안이며 상태 전이는 중앙 배치 관리 방에서만.

**상태 전이 제안(candidate → …):**

| group_key(요약) | current | proposed | reason |
|---|---|---|---|
| 아세트아미노펜325 tab / 부틸스코폴라민10 / 비타민E1000iu | candidate | drafted | 근거 충분, 초안 완료 |
| No.4~15,17~28,30~32 (27건) | candidate | needs_review | 초안 제공, 약사/원문 검토 필요 |
| 건조하이페리시엑스300 (29) | candidate | manual_curation | 상호작용 다수·자동 초안 위험 |
| 콜레칼시페롤과립10 (16) | candidate | blocked | 함량 단위 불명확 |

**registry 데이터 품질 flag(정규화/분류 정합 — 별도 검토 권장):**

1. **ingredient_key 불일치:** `은행엽엑스`(No.5·6) ↔ imported `은행엽건조엑스`(80mg). 동일 성분 가능성 → 정규화 사전(§3.7)으로 단일 키 통일 검토. 함량이 달라 그룹 자체는 분리 유지.
2. **단위 불일치:** 비타민E `1000iu`(No.3) ↔ `100mg`(No.11). strength_key 단위 축(iu vs mg) 혼재 → route/성분 내 단위 표기 표준화 검토.
3. **single/combo 분류 혼재:** `미세정제플라보노이드분획물`이 single(No.7)과 `c05ca53_combo`(프라본정, 라인 237) combo로 병존. MPFF는 확정 분획 → 단일/복합 처리 기준 정합 필요.
4. **함량 비전형:** 아세트아미노펜 단일 `350mg`(No.9) — 국내 단일제로 비전형 → 실제 단일 여부/복합제 오분류 여부 원문 확인.
5. **함량 단위 모호:** 콜레칼시페롤과립 `10mg`(No.16) — 과립 표시량 vs 역가(IU) 확정 필요(blocked 사유).

---

## 12. 추가 후보

- registry 필터(BATCH-ORAL-SINGLE·candidate·single·oral) 외의 **신규 후보를 새로 산출하지 않았다**(WO 금지).
- 작업 중 발견된 것은 신규 후보가 아니라 위 §11의 **기존 registry 정합/정규화 이슈**이며, 후보 추가가 아님.
- 추가 후보: **없음.**

---

## 13. 금지사항 준수 확인

| 금지 항목 | 준수 |
|---|:-:|
| DB write (product_candidate_description_drafts 등) | ✅ 0 |
| SharedProductDescription insert/update | ✅ 0 |
| ProductDrugExtension 임상/설명 텍스트 입력 | ✅ 0 |
| ProductMaster/ProductCandidate 상태 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| imported/drafted 상태 직접 변경 | ✅ 0 |
| **registry 파일 직접 상태 변경** | ✅ 0 (제안만 §11) |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 0 |
| 복합제/비경구/처방의약품 설명 작성 | ✅ 0 |
| 임의 후보 추가 | ✅ 0 |
| 근거 없는 일반지식 확장(§3.8) | ✅ 회피(수치 창작 없이 "허가 용법·용량에 따라") |

---

## 14. 후속 batch 제안

1. **원문 grounding 확정 batch(권장 선행):** 본 batch needs_review 27건 중 grounding ≤3 항목에 대해 e약은요/허가 **원문 텍스트**를 실제 조회하여 효능·용법·주의 수치 확정 → needs_review 중 다수를 drafted로 승격. (production DB read-only, write 0)
2. **BATCH-ORAL-COMBO(68건, 라인 201~268):** 복합제 경구. `100-GROUP §부록A` 근거 기반. review_required 기본.
3. **registry 정합 정비 WO:** §11 flag 1~5(ingredient_key/단위/single·combo/함량 비전형) 일괄 교정 — 각 route batch 진행 전 선행 권장.
4. 비경구 route batch(TOPICAL/EYE/PATCH/NASAL/RECTAL/VAGINAL/ORAL-LOCAL)는 registry가 대표 11행만 보유 → 각 batch DRAFT WO에서 전량 enumeration 필요.

---

*V1 · 2026-07-07 · BATCH-ORAL-SINGLE candidate 32 dry-run · drafted 3 / needs_review 27 / manual 1 / blocked 1 · DB write 0 · registry 직접 변경 0*
