# CHECK — WO-O4O-HFF-COMBO-COMPLETION-B-GUT-METABOLIC-V1 (에이전트 나)

> 장·배변·혈당·체지방·콜레스테롤·면역 **복합형(combo)** HFF 매장용 설명서 연속 생산.
> 조사 → HOLD_MULTI census → signature 분류 → 생산 → dry-run → apply → 독립검증.

- 시작: 2026-07-23T05:50:18Z
- 종료: 2026-07-23T06:28:02Z
- 기준선(내 세션 시작 시점): STORE canonical HFF SPD = **19,628**
- 최종 재측정: STORE canonical HFF SPD = **21,164** (동시 진행 중인 A/C 세션 포함 누계)
- 내 세션 순수 기여: **신규 마스터 190 · STORE canonical SPD 380(ko 190 + en 190)**

---

## 1. 산출 요약

| 항목 | 값 |
|------|---:|
| 후보 전량 스캔(product_candidates) | 전체 MFDS HFF |
| B/MIXED 완전분류 다원료 signature | **236** |
| 구조상 untaken 후보(census) | **827** |
| select 통과(정밀 표시량 grounding) sig | 57 |
| generate 생산가능 units | 247 |
| dry-run PASS sig / units | 47 / 220 |
| **apply COMMIT sig / 신규 마스터** | **43 / 190** |
| 총 DB write | **760** (masters 190 + candidate update 190 + SPD 380) |
| auto-HOLD units | 2 |
| A/C 동시생산 선점 race-skip sig | 14 (전량 승격됨, DB write 0) |

### 상위 조합별 신규 LIVE

| signature | 신규 |
|-----------|---:|
| 셀레늄+아연+프로폴리스 (면역) | 22 |
| 가르시니아+비타민B1 (체지방+대사) | 19 |
| 가르시니아+나이아신+B복합 (체지방+대사) | 19 |
| 가르시니아+녹차 (체지방+항산화+콜레스테롤) | 11 |
| 비타민E+아연+프로폴리스 (면역+항산화) | 10 |
| 가르시니아+나이아신+B복합+비타민C | 6 |
| 가르시니아+비타민B1B2B6+셀레늄+판토텐산 | 6 |
| 가르시니아+비타민B1B2B6 | 6 |
| … (총 43 sig) | |

도메인: **체지방(가르시니아 계열)·면역(프로폴리스·아연 계열)·대사(녹차·B복합)** — B 영역 정중앙.

---

## 2. basis 원칙 준수 (B-08)

기능성 원료명 / 지표성분명 / 원료 함량 / 지표성분 함량 / 1일 섭취량 / 총 제품 용량을 구분.

- **가르시니아**: 설명서에 `가르시니아캄보지아 추출물 1000mg` = **원료 표시량**으로 기재. HCA(무수 하이드록시시트르산) 지표성분 함량을 원료량으로 오인하지 않음.
- 표시 기준 블록에 `표시량(1000mg/3600mg)의 80~120%` 형식 — **원료 표시량 vs 총 제품 용량(3600mg)** 명시 구분.
- **grounding 게이트 작동**: select 단계에서 원료 declaredAmount 가 `표시량 이상`(ratio, 상한값 부재)이거나 value/basisAmount ≤ 0 인 후보는 전량 HOLD. 식이섬유·차전자피·이눌린 계열은 표준 표기가 `X g 이상`이라 정밀 dose 임베드 불가 → 전량 보류(방어 아님, basis 무결성 보호).
- **G-MULTI-AMOUNT-SOURCE** 가드: 각 원료 표시량이 BASE_STANDARD 원문에서 자기 원료에 귀속되어 등장하는지 검증(원료 간 수치 이동 차단).

## 3. 복합 기능성 보존

임의 축소 없이 원료별 공식 인정 기능성 전량 병기 확인:

- 아연 → `정상적인 면역기능에 필요` + `정상적인 세포분열에 필요` (2개 모두 유지)
- 가르시니아 → `탄수화물이 지방으로 합성되는 것을 억제하여 체지방 감소에 도움`
- 녹차 카테킨 → `체지방 감소` + `항산화·체지방 감소·혈중 콜레스테롤 개선` (복수 기능성 유지)
- 질환·증상·전문 표현 순화 없음. 원문 밖 치료·예방 주장 없음. 전문가 상담 footer 전 제품 유지.

---

## 4. 자동 apply 게이트 (독립검증 결과)

| 게이트 | 결과 |
|--------|:---:|
| dry-run postVerifyPass | ✅ 47/47 |
| canonicalDup (내 190 마스터) | **0** |
| statementNo 중복(파일 내) | **0** (247 유일) |
| 예상 write = 실측 write | ✅ (masters 190 / spdKo 190 / spdEn 190 / candLinked 190) |
| rollback manifest | ✅ 배치별 `hff-combo-b-*-apply-rollback-manifest.json` |
| A/C 조합 교집합 (permitOverlap) | **0** |
| 기존 LIVE drift (spd created≠updated) | **0** |
| 연결(candidatesLinked, spdRefLinked) | ✅ 190 / 380 |

이중게이트: dry-run(exec+ROLLBACK, DB write 0) → apply(`HFF_NUTRIENT_APPLY_CONFIRM=YES` COMMIT). 동시 생산 레이스는 `--skip-promoted` 로 배치 abort 대신 선점분 제외.

---

## 5. A/C 트랙 경계

- 콜라겐·관절·피부 → A / 눈·인지·혈행 → C. 본 세션은 B(장·대사·면역)만.
- 동시 진행 중인 Agent C 가 녹차·GLA·가르시니아-비타민C·나이아신-녹차 combo 를 세션 중 선점 → dry-run→apply 사이 14 sig(20 units) 전량 승격. `--skip-promoted` + select `--exclude-taken` 로 **교집합 0** 확보(permitOverlap=0).
- 파일 격리: B 전용 `hff-combo-b-census.ts` 만 수정/추가. Agent C 공용 파이프(`hff-combo-select/generate/compose`, `hff-nutrient-registry`, `hff-nutrient-store-canonical-apply`)는 **read-only 실행만**(무편집).

## 6. 미생산 / 잔여

- **식이섬유·차전자피·이눌린·난소화성말토덱스트린 계열**(장 건강·배변): 표준 표기 `X g 이상` → 정밀 표시량 부재 → grounding HOLD. 별도 "표시량 이상형 combo" 저작 규격 필요(현 파이프 범위 외).
- **키토산·키토올리고당·알콕시글리세롤 / 알로에·베타글루칸·표고버섯균사체**: census 완전분류 signature 미출현(미등록 원료 또는 단일형). B-03 registry 보완 후보 조사 결과 unknownFreq 상위는 파싱 노이즈 + HCA(가르시니아로 이미 처리) + C 도메인(Rg3/DHA) → **신규 등록가치 B 원료 없음**.
- greentea/gla/garcinia-vc 계열: Agent C 선점.
- 따라서 **현 파이프·registry 기준 생산가능 안전 후보 소진(B-10 충족)**.

## 7. 검증 채널

- DB: cloud-sql-proxy `127.0.0.1:5442` · user `o4o_api` · database `o4o_platform` (read-only 검증 SELECT).
- 독립검증 쿼리: myMasters=190 · spdKo=190 · spdEn=190 · canonicalDup=0 · candLinked=190 · permitOverlap=0 · spdUpdatedNeqCreated=0.

## 8. 산출물

- B 전용 census: `apps/api-server/src/scripts/hff-combo-b-census.ts` (READ-ONLY, DB write 0. sig→untaken stmt 맵 출력 추가).
- rollback manifest: 배치별 (OS temp `hff-apply-manifests/` 하위, 세션 산출물).
- 공용 파이프(select/generate/compose/apply): 무편집 read-only 실행.

**결론(1차 패스)**: B(장·대사·면역) 복합형 190 신규 STORE canonical LIVE. canonicalDup 0 · A/C 교집합 0 · drift 0 · basis 무결성 보존 · 복합 기능성 전량 유지. 중지 조건 해당 없음.

---

## 9. 2차 패스 — sweep 기반 CLEAN_REGISTERED 소진 (동일 WO 후속)

> 1차 census §6의 "생산가능 소진" 판정은 **census select-gate 한정**이었다. 등록 원료(NUTRIENT_META+FUNCTIONAL_META) 조합의 CLEAN_REGISTERED signature 를 `hff-combo-select --exclude-taken` 로 **전수 재-sweep** 하니 census select-gate 가 놓친 안전 후보가 추가로 발굴됨. 별도 태그 네임스페이스 `batch:combo-b-*` 로 격리 생산.

- 시작: 2026-07-23T06:40Z 경 · 종료: 2026-07-23T07:xxZ (2차)
- 기준선: 1차 종료 시점(combo-b- 태그 0)
- CLEAN_REGISTERED:B signature sweep: **152 sig** (select+generate, DB write 0)
- sweep 결과: PASS **246 units** / auto-HOLD 2 / error 0
- A 도메인(MSM·글루코사민) 조합 제외(도메인 경계)
- **apply COMMIT: 88 신규 마스터** (SPD 176 ko 88 + en 88) · 총 DB write **352** (masters 88 + candidate update 88 + SPD 176)
- gate-fail 43 sig: dry-run→apply 사이 Agent C 동시선점(ALREADY_PROMOTED) — 트랜잭션 재검증으로 안전 skip, **bad write 0**
- 레이스 43 sig 복구 시도(fresh `--exclude-taken` 재생성 후 재-apply): 전량 이미 승격 → **복구 yield 0** (동시선점 소진 확정, 반복 racing 중단)

### 2차 독립검증 (`hff-combo-b-verify.ts`, 별도 연결·read-only)

| 항목 | 값 |
|------|---:|
| myMasters (batch:combo-b-*) | 88 |
| myKo / myEn (STORE canonical) | 88 / 88 |
| candidatesLinked (approved_new_master) | 88 |
| canonicalDup | 0 |
| permitDup | 0 |
| crossPermitWithOthers (비-combo-b 마스터와 permit 충돌) | 0 |
| barcodeNonNull / wrongRegType / wrongSourceType | 0 / 0 / 0 |
| **PASS** | ✅ |

### 1차↔2차 격리 재확인 (DB 직접 쿼리)

- `single-nutrient-combo-b-*`(1차 190) ∩ `combo-b-*`(2차 88) 마스터 교집합 = **0**
- 두 패밀리 간 cross-permit 충돌 = **0** → 완전 disjoint(중복 생산 0)

### 2차 basis / 복합 기능성

- 2차도 `composeCombo` 가 각 원료 **표시량(추출물 mg)** 만 임베드(지표성분 HCA 아님) · G-MULTI-AMOUNT-SOURCE 가드로 원료 귀속 검증. 1차와 동일 무결성.
- 가르시니아 계열(체지방) + 비타민/미네랄 부원료 조합이 다수 — 공식 기능성 전량 병기 유지.

### 2차 산출물 (B 전용, 무편집 공용 파이프 재사용)

- `apps/api-server/src/scripts/hff-combo-b-sweep.ts` — CLEAN_REGISTERED sweep 드라이버(공용 select/generate read-only 호출).
- `apps/api-server/src/scripts/hff-combo-b-apply.ts` — sweep PASS target 이중게이트 apply 드라이버(공용 `hff-sf-apply` 무편집 재사용, A 도메인 제외).
- `apps/api-server/src/scripts/hff-combo-b-verify.ts` — 독립검증(별도 연결).

---

## 최종 결론 (WO 종료)

| 패스 | 태그 | 신규 마스터 | DB write | 검증 |
|------|------|---:|---:|:---:|
| 1차 census | `batch:single-nutrient-combo-b-*` | 190 | 760 | PASS |
| 2차 sweep | `batch:combo-b-*` | 88 | 352 | PASS |
| **합계** | — | **278** | **1,112** | **PASS** |

- 교집합 0 · cross-permit 0 · canonicalDup 0 · A/C 교집합 0 · drift 0 · basis 무결성 보존 · 복합 기능성 전량 유지.
- 레이스 복구 yield 0 확인 → **현 파이프·registry 기준 생산가능 안전 후보 소진(B-10 최종 충족)**.
- 잔여: 식이섬유·차전자피·이눌린 계열(`X g 이상` grounding HOLD) 및 B_NEW_EXTENDABLE(키토산·옥타코사놀 등 미등록 원료)은 별도 저작 규격/registry 확장(B-03 Phase 2) 필요 — 현 파이프 범위 외. 중지 조건 해당 없음.

---

## §10. 미등록·HOLD 재검토 라운드 (WO-O4O-HFF-COMBO-UNREGISTERED-B-GUT-METABOLIC-V1)

전수 재검토로 미등록 원료 combo + dose/basis HOLD 군을 B 전용 additive seam으로 재평가. 태그 네임스페이스 `batch:combo-b-unreg-*`(라운드 provenance 분리, `hff-combo-b-apply.ts` 에 `HFF_COMBO_B_TAG_PREFIX` env 추가).

### 10-1. 식이섬유 combo family → **PENDING_SHARED** (생산 보류, 근거 확정)

WO 우선대상 (4) 차전자피·이눌린·난소화성말토덱스트린 식이섬유 combo를 원천(BASE_STANDARD) 표본 조사한 결과 **공용 파서 확장 없이는 안전 생산 불가**로 확정:

- **generic `식이섬유` 표기 = 서로 다른 실제 원료** — 동일 "식이섬유 : 표시량(Xg/Yg)" 라인이 제품마다 난소화성말토덱스트린 / 폴리덱스트로스 / 무명 식이섬유로 상이. 어느 원료가 표시량을 제공하는지 라인만으로 특정 불가.
- **다(多)식이섬유 제품 다수** — 폴리덱스트로스 2.6g + 프락토올리고당 1.5g 처럼 원료별 표시량이 별도 존재하나 `parseSpecs` 가 전부 단일 `식이섬유` 키로 붕괴 → **원료별 귀속 소실**.
- **기능성·타도메인 원료 누락** — `parseSpecs` 가 자일로올리고당(유익균)·은행잎(AC)·홍국(콜레스테롤)·밀크씨슬(간) 등을 sig에서 탈락 → sig `식이섬유+아연` 이 실제 조성을 과소표현. 생산 시 WO "복합 기능성 일부만 남기지 않음" 위반.
- WO 규정 "여러 식이섬유 원료가 함께 있을 때 원료별 귀속 … 환산 관계가 불명확하면 임의 생산하지 않는다" 및 중지조건 "지표성분·원료량 광범위 오해석"에 해당.
- **필요 조치(PENDING_SHARED)**: 식이섬유 원천 인지 공용 파서(난소화성말토덱스트린/폴리덱스트로스/프락토올리고당/자일로올리고당 등 원료별 분리 키 + 원료별 표시량 + 탈락 기능성 포착) = Agent C 소유 공용파일(`hff-source-parse.ts`) 변경. B 단독 생산 금지 → 별도 WO 핸드오프.

### 10-2. dom=B 비식이섬유 AC-free combo → **14 신규 LIVE**

전수 census(41,261 스캔)에서 dom=B·untaken·비식이섬유·AC 무오염 sig **83개(182 untaken)** 를 공용 `select --exclude-taken` + `generate`(무편집, 완전가드) 로 sweep:

- eligible 7 → generate PASS **14 unit** (exact TARGET_SET 매칭 + HOLD_MULTI 대량 제외 + exclude-taken 로 tail 소진 확인).
- 조성: 프로폴리스(면역) 11 + 옥타코사놀(콜레스테롤/혈행) 3. 전부 registry 등록 원료·완전가드 통과.
- 이중게이트 apply(dry-run gateFail 0 → `--apply`): **applied 14 · DB write 56 · gateFail 0**.

### 10-3. 정당 HOLD (false-negative 아님, 유지)

eligible 중 4건은 공용 가드가 정당 차단(basis 무결성 보호, WO 요구대로 유지):

- `PRE-SRC-BASIS-MISMATCH-002` 1건(아연+프로폴리스) · `G-MULTI-AMOUNT-SOURCE` 3건(가르시니아+녹차, 옥타코사놀+프로폴리스, 녹차+마그네슘) — 원료간 수치 이동/basis 불일치 차단. false-negative 없음.

### 10-4. 독립검증 (별도 연결, `HFF_COMBO_B_VERIFY_TAG` 델타)

| 범위 | myMasters | ko | en | candLinked | canonicalDup | permitDup | crossPermitWithOthers | barcode/regType/sourceType |
|------|---:|---:|---:|---:|---:|---:|---:|:---:|
| 델타 `combo-b-unreg-%` | 14 | 14 | 14 | 14 | 0 | 0 | 0 | 0 |
| 패밀리 `combo-b-%` | 102 | 102 | 102 | 102 | 0 | 0 | 0 | 0 |

- 패밀리 102 = 2차 sweep 88 + 이번 14. crossPermitWithOthers 0 → 1차(190)·A·C 등 타 산출물과 permit 충돌 0(완전 disjoint).

### 10-5. 라운드 결론

| 항목 | 값 |
|------|---|
| 신규 마스터 | **14** (프로폴리스 11 + 옥타코사놀 3) |
| DB write | **56** (master 14 + candidate 14 + SPD ko 14 + SPD en 14) |
| 정당 HOLD | 4 (guard 유지) |
| PENDING_SHARED | 식이섬유 combo family (공용 파서 확장 필요) |
| 독립검증 | PASS (canonicalDup 0 · permitDup 0 · crossPermit 0 · drift 0) |
| **누적 B** | 549 + 278 + **14** = **841** |

- 비식이섬유 dom=B 안전 후보는 이번 14로 사실상 소진(83 sig 중 eligible 7·PASS 14 unit). 잔여 안전 확장 = 식이섬유 공용파서(PENDING_SHARED) 에 종속.
