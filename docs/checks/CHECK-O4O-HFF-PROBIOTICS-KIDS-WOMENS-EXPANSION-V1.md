# CHECK · HFF 유산균 아동/여성 확대 생산 (WO-O4O-HFF-PROBIOTICS-KIDS-WOMENS-EXPANSION-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·Agent B·의약품 미접촉.
- 일자: 2026-07-18
- status: **PAUSED_EXTERNAL_DEPENDENCY_DB_WRITE_PERMISSION** (DB 프리로드/dry-run/apply 미실행 — 적재 대기 큐)
- 근거: 20-파일럿 오케스트레이터 재검 PASS → 확대 승인. 파일럿 검증 패턴(`kwp-write.mjs`) 그대로 재사용, 신규 실패유형 0.

---

## 1. 표준 KIDS/WOMENS 확대 (KW-CP02~04)

| CP | 작성 | HOLD | BLOCKED | REVIEW |
|---|---|---|---|---|
| KW-CP02 | 20 | 0 | 0 | 0 |
| KW-CP03 | 19 | 1 (AntiAller) | 0 | 0 |
| KW-CP04 | 7 | 1 (immStar) | 0 | 0 |
| **계** | **46** (KIDS 42 + WOMENS 4) | **2** | **0** | **0** |

- 물/음용수 근거위반 0 · 파편 0 · style/script 0 · sd-card 결손 0 · ko/en 각 46 · 신고번호 유일 46 · 기존 코퍼스 교집합 0.
- 반응형 5뷰포트 PASS (46+INFANT 2 = 48 × ko/en × 360·390·768·1024·1440).

### HOLD 2건 — `HOLD_NAME_UNGROUNDED_CLAIM` (규제 민감, 보수적 격리)

공식 제품명에 **인정 기능성(장 건강 유산균) 범위 밖 질병-domain 함의**가 포함된 아동 제품. 가드 영문 토큰 미검출이나, 아동+질병/면역 소구는 규제 민감이라 제품명 임의 변경 대신 격리(§5 질병 예방·면역강화 근거없이 단정 금지 준수).

- `200700170352210` Kids Garden® AntiAller Pro — 'AntiAller'(항알러지) = 아동 알레르기 예방 함의.
- `200700170353212` Kids Garden® immStar® Beta Kids — 'immStar'(면역) = 아동 면역강화 함의.

> 전체 확대 모집단 50건 중 이름-내 claim 토큰은 이 2건뿐(나머지 48은 브랜드/대상성 명칭). 명칭 정정 또는 기능성 재확인 후 해소.

## 2. 검증 패턴 (파일럿과 동일)

보호자 톤(구매주체=보호자, 아이에게 직접 말 안 함, 불안 조장 없음) · 연령·특이기능성·임신/수유 주의 **원문 없으면 창작 0** · 인정 기능성 3종 verbatim · 질병 치료·예방 단정 0 · 성장/발달/면역/여성특이 주장 0 · 급여방법(우유/분유/이유식)은 원문 검출시에만 · 코팅 성상 중립인용 · 물/음용수 양방향 · 파서 최신(정수-우선 1억2천만 gloss). Guard BLOCKED 0/REVIEW 0 이 뒷받침.

## 3. INFANT 소그룹 (KW-INF-CP01) — **별도 재검 대상**

원문에 **분유·젖병·이유식 급여 명시**된 영유아 제품만 분리. blacklist 포맷 제외.

| 항목 | 값 |
|---|---|
| 작성 | **2** (베이비&키즈 생유산균 / 락토리움 키즈앤베이비 생유산균, 둘 다 뉴팜) |
| HOLD | 0 · BLOCKED 0 · REVIEW 0 · 반응형 PASS |
| 급여방법 bullet | 원문 근거만 — "물 외에 우유·이유식 등에 타서 먹일 수 있습니다 — 공식 표기" |

> **규제 민감**: 영유아 대상이라 오케스트레이터 별도 재검 후 적재. 연령 창작 0, 급여방법 원문 근거만, 보호자 톤.

## 4. 적재 대기 큐 (실행 안 함)

- 표준 확대 46: `hff-b3-store-canonical-apply.ts`(loadTargets → kw-cp02/03/04, TARGET=46, 기대 write **184**).
- INFANT 2: 동 계약(loadTargets → kw-inf-cp01, TARGET=2, 기대 write **8**). **별도 재검 후 적재**.
- 매니페스트: `.../batch-probiotics-kids-womens-pilot/EXPANSION-KIDS-WOMENS-MANIFEST.json` · `INFANT-SUBGROUP-MANIFEST.json`.
- 재개: 권한 세션에서 Batch003(226)+D-CP01(1)+KW 파일럿(19)+확대(46)+INFANT(2, 별도 재검) 순차.

## 5. 산출 파일

- 입력: `hff-probiotics-kw-cp0{2,3,4}.json`(+`-hold`), `hff-probiotics-kw-inf-cp01.json`
- 초안: `.../batch-probiotics-kids-womens-pilot/KW-CP0{2,3,4}/drafts/*` · `KW-INF-CP01/drafts/*`
- 매니페스트 2 · 본 CHECK.

## 6. 모집단 소진 현황

파일 풀 아동/여성 clean 유산균: 파일럿 19 + 확대 46 + INFANT 2 = **67 작성** / HOLD 4(SOURCE_ABNORMAL 1 + NAME_CLAIM 3 누계 포함 파일럿·확대). 잔여 clean 아동/여성 ≈ 0(전량 처리). 추가 대량은 DB read-only candidate 모집단 필요(권한 대기).
