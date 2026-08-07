# CHECK — WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1

> **범위**: 이미 완성·검증된 `19,360` master 의 EN 매장 설명서를 프로덕션 DB 에 적용·승격하고 공개 경로까지 검증한다.
> **번역 생산 없음** — KO 재생산 · EN 재번역 · TM 신규 번역 · 번역 문장 자연어 수정 **0건**.
> 선행 CHECK: [`CHECK-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FINAL-PRODUCTION-CLOSE-V1.md`](CHECK-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FINAL-PRODUCTION-CLOSE-V1.md)

**결과: 19,360 / 19,360 적용 완료. APPLY_BLOCKED 0. 공개 API 전수 검증 통과.**
단, **§19 브라우저 smoke 는 수행하지 못했다** (아래 §19 참조).

---

## 1. 최종 수치 요약

| 항목 | 값 |
|---|---:|
| 모집단 | 19,360 |
| UPDATE_SINGLE_HIDDEN_EN (hidden → canonical) | 18,980 |
| CREATE_NEW_EN (신규 INSERT) | 380 |
| ALREADY_CURRENT_EN (적용 시점) | 0 |
| APPLY_BLOCKED | **0** |
| 분류 누락(unclassified) | **0** |
| DB write 건수 (LIVE) | 19,360 |
| 멱등 재실행 write | **0** |

`18,980 + 380 + 0 + 0 = 19,360` — plan 행 수와 일치.

**Plan digest (sha256, 잠금값)**

```
38c76c256fc6a9c03b77154fc45c29ff96e435242bd34555b22349aeb9a0bb4b
```

동일 digest 를 서로 다른 3개 시점 스냅샷에서 재현했다 (census run1 · run2 · rollback test 직후).
plan 파일 자체도 3회 모두 **바이트 동일**.

---

## 2. EN 저장본 직렬화 — 이번 WO 에서 새로 필요했던 계층

production artifact(`en-units.jsonl`)는 **세그먼트 원장**이고 DB 는 **HTML** 이다. 그 사이를 잇는 변환이
트랙에 없었다. 마크업을 새로 생성하면 KO 와 구조가 갈라지므로 다음 원칙으로 `en-render.mjs` 를 만들었다.

> **KO canonical HTML 을 템플릿으로 두고 텍스트 노드만 EN 으로 치환한다.** 태그·속성·들여쓰기는 원문 그대로 흘린다.

번역 생산이 아니다 — 검증 완료된 문장을 자리에 되돌려 놓는 **결정적 변환**이며, 문장은 한 글자도 만들지 않는다.

**정렬 증명 3단** (하나라도 어긋나면 그 master 는 `BLOCK_PRODUCTION_ARTIFACT_MISMATCH`, 현장 수정 금지)

1. 내 분류기를 KO HTML 에 돌린 `kind` 시퀀스 == 정본 `extract-units.segment(koHtml)` 의 `kind` 시퀀스
2. `en-units` 세그먼트의 `kind`/`field` 시퀀스 == 위 KO 시퀀스, 그리고 FIXED_IDENTITY 는 텍스트까지 일치
   (배지 `일반의약품`/`전문의약품` 만 `en-frame.BADGE` 고정 어휘로 번역되는 예외)
3. 렌더 결과를 **텍스트 노드 단위**로 되읽어 배정한 EN 텍스트와 완전 일치

전 모집단 `renderFail 0`. 적용 후 독립 재렌더 검증도 `19,360 / 0 실패`.

---

## 3. 단계별 결과

### §4 착수 안전 확인
- 브랜치 `main`, `HEAD...origin/main` = `0 0`, 이번 트랙 경로 미커밋 변경 0.
- 선행 생산 커밋 `b585f5860` 이 HEAD 의 조상임을 확인, 트랙 경로 diff 없음.
- 작업 중 HEAD 는 병렬 세션(HFF-JA 등) 때문에 여러 번 전진했다. **해당 세션 파일은 읽지도 stage 하지도 않았다.**

### §5 production artifact 재잠금
재검증 2종을 read-only 로 재실행, 생산 종료 시점과 동일.

```json
{ "koMasters": 19360, "enUnitsLines": 19360, "enUnitsDistinct": 19360, "enUnitsDuplicateAppends": 0,
  "verified": 19360, "failed": 0, "emptyBodySegments": 0, "codeTally": {},
  "tm": { "lines": 25365, "distinct": 16026, "corrections": 82 },
  "fileWrites": 0, "dbWrites": 0 }
```

### §6~§9 LIVE census · 분류 · plan 잠금

`live-census-and-plan.mjs` (read-only). 과거 수치를 재사용하지 않고 **현재 프로덕션 DB 에서 재조사**했다.

| 분류 | 건수 |
|---|---:|
| UPDATE_SINGLE_HIDDEN_EN | 18,980 |
| CREATE_NEW_EN | 380 |
| BLOCK_* (전 종류 합) | 0 |

- KO canonical 소실 0 · **KO 해시 drift 0** · KO row identity drift 0
- 기존 canonical EN 0건 → `ALREADY_CURRENT_EN` · `BLOCK_EXISTING_CANONICAL_EN` 모두 0
- KO source_type: `mfds_easy_drug` 19,360 (단일)
- 기존 hidden EN source_type: `mfds_drug_otc` 14,597 / `o4o_drug_otc_topical` 2,528 / `mfds_drug_otc_nutrition_combo` 1,855
- HTML 위생 관찰: 번역문에 `>` 포함 **12 master**(수식 표기 `pH > 7.44` 등 — HTML 텍스트에서 유효),
  엔티티 오해 소지 `&` **0건**. 파싱을 깨는 `<` 는 차단 조건으로 두었고 해당 사례 0건.

### §10·§11 dry-run 2회
동일 digest, 동일 분류. 두 결과 JSON 은 tag 문자열을 제외하면 **완전히 동일**.

```
dry-run 1 / dry-run 2 : examined 19360, updated 18980, inserted 380, applyBlocked 0, dbWrites 0
```

### §12 rollback test (실 트랜잭션 → ROLLBACK)
- 1차: 전 모집단 대상 실행 중 **18,000/19,360 지점에서 프록시 access token 만료로 연결 종료**.
  그 시점까지 `applyBlocked 0`, **커밋 0**(rollback 모드는 COMMIT 경로가 없다). 결과 파일 미생성.
- 2차: 도달하지 못한 꼬리 구간(`--offset 18000`, 1,360건) 재실행 → `examined 1360 / updated 1329 / inserted 31 / applyBlocked 0 / committed false`.
- **잔여물 0 증명**: rollback 시도 직후 census 를 재실행해 plan 이 **바이트 동일**하고 digest 가 그대로임을 확인했다.
  EN 상태·해시가 조금이라도 남았다면 분류나 해시가 바뀌므로, 이 재현이 전 모집단 잔여물 0의 직접 증거다.

> 이 사고를 계기로 적용기에 **연결 끊김 graceful 처리**와 `--offset` shard 를 넣었다.
> 연결이 끊기면 해당 master 를 미착수로 되돌리고 부분 결과와 재개 offset 을 기록한 뒤 종료한다.

### §13 LIVE apply
master 단위 개별 트랜잭션. 각 트랜잭션: KO `FOR SHARE` 재확인 → 해시 재검증 → EN 재직렬화 →
`productionEnHash` 대조 → EN 현재 상태 재확인 → UPDATE/INSERT → **커밋 전 되읽기 검증**
(해시·status·language·description_type·canonical 유일성) → COMMIT.

| shard | offset | examined | updated | inserted | blocked |
|---|---:|---:|---:|---:|---:|
| live-s1 | 0 | 7,000 | 6,866 | 134 | 0 |
| live-s2 | 7,000 | 7,000 | 6,866 | 134 | 0 |
| live-s3 | 14,000 | 4,959 | 4,854 | 105 | 0 |
| live-s4 | 18,959 | 401 | 394 | 7 | 0 |
| **합계** | | **19,360** | **18,980** | **380** | **0** |

live-s3 은 토큰 만료로 18,959 지점에서 정상 종료(부분 커밋 유지, 재개 offset 기록) → s4 로 이어붙였다.
shard 경계는 결과에 영향이 없다(master 단위 독립 트랜잭션).

- UPDATE: `content` 교체 + `status hidden → canonical`. `source_type`/`source_ref_id` 는 **손대지 않았다**.
- INSERT: `source_type` = KO canonical 의 `mfds_easy_drug`, `source_ref_id` = 해당 KO description id (추적 가능).

### §14 변경 금지 대상 — 전후 지문 대조

지문은 행 수가 아니라 `md5(string_agg(id || md5(content) || status ORDER BY id))` 라 내용 변경도 잡는다.

| 대상 | before | after | 판정 |
|---|---|---|---|
| `ko` 설명서 지문 | `ad22eb8f…` (103,348) | `ad22eb8f…` (103,348) | **UNCHANGED** |
| `zh` 설명서 지문 | `b02cc0ba…` (42,262) | `b02cc0ba…` (42,262) | **UNCHANGED** |
| `ja` 설명서 지문 | `33babb66…` (32,270) | `33babb66…` (32,270) | **UNCHANGED** |
| `en` 설명서 | 62,977 | 63,357 (**+380**) | 의도된 변경(INSERT 수와 일치) |
| product_masters | 239,361 | 239,361 | UNCHANGED |
| product_identifiers | 638,428 | 638,428 | UNCHANGED |
| typeorm_migrations | 630 (max `2026052100001`) | 630 (동일) | **migration 0** |
| 스키마 컬럼 지문 | `11f43c5b…` | `11f43c5b…` | UNCHANGED |

STORE/EN status 분포 변화 — **삭제 0, 상태 되돌림 0**:

```
en|STORE|canonical|alive    43,847 → 63,207   (+19,360)
en|STORE|hidden|alive       19,081 →    101   (-18,980)
en|STORE|deprecated|alive       34 →     34   (   +0)
en|STORE|canonical|deleted       9 →      9   (   +0)
en|STORE|needs_review|deleted    2 →      2   (   +0)
```

### §15·§16 DB 독립 사후 검증 + artifact ↔ DB 해시 대조

적용기와 **다른 경로**로 판정(`live-post-verify.mjs`): DB 실제 값을 읽어 census 가 잠근
`productionEnHash` 와 대조하고, 재렌더는 2차 의견으로만 사용.

```json
{ "verified": 19360, "reconciled": true,
  "verdictTally": { "APPLIED": 19360 },
  "hiddenEnRemaining": 0,
  "languageCombinations": { "ko+en": 19360 },
  "rerender": { "checked": 19360, "failed": 0 },
  "problems": [], "dbWrites": 0 }
```

`HASH_MISMATCH` · `MULTI_CANONICAL` · `KO_DRIFT` · `NOT_APPLIED` 모두 **0**.

### §17 공개 언어 계약 회귀

정본은 `ProductLandingService` — `languages` = canonical STORE 언어 distinct, **정렬은 ko 최우선 → localeCompare**,
`resolvedLocale` = 요청 locale 이 있으면 그것, 없으면 ko, 그것도 없으면 첫 언어.
`languages === ['ko']` 같은 과거 가정을 쓰지 않고 **master 별 기대값**으로 검사했다.

| 검사 | 통과 / 모집단 |
|---|---:|
| EN_PRESENT (`'en' ∈ languages`) | 19,360 / 19,360 |
| EN_RESOLVES (`resolvedLocale('en') === 'en'`) | 19,360 / 19,360 |
| KO_DEFAULT (`locale 미지정 → 'ko'`) | 19,360 / 19,360 |
| ORDER_KO_FIRST (`languages[0] === 'ko'`) | 19,360 / 19,360 |

언어 조합은 전 모집단 `ko+en` 단일. landing 발급 현황: **19,360 전건 발급 · 전건 `active/ok`**.

### §18 실제 공개 API 전수 검증 (표본 아님)

`GET /api/v1/public/product-landings/:publicKey?locale=en` 을 **19,360건 전수** 호출.
설명서 본문은 로그인 세션에만 응답하므로(ADR-0002) 세션 쿠키로 호출했고,
자격증명은 환경변수로만 주입했다(로그·커밋·본 문서에 값 없음).

| 검사 | 통과 / 요청 |
|---|---:|
| HTTP_200 | 19,360 / 19,360 |
| AUTHED (`authRequired === false`) | 19,360 / 19,360 |
| EN_IN_LANGUAGES | 19,360 / 19,360 |
| EN_RESOLVED | 19,360 / 19,360 |
| **BODY_HASH_MATCH** (`md5(응답 본문) === productionEnHash`) | **19,360 / 19,360** |

마지막 항목이 핵심이다 — 사용자가 실제로 받는 응답이 production artifact 와 **바이트 단위로 동일**하다.
KO 회귀(표본 500): `resolvedLocale='ko'` 500/500, KO 본문 존재 500/500.

### §19 브라우저 smoke — **미수행**

이번 세션에 **브라우저 자동화 도구가 없어 명세대로 수행하지 못했다.** 통과로 보고하지 않는다.
화면 렌더(CSS 적용·레이아웃·폰트·언어 선택 UI 동작)는 **검증되지 않은 상태로 남는다.**

대체로, 위험 범주 13개 표본의 **실제 공개 API 응답 HTML** 을 받아 구조를 기계 검사했다
(`live-risk-sample-inspect.mjs`). 브라우저 검증의 대체물이 아니라 부분 보완이다.

표본: 안과 · 구강/가글 · 외용 · 직장 · 주사 · 흡입 · 질 · 수식 `>` 포함 · 최장 본문(9,082자) ·
최단 본문(1,438자) · 숫자 최다 · 신규 INSERT · hidden UPDATE — **13 / 13 전항목 통과**.

| 검사 | 결과 |
|---|---|
| TAG_BALANCE (여닫는 태그 수 일치) | 13/13 |
| SD_CLASSES (`sd-*` 디자인 훅 보존) | 13/13 |
| EN_HEADINGS (h2 가 en-frame 고정 어휘) | 13/13 |
| NO_KO_IN_BODY (FIXED_IDENTITY 제외 후 한글 잔존 0) | 13/13 |
| FOOTER_PRESENT (약사 문의 안내 유지) | 13/13 |

> `NO_KO_IN_BODY` 는 마크업을 추측해 걷어내면 오탐이 난다. 제품명·제조사 같은 **고정 식별자는 한글 유지가 계약**이므로,
> artifact 가 `FIXED_IDENTITY` 로 선언한 텍스트 자체를 제거한 뒤 판정해야 한다.

### §20 캐시 / 전파

공개 엔드포인트는 응답에 `Cache-Control: no-store, private` + `Vary: Authorization` 를 명시한다
(개인화 응답의 공개 shared cache 저장 금지). **CDN stale 문제가 구조적으로 발생하지 않는다.**
표본 500건 응답에서 `no-store` 헤더 500/500 실측. 캐시 시스템 신설·데이터 재작성 없음.

### §21 멱등 재실행

전 모집단 대상으로 LIVE 모드를 그대로 다시 실행:

```json
{ "examined": 19360, "updated": 0, "inserted": 0,
  "alreadyCurrent": 19360, "applyBlocked": 0, "dbWrites": 0 }
```

UPDATE 0 · INSERT 0 · 신규 차단 0 · DB write 0. 요구 조건 그대로 충족.

### §22 hidden EN 잔여 census (삭제·archive 없음)

- 이번 모집단 19,360 의 hidden EN 잔여: **0**
- 플랫폼 전체 STORE/EN hidden 잔여: **101** (19,081 − 18,980) — 전부 이번 모집단 **밖**
- deprecated 34 · soft-deleted 11 행은 손대지 않았다. **삭제·archive 0건** (census 만 수행)

---

## 4. 작업 중 발생한 사고 1건 (보고)

**`extract-units.mjs` 를 import 한 것만으로 추출기가 실행되어 `results/ko-units.jsonl`(100MB, gitignore 대상)이 0바이트로 잘렸다.**

- 원인: 파일 끝에서 `main()` 을 무조건 호출한다. `segment()` 를 재사용하려고 import 했더니 top-level 이 실행됐다.
  비동기라 즉시 죽지 않고, **읽는 중이던 파일이 조용히 반쪽 JSON** 이 되어 `Unterminated string in JSON` 으로 나타났다.
- 영향 범위: **DB write 0**(추출기는 read-only), 추적 파일 변경 0, 다른 세션 파일 무접촉.
  손상된 것은 gitignore 대상 파생물 1개뿐이다.
- 기준선 영향 **없음**: KO drift 판정의 기준선은 ko-units 가 아니라 `en-units.jsonl` 각 레코드의 `koHash` 다.
  census 는 이 값을 썼고 전 모집단 drift 0 을 확인했다.
- 조치: `extract-units.mjs` 에 **entry-point 가드**를 추가해 직접 실행일 때만 `main()` 이 돌게 했다.
  CLI 동작은 그대로다. `ko-units.jsonl` 은 DB 에서 재생성 가능한 파생물이며 이번 WO 범위에서는 사용하지 않았다.

---

## 5. 금지 항목 준수

| 금지 | 실제 |
|---|---|
| KO 재생산 · EN 재번역 · TM 신규 번역 | 0건 (TM 25,365 라인 · distinct 16,026 불변) |
| 번역 문장 자연어 수정 | **0건** — 적용 중 문제로 보이는 것을 DB 에서 고친 사례 없음 |
| hidden old EN 을 번역 입력으로 사용 | 사용 안 함. hidden 행은 UPDATE 대상 식별에만 사용 |
| ZH · JA 작업 / HFF 작업 | 0건 (지문 UNCHANGED 로 증명) |
| HOLD 144 재처리 · 별도 130 HOLD KO 검토 · SAFE_TO_DELETE 61 삭제 | 0건 |
| `kpa_store_contents` 정비 | 0건 |
| schema · migration 변경 | 0건 (migrations 630 불변, 컬럼 지문 불변) |
| ProductMaster · ProductIdentifier 변경 | 0건 (행 수 불변) |
| 무관한 refactor | 없음. `extract-units.mjs` 수정은 사고 재발 방지 가드 1건뿐 |
| `git add .` · reset · clean · stash · amend · rebase · force push | 사용 안 함 (경로 지정 stage 만) |

---

## 6. 산출물

**신규 도구** (`apps/api-server/src/scripts/easy-drug-en-full-retranslation/`)

| 파일 | 역할 |
|---|---|
| `en-render.mjs` | EN 저장본 직렬화 + 정렬 증명 3단 |
| `live-schema-probe.mjs` | 대상 테이블 컬럼·제약·인덱스·분포 사전 조사 |
| `live-census-and-plan.mjs` | LIVE census → 분류 → plan ledger + digest 잠금 |
| `live-apply.mjs` | dry / rollback / live **단일 코드 경로** + shard(`--offset`) + 연결 끊김 graceful |
| `live-post-verify.mjs` | 적용기와 다른 경로의 사후 검증 (+`--rerender` 2차 의견) |
| `live-public-verify.mjs` | 공개 언어 계약 전수 재현 (ProductLandingService 동일 SQL·정렬) |
| `live-api-verify.mjs` | 실제 공개 API 전수 호출 + 본문 해시 대조 |
| `live-guard-snapshot.mjs` | 변경 금지 대상 전후 지문 |
| `live-risk-sample-inspect.mjs` | 위험 범주 표본 HTML 구조 검사 (§19 대체, 브라우저 아님) |
| `extract-units.mjs` | **수정 1줄 블록** — entry-point 가드 |

**대용량 원장은 커밋하지 않는다** (`results/.gitignore`). 무결성 기준은 파일이 아니라 digest 다.
`live-apply-plan.jsonl`(8MB) 의 `productionEnHash` 는 `md5(renderEnHtml(KO canonical, en-units))` 로
언제든 재계산되며, `live-post-verify --rerender` 가 전 모집단 19,360/0 실패로 이를 증명했다.
`live-apply-undo.jsonl`(70MB, UPDATE 직전 EN 본문 전량)은 운영 콘텐츠라 커밋 대상이 아니다.

---

## 7. 남은 것 / 후속

1. **§19 브라우저 smoke 미수행** — 브라우저 자동화 도구가 있는 세션에서 화면 렌더·언어 선택 UI 를 확인해야 한다.
   메모리 규칙상 렌더 검증에는 `.store-desc-content` CSS 스코프 래퍼가 필요하다(없으면 무스타일 상태로 허위 PASS).
2. **플랫폼 전체 hidden EN 101건** — 이번 모집단 밖. census 만 했고 판단·삭제는 하지 않았다.
3. `results/ko-units.jsonl` 은 0바이트 상태다. 이번 WO 에서 쓰지 않았고 DB 에서 재생성 가능하다.
   생산 트랙을 다시 돌릴 때 `extract-units.mjs` 를 직접 실행해 복구하면 된다.

---

*작성: 2026-08-08 · LIVE apply 완료 · APPLY_BLOCKED 0*
