# CHECK-O4O-DRUG-OTC-DESCRIPTION-PROBIOTIC-STRAIN-GROUPING-AND-DRAFT-STANDARD-V1

> **WO:** WO-O4O-DRUG-OTC-DESCRIPTION-PROBIOTIC-STRAIN-GROUPING-AND-DRAFT-STANDARD-V1
> **성격:** A07FA/정장제 **균주 단위 후보 조사 + 분류 + 설명서 기준 확정(read-only)**. 설명서 본문 작성 0 · DB write 0 · canonical 승격 0.
> **핵심 결론:** probiotic OTC = **607(전량 A07FA)**. 단일균은 name 괄호로 그룹화 가능(대형 4종 imported 완료 + 신규 grounded 소수). **다균복합 A07FA51(164/grounded 103)은 균주 조성이 DB에 없음**(name=브랜드·ext NULL·e약은요 원문에 성분 미기재) → §7 "다균 조합 분리" 규칙상 **defer(허가 성분 원천 필요)**. **pilot_draft 실질 후보 3**(신규 단일균), 나머지는 already_covered/defer/manual.

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
|---|---|
| 작업 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(127.0.0.1:15501) → psql SELECT (read-only) |
| 인스턴스 / DB | `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| write | **0** |
| grounding 원천 | `shared_product_descriptions.content`(`mfds_easy_drug`) |

## 2. 사용/누락 선행 문서

| 문서 | 상태 |
|---|---|
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | OK |
| `CHECK-...-BATCH-ORAL-SINGLE-DRAFT-01~04-V1.md` | OK(imported/처리 단일균 확인) |
| `CHECK-...-STORE-DESCRIPTION-PIPELINE-READONLY-AUDIT-V1.md` | **MISS**(checkout에 없음) |
| `WO-...-BATCH-ORAL-SINGLE/COMBO-DRAFT-V1.md` | **MISS**(WO 파일 부재, 대응 CHECK로 대체) |
| `WO-...-NUTRITION-COMBO-CLASSIFICATION-PILOT-V1.md` | **MISS** |

> 누락 WO는 checkout에 없으나 대응 CHECK 문서/registry로 근거 확보 가능 → 진행. 가이드 존재.

**스키마 주의:** WO §9 SQL은 `product_drug_extensions`(ingredient_summary·active_ingredients·efficacy_text 등)를 사용하나, **OTC는 이 임상 필드가 전량 NULL**(보수 mirror). 따라서 균주/성분은 `product_masters.name` 괄호 파싱 + `product_identifiers.ATC_CODE` + `shared_product_descriptions.content`(e약은요 원문)로 대체 조사함.

## 3. 모수 (실측)

**probiotic OTC 후보 = 607 (전량 A07FA, 키워드-only 추가 0):**

| ATC | masters | mfr | 성격 |
|---|--:|--:|---|
| A07FA01 | 351 | 57 | 단일균(락토/바실루스/엔테로/스트렙) 주력 |
| **A07FA51** | 164 | 23 | **다균 복합(조합코드 51≥50)** |
| A07FA02 | 70 | 10 | 효모균(Saccharomyces boulardii) |
| A07FA | 19 | 6 | 미상(코드 미세분해 안됨) |
| A07FA03 | 3 | 1 | E.coli Nissle 1917 |

> A07FA51(51 접미)은 combo 탐지 규칙(substr(atc7,6,2)≥50)에 걸려 **단일 경구 트랙(batch-01~04)에서 제외**됐던 정확한 대상이다. probiotic OTC 전체가 A07FA 안에 있음(정장제 키워드 매칭이 A07FA 밖에서 0).

## 4. 단일균 distinct 목록 (name 괄호, 노이즈 제외)

| strain(균주) | ATC | masters | mfr | grounded | 상태 |
|---|---|--:|--:|--:|---|
| 바실루스리케니포르미스균 | A07FA01 | 154 | 35 | 129 | **already_covered**(imported 250 + batch-01 500/200/100) |
| 락토바실루스아시도필루스균 | A07FA01 | 38 | 13 | 19 | **already_covered**(imported 300) |
| 엔테로코쿠스페슘스트레인세르넬레68균 | A07FA01 | 34 | 5 | 27 | **already_covered**(imported 30) |
| 사카로마이세스보울라르디균 | A07FA02 | 36(+22 철자변형) | 3 | 15 | **already_covered**(imported 282.5, 효모) |
| **락토바실루스카제이변종람노수스** | A07FA01 | 16(+11 동결건조) | 1 | 16 | **pilot_draft 후보**(신규, 단일제조사) |
| 엔테로코쿠스페칼리스BIO-4R균 | A07FA01 | 3 | 1 | 3 | pilot/manual(신규, 저count) |
| 스트렙토코카스페시움스트레인세르넬레68균 | A07FA01 | 3 | 2 | 2 | manual(저grounding) |
| 스트렙토코카스페칼리스F-100균 | A07FA01 | 5 | 1 | 0 | defer(무grounding) |
| E.colistrainNissle1917 | A07FA03 | 3 | 1 | 0 | defer(무grounding) |
| 바실루스클라우지균포자 | A07FA01 | 1 | 1 | 0 | defer(단일·무grounding) |

> **관찰:** 대형 단일균 4종(바실루스리케니포르미스·락토아시도필루스·엔테로페슘세르넬레68·사카로보울라르디)은 이미 imported/batch 처리됨. **비피더스(Bifidobacterium)·낙산균(Clostridium butyricum) 단일 OTC는 A07FA 단일균 목록에 없음**(다균복합 안에 포함되거나 OTC 부재) → PROBIO-BIFIDO-SINGLE·PROBIO-BUTYRIC-SINGLE는 현재 OTC 단일 후보 없음.

## 5. 다균복합(A07FA51) — **균주 조성 복원 불가(핵심 blocker)**

- A07FA51 = 164 masters / 23 mfr / **grounded 103**. name은 브랜드명(락토프린정·바이오탑디포르테캡슐 등)으로 **괄호 균주 표기 없음**(무괄호 161).
- e약은요 원문에도 **성분(균주 조성)이 기재되지 않음** — 효능·효과/용법·용량/주의사항만 존재(실측: 락토프린정·바이오탑디포르테 원문 확인).
- `product_drug_extensions.active_ingredients` = OTC 전량 NULL.
- **결과:** 현재 DB로는 다균복합의 **균주 시그니처(normalized_strain_signature)를 복원할 수 없다.** WO §7("균종/균주 다르면 분리·다균 조합 다르면 분리")를 만족하는 group_key를 만들 수 없음.
- **판정:** A07FA51 전량 **defer** — 균주 조성은 **MFDS 허가 성분 원천(품목허가 상세)** 확보 후에만 그룹화·작성 가능. e약은요 효능이 동일(정장/설사/묽은변/변비)하다고 브랜드를 자동 병합하지 않는다(§8).

## 6. 분류표 (probiotic_label × action)

| probiotic_label | group_key(요약) | strain | live/type | grounding | masters/mfr | action | reason |
|---|---|---|---|---|---|---|---|
| PROBIO-BACILLUS-SINGLE | 바실루스리케니포르미스균 ×함량×제형 | 단일 | 생균(포자형성) | strong(129) | 154/35 | already_covered | imported+batch 처리 |
| PROBIO-LACTO-SINGLE | 락토바실루스아시도필루스균 ×제형 | 단일 | 생균 | partial(19) | 38/13 | already_covered | imported 300 |
| PROBIO-ENTERO-SINGLE | 엔테로코쿠스페슘세르넬레68 ×제형 | 단일 | 생균 | strong(27) | 34/5 | already_covered | imported 30 |
| PROBIO-YEAST-SINGLE | 사카로마이세스보울라르디균 ×제형 | 단일(효모) | 효모균 | partial(15) | 58/10 | already_covered | imported 282.5(철자변형 정규화) |
| **PROBIO-LACTO-SINGLE** | **락토바실루스카제이변종람노수스 ×제형(정/동결건조배양물)** | 단일 | 생균 | strong(16+11) | 27/1 | **pilot_draft** | 신규·grounded, 단일제조사(저시장) |
| PROBIO-ENTERO-SINGLE | 엔테로코쿠스페칼리스BIO-4R균 | 단일 | 생균 | weak(3) | 3/1 | manual_review | 저count·저grounding |
| PROBIO-SPECIAL | 스트렙토코카스페시움세르넬레68 | 단일 | 생균 | weak(2) | 3/2 | manual_review | 균주 표기 정합·저grounding |
| PROBIO-SPECIAL | 스트렙토코카스페칼리스F-100 / E.coli Nissle / 바실루스클라우지 | 단일 | 생균/포자 | none(0) | 9/3 | defer | 무grounding, 원문 보강 필요 |
| **PROBIO-MULTI-STRAIN** | **A07FA51 다균복합(브랜드별)** | 다균 | 혼합 | efficacy만(103) | 164/23 | **defer** | **균주 조성 DB 부재**(§5), 허가 성분 원천 필요 |
| PROBIO-SPECIAL | A07FA 무괄호(A07FA01/A07FA 브랜드) | 미상 | 미상 | 부분 | 62/9 | defer | name에 균주 없음, 원문 성분 필요 |

## 7. grounding 요약

| grounding | 대상 | 처리 |
|---|---|---|
| strong | 대형 단일균(바실루스·엔테로세르넬레68) + 람노수스 | already_covered / pilot |
| partial | 락토아시도필루스·사카로보울라르디 | already_covered |
| efficacy-only(성분 부재) | A07FA51 다균 · 무괄호 | defer(성분 원천 필요) |
| weak/none | 저count 단일·무grounding | manual/defer |

## 8. 정장제 설명서 작성 기준 (확정)

WO §11~§13 채택 + 실측 반영:

### 8.1 제목(성분 중심)
- `[균주/균종] [균수/역가] [제형] 정장제` (예: 락토바실루스람노수스 정장제 캡슐)
- 다균복합: 균주 조성 확정 전에는 제목 생성 금지(브랜드 통칭 금지).

### 8.2 기본 구조 (가이드 §5 + probiotic 확장)
```md
# [균주/균종] 정장제 [제형]
| 항목 | 내용 |  (분류·주요성분·균주/성격·사용목적·선택포인트·주의대상·약사상담)
## 어떤 경우에 선택하나 / ## 복용 안내 / ## 주의 대상 / ## 균주 확인 포인트 / ## 성분 기준 선택(§6 GMP)
```

### 8.3 실측 반영 필수 주의 문구(정장제 공통, e약은요 근거)
- 갈락토오스 불내성·Lapp 유당분해효소 결핍·포도당-갈락토오스 흡수장애 유전 문제 시 복용 금지(유당 함유 부형제).
- 만 7세 이하·신생아·임부·수유부 복용 금지 또는 상담(품목별 상이 → 원문 확인).
- 발열/혈변/점액변 동반, 설사 지속, 1개월 미개선 시 의사·약사 상담.
- 면역저하·중증질환 상담(생균 특성).

### 8.4 금지 표현(WO §13 채택)
장 완전회복 / 누구나 장기복용 안심 / 유산균은 모두 같음 / 건기식보다 효과 좋음 / 설사 즉시 멈춤 / 면역력 상승 — 금지.

### 8.5 분리/비분리 기준(WO §7·§8 확정)
- 분리: 균종·균주, 단일/다균, 다균 조합, 생균/사균/포자/효모, 균수·역가·함량, 제형(복용법/연령/보관 상이), 허가 효능, 용법(소아/성인), 균주 외 성분.
- 비분리: 제조사·브랜드·포장단위·바코드·판매채널·맛/향.
- **통칭(정장생균/유산균/프로바이오틱스)은 탐색어일 뿐 group_key 아님.** 다균은 기본 needs_review 이상.

## 9. pilot_draft 선정 (실측 기반 — 소규모)

WO는 10~20 목표이나, **실측상 신규 작성 가능 단일균은 소수**(대형 4종 already_covered, 다균 조성 복원 불가). 정직하게 축소 선정:

| No | probiotic_label | group_key | grounding | action |
|-:|---|---|---|---|
| 1 | PROBIO-LACTO-SINGLE | 락토바실루스카제이변종람노수스 정 | strong(16) | **pilot_draft** |
| 2 | PROBIO-LACTO-SINGLE | 락토바실루스카제이변종람노수스 동결건조배양물 (제형 분리) | strong(11) | **pilot_draft** |
| 3 | PROBIO-ENTERO-SINGLE | 엔테로코쿠스페칼리스BIO-4R균 | weak(3) | pilot_draft(조건부) / manual |

> 대형 단일균 4종(바실루스리케니포르미스·락토아시도필루스·엔테로페슘세르넬레68·사카로보울라르디)은 **already_covered**로 pilot 제외(원한다면 함량/제형 변형 보완 pilot 가능). pilot 총 실질 = **2~3**.

## 10. 미작성/보류 사유 요약

| 버킷 | 규모 | 사유 |
|---|--:|---|
| already_covered(대형 단일균 4종) | ~282 masters | imported/batch 처리 완료 |
| pilot_draft(신규 단일) | 2~3 그룹 | 후속 PILOT-DRAFT WO에서 작성 |
| defer: 다균복합 A07FA51 | 164/103 | **균주 조성 DB 부재** → 허가 성분 원천 필요 |
| defer: 무괄호 A07FA | 62 | name에 균주 없음 |
| defer/manual: 저·무grounding 단일 | ~20 | 원문 보강 |

## 11. 다음 권장 WO

1. **(선행 필수) A07FA51 균주 조성 원천 확보 WO** — MFDS 품목허가 상세(주성분 조성)를 원천으로 다균복합 균주 시그니처 확보. 이것 없이는 다균 정장제 그룹화·작성 불가(§5).
2. **WO-...-PROBIOTIC-PILOT-DRAFT-V1** — §9 pilot 2~3(락토람노수스 등) e약은요 grounded 초안. DB write 0.
3. 대형 단일균 4종 함량/제형 변형 보완(선택).
4. (상위) 누적 drafted 그룹 DB 반영 설계는 별도 승인 WO.

## 12. 완료 기준 대조 (WO §17)

| 성공 기준 | 충족 |
|---|:-:|
| A07FA/정장제 후보군 산출 | ✅ 607(§3) |
| 단일균/다균/균주외성분 분리 | ✅ §4·§5·§6 |
| probiotic_label/group_key 부여 | ✅ §6 |
| 제조사/master 우선순위 | ✅ §4 |
| grounding strong/partial/weak 판정 | ✅ §6·§7 |
| pilot_draft 선정 | ✅ §9(실측상 2~3, 사유 명시) |
| 보류/제외 사유 문서화 | ✅ §10 |
| 정장제 설명서 기준 확정 | ✅ §8 |
| DB write 0 | ✅ §13 |

## 13. 금지사항 준수 확인

| 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT만) |
| shared_product_descriptions insert/update | ✅ 0 (원문 읽기만) |
| product_candidate_description_drafts insert/update | ✅ 0 |
| product_drug_extensions 변경 | ✅ 0 |
| ProductMaster/Candidate 상태 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 0 |
| 근거 부족 AI 임의 보강 | ✅ 0 |
| 건기식 프로바이오틱스 혼입 | ✅ 0(OTC A07FA 한정) |
| "유산균" 통칭 group 생성 | ✅ 0 |

---

*V1 · 2026-07-07 · probiotic OTC 607(A07FA) · 단일균 그룹화 가능(대형4 완료) · 다균복합 A07FA51 조성 DB부재→defer · pilot_draft 2~3 · DB write 0*
