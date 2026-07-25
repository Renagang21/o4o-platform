# CHECK — OTC 잔여 전체 corpus 전수 census + 가·나·다 3-shard 설계

- **WO**: `WO-O4O-OTC-REMAINING-FULL-CORPUS-CENSUS-AND-THREE-SHARD-DESIGN-V1`
- **담당**: 드럭 OTC 조사 전용 에이전트 (라)
- **성격**: read-only 조사. **DB write 0**. 설명서 생성·apply 없음.
- **실행일 기준 상태**: `HEAD == origin/main` 확인 후 조사. 산출물은 결정론(타임스탬프 미포함, 2회 실행 byte-identical).
- **접속**: Cloud SQL Auth Proxy `127.0.0.1:5442` (프로덕션 `o4o-platform-db`). 임시 `apps/api-server/.env` 는 census 실행에만 사용 후 즉시 삭제(gitignored, stage/commit 0, 값 미출력).

---

## 1. 방법론

| 항목 | 정의 |
|------|------|
| 모집단 (universe) | `drug_category='otc'` ProductMaster 전량 (`product_drug_extensions`) |
| grounded(easy) | `mfds_easy_drug` STORE ko canonical 보유 (e약은요 원문 표시본) |
| authored ko | STORE ko canonical, source_type ∈ `{mfds_drug_otc, nutrition_combo, mfds_drug_otc_nutrition_combo}` |
| ALREADY_COMPLETE | authored ko canonical **AND** en canonical 동시 보유 |
| 공식 원문 | `product_candidates.source_label ∈ {MFDS_EASY_DRUG_INFO, MFDS_DRUG_OTC}` (itemSeq=MFDS_CODE 조인) 또는 easy/authored canonical |
| HOLD_SOURCE | 공식 원문·easy·authored canonical 전무 (또는 원문 파싱 0섹션) |
| fingerprint | shard-0 정본 규칙 VERBATIM 재사용 = `H(효능·용법·주의 정규화 + 성분\|함량 + 제형 + 경로)` |

**완료 트랙 제외는 트랙 이름이 아니라 DB canonical 상태로 파생한다.** 경구 복합 A/B/C · 안전 불일치 subgroup · 첩부제 · 영양계열 등 완료분은 authored KO+EN canonical 보유로 자동 `ALREADY_COMPLETE` 분류되어 READY 와 교집합 0 이 게이트로 보장된다.

---

## 2. 전체 census 집계 (필수 11 + 부가)

| # | 집계 | 값 |
|---|------|---:|
| 1 | 전체 OTC ProductMaster | **57,572** |
| 2 | authored KO+EN 완료 master (ALREADY_COMPLETE) | **7,673** |
| 3 | KO만 완료 master (EN 부재) | **0** |
| 4 | easy canonical만 있는 master | **11,764** |
| 5 | needs_review master | **0** |
| 6 | **READY** | **786 fp / 1,928 master** |
| 7 | **SPLIT_REQUIRED** | **795 fp / 3,165 master** |
| 8 | **HOLD_SOURCE** | **33,017 master** |
| 8a | ┗ axis6 candidate 연결단절 (MFDS_CODE 부재) | 0 |
| 8b | ┗ axis8 코드 존재·공식원문 부재 | 33,017 |
| 9 | **HOLD_IDENTITY** (무성분명/복합) | 2,366 fp / 6,048 master |
| 10 | **HOLD_ROUTE** (route 미분류) | 281 fp / 623 master |
| 11 | **EXCLUDE** (수출·군납·보건소·비매품 등) | 174 fp / 2,587 master |
| + | OTHER_SOURCE_NON_EASY (허가사항 원문만·별도 트랙) | 2,531 master |
| + | grounded(easy) master | 12,062 |
| + | parse fail | 0 |

**분류 카운트(상호배타·합=universe)**: `HOLD_SOURCE 33,017 · ALREADY_COMPLETE 7,673 · HOLD_IDENTITY 6,048 · SPLIT_REQUIRED 3,165 · EXCLUDE 2,587 · OTHER_SOURCE_NON_EASY 2,531 · READY 1,928 · HOLD_ROUTE 623` = **57,572** ✓

---

## 3. 정합 게이트 (전부 PASS)

| 게이트 | 결과 |
|--------|------|
| classSum == universe | ✅ 57,572 == 57,572 |
| READY ∩ ALREADY_COMPLETE | ✅ 0 |
| shard fp 교집합 | ✅ 0 |
| shard master 교집합 | ✅ 0 |
| shard fp 합 == READY fp | ✅ 786 |
| shard master 합 == READY master | ✅ 1,928 |
| DB write | ✅ 0 |
| 원문 parse 실패 | ✅ 0 |

**교차 정합**: grounded 미완료 4버킷 `READY(1,928)+SPLIT_REQUIRED(3,165)+HOLD_ROUTE(623)+HOLD_IDENTITY(6,048)=11,764` = `easyOnly(11,764)` 정확히 일치. grounded 12,062 중 나머지 298 = grounded 이나 EXCLUDE 키워드.

---

## 4. READY 3-shard 배정 (가·나·다)

READY fp 만 배정. **fp 는 정확히 한 shard**, master 균형 우선 + route 부차 균형. LIVE apply 는 각 shard 단일 write-owner 순차.

| shard | fp | master | route 분포 |
|-------|---:|------:|-----------|
| **가 (ga)** | 263 | 643 | oral 469 · topical 119 · ophthalmic 46 · vaginal 6 · nasal 3 |
| **나 (na)** | 263 | 642 | oral 397 · topical 175 · ophthalmic 50 · rectal 11 · vaginal 4 · nasal 5 |
| **다 (da)** | 260 | 643 | oral 415 · topical 167 · ophthalmic 48 · vaginal 4 · nasal 9 |
| **합계** | **786** | **1,928** | oral 1,281 · topical 461 · ophthalmic 144 · nasal 17 · vaginal 14 · rectal 11 |

- **교집합 검증**: fp 교집합 0 · master 교집합 0 · master ID 중복 0 · 기존 완료와 교집합 0.
- **각 shard 는 KO+EN 을 함께 책임** (본 corpus 의 authored 는 KO_ONLY=0 으로 항상 KO+EN 동반 완결).
- fp→shard 매핑 및 master ID 전량은 SSOT `otc-remaining-shard-assignment-ssot-v1.json` 의 `perFingerprint` / `shards[*].masterIds` 참조.

---

## 5. HOLD · EXCLUDE 분석

- **HOLD_SOURCE 33,017 (전체의 57%)**: MFDS_CODE 는 전량 존재하나(연결단절 0) 공식 원문(e약은요/허가사항)이 `product_candidates` 에 미수집. **외부 LLM 의료사실 생성 금지(CLAUDE.md)** 원칙상 원문 확보 없이 저작 불가 → 원문 수집 선행 필요. 조사 단계 HOLD 확정.
- **HOLD_IDENTITY 6,048**: name 끝 `(성분)` 부재(무성분명) 또는 복합 신호. 정체성 미확정으로 fingerprint 저작 단위 확정 불가.
- **HOLD_ROUTE 623**: 제형명으로 투여경로 판정 불가(`unknown`).
- **SPLIT_REQUIRED 3,165 / 795 fp (209 identity)**: 동일 `성분|함량|제형` 이 다중 fingerprint 로 분산(허가사항 문구·안전지문 상이). 서브그룹 분할 확정 후에야 저작 가능 → shard 미배정.
- **EXCLUDE 2,587**: 국내 소매 비대상(수출/군납/보건소용/비매품/샘플/임상시험용).
- **OTHER_SOURCE_NON_EASY 2,531**: e약은요 STORE canonical 은 없으나 허가사항 원문 존재. e약은요 fingerprint 파이프라인과 별개의 허가사항 grounding 트랙 후보 → 이번 shard 미포함.

---

## 6. 우선 생산 대상

READY 1,928 master 중 **oral(1,281) 우선** — 규모 최대·투여경로 위험 최소. 이후 topical(461) → ophthalmic(144) → nasal/vaginal/rectal(합 42, 경로별 추가 검수 필요). shard 내에서도 apply 시 route 별로 묶어 저작 안전성 확보 권장. 그룹 상세(성분·함량·제형·크기)는 census `readyGroups`(size desc 정렬) 참조.

---

## 7. 다음 생산 WO 3개 제안

3개 shard 는 상호 배타이므로 병렬 착수 가능하나, LIVE apply 는 각자 단일 write-owner 순차.

1. **WO-O4O-OTC-REMAINING-READY-SHARD-GA-V1** — 가 263 fp / 643 master, e약은요 grounded KO+EN 저작. oral 우선.
2. **WO-O4O-OTC-REMAINING-READY-SHARD-NA-V1** — 나 263 fp / 642 master, 동일 규약. topical 비중 최대.
3. **WO-O4O-OTC-REMAINING-READY-SHARD-DA-V1** — 다 260 fp / 643 master, 동일 규약.

각 WO 공통 계약: 대상 fp/master 는 SSOT 고정 · dry-run→이중게이트→독립검증→rollback · 새 medical fact 0(build==live) · KO 4T/EN 2T write 산식 준수 · 기존 완료와 교집합 0 재확인.

> **후속(shard 외)**: HOLD_SOURCE 33,017 원문 수집 트랙, SPLIT_REQUIRED 3,165 서브그룹 분할 트랙, OTHER_SOURCE_NON_EASY 2,531 허가사항 grounding 트랙, HOLD_IDENTITY 6,048 정체성 확정 트랙은 별도 WO 로 분리. **본 census 로 "OTC 전체 완료" 를 선언하지 않는다** — READY 1,928 은 실측 잔여의 일부이며, 대다수(HOLD_SOURCE/HOLD_IDENTITY/SPLIT)는 원문·정체성 선행 확보가 필요하다.

---

## 8. 중지 조건 점검

| 중지 조건 | 상태 |
|-----------|------|
| 기존 완료 ∩ 신규 READY | ✅ 0 (게이트) |
| ProductMaster·candidate·source 연결 불명확 | ✅ HOLD_SOURCE 로 분리, axis6 연결단절 0 |
| route·제형 혼합 | ✅ fp 키에 route 포함, unknown 은 HOLD_ROUTE 분리 |
| 동일 fp 내 조성·함량·허가사항 불일치 | ✅ fp 가 안전지문 포함, 분산은 SPLIT_REQUIRED 분리 |
| read-only 중 DB write 가능성 | ✅ SELECT 전용, dbWrite=0 |
| 기존 트랙 canonical 상태 예상과 상이 | ✅ KO_ONLY=0·needs_review=0 로 일관 |

---

## 9. 산출물

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/scripts/otc-remaining-full-corpus-census.ts` | read-only census 스크립트 |
| `apps/api-server/src/scripts/data/otc-remaining-full-corpus-census-v1.json` | 전체 census + READY/HOLD/EXCLUDE + shard assignment |
| `apps/api-server/src/scripts/data/otc-remaining-shard-assignment-ssot-v1.json` | 가·나·다 shard SSOT (fp→shard·master ID·불변식) |
| 본 문서 | CHECK |

## 10. Git

`git add .` 금지. 위 4개 자기 산출물만 path-specific stage → commit → push. `.env` stage 0. 종료 시 `HEAD == origin/main`, 미푸시 자기 산출물 0.
