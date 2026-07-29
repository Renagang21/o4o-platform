# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-15001-20000-V1

> WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-15001-20000-V1`
> 역할: Agent 1 (생산자) · 범위: STORE / ko 설명서만 · 영문 미생성 · 보정된 sd-card 디자인 고정
> 기준 commit: `2fe97b188` (직전 구간 10,001~15,000 LIVE 완료본)
> 상태: **DONE (LIVE)** · 검증: 독립 쿼리 + 독립 grounding + 실브라우저 3폭 렌더 전 항목 PASS

## 1. 목적

검증된 driver(`hff-ko-agent-01-individual.mjs`, 로직 무변경)로 HFF 고정 정렬 목록의 **순번 15,001~20,000**(5,000건)을 STORE/ko canonical 로 생산.

## 2. 보정 기준 parity (착수 전 확인)

driver 가 직전 LIVE 와 동일 출력을 내는지 **byte 동일성**으로 확인.

| 항목 | 결과 |
|------|------|
| 주의사항 소스 | `INTAKE_HINT1` (× `IFTKN_ATNT_MATR_CN`) |
| 참고사항 렌더 | 저강조 `sd-core > sd-item` (× `sd-warn`) — 원문 공란 시 섹션 자체 미렌더 |
| 기능성 그룹 | `sd-core > sd-item` (× 무스타일 `sd-func`) |
| **LIVE 대조**: 직전 구간(10001~15000) 생성 SPD 30건을 driver 로 재렌더 | **30/30 byte 동일 (fail 0)** |

parity 는 driver 원본에서 `main().catch(` **1줄만 제거한 shim** 으로 `composeKo` 를 import 해 수행하며, shim 재구성본을 원본과 byte 대조(`SHIM_INTEGRITY_FAIL` 가드)해 driver 무변경을 증명한다.

## 3. manifest 확정

```sql
WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id
OFFSET 15000 LIMIT 5000
```

| 항목 | 값 |
|------|---|
| HFF 후보 풀 총계 | 41,261 (본 WO 이후 잔여 21,261) |
| manifest 길이 | 5,000 (index 15001~20000) |
| DB 재파생 대조 | 5,000 == 5,000 · 순서 **mismatch 0** · candidateId 중복 0 |
| head | index 15001 · `200400200072586` · 뉴트리메이드 키즈 아연비타민D |
| tail | index 20000 · `20040020028576` · 관절엔 MSM1500 / 글루코사민 비타민D |
| 직전 구간 연속성 | 직전 tail(15000, `200400200072585`) → 본 head(15001, `200400200072586`) 연속 |

## 4. 표본 20건 사전 검증 (apply 전)

신규 생성 대상(STORE/ko canonical 부재)만 대상으로 WO 유형 쿼터 **정확 충족**: HINT_LONG 4 · MULTI_FUNC 4 · FN_LONG 3 · SRV_LONG 3 · TERMS 2 · HINT_EMPTY 2 · LIQUID 2 = 20.

| 검사 | 기대 | 실측 |
|------|:---:|:---:|
| 렌더 결과 | — | CREATE 19 · HOLD 1 (`HINT_UNDER_EXTRACTION` — 프로메테우스, 파서 커버리지 가드) |
| 기능성 문장 grounding (⊆ MAIN_FNCTN) | 0 | 300 검사 / **0** |
| 참고사항 grounding (⊆ INTAKE_HINT1) | 0 | 144 검사 / **0** |
| 섭취칩 grounding (⊆ SRV_USE) | 0 | 19 검사 / **0** |
| 공식 SRV_USE verbatim 노출 누락 | 0 | **0** |
| footer(매장 내 전문가 문의) 누락 | 0 | **0** |
| `sd-warn` 강한 경고 카드 | 0 | **0** |
| 무스타일 클래스(`sd-note`/`sd-func`/`sd-who`) | 0 | **0** |
| 빈 카드·빈 제목 | 0 | **0** |
| 문자열 잘림(…) | 0 | **0** |
| HTML 태그 균형 오류 | 0 | **0** |
| 원문 공란인데 참고사항 섹션 렌더 | 0 | **0** |

산출물: `apps/api-server/src/scripts/data/hff-ko-agent-01-15001-20000-samples.json`

## 5. 결과 (apply, LIVE)

| 상태 | 수 |
|------|---:|
| CREATED | **3,242** |
| SKIPPED_EXISTING | 1,752 |
| HOLD_FOR_AGENT_9 | 6 |
| FAILED_SYSTEM | **0** |

- 합계 **5,000** (미처리 0)
- dry-run 상태 합계와 apply 상태 합계 **완전 일치** (expected write == actual write)
- DB write **9,726** = product_masters 3,242 + candidate 링크 3,242 + SPD canonical 3,242
- 실제 신규 LIVE(STORE/ko canonical) **3,242**
- 처리시간: dry-run 291s(**58ms/건**) · apply 430s(**86ms/건**)
- 실행 시간창: `2026-07-29T06:52:54Z` → `2026-07-29T07:00:04Z`

## 6. 독립검증 (driver 외 별도 쿼리 + 저장 content 독립 파싱) — 전 항목 PASS

| 항목 | 기대 | 실측 |
|------|:---:|:---:|
| 생성 SPD 실재 | 3,242 | 3,242 |
| SPD 전부 유효(canonical·STORE·ko·`o4o_hff_generated`·본문≥60·미삭제) | 3,242 | 3,242 |
| 속성 불량 | 0 | 0 |
| canonicalDup (master당 STORE/ko ≠ 1) | 0 | 0 |
| statementNo(permit) 중복 master | 0 | 0 |
| candidate 링크 불량 | 0 | 0 |
| manifest 밖 SPD write | 0 | 0 |
| manifest 밖 master write | 0 | 0 |
| 기존 SPD 접촉(drift) | 0 | 0 |
| SKIP master canonical 접촉 | 0 | 0 |
| **기능성 grounding** (저장 content 항목·그룹헤더 ⊆ MAIN_FNCTN) | fail 0 | 34,958 검사 / **fail 0** |
| **섭취칩 grounding** (sd-chips 내부 ⊆ SRV_USE) | fail 0 | 3,239 검사 / **fail 0** |
| **참고사항 grounding** (항목·헤더 ⊆ INTAKE_HINT1) | fail 0 | 19,410 검사 / **fail 0** |
| 디자인: sd-warn / 무스타일 / 빈 카드 / footer 누락 / 잘림 / HTML 불균형 / 빈 참고사항 섹션 / 섹션 누락 | 각 0 | 전부 **0** |

## 7. 실브라우저 렌더 (Chromium headless, 저장된 LIVE content 3건 — 최장 6,525자)

| 폭 | 가로 오버플로 | 클리핑·scrollWidth 초과 | 섹션 5종 |
|:---:|:---:|:---:|:---:|
| 430 | 없음 | 0 | 전부 표시 |
| 820 | 없음 | 0 | 전부 표시 |
| 1280 | 없음 | 0 | 전부 표시 |

원료별 기능성 그룹(sd-tag 헤더 + 목록), 공식 섭취방법 verbatim, 저강조 참고사항, 전문가 문의 footer 정상 표시. 질환명·전문용어(예: "요로의 유해균 흡착 억제로 요로건강에 도움을 줄 수 있음(생리활성기능 2등급)", "정상적인 면역기능에 필요") 원문 그대로 보존 — 방어적 순화 0.

## 8. Agent 9 보류 (6건, 전부 정당)

| index | 제품 | 사유 |
|---:|------|------|
| 15017 | 프로메테우스 | `HINT_UNDER_EXTRACTION` (INTAKE_HINT1 파서 커버리지 < 0.9 → 원문 손실 방지) |
| 17088 | 홍삼농축액(천삼) | `NO_INTAKE_DATA` (공식 SRV_USE 공란) |
| 17089 | 홍삼분(천삼) | `NO_INTAKE_DATA` |
| 17152 | 진세노사이드플러스농축액분말 | `NO_INTAKE_DATA` |
| 18321 | 테아닌 | `NO_INTAKE_DATA` |
| 19723 | 브레인365 | `NO_INTAKE_DATA` |

- 실 제품 보류율 5,000 중 6 = **0.12%** (직전 구간 0.42% 대비 감소)
- registry 미등록 / 다원료 / 액상 / 영문 미매핑 사유 보류 **0** (계약 준수)
- `INTAKE_HINT1` 공란 단독 사유 보류 **0**
- 파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-15001-20000-holds.jsonl`

## 9. 시스템 실패

0건. `hff-ko-agent-01-15001-20000-failed-system.jsonl` 빈 파일(0 byte).

## 10. 산출물

| 파일 | 내용 |
|------|------|
| `.../data/hff-ko-agent-01-15001-20000.json` | 고정 manifest 5,000 |
| `.../data/hff-ko-agent-01-15001-20000-results.json` | 제품별 상태·소요시간 (apply) |
| `.../data/hff-ko-agent-01-15001-20000-samples.json` | 표본 20건 렌더 + 계약 검사 |
| `.../data/hff-ko-agent-01-15001-20000-holds.jsonl` | Agent 9 보류 6 |
| `.../data/hff-ko-agent-01-15001-20000-failed-system.jsonl` | 시스템 실패 0 (빈 파일) |
| `.../data/hff-ko-agent-01-15001-20000-rollback-manifest.json` | 생성 master 3,242 / SPD 3,242 / candidate 링크 3,242 |

rollback: rollback-manifest 의 SPD·master id 로 역순 삭제 + candidate 링크 원복 가능.

## 11. 누적 / 잔여

- 순번 1~20,000 처리 완료 (누적 CREATED: 75 + 266 + 2,521 + 2,807 + 3,105 + 3,242).
- HFF 후보 풀 41,261 → **잔여 21,261**. 다음 구간은 `HFF_BATCH`/`HFF_EXPECT` 교체로 동일 절차 진행.

## 12. 함정 / 메모

- 공용 parser / registry / composer / Guard / 렌더러 / CSS **무수정**. driver 로직도 무변경(env 파라미터만). 영문 미생성.
- parity·표본·독립검증·렌더용 스크립트는 repo 트리 임시 파일로 실행 후 **삭제**(ESM `import pg`·`playwright` 해석 목적).
- **cloud-sql-proxy instance connection name = `netureyoutube:asia-northeast3:o4o-platform-db`** (프로젝트 접두사가 `o4o-platform-noh` 가 아님 — 틀리면 연결 즉시 `ECONNRESET`). 전용 포트 5463.
- **`product_masters.mfds_permit_number` 에 인덱스가 없다.** 검증 쿼리에서 행별 상관 서브쿼리(`(SELECT id FROM product_masters WHERE mfds_permit_number = ...)`)를 쓰면 5,000회 seq scan 으로 30분+ 소요 → **`= ANY($permits)` 단일 스캔 후 JS Map 매칭**으로 작성할 것(124ms).
- HTML 균형 검사 시 `<ul class="sd-why">` 처럼 속성이 붙으므로 여는 태그를 `<ul>` 로 세면 전건 오탐 — `<ul` 로 셀 것.
- 섭취칩 grounding 은 `sd-chips` 컨테이너 내부 `sd-tag` 만 대상. 기능성 그룹 헤더·참고사항 헤더도 `sd-tag` 를 쓰므로 전역 `sd-tag` 검사는 오탐.
- Git: 타 세션 WIP(store-ai 컨트롤러 등)이 워킹트리에 존재 → path-specific `git add`/`git commit -- <paths>` 로만 커밋.
