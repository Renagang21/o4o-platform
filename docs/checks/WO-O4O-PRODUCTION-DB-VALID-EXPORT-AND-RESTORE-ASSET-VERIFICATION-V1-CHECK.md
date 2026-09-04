# WO-O4O-PRODUCTION-DB-VALID-EXPORT-AND-RESTORE-ASSET-VERIFICATION-V1 — CHECK

> **성격**: production DB **export 생성 + 검증**. DB write 0 · schema 변경 0 · migration 0.
> **허용된 변경**: ① 신규 export object 1개 생성 ② 대상 버킷 IAM 최소 권한 1건 부여.
> **산출물**: 본 CHECK 1개.
> **작성일**: 2026-09-04

---

## 1. 기준선 (WO §4)

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `38a6b87e2c046779b300ec98b997ce90f694a746` |
| 브랜치 | `main` (시작 시 clean) |
| project / instance | `netureyoutube` / `o4o-platform-db` |

---

## 2. Production DB 현재 상태 (WO §5)

| 항목 | 값 |
|---|---|
| instance | `o4o-platform-db` · POSTGRES_15 · `asia-northeast3` · RUNNABLE |
| **instance 내 database** | **`postgres` · `o4o_platform` · `test`** (3개) |
| 대상 database | **`o4o_platform`** |
| **database 크기** | **2892 MB** (3,032,735,079 bytes) |
| `postgres` / `test` 크기 | 각 7623 kB (사실상 빈 유지보수 DB) |
| **전체 table 수** | **291** |
| ↳ schema 분포 | `public` **275** · `cosmetics` **12** · `neture` **4** |
| 접속 계정 | `o4o_api_v2` (Secret Manager `o4o-db-password` runtime read) |

**상위 8개 table (크기순)**: `product_candidates` 938MB · `shared_product_descriptions` 587MB ·
`product_identifiers` 492MB · `product_master_cleanup_audits` 313MB · `product_masters` 277MB ·
`product_landings` 87MB · `product_drug_extensions` 76MB · `representative_products` 31MB

**core table 행 수 (production 실측)**:

| table | rows |
|---|---:|
| `users` | 57 |
| `service_memberships` | 42 |
| `role_assignments` | 78 |
| `cms_contents` | 129 |
| `checkout_orders` | 23 |
| `app_registry` | 2 |
| `typeorm_migrations` | 654 |

---

## 3. 기존 export 실패 원인 (WO §6 · §7)

### 3-1. object 메타데이터

| object | size | created | Content-Type | Storage Class |
|---|---:|---|---|---|
| `neture-db_neture_20260818.sql.gz` | **451 B** | 2026-08-18T07:21:22Z | `application/x-sql` | STANDARD |
| `neture-db_postgres_20260818.sql.gz` | **449 B** | 2026-08-18T07:24:21Z | `application/x-sql` | STANDARD |

### 3-2. 실제 내용 검사

| 검사 | `_neture_` | `_postgres_` |
|---|---|---|
| gzip integrity (`gzip -t`) | **PASS** | **PASS** |
| 압축 해제 크기 | **785 B** | **785 B** |
| `CREATE TABLE` | **0** | **0** |
| `COPY` | **0** | **0** |

내용은 `pg_dump` 서두(`SET statement_timeout` 등 SET 11줄) + `GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;`
**단 1개의 실행문**뿐이다. **schema 0 · data 0.**

### 3-3. 판정 및 근본 원인

```text
판정: EMPTY_EXPORT  (양쪽 모두)
```

**근본 원인이 확정되었다.** object 이름의 database 부분이 `neture` 와 `postgres` 다.

- 이 인스턴스에 **`neture` 라는 database 는 존재하지 않는다** (있는 것은 `postgres` · `o4o_platform` · `test`).
  `neture` 는 **database 가 아니라 `o4o_platform` 안의 schema** (4개 table)다 → 이름 혼동.
- `postgres` 는 비어 있는 유지보수 database → export 해도 내용이 없다.
- **즉 실제 데이터가 있는 `o4o_platform` 은 애초에 export 대상이 아니었다.**

파일 포맷은 정상이었기 때문에 "export 명령 성공" 으로 보였고, 그래서 지금까지 유효한 백업으로 오인되었다.
**UNKNOWN = 0** (원인 확정).

> WO §24 에 따라 기존 2개 object 는 **삭제하지 않았다.** `INVALID_RESTORE_ASSET` 로 표시한다.

---

## 4. Bucket 권한 (WO §11)

export 실행 전 권한을 확인했고, 부족분만 최소 범위로 부여했다.

| 항목 | 내용 |
|---|---|
| 필요 권한 | `storage.objects.create` (Cloud SQL export 가 대상 버킷에 object 를 씀) |
| **현재 권한** | 현 Cloud SQL SA `p117791934476-6z3d7w@gcp-sa-cloud-sql.iam.gserviceaccount.com` → **바인딩 0건** |
| 기존 `objectAdmin` 바인딩 | **삭제된 서비스 계정**(`deleted:serviceAccount:p117791934476-gi9qvd@…`) 앞으로 남아 있던 것 → 무효 |
| **부여한 권한** | **`roles/storage.objectCreator`** · **`gs://neture-db-final-export` 버킷 한정** |
| 부여하지 않은 것 | Owner · Editor · objectAdmin · 프로젝트 레벨 권한 **전부 부여 안 함** |

> 기존 export 가 왜 이 버킷에 쓰였는지는 당시 SA 가 달랐기 때문이며(현재는 삭제됨), 권한 문제와
> §3-3 의 잘못된 database 지정은 별개 사안이다.

---

## 5. 신규 export 생성 (WO §8 ~ §10)

**Cloud SQL canonical export 기능** 사용 (임의 `pg_dump` 스크립트 아님).

```bash
gcloud sql export sql o4o-platform-db \
  gs://neture-db-final-export/o4o-platform-db-full-20260904-1420.sql.gz \
  --database=o4o_platform --offload
```

| 항목 | 값 |
|---|---|
| 방식 | Cloud SQL export (serverless / `--offload`) |
| database | **`o4o_platform`** (전체 · 부분 table export 아님) |
| format | SQL · gzip |
| **신규 object** | **`o4o-platform-db-full-20260904-1420.sql.gz`** |
| 기존 object overwrite | **없음** (신규 이름) |
| 결과 | `exit code 0` · `Exported [...] to [gs://...]` |

> `--offload` 는 임시 인스턴스를 쓰는 serverless export 로 **소액의 추가 비용**이 발생한다
> (gcloud 가 경고 출력). 운영 인스턴스 부하를 피하려는 선택이며 1회성이다.

---

## 6. Export 검증 (WO §12 ~ §16)

### 6-1. 크기 (WO §12)

| 항목 | 값 |
|---|---:|
| **압축 크기** | **332,743,248 B = 317.33 MiB** |
| **압축 해제 크기** | **2,336,045,407 B = 2.18 GiB** |
| 기존 empty export 대비 | **451 B → 332,743,248 B (약 738,000배)** |

> 크기만으로 정상 판정하지 않는다 (WO §12). 아래 §6-2~§6-5 가 실질 근거다.

### 6-2. gzip / 파일 integrity (WO §13)

| 검사 | 결과 |
|---|---|
| `gzip -t` | **PASS** |
| 압축 해제 전체 스트리밍 | **PASS** (2.18 GiB 끝까지 오류 없음) |
| **EOF 마커** | 마지막 줄에 **`-- PostgreSQL database dump complete`** + `\unrestrict …` 존재 → **truncate 아님** |

### 6-3. SQL 구조 (WO §14)

전체 내용을 출력하지 않고 **구조만** 집계했다 (스트리밍 grep).

| statement | 개수 |
|---|---:|
| `CREATE TABLE` | **291** |
| `COPY` | **291** |
| `CREATE INDEX` | **705** |
| `ADD CONSTRAINT` | **543** |
| `CREATE SEQUENCE` | 10 |
| `CREATE SCHEMA` | 2 (`cosmetics` · `neture`) |

### 6-4. table coverage (WO §16)

| 항목 | 값 | 판정 |
|---|---:|:---:|
| production 전체 table | **291** (public 275 + cosmetics 12 + neture 4) | — |
| export 내 `CREATE TABLE` | **291** | **완전 일치** |
| export 내 `COPY` (데이터 섹션) | **291** | **모든 table 에 데이터 섹션 존재** |

**차이 0.** 누락 table 없음.

### 6-5. 핵심 table 포함 및 행 수 대조 (WO §15)

10개 핵심 table 전부 **schema definition(`CREATE TABLE`) + data section(`COPY`) 양쪽 모두 존재**:
`users` · `service_memberships` · `role_assignments` · `cms_contents` · `checkout_orders` ·
`app_registry` · `typeorm_migrations` · `product_masters` · `shared_product_descriptions` · `store_cart_items`

**행 수 대조 (COPY 블록 실제 데이터 줄 수 vs production 실측)** — row 내용은 기록하지 않는다.

| table | production | export 내 데이터 행 | 일치 |
|---|---:|---:|:---:|
| `users` | 57 | **57** | O |
| `service_memberships` | 42 | **42** | O |
| `role_assignments` | 78 | **78** | O |
| `cms_contents` | 129 | **129** | O |
| `checkout_orders` | 23 | **23** | O |
| `app_registry` | 2 | **2** | O |
| `typeorm_migrations` | 654 | **654** | O |

**7 / 7 완전 일치.** export 가 실제 데이터를 담고 있음이 행 단위로 확인된다.

> 부수 확인: `store_events` 관련 statement **0건** — 직전 WO
> (`WO-O4O-FINAL-PRODUCTION-DB-RESIDUE-CLOSURE-V1`)의 DROP 결과와 일치한다.
> `app_registry` 2행도 동 WO 의 stale 4행 삭제 결과와 일치한다.

---

## 7. Restore 검증 (WO §17 ~ §20) — **미완료**

### 7-1. 시도한 경로와 결과

| 경로 | 결과 |
|---|---|
| **로컬 PostgreSQL 17** (`127.0.0.1:5432`, 서비스 기동 중, `psql`/`pg_restore` 존재) | **차단** — `pg_hba.conf` 가 전 접속에 `scram-sha-256` 요구. 로컬 superuser 비밀번호를 보유하지 않음. `pg_hba.conf` 변경은 범위 밖이라 하지 않음 |
| **Docker 격리 컨테이너** (`postgres:15-alpine`) | **실패** — Docker Desktop 기동 후 image pull 이 `input/output error` 로 중단. 원인은 **호스트 디스크 고갈** |
| production 인스턴스에 restore | **하지 않음** (WO §3 · §17 금지) |
| 임시 Cloud SQL 인스턴스 생성 | **하지 않음** (WO §19 비용 회피 · 비용 절감 트랙과 상충) |

### 7-2. 차단 원인: 호스트 디스크 고갈

```text
C: 223G 중 여유  1.8 GB (작업 시작 시점)
              →  228 MB (현재)
```

**이 디스크 압박은 이번 작업 이전부터 존재했다** (시작 시 이미 여유 1.8 GB / 사용률 100%).
2.18 GiB SQL 을 restore 하려면 최소 3~4 GB 가 필요해 **full data restore 는 애초에 불가능**했다.

### 7-3. 판정

```text
VALID_EXPORT_WITHOUT_FULL_RESTORE_TEST   (WO §20)
```

WO §20 이 요구한 대체 검증 항목은 **전부 통과**했다:

| §20 요구 항목 | 결과 |
|---|:---:|
| gzip integrity | **PASS** (§6-2) |
| SQL parse 가능 (구조 판독) | **PASS** (§6-3, EOF 마커 포함) |
| schema / data statements 존재 | **PASS** (291 / 291) |
| table coverage | **PASS** (291 = 291, 누락 0) |

여기에 WO 가 요구하지 않은 **행 수 대조(7/7 정확 일치, §6-5)** 를 추가로 통과했다.
다만 **"SQL 이 실제로 실행되어 DB 가 재구성되는지"** 는 아직 증명되지 않았다.

---

## 8. Backup / PITR 상태 (WO §21)

**설정을 변경하지 않았다** (조회만).

| 항목 | 값 | 판정 |
|---|---|:---:|
| automated backup | **enabled** · startTime 18:00 · backupTier STANDARD | 정상 |
| retention | **7개 (COUNT)** | 정상 |
| **PITR** | **enabled** · `replicationLogArchivingEnabled: true` | 정상 |
| transaction log 보존 | **7일** · CLOUD_STORAGE | 정상 |
| 최근 backup | **5회 연속 SUCCESSFUL** (2026-08-30 ~ 09-03, 전부 AUTOMATED) | 정상 |

→ WO §29 의 "Cloud SQL backup 실패 상태 / PITR 비정상" **해당 없음**.

---

## 9. Storage 보존 정책 (WO §23 · §24) — 조사만

| 항목 | 현재 | 비고 |
|---|---|---|
| bucket | `gs://neture-db-final-export` · `ASIA-NORTHEAST3` | — |
| storage class | **STANDARD** | 신규 export 도 STANDARD |
| **lifecycle rule** | **없음** | 변경하지 않음 (WO §23: 조사만) |
| versioning | 미설정 | — |
| 신규 export 비용 | 317 MiB × $0.023/GB ≈ **$0.007 / 월** | 사실상 무시 가능 |

**Nearline/Coldline 전환 후보로 기록만 한다.** 317 MiB 규모에서는 절감액이 월 $0.005 미만이라
**전환 실익이 없다** — 오히려 조기 삭제 최소 보존기간 제약만 생긴다. **STANDARD 유지 권장.**

기존 empty export 2개는 **삭제하지 않았다** (WO §24) → `INVALID_RESTORE_ASSET` 표시.

---

## 10. 변경 / 부작용

| 항목 | 값 |
|---|---|
| **production DB write** | **0** |
| **schema 변경** | **0** |
| **migration** | **0** |
| DB 데이터 수정 | **0** |
| 기존 export 삭제 | **0** |
| 기존 bucket 삭제 | **0** |
| backup / PITR 설정 변경 | **0** |
| **생성한 것** | export object **1개** |
| **부여한 IAM** | `roles/storage.objectCreator` (버킷 한정) **1건** |
| credentials 출력 / 기록 | **0** (Secret Manager 값은 프로세스 환경변수로만 전달) |
| 코드 변경 | **0** — 산출물은 본 CHECK 1개 |

### 10-1. 환경에 남긴 영향 (정직하게 기록)

- **Docker Desktop 을 기동했다가 다시 종료**했다. 컨테이너·이미지는 **생성되지 않았다**
  (pull 이 commit 단계에서 실패). daemon 은 작업 전 상태(미기동)로 되돌렸다.
- 다만 pull 시도 중 Docker 의 VM 디스크(`docker_data.vhdx`, 현재 10.53 GB)가 커지면서
  **호스트 여유 공간이 약 1.6 GB 추가로 줄었다** (1.8 GB → 228 MB).
  이 vhdx 에는 **사용자의 기존 이미지**가 들어 있어 임의로 정리하지 않았다.
  회수를 원하면 `docker system prune -a` 후 vhdx compact 가 필요하며 **사용자 판단 사항**이다.
- 다운로드했던 export 로컬 사본(318 MB)은 **삭제**했다 (검증은 GCS 스트리밍으로 수행 가능).

---

## 11. 최종 판정

| WO §31 완료 기준 | 결과 |
|---|:---:|
| new export exists | **PASS** |
| new export non-empty | **PASS** (317 MiB / 2.18 GiB) |
| gzip integrity PASS | **PASS** |
| schema/data present | **PASS** (291 / 291) |
| core tables present | **PASS** (10/10, 행 수 7/7 일치) |
| **restore verification PASS** | **미완료** (§7) |
| production DB write = 0 | **PASS** |
| schema change = 0 | **PASS** |
| migration = 0 | **PASS** |
| UNKNOWN = 0 | **PASS** |

### 판정: `VALID_EXPORT_WITHOUT_FULL_RESTORE_TEST`

`PRODUCTION_DB_VALID_RESTORE_ASSET_READY` 는 **아직 선언하지 않는다.**
WO §31 이 `restore verification PASS` 를 완료 조건으로 명시하고 있고, §7 의 restore 실행 검증이
호스트 환경 제약으로 미완료이기 때문이다.

> **단, 이것은 "export 가 의심스럽다" 는 뜻이 아니다.** §6 의 증거(EOF 마커 · 291/291 coverage ·
> 핵심 table 7/7 행 수 정확 일치)는 **기존 empty export 와 질적으로 완전히 다른 수준**이며,
> 실무적으로 유효한 복구 자산일 가능성이 매우 높다. 남은 것은 "SQL 이 실제로 실행되는가" 1가지다.

---

## 12. 다음 단계 — restore 검증 완료 방법 (택 1)

| 방안 | 필요한 것 | 소요 | 비용 |
|---|---|---|---|
| **A. 로컬 PostgreSQL 17 (권장)** | **로컬 `postgres` 계정 비밀번호** | 짧음 | $0 |
| B. 디스크 확보 후 Docker | 약 4 GB 여유 공간 | 중간 | $0 |
| C. 임시 Cloud SQL 인스턴스 | 사용자 승인 (WO §19 는 비용상 비권장) | 중간 | 소액 |

> **A 는 디스크가 부족해도 가능하다.** schema-only restore(데이터 제외, 약 50 MB)만으로도
> 291개 `CREATE TABLE` + 705개 index + 543개 constraint 가 실제로 실행되는지 증명할 수 있다.
> 여기에 §6-5 의 행 수 일치를 합치면 full restore 와 실질적으로 동등한 확신을 얻는다.

---

## 13. 비용 절감 WO 진행 가능 여부 (WO §22 · §25)

| 전제 조건 | 상태 |
|---|:---:|
| 새 valid export 존재 | **YES** |
| restore 검증 PASS | **미완료** |
| automated backup 정상 | **YES** (5회 연속 성공) |
| PITR 정상 | **YES** |
| UNKNOWN = 0 | **YES** |

**판단**: `WO-O4O-GCP-PRELAUNCH-COST-REDUCTION-EXECUTION-V1` 의 항목 중

- **Artifact Registry cleanup · dead Cloud Run 삭제 · 실패 인증서 삭제 · `o4o-core-api` minScale 0**
  → **DB 와 무관하므로 지금 진행 가능**
- **Cloud SQL STOP 운영 전환**
  → **§12 의 restore 검증을 마친 뒤 진행**할 것을 권고한다 (WO §2 의 선행 조건).

또한 backup/PITR 축소는 이전 census CHECK 에서 이미 **비권장**으로 판정했고, 본 WO 에서도 설정을 바꾸지 않았다.

---

## 14. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
