# CHECK — HFF 대규모 단일 기능성 원료 + 2~3원료 복합형 연속 E2E

- WO: `WO-O4O-HFF-LARGE-FUNCTION-GROUPS-AND-MULTI-INGREDIENT-CONTINUOUS-END-TO-END-V1` (Agent B)
- 일자: 2026-07-17
- 성격: PART A 대규모 단일 기능성 원료 → PART B 2~3원료 복합형. 연속 생산 → 프로덕션 LIVE(§13 조건부 apply 사전승인). HFF 전용.
- 선행 완료(재처리 안 함): 유산균 · VC 100 · VD 417 · 단일 비타민·미네랄 19그룹 1,036.
- **진행: PART A 착수 — MSM 340 LIVE. 나머지 대형 기능성 그룹 연속 처리 중.**

---

## 1. PART A — 대규모 단일 기능성 원료 인벤토리 (§4)

단일 기능성 = BASE_STANDARD 기능성 스펙("라벨 : N/basis 의 ratio") **정확히 1개 = 대상 원료**, 비타민·미네랄 표시량 0. (인벤토리 `hff-function-inventory.ts`.)

| 우선 | 원료 | 단일 적격(추정) | 상태 |
|--:|---|--:|---|
| 1 | MSM | 401 | **LIVE 340** |
| 2 | 루테인 | 251 | **LIVE 203** |
| 3 | 밀크씨슬 | 237 | **LIVE 169** |
| 4 | 코엔자임Q10 | 153 | **LIVE 102** |
| 5 | 녹차 카테킨 | 150 | **LIVE 98** |
| 6 | 가르시니아 | 145 | **LIVE 106** |
| 7 | 감마리놀렌산 | 129 | **LIVE 64** |
| 8 | 글루코사민 | 124 | **LIVE 80** |
| 9 | 프로폴리스 | 112 | **LIVE 77** |
| 10 | 오메가3 | 111 | **LIVE 65** |
| 11 | 식이섬유 | 106 | **LIVE 2**(다수 HOLD) |
| 12 | L-테아닌 | 98 | **LIVE 77** |
| 13 | 은행잎 | 52 | **LIVE 19** |
| 14 | 옥타코사놀 | 44 | **LIVE 25** |

단일 기능성 원료 적격 추정 합계 **2,151**. (복합형=PART B, 별도.)

## 2. 파이프라인 확장 (기능성 원료)

단일 영양소 파이프라인(hff-nutrient-*)에 기능성 원료 지원 추가:
- `hff-function-inventory.ts` — 기능성 스펙 기반 그룹 집계
- `hff-nutrient-registry.ts` — **FUNCTIONAL_META**(원료 표시명/slug/kind) + **편익 컴포넌트 ko→en 매핑**("항산화·체지방 감소·…에 도움을 줄 수 있음" 분해 → "May help with …"). 미매핑→HOLD.
- `hff-function-select.ts` — 단일 기능성 스펙 검출 + 지표성분 표시량 추출 + 기능성 ko 추출(원문)·en 매핑
- compose/generate/apply/verify — 영양소 라인과 동일 재사용 (composer 는 kind='functional' 시 "기능성" 헤더)

**grounding**: 기능성 ko=MAIN_FNCTN 원문 verbatim, en=컴포넌트 매핑. 지표성분 표시량(예 MSM 1500mg/3g의 80~120%). 물 원문 근거. per-unit 미생성. 질병 예방·치료 0(공식 "도움을 줄 수 있음" 유지).

## 3. 그룹별 결과

### 3.1 MSM — COMPLETED_WITH_HOLDS · LIVE 340

- 선정: mention 717 → 적격 **340**. HOLD: 복합 306 · 액상 12 · 수출 11 · grounding 42 · 벌크 5 · 제품명 수량스케일어 1.
- 생성: **PASS 316 · REVIEW 24 · BLOCKED 0**. REVIEW = 코팅정 성상 D-CLAIM-GROUNDED 20 + PRE-SRC-BASIS-UNVERIFIABLE 14(가드 parseBasis 가 무괄호 "2000mg의" 포맷 미파싱 — 기준량은 원문·추출 정확, known-safe).
- 기능성: 관절 및 연골건강에 도움을 줄 수 있음 → May help with joint and cartilage health.
- 적재: dry-run 9/9 → apply COMMIT → 독립검증 13/13 PASS. write **1,360**(master 340 + candidate 340 + SPD 680). tag batch:single-nutrient-msm.

**생산 중 규칙화**: 제품명 수량 스케일어("삼성88조인트"의 '88조'=phantom trillion) → 가드 H-COUNT 오탐 → 제품명 `\d[조억만천]` HOLD_IDENTITY 격리.

---

## (진행 중) 누적

| 지표 | 값 |
|---|---:|
| PART A 완료 그룹 | **14 (완료)** — 11 (MSM·루테인·밀크씨슬·코엔자임Q10·글루코사민·가르시니아·녹차·테아닌·은행잎·옥타코사놀·식이섬유) |
| LIVE 신규 ProductMaster | **1,427** |
| LIVE STORE canonical SPD | **2,854** |
| DB write | **5,708** |
| BLOCKED | 0 (개별 BLOCKED 는 generate 단계 자동 HOLD — HOLD_NAME_UNGROUNDED_CLAIM 등) |

> 이번 세션 Agent B 누적 LIVE(VD 417 + 단일영양소 1,036 + 기능성원료 1,427) = **2,880 제품**. HFF o4o_hff_generated 전체 master 3,437.

**생산 중 규칙화(추가)**: ①개별 guard BLOCKED(예: "다이어트젤리" 제품명 E-NAME-DERIVED) → generate 자동 HOLD(HOLD_NAME_UNGROUNDED_CLAIM), 산출 json 은 항상 BLOCKED 0. ②제품명 수량스케일어 phantom count HOLD_IDENTITY.

## 4. 남은 작업 (재개 지점)
- **PART A 완료(14그룹)**. gla 64·omega-3 65·propolis 77 추가 LIVE(propolis 지표=총플라보노이드 인식 보강). 잔여는 각 그룹 HOLD(복합→PART B/액상/수출/grounding).
## 5. PART B — M2/M3 복합형 인벤토리 (§9, 완료 — read-only)

`hff-combo-inventory.ts`: 제품 기능성 스펙 집합 분류 → 조합 키. 고형·비수출·비벌크, 스펙 전부 분류된 것.

```text
M2(2원료) 1,915 · M3(3원료) 1,082 · MX(≥4, 이번 범위 제외) 3,122 · 조합 516종
```

상위 안정 조합(생산 우선): 비타민D+아연 194 · 셀레늄+아연 189 · 마그네슘+칼슘 127 · 비타민C+아연 94 · 식이섬유+아연 92 · 마그네슘+비타민D+칼슘 86 · 마그네슘+아연+칼슘 63 · 비타민D+칼슘 60 · MSM+비타민D 53 · 루테인+비타민A 48 …

### 5.1 PART B 생산 착수 — M2 4조합 121 LIVE

다중원료 composer(`hff-combo-compose.ts`)·select(`hff-combo-select.ts`)·generate(`hff-combo-generate.ts`) 구현. **원료별 독립 카드**(badge·표시량·기능성 분리, 수치·기능성 혼입 0). 기능성 귀속=INGREDIENT_FN 매칭(부원료/미귀속 기능성→HOLD).

**G-MULTI 가드**(paired test 6/6 PASS): INGREDIENT-COUNT·FUNCTION-COVERAGE·AMOUNT-PAIRING·**AMOUNT-SOURCE**(원문 BASE_STANDARD 라벨 구간에 수치 귀속 — 원료간 수치 이동 검출)·BILINGUAL(순서·개수)·DUPLICATE. 개별 위반 자동 HOLD.

| 조합 | LIVE | 비고 |
|---|--:|---|
| 비타민D + 아연 | 38 | 첫 M2. 숨은 3원료(프로바이오틱스 CFU) 136건 정확 격리 |
| 셀레늄 + 아연 | 26 | |
| 마그네슘 + 칼슘 | 20 | |
| 비타민C + 아연 | 37 | 21 auto-HOLD |
| **소계** | **121** | write 484, 전 조합 독립검증 PASS, BLOCKED 0 |

**규칙화**: 복합 귀속용으로 registry 에 비타민 D·C 기능성 en 매핑 + INGREDIENT_FN(원료별 공식 기능성 집합) 추가. 단일 라인 회귀 BLOCKED 0(zinc/MSM 무변화).

> **세션 누적 LIVE = VD417 + 단일영양소1,036 + 기능성1,427 + 복합형121 = 3,001** → WO 목표 3,000 도달. HFF o4o_hff_generated 전체 master 3,764.


### 5.2 기준규격 범위 표기 전수 점검 (보고 렌더링 vs 실산출물)

복합형 121건 표시 기준 비율 표기(`80~180%` 등) 전수 확인:
- 커밋 JSON(ko): distinct 비율 `80~180%`·`80~150%`·`89~180%`(원문 실값), 구분자 = **U+007E(~) 정상**, 구분자 결손(`80180%` 형) **0건**.
- **프로덕션 LIVE SPD(ko) 121행 전수**: 비율 표기 240개 · ~구분자 있음 **240** · 결손 **0**.
- 결론: 보고 채팅 텍스트에서 `~`가 렌더링 시 탈락한 **보고 표시 문제**. JSON·HTML·LIVE SPD 모두 원문 범위 정확 보존. **데이터/DB 결함 아님 · 교정 불필요 · 생산 계속.**

### 5.3 PART B 신규 조합 일시 보류 (환경) — PAUSED_ENV_RAW_UNAVAILABLE
raw(`G:\내 드라이브\...\mfds-...jsonl`, Google Drive)가 세션 중 일시 언마운트(`/g/` 접근 불가) → combo-select(raw 스트리밍) 불가. **코드/생산 결함 아님, 외부 인프라.** 기존 LIVE 산출물·파이프라인·커밋 무영향. G: 재마운트 시 다음 조합(마그네슘+비타민D+칼슘 등)부터 즉시 재개.

### 5.4 raw 소스 DB 전환 — 동치검증 PASS · 기본 소스 전환 (G: 비의존)

`G:` 언마운트 재발 방지 위해 combo-select 입력을 `product_candidates.raw_payload` 로 전환. **입력 어댑터 분리**(`hff-raw-source.ts`: `fileJsonlSource`/`dbCandidateSource`, `resolveSource(--source db|file)`, 실사용 소스 stderr 명시). 파이프라인(select/compose/guard)은 동일.

**동치검증(read-only, DB write 0):**
1. **필드 동치**(`hff-rawpayload-equivalence.ts`): 완료 그룹 7종 756건의 생산 JSON source ↔ DB raw_payload.source 7필드 비교 → 신고번호 결손 0 · 의미차이 0.
2. **재선정 동치**: `combo-select --source db` 로 비타민D+아연 재선정 → 파일-source 커밋 결과와 **동일 대상 38 · 신고번호 집합 차이 0 · draft 바이트 차이 0**.
   - 전체 population 차이(mention 1752 vs 1833 등)는 파일 raw 중복행 + DB 적재 시 dedup/수출제외 차이 — **적격 생산 집합은 동일**.

→ **전환 게이트 PASS**. `resolveSource` 기본 소스 = **db**(`--source file` 로 회귀/대조). raw_payload.source 11필드 전부 존재. HFF candidate 41,261.

**재개**: G: 없이 DB 소스로 `마그네슘+비타민D+칼슘`부터 combo-select→generate→dry-run→apply→독립검증 연속 생산 가능.

### 5.5 PART B 재개(DB 소스) — mg+vd+ca(M3) 72 LIVE + 최적화·수정

**첫 DB-소스 조합 생산**(G: 비의존 실증): 마그네슘+비타민D+칼슘(M3) 적격 72 · **작성 72 · BLOCKED 0 · 독립검증 PASS**. write 288.
- **서버사이드 선필터**(`hff-raw-source` dbCandidateSource baseLike): BASE_STANDARD ILIKE ALL 필요조건 부분문자열(비타민/미네랄=label 확정 substring, 동의어 원료는 제외→누락 0). vd-zn 재확인 동치 유지(38·집합차0·draft차0). 스캔 ~60s(비인덱스 JSON, foreground 가능).
- **정규화 dedup 수정**(combo-select): 같은 기능성 공백 변이(골다공증"발생위험감소" vs "발생위험 감소")가 ko 중복→en 붕괴로 개수 어긋남 → normFn 기준 ko/en 쌍 정렬 dedup. mg-vd-ca 오탐 9건 해소(63→72).
- **G-MULTI-BILINGUAL 순서검사 수정**(compose): 원료명 raw indexOf 금지("칼슘"이 비타민D 기능성에 등장) → 기능성 카드 마커 위치로 판정.
세션 누적 LIVE = 3,001 + 72 = **3,073**.

**PART B 생산 재개 지점**: 다중원료 composer 확장 필요 — ① 2~3 원료 각각 badge/표시량/기능성 렌더 ② 원료별 지표성분·기준량 분리(수치 혼입 0) ③ ko/en 원료별 기능성 대응 전수검사(§10) ④ 조합별 20건 내부 게이트 → BLOCKED 0·기능성 누락/추가 0·수치 혼입 0 시 잔여 전량. 가장 큰 안정 M2(비타민D+아연 등)부터. 기존 단일 composer/registry/apply/verify 재사용, 다중 편익 병합만 신규.

### 5.6 PART B 재개(prompt 모드·사용자 프록시 5442) — 비타민D+칼슘(M2) 45 LIVE

**승인 프로토콜 생산**: 사용자 실행 Cloud SQL Auth Proxy `127.0.0.1:5442` + `apps/api-server/.env` 자격증명, 권한 prompt 모드에서 단계별 승인(read-only → generate/dry-run → apply)으로 진행.
- **선정**(combo-select --source db): mention 708 → ELIGIBLE **45**. HOLD: HOLD_MULTI 650(추가 기능성 원료) · 액상 1 · grounding 12 · 수출/벌크 0.
- **생성**: 작성 45 · **PASS 39 · REVIEW 6 · BLOCKED 0 · G-MULTI HOLD 0**. REVIEW = D-CLAIM-GROUNDED 4제품(코팅정제 성상, 원문 근거 grounding) + PRE-SRC-BASIS-UNVERIFIABLE 2제품(가드 mg환산 분모 재파싱 한계, declaredAmount 정상 추출) + Q-TRUNCATED-PARTIAL 1(요약형 인용) — 전부 known-safe.
- **적재**: dry-run 예상 write 180 = 실측 180 → apply COMMIT → **독립검증(새 연결) PASS**. master 45 + candidate 45 + SPD 90 = write **180**. tag `batch:single-nutrient-combo-vd-ca`. canonicalDup 0 · spdRefLinks 90 · candidateLinks 45.
- **기존 복합형 193 무변경**(baselineDrift 0). 복합형 누적 LIVE = 193 + 45 = **238**.

**생산 중 수정**: ① `hff-nutrient-store-canonical-apply.ts` rollback manifest 저장 경로가 옛 세션 scratchpad로 하드코딩 → 첫 apply 시 writeFileSync ENOENT → catch가 트랜잭션 ROLLBACK(영구 write 0, 데이터 무변경). `HFF_APPLY_MANIFEST_DIR` env override + `os.tmpdir()` fallback + mkdir 보장으로 수정 후 재실행 COMMIT. ② 신규 read-only 도구: `hff-combo-db-identify.ts`(프로덕션 식별·기준 수량), `hff-combo-verify-committed.ts`(apply 후 독립검증·tag 기준·baseline 무변경).

### 5.7 MSM+비타민D(M2) 49 LIVE + 공통 가드 콤마 정규화 수정

- **선정**: mention 148 → ELIGIBLE 49. **생성**: 49/49 · PASS 46 · REVIEW 3 · BLOCKED 0 · G-MULTI HOLD 0. REVIEW 3 = 코팅정제 성상 D-CLAIM-GROUNDED(원문 grounding, known-safe).
- **적재**: dry-run 예상 196 = 실측 196 → apply COMMIT → 독립검증(새 연결) PASS. master 49 + candidate 49 + SPD 98 = write **196**. tag `batch:single-nutrient-combo-msm-vd`. 복합형 누적 LIVE 238 → **287**.
- **공통 가드 수정(G-MULTI-AMOUNT-SOURCE 콤마 정규화)**: `srcNorm` 이 천단위 콤마를 제거하지 않아, 콤마 제거 정수 `declaredAmount.value`("1500")가 원문 "1,500"과 substring 불일치 → **값 ≥ 1000 원료(MSM 1500mg)에서 25/49 대량 false-positive HOLD**. 추출값은 전부 원문 정확. `srcNorm` 에 `.replace(/(?<=\d),(?=\d)/g, '')`(숫자 사이 콤마만) 추가로 해소. 회귀: vd-ca 재생성 byte-identical · mg-vd-ca 72/72 무회귀(확대 0) → 기존 PASS 불변, 순수 확대 방향. msm-vd 25 false-positive 전량 해소(작성 24→49).

### 5.8 루테인+비타민A(lut-va) — PAUSED_GROUP_DEFECT (기존 LIVE 오분류)

- 선정 ELIGIBLE 20, 생성 20/20 PASS·BLOCKED 0(품질 정상). 그러나 dry-run **ALREADY_PROMOTED 13** — 20건 중 13이 이미 `batch:single-nutrient-lutein`으로 LIVE.
- 진단: 13건은 실제 **루테인+비타민A 2원료 제품**인데 단일 루테인 라인이 단일로 오분류 → 비타민A 기능성 누락 게시(표본 2/3 누락 확인). **기존 LIVE 데이터 결함**.
- 결정 **Option A**: lut-va 를 `PAUSED_GROUP_DEFECT`로 격리(apply 금지·LIVE 수정 금지·7건 부분 apply 금지·산출물 보존). 교정·감사는 별도 트랙 → `WO-O4O-HFF-SINGLE-NUTRIENT-MULTI-INGREDIENT-MISCLASSIFICATION-AUDIT-AND-LUTEIN-CORRECTION-V1`. 공통 결함 여부(다른 단일 라인의 다중원료 흡수) read-only 감사 포함.
- 복합형 생산은 계속 — 다음 독립 조합(식이섬유+아연 → 오메가3+비타민E → 철+엽산). 기존 복합형 287 무변경.

### 5.9 M2/M3 순수 조합 라인 종결 — mg-zn-ca 2 LIVE + 소진 판정

- **마그네슘+아연+칼슘(M3)**: ELIGIBLE 2 (mention 546·grounding-held 60·HOLD_MULTI 479). dry-run 8=8 → apply COMMIT → 독립검증 PASS. tag `batch:single-nutrient-combo-mg-zn-ca`. 복합형 누적 294→**296**.
- **grounding-held 60 원인 규명(정당 HOLD)**: 47 = "부원료/미귀속 기능성"(예 "칼슘과 인이 흡수…"·"뼈의 형성과 유지…" = 비타민D 기능성) → 실제 mg+zn+ca+**비타민D** 4원료 제품인데 3원료로 게시 시 비타민D 누락(=lutein형 결함) → 정확한 방어. 13 = 귀속/매핑 실패. **공통 버그 아님, registry 정상**.
- **소진 판정**: 다음 3조합 신규 0 (오메가3+비타민E=registry gap[오메가3 INGREDIENT_FN 부재, 별도 공통코드 WO] · 철+엽산=순수 2-조합 부재 · 식이섬유+아연≈0). 순수 2~3원료 적격 제품 사실상 소진. 대형 조합 완료·나머지 한 자릿수.
- **결정**: M2/M3 순수 조합 라인 **종결(296 LIVE 확정)**. 실질 규모 확대는 MX(4+원료) 별도 파일럿 WO `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1`로 분리(현 M2/M3 composer/G-MULTI 억지 확장 금지).
