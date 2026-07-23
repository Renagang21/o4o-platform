# CHECK — WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-C-V1

> 에이전트 C. 눈·인지·혈행·항산화 도메인. 기능성 EN 정본 독립 확정 + 복합판별 교정 + 안전 후보 최대 생산.
> 선행 baseline commit: `76094fe4b` (MAX-PRODUCTION-C). 본 WO 착수 시 SF LIVE 기준선 대비 순증.

## 1. 결과 요약

| 라운드 | 신규 LIVE | commit |
|---|---:|---|
| R1 — PS·빌베리·헤마토코쿠스·마늘 EN 정본 + cap-fix | 47 | `0546e4249` |
| R2 — C-09 discovery 10성분 + 이중언어/복합 파서 교정 | 51 | (본 커밋) |
| **UNLOCK-C 합계** | **98** | |

R2 종료 시점 `singleFunctionalLiveTotal` = **947** (독립검증 census).

## 2. R2 (C-09) 성분별 생산 · 독립검증

| slug | 원료 | LIVE | canonicalDup | stmtDup | independentVerifyPass |
|---|---|---:|---:|---:|---|
| omega-3-oil | 오메가-3지방산 함유 유지 | 37 | 0 | 0 | ✅ |
| pqq | 피롤로퀴놀린퀴논이나트륨염 | 6 | 0 | 0 | ✅ |
| gastrodia-extract | 천마추출물 | 2 | 0 | 0 | ✅ |
| angelica-gigas | 참당귀추출분말 | 1 | 0 | 0 | ✅ |
| policosanol | 폴리코사놀 | 1 | 0 | 0 | ✅ |
| plant-stanol-ester | 식물스타놀 에스테르 | 1 | 0 | 0 | ✅ |
| globin-hydrolysate | 글로빈 가수분해물 | 1 | 0 | 0 | ✅ |
| reishi-fruitbody | 영지버섯자실체추출물 | 2 | 0 | 0 | ✅ |
| **합계** | | **51** | 0 | 0 | ✅ |

각 배치 tag = `batch:single-functional-<slug>-c`. rollback manifest = `docs/checks/data/product-description-guard/hff-sf-c-domain/rollback-manifests/`.

## 3. 파서 교정 (핵심 — 이중언어 누출 + 복합 오생산 동시 해결)

**증상**: MFDS 원문이 `(국문) … (영문) May help …` 이중언어이거나 한 브래킷에 다항 기능성이 병기된 제품이,
`extractFunctionsKo` 의 미분리로 인해 (a) KO 매장 초안에 영어 `May help …` 가 그대로 노출되고,
(b) 인지+관절 등 복합 제품이 pure-single 로 오생산될 위험.

**교정** (`hff-sf-registry.ts::extractFunctionsKo`, C 소유 registry):
- `(영문)`/`May help …` 영어 블록·`(국문)` 마커 제거 → 원문 KO 기능성만 보존 (KO 초안 영어 누출 0).
- 문장종결(`…있음/있습니다/필요함/…`) + 후속 한글 경계로 다항 기능성 분리 → 각 원자를 개별 EN 매핑.
- 미매핑 원자 발생 시 `resolveFunctions` 가 `pending=true` → 해당 제품 **자동 안전 보류**(생산 제외).

**효과(자동 보류)**:
- `cantaloupe-melon` — 혈관벽 두께(IMT) 억제 클레임이 C overlay 미등재 → pending → **0 생산**(스왈로우 방지).
- `angelica-gigas 신미보(인지+관절 복합)` — 관절건강 원자 미매핑 → pending → 보류. `인지Q`(단일 인지)만 생산.

단일 클레임 제품에는 no-op(회귀 0). 재생성 후 target 141건 KO 초안 **영어 누출 스캔 = 0**.

## 4. 보류(review-later) — 정당 보류

| slug | 보류 | 사유 |
|---|---:|---|
| fibroin-bf7 | 2 | 제품명 `BF-7 브레인`/`옵티마브레인` 네임토큰 + 기억력 클레임 → E-NAME-DERIVED BLOCKED (사람 검수 대상, PS 브레인계열과 동일 정책) |
| cantaloupe-melon | (전량) | 혈관벽 억제 복합 클레임 미매핑 pending |
| angelica-gigas 신미보 | 1 | 인지+관절 복합 pending |
| omega-3-oil | 4 REVIEW / 1 BLOCKED | Guard REVIEW/네임토큰 |

보류는 공식 기능성 약화가 아니라 **매핑 미확정·복합·네임토큰**에 의한 안전 정지. WO 원칙(약화 금지) 준수.

## 5. 자동 apply 게이트 통과 근거

dry-run(exec+rollback) → postVerifyPass 8/8 → apply COMMIT 8/8 → 독립검증(신규 연결) 8/8.
canonicalDup 0 · stmtDup 0 · expectedWrites(target×4) = postVerify 일치 · master/candidate/source_ref 정상 · A·B 영역 교집합 0(labelRe 유일식별 + classify 제외) · 기존 LIVE drift 0(신규 master만 생성).

## 6. 산출물 (C 소유 · path-specific)

- `apps/api-server/src/scripts/hff-sf-registry.ts` — extractFunctionsKo 이중언어/복합 파서 교정 + C-09 10성분 registry.
- `apps/api-server/src/scripts/hff-sf-c-en-overlay.ts` — C 도메인 EN 정본 overlay(additive).
- `apps/api-server/src/scripts/hff-sf-c-domain-discover.ts` — READ-ONLY C 도메인 미등록 라벨 discovery.
- `docs/checks/data/product-description-guard/hff-sf-c-domain/` — ready/target/shard/review-later/rollback-manifest.

공용 파일(`hff-sf-b-registry.ts`, drug/OTC, pnpm-lock) 미접촉. `git add .` 미사용.
