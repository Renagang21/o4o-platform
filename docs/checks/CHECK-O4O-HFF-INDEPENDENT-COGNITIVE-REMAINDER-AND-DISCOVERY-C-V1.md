# CHECK — WO-O4O-HFF-INDEPENDENT-COGNITIVE-REMAINDER-AND-DISCOVERY-C-V1

> 에이전트 C 독립 도메인(눈·인지·혈행·항산화) 잔여 legitimate-hold 해소 + 추가 대량 discovery.
> 선행: [CHECK-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-C-V1](CHECK-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-C-V1.md) (98 LIVE).
> 자동승인 계약: WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.

## 결과 요약

| 구분 | 성분 | 신규 LIVE | 태그 |
|------|------|:---:|------|
| BF-7 인지 | 피브로인추출물BF7 (fibroin-bf7) | 2 | `batch:single-functional-fibroin-bf7-c` |
| cantaloupe | 칸탈로프멜론추출물 (cantaloupe-melon) | 1 | `batch:single-functional-cantaloupe-melon-c` |
| angelica 신미보 | 참당귀추출분말 (angelica-gigas) | 1 | `batch:single-functional-angelica-gigas-c` |
| C-10 discovery | 배초향/로즈마리자몽/장미꽃잎/허니부쉬/곤약감자/녹각HP/당귤/구기자/올리브잎 외 8성분 | 15 | `batch:single-functional-<slug>-c` |
| C-10 잔여 | 나토균배양분말 (natto-culture) | 6 | `batch:single-functional-natto-culture-c` |
| C-10 잔여 | 레시틴제품 (lecithin) | 5 | `batch:single-functional-lecithin-c` |
| **합계** | | **30** | |

- 이번 세션 신규 LIVE = **30**. DB write = 30 masters + 30 candidate update + 60 SPD(ko+en) = **120 rows**.
- canonicalDup = **0**, statementNo 중복 = **0**, masterDup = **0**, candMatch missing/ambiguous = **0**.
- 기존 LIVE drift = **0** (모든 apply는 additive; 기존 canonical 미변경).
- A·B·C 교집합 = **0** (콜라겐/히알루론/MSM/글루코사민/프로바이오틱스 등 A/B 소유·combo 성분 배제).
- 독립검증: 성분별 `hff-sf-verify --tag … --expect n` 전부 `independentVerifyPass=true`.

## BF-7 판정 (WO ① 우선)

- 공식 기능성 원료 = 피브로인추출물(BF-7), 공식 기억력·인지력 기능성 + statementNo + ProductMaster 연결 확인 → **생산 정당**.
- 구조적 오차단 원인: EN 초안의 "memory"가 한글 MAIN_FNCTN에 리터럴 미매칭 → ruleE 그라운딩 false-positive BLOCK.
- 수정 (A) `product-description-guard.rules.ts` ruleE 그라운딩: `bodyRe`(도메인 정규식)로도 mainFn 대조 → 공식 근거 확인 시 BLOCK→GROUNDED REVIEW 강등(downgrade-only).
- 수정 (B) `hff-sf-generate.ts` `--accept-grounded-name`: 유일한 비-PASS 사유가 `E-NAME-DERIVED-GROUNDED-002`(근거 확인된 네임토큰)인 항목만 target 승격. BLOCKED는 절대 미승격. opt-in이라 타 에이전트 무영향.
- 결과: BF-7 2건 PASS, 기억력 KO 정확 보존·영어 누출 0.
- **제품명 유래(브레인/기억 네임토큰만 있고 공식 근거 없음)는 계속 BLOCK 유지** — 정책 불변.

## cantaloupe / angelica 복합 기능성 분해

- `extractFunctionsKo`가 MFDS `(국문)…(영문)` 이중언어 원문을 한글 원자로 분해, 문장종결(있음/있습니다/필요함)·번호·`·`·괄호 경계로 다항 분리.
- **cantaloupe**: 단일원료 3기능성(항산화·혈관벽두께(IMT) 혈행개선·자외선 피부홍반)을 pure-single로 정확 분류, 4개 multi-ingredient combo는 배제. IMT·피부홍반 원자 EN을 `hff-sf-c-en-overlay` additive 추가. 브래킷 부재로 labelRe 미매칭한 2건은 보수적 제외 → 1 LIVE.
- **angelica 신미보(참당귀 Nutragen 제2014-44호)**: 단일원료 인지+관절 병기. 관절 EN은 공식 (영문) "maintain healthy joint" grounded → overlay 추가. 1 LIVE.
- 복합형을 억지로 pure-single로 만들지 않음. 미매핑 원자는 pending 자동보류.

## discovery 결과

- 이전 54그룹 한정 없이 전체 후보 재검색(`hff-sf-c-domain-discover.ts`, DOMAIN_RE=눈·인지·혈행·항산화·피부·중성지질·콜레스테롤).
- C-10 batch 15 LIVE: UV-피부건강·콜레스테롤·혈압·기억력 pure-single. A/B 소유(콜라겐·히알루론·프로바이오틱스)·combo(홍삼·알로에·체지방) 배제.
- 최종 sweep: 잔여 fresh 항목 전부 count=1이며 multi-domain combo(홍삼·유산균발효다시마)·out-of-domain(자일로올리고당=장/배변)·mislabeled vitamin combo(마리골도꽃=비타민A/C/칼슘)·A-owned overlap(저분자콜라겐·난각막=관절) → **clean 고볼륨 C-domain pure-single 소진, discovery 종료**.

## 변경 파일 (C 소유 additive)

- `apps/api-server/src/modules/content-guard/product-description-guard.rules.ts` — (A) ruleE 그라운딩 downgrade-only.
- `apps/api-server/src/scripts/hff-sf-generate.ts` — (B) `--accept-grounded-name` opt-in 승격.
- `apps/api-server/src/scripts/hff-sf-c-en-overlay.ts` — IMT·피부홍반·관절·혈압·혈소판응집·콜레스테롤 원자 EN additive.
- `apps/api-server/src/scripts/hff-sf-registry.ts` — C-10 discovery/잔여 11 성분 config 추가.
- `docs/checks/data/product-description-guard/hff-sf-c-domain/**` — 성분별 ready/target/reviewlater/rollback-manifest.

## 남은 TODO

- 없음(clean 고볼륨 후보 소진). EN 정본 미확정 잔여(fresh=1 multi-domain)는 overlay 확정 시 후속 재개 가능.

## 채널·함정

- 프록시 5457 fresh cloud-sql-proxy(INSTANCE=netureyoutube:asia-northeast3:o4o-platform-db). `nc -z` Windows 오탐 → psql SELECT 1로 확인.
- 한글 regex psql은 UTF8 SQL 파일 + `-f` + `PGCLIENTENCODING=UTF8`(직접 `-c` 실패).
- apply 인자 = `--target <json> --tag <batch:...>` (`--ingredient`/`--dir` 아님). apply 이중게이트 = `--apply` + `HFF_SF_APPLY_CONFIRM=YES`.

*작성: 2026-07-23 · 세션 55dad20a*
