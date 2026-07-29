# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-30001-35000-V1

건강기능식품(HFF) 한글 매장용 설명서 개별 생산 — Agent 1 담당 구간 **순번 30,001~35,000**

- 근거 WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-30001-35000-V1`
- 직전 구간: `CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-25001-30000-V1`
- 기준 커밋: `d414fe8ee` (착수 HEAD 와 동일)
- 판정: **PASS**

---

## 1. 실행 전 환경 확인

| 항목 | 결과 |
|---|---|
| `ide_selection` / 편집기 선택 내용 자동 첨부 | **없음** — 미첨부 확인 후 착수 |
| 공용 driver / parser / registry / composer / Guard / 렌더러 / CSS 수정 | **없음** |
| 타 세션 WIP 접촉 | **없음** |

## 2. DB 접속

| 항목 | 값 |
|---|---|
| 인스턴스 연결 이름 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| 접속 경로 | Cloud SQL Auth Proxy v2, 전용 포트 **5472** |
| DB / 사용자 | `o4o_platform` / `o4o_api` |
| 자격증명 취급 | 로컬 `.env` 에서 동일 명령 내 `$PGPW` 로만 주입. **코드·CHECK·manifest·로그·커밋 미기록** |

잘못된 접두사 `o4o-platform-noh` 미사용.

## 3. 대상 확정 (manifest)

| 항목 | 값 |
|---|---|
| 후보 풀 | `product_candidates` / `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` / `deleted_at IS NULL` |
| 정렬 | `ORDER BY (raw_payload->'source'->>'STTEMNT_NO'), id` (고정) |
| 풀 총계 | **41,261** (직전 구간과 동일 — 풀 변동 없음) |
| manifest 길이 | **5,000** |
| firstIndex / lastIndex | **30,001 / 35,000** |
| 재파생 대조 mismatch | **0** (독립 2회차 쿼리) |
| candidateId 중복 | **0** |
| 구간 내 statementNo 중복 | **0** |
| head | `20130020008165` 메가디-에스(MegaD-S) |
| tail | `20190004553338` 더나은 혈당컷 다이어트 케어샷 |
| 직전 구간 tail (30,000) | `20130020008158` → `boundaryContinuous: true` |
| 기존 링크 보유 후보 | 1,616 |
| 잔여 (35,000 이후) | **6,261** |

파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000.json`

manifest 생성 후 대상·순서 변경 없음.

## 4. Driver parity (공용 driver 무변경 증명)

driver 원본에서 `main().catch(` **한 줄만** 제거한 shim 을 만들고, shim 에서 제거한 줄을 되돌려 원본과 **byte 대조**(`SHIM_INTEGRITY_FAIL` 가드)하여 무변경을 증명한 뒤 `composeKo` 를 재사용했다.

| 항목 | 값 |
|---|---|
| shim 무결성 | **PASS** (driver 22,417 bytes — 직전 구간과 동일) |
| 대조 대상 | 직전 구간(25001-30000) LIVE SPD **30건** |
| byte 동일 | **30 / 30** |
| 불일치 | **0** |
| `git diff hff-ko-agent-01-individual.mjs` | **공백 (무변경)** |

## 5. 표본 20건 사전 검증

쿼터: `HINT_LONG 4 / MULTI_FUNC 4 / FN_LONG 3 / SRV_LONG 3 / TERMS 2 / HINT_EMPTY 2 / LIQUID 2` — **전 유형 정확 충족**. 표본은 전부 **신규 생성 예정**(canonical 미존재) 제품에서 선정.

| 항목 | 결과 |
|---|---|
| CREATE / HOLD | **20 / 0** |
| 기능성 grounding | 199 검사 / **위반 0** |
| 참고사항 grounding | 101 검사 / **위반 0** |
| 섭취 chip grounding | 20 검사 / **위반 0** |
| 문제 총계 | **0** |
| 판정 | **PASS** |

`sd-warn` / 미정의 class / 빈 카드 / 말줄임 / HTML 불균형 / footer 누락 / generic fallback / 구매 CTA / `이런 분께` / `IFTKN_ATNT_MATR_CN` / SRV_USE 원문 누락 — 전부 **0**.

육안 확인(TERMS 표본 `메가디-에스`): 공식 기능성·섭취방법·참고사항이 **원문 그대로** 보존되고 방어적 순화가 없음을 확인했다. 해당 표본에서 `1)` 계열 글머리 기호는 `MARKER_LEAD` 로 정상 제거된다(§9-2 의 `○` 잔존과 구분됨).

## 6. Dry-run

| 상태 | 건수 |
|---|---|
| CREATED | 3,317 |
| SKIPPED_EXISTING | 1,616 |
| HOLD_FOR_AGENT_9 | 67 |
| FAILED_SYSTEM | 0 |
| 합계 | **5,000** |
| DB write | **0** |
| 소요 | 593s (**119ms/건**) |

SKIPPED_EXISTING 1,616 은 사전 일괄 조회한 "기존 canonical 보유 master 1,616" 과 **정확히 일치**한다.

HOLD 사유: `NO_INTAKE_DATA` 67 (SRV_USE 부재) **전량**. WO 가 명시한 정당한 보류 사유이며, **`INTAKE_HINT1` 공란만을 이유로 한 보류는 0건**이다.

## 7. Apply (LIVE)

이중 게이트(`--apply` + `HFF_AGENT1_APPLY_CONFIRM=YES`) 통과. 제품 1건 = 트랜잭션 1개, 트랜잭션 내 canonical `count(*)==1` 사후검사 실패 시 ROLLBACK.

| 항목 | 값 |
|---|---|
| CREATED / SKIPPED / HOLD / FAILED | **3,317 / 1,616 / 67 / 0** — dry-run 과 **완전 동일** |
| DB writes | **9,951** (= 3,317 × 3) |
| expected write vs actual write | **9,951 = 9,951** |
| 소요 | 419s (**84ms/건**) |
| 실행 시간창 | `2026-07-29T12:57:22Z` ~ `13:04:21Z` |
| rollback manifest | masters 3,317 · spd 3,317 · links 3,317 · outcomes 3,317 |

## 8. 독립 검증 (driver 미사용 · 별도 SQL + 저장 content 재파싱)

### 8-1. 저장 정합

| 검사 | 결과 |
|---|---|
| 생성 SPD 실재 | 3,317 / 3,317 (**누락 0**) |
| SPD 속성 유효 (`o4o_hff_generated` · `canonical` · `STORE` · `ko` · 본문 ≥60자) | **무효 0** |
| candidate 링크 (`matched_product_master_id` · `approved_new_master`) | **불량 0** |
| canonical 유일성 위반 | **0** |
| `mfds_permit_number` 중복 master | **0** |
| manifest 밖 SPD 생성 | **0** |
| manifest 밖 product_masters 생성 | **0** |
| 실행 시간창 내 기타 SPD 갱신 | **0** |
| SKIP 대상 기존 canonical drift (apply 전 SHA-256 스냅샷 3,232행 대조) | **0** |
| 기존 SPD 소실 | **0** |

### 8-2. Grounding (저장된 본문 ⊆ 공식 원문)

| 축 | 검사 | 위반 |
|---|---|---|
| 기능성 ⊆ `MAIN_FNCTN` | 21,002 | **0** |
| 참고사항 ⊆ `INTAKE_HINT1` | 14,080 | **0** |
| 섭취 chip ⊆ `SRV_USE` | 2,984 | **0** |

`IFTKN_ATNT_MATR_CN` 미사용 · generic fallback 일괄 삽입 **0** · 공식 기능성 누락 **0** · 방어적 순화 **0** · 원문보다 강한 경고 추가 **0** · 영문 SPD 생성 **0**.

### 8-3. 디자인·구조

`designProblems` **빈 객체 — 전 항목 0건**.

`sd-warn` 0 · 미정의 class 0 · 빈 카드 0 · footer 누락 0 · 말줄임 0 · HTML 태그 불균형 0 · 필수 섹션 누락 0 · 힌트 없는데 참고사항 섹션 0 · SRV_USE 원문 누락 0 · 구매 CTA 0 · `이런 분께` 0 · **다른 제품 정보 혼입 0** · 비한국어 본문 0.

참고사항은 전건 `sd-core > sd-item` **저강조** 구조.

### 8-4. 전역 증감

| 지표 | 증감 | 기대 |
|---|---|---|
| STORE/ko canonical SPD | **+3,317** | +3,317 ✅ |
| `o4o_hff_generated` SPD | **+3,317** | +3,317 ✅ |
| `건강기능식품` product_masters | **+3,317** | +3,317 ✅ |

apply 전 baseline(`spd_store_ko_canonical=56,336`)은 직전 구간 종료값(53,305 + 3,031)과 일치하여 **구간 간 연속성도 수치로 확인**되었다.

### 8-5. 실브라우저 렌더 (headless Chromium · 저장된 LIVE content)

실제 `storeDescriptionCss` 를 추출하고 **`.store-desc-content` 래퍼 안에서** 렌더했다. 최장 3건(5,387 / 5,070 / 4,657자).

**래퍼 적용 증명** (WO 요구사항 — 래퍼 없는 렌더는 CSS 검증으로 불인정):

| 조건 | `.sd-card` computed `max-width` |
|---|---|
| 래퍼 **없이** | `none` (CSS 미적용) |
| 래퍼 **적용** | **`860px`** (CSS 적용됨) |

→ `cssActuallyApplied: true`. 래퍼 없이는 스타일이 전혀 걸리지 않음을 실측으로 확인했다.

| 폭 | 페이지 가로 overflow | 요소 overflow | 클리핑 | 필수 섹션 |
|---|---|---|---|---|
| 430 | 없음 | 0 | 0 | 전부 존재 |
| 820 | 없음 | 0 | 0 | 전부 존재 |
| 1280 | 없음 | 0 | 0 | 전부 존재 |

## 9. 보류 중인 공용 정비 사항 (WO 지시대로 미수정 · 보고만)

### 9-1. 그룹 내 기능성 중복 — 1건

`withinGroupDupFunc: 1` (3,317건 중 0.03%. 직전 구간 6건 → 1건).

| 신고번호 | 제품명 | 원문 반복 |
|---|---|---|
| `20190004553194` | 듀얼 바이탈 이뮨 | "유해산소로부터 세포를 보호하는데 필요" ×3, "체내 에너지 생성에 필요" ×2 등 5문장 |

**원인**: 다원료 종합영양 제품으로, 공식 `MAIN_FNCTN` 원문에서 **서로 다른 영양소(마그네슘·셀레늄·철·아연·비타민E·비타민C 등)가 각각 동일한 기능성 문구를 공식 보유**하여 원문 자체가 같은 문장을 반복 기재한다(원문 전문 확인). 날조·기능성 삭제가 아닌 **원문 충실 렌더**이며 grounding 21,002건 전건 통과했다.

**주의(인계 재확인)**: 본 사례는 직전 구간 CHECK 가 경고한 **"그룹 간 동일 문장 병합 금지"** 의 전형이다. 이 제품에서 중복을 제거하면 특정 영양소의 공식 인정 기능성이 삭제된다. dedupe 도입 시 범위는 반드시 동일 그룹 내부로 한정해야 한다.

### 9-2. `INTAKE_HINT1` 의 `○` 글머리 기호 잔존

`MARKER_LEAD` 정규식이 `○` 를 포함하지 않아 원문 글머리 기호가 그대로 남는다. 1~30,000 기존 LIVE 전 구간과 동일한 거동이며(parity 30/30 로 확인) 원문 충실 렌더에 해당한다.

두 사항 모두 해소하려면 공용 driver 수정이 필요하다. 본 WO 는 두 건을 **"이번 WO 에서 수정하지 않고 그대로 보고만 한다"** 고 명시했으므로 driver 무수정 상태로 보고한다. 전체 중지 조건에 해당하지 않는다.

## 10. 성능 원칙 준수

`product_masters.mfds_permit_number` 무인덱스. manifest 생성 · 표본 · 스냅샷 · 검증 전 단계에서 **행별 상관 서브쿼리를 사용하지 않고** `WHERE mfds_permit_number = ANY($1)` 1회 스캔 + JS `Map` 매칭만 사용했다. 이미 `matched_product_master_id` 링크가 있는 후보(1,616건)는 permit 재조회 대상에서 제외했다.

## 11. Git 안전 절차

- 착수 HEAD = `d414fe8ee` = `origin/main` = 기준 커밋.
- 타 세션 미추적 파일(`otc-easy-drug-*` 계열, `tmpcols.cjs`, `tmpdiff.cjs`) **일절 미접촉**.
- `git add .` / 경로 없는 commit 미사용 — **경로 지정 stage + 경로 지정 commit** 만 사용.
- `pnpm-lock.yaml` 미수정 / 공용 parser·registry·composer·Guard·driver·렌더러·CSS 미수정 / 영문 설명서 미생성 / force push 미사용.
- 임시 스크립트(`tmp-hff-a1-*.mjs`) 및 임시 baseline 스냅샷 전량 삭제 후 커밋.

커밋 대상 (Agent 1 자기 파일만):

```
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000.json
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-results.json
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-samples.json
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-holds.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-failed-system.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-rollback-manifest.json
docs/checks/CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-30001-35000-V1.md
```

## 12. 잔여

| 항목 | 값 |
|---|---|
| 구간 내 남은 미처리 (Agent 9 보류) | **67** |
| Agent 9 보류 파일 | `apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-holds.jsonl` |
| 시스템 실패 파일 | `apps/api-server/src/scripts/data/hff-ko-agent-01-30001-35000-failed-system.jsonl` (0건, 빈 파일) |
| 전체 HFF 잔여 후보 (35,000 이후) | **6,261** |
| 다음 구간 | 35,001~40,000 (마지막 구간은 40,001~41,261, 1,261건) |

## 13. 함정 기록 (다음 구간 인계)

1. 프록시 인스턴스 연결 이름 = `netureyoutube:asia-northeast3:o4o-platform-db`. 오타 시 프록시는 살아 있는데 클라이언트만 `ECONNRESET` → 비밀번호 오진 주의. 토큰 수명이 약 1시간이므로 구간마다 **새 포트로 재기동**한다.
2. `mfds_permit_number` 무인덱스 → 행별 상관 서브쿼리 금지, `= ANY()` 일괄 조회 필수.
3. **렌더 검증은 `.store-desc-content` 래퍼 필수.** CSS 가 이 클래스 하위로 스코프되어 있어 래퍼 없이 렌더하면 스타일이 하나도 적용되지 않은 채 "overflow 0 / PASS" 가 나온다. 본 구간은 래퍼 유무에 따른 `max-width` 실측(`none` vs `860px`)을 **검증의 일부로 포함**했다. 다음 구간도 이 증명을 유지할 것.
4. HTML 균형 검사는 `<ul` 로 세야 한다 (`<ul>` 로 세면 속성 붙은 여는 태그를 놓쳐 전건 오탐).
5. chip grounding 은 `sd-chips` 컨테이너 내부로 스코프를 좁혀야 한다 — `sd-tag` 는 기능성 그룹 헤더·참고사항 헤더에도 쓰인다.
6. 기능성 중복 검사는 **그룹 내부**로 한정 (§9-1).
7. driver 의 `HFF_DUMP_SAMPLES=YES` 는 표본을 **4건만** 덤프하며 `-samples.json` 을 덮어쓴다. 20건 표본 파일 생성 후에는 이 플래그를 켜지 말 것.
8. `HFF_BATCH` / `HFF_EXPECT` / `PROXY_PORT` 로 driver 를 파라미터화할 수 있다. `PROXY_PORT` 기본값은 5463 이므로 **매 구간 명시 전달** 필요.

---

*작성: 2026-07-29*
