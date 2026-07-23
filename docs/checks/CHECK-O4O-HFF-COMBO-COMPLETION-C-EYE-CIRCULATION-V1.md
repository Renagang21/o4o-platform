# CHECK — WO-O4O-HFF-COMBO-COMPLETION-C-EYE-CIRCULATION-V1

> 에이전트 C 독립 도메인(눈·인지·혈행·항산화·자외선 피부) **3원료 이상 및 등록 원료 다성분 Combo** 완결 생산.
> 선행: [CHECK-O4O-HFF-INDEPENDENT-MULTIDOMAIN-TRACK-RESOLUTION-C-V1](CHECK-O4O-HFF-INDEPENDENT-MULTIDOMAIN-TRACK-RESOLUTION-C-V1.md) (등록 C-성분 **순수 2원료** combo 39 LIVE, commit `b48825e74`).
> 자동승인 계약: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.

## 핵심 결론

선행 세션이 등록 C-성분 **순수 2원료** pair(13종·39건)만 소진했다. 이번 세션은 그 프론티어를 넘어서
**공용 registry(hff-nutrient-registry) 무편집**으로 생산 가능한 **등록 원료 3~6성분 + 잔여 2성분 Combo 272건**을
기존 combo 파이프라인(harvest → generate → apply)으로 LIVE 반영했다. 공용 파일 편집 0.

- 멀티도메인 기능성(시각적응·황반색소밀도·기억력·혈중 중성지질·항산화·자외선 피부 등)을 원료별로 **전량 병기**, 삭제 0.
- Combo를 SF로 왜곡하지 않았고, 미등록 원료(포스파티딜세린·아스타잔틴·홍국 등)가 섞인 combo는 공용 classify 편집이 필요하므로 **정확 라우팅**(아래 C-07/C-08 census + 후속 seam 설계)했다 — 미등록 원료 하나 때문에 전체 생산을 멈추지 않았다.

## 파이프라인 (공용 파일 무편집)

1. **C-01 census** — `hff-combo-c-harvest.ts`(read-only 단일 패스): 코퍼스 41,261건 스캔 → signature별 버킷팅. **완전 등록**(모든 라벨 classify 인식 + 모든 원료 registry META 존재) combo만 수확. 1,028 signature 발견.
2. **taken-check** — 이미 LIVE(candidate matched OR canonical STORE SPD 존재) 제외 → **C-소유 fresh 111 signature / 279 seed**.
3. **generate** — `hff-combo-generate.ts`: `composeCombo`(N-generic) + `runComboGuard`(G-MULTI) + 표준 `runGuard` 이중 통과분만 target 승격. PASS + grounded-REVIEW = **272 target**, BLOCKED auto-HOLD 7건은 `.blocked-hold.json` 격리(미승격).
4. **dry-run → apply** — `hff-nutrient-store-canonical-apply.ts` 이중게이트(`HFF_NUTRIENT_APPLY_CONFIRM=YES` + `--apply`), `--skip-promoted`(동시성 안전). 50건 단위 6 chunk.
5. **독립검증** — 별도 커넥션 재쿼리.

## 결과 요약

- **신규 LIVE = 272 combo**. DB write = 272 masters + 272 candidate update + 544 SPD(ko+en) = **1,088 rows**.
- 원료수(n)별: **n=2:33 · n=3:72 · n=4:102 · n=5:34 · n=6:31** (111 signature).
- dry-run 6/6 PASS, apply 6/6 `COMMIT 완료`.
- canonicalDup = **0**, masterDup = **0**, statementNo 중복(파일·DB) = **0**, candidateMatch missing/ambiguous = **0**, BLOCKED = **0**, `--skip-promoted` 실제 skip = **0**.
- 모든 chunk expected write = actual write, postVerifyPass = **true**(전 건).
- 기존 LIVE drift = **0** (전 apply additive, 기존 canonical 미변경).
- rollback manifest = chunk별 `${SP}/hff-combo-multi-c-b{1..6}-apply-rollback-manifest.json`.

### 독립검증 (별도 커넥션 재쿼리)

`product_masters ⋈ shared_product_descriptions(STORE, canonical, o4o_hff_generated)` — statementNo 272건:

| expect | masters | spd_ko | spd_en | non_canonical |
|:---:|:---:|:---:|:---:|:---:|
| 272 | 272 | 272 | 272 | **0** |

### 대표 signature (상위 15)

| signature (원료 조합) | 신규 LIVE |
|------|:---:|
| 비타민A·비타민D·비타민E·오메가3 | 47 |
| 루테인·비타민A | 14 |
| 루테인·비타민A·비타민D·비타민E | 10 |
| 루테인·비타민A·비타민E | 10 |
| 루테인·비타민A·아연 | 8 |
| 비타민B1·비타민B2·비타민B6·비타민E·은행잎 | 8 |
| 녹차·비타민E·테아닌 | 7 |
| 구리·루테인·비타민A·비타민C·비타민E·아연 | 6 |
| 비타민E·아연·은행잎 | 5 |
| 녹차·비타민C / 녹차·비타민C·판토텐산 | 4 / 4 |
| 루테인·비타민A·비타민B2·비타민E·셀레늄·아연 | 4 |
| 루테인·아연 / 비타민A·비타민D·비타민E·아연·오메가3 | 4 / 4 |
| 비타민D·비타민E·아연·오메가3 | 4 |

## 멀티도메인 기능성 보존 (WO 매장용 설명서 원칙)

- G-MULTI 가드가 **원료 카드 수 = ko = en = n**, 원료별 ko/en 기능성 parity, 원료별 표시량 귀속(원료 간 수치 drift 탐지), 중복키 차단, 카드 순서=seed 순서를 강제.
- 검수 표본(비타민A·비타민D·비타민E·오메가3, 47건 signature): 비타민A 시각적응+피부+상피, 비타민D 뼈+골다공증, 비타민E 항산화, 오메가3 중성지질·혈행·기억력·건조한 눈 — **4원료 공식 기능성 전량 보존**, 원료별 표시량 정확, 원문 밖 치료·예방 주장 0.
- "멀티도메인이라는 이유로 기능성 일부 삭제 금지" / "Combo를 SF로 맞추려 기능성 축소 금지" 준수. 모든 combo에 매장 내 전문가 상담 footer 유지.

## 미등록 원료 Combo 프론티어 census (WO C-02·C-07·C-08)

C-도메인 2~8성분 combo 중 미등록 라벨 포함 = **2,095건**(read-only census). 상위 미등록 라벨(등록원료와 co-occur):

| 라벨 | combos | 트랙 판정 |
|------|:---:|------|
| 아스타잔틴 (+ "3) 아스타잔틴") | 154+33 | **C** (눈·피부·항산화) — 미등록 |
| 포스파티딜세린 (+ "2)/(2) …") | 151+37+18 | **C** (인지) — 미등록. SF로는 기생산(PS 33 LIVE) |
| 모나콜린K / 총 모나콜린K (홍국) | 66+43 | **C** (콜레스테롤) — 미등록 |
| 로사빈 / 로사빈(Rosavin) (홍경천) | 66+23 | C 인접(항피로·인지) — 미등록 |
| all-trans-라이코펜 | 19 | C (항산화) — 미등록 |
| 코로솔산 (바나바) | 159 | **B 소유**(혈당) — 미접촉 |
| 히알루론산 · Gly-Pro-Hyp · -Pro-Val-Gly-Pro-Ser | 56·20·18 | **A 소유**(피부·콜라겐) — 미접촉 |
| Rg3의 합 (홍삼) | 121 | own-track(홍삼 정본) — 미접촉 |
| 철·판토텐산·비타민C·아연·엽산·셀렌·비타민B군 등 | 다수 | 등록 nutrient의 **표기 변이**(공백·"셀렌"·번호접두) — classify 미인식분 |

**판정**: 미등록 C-원료(아스타잔틴·포스파티딜세린·홍국·홍경천·라이코펜) combo는 공용 `classify()`(hff-source-parse의 CLS, additive seam 부재) + `hff-nutrient-registry`(META·INGREDIENT_FN) 편집을 요구한다. A(콜라겐·MSM)·B(장·대사) 에이전트가 동시 생산 중인 공용 파일이므로 **성급한 편집 = 공용 파일 충돌 STOP 조건**. 표기 변이(철·셀렌·번호접두)로 인한 classify 미인식은 별도 파서 정합 과제.

## 남은 TODO (후속 seam 설계 대상)

- **C-additive combo seam**: `parseSpecs(extraCls?)` 주입형 파라미터(기본 동작 불변→A/B 무영향) + C-additive META/INGREDIENT_FN 파일 + combo 경로에서 `mapFunctionEnC` 통합 → 아스타잔틴·포스파티딜세린·홍국·홍경천·라이코펜 combo 생산. 공용 파일 additive-only 원칙 준수 검증 후 착수(동시 세션 완료 확인 권장).
- 표기 변이 classify 정합(철/셀렌/공백/번호접두) — 파서 정합 별도 과제. 오귀속 방지 위해 신중.
- **등록 원료 combo는 소진**(111 signature 272건 전량 LIVE, `--exclude-taken` 재sweep 잔여 0).

## 변경 파일 (C 소유 additive · 공용 코드 무편집)

- `apps/api-server/src/scripts/hff-combo-c-harvest.ts` — C-01 census 수확기(선행 세션 커밋분, read-only).
- `docs/checks/data/product-description-guard/hff-sf-c-domain/combo-multi/**` — pools / targets / merged(chunk) / drafts / fresh-index.
- `docs/checks/CHECK-O4O-HFF-COMBO-COMPLETION-C-EYE-CIRCULATION-V1.md` — 본 문서.
- **공용 스크립트/registry/rules/parser 무편집** — 기존 combo 파이프라인 그대로 재사용.

## 채널·함정

- 프록시 5457 fresh cloud-sql-proxy(INSTANCE=netureyoutube:asia-northeast3:o4o-platform-db). creds=`/c/tmp/db-env.sh` source 후 `export DB_PASSWORD DB_USERNAME DB_NAME`.
- **merge glob 함정**: `targets/`에는 apply target `*.json` 와 auto-HOLD `*.blocked-hold.json`(grounding 없음)이 공존 → merge 시 `.blocked-hold.json` 반드시 제외(미제외 시 apply의 `computeBasis` 가 `grounding` undefined 로 크래시). 279 seed = 272 target + 7 auto-HOLD.
- combo apply = `hff-nutrient-store-canonical-apply --target <json> --slug <s> --apply` + `HFF_NUTRIENT_APPLY_CONFIRM=YES`. SPD status = `canonical`(not `approved`), source_type = `o4o_hff_generated`, master 키 = `mfds_permit_number`(=statementNo), 후보 = `matched_product_master_id`.
- npx tsx cold-start ~1.5s → 111 signature generate 루프는 Bash 2분 타임아웃 초과 → background 실행 필수.
- node writeFileSync 경로는 `C:/tmp/...`(bash `/c/tmp` = `C:\tmp`, node 는 `/c/tmp` 를 `C:\c\tmp` 로 오해).

*작성: 2026-07-23 · 세션 55dad20a*
