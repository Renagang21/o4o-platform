# WO-O4O-PRODUCTION-DB-RESTORE-EXECUTION-VERIFICATION-AND-CLOUD-SQL-STOP-READINESS-V1 — CHECK

> **성격**: production DB export 의 **restore 실행 검증**. production DB write 0 · Cloud SQL 설정 변경 0.
> **Cloud SQL STOP 은 이번 WO 에서 실행하지 않는다** (readiness 판정까지만).
> **산출물**: 본 CHECK 1개.
> **작성일**: 2026-09-05

---

## 1. 기준선 (WO §3)

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `04ca42d4e502ace464e20f7c5a256c67a2b46819` |
| branch | `main` |
| 작업 시작 시 상태 | **다른 세션의 staged 파일 1건 존재** (`docs/checks/CHECK-O4O-MY-STORE-RUNTIME-CONTRACT-…`) → pathspec 없는 commit 금지 (§34) |

**Cloud SQL 기준선**

| 항목 | 값 |
|---|---|
| instance | `o4o-platform-db` |
| state | **RUNNABLE** |
| activationPolicy | **ALWAYS** |
| tier | `db-custom-1-3840` |
| automated backup | **enabled** |
| PITR | **enabled** · transaction log 7일 · retained backups 7 |

---

## 2. Export object 재확인 (WO §4)

| 항목 | 값 |
|---|---|
| object | `gs://neture-db-final-export/o4o-platform-db-full-20260904-1420.sql.gz` |
| size | **332,743,248 B** (317.33 MiB) |
| generation | `1788531893716392` |
| storageClass | STANDARD |
| contentType | `application/x-sql` |
| **md5Hash** | `2SNY6ETAT87La97ECylOzg==` |

### 2-1. 로컬 사본 무결성 (WO §5)

`C:/tmp/o4o-restore-verify/` (git workspace 밖)에 내려받고 **object 와 md5 를 대조**했다.

```text
local md5 : 2SNY6ETAT87La97ECylOzg==
gcs   md5 : 2SNY6ETAT87La97ECylOzg==
size      : 332,743,248 = 332,743,248
→ MD5 MATCH: PASS   (WO §35 "export hash/size 불일치" 해당 없음)
```

**검증 대상은 이 바이트 동일 사본이다.** 새로 dump 를 뜨지 않았다 — 새로 뜨면 *다른 산출물*을 검증하는 것이 되어
"이 export 가 복구 가능한가" 라는 질문에 답하지 못한다 (WO §11 의 2번 경로 선택).

---

## 3. 실행 환경 (WO §6 ~ §10)

### 3-1. 디스크 (WO §6)

| 시점 | C: 여유 |
|---|---:|
| 직전 WO 종료 시 | 228 MB (심각) |
| **본 WO 시작 시** | **15.32 GB** (회복됨) |
| 작업 종료 후 | 15 GB (원복) |

### 3-2. 로컬 PostgreSQL (WO §8)

| 항목 | 값 |
|---|---|
| version | **PostgreSQL 17.9** |
| service | `postgresql-x64-17` · **Running** · Automatic |
| 도구 | `psql` · `createdb` · `dropdb` · `pg_dump` · `pg_restore` 전부 존재 |

### 3-3. 인증 판단 (WO §9) — 사용자에게 비밀번호를 요구하지 않았다

**§9-A (기존 인증 수단 재사용) → 실패.**
`%APPDATA%\postgresql\pgpass.conf` 가 존재해서 확인했으나, 커버 범위가 **로컬 서버가 아니었다**:

```text
host = <Cloud SQL 공인 IP>   port = 5432   db = o4o_platform   user = o4o_api
```

즉 production 접속용이며 로컬 인스턴스 인증에는 사용할 수 없다.
로컬은 `pg_hba.conf` 가 전 접속에 `scram-sha-256` 을 요구하고 해당 비밀번호는 보유하지 않는다.

**§9-B (임시 role 생성) → 불가.** role 을 만들려면 먼저 관리자 인증이 필요하므로 §9-A 실패 시 성립하지 않는다.

**§9-C (`pg_hba.conf` 변경) → 선택하지 않았다.**
사용자가 상시 사용하는 로컬 서비스의 인증 설정을 바꾸고 reload 하는 방식이라, 되돌린다 해도 침습적이다.

**→ 채택: 격리 Docker 컨테이너.**
디스크가 15 GB 로 회복되어 직전 WO 의 제약(pull 실패)이 해소되었고,
사용자 환경을 **전혀 건드리지 않으면서** production 과 **동일 major version** 을 쓸 수 있다.

| 항목 | 값 |
|---|---|
| image | `postgres:15-alpine` |
| server | **PostgreSQL 15.19** |
| psql | 15.19 |
| **dump 출처** | `-- Dumped from database version 15.18` / `-- Dumped by pg_dump version 15.18` |
| major version 일치 | **예 (15 ↔ 15)** |

> dump 에 psql meta-command `\restrict` / `\unrestrict` 가 각 1개 있으나 psql 15.19 가 지원하므로
> **원본을 한 줄도 수정하지 않고** 그대로 실행했다.

---

## 4. Schema-only SQL 생성 (WO §11 ~ §13)

검증 대상 gz 를 스트리밍하며 **COPY 데이터 블록만 제거**했다 (DDL 은 한 줄도 건드리지 않음).

| 항목 | 값 | 기대 |
|---|---:|---|
| schema.sql 크기 | **561,218 B** (552 KB) | — |
| `CREATE TABLE` | **291** | 291 |
| `CREATE INDEX` | **705** | 705 |
| `ADD CONSTRAINT` | **543** | 543 |
| `CREATE SEQUENCE` | **10** | 10 |
| `CREATE SCHEMA` | **2** | 2 (`cosmetics` · `neture`) |
| **`COPY`** | **0** | **0** |
| **`INSERT`** | **0** | **0** |

**요구 extension (WO §15)**: `uuid-ossp` **1개뿐** — `postgres:15-alpine` 에 포함되어 설치 가능.

---

## 5. Restore target (WO §14)

| 항목 | 값 |
|---|---|
| DB 이름 | **`o4o_restore_verify_20260905`** |
| 초기 상태 | **table 0개** (완전한 빈 DB) |
| 격리 | 컨테이너 내부 · 외부 서비스 연결 없음 · production 과 무관 |

**사전 생성한 role** (dump 가 참조): `cloudsqlsuperuser` · `cloudsqlimportexport` 2개.
실제 복구 시에도 동일하게 선행 생성이 필요한 항목이므로 기록한다.

---

## 6. Schema restore 실행 (WO §16 ~ §17)

```bash
psql -v ON_ERROR_STOP=1 -U postgres -d o4o_restore_verify_20260905 -f /tmp/schema.sql
```

**`ON_ERROR_STOP=1` 을 반드시 켠 상태**로 실행했다 (WO §16 — 이것 없는 성공 판정 금지).

| 항목 | 결과 |
|---|:---:|
| **psql exit code** | **0** |
| **ERROR** | **0** |
| **FATAL** | **0** |
| **WARNING** | **0** |
| stderr 총 줄수 | **0 (완전히 비어 있음)** |

> **첫 시도는 실패했다** — `psql: error: …/schema.sql: No such file or directory`.
> 원인은 Git Bash(MSYS)가 컨테이너 내부 경로 `/tmp/schema.sql` 을 Windows 경로로 자동 변환한 것으로,
> **dump 결함이 아니라 실행 환경(harness) 문제**였다. `MSYS_NO_PATHCONV=1` 로 해소했고
> 재실행 전 대상 DB 가 여전히 table 0개임을 확인했다. 숨기지 않고 기록한다.

---

## 7. 생성 객체 검증 (WO §18)

| 객체 | 복구 결과 | 기대 / 근거 |
|---|---:|---|
| **TABLES** | **291** | **291 (production 실측과 일치)** |
| schemas (비시스템) | **3** | `public` · `cosmetics` · `neture` |
| INDEXES | 1,171 | dump 의 `CREATE INDEX` 705 + PK/UNIQUE 제약이 자동 생성하는 index — 정합 |
| CONSTRAINTS | 614 | dump 의 `ADD CONSTRAINT` 543 + `CREATE TABLE` 내 inline NOT NULL/CHECK — 정합 |
| SEQUENCES | **10** | 10 |
| VIEWS | 1 | — |
| extensions | `plpgsql` · **`uuid-ossp`** | 요구 extension 설치 성공 |

**schema 별 table 분포 — production 과 완전 일치**

```text
public    = 275   (production 275)
cosmetics =  12   (production  12)
neture    =   4   (production   4)
합계      = 291   (production 291)
```

---

## 8. 핵심 table 확인 (WO §19)

11개 전부 **컬럼·index 까지 정상 생성**되었다.

| table | 컬럼 | index | 결과 |
|---|---:|---:|:---:|
| `users` | 38 | 7 | OK |
| `service_memberships` | 11 | 4 | OK |
| `role_assignments` | 13 | 8 | OK |
| `cms_contents` | 26 | 9 | OK |
| `checkout_orders` | 23 | 9 | OK |
| **`neture_orders`** | 25 | 8 | OK |
| `app_registry` | 11 | 5 | OK |
| `typeorm_migrations` | 3 | 1 | OK |
| `product_masters` | 26 | 11 | OK |
| `shared_product_descriptions` | 22 | 8 | OK |
| `store_cart_items` | 16 | 2 | OK |

> WO §19 가 명시한 `neture_orders` 는 실제로 dump 에 정의가 존재하며 정상 복구되었다.

---

## 9. 데이터 복구 검증 (WO §20 ~ §21)

schema-only 만으로는 **COPY 데이터 블록이 실제로 실행되는지** 증명되지 않으므로,
핵심 7개 table 의 데이터까지 별도 DB 에 복구했다.

| 항목 | 값 |
|---|---|
| 대상 DB | `o4o_restore_core_20260905` |
| 입력 | schema 전체 + 핵심 7 table 의 COPY 블록 (1.1 MB · COPY 7개) |
| 실행 | `psql -v ON_ERROR_STOP=1 -f core.sql` |
| **exit code** | **0** |
| **ERROR / FATAL / WARNING** | **0 / 0 / 0** |
| table 총수 | **291** |

### 9-1. 복구된 실제 row count vs production

| table | production | **복구된 DB 실측** | 결과 |
|---|---:|---:|:---:|
| `users` | 57 | **57** | **MATCH** |
| `service_memberships` | 42 | **42** | **MATCH** |
| `role_assignments` | 78 | **78** | **MATCH** |
| `cms_contents` | 129 | **129** | **MATCH** |
| `checkout_orders` | 23 | **23** | **MATCH** |
| `app_registry` | 2 | **2** | **MATCH** |
| `typeorm_migrations` | 654 | **654** | **MATCH** |

**7 / 7 완전 일치.** 이전 WO 의 "dump 파일 안의 줄 수" 대조와 달리, 이번에는
**실제 PostgreSQL 에 적재된 후의 row count** 이므로 COPY 블록의 실행 가능성이 실증되었다.

### 9-2. 제약 조건이 실제로 작동하는지 확인

복구된 DB 에 의도적으로 잘못된 INSERT 를 시도한 결과 **NOT NULL 제약이 정상 거부**했다.
→ 제약이 이름만 생성된 것이 아니라 **실제로 강제되고 있음**이 확인된다.
(거부 메시지에 실제 운영 데이터가 포함되어 본 문서에는 옮기지 않는다.)

### 9-3. Full dump 구조 재검증 (WO §20)

2.18 GiB 전체를 다시 스트리밍하며 데이터 블록 정합성을 확인했다.

| 항목 | 값 | 판정 |
|---|---:|:---:|
| `COPY` 시작 블록 | **291** | — |
| 데이터 종료자 (`\.`) | **291** | **1:1 대응** |
| **미종료 블록** | **0** | **PASS** |
| EOF 마커 (`PostgreSQL database dump complete`) | **존재** | **PASS** |

**모든 COPY 블록이 정상 종료**되며 잘린 구간이 없다.

> **full-data 전체 복구는 수행하지 않았다.** WO §22 가 schema restore PASS 를 prelaunch STOP 판정의
> 충분 조건으로 규정하고 있고, §21 은 소규모 data restore 를 권고하기 때문이다.
> 본 WO 는 그 기준을 **초과 달성**했다 (schema 전체 + 핵심 7 table 실데이터 + 전체 구조 스캔).

---

## 10. Backup / PITR 재확인 (WO §24 ~ §25) — 변경 0

| 항목 | 값 | 판정 |
|---|---|:---:|
| automated backup | enabled | 정상 |
| 최근 5회 | 2026-09-04 · 09-03 · 09-02 · 09-01 · 08-31 **전부 SUCCESSFUL** | 정상 |
| latest successful | **2026-09-04T18:00:00Z** | 정상 |
| PITR | **enabled** | 정상 |
| transaction log retention | **7일** | 정상 |
| retained backups | 7 | 정상 |

**설정을 조회만 했고 변경하지 않았다.**

---

## 11. Cloud SQL STOP readiness (WO §26)

| 조건 | 결과 |
|---|:---:|
| valid full export exists | **PASS** |
| gzip integrity | **PASS** |
| **export md5 = GCS object md5** | **PASS** |
| table coverage 291/291 | **PASS** |
| critical row-count 비교 | **PASS (7/7)** |
| **schema restore execution** | **PASS (exit 0 · error 0)** |
| **data restore execution (핵심 table)** | **PASS (exit 0 · row 7/7 일치)** |
| automated backup healthy | **PASS** |
| PITR healthy | **PASS** |
| UNKNOWN | **0** |

```text
판정: CLOUD_SQL_STOP_READY
```

WO §35 의 중지 조건(schema restore 실패 / table count ≠ 291 / constraint·index 실패 /
critical table 누락 / backup 최근 실패 / PITR 비정상 / hash·size 불일치 / UNKNOWN) **모두 해당 없음**.

---

## 12. STOP 운영 방식 및 canonical 명령 (WO §27 ~ §29) — 실행하지 않음

### 12-1. 운영 방식

```text
평상시 (서비스 미사용)         : Cloud SQL STOP
개발 / 배포 / 검증이 필요할 때 : START → health 확인 → 작업 → 다시 STOP
```

### 12-2. canonical 명령 (검증만 — 실행하지 않았다)

`gcloud sql instances` 에는 `stop` / `start` 하위 명령이 **없다.**
`patch --activation-policy` 가 canonical 이다.

```bash
# STOP
gcloud sql instances patch o4o-platform-db --activation-policy=NEVER

# START
gcloud sql instances patch o4o-platform-db --activation-policy=ALWAYS

# 상태 확인
gcloud sql instances describe o4o-platform-db \
  --format='value(state,settings.activationPolicy)'
```

현재 값: `ALWAYS` / `RUNNABLE` (변경 없음).

### 12-3. STOP 시 영향 (WO §28) — 반드시 인지

```text
o4o-core-api 의 DB 연결 실패 (api.neture.co.kr 의 DB 의존 엔드포인트 5xx)
admin / 각 서비스의 DB 기반 기능 전부 사용 불가
Cloud Run 컨테이너는 살아 있어도 DB 호출은 실패
```

즉 STOP 은 **"서비스를 사용하지 않는 시간"에만** 적용한다.
`o4o-core-api` 는 직전 WO 에서 `minScale=0` 이 되어 cold start 약 15.8초가 추가되므로,
**STOP 상태에서의 첫 접속은 "DB 기동 + 컨테이너 cold start"** 가 겹친다는 점을 운영 시 고려한다.

---

## 13. 임시 자원 정리 (WO §31)

| 대상 | 결과 |
|---|:---:|
| `o4o_restore_verify_20260905` | **dropdb 완료** |
| `o4o_restore_core_20260905` | **dropdb 완료** |
| 컨테이너 `pg-restore-verify` | **삭제** |
| image `postgres:15-alpine` | **삭제** |
| 임시 파일 (gz · schema.sql · core.sql · 로그 · awk) | **전부 삭제** |
| `C:/tmp/o4o-restore-verify/` | **삭제 완료** |
| Docker Desktop | 본 WO 에서 기동했다가 **다시 종료** (작업 전 상태로 원복) |
| **GCS export object** | **보존** (삭제하지 않음) |

디스크는 작업 전후 모두 약 15 GB 로 동일하다.

---

## 14. 변경 / 부작용

| 항목 | 값 |
|---|:---:|
| **production DB write** | **0** |
| **production schema change** | **0** |
| **migration** | **0** |
| **Cloud SQL 설정 변경** | **0** (STOP · resize · PITR · backup 전부 미실행) |
| production DB 접속 자체 | **0회** — 본 WO 는 GCS export 사본만 사용했다 |
| DNS / LB 변경 | **0** |
| 코드 변경 | **0** — 산출물은 본 CHECK 1개 |
| **UNKNOWN** | **0** |

### 14-1. 부수 관찰 (범위 밖 · 조치하지 않음)

`%APPDATA%\postgresql\pgpass.conf` 에 **production DB 접속 자격증명이 평문으로 저장**되어 있다.
pgpass 는 표준 메커니즘이고 사용자 계정 권한으로 보호되지만, production 자격증명이라는 점에서
기존 `자격증명 교체 대기` 항목과 함께 후속 검토 대상으로 **기록만** 한다. 파일은 변경하지 않았고
비밀번호 값은 본 문서 어디에도 남기지 않았다.

---

## 15. 최종 판정 (WO §37)

| 완료 기준 | 결과 |
|---|:---:|
| schema restore execution PASS | **PASS** |
| tables = 291 | **PASS** |
| critical schemas/tables present | **PASS** (11/11) |
| SQL error = 0 | **PASS** |
| full dump integrity evidence | **PASS** |
| backup healthy | **PASS** |
| PITR healthy | **PASS** |
| production DB write = 0 | **PASS** |
| Cloud SQL config change = 0 | **PASS** |
| UNKNOWN = 0 | **PASS** |

```text
PRODUCTION_DB_RESTORE_VERIFIED
CLOUD_SQL_STOP_READY
```

선행 WO 에서 `VALID_EXPORT_WITHOUT_FULL_RESTORE_TEST` 로 유보했던 판정이
**restore 실행 검증 완료로 해소**되었다.

---

## 16. 다음 WO

```text
WO-O4O-CLOUD-SQL-PRELAUNCH-STOP-OPERATION-TRANSITION-V1
→ gcloud sql instances patch o4o-platform-db --activation-policy=NEVER
→ START 후 RUNNABLE / API health / DB connection 까지의 소요 시간 실측 (WO §30)
→ 예상 절감 월 약 $58.7 (약 8.2만원)
   현재 약 $104.7 (146,600원) → 약 $46.0 (64,400원)
```

부수 잔여 항목: classic certificate `cert-final-neture-v3` 정리 (LB 변경 허용 범위에서).

---

## 17. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```
