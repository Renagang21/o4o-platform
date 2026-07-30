# CHECK-O4O-HFF-KO-FULL-CORPUS-INTEGRATED-QUALITY-AUDIT-AND-AGENT-9-QUEUE-BUILD-V1

> WO: `WO-O4O-HFF-KO-FULL-CORPUS-INTEGRATED-QUALITY-AUDIT-AND-AGENT-9-QUEUE-BUILD-V1`
> 판정: **PASS (전체 감사 게이트 통과) + 후속 결함 1건 보고 (기능성 절 누락 118 제품)**
> 성격: **READ-ONLY 감사** — DB write 0, canonical 생성/수정 0, 공용 driver·parser·renderer·CSS 수정 0
> 기준 커밋: `05dbf5fa8` (조상 확인) · 작업 시작 HEAD `c97a19141`
> 일자: 2026-07-30

---

## 1. 범위

HFF 후보 전량 **41,261** 건(9 구간 공식 생산 범위 1~41,261)에 대한 통합 품질 감사 + `HOLD_FOR_AGENT_9` **348** 건의 단일 큐 통합.

후보 풀 정의: `product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`,
정렬 `ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id`.

canonical 정의: `shared_product_descriptions` `description_type='STORE'` · `status='canonical'` · `coalesce(language,'ko')='ko'` · `deleted_at IS NULL`.

---

## 2. 사전 조건

| 항목 | 결과 |
|------|------|
| 편집기 선택 공유(`ide_selection`) 첨부 | 없음 → 실행 조건 충족 |
| 작업 트리 | 시작 시 clean (타 세션 WIP 미수정) |
| 브랜치 | `main` |
| 기준 커밋 `05dbf5fa8` | HEAD 의 조상임을 확인 |
| DB 접속 | cloud-sql-proxy `netureyoutube:asia-northeast3:o4o-platform-db` · 127.0.0.1:5463 · user `o4o_api` |
| 자격증명 취급 | Cloud Run env 에서 동일 명령 내 인라인 추출 — 디스크·코드·문서·로그 어디에도 미기록 |
| 세션 read-only 강제 | 모든 감사 세션에서 `SET default_transaction_read_only = on` |

---

## 3. 매니페스트 정합 (게이트 A)

| 항목 | 값 | 판정 |
|------|---:|:---:|
| 9 구간 결과 파일 합집합 | 41,261 | PASS |
| distinct index | 41,261 | PASS |
| index 겹침 / 공백 | 0 / 0 | PASS |
| index 최소·최대 | 1 · 41,261 | PASS |
| distinct candidateId | 41,261 | PASS |
| candidateId 중복 | 0 | PASS |
| 구간 경계 파손 | 0 | PASS |
| JSONL 파싱 오류 | 0 | PASS |

## 4. 상태 합계 (게이트 B)

| 상태 | 건수 |
|------|---:|
| CREATED | 25,074 |
| SKIPPED_EXISTING | 15,839 |
| HOLD_FOR_AGENT_9 | 348 |
| FAILED_SYSTEM | 0 |
| **합계** | **41,261** |

중복 상태 배정 0 · 미정의 상태 0 · 매니페스트 누락 0 · 상태 없는 매니페스트 항목 0.

## 5. DB 재파생 대조 (게이트 C)

| 항목 | 값 | 판정 |
|------|---:|:---:|
| 후보 풀 총계 | 41,261 | PASS |
| 재파생 순서 대조 mismatch | 0 | PASS |
| 마지막 항목 일치 | `788c281d-…f2344e6` / `202600280981` | PASS |
| canonical 보유 | 40,913 | PASS |
| canonical 미보유 | 348 | PASS |
| canonical 중복(동일 master·type·언어) | 0 | PASS |
| 매니페스트 외 HFF SPD | 0 | PASS |
| `source_type='o4o_hff_generated'` 총계 | 56,473 (ko/en 등 전체 언어) | 참고 |
| 생산 윈도우 | 2026-07-27T06:23:50Z ~ 2026-07-29T13:59:38Z | 참고 |

> **canonical 존재 판정은 2 경로 병행 필수** — 본 드라이버 생산분 25,074 는 `source_ref_id` 로,
> 선행 파이프라인 생산분 15,839 는 `master_id` 로만 연결된다. 단일 경로 판정은 수천 건을 허위 누락으로 보고한다.

## 6. 집합 정합 · ProductMaster (게이트 D)

| 항목 | 값 | 판정 |
|------|---:|:---:|
| HOLD 집합 == canonical 미보유 집합 | identical **true** | PASS |
| HOLD 인데 canonical 존재 (stale HOLD) | 0 | PASS |
| canonical 미보유인데 HOLD 아님 | 0 | PASS |
| 후보 DB 부재 | 0 | PASS |
| ProductMaster 링크 부재 | 348 (= HOLD 전량, 애초에 생성되지 않음) | 정상 |
| `mfds_permit_number` 불일치 | 0 | PASS |
| 동일 permit 다중 master | 0 | PASS |

성능 계약 준수: `mfds_permit_number` 행별 상관 서브쿼리 미사용 — `= ANY($1)` 단일 조회 + JS `Map` 대조.

---

## 7. 표본 품질 감사 (9 구간 × 10 유형 = 90 표본)

1차 자동 판정: PASS 68 / FAIL 22 (모두 `fnNoOmission`, 그 중 1건은 `noDefensiveSoftening` 동반).

재판정(절 분절기 개선 — `1)` `1.` `가.` `①` `[원료]` `-` 불릿 · `:` · 문장종결 `필요/있음/줌` 을 모두 절 경계로 인식):

| 항목 | 값 |
|------|---:|
| 재판정 대상 | 22 |
| 검사기 인공물로 해소 | **21** |
| 실 결함 확정 | **1** (`20040015191225` 프리미엄 멀티비타민 이뮨 부스터샷) |

즉 **90 표본 중 실 결함 1건**. 0 으로 확인된 항목: `fnGrounded` 위반 0 · `srvPreservedVerbatim` 위반 0 · `hintGrounded` 위반 0 · 섭취 수치 변형 0 · **제품 간 정보 혼입 0** · 강한 경고 문구 추가 0 · generic fallback 0 · 빈 카드 0 · footer 누락 0 · 제품명 불일치 0 · ProductMaster 불일치 0 · 섹션 누락 0.

표본 대체: 일부 구간에 특정 유형(예: `SRV_LONG`, `MARKER_CIRCLE`)이 존재하지 않아 해당 구간 최장 `MAIN_FNCTN` 대표값으로 대체하고 `substitutions` 에 사유를 기록했다 (§17 비중지 사유 "표본 기준 해당 제품 부족").

## 8. 기능성 절 누락 전수 정량 (신규 확정 결함 · 후속 WO 필요)

표본 1건이 실 결함으로 확정되었으므로 **CREATED 25,074 전수**로 확대 측정했다.

| 항목 | 값 |
|------|---:|
| 검사 | 25,074 |
| 전량 반영 | 24,956 (99.53%) |
| **절 누락 제품** | **118 (0.47%)** |
| 누락 절 합계 (상한) | 255 |
| 영문 병기 절(ko canonical 대상 아님, 별도 집계) | 50 |

원문 패턴별:

| MAIN_FNCTN 패턴 | 제품 수 | 누락 발생 |
|------|---:|---:|
| `MIXED_LABELED_AND_UNLABELED` (무라벨 블록 + `[원료]` 라벨 병존) | 163 | **98 (60.1%)** |
| `LABELED_ONLY` | 9,190 | 2 |
| `UNLABELED_ONLY` | 15,721 | 18 |

**원인**: `MAIN_FNCTN` 이 「원료명 없는 번호 블록 목록」 + 「`[원료]` 라벨 목록」 두 부분으로 병존할 때
파서가 라벨 구간만 채택하고 무라벨 선행 구간을 버린다. 무라벨 구간에만 존재하는 원료(예 아연·구리)의
공식 기능성이 그대로 탈락한다.

확정 사례 `20040015191225`:
- 원문 무라벨 구간에 「정상적인 면역기능에 필요 / 정상적인 세포분열에 필요」(아연), 「철의 운반과 이용에 필요」(구리) 존재
- 렌더 결과에 3개 절 모두 부재 → 공식 기능성 축소. `면역` 전문 용어 탈락으로 `noDefensiveSoftening` 도 동반 실패

**본 WO 에서 수정하지 않음** — canonical 수정·공용 parser 수정이 모두 금지 범위다.
대상 118 건 전량 목록(statementNo · candidateId · 누락 절 원문)을
`hff-ko-full-corpus-functionality-omission-audit-v1.json` 의 `omissionProducts` 에 남겼다. 후속 WO 에서
파서 보완 → 재생산 → byte 대조 순으로 처리해야 한다.

## 9. 반복 문장 감사 (전수 40,913)

| 항목 | 제품 | 건 |
|------|---:|---:|
| A. `sd-item` 원료 그룹 내부 반복 | 36 | 87 |
| B. `sd-why` 평면 목록 반복 | 1,402 | 3,085 |
| C. **설명되지 않는 반복 (렌더 > 원문)** | **0** | **0** |

A·B 는 전부 「원문 등장 횟수 >= 렌더 횟수」로 공식 원문 자체의 반복이며 §11 기준 **PASS**(비중지 사유).
`sd-why` 평면 목록에는 dedupe 를 적용하지 않는다 — 원료 경계가 없는 상태에서 동일 문장을 제거하면
특정 영양소의 공식 기능성이 삭제된다. 본 WO 에서 반복 문장을 수정하지 않았다.

드라이버 스킴 인식 제품 25,415 / 전체 스캔 40,913.

## 10. 글머리 기호 잔존 (전수 40,913)

| 마커 | 제품 | 항목 |
|:---:|---:|---:|
| `○` | 12 | 24 |
| `●` | 3 | 7 |
| `◦` | 0 | 0 |
| `※` | 112 | 318 |
| **합계(제품 중복 제거)** | **127** | **349** |

전체의 0.31%. §17 비중지 사유. 본 WO 에서 공용 `MARKER_LEAD` 및 기존 canonical 을 수정하지 않았다.

## 11. 렌더·디자인 감사 (실 CSS + `.store-desc-content` 래퍼)

CSS 는 실 렌더러 `packages/content-editor/src/components/ContentRenderer.tsx` 의
`storeDescriptionCss` 템플릿 리터럴을 소스에서 그대로 추출(10,193 bytes)하여 사용했다 (파일 미수정).
표본 **27건** (구간별 최장 3건 + 마커 보유분), 저장된 LIVE 본문을 `<div class="store-desc-content">` 로 감싸 렌더.

래퍼 유무 computed-style 대조:

| 속성 | 래퍼 없음 | 래퍼 있음 (1280px) |
|------|---|---|
| `.sd-card max-width` | `none` | **860px** |
| `.sd-card border-radius` | `0px` | **20px** |
| `.sd-hero padding` | `0px` | **40px 34px 32px** (430px: `28px 22px 24px`) |
| `.sd-badge border-radius` | `0px` | **999px** |

폭별 결과 (430 / 820 / 1280 전부 동일):

| 항목 | 결과 |
|------|---:|
| 페이지 가로 overflow | false |
| overflow 위반 요소 | 0 |
| 클리핑 | 0 |
| 문자열 잘림(ellipsis) | 0 |
| 빈 제목 / 빈 카드 | 0 / 0 |
| 미정의 class(`sd-note`·`sd-func`·`sd-who`) | 0 |
| `sd-warn` | 0 |
| 섹션 누락 | 0 |
| footer 누락 | 0 |

## 12. DB write 금지 증명 (§16)

| 지표 | BEFORE | AFTER | 동일 |
|------|---:|---:|:---:|
| STORE/ko canonical 총계 | 63,321 | 63,321 | ✔ |
| HFF 후보 `approved_new_master` | 40,913 | 40,913 | ✔ |
| HFF 후보 master 연결 | 40,913 | 40,913 | ✔ |
| `regulatory_type='건강기능식품'` master | 40,943 | 40,943 | ✔ |
| `o4o_hff_generated` 최종 updated_at | 2026-07-29T04:59:37.830Z | 동일 | ✔ |

`identical: true`, `diff: []`. INSERT/UPDATE/DELETE/UPSERT 미실행, canonical 생성 0, HOLD 제품 수정 0,
후보 수정 0, ProductMaster 수정 0, 감사 대상 외 write 0.

---

## 13. Agent 9 단일 큐

| 항목 | 값 | 판정 |
|------|---:|:---:|
| HOLD 원본 파일 행 | 348 | PASS |
| 큐 총계 | **348** | PASS |
| 전량 `PENDING` | true | PASS |
| candidateId 중복 | 0 | PASS |
| statementNo 중복 | 0 | PASS |
| stale HOLD | 0 (빈 파일 명시 생성) | PASS |
| 이상 항목(anomalies) | 0 | PASS |

우선순위 · 사유 (원본 사유와 표준화 사유 양쪽 보존):

| 우선순위 | 사유 | 건수 |
|:---:|------|---:|
| 1 | `HINT_UNDER_EXTRACTION` | 5 |
| 2 | `NO_FUNCTIONAL_DATA` | 29 |
| 3 | `NO_INTAKE_DATA` | 314 |

정렬 계약: `priority ASC → statementNo ASC → candidateId ASC`, `queueIndex` 1~348 재부여.
상태 어휘: `PENDING` / `RESOLVED` / `SKIPPED_CANONICAL_EXISTS` / `BLOCKED_SOURCE_DATA` / `FAILED_SYSTEM`.

구간 분포: 1~5,000 = 23 · 5,001~10,000 = 43 · 10,001~15,000 = 21 · 15,001~20,000 = 6 ·
20,001~25,000 = 69 · 25,001~30,000 = 53 · 30,001~35,000 = 67 · 35,001~40,000 = 64 · 40,001~41,261 = 2.

각 큐 항목은 `officialSource` 에 `MAIN_FNCTN` / `SRV_USE` / `BASE_STANDARD` / `INTAKE_HINT1` 원문 스냅샷과
`sourceHoldFile` · `sourceHoldIndex` · `sourceRange` 출처를 보존한다. `IFTKN_ATNT_MATR_CN` 은 41,261 전량 공백이므로 사용하지 않았다.

---

## 14. §17 중지 조건 점검

| 중지 조건 | 결과 |
|------|:---:|
| 총계 ≠ 41,261 | 해당 없음 (41,261) |
| 매니페스트 합집합 ≠ 41,261 | 해당 없음 |
| 구간 공백·겹침 | 0 |
| candidateId 중복 | 0 |
| DB 재파생 대량 mismatch | 0 |
| 상태 합계 불일치 | 없음 |
| canonical 미보유 집합 ≠ HOLD 집합 | identical |
| 설명되지 않는 제품 간 정보 혼입 | 0 |
| canonical 중복 | 0 |
| 예상하지 못한 DB write | 0 |
| HOLD 파일 계약 통합 불가 | 없음 |
| 공유 파일 소유권 충돌 | 없음 |

**중지 조건 0건 → WO 승인 범위에 따라 큐 확정·CHECK 작성·path-specific commit·push 를 수행했다.**

비중지 사유로 보고만 한 항목: 공식 원문 기능성 반복(§9) · `sd-why` 평면 반복(§9) · `○ ● ◦ ※` 잔존(§10) ·
개별 HOLD 의 공식 데이터 부족(348 전량이 이 사유) · 표본 유형 부족에 따른 대체(§7).

§8 의 기능성 절 누락 118 건은 §17 중지 조건 목록에 해당하지 않으며(렌더 > 원문 혼입이 아니라 원문 > 렌더 축소),
본 WO 의 금지 범위(canonical·parser 수정) 안에서는 시정할 수 없으므로 **후속 WO 대상으로 명시 보고**한다.

---

## 15. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/data/hff-ko-agent-09-hold-queue-v1.jsonl` | Agent 9 단일 큐 348 행 (전량 PENDING) |
| `apps/api-server/src/scripts/data/hff-ko-agent-09-hold-queue-summary-v1.json` | 큐 요약 · 게이트 · write-watch |
| `apps/api-server/src/scripts/data/hff-ko-agent-09-stale-holds-v1.jsonl` | stale HOLD (0건 · 빈 파일 명시 생성) |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-audit-v1.json` | 매니페스트·상태·DB 재파생·집합 정합·ProductMaster·write baseline |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-quality-samples-v1.json` | 90 표본 1차 판정 |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-quality-samples-recheck-v1.json` | 실패 22건 재판정 (21 인공물 / 1 실결함) |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-functionality-omission-audit-v1.json` | 전수 기능성 절 누락 118 제품 전량 목록 |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-repetition-audit-v1.json` | 반복 문장 A/B/C 분류 |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-marker-audit-v1.json` | 글머리 기호 잔존 |
| `apps/api-server/src/scripts/data/hff-ko-full-corpus-render-audit-v1.json` | 실 CSS 렌더 27표본 × 3폭 |
| `docs/checks/CHECK-…-V1.md` | 본 문서 |

임시 감사 스크립트(`tmp-hff-audit-*.mjs`, `tmp-hff-agent09-queue.mjs`, `tmp-hff-hold-merged.json`)는 실행 후 삭제했다.

## 16. 후속 권고

1. **P1 — 기능성 절 누락 118 제품 재생산** (§8). `MIXED_LABELED_AND_UNLABELED` 패턴 파서 보완 → 재생산 → 기존 canonical 과 byte 대조 → 차이 있는 건만 교체.
2. **P2 — Agent 9 348 건 개별 보완** (`hff-ko-agent-09-hold-queue-v1.jsonl`). 우선순위 1→3 순, 공식 대체 출처 없으면 `BLOCKED_SOURCE_DATA` 로 기록하고 임의 생성하지 않는다.
3. **P3 — 글머리 기호 127 제품 정비** (§10). 공용 `MARKER_LEAD` 수정은 전 서비스 영향이므로 별도 WO.
4. **P3 — `sd-why` 평면 목록 원료 경계 부여** (§9 B). dedupe 는 그룹 내부 한정이어야 하며, 경계 없는 상태에서의 문장 제거는 공식 기능성 삭제이므로 금지.
