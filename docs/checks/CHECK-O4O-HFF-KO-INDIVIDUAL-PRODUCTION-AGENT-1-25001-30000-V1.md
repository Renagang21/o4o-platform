# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-25001-30000-V1

건강기능식품(HFF) 한글 매장용 설명서 개별 생산 — Agent 1 담당 구간 **순번 25,001~30,000**

- 근거 WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-25001-30000-V1`
- 직전 구간: `CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-20001-25000-V1`
- 기준 커밋: `0e8ce16d9` (HEAD 의 조상임을 `git merge-base --is-ancestor` 로 확인)
- 착수 HEAD: `0c2d04a5e` (= `origin/main`)
- 판정: **PASS**

---

## 1. 실행 전 환경 확인

| 항목 | 결과 |
|---|---|
| `ide_selection` / 편집기 선택 내용 자동 첨부 | **없음** — 요청 문맥에 미첨부 확인 후 착수 |
| 선택 공유로 인한 중단 필요 | 해당 없음 |
| Agent 2·3 산출물 생성·수정 | **없음** |
| 공용 driver / parser / registry / composer / Guard / 렌더러 / CSS 수정 | **없음** |

## 2. DB 접속

| 항목 | 값 |
|---|---|
| 인스턴스 연결 이름 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| 접속 경로 | Cloud SQL Auth Proxy v2, 전용 포트 **5471** (타 세션 프록시와 분리) |
| DB / 사용자 | `o4o_platform` / `o4o_api` |
| 자격증명 취급 | 로컬 `.env` 에서 동일 명령 내 `$PGPW` 로만 주입. **코드·CHECK·manifest·로그·커밋에 미기록** |

잘못된 접두사 `o4o-platform-noh` 미사용.

## 3. 대상 확정 (manifest)

| 항목 | 값 |
|---|---|
| 후보 풀 | `product_candidates` / `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` / `deleted_at IS NULL` |
| 정렬 | `ORDER BY (raw_payload->'source'->>'STTEMNT_NO'), id` (직전 구간과 동일 고정) |
| 풀 총계 | **41,261** (직전 구간과 동일 — 풀 변동 없음) |
| manifest 길이 | **5,000** |
| firstIndex / lastIndex | **25,001 / 30,000** |
| 재파생 대조 mismatch | **0** (독립 2회차 쿼리) |
| candidateId 중복 | **0** |
| 구간 내 statementNo 중복 | **0** |
| head | `200700170352049` 루피움 에버 슬림 컷 애플페논 |
| tail | `20130020008158` 어뉴엠 프리미엄 장앤청 프로바이오틱스 |
| 직전 구간 tail (25,000) | `200700170352048` → **정확히 인접**, `boundaryContinuous: true` |
| 잔여 (30,000 이후) | **11,261** |

파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000.json`

manifest 생성 후 대상·순서 변경 없음.

## 4. Driver parity (공용 driver 무변경 증명)

driver 원본에서 `main().catch(` **한 줄만** 제거한 shim 을 만들고, 그 shim 에서 제거한 줄을 되돌려 원본과 **byte 대조**(`SHIM_INTEGRITY_FAIL` 가드)하여 driver 무변경을 증명한 뒤 `composeKo` 를 재사용했다.

| 항목 | 값 |
|---|---|
| shim 무결성 | **PASS** (driver 22,417 bytes) |
| 대조 대상 | 직전 구간(20001-25000) LIVE SPD **30건** (균등 간격 결정적 표본) |
| byte 동일 | **30 / 30** |
| 불일치 | **0** |
| `git diff hff-ko-agent-01-individual.mjs` | **공백 (무변경)** |

## 5. 표본 20건 사전 검증

쿼터: `HINT_LONG 4 / MULTI_FUNC 4 / FN_LONG 3 / SRV_LONG 3 / TERMS 2 / HINT_EMPTY 2 / LIQUID 2` — **전 유형 정확 충족** (`quotaShort` 없음). 표본은 전부 **신규 생성 예정**(canonical 미존재) 제품에서 선정.

| 항목 | 결과 |
|---|---|
| CREATE / HOLD | **20 / 0** |
| 기능성 grounding | 129 검사 / **위반 0** |
| 참고사항 grounding | 100 검사 / **위반 0** |
| 섭취 chip grounding | 19 검사 / **위반 0** |
| 문제 총계 | **0** |
| 판정 | **PASS** |

`sd-warn` / 미정의 class / 빈 카드 / 말줄임 / HTML 불균형 / footer 누락 / generic fallback / 구매 CTA / `이런 분께` / `IFTKN_ATNT_MATR_CN` / SRV_USE 원문 누락 — 전부 **0**.

육안 확인: 다기능성 제품은 원료 그룹별 `sd-core > sd-item + sd-tag` 로 분리 렌더되고, `INTAKE_HINT1` 공란 제품은 **참고사항 섹션 자체를 렌더하지 않아** 빈 카드·일괄 경고 삽입이 0임을 확인했다.

## 6. Dry-run

| 상태 | 건수 |
|---|---|
| CREATED | 3,031 |
| SKIPPED_EXISTING | 1,916 |
| HOLD_FOR_AGENT_9 | 53 |
| FAILED_SYSTEM | 0 |
| 합계 | **5,000** |
| DB write | **0** |
| 소요 | 258s (**52ms/건**) |

SKIPPED_EXISTING 1,916 은 사전 일괄 조회한 "기존 canonical 보유 master 1,916" 과 **정확히 일치**한다.

HOLD 사유: `NO_INTAKE_DATA` 50 (SRV_USE 부재) · `HINT_UNDER_EXTRACTION` 3. 둘 다 WO 가 명시한 정당한 보류 사유이며, **`INTAKE_HINT1` 공란만을 이유로 한 보류는 0건**이다.

## 7. Apply (LIVE)

이중 게이트(`--apply` + `HFF_AGENT1_APPLY_CONFIRM=YES`) 통과. 제품 1건 = 트랜잭션 1개, 트랜잭션 내 canonical `count(*)==1` 사후검사 실패 시 ROLLBACK.

| 항목 | 값 |
|---|---|
| CREATED / SKIPPED / HOLD / FAILED | **3,031 / 1,916 / 53 / 0** — dry-run 과 **완전 동일** |
| DB writes | **9,093** (= 3,031 × 3: master INSERT + candidate 링크 UPDATE + SPD INSERT) |
| expected write vs actual write | **9,093 = 9,093** |
| 소요 | 672s (**134ms/건**) |
| 실행 시간창 | `2026-07-29T12:19:57Z` ~ `12:31:09Z` |
| rollback manifest | masters 3,031 · spd 3,031 · links 3,031 · outcomes 3,031 |

## 8. 독립 검증 (driver 미사용 · 별도 SQL + 저장 content 재파싱)

### 8-1. 저장 정합

| 검사 | 결과 |
|---|---|
| 생성 SPD 실재 | 3,031 / 3,031 (**누락 0**) |
| SPD 속성 유효 (`o4o_hff_generated` · `canonical` · `STORE` · `ko` · 본문 ≥60자) | **무효 0** |
| candidate 링크 (`matched_product_master_id` · `approved_new_master`) | **불량 0** |
| canonical 유일성 위반 | **0** |
| `mfds_permit_number` 중복 master | **0** |
| manifest 밖 SPD 생성 | **0** |
| manifest 밖 product_masters 생성 | **0** |
| 실행 시간창 내 기타 SPD 갱신 | **0** |
| SKIP 대상 기존 canonical drift (apply 전 SHA-256 스냅샷 3,842행 대조) | **0** |
| 기존 SPD 소실 | **0** |

### 8-2. Grounding (저장된 본문 ⊆ 공식 원문)

| 축 | 검사 | 위반 |
|---|---|---|
| 기능성 ⊆ `MAIN_FNCTN` | 18,078 | **0** |
| 참고사항 ⊆ `INTAKE_HINT1` | 16,386 | **0** |
| 섭취 chip ⊆ `SRV_USE` | 2,800 | **0** |

`IFTKN_ATNT_MATR_CN` 미사용 · generic fallback 일괄 삽입 **0** · 공식 기능성 누락 **0** · 방어적 순화 **0** · 원문보다 강한 경고 추가 **0** · 영문 SPD 생성 **0**.

### 8-3. 디자인·구조

`sd-warn` 0 · 미정의 class 0 · 빈 카드 0 · footer 누락 0 · 말줄임 0 · HTML 태그 불균형 0 · 필수 섹션 누락 0 · 힌트 없는데 참고사항 섹션 0 · SRV_USE 원문 누락 0 · 구매 CTA 0 · `이런 분께` 0 · **다른 제품 정보 혼입 0** · 비한국어 본문 0.

참고사항은 전건 `sd-core > sd-item` **저강조** 구조이며 `sd-warn` 강조 카드는 0건이다.

### 8-4. 전역 증감

| 지표 | 증감 | 기대 |
|---|---|---|
| STORE/ko canonical SPD | **+3,031** | +3,031 ✅ |
| `o4o_hff_generated` SPD | **+3,031** | +3,031 ✅ |
| `건강기능식품` product_masters | **+3,031** | +3,031 ✅ |

### 8-5. 실브라우저 렌더 (headless Chromium · 저장된 LIVE content · 실제 `storeDescriptionCss` + `.store-desc-content` 스코프)

최장 3건(6,285 / 6,269 / 6,178자).

| 폭 | 페이지 가로 overflow | 요소 overflow | 클리핑 | 필수 섹션 |
|---|---|---|---|---|
| 430 | 없음 | 0 | 0 | 전부 존재 |
| 820 | 없음 | 0 | 0 | 전부 존재 |
| 1280 | 없음 | 0 | 0 | 전부 존재 |

## 9. 잔여 소견 — 그룹 내 기능성 중복 6건 (driver 미수정, 보고)

`withinGroupDupFunc: 6` (3,031건 중 0.20%). 직전 구간 §9 와 **동일 성격의 이월 사항**이다.

| 신고번호 | 제품명 | 원문 반복 확인 |
|---|---|---|
| `201100200992` | 홍삼플러스40 | 4개 항목 블록을 원문이 **통째로 2회** 기재 |
| `2011002009929` | 케이 시크릿 키즈 | 칼슘 4항목을 원문이 2회 기재 (7문장 중복) |
| `20120019007317` | 덴타탁 파워 | "유해산소로부터 세포를 보호하는데 필요" 등 2문장 ×2 |
| `20120017002135` | 온가족 멀티비타민 플러스 미네랄 | "체내 에너지 생성에 필요" 등 4문장 ×2 |
| `2011002009923` | 토라타민-F | 대괄호 그룹 뒤 원료별 재기재 구간이 원문에 존재 |
| `2011002009937` | 더마타민F | 동일 |

**원인**: 6건 모두 공식 `MAIN_FNCTN` **원문 자체가 같은 문장을 2회 이상 반복 기재**한다 (원문 발췌로 확인). driver 의 `extractFunctions` 는 항목 dedupe 를 하지 않으므로 원문을 그대로 렌더한 결과다. 즉 **날조·기능성 삭제·의미 변형이 아니라 원문 충실 렌더**이며 grounding 18,078건 전건 통과했다.

**조치**: 해소하려면 공용 driver 수정이 필요하다. 본 WO 는 공용 driver 수정을 금지하고 "변경이 필요하다고 판단되면 임의 수정하지 말고 중지하여 보고한다" 고 규정하므로 **driver 를 수정하지 않고 본 항목으로 보고**한다. WO 의 "공식 `MAIN_FNCTN` 원문에 같은 문장이 반복돼 있더라도 이번 WO 에서 공용 dedupe 로직을 추가하지 않는다" 지시와도 일치한다. 전체 중지 조건에 해당하지 않아 구간 생산은 정상 종료했다.

**주의(인계)**: 향후 dedupe 도입 시 **서로 다른 원료 그룹 간 동일 문장은 병합 금지**. 그룹 간 동일 문장은 원료별로 각각 공식 인정된 기능성이므로 병합은 기능성 삭제가 된다. dedupe 범위는 동일 그룹 내부로 한정해야 한다.

## 10. 성능 원칙 준수

`product_masters.mfds_permit_number` 무인덱스. 본 구간은 manifest 생성 · 표본 · 검증 전 단계에서 **행별 상관 서브쿼리를 사용하지 않고** `WHERE mfds_permit_number = ANY($1)` 1회 스캔 + JS `Map` 매칭만 사용했다. 이미 `matched_product_master_id` 링크가 있는 후보(1,916건)는 재조회하지 않았다.

## 11. Git 안전 절차

- 착수 HEAD = `0c2d04a5e` = `origin/main`. 기준 커밋 `0e8ce16d9` 는 조상.
- 타 세션 미추적 파일(`tmpcols.cjs`, `tmpdiff.cjs`) **일절 미접촉**.
- `git add .` / 경로 없는 commit 미사용 — **경로 지정 stage + 경로 지정 commit** 만 사용.
- `pnpm-lock.yaml` 미수정 / 공용 parser·registry·composer·Guard·driver·렌더러·CSS 미수정 / 영문 설명서 미생성 / force push 미사용.
- 임시 스크립트(`tmp-hff-a1-*.mjs`) 및 임시 baseline 스냅샷 전량 삭제 후 커밋.

커밋 대상 (Agent 1 자기 파일만):

```
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000.json
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-results.json
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-samples.json
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-holds.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-failed-system.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-rollback-manifest.json
docs/checks/CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-25001-30000-V1.md
```

## 12. 잔여

| 항목 | 값 |
|---|---|
| 구간 내 남은 미처리 (Agent 9 보류) | **53** |
| Agent 9 보류 파일 | `apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-holds.jsonl` |
| 시스템 실패 파일 | `apps/api-server/src/scripts/data/hff-ko-agent-01-25001-30000-failed-system.jsonl` (0건, 빈 파일) |
| 전체 HFF 잔여 후보 (30,000 이후) | **11,261** |
| 다음 구간 | 30,001~35,000 |

## 13. 함정 기록 (다음 구간 인계)

1. 프록시 인스턴스 연결 이름 = `netureyoutube:asia-northeast3:o4o-platform-db`. 오타 시 프록시는 살아 있는데 클라이언트만 `ECONNRESET` → 비밀번호 오진 주의.
2. `mfds_permit_number` 무인덱스 → 행별 상관 서브쿼리 금지, `= ANY()` 일괄 조회 필수.
3. 실브라우저 렌더 시 CSS 는 **`.store-desc-content` 하위로 스코프**되어 있다. 래퍼 없이 `content` 만 넣으면 CSS 가 전혀 적용되지 않은 채 "PASS" 가 나와 **무의미한 검증**이 된다. `const storeDescriptionCss = \`...\`` 를 통째로 추출하고 `<div class="store-desc-content">` 로 감쌀 것.
4. HTML 균형 검사는 `<ul` 로 세야 한다 (`<ul>` 로 세면 속성 붙은 여는 태그를 놓쳐 전건 오탐).
5. chip grounding 은 `sd-chips` 컨테이너 내부로 스코프를 좁혀야 한다 — `sd-tag` 는 그룹 헤더·참고사항 헤더에도 쓰인다.
6. 기능성 중복 검사는 **그룹 내부**로 한정 (§9).
7. driver 의 `HFF_DUMP_SAMPLES=YES` 는 표본을 **4건만** 덤프하며 `-samples.json` 을 덮어쓴다. 20건 표본 파일을 만든 뒤에는 이 플래그를 켜지 말 것.
8. 참고사항 항목의 `○` 등 원문 글머리 기호는 `MARKER_LEAD` 에서 제거되지 않아 그대로 남는다. 이는 1~25,000 기존 LIVE 전 구간과 동일한 거동이며(parity 30/30 로 확인) 원문 충실 렌더에 해당한다. 교정하려면 공용 driver 수정이 필요하므로 별도 WO 사안이다.

---

*작성: 2026-07-29*
