# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-20001-25000-V1

건강기능식품(HFF) 한글 매장용 설명서 개별 생산 — Agent 1 담당 구간 **순번 20,001~25,000**

- 근거 WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-20001-25000-V1`
- 직전 구간: `CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-15001-20000-V1`
- 기준 커밋(작업 시작 시 HEAD): `8dffd3bbb`
- 산출 커밋: `data: produce HFF Korean descriptions agent 1 20001 to 25000`
- 판정: **PASS**

---

## 1. 실행 전 환경 확인

| 항목 | 결과 |
|---|---|
| `ide_selection` / 편집기 선택 내용 자동 첨부 | 없음 (전 턴 확인) |
| 선택 공유로 인한 중단 필요 | 해당 없음 |
| Agent 2 산출물 존재 여부 (`hff-ko-agent-02-*`) | **0건** — Agent 2는 본 구간을 실행하지 않았음이 확인됨 (DB write 0 / manifest 0 / commit 0) |
| Agent 2·3 산출물 생성·수정 | 없음 |

## 2. DB 접속

| 항목 | 값 |
|---|---|
| 인스턴스 연결 이름 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| 접속 경로 | `cloud-sql-proxy` 전용 포트 **5463** (타 세션 공유 프록시 15433과 분리) |
| DB / 사용자 | `o4o_platform` / `o4o_api` |
| 자격증명 취급 | Cloud Run env 에서 인라인 추출 → 동일 명령 내 `$env:PGPW` 로만 전달. **코드·CHECK·manifest·로그에 미기록** |

> 함정: 프로젝트 이름에서 유추한 `o4o-platform-noh:...` 를 쓰면 프록시 프로세스는 살아 있고 stderr 로그도 비어 있는데 클라이언트만 `ECONNRESET` 을 받는다. 비밀번호 문제로 오진하기 쉬우므로 **연결 이름을 먼저 확인**한다 (`gcloud sql instances describe o4o-platform-db --format="value(connectionName)"`).

## 3. 대상 확정 (manifest)

| 항목 | 값 |
|---|---|
| 후보 풀 | `product_candidates` / `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` / `deleted_at IS NULL` |
| 정렬 | `ORDER BY (raw_payload->'source'->>'STTEMNT_NO'), id` (고정) |
| 풀 총계 | **41,261** |
| manifest 길이 | **5,000** |
| 재파생 대조 mismatch | **0** |
| candidateId 중복 | **0** |
| firstIndex / lastIndex | **20,001 / 25,000** |
| head | `20040020028577` 맘엔 철분 엽산 비타민D |
| tail | `200700170352048` 코코칼슘젤리 |
| 직전 구간 tail (20,000) | `20040020028576` — `boundaryContinuous: true` |
| 잔여 (25,000 이후) | **16,261** |

파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000.json`

## 4. Driver parity (공용 driver 무변경 증명)

driver 원본에서 `main().catch(` 로 시작하는 **한 줄만** 제거한 shim 을 만들고, 그 shim 에 제거한 줄을 되돌려 원본과 **byte 대조**(`SHIM_INTEGRITY_FAIL` 가드)하여 driver 가 수정되지 않았음을 증명한 뒤 `composeKo` 를 재사용했다.

| 항목 | 값 |
|---|---|
| 대조 대상 | 직전 구간(15001-20000) LIVE SPD 30건 |
| byte 동일 | **30 / 30** |
| 불일치 | **0** |
| `hff-ko-agent-01-individual.mjs` 변경 | **없음** |

## 5. 표본 20건 사전 검증

쿼터: `HINT_LONG 4 / MULTI_FUNC 4 / FN_LONG 3 / SRV_LONG 3 / TERMS 2 / HINT_EMPTY 2 / LIQUID 2` — **전 유형 정확 충족** (QUOTA_SHORT 0).

| 항목 | 결과 |
|---|---|
| CREATE / HOLD | **20 / 0** |
| 기능성 grounding | 224 검사 / **위반 0** |
| 참고사항 grounding | 95 검사 / **위반 0** |
| 섭취 chip grounding | 20 검사 / **위반 0** |
| SRV_USE 원문 보존 누락 | 0 |
| footer 누락 / `sd-warn` / 미정의 class / 빈 카드 / 말줄임 / HTML 불균형 / 힌트 없는데 참고사항 섹션 | 전부 **0** |
| `dupFunc` | 1 → **정상 판정** (아래 §9 참조) |

## 6. Dry-run

| 상태 | 건수 |
|---|---|
| CREATED | 3,383 |
| SKIPPED_EXISTING | 1,548 |
| HOLD | 69 |
| FAILED_SYSTEM | 0 |
| 합계 | **5,000** |
| DB write | **0** |
| 소요 | 435s (87ms/건) |

HOLD 사유: `NO_INTAKE_DATA: 69` (전량). 즉 SRV_USE 부재 — WO 의 정당한 hold 사유이며, `INTAKE_HINT1` 공백만을 이유로 한 hold 는 0건이다.

## 7. Apply (LIVE)

이중 게이트(`--apply` + `HFF_AGENT1_APPLY_CONFIRM=YES`) 통과. 제품 1건 = 트랜잭션 1개, 트랜잭션 내 canonical `count(*)==1` 사후검사 실패 시 ROLLBACK.

| 항목 | 값 |
|---|---|
| CREATED / SKIPPED_EXISTING / HOLD / FAILED_SYSTEM | **3,383 / 1,548 / 69 / 0** (dry-run 과 동일) |
| DB writes | **10,149** (= 3,383 × 3: product_masters INSERT + candidate 링크 UPDATE + SPD INSERT) |
| 소요 | 425s (85ms/건) |
| rollback manifest | 생성됨 (`-rollback-manifest.json`) |

## 8. 독립 검증 (driver 비사용 · 별도 SQL + 저장 content 재파싱)

### 8-1. 저장 정합

| 검사 | 결과 |
|---|---|
| 생성 SPD 실재 | 3,383 / 3,383 |
| SPD 속성 유효 (`source_type='o4o_hff_generated'`, 본문길이 ≥60) | 3,383 / **무효 0** |
| candidate 링크 (`matched_product_master_id` = master, `candidate_status='approved_new_master'`) | **불량 0** |
| canonical 유일성 위반 | **0** |
| `mfds_permit_number` 중복 master | **0** |
| manifest 밖 SPD write | **0** |
| manifest 밖 product_masters 생성 | **0** |
| SKIP 대상 master 수 | 1,548 |
| SKIP 대상 기존 canonical 변경 | **0** |
| 실행 시간창 내 기타 기존 SPD 변경 | **0** |

### 8-2. Grounding (저장된 본문 ⊆ 공식 원문)

| 축 | 검사 | 위반 |
|---|---|---|
| 기능성 ⊆ `MAIN_FNCTN` | 20,310 | **0** |
| 섭취 chip ⊆ `SRV_USE` | 2,696 | **0** |
| 참고사항 ⊆ `INTAKE_HINT1` | 15,017 | **0** |

`IFTKN_ATNT_MATR_CN` 미사용 / generic fallback 일괄 삽입 0 / 영문 설명서 생성 0.

### 8-3. 디자인·구조

`sd-warn 0` · 미정의 class(sd-note/sd-func/sd-who) `0` · 빈 카드 `0` · footer 누락 `0` · 말줄임 `0` · HTML 태그 불균형 `0` · 힌트 없는데 참고사항 섹션 `0` · 필수 섹션 누락 `0` · **다른 제품 정보 혼입(`crossProductMix`) 0**.

### 8-4. 실브라우저 렌더 (headless Chromium, 저장된 LIVE content)

최장 3건(5,012 / 4,963 / 4,942자)을 430 / 820 / 1280 폭에서 렌더.

| 폭 | 페이지 가로 overflow | 요소 overflow·클리핑 | 5섹션 존재 |
|---|---|---|---|
| 430 | 없음 | 0 | 전부 |
| 820 | 없음 | 0 | 전부 |
| 1280 | 없음 | 0 | 전부 |

## 9. 잔여 소견 — 그룹 내 기능성 중복 6건 (driver 미수정, 보고)

독립 검증에서 **동일 원료 그룹 내 완전 동일 기능성 문장 중복** `withinGroupDupFunc: 6` (3,383건 중 0.18%) 이 확인되었다.

| 신고번호 | 제품명 | 그룹 | 중복 | 원문 출현 |
|---|---|---|---|---|
| `2004002003034` | 홍삼농축액분말15 | 홍삼(원료성) | "항산화에 도움을 줄 수 있음" ×2 | 2회 |
| `2004002003036` | 홍삼농축액분말20 | 홍삼(원료성) | 동일 | 2회 |
| `2004002003513` | 홍삼정골드익스트림13 | 홍삼제품 | 5개 항목 블록 반복 | 2회 |
| `2005001800143` | 홍삼농축액스페셜 | 홍삼제품 | 4개 항목 블록 반복 | 4회 |
| `200500200077` | 홍삼농축액 휴 | 홍삼제품 | "항산화에 도움을 줄 수 있음" ×2 | 2회 |
| `20060020008561` | 조아눈건강 | 루테인지아잔틴복합추출물20% | 2개 문장 각 ×2 | 3회 |

**원인**: 6건 모두 공식 `MAIN_FNCTN` 원문 자체가 같은 문장을 2~4회 반복 기재하고 있다. driver 의 `extractFunctions` 는 항목 dedupe 를 하지 않으므로 원문을 그대로 렌더한 결과다. 즉 **날조·기능성 삭제·의미 변형이 아니라 원문 충실 렌더**이며, grounding 검사도 전건 통과한다.

**조치**: 해소하려면 공용 driver(`hff-ko-agent-01-individual.mjs`)의 `extractFunctions` 에 그룹 내 dedupe 를 추가해야 한다. 본 WO 는 공용 driver 수정을 금지하고 "변경이 필요하다고 판단되면 임의로 수정하지 말고 중지하여 보고한다" 고 규정하므로 **driver 를 수정하지 않고 본 항목으로 보고**한다. 전체 중지 조건(기능성의 체계적 변형·날조·원문 손상)에는 해당하지 않아 구간 생산은 정상 종료했다.

**주의**: 향후 dedupe 를 도입할 경우 **서로 다른 원료 그룹 간의 동일 문장은 병합하면 안 된다.** 예: 알티지 오메가3 플러스 루테인(index 20012)의 "혈액의 호모시스테인 수준을 정상으로 유지하는데 필요" 는 비타민B6 와 엽산이 각각 공식적으로 보유한 기능성이므로, 병합은 엽산의 공식 기능성 삭제가 된다. dedupe 범위는 **동일 그룹 내부로 한정**해야 한다.

## 10. 성능 원칙 준수

`product_masters.mfds_permit_number` 에는 인덱스가 없다 (`pg_indexes` 확인 결과 0행).

| 방식 | 실측 |
|---|---|
| `WHERE mfds_permit_number = ANY($1)` 단일 스캔 (1,752건 조회) | **124ms** |
| 5,000행 행별 상관 서브쿼리 | 30분+ 무응답 (직전 구간에서 실측·중단) |

본 구간은 표본 스크립트·검증 스크립트 모두 **`= ANY($1)` 1회 스캔 + JS `Map`** 으로 permit→master 를 해결했다. 이미 링크가 있는 후보는 재조회하지 않는다.

## 11. Git 안전 절차

- 작업 전 HEAD = `8dffd3bbb` (기준 커밋과 동일).
- 타 세션 WIP 존재 (`docs/work-orders/CHECK-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1.md` 수정 + untracked 3건) — **일절 미접촉**.
- `git add .` / 경로 없는 commit 미사용. **경로 지정 stage + 경로 지정 commit** 만 사용.
- `pnpm-lock.yaml` 미수정 / 공용 parser·registry·composer·Guard·driver·렌더러·CSS 미수정 / 영문 설명서 미생성 / force push 미사용.
- 임시 스크립트(`tmp-hff-a1-*.mjs`) 전량 삭제 후 커밋.

커밋 대상 (Agent 1 자기 파일만):

```
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000.json
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000-results.json
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000-samples.json
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000-holds.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000-failed-system.jsonl
apps/api-server/src/scripts/data/hff-ko-agent-01-20001-25000-rollback-manifest.json
docs/checks/CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-20001-25000-V1.md
```

## 12. 함정 기록 (다음 구간 인계)

1. **프록시 인스턴스 연결 이름** = `netureyoutube:asia-northeast3:o4o-platform-db`. 오타 시 프록시는 살아 있고 로그도 비어 있는데 `ECONNRESET` 만 난다 → 비밀번호 오진 주의.
2. **`mfds_permit_number` 무인덱스** → 행별 상관 서브쿼리 금지, `= ANY()` 일괄 조회 필수.
3. HTML 균형 검사는 `<ul` 로 세야 한다. `<ul>` 로 세면 속성이 붙은 여는 태그를 놓쳐 전건 오탐.
4. chip grounding 은 `sd-chips` 컨테이너 내부로 스코프를 좁혀야 한다. `sd-tag` 는 그룹 헤더에도 쓰인다.
5. 기능성 중복 검사는 **그룹 내부**로 한정해야 한다. 그룹 간 동일 문장은 원료별 공식 기능성이다 (§9).
6. 액상 유형 표본 확보용 정규식에 `젤리` 를 포함해야 본 구간에서 쿼터가 충족된다.

---

*작성: 2026-07-29*
