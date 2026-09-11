# CHECK-O4O-LOCAL-DATA-SQLITE-V0

> WO: `WO-O4O-LOCAL-DATA-SQLITE-V0`
> 목적: 각 매장 PC 의 Local Work Agent 안에 최소 Local SQLite Runtime 을 만들어, 실제
> 업무 니드에 필요한 데이터만 로컬에 저장·조회·갱신하고 니드에 따라 점진적으로 스키마를 키운다.
> 상태: **에이전트 측 Local Data Runtime = ESTABLISHED** / cloud 측 tool 노출 = 후속 증분으로 분리(§16)
> 코드: `tools/o4o-local-agent/src/local-db.mjs`(신규), `handlers.mjs`(3개 데이터 tool 배선),
> `tools/o4o-local-agent/test/local-db.test.mjs`(신규), `apps/api-server/src/__tests__/local-agent-runtime.spec.ts`(경계 단언 추가)

---

## 1. 배경 (왜)

Local Work Agent 는 지금까지 **찾기/창 제어/브라우저 열기/화면 조작**만 했고, 매장 업무
데이터를 담을 곳이 없었다. cloud DB 는 매장 원자료의 저장소가 아니다(§2). 실제 업무(주문
후보·재고·품목 등)를 붙이려면 **매장 PC 로컬에 데이터를 두는 별도 축**이 필요하다. 이 WO 는
그 최소 런타임을 만들되, 처음부터 거대한 업종 표준 스키마를 강제하지 않고 핵심 테이블만
만든 뒤 실제 업무가 스키마를 키우는 형태로 시작한다(§14·§47).

## 2. 선행 조사 1 — SQLite 엔진 (§6) · 의존성 0 유지 PASS

| 항목 | 결과 |
|---|---|
| `node:sqlite` 내장 여부 (Node 22.18.0) | **내장.** 플래그 없이 `import { DatabaseSync } from 'node:sqlite'` 로 로드됨 |
| 안정성 | `ExperimentalWarning: SQLite is an experimental feature` 한 줄(경고만, 동작 영향 0). stderr 로만 나오고 실패시키지 않음 |
| 런타임 확인 | 본 worktree/Node 에서 WAL(`journal_mode=wal`) · `foreign_keys=on` · prepare/run/get 파라미터 쿼리 모두 정상 |
| 외부 패키지 필요? | **불필요.** agent 는 여전히 `package.json` 이 없다(런타임 의존성 리터럴 0) |

**결정: node:sqlite 채택. 의존성 0 원칙을 깨지 않는다(§6 우선순위 1 충족).** 유일한 부작용은
cosmetic ExperimentalWarning 이며, 이는 STOP 사유(§52)에 해당하지 않는다.

## 3. 선행 조사 2 — DB 경로 (§7)

`credentials.mjs` 의 규칙을 그대로 쓴다: `O4O_AGENT_HOME` 우선, 없으면
`%LOCALAPPDATA%\o4o-local-agent\`. DB 파일 = 그 안 `local.db` (credentials.json 옆).
`local-db.mjs` 가 이 경로를 **스스로 계산**하며 서버가 보낸 경로를 받지 않는다.

## 4. 선행 조사 3 — cloud 경계 (§8·§31·§32)

- cloud DB migration = **0**, cloud schema 변경 = **0**, cloud raw write = **0**. 이 WO 는
  cloud 쪽 파일(서비스/엔티티/마이그레이션)을 **한 줄도 바꾸지 않았다.**
- `local-db.mjs` 에 네트워크 API 가 없다(fetch/http/net/WebSocket/upload 부재 — 정적 단언).
  로컬 DB 를 cloud 로 업로드/동기화/복제하는 통로가 애초에 존재하지 않는다.
- 기존 command/status 왕복 경로(local-agent runtime)는 무변경.

## 5. Local DB 정체성 (§9·§11)

`local_meta` 에 `local_db_id`(무작위 `randomUUID()`) · `schema_version` · `created_at` ·
`updated_at` 저장. **cloud credential/비밀번호/쿠키/외부 토큰을 정체성으로 쓰지 않는다.**
민감정보 없음.

## 6. Core Schema V0 (§10) — migration 001 `core_v0`

`local_` prefix 7개(§10 권고와 1:1): `local_meta` · `local_schema_migrations` ·
`local_settings` · `local_mappings` · `local_imports` · `local_exports` · `local_work_state`.
업무 테이블(orders/sales/inventory/customers/products)은 **대량 생성하지 않았다**(§14).

## 7. 마이그레이션 (§4·§12·§13)

- `MIGRATIONS` 배열, forward-only. 시작 시 `appliedVersion()` 확인 → 필요한 것만 순서대로.
- 각 마이그레이션은 하나의 `BEGIN/COMMIT`(실패 시 `ROLLBACK`) — 부분 적용이 남지 않는다.
- `CREATE TABLE IF NOT EXISTS` 로 idempotent. 사용자가 SQL 을 직접 돌릴 일이 없다(agent 가 자동 적용).

## 8. 데이터 접근 계층 · Repository (§27·§28)

SQLite 접근을 `local-db.mjs` 한 곳에 모았다: `openLocalDb/closeLocalDb/withTransaction` +
`LocalMetaRepository` · `LocalSettingsRepository` · `LocalImportRepository` ·
`LocalMappingRepository`. tool 은 DB 파일을 직접 열지 않고 repository 메서드만 부른다.

## 9. Import V0 (§16·§18·§19·§20·§22)

- 계약: `importCsv({ csvText, sourceType, profileName, columnMapping, requiredFields })` —
  **이미 파싱 가능한 CSV 텍스트**를 받는다. **파일 경로를 받지 않는다** → 임의 파일 스캔 통로 없음(§19).
  파일 선택·읽기는 이 모듈 밖(사용자 선택 기반)에서 한다.
- 매핑(`품목명→item_name` 식 명시 매핑, 자동 추론 과설계 안 함, §20). 매핑에 없는 원본 컬럼은
  **버린다**(`droppedColumns`, §16). 필수 필드가 비었거나 매핑에 없으면 **강제 완성하지 않고**
  `missingFields` 로 돌려준다(§22) — 사용자에게 한 번 더 요청 가능.
- 원본 파일 전체를 DB 에 다시 저장하지 않는다(§17). `local_imports` 에는 크기·폐기/부족 메타만.

## 10. Export V0 (§25)

`toCsv(rows, columns)` — CSV 우선(콤마·따옴표·개행 escape). xlsx 는 의존성-0 과 충돌하므로
CSV 를 먼저 제공하고 xlsx 는 후속(§25 허용 경로). `local_exports` 에 크기 메타만 기록.

## 11. Local DB Health (§38)

`localDbHealth()` — 열림/스키마버전/마이그레이션 상태를 **불리언·숫자로만** 돌려준다.
**DB 경로를 절대 담지 않는다**(경로에 `%LOCALAPPDATA%\Users\<username>` 이 있어 사용자명 누출).
실패 시 예외 대신 `LOCAL_DB_NOT_AVAILABLE` / `LOCAL_DB_MIGRATION_FAILED` 로 정규화.

## 12. Agent tool 배선 (§35·§36·§37) — 에이전트 측 allowlist 절반

`handlers.mjs` 에 `DATA_HANDLERS` 추가 → `runAction` 에서 `local.data.*` 디스패치:

| tool | 인자 | 동작 |
|---|---|---|
| `local.data.health` | 없음 | `localDbHealth()` (경로 미포함) |
| `local.data.get_meta` | 없음 | `local_meta` key/value (민감정보 없음) |
| `local.data.set_setting` | `{key,value}` | `local_settings` 1건 (key 안전문자·길이 검사, value 원문은 응답/로그에 미포함) |

- AI 가 raw SQL 을 만들거나 실행하지 않는다 — 등록 tool → repository → **고정 파라미터 쿼리**(§36·§37).
- `local.sqlite.execute_sql` 같은 임의 SQL tool 은 어디에도 없다(정적 단언).
- `local.data.*` 는 `#appId` 형태를 허용하지 않는다(app/site/computer 축이 아님).

## 13. 금지 능력 부재 (정적 단언, jest CI) — §48-14~17·§33

`local-agent-runtime.spec.ts` 신규 describe 가 CI 에서 확인:
- §48-14 임의 SQL tool 부재 (`execute_sql`/`local.sqlite` 문자열 0)
- §48-15 임의 파일 읽기 부재 (`local-db.mjs` 에 `readFileSync/readdir/glob` 0, `mkdirSync` 만)
- §48-15b DB 는 `new DatabaseSync(dbPath())` **한 곳**에서만 열림 (서버 경로 주입 통로 0)
- §48-16 cloud 동기화 부재 (`fetch/http/net/WebSocket/upload` 0)
- §48-17 credential 저장 부재 (`password/token/cookie/credentials` 0, 정체성=`randomUUID()`)
- §33 민감정보 스키마 부재 (`patient/prescription/insurance/resident/rrn/ssn` 0)

## 14. 테스트 (§48 20항목) 대조

런타임 항목 = `node --test tools/o4o-local-agent/test/local-db.test.mjs` (17건 PASS, 의존성 0).
정적/서버 항목 = jest `local-agent-runtime.spec.ts` (CI).

| # | §48 항목 | 커버 | 상태 |
|---|---|---|---|
| 1 | DB 자동 생성 | node --test 1 | PASS |
| 2 | 재기동 후 재사용 | node --test 2 | PASS |
| 3 | 스키마 버전 | node --test 3 | PASS |
| 4 | 마이그레이션 적용 | node --test 4 | PASS |
| 5 | 마이그레이션 idempotency | node --test 5 | PASS |
| 6 | 트랜잭션 롤백 | node --test 6 | PASS |
| 7 | 파라미터 쿼리(주입 방어) | node --test 7 | PASS |
| 8 | 잘못된 입력 거부 | node --test 8 | PASS |
| 9 | 설정 쓰기/읽기 | node --test 9 | PASS |
| 10 | import 매핑 적용 | node --test 10~12 | PASS |
| 11 | 불필요 컬럼 무시 | node --test 10~12 | PASS |
| 12 | 부족 필수 필드 | node --test 10~12, 12b | PASS |
| 13 | export CSV | node --test 13 | PASS |
| 14 | 임의 SQL tool 부재 | node --test 14 + jest §48-14 | PASS |
| 15 | 임의 파일 스캔 부재 | jest §48-15/15b | PASS |
| 16 | cloud 동기화 부재 | jest §48-16 | PASS |
| 17 | credential 저장 부재 | jest §48-17 | PASS |
| 18 | Local Agent regression 0 | jest local-agent-runtime 전체 | PASS |
| 19 | Computer Use regression 0 | jest computer-use 전체 | PASS |
| 20 | Browser Control regression 0 | jest(runtime/computer-use 포함) | PASS |

추가: `ai-capability-tool-routing.spec.ts`(registry-lock) 무변경 통과 — 서버 tool 을 새로
등록하지 않았으므로 effect registry 를 건드리지 않는다.

**검증 명령/결과:**
- `node --test tools/o4o-local-agent/test/local-db.test.mjs` → 17 pass / 0 fail
- jest `local-agent-runtime computer-use ai-capability-tool-routing --maxWorkers=1` → **104 pass / 0 fail**
- `tsc --noEmit -p apps/api-server/tsconfig.json` → exit 0
- eslint (4개 변경 파일) → exit 0

## 15. 로컬 smoke (§45) — PASS

격리된 임시 `O4O_AGENT_HOME` 에서 agent 런타임 순서를 실행:
health(자동 생성) → `local.db` 존재 확인 → set_setting/get_meta → import fixture(2필요+2폐기,
부족필드 감지) → read-back → export CSV. 결과:
- `health = {ok:true, schemaVersion:1, migrationsApplied:1, migrationOk:true, tableCount:7}`,
  **응답에 홈 경로 미포함**(`leaks home path: false`).
- import: `rows=2, dropped=규격,메모, missing=stock_qty`(재고 빈 행 → 강제 완성 안 함).
- export CSV 정상. **cloud 호출 0**(네트워크 API 부재).

> 프로덕션 smoke(§39-45 의 cloud→agent 왕복)는 cloud 측 tool 노출(§16)에 의존하므로 그 증분에서 수행.

## 16. 범위 결정 — 이번 증분 vs 후속 (§5.10·§35·§52)

**이번 증분(완료): 에이전트 측 Local Data Runtime 전체.** 자기 완결적이고 공유 계약을 건드리지
않는다 — `local-db.mjs`, 마이그레이션, repository, CSV import/export, health, 3개 데이터
tool 의 **agent 측 배선**(runAction), 런타임 테스트, CI 정적 경계.

**후속 증분으로 분리(§52 근거 기록): cloud→agent tool 노출.** cloud 가 `local.data.*` 를
**발행**하려면 서버 `LOCAL_AGENT_ACTIONS`/`LOCAL_AGENT_ACTION_ALLOWLIST` + `ai-tool-router` +
파리티 스펙 2곳 + registry-lock 을 함께 바꿔야 한다. 막는 지점이 실재한다:

- `local.data.set_setting` 은 `{key,value}` **인자 채널**이 필요하다. 그런데 프로토콜은 의도적으로
  자유 문자열 인자 채널이 없고(`local_agent_commands` 에 args 컬럼 없음, DB migration=0) —
  이는 **§52 STOP 시나리오**(인자 채널 신설 = 공유 계약 변경)에 정확히 해당한다. Computer Use 가
  쓰는 **result_data 발행 시점 일회성 인자** 패턴을 확장하는 별도 설계가 필요하다.
- 또한 여러 서버 공유 계약 파일을 동시에 건드려 다른 세션과 충돌 위험이 있고, WO 철학("작게
  시작, 사용이 스키마를 키움")과 §35("최소 안전 tool 먼저, bulk query 는 후속")에 맞춰
  런타임을 먼저 안전하게 착지시키는 편이 낫다.

에이전트 런타임은 완비되어 **명령이 오면 즉시 실행**할 수 있는 latent 상태다. cloud 발행은 승인
후 별도 증분으로 진행하는 것을 제안한다.

**추가 STOP(§52·CLAUDE.md): CI 워크플로 신설 금지.** agent `node --test` 를 CI 에 거는 것은
CI 인프라 변경(중지 조건)이다. 현재 CI 는 jest 정적 스펙으로 agent 경계를 확인하며, 런타임
테스트는 `node --test tools/o4o-local-agent/test/` 로 로컬 실행한다. CI hook 은 후속 제안.

## 완료 기준 대조 (§51)

| 항목 | 상태 |
|---|---|
| LOCAL SQLITE RUNTIME = ESTABLISHED | ✅ (agent 측) |
| AUTO CREATE / LOCAL STORAGE | ✅ (§6·§15) |
| SCHEMA VERSIONING / LOCAL MIGRATION | ✅ (§7) |
| PARAMETERIZED ACCESS | ✅ (§12·node --test 7) |
| IMPORT MINIMAL FIELDS / UNNEEDED DROPPED / MISSING FIELD | ✅ (§9) |
| CSV EXPORT | ✅ (§10) |
| LOCAL DATA HEALTH | ✅ (§11) |
| CLOUD RAW DATA STORAGE = 0 / DB MIGRATION = 0 / SCHEMA 변경 = 0 | ✅ (§4) |
| ARBITRARY SQL = 0 | ✅ (§13-14) |
| ARBITRARY FILE SCAN = 0 | ✅ (§13-15) |
| CREDENTIAL STORAGE = 0 | ✅ (§13-17) |
| tests / type-check / lint / CI | ✅ (§14) |
| Windows local smoke | ✅ (§15) |
| production smoke / cloud tool 노출 | ⏸ 후속 증분(§16, §52 근거) |
| CHECK 작성 | ✅ (본 문서) |
