# CHECK — WO-O4O-HFF-INDEPENDENT-MULTIDOMAIN-TRACK-RESOLUTION-C-V1

> 에이전트 C 독립 도메인(눈·인지·혈행·항산화) 잔여 멀티도메인·복합 기능성 후보의 정확한 트랙 분류 + 안전 생산.
> 선행: [CHECK-O4O-HFF-INDEPENDENT-COGNITIVE-REMAINDER-AND-DISCOVERY-C-V1](CHECK-O4O-HFF-INDEPENDENT-COGNITIVE-REMAINDER-AND-DISCOVERY-C-V1.md) (SF 30 LIVE, commit `bcad7ed12`).
> 자동승인 계약: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.

## 핵심 결론

SF discovery 이후 남은 C 도메인 잔여는 **거의 전부 2원료 이상 복합(combo) 후보**였다.
정확한 트랙 = **Combo**(SF 아님). 이번 세션은 **공용 registry(INGREDIENT_FN 등) 무편집**으로 생산 가능한
**등록 C-성분 pair 순수 2원료 combo 39건**을 기존 combo 파이프라인(hff-combo-generate + hff-nutrient-store-canonical-apply)으로 LIVE 반영했다.
설명서를 만들기 위해 combo를 SF로 왜곡하지 않았고, 3원료 이상·미등록 원료 combo는 combo-completion 파이프라인(별도 세션) 몫으로 정확히 라우팅했다.

## 결과 요약 (성분 pair · 트랙별 신규 LIVE)

| pair (2원료 combo) | slug | 신규 LIVE | 비고 |
|------|------|:---:|------|
| 은행잎 · 셀레늄 | combo-eun-sel-c | 3 | 기억력·혈행 + 항산화 |
| 은행잎 · 루테인 | combo-eun-lut-c | 5 | 기억력·혈행 + 황반 |
| 은행잎 · 오메가3 | combo-eun-om3-c | 4 | 기억력·혈행 + 중성지질·눈 |
| 루테인 · 셀레늄 | combo-lut-sel-c | 1 | 황반 + 항산화 |
| 루테인 · 오메가3 | combo-lut-om3-c | 2 | 황반 + 중성지질·눈 |
| 코엔자임Q10 · 오메가3 | combo-coq-om3-c | 4 | 항산화·혈압 + 중성지질 |
| 은행잎 · 비타민E | combo-eun-vite-c | 7 | 기억력·혈행 + 항산화 |
| 루테인 · 비타민E | combo-lut-vite-c | 1 | 황반 + 항산화 |
| 녹차 · 은행잎 | combo-nok-eun-c | 2 | 항산화·콜레스테롤 + 기억력 |
| 루테인 · 비타민A | combo-lut-vita-c | 4 | 황반 + 시각적응·피부(멀티도메인 전량 보존) |
| 오메가3 · 비타민E | combo-om3-vite-c | 4 | 중성지질·혈행·기억·눈 + 항산화 |
| 루테인 · 비타민C | combo-lut-vitc-c | 1 | 황반 + 항산화·결합조직 |
| 루테인 · 코엔자임Q10 | combo-lut-coq-c | 1 | 황반 + 항산화·혈압 |
| **합계** | | **39** | |

- 이번 세션 신규 LIVE = **39** combo. DB write = 39 masters + 39 candidate update + 78 SPD(ko+en) = **156 rows**.
- canonicalDup = **0**, masterDup = **0**, statementNo 중복 = **0**, candidateMatch missing/ambiguous = **0**, BLOCKED = **0**.
- 모든 apply expected write = actual write, postVerifyPass = **true**(전 건).
- 기존 LIVE drift = **0** (전 apply additive, 기존 canonical 미변경).
- A·B·C 교집합 = **0** (combo 성분 전부 C-등록: 은행잎/루테인/셀레늄/오메가3/코엔자임Q10/녹차/비타민E/A/C. A소유 콜라겐·MSM·글루코사민·초록입홍합, B소유 장·대사·면역 원료 미접촉).
- 독립검증: 세션 전 slug의 statementNo 39건 → `product_masters ⋈ shared_product_descriptions(canonical, o4o_hff_generated)` 재조회 = masters 39 · ko 39 · en 39 · non-canonical 0.

## 트랙 분류 결과 (WO C-02·C-03·C-08)

- **SF**: 신규 0. 이전 세션(bcad7ed12)에서 clean 고볼륨 C-domain pure-single 소진 확인. 재실행 discovery도 fresh 잔여 = 전부 combo/out-of-domain/mislabeled → SF well DRY 재확인.
- **Combo**: 39 LIVE (위 표). 기능성 원료 2개 각각의 공식 인정 기능성을 원료별로 병기, 어느 쪽도 삭제하지 않음. `runComboGuard`(G-MULTI) + 표준 `runGuard` 이중 통과분만 target 승격.
- **Own-track**(별도 파이프라인): 홍삼(홍삼 정본)·프로바이오틱스 CFU·알로에 등 → 미접촉(정확 라우팅).
- **Nutrient / 3+원료 combo**: `hff-combo-select`가 3원료 이상·미등록 원료 함유 제품을 `HOLD_MULTI`로 정확 분리(오메가3·비타민E pair만 771 HOLD, 루테인·비타민A 629 HOLD 등). 이들은 공용 registry 편집이 필요한 combo-completion 파이프라인 몫 → C 세션 미생산(공용 파일 편집 충돌 STOP 회피).
- **오표기(mislabeled)**: 마리골드=비타민 combo 등은 선행 세션에서 이미 분리 문서화. 이번 신규 오표기 발굴 0.

## 멀티도메인 기능성 보존 (WO 매장용 설명서 원칙)

- **루테인·비타민A**: 비타민A의 시각적응(눈)뿐 아니라 피부·상피(비-눈 도메인) 공식 기능성도 **삭제 없이 전량 병기**. "멀티도메인이라는 이유로 기능성 일부 삭제 금지" 준수.
- **오메가3·비타민E**: 오메가3의 4기능성(혈중 중성지질·혈행·기억력·건조한 눈) + 비타민E 항산화 모두 보존. 원문 밖 치료·예방 주장 0.
- 모든 combo에 매장 내 전문가 상담 안내(임산부·수유부·질환자 상담) footer 유지.

## 미매핑 EN 원자 (WO C-04)

- 신규 overlay 편집 **불요**. 등록 C-성분의 공식 기능성 EN은 기존 `hff-sf-c-en-overlay`(additive) + 공용 `mapFunctionEn`으로 전량 grounded. 미매핑 원자로 인한 PENDING 분리 0.
- grounded REVIEW 룰(`E-NAME-DERIVED-GROUNDED-002`·`D-CLAIM-GROUNDED-002`)만 있는 항목은 공식 근거 확인분 → target 승격(BLOCKED 절대 미승격, 정책 불변). `PRE-SRC-BASIS-UNVERIFIABLE-003`(α-TE 비율 표기)은 REVIEW 강등·차단 아님, 원문 표시량 검증 확인 후 승격.

## exclude-taken 동시성 안전 (동시 세션 combo-completion 파이프라인)

- `hff-combo-select --exclude-taken`가 이미 LIVE인 combo를 제외 → 동시 세션과 이중생산 0.
- 예: 비타민E·비타민C(9 eligible, 9 taken→0 신규), 망간·셀레늄(1→0), 루테인·비타민C(10→1 신규). canonicalDup 게이트로 최종 이중방어.

## 생산 소진 확인 (WO C-10)

등록 C-성분 pair 전수 sweep(`--exclude-taken`) 결과 잔여 생산가능분 = 0:
- 순수 2원료 producible = 위 13 pair 39건 소진.
- ELIGIBLE=0 pair: 셀레늄·오메가3, 셀레늄·비타민E/C, 오메가3·비타민A/C, 코엔자임Q10·비타민E, 은행잎·비타민C/코엔자임Q10/프로폴리스, 감마리놀렌산·은행잎/오메가3, 녹차·오메가3/루테인, 구리·셀레늄 등.
- 나머지 대량 mention 제품은 전부 3+원료 `HOLD_MULTI`(미등록 원료 포함) → combo-completion 파이프라인 몫.

## 변경 파일 (C 소유 additive · 공용 registry 무편집)

- `docs/checks/data/product-description-guard/hff-sf-c-domain/combo-pools/**` — pair별 ELIGIBLE pool + `.hold.json`.
- `docs/checks/data/product-description-guard/hff-sf-c-domain/combo-targets/**` — pair별 apply-ready target.
- `docs/checks/data/product-description-guard/hff-sf-c-domain/combo-drafts/**` — KO/EN 초안.
- `docs/checks/CHECK-O4O-HFF-INDEPENDENT-MULTIDOMAIN-TRACK-RESOLUTION-C-V1.md` — 본 문서.
- **코드(스크립트/registry/rules) 무편집** — 기존 combo 파이프라인 그대로 재사용.

## 남은 TODO

- 없음(등록 C-pair 순수 2원료 combo 소진). 3+원료·미등록 원료 combo는 공용 registry 확장이 필요하므로 combo-completion 파이프라인(별도 세션) 대기.

## 채널·함정

- 프록시 5457 fresh cloud-sql-proxy(INSTANCE=netureyoutube:asia-northeast3:o4o-platform-db). `nc -z` Windows 오탐 → psql SELECT 1로 확인.
- combo apply = `hff-nutrient-store-canonical-apply --target <json> --slug <slug> --apply` + `HFF_NUTRIENT_APPLY_CONFIRM=YES`(이중게이트). SPD status = `canonical`(not `approved`), source_type = `o4o_hff_generated`. master 연결 키 = `mfds_permit_number`(=statementNo), 후보 연결 = `matched_product_master_id`.
- select ELIGIBLE 카운트는 taken 제외 **전** 값. 실제 pool 파일 = `ELIGIBLE − taken제외`. 동시 세션이 combo 생산 중이면 taken이 큼.
- combo-generate는 grounded-REVIEW 항목도 target 포함(BLOCKED만 배제) — SF `--accept-grounded-name`과 동일 정책이 기본 내장.

*작성: 2026-07-23 · 세션 55dad20a*
