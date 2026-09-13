# CHECK-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1

> **WO**: `WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1`
> **상태**: **CLOSED** — bootstrap · version · migration(백업 선행) · 데이터 보존 · 백업/복원 · import/export · Windows 재시작 지속 전부 실측 PASS, production pairing(read-only health) PASS
> **작성일**: 2026-09-13
> **선행**: `CHECK-O4O-LOCAL-DATA-SQLITE-V0`(node:sqlite · 단일 접근점 · 경로 자율) · `CHECK-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1`(cloud tool 3개 · 안전 whitelist)
> **commit**: `109dac5fe` (런타임 · CLI · 서버 whitelist · 테스트) · 본 문서

---

## 0. 한 줄 요약

사용자가 SQLite 설치 · migration 실행 · schema version 을 **한 번도 의식하지 않는** 로컬 데이터 런타임. agent 가 시작할 때 DB 를 만들거나
버전을 보고 필요한 migration 만(적용 전 스냅샷 백업) 순서대로 적용하고, 무결성을 확인한 뒤 ready 를 선언한다. 실패는 ready 로 위장하지 않고
코드로 남기며 데이터를 자동 초기화·덮어쓰기하지 않는다. 사용자 파일은 명령줄로 직접 준 것만 읽고, 원본 열 전부가 아니라 업무에 필요한 필드만
dataset 으로 저장한 뒤 CSV 로 되돌려 준다. cloud DB migration 0 · 새 의존성 0 · 임의 SQL/파일 통로 0.

## 1. 기존 Local Data census (§68)

| 축 | 착수 전(V0) | V1 |
|---|---|---|
| 경로 | `%LOCALAPPDATA%\o4o-local-agent\local.db`(`O4O_AGENT_HOME` 우선) — credentials.json 옆 | **유지**(§7) |
| runtime | `node:sqlite` `DatabaseSync` 1곳 · WAL · FK · busy 5s | 유지 · `PRAGMA quick_check` startup 1회 추가 |
| migration | `MIGRATIONS[]` 1건(`core_v0`, 테이블 7) · `local_schema_migrations(version,name,applied_at)` · 각 migration 트랜잭션 | chain 검증 + 이력 대조 + 백업 선행 + 002 추가(테이블 9) |
| 열기 | `openLocalDb()` 가 lazy 로 열고 migration — startup 에서 부르지 않음 · 실패는 `LOCAL_DB_NOT_AVAILABLE` 한 코드 | `bootstrapLocalDb()` 를 **startup 에서** 부른다 · 실패 코드 5종 · 실패 시 데이터 축 닫힘 |
| repository | Meta · Settings · Import 이력 · Mapping | + Dataset(행 저장) |
| import/export | `parseCsv · mapImportRows · importCsv`(행 저장 없음 · 이력만) · `toCsv · recordExport` | preview/apply(저장) · dataset export · CLI |
| bridge tools | `local.data.health · get_meta · set_setting` 3개 | **3개 그대로**(§61 — 필요 최소: health 페이로드 확장만) |
| backup | 없음 | 신규 |
| 실 PC 상태 | 이 PC 의 실제 홈에는 `local.db` 가 **없었다**(V0 는 tool 호출 때만 lazy 생성 · 한 번도 호출된 적 없음) | 첫 startup 이 생성 |

## 2. SQLite runtime · path (§6·§7·§10)

`node:sqlite`(Node 22 내장) 그대로 — 사용자 설치 0 · 새 패키지 0(`package.json` 무변경). 경로 불변. PRAGMA `journal_mode=WAL · foreign_keys=ON · busy_timeout=5000` 재검증.

## 3. Bootstrap (§8·§9·§47·§48)

`bootstrapLocalDb({ log, backup })` — `mkdir → open → PRAGMA → quick_check → 이력 대조 → (pending: 백업 → 적용) → meta → ready`.
agent `commandRun()` 이 credentials 로드 **직후, 창구·relay 전에** 부른다. 결과는 로그 한 줄(`Local Data 준비됨 · schema v2 · 백업 N개` / `Local Data 업데이트 실패 (코드)`)과
`/health` 의 `localData{ready,schemaVersion,backups[,errorCode]}` 로만 드러난다. 기존 `local.db` 는 삭제·재생성하지 않는다 — 버전 확인 뒤 필요한 migration 만.

## 4. Schema version (§11)

`SCHEMA_VERSION = MIGRATIONS 의 마지막 version`(손으로 올리지 않음). 이력 테이블은 기존 `local_schema_migrations` 재사용(새 테이블 0). `local_meta.schema_version` 은 열 때마다 이력의 MAX 로 맞춘다.

## 5. Migration runner (§12~§16·§75)

- forward-only · 순차 · 각 migration 1 트랜잭션(SQLite 는 DDL 도 롤백된다 — 실측) · `IF NOT EXISTS` idempotent.
- source = 체크인 코드(`MIGRATIONS` 상수)뿐. 서버 · AI · 사용자 입력이 SQL 문자열로 들어오는 통로 없음(spec 잠금).
- **002 `datasets_v1`**: `local_datasets(name, key_field, fields, row_count …)` · `local_dataset_rows(dataset, row_key, data JSON …)` — import/export 의 저장 기반. 업무 테이블(상품·매출·공급자·주문선호) 선제 정의 0(§42).

## 6. Migration integrity (§19·§20)

`validateMigrationChain`(중복 id · 빈틈 · 1 부터 · 이름 형식) + `compareMigrationHistory`(적용 이력 vs 코드: `too_new · gap · mismatch`). 셋 다 startup 에서 감지 → `MIGRATION_FAILED(chainStatus)` 또는 `SCHEMA_TOO_NEW`. 더 새로운 DB 는 **내리지 않는다**.

## 7. Failure behavior (§17·§18·§27·§58)

| 상황 | 코드 | DB |
|---|---|---|
| 열기 실패 | `LOCAL_DB_NOT_READY` | 손대지 않음 |
| quick_check ≠ ok | `LOCAL_DB_INTEGRITY_FAILED` | 파일 그대로(실측: 쓰레기 파일이 그대로 남음) |
| 코드가 모르는 version | `LOCAL_DB_SCHEMA_TOO_NEW` | 행 그대로(실측: 이력 3행 유지) |
| chain gap/mismatch · migration 예외 | `LOCAL_DB_MIGRATION_FAILED` | 해당 migration 롤백 · 이전 버전 + 데이터 유지 · 백업 존재 |
| 백업 실패 | `LOCAL_DB_BACKUP_FAILED` | migration 보류(옛 schema 그대로) |
| import | `LOCAL_DB_IMPORT_INVALID` · `LOCAL_DB_REQUIRED_FIELD_MISSING` | 0행(트랜잭션) |
| export | `LOCAL_DB_EXPORT_FAILED` | — |

실패 상태에서 `get_meta/set_setting/health` 는 그 코드로 거절(NOT_READY 위장 없음). 코드가 고쳐진 뒤 재시작하면 재설치 없이 이어서 올라간다(실측).

## 8. Backup (§21~§25·§76)

`VACUUM INTO`(열린 핸들 · 트랜잭션 일관 스냅샷 — WAL 단순 복사의 -wal 누락 문제 회피) → `agentHome()/backups/local-<UTC>[-nn]-<pre-migration|manual|pre-restore>.db`.
시점: **pending migration 직전(자동)** · 사용자 `data backup`. 갓 만든 빈 DB(이력 0)는 백업하지 않는다. 보존 최근 5개(방금 만든 것은 보호). 업로드 0(모듈에 네트워크 API 없음).

## 9. Recovery (§26·§27·§67)

자동 복구 엔진 없음. `data backups` 로 목록 → `data restore <id>` — id 규칙 밖(`../…`) 거절, 복원 직전 현재 상태를 `pre-restore` 로 한 번 더 남기고, `-wal/-shm` 을 치운 뒤 교체 → 다음 bootstrap 이 검증. 실패 상태 안내문에 백업 개수·명령을 함께 낸다.

## 10. Import (§31~§36·§63)

`previewImport`(DB 미변경): 행 수 · 인식 열 · 사용 필드 · 폐기 열 · 원본에 없는 매핑 열 · 부족 필수 필드 · 형식 불량 행(칸 수 불일치 — 억지 정렬 없음) · 키 통계(중복·빈 값).
`applyImport`: 같은 검사 → 1 트랜잭션 · `keyField` 있으면 같은 키 upsert(재-import 중복 0) · 없으면 순번 키(중복 방지 없음 — 문서화) · `replace` 모드 · 이력 기록. 원본 열 전부를 저장하지 않는다(실측: 폐기 열 값이 DB 에 없음). 필수 필드 부족 시 추측하지 않고 거절.
파일 접근은 **CLI 가 사용자가 적은 경로 하나만** 읽는다 — 서버 명령 · AI · 웹페이지에서 파일 경로를 지정하는 통로 없음(`handlers.mjs` 가 CLI 모듈을 import 하지 않음, spec 잠금). CSV 원문이 cloud 를 거치지 않는다(§46 local first — `local-agent-service.ts` 에 `csvText` 부재 단언).

## 11. Export (§37~§39)

dataset 단위 CSV(`columns` 부분집합 가능 · dataset 밖 열 거절) · escaping(`"…"` · `""`) · CRLF · UTF-8(+CLI 는 BOM — Excel 한글) · 빈 dataset 은 헤더만 · 전체 dump 아님 · 이력 기록(크기만).

## 12. Local Tool Bridge (§40·§41·§61·§62)

cloud tool 은 여전히 **3개**(`health · get_meta · set_setting`) — import/export/backup 은 cloud 명령이 아니라 로컬 CLI 다. `local.data.health` 페이로드 확장: `ready · latestMigration · pendingMigrations · migrationStatus(+too_new) · integrityStatus · backupCount · lastBackupAt`. 서버 `pickSafeDataInfo` 가 enum · 정수 · ISO 시각만 통과(경로 · 파일명 · 행 · dataset 목록 탈락 — spec). 실패 코드 5종을 서버 `LOCAL_AGENT_ERROR` 에 등재하고 원인별 안내 문장(초기화·삭제 제안 0).

## 13. Privacy · data boundary (§30·§44·§59)

health · 로그 · /health · CLI 출력 어디에도 전체 경로 없음(테스트가 `home` 경로 · `local.db` · `backups` 문자열 부재 단언). 행 데이터는 CLI 출력에도 없음(개수·열 이름만). 민감 스키마(환자·처방·보험·주민번호·credential) 0 — 소스 잠금 유지.

## 14. Startup · update (§16·§47·§48·§49)

새 코드로 실행 → bootstrap 이 v1 DB 를 v2 로(백업 선행) → ready. 재설치는 코드 디렉터리만 바꾸고 `%LOCALAPPDATA%\o4o-local-agent\`(credentials.json · local.db · backups/)는 건드리지 않는다 — **uninstall 시 이 디렉터리를 지우지 않는 한 데이터가 보존된다**(설치 스크립트 `install-native-host.mjs` 는 host 등록만 다룬다). 데이터 축 실패는 브라우저 축을 막지 않는다(startLocalServer · relay 는 그대로 진행).

## 15. Fixture migration tests (§50~§57)

`tools/o4o-local-agent/test/local-data-runtime.test.mjs` **18 PASS** (임시 홈 격리):
empty→latest · v1(V0 fixture)→latest(백업 + meta/settings/work_state 보존 + 백업이 v1 상태) · already latest no-op · future version reject · migration failure 롤백/코드/재시작 회복 · chain 중복/빈틈/이름 불일치/이력 빈틈 · 백업 실패 → migration 보류 · 손상 파일 → INTEGRITY · 백업 생성/독립/보존/복원(pre-restore) · import preview/apply/upsert/replace/5,000행/원자성 · export escaping/한글/빈 dataset/부분집합 · 동시 100 요청 · 미커밋 트랜잭션 뒤 재기동 · CLI 전체 왕복 · health 필드/경로 부재 · 경계 잠금.
기존 `local-db.test.mjs` 18 PASS(테이블 9 반영).

## 16. Windows smoke (§70·§71)

실 Windows(이 PC) · 실 agent 코드 · fixture 홈(`O4O_AGENT_HOME`):

| 단계 | 실측 |
|---|---|
| V0 형상 DB(migration 1 · locale=ko) 준비 → `data status` | `ready · schema 2 · appliedNow [2] · backupStatus created · backupCount 1` — **upgrade smoke PASS** |
| `data status` 재실행 | `appliedNow [] · not_needed · 백업 1`(no-op) |
| `data backup` | `local-…-manual.db 65536 bytes` |
| `data import … --preview` | 3행 · 인식 4열 · 사용 3필드 · 폐기 `비고` · 부족 0 · ok |
| `data import` / 재실행 | `inserted=3 updated=0` → `inserted=0 updated=3`(중복 0) |
| `--required stock`(원본에 없음) | 미적용 · exit 3 |
| `data export` | BOM + `item_name,barcode,unit_price` · `"게보린정, 10정"` escaping · 한글 그대로 |
| `data restore <manual>` | pre-restore 스냅샷 생성 · 복원 후 ready v2 · dataset 0(백업 시점) · 백업 3개 |
| agent `run` → `/health` | `localData:{ready:true,schemaVersion:2,backups:3}` · 로그 `Local Data 준비됨 · schema v2 · 백업 3개` |
| agent 종료 → 재시작 → `data status` | dataset `product_list 3행` **유지** — restart persistence PASS |

실제 agent 홈(`%LOCALAPPDATA%\o4o-local-agent`): local.db 가 없던 상태에서 첫 startup 이 생성(`appliedNow [1,2] · not_needed`) — 신규 설치 경로 PASS. 민감 데이터 0(합성 CSV 3행).

## 17. Production smoke (§72·§73)

이 PC 의 paired agent 기동 → neture 세션으로 home-chat `"로컬 데이터 저장소 상태 확인해줘"` → cloud tool `local.data.health` → agent → 렌더:
배포 전 API: "상태 정상 · 스키마 버전 2 (최신)" / 배포 후(`109dac5fe`): "+ 백업 상태: 백업 없음". Cloud Run 로그 `local-agent data command` 2건 = `tool · status · deviceId` 만, 경로 누출 0. 실사용자 데이터 write 0(read-only).

## 18. Cloud DB impact (§74)

cloud migration **0** · cloud 테이블 **0** · cloud write 0(기존 `local_agent_commands` envelope 뿐). Local migration = 002 하나(SQLite).

## 19. Tests · CI

| 게이트 | 결과 |
|---|---|
| agent node:test 4 파일(local-db 18 · local-data-runtime 18 · browser-dom 17 · native-bridge 24) | **77 PASS** |
| api-server `local-data-bridge.spec`(+3) · `local-agent-runtime.spec`(import 목록 갱신) · oneclick-pairing | 80 + PASS |
| 회귀(§69): work-agent · browser-dom-control · browser-bridge · tool-routing · execution-layer | 119 PASS |
| eslint(변경 12 파일) · tsc(api-server WO 파일) | 0 |
| CI · Deploy API(`109dac5fe`) | Deploy · CodeQL success · CI Pipeline(문서 커밋 시점 확인) |

## 20. Limitations · follow-up (§80)

1. import/export/backup/restore 의 사용자 진입점은 **CLI** 다. 브라우저에서 파일을 고르는 UI 는 loopback 창구(`/health`·`/pair` 둘로 잠긴 ONECLICK 계약)를 넓혀야 해서 이번 범위 밖 — 실제 반복 업무가 생길 때 별도 WO.
2. `keyField` 없는 import 는 중복을 막지 않는다(순번 키). dataset 별 키 전략은 업무가 생길 때 정한다(§36).
3. 백업 보존은 개수(5)만 — 기간 정책 없음. 백업은 로컬에만 있으므로 디스크 손실에는 export 가 보조다.
4. 손상(INTEGRITY_FAILED) 복구는 사용자 CLI 복원 뿐(자동 없음 — 의도).
5. Excel 직접 생성 없음(CSV + BOM).
6. 다음 business migration(003+)은 실제 반복 업무에서 필요가 생긴 것부터 — 순서 미고정.

```text
LOCAL SQLITE EMBEDDED          = PASS
USER SQLITE INSTALL            = 0
DB BOOTSTRAP                   = PASS
SCHEMA VERSION                 = PASS
FORWARD MIGRATION              = PASS
MIGRATION FAILURE SAFE         = PASS
UNKNOWN FUTURE VERSION BLOCK   = PASS
EXISTING DATA PRESERVED        = PASS
BACKUP                         = PASS
RECOVERY PATH                  = PASS
IMPORT                         = PASS
EXPORT                         = PASS
ARBITRARY SQL                  = 0
ARBITRARY FILE ACCESS          = 0
CREDENTIAL STORAGE             = 0
SENSITIVE MEDICAL DATA SCHEMA  = 0
CLOUD RAW SYNC                 = 0
WINDOWS RESTART PERSISTENCE    = PASS
PRODUCTION PAIRING (read-only) = PASS

LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 = CLOSED
```

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
