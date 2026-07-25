# CHECK — WO-O4O-OTC-REMAINING-READY-SHARD-GA-V1 (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-25
**대상 SSOT:** `apps/api-server/src/scripts/data/otc-remaining-shard-assignment-ssot-v1.json` (라 세션, commit `bae254d0e`)
**판정:** **BLOCKED_DB_CHANNEL** — 사전 정합 게이트 전부 PASS, 그러나 **프로덕션 DB 조회 채널 부재로 저작·dry-run·apply 착수 불가**
**DB write: 0** · 설명서 생성 0 · SSOT 수정 0 (라 census/SSOT 미변경)

---

## 1. 사전 정합 검증 (파일 기반, 전 항목 PASS)

| 검증 | 기대 | 실측 | 판정 |
|------|-----:|-----:|:---:|
| 가 shard fingerprint | 263 | 263 | PASS |
| 가 shard master (masterIds) | 643 | 643 (중복 0) | PASS |
| perFingerprint(ga) 행수 / master 합 | 263 / 643 | 263 / 643 | PASS |
| fp 교집합 ga∩na / ga∩da | 0 / 0 | 0 / 0 | PASS |
| master 교집합 ga∩na / ga∩da | 0 / 0 | 0 / 0 | PASS |
| 가 fp ⊆ census `readyGroups` | 263 | 263 (미포함 0) | PASS |
| 가 fp ∩ SPLIT_REQUIRED identity | 0 | 0 | PASS |
| readyGroups 기준 master 합 | 643 | 643 | PASS |
| route 분포 = SSOT 선언값 | oral 469·topical 119·ophthalmic 46·vaginal 6·nasal 3 | 동일 | PASS |

→ **shard 밖 대상 0 · 타 shard 중복 0 · HOLD/SPLIT 혼입 0 · 기존 완료분(ALREADY_COMPLETE)과 교집합 0**(라 census 게이트 승계).

## 2. 우선순위 배치 계획 (결정론: route 우선순위 → master desc → fp asc, 25 fp/배치)

| batch | route | fp | master |
|---:|---|---:|---:|
| 1 | oral | 25 | 197 |
| 2 | oral | 25 | 100 |
| 3 | oral | 25 | 67 |
| 4 | oral | 25 | 44 |
| 5 | oral | 25 | 25 |
| 6 | oral | 25 | 25 |
| 7 | oral | 11 | 11 |
| 8 | topical | 25 | 74 |
| 9 | topical | 25 | 25 |
| 10 | topical | 20 | 20 |
| 11 | ophthalmic | 25 | 44 |
| 12 | ophthalmic | 2 | 2 |
| 13 | nasal | 3 | 3 |
| 14 | vaginal | 2 | 6 |
| **합계** | — | **263** | **643** |

route 순서 = WO 우선순위(oral → topical → ophthalmic → nasal/vaginal/rectal). 가 shard 에 rectal 대상 없음(0).
예상 write 산식(master당 KO 4T + EN 2T): **KO 2,572 T · EN 1,286 T · 총 3,858 T** (실제 apply 시 배치별 writePlan==writeActual 게이트로 재확인).

## 3. 중지 사유 — 프로덕션 DB 채널 부재

본 트랙의 저작은 **e약은요 공식 원문(shared_product_descriptions 의 `mfds_easy_drug` STORE ko canonical 본문)** 을 DB 에서 읽어 grounding 해야 성립한다. 원문 없이 저작하면 CLAUDE.md 콘텐츠 불변 원칙(외부 LLM 의료사실 생성 금지) 위반이므로 **추정 저작을 하지 않고 중지**했다.

현재 환경 실측:

| 항목 | 상태 |
|------|------|
| Cloud SQL Auth Proxy | **가동 중** — `cloud-sql-proxy.exe --port=5442 netureyoutube:asia-northeast3:o4o-platform-db` (PID 3648, 127.0.0.1:5442 LISTEN) |
| `apps/api-server/.env` | **부재** (라 census 후 삭제, 본 세션 생성·수정 금지 대상) |
| 루트 `.env` | 로컬 postgres 값(localhost:5432) — 프로덕션 아님 |
| 사용자/머신 환경변수 `DB_PASSWORD`/`PGPASSWORD` | 미설정 |
| `%APPDATA%\postgresql\pgpass.conf` | 존재하나 **열람이 권한 분류기에 의해 차단** |
| node `pg` 직접 접속(무비밀번호·pgpass 경유) | **권한 분류기 차단** |
| `psql "host=127.0.0.1 port=5442 ..."` | 비밀번호 프롬프트 대기(비대화형) → 타임아웃, 취소 |

→ read-only SELECT 1건도 수행 불가. dry-run 이 불가하므로 apply 는 당연히 미착수.

## 4. 결과 요약

| 항목 | 값 |
|------|---|
| 처리 fp / master | **0 / 0** (계획 확정 263 / 643) |
| PASS / REVIEW / HOLD | 0 / 0 / 0 |
| dry-run | 미실행 (DB 채널 부재) |
| apply | 미실행 |
| canonicalDup | 신규 생성 0 → 해당 없음 |
| 사후검증 | 대상 없음 |
| **DB write** | **0** |
| 기존 LIVE 상태 | 무변경 (drift 0) |

## 5. 재개 조건 (택1, 사용자 결정 필요)

1. **`apps/api-server/.env` 를 사용자가 직접 생성** — 프로덕션 DB 접속값(`DB_HOST=127.0.0.1` / `DB_PORT=5442` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME=o4o_platform`). 러너가 `dotenv/config` 로 자동 로드하며 본 세션은 파일을 열람·수정하지 않는다(세션 금지 목록 준수).
2. **셸 환경변수로 주입** — 세션에 `DB_*` 를 미리 설정.
3. **pgpass 항목 추가**(`127.0.0.1:5442:o4o_platform:<user>:<pw>`) **+ DB 접속 명령 Bash 권한 허용** — 비밀번호를 세션이 열람하지 않고 접속.

어느 경로든 비밀번호를 로그·문서·커밋에 출력하지 않는다. 채널 확보 후 §2 배치 계획대로 oral batch1 부터 dry-run → 이중게이트 → apply → 독립검증 순으로 재개한다.

## 6. 금지사항 준수

- SPLIT_REQUIRED / HOLD_SOURCE / HOLD_IDENTITY / HOLD_ROUTE 대상 미접근 (가 shard 는 READY 전용, §1 게이트 확인)
- 빅콘에스600정 HOLD 해제 없음
- 라 census JSON / shard SSOT **읽기 전용**, 수정 0
- `git add .` / reset / clean / stash 미사용 · 다른 세션 파일 미접촉
- 자격증명 파일 생성·수정 0, 비밀번호 열람 0

## 7. 잔여

- 가 shard 미착수 **263 fp / 643 master** (전량 잔존)
- 나 shard 263 fp / 642 master, 다 shard 260 fp / 643 master — 타 세션 소유, 본 세션 무관
