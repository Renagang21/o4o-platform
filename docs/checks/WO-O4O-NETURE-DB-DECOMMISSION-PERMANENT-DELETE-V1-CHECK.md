# CHECK — WO-O4O-NETURE-DB-DECOMMISSION-PERMANENT-DELETE-V1

- 작업일: 2026-08-18
- 판정: **ORPHAN_CONFIRMED → 영구 삭제 완료**
- 선행: `IR-CLOUDSQL-COST-CAPACITY-AUDIT` (유휴 `neture-db` 지목) · `WO-O4O-REDIS-SESSIONSYNC-REMOVAL-V1`

---

## 1. 대상 리소스 정체

| 항목 | 값 |
|---|---|
| 종류 | **Cloud SQL instance** (내부 database 만이 아님) |
| Project | `netureyoutube` (표시 이름 `neture-services`) |
| Instance | `neture-db` |
| Connection name | `netureyoutube:asia-northeast3:neture-db` |
| Engine | PostgreSQL **17** |
| Region | `asia-northeast3` |
| Tier | `db-g1-small` · disk 10GB(autoresize) |
| 생성 | 2025-12-21T03:14Z |
| 상태(조사 시작 시) | STOPPED (`activationPolicy: NEVER`) |
| Public IP | 34.22.71.145 (authorizedNetworks 없음) |
| Private IP / VPC | 없음 |
| Deletion protection | **true** (삭제 전 해제) |
| Backup / PITR | enabled · 7일 보존 · PITR on |
| 내부 database | `postgres` · `neture` (+ `template1`) |
| 내부 user | `postgres` · `neture_admin` |

**프로덕션 DB (대조군)**

| 항목 | 값 |
|---|---|
| Instance | `o4o-platform-db` (POSTGRES_15, `db-custom-1-3840`, RUNNABLE) |
| Database | `o4o_platform` |
| User | `o4o_api_v2` |
| 접속 | `/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db` |

instance · engine 버전 · database 명 · user 명이 **하나도 겹치지 않는다.** 식별자 혼동 가능성 없음.

---

## 2. 소비처 Census — 전부 0

### 2-1. Google Cloud

| 대상 | 결과 |
|---|---|
| Cloud Run 12개 서비스의 `cloudsql-instances` 주석 | `o4o-core-api` → `o4o-platform-db` **1건뿐**. `neture-db` 연결 **0** |
| Cloud Run 전 서비스 spec 전문 grep (`neture-db`, `34.22.71.145`) | **0건** |
| `o4o-core-api` DB env | `DB_HOST=/cloudsql/…o4o-platform-db` · `DB_NAME=o4o_platform` · `DB_USERNAME=o4o_api_v2` |
| Secret Manager | `cosmetics-db-password` 1건뿐 · **참조 서비스 0** (아래 §6) |
| VPC Access Connector | **0개** (선행 Redis WO 에서 폐기) |
| Cloud Scheduler | **API 자체 미활성** → 예약 작업 0 |
| Service Account | 2개(compute 기본 · github-actions) — 인스턴스 전용 권한 없음 |

### 2-2. 코드 / CI

| 대상 | 결과 |
|---|---|
| 저장소 전체 grep (`neture-db`, 인스턴스 IP, `cosmetics-db-password`) | **6 파일** — 전부 `cloud-deploy/**` 의 미배포 scaffold + `SETUP.md` 1줄 + IR 기록물 1줄 |
| `.github/workflows/**` | Cloud SQL 참조는 전부 `o4o-platform-db` (deploy-api.yml 4곳). `neture-db` **0건** |
| 로컬 `apps/api-server/.env` | `DB_NAME=o4o_platform` · `neture-db` 참조 0 |
| `start-cloud-sql-proxy.cmd` | `INSTANCE_CONNECTION_NAME=…o4o-platform-db` |

`cloud-deploy/cosmetics-api` 는 2025-12-21 커밋 `5fd41d2de` (*"wip: Firebase hosting and cloud-deploy setup (in progress)"*) 의 미완성 scaffold 이며, 기본값이 `DB_NAME=neture` · `DB_USER=neture_admin` 으로 **삭제 대상 인스턴스와 정확히 일치**한다. 해당 `cosmetics-api` Cloud Run 서비스는 **존재하지 않는다**.

### 2-3. Runtime (연결 실측)

Cloud Monitoring `postgresql/num_backends`, 60일 창, database 별:

| database | 60일 최대 동시 연결 | 일평균 |
|---|---:|---|
| `cloudsqladmin` (Cloud SQL 내부) | 3 | 상시 |
| `neture` | 2 | **0.001~0.01** (사실상 상시 0) |
| `postgres` | 1 | 0 |
| `template1` | 1 | 0 |

애플리케이션 연결(풀)은 상시 수 개가 유지된다 — 실제로 프로덕션 `o4o-platform-db` 는 `activeConnections: 10` 이다. `neture` 의 평균 0.003 은 내부 통계 수집·autovacuum 수준의 순간 연결이며 **애플리케이션 트래픽이 아니다.**

디스크 사용량은 60일간 231.5 → 231.7 MiB 로 **평탄** (데이터 증가 없음).

### 2-4. 관리 이력 (audit log, 400일)

`cloudsql.instances.*` 호출은 자동 백업 외에 **2026-08-18 02:32Z 의 stop(`activationPolicy: NEVER`) 1건뿐**. 즉 인스턴스는 오늘 새벽 사용자 조작으로 정지되었고, 그 이전에도 사용자 접속 흔적은 없다. (정지 기간이 짧다는 점은 아래 §3 의 내용 검증으로 보완했다.)

---

## 3. 삭제 전 안전 확인 — 결정적 증거

관찰 기간이 짧으므로 **연결 통계에 의존하지 않고 내용 자체를 확인**했다. 인스턴스를 일시 기동한 뒤 두 database 를 GCS 로 최종 export 했다.

| export | 크기(gz) | 내용 |
|---|---:|---|
| `neture` | **451 B** | `GRANT ALL ON SCHEMA public` 한 줄. **테이블 0 · 데이터 0** |
| `postgres` | **449 B** | 동일. 시스템 database |

즉 `neture-db` 는 **빈 껍데기 인스턴스**였다. 231 MiB 는 PostgreSQL 시스템/WAL 오버헤드다. 프로덕션 데이터와의 row 차이 비교 자체가 성립하지 않는다.

- 최종 export 위치: **`gs://neture-db-final-export/`** (asia-northeast3 · uniform access · public access prevention **enforced** · 총 900 B)
- 삭제 직전 ON_DEMAND 백업 1건(2026-08-18 02:30Z)도 존재했으나, 인스턴스 삭제와 함께 소멸하므로 위 GCS export 가 유일한 영구 보존물이다.

---

## 4. 삭제 실행

1. `gcloud sql instances patch neture-db --activation-policy=ALWAYS` (검사 목적 일시 기동)
2. database/user 목록 확인 · 2개 database GCS export
3. `gcloud sql instances patch neture-db --no-deletion-protection` → `deletionProtectionEnabled: false`
4. `gcloud sql instances delete neture-db` → **DONE**
5. 잔여 확인: 인스턴스 목록에 `o4o-platform-db` **1개만** 남음. 백업은 인스턴스와 함께 소멸(조회 시 403). 예약 IP·VPC connector 등 관련 잔여 리소스 **없음** (`neture-static-ip` 는 웹 LB 용으로 DB 무관 · 유지)

**삭제 대상은 instance 전체**였고, 프로덕션 인스턴스 `o4o-platform-db` 는 어떤 조작도 하지 않았다.

---

## 5. 삭제 후 Production 검증

| 항목 | 결과 |
|---|---|
| Cloud Run revision | `o4o-core-api-03364-jsw` Ready=**True** |
| `GET /health` | **200** |
| `GET /health/database` | **healthy** · pingMs 3 · activeConnections 10 |
| `GET /health/detailed` | status **healthy** (database + system) |
| 로그인 1회 (`pharmacy-hub`, SSOT 계정) | **success: true** |
| 인증 read 경로 `GET /api/v1/auth/me` | **200** · 사용자 프로필 정상 반환 |
| `GET /api/v1/auth/status` | **200** |
| Cloud Run `severity>=ERROR` (최근 1시간) | **0건** |
| DB connection error 로그 | **0건** |

---

## 6. 저장소 · 잔재 정리

| 대상 | 처리 |
|---|---|
| `cloud-deploy/` (7 파일) | **삭제** — 삭제된 인스턴스를 가리키는 미배포 scaffold(`cosmetics-api`). Cloud Run 서비스 부재, CI·워크스페이스 참조 0 |
| `SETUP.md:157` | `neture-db` 예시 문구 → 현재 인스턴스가 `o4o-platform-db` 하나뿐임을 명시하도록 수정 |
| Secret Manager `cosmetics-db-password` | **삭제** — 삭제된 인스턴스의 `neture_admin` 비밀번호. 2025-12-21 생성 후 참조 서비스 0. 삭제 후 프로젝트에 남은 secret 없음 |
| `docs/ir/IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-FINAL-IMPACT-AUDIT-V1.md:145` | **유지** — 기록물 (CLAUDE.md §16-1) |
| 프로덕션 DB 설정(`deploy-api.yml`, `.env`, proxy 스크립트) | **무변경** |

---

## 7. 결론

`neture-db` 는 2025-12-21 cosmetics-api scaffold 와 함께 만들어졌다가 배포되지 않은 **빈 고아 인스턴스**로, 코드·CI·Cloud Run·Secret·연결 실측 어디에도 소비처가 없었다. `ORPHAN_CONFIRMED` 로 판정하고 최종 export 확보 후 영구 삭제했으며, 프로덕션은 삭제 전후 모두 정상이다.

절감: `db-g1-small` 인스턴스 + 10GB 디스크 + 7일 백업/PITR 스토리지 (선행 IR 추정 기준 월 $30~40 수준).
