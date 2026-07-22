# CHECK — select statementNo 직접주입 최적화 + mga-TE 파서 gap 보강 (Agent B)

- 성격: 배치 3 선행 **공용 생산 기반 정비 2건**. generate/dry-run/apply 미실행 · **DB write 0**.
- 기준: 공통 shard 계약(FNV-1a·count 3·A=0/B=1/C=2) · 충돌방지 정비 `eb698ff70`.
- T0 14:22 → 종료 14:36 (약 14분).

## 작업 1 — statementNo 직접주입 최적화

- `hff-combo-shard-plan` 의 per-shard 출력은 이미 `groups[].ids`(signature별 STTEMNT_NO) 포함(정비 `eb698ff70`). 추가 변경 불요.
- `hff-raw-source.ts`: `dbStmtNosSource(port,user,pass,db,stmtNos)` 신설 — 지정 신고번호만 `= ANY` 청크 조회(ILIKE 전수 스캔 회피).
- `hff-combo-select.ts`: `--statement-nos-file <path>`(JSON 배열 또는 개행목록) 추가. 지정 시 ILIKE prefilter 생략하고 직접주입 소스 사용. **strict 검증(exact full-set·기능성 귀속·basis·HOLD/REVIEW·기존 LIVE/taken 제외)은 기존 루프 그대로** 수행(경로만 교체).

### 결과 일치 검증 (동일 universe)
- 테스트 signature `비타민C+비타민D+아연`. ILIKE 산출물의 처리 대상(ELIGIBLE∪HOLD=1,727 stmt)을 직접주입에 동일 주입.
- **ELIGIBLE 목록 일치 = true** (34=34) · **HOLD 사유(statementNo|holdCode) 목록 일치 = true** (1,693=1,693).
- mention/ELIGIBLE/HOLD_MULTI/grounding/정체 전 카운트 동일.

### 시간
| 경로 | 대상 | 시간 |
|------|------|:---:|
| ILIKE (기존) | mention 1,727 스캔 | **9,396ms** |
| 직접주입 (동일 1,727) | = ANY | **5,372ms** (≈43%↓) |
| 직접주입 (shard-plan 26 exact-set) | = ANY 26 | 4,331ms (파싱 26건) |
- 파싱 대상 축소가 주 효과. 잔여 비용 = `STTEMNT_NO` 비인덱스 JSONB `= ANY` 스캔 → **함수 인덱스(별도 DDL WO)** 시 근-상수화 가능(본 작업 범위 밖, DB write 0 준수).

### shard 교집합 재검증
- `--all-shards`: 965 signature · 분포 0:322/594 · 1:264/475 · 2:379/714 · **signature 다중shard 배정(교집합) 0**. 각 signature 결정적 1 shard → statementNo disjoint.

## 작업 2 — `mga-TE` 숫자 인접 단위 파서 gap 보강

- `hff-source-parse.ts normalizeSpecText`: `\bmg\s*[aα]-TE` → `(?<![A-Za-z가-힣])mg\s*[aα]-TE`. `\b`(mg 앞)가 `7mga-TE`처럼 **숫자 인접 시 성립하지 않아** 비타민E spec 누락하던 것을 **문자 접합만 배제**(digit/공백/괄호/시작 앞 허용)로 해소. 수치·의미 불변, 추정 귀속 없음.
- 단위 검증: `7mga-TE`·`3.3mga-TE`·`7mgα-TE` 전부 비타민E value 복구(7/3.3/7 mg), 기존 `mg a-TE`·`mg α-TE` 불변, unknown 0.

### 재검수 (영향 모집단, read-only)
- `digit+mg[aα]-TE` 형식 후보 **657** · NEW 파서 비타민E 포착 **459** · 그중 **clean full-set(unknown 0, N≥2)=복구가능 252** · 여전히 REVIEW(타 은닉/단일) 405.
- **Agent C H1 16건**(비타민E 13·비타민B2 2·나이아신 1): E 13 = mga-TE 복구 모집단에 포함(정확 조합에서 생산가능) · **B2 2·나이아신 1 = 본 fix 대상 아님(다른 은닉 원인) → 여전히 REVIEW_LATER**. → **복구 13 / REVIEW 3**.

## 회귀검증 (read-only, DB write 0)

| 항목 | 결과 |
|------|:---:|
| 기존 복합형 LIVE drift | **0** (파서 전용, DB write 0) |
| 기존 정상 비타민E 그룹 target 감소 | **0** (fix는 E 추가만, 제거 불가 — lut changedVsQueue 0 이 실증) |
| single-lutein 21/8/2 | **유지** (rederive changedVsQueue 0) |
| 리버케어지티 은닉 HOLD | **유지** (unknownLabels=['디에콜(Dieckol) 함량']) |
| ILIKE↔직접주입 결과 | **일치** (ELIGIBLE·HOLD 목록 동일) |
| 비타민E 복구 중 타 원료 오귀속 | **0** (mga-TE 문자열 한정 정규화, 귀속 로직 무변경) |

## 준수

- generate/dry-run/apply 0 · DB write 0 · REVIEW_LATER 임의 승격 0 · 타 에이전트 산출물 미수정 · `git add .` 미사용 · 자기 파일만 path-specific commit.

*선행 정비 · DB write 0 · 회귀 read-only · path-specific commit.*
