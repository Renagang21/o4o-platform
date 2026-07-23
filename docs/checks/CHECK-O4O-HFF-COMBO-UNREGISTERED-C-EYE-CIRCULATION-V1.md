# CHECK — WO-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1

> 에이전트 C 독립 도메인(눈·황반색소밀도·건조한 눈·기억력·인지력·혈행·중성지질·혈압·콜레스테롤·항산화·자외선 피부손상).
> **미등록 라벨 Combo** 중 C 도메인 미등록 원료(포스파티딜세린·아스타잔틴·홍국·라이코펜) 포함분을 **C 전용 additive seam**으로 생산.
> 선행: [CHECK-O4O-HFF-COMBO-COMPLETION-C-EYE-CIRCULATION-V1](CHECK-O4O-HFF-COMBO-COMPLETION-C-EYE-CIRCULATION-V1.md) (등록 원료 다성분 combo 272 LIVE, commit `7b747297c`).
> 자동승인 계약: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.

## 핵심 결론

선행 세션은 **완전 등록** 원료(모든 라벨이 공용 classify 인식) combo만 소진했다. 이번 세션은 그 다음 프론티어인
**미등록 라벨 Combo 2,095건 중 C 도메인 미등록 원료 포함분**을, 공용 `classify()`/`hff-nutrient-registry`/`hff-combo-compose`
**무편집**으로 생산하기 위해 **런타임 additive-injection seam**을 신설하고 **493 combo**를 LIVE 반영했다.

- 미등록 C-원료를 **런타임에만** classify/meta/귀속 대상에 확장(`injectC()`) — 공용 소스 편집 0, A/B 병렬 WIP 무충돌.
- 멀티도메인 기능성(인지력·자외선 피부·황반색소밀도·눈 피로도·중성지질·혈행·콜레스테롤·항산화 등) **원료별 전량 병기**, 삭제 0.
- Combo를 SF로 왜곡하지 않음. 제품명 유래 기능성 생산 0(제품명 유래 클레임은 auto-HOLD).

## additive-injection seam (공용 파일 무편집)

공용 combo 파이프라인은 세 지점에서 미등록 원료를 거부한다. C 전용 파일 4개로 **런타임/복제** 우회했다.

| 공용 거부 지점 | 원인 | C 전용 해소 |
|------|------|------|
| `hff-source-parse.CLS` (classify) | C 라벨 미등재 → `unknownLabels` → parseSpecs skip | `injectC()` 가 프로세스 로컬로 `CLS.push` (기존 shared 매칭 우선, C는 append) |
| `hff-nutrient-registry.FUNCTIONAL_META` | C 원료 META 부재 → metaOf 실패 | `injectC()` 가 `FUNCTIONAL_META[key]` 런타임 주입(displayKo=기능성 인정 원료명) |
| `INGREDIENT_FN_NORM` (fnBelongsTo) | **module-load 시점 freeze** → 런타임 주입 미반영 | C 키는 별도 `belongsC()`(C_FN_NORM grounded 세트) 로 귀속, 등록 키는 공용 `fnBelongsTo` |
| `runComboGuard.SRC_LABEL` (G-MULTI-AMOUNT-SOURCE) | **module-private** → C 라벨 미보유 → 전량 "라벨 원문 미검출" BLOCK | `runComboGuardC()` = 가드 복제 + `SRC_LABEL = {...SHARED(35), ...C_SRC_LABEL}` |
| combo EN | 공용 mapFunctionEn 이 C 원자 미매핑 | `mapFunctionEnC(f) ?? mapFunctionEn(f)` (미매핑 원자 하나라도 있으면 제품 skip=보류) |

**C 소유 파일 4종**(공용 스크립트/registry/rules/parser 무편집):
- `hff-combo-c-unreg-registry.ts` — C_UNREG(원료·grounded 기능성·classify/srcLabel 정규식) + `injectC()` + `belongsC()` + `C_SRC_LABEL`.
- `hff-combo-c-guard.ts` — `runComboGuardC()`(공용 G-MULTI 룰 1:1 복제, SRC_LABEL 병합만 상이).
- `hff-combo-c-unreg-harvest.ts` — read-only census 수확기(injectC → belongsC/fnBelongsTo → mapFunctionEnC ?? mapFunctionEn → **≥1 C-원료 signature만** 수확).
- `hff-combo-c-unreg-generate.ts` — 생성 드라이버(injectC → composeCombo → runComboGuardC + 표준 runGuard).

apply(`hff-nutrient-store-canonical-apply.ts`)는 grounding 기반 표준 runGuard 만 사용(combo meta 비의존) → **공용 그대로 재사용**.

## 파이프라인

1. **C-01 census** — `hff-combo-c-unreg-harvest`(injectC): 코퍼스 41,261건 스캔 → **≥1 C-미등록 원료 + 전 라벨 classify(+C) 인식 + 전 기능성 원자 귀속·EN 매핑 + 전 표시량 grounded** combo만 수확. **97 signature / 501 eligible**.
2. **taken-check** — 이미 HFF STORE canonical SPD 존재 statementNo(10,648) 제외 → **fresh 498 / 95 signature**(3 taken 제외). 미등록 C-combo 는 공용 파이프라인 미생산분이라 구조적 disjoint, 그럼에도 명시 제외.
3. **generate** — `composeCombo` + `runComboGuardC`(G-MULTI) + 표준 `runGuard` 이중 통과분만 target. PASS 390 + grounded-REVIEW 103 = **493 target**, BLOCKED **5 auto-HOLD**(`.blocked-hold.json` 격리, 미승격).
4. **dry-run → apply** — `hff-nutrient-store-canonical-apply` 이중게이트(`HFF_NUTRIENT_APPLY_CONFIRM=YES` + `--apply`), `--skip-promoted`. 50건 단위 10 chunk.
5. **독립검증** — 별도 커넥션 재쿼리(내 manifest statementNo 493 기준).

## 결과 요약

- **신규 LIVE = 493 combo**. DB write = 493 masters + 493 candidate update + 986 SPD(ko+en) = **1,972 rows**.
- 원료수(n)별: **n=2:156 · n=3:179 · n=4:54 · n=5:52 · n=6:52** (95 signature).
- 미등록 C-원료별 포함 제품수: **포스파티딜세린 253 · 헤마토코쿠스추출물(아스타잔틴) 211 · 홍국 24 · 라이코펜 6** (한 제품 다수 C-원료 동반 가능).
- dry-run 10/10 PASS(`DB write 0 → ROLLBACK`), apply 10/10 `COMMIT 완료`.
- canonicalDup = **0**, masterDup(missing_master) = **0**, statementNo 중복(파일) = **0**, bad ko/en pair = **0**, non-canonical = **0**, BLOCKED = **0**, `--skip-promoted` 실제 skip = **0**.
- 전 chunk expected write = actual write, postVerifyPass = **true**(전 건).
- 기존 LIVE drift = **0**(전 apply additive). A/B/C 교집합 = **0**(canonicalDup 0 이 masters 별 canonical STORE ko/en 유일성 보장).
- rollback manifest = `${SP}/manifests/hff-combo-cu-b{1..10}-apply-rollback-manifest.json` (createdMasters 합계 493).

### 독립검증 (별도 커넥션 재쿼리 · 내 manifest statementNo 493)

| expect | masters | spd_ko(canonical) | spd_en(canonical) | non_canonical | missing_master | bad_pair | canonicalDup |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 493 | 493 | 493 | 493 | **0** | **0** | **0** | **0** |

### 대표 signature (상위 12)

| signature (원료 조합) | 신규 LIVE |
|------|:---:|
| 비타민E·은행잎·포스파티딜세린 | 81 |
| 아연·포스파티딜세린 | 66 |
| 아연·은행잎·포스파티딜세린 | 37 |
| 루테인·아스타잔틴 | 36 |
| 루테인·비타민A·아스타잔틴 | 30 |
| 은행잎·포스파티딜세린 | 19 |
| 루테인·비타민A·비타민E·아스타잔틴 | 18 |
| 비타민E·포스파티딜세린 | 12 |
| 루테인·비타민A·비타민E·아스타잔틴·아연 | 11 |
| 비타민A·아스타잔틴 | 11 |
| 루테인·아스타잔틴·오메가3 | 10 |
| 루테인·비타민A·비타민E·셀레늄·아스타잔틴·아연 | 8 |

## 미등록 원료별 grounding·오귀속 방어 (수기 검수)

| 원료 | displayKo | 지표/원료 구분 | 공식 기능성(KO, grounded) | 검수 결과 |
|------|------|------|------|------|
| 포스파티딜세린 | 포스파티딜세린 | 원료=지표 동일(직접 측정) | 노화로 저하된 인지력 개선·자외선 피부손상 피부건강·피부보습 | ✅ 인지 다도메인 전량 병기 |
| 아스타잔틴 | 헤마토코쿠스추출물(아스타잔틴) | spec=아스타잔틴 지표, 원료=헤마토코쿠스추출물 | 눈의 피로도 개선 | ✅ displayKo=인정 원료명, 표시량=지표(은행잎추출물 관례와 동일) |
| 홍국 | 홍국 | spec=총 모나콜린K 지표, 원료=홍국 | 혈중 콜레스테롤 개선 | ✅ 표시량(4mg)=모나콜린K/basis=홍국량, 원문 grounded |
| 라이코펜 | 라이코펜 | 원료=지표 동일(직접 측정) | 항산화 | ✅ 토마토추출물 원료 오귀속 0 |

**오귀속 4중 방어**: (1) `belongsC` 정규화 exact/양방향 substring 매칭 → 기능성-원료 오귀속 차단. (2) `mapFunctionEnC` 미매핑 원자 → 제품 skip(홍경천 스트레스/피로 원자 미보유 → 자동 PENDING). (3) **G-MULTI-AMOUNT-SOURCE**: 표시량이 원문 라벨 80자 구간에 없으면 BLOCK(수치 이동/오귀속) → **5건 auto-HOLD**. (4) 표준 runGuard(E-NAME/D-CLAIM) → 제품명 유래 클레임 auto-HOLD. 검수 표본(cu-001 PS 6원료·cu-002 아스타잔틴 6원료·cu-200 홍국 5원료·cu-009 라이코펜 5원료) 전량 표시량 원문 대조·기능성 원료귀속·N-원료 복합 렌더(SF 미왜곡) 확인.

## auto-HOLD 6건 (미승격, 정확 차단)

- G-MULTI-AMOUNT-SOURCE 5(액티브솔루션 눈건강 / 올인원 브레인아이 샷 / 메모리메이트 / 써큐파워 등): 원료 표시량이 원문 라벨 구간 밖 → 수치 이동 의심 → 정확 차단.
- D-CLAIM-UNGROUNDED-001 1(VIKlab 20mg 특허형 루테인): 근거 없는 클레임 → 차단.

## PENDING / 미착수 (후속)

- **홍경천(로사빈)** — 공식 정본(항피로·인지)의 EN 원자가 overlay 미보유 → mapFunctionEnC null → 자동 skip. WO "공식 정본 없는 제품 HOLD" 준수.
- **나토균배양분말** — registry 정의했으나 census 에서 ≥2 등록 원료 동반 combo 0(대부분 SF 단일/count=1). 후속 재sweep 대상.
- **레시틴·스피루리나·클로렐라·당귀** — registry 미확장(PS/아스타잔틴/홍국/라이코펜 우선 검증 후 추가 예정).
- **PENDING_SHARED**: parseSpecs 포맷 변이(예: `표시량 : 표시량의 80~120%` 중 classify 가 "표시량" 오선택)로 공용 파서 편집이 필수인 후보 — 별도 파서 정합 과제(오귀속 방지 위해 신중).

## 채널·함정

- 프록시 5457 fresh cloud-sql-proxy(INSTANCE=netureyoutube:asia-northeast3:o4o-platform-db). creds=`/c/tmp/db-env.sh` source 후 `export DB_PASSWORD DB_USERNAME DB_NAME`, `PROXY_PORT=5457`, `PGCLIENTENCODING=UTF8`.
- **`injectC()` 는 parseSpecs/composeCombo/metaOf 호출 전 반드시 1회** — harvest·generate 진입부에서 최상단 실행.
- **INGREDIENT_FN_NORM freeze 함정**: 런타임 주입은 fnBelongsTo 에 미반영 → C 키 귀속은 반드시 `belongsC`.
- combo apply = `--target <json> --slug <s> --apply` + `HFF_NUTRIENT_APPLY_CONFIRM=YES`. SPD status=`canonical`, source_type=`o4o_hff_generated`, master 키=`mfds_permit_number`(=statementNo).
- npx tsx cold-start → 10 chunk 루프는 background 실행.
- 지표성분 표기: 표시량=지표(모나콜린K·아스타잔틴·플라보놀배당체), basis=원료량 — 등록 combo(은행잎추출물·코엔자임Q10) 관례와 동일. displayKo=기능성 인정 원료명.

## 변경 파일 (C 소유 additive · 공용 코드 무편집)

- `apps/api-server/src/scripts/hff-combo-c-unreg-registry.ts` · `hff-combo-c-guard.ts` · `hff-combo-c-unreg-harvest.ts` · `hff-combo-c-unreg-generate.ts` — C 전용 seam.
- `apps/api-server/docs/checks/data/product-description-guard/hff-sf-c-domain/combo-unreg/**` — pool / targets / chunks / drafts / manifests / logs.
- `docs/checks/CHECK-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1.md` — 본 문서.
- **공용 스크립트/registry/rules/parser 무편집.**

*작성: 2026-07-23 · 세션 55dad20a*
