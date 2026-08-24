# CHECK-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1

- **WO**: WO-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1
- **수행일**: 2026-08-24
- **상태**: NOT_CLOSED (Secret 이관 완료 / 네트워크·TLS hardening 권한 차단으로 보류)

> 본 문서에는 secret 값을 기록하지 않는다. 이름·참조 방식·길이만 기록한다.

---

## 1. 기준 main commit

```
branch : main (== origin/main, 작업 시작 시 clean)
HEAD   : 6cf2d935cd77c64bbfc7eedd2b0984f97975bba5
```

작업 중 다른 세션의 CI 배포 1건(`Deploy API Server` @05:52Z)이 완료됨을 확인한 뒤 진행했다.
진행 중이던 워크플로는 `CI Pipeline` 뿐이며 Cloud Run 설정을 변경하지 않는다.

---

## 2. Cloud SQL users

| user | type | 비고 |
|---|---|---|
| `o4o_api` | BUILT_IN | 이전 rotation 대상 (Cloud Run **Job 7개**가 구 credential 보유) |
| `o4o_api_v2` | BUILT_IN | **production runtime 계정** (본 WO 미rotation) |
| `postgres` | BUILT_IN | 이전 rotation 대상 |

instance: `o4o-platform-db` / POSTGRES_15 / `db-custom-1-3840` /
connectionName `netureyoutube:asia-northeast3:o4o-platform-db`

---

## 3. DB consumer census (전수)

### Cloud Run services (10개)

| service | cloudsql-instances | DB env | production critical |
|---|---|---|---|
| glucoseview-web | 없음 | 없음 | no (DB 미접속) |
| glycopharm-web | 없음 | 없음 | no |
| k-cosmetics-web | 없음 | 없음 | no |
| kpa-branch-web | 없음 | 없음 | no |
| kpa-society-web | 없음 | 없음 | no |
| neture-web | 없음 | 없음 | no |
| o4o-admin-dashboard | 없음 | 없음 | no |
| o4o-admin-dashboard-dev | 없음 | 없음 | no |
| **o4o-core-api** | `netureyoutube:asia-northeast3:o4o-platform-db` | DB_* 6종 | **yes** |
| pharmacy-hub-web | 없음 | 없음 | no |

→ **DB 직접 연결 서비스는 `o4o-core-api` 단 1개.** 나머지 9개는 프런트 SSR/정적 서비스로 DB env 자체가 없다.

### Cloud Run jobs (8개) — 전부 Cloud SQL 연결

| job | DB user | 최근 실행 |
|---|---|---|
| **o4o-api-migrations** | `o4o_api_v2` | 2026-08-24 05:59Z 성공 |
| o4o-drug-representative-grouping | `o4o_api` | 2026-07-04 |
| o4o-drug-seed-candidate-import | `o4o_api` | 2026-07-03 |
| o4o-drug-seed-promotion-apply | `o4o_api` | 휴면 |
| o4o-drug-shared-desc-bulk-canonical | `o4o_api` | 휴면 |
| o4o-easy-drug-image-copy | `o4o_api` | 휴면 |
| o4o-easy-drug-seed-candidate-import | `o4o_api` | 휴면 |
| o4o-easy-drug-shared-description-derive | `o4o_api` | 2026-07-04 |

**DB consumer 미조사 = 0건.**

모든 consumer가 **Unix socket `/cloudsql/...`** 경로를 사용한다. public IP 문자열을 직접 참조하는 runtime은 0건.

runtime service account는 전부 `117791934476-compute@developer.gserviceaccount.com` (기본 compute SA).

---

## 4. `o4o_api_v2` runtime 사용 확인

`o4o-core-api` ready revision configuration 기준:

```
DB_USERNAME = o4o_api_v2   (literal)
DB_HOST     = /cloudsql/netureyoutube:asia-northeast3:o4o-platform-db
DB_NAME     = o4o_platform
```

추가 증거: `o4o-api-migrations` job(동일 `o4o_api_v2`)이 2026-08-24 05:59Z 성공 종료.

→ **production 실사용 계정 = `o4o_api_v2` 확정.** WO §29 중단 조건(`o4o_api`/`postgres` 사용 중) 해당 없음.

---

## 5. Secret Manager census

### 이관 전

| secret | 용도 |
|---|---|
| cafe24-client-id | Cafe24 OAuth |
| cafe24-client-secret | Cafe24 OAuth |
| o4o-encryption-key | ENCRYPTION_KEY |

→ **DB password secret 부재.**

### 이관 후 (신규)

| secret | version | 길이 | IAM |
|---|---|---|---|
| **o4o-db-password** | 1 (ENABLED) | 40 bytes (원본 literal 길이와 일치) | `roles/secretmanager.secretAccessor` → `117791934476-compute@developer.gserviceaccount.com` (**secret 단위 바인딩**) |

naming convention은 기존 `o4o-encryption-key` 를 따랐다. IAM 범위도 기존 secret과 동일하게 **프로젝트 전역이 아닌 secret 단위**로만 부여했다.

---

## 6. literal env 존재 여부 (이관 전 → 후)

`o4o-core-api` env 24개 중 민감 항목:

| env | 이관 전 | 이관 후 |
|---|---|---|
| **DB_PASSWORD** | literal (len 40) | **secretKeyRef `o4o-db-password:latest`** |
| ENCRYPTION_KEY | secretKeyRef | secretKeyRef (변경 없음) |
| CAFE24_CLIENT_SECRET | secretKeyRef | secretKeyRef (변경 없음) |
| JWT_SECRET | literal (len 30) | literal (미변경 — §17 잔여) |
| JWT_REFRESH_SECRET | literal (len 30) | literal (미변경 — §17 잔여) |
| GEMINI_API_KEY | literal (len 39) | literal (미변경 — §17 잔여) |
| SMTP_PASS | literal (CI 주입) | literal (미변경 — §17 잔여) |
| TOSS_PAYMENTS_* | 빈 값 | 빈 값 (기존 상태) |

→ **DB password literal = 0건.** 그 외 평문 secret은 WO §27 우선순위("2. o4o_api_v2 literal env → Secret Manager") 범위 밖이므로 손대지 않고 §17에 잔여로 기록한다.

---

## 7. Secret Manager 이관 결과

수행 순서 (WO §9.2 원칙대로 **password 값은 변경하지 않고 저장 위치만 이동**):

1. 현재 revision env 값을 stdout 경유 없이 파이프로 `gcloud secrets create o4o-db-password --data-file=-` 에 주입
2. 길이 검증 40 bytes (원본과 동일, trailing newline 없음)
3. secret 단위 `secretAccessor` 부여
4. `gcloud run services update o4o-core-api --remove-env-vars=DB_PASSWORD --update-secrets=DB_PASSWORD=o4o-db-password:latest`
   → **단일 명령/단일 revision** (DB_PASSWORD 부재 revision이 중간에 생기지 않도록)
5. `gcloud run jobs update o4o-api-migrations` 에 동일 적용

| 대상 | 이관 전 revision | 이관 후 revision |
|---|---|---|
| o4o-core-api | `o4o-core-api-03451-nvf` | **`o4o-core-api-03452-hdz`** (100% traffic) |
| o4o-api-migrations (job) | literal | secretKeyRef |

기존 revision은 삭제하지 않았다.

### CI 워크플로 동기화 (필수)

`.github/workflows/deploy-api.yml` 이 매 배포마다 `--set-env-vars="DB_PASSWORD=${{ secrets.GCP_DB_PASSWORD }}"` 로 literal을 **재주입**하고 있었다. 워크플로를 고치지 않으면 이번 이관은 다음 배포에서 원복된다.

- Cloud Run deploy: `--set-env-vars DB_PASSWORD` → `--update-secrets="DB_PASSWORD=o4o-db-password:latest"`
- migration job create/update 2곳: `^::^` env 문자열에서 `DB_PASSWORD` 제거 + `--set-secrets="DB_PASSWORD=o4o-db-password:latest"` 추가
- `--update-secrets` 사용으로 기존 `ENCRYPTION_KEY` / `CAFE24_CLIENT_SECRET` secret 주입은 보존된다 (해당 2건이 `--set-env-vars` 반복 배포에도 유지돼 온 것이 경험적 근거)
- YAML 파싱 검증 통과

GitHub secret `GCP_DB_PASSWORD` 는 이제 미사용이 된다 (삭제는 별도 판단).

### CI 재배포 end-to-end 검증 (사후)

워크플로 수정 커밋(`fbe050940`) 푸시로 `Deploy API Server` 가 실제 실행됐고 **success** 로 종료했다.

| 검증 항목 | 결과 |
|---|---|
| workflow run 32698637283 | completed / success |
| 생성 revision | `o4o-core-api-03453-q6q` (100% traffic) |
| `DB_PASSWORD` | **secretKeyRef `o4o-db-password` 유지** (literal 재주입 없음) |
| `ENCRYPTION_KEY` / `CAFE24_CLIENT_SECRET` | secretKeyRef 보존 (`--update-secrets` 가 기존 secret 미삭제) |
| migration job (`--set-secrets` 경로) | 생성/갱신 후 실행 성공, `DB_PASSWORD` = secretKeyRef |
| `/health` · `/health/database` · `/api/v1/auth/status` | 200 · healthy(pingMs 4) · 200 |

→ 이관이 **CI 배포 사이클을 통과해 지속됨**을 확인했다 (일회성 수동 변경 아님).


---

## 8. runtime service account IAM

```
serviceAccount:117791934476-compute@developer.gserviceaccount.com
  → roles/secretmanager.secretAccessor  on secret o4o-db-password  (secret 단위)
```

기존 `o4o-encryption-key` 와 동일한 구조. 프로젝트 전역 secret 접근 부여는 하지 않았다.

---

## 9. Cloud SQL network 상태

| 항목 | 값 |
|---|---|
| public IP (`ipv4Enabled`) | **true** |
| private IP (`privateNetwork`) | **없음 (null)** |
| PSC | 미설정 |
| authorizedNetworks | **`124.194.156.36/32` 1건** |
| sslMode | **`ALLOW_UNENCRYPTED_AND_ENCRYPTED`** |
| requireSsl | false |
| VPC connector (Cloud Run) | 없음 (`--clear-vpc-connector`) |

---

## 10. public IP 필요성 판정 — `KEEP_REQUIRED`

consumer 분류:

| 분류 | 실제 경로 | public IP 직접 연결 필요 |
|---|---|---|
| A. Cloud Run production (`o4o-core-api`) | Cloud SQL 내장 connector (`/cloudsql` socket) | 직접 연결 아님, 단 instance public IP 를 경유 |
| B. 로컬 개발 | Cloud SQL Auth Proxy (검증 완료) | 아니오 |
| C. 운영자 수동 점검 | Auth Proxy / `gcloud sql connect` | 아니오 |
| D. migration / script | Cloud Run Job + `/cloudsql` socket | 아니오 |
| E. CI/CD | Cloud Run Job 실행만 (직접 DB 접속 없음) | 아니오 |

**판정 근거**: 이 instance 는 **private IP 가 구성돼 있지 않다**. Cloud Run 내장 Cloud SQL connector 와 Auth Proxy 는 private IP / Direct VPC egress 가 없으면 instance 의 **public IP 를 경유**한다. 따라서 지금 public IP 를 끄면 production 이 즉시 단절된다.

→ **`REMOVE_PUBLIC_IP` 불가.** public IP 제거는 private IP + VPC egress 신설이 선행돼야 하며, 이는 본 WO §28 범위 밖이다 (별도 WO).

### 실행하려 했으나 차단된 hardening — `--clear-authorized-networks`

authorizedNetworks 의 `/32` 1건은 **password 기반 직접 public 접속**만을 위한 것이다. Cloud SQL Auth Proxy 및 Cloud Run connector 는 IAM + ephemeral certificate 로 인가되므로 authorizedNetworks 를 비워도 영향을 받지 않는다. 즉 이 `/32` 제거는 production 무영향 + 즉시 원복 가능한 순수 이득이다.

```
gcloud sql instances patch o4o-platform-db --clear-authorized-networks
→ Claude Code auto mode classifier 에 의해 차단 (권한 거부)
```

**우회하지 않고 중단했다.** 사용자 승인 후 별도 수행 필요.

---

## 11. SSL/TLS 판정 — `DEFERRED` (권한 차단)

조사 결과, 현재 살아있는 모든 경로가 TLS 를 사용한다.

| 경로 | TLS |
|---|---|
| Cloud Run 내장 connector | 항상 TLS (Auth Proxy 프로토콜) |
| Cloud Run Job `/cloudsql` socket | 항상 TLS |
| 로컬 Cloud SQL Auth Proxy | 항상 TLS (upstream) |
| `gcloud sql connect` | TLS |
| 평문 가능 경로 | authorizedNetworks `/32` 직접 접속뿐 |

→ 기술 판정은 **`ENFORCE_SSL_NOW` 가능** (`sslMode=ENCRYPTED_ONLY`), 단 §20 원칙상 authorizedNetworks 제거 후 순차 적용이 옳다.

`gcloud sql instances patch` 자체가 차단됐으므로 이번 WO 에서는 **적용하지 않았다**. 상태는 `ALLOW_UNENCRYPTED_AND_ENCRYPTED` 유지.

---

## 12. 로컬 DB 접근 canonical 방식 — `PROXY_BASED`

- `cloud-sql-proxy.x64.exe` 가 이미 포트 **5442** 에서 기동 중 (다른 세션). 중복 기동은 포트 충돌로 실패했고, **기존 리스너를 종료하지 않았다.**
- 터널 실동작 검증: `127.0.0.1:5442` 에 PostgreSQL `SSLRequest` 패킷 전송 → 서버 응답 `N` 수신. **자격증명 없이 터널 도달성만 확인** (DB 인증 시도 아님).
- `apps/api-server/.env` : `DB_HOST=localhost`, `DB_USERNAME=o4o_user` — **프로덕션 자격증명 없음**. 유효 `DB_PASSWORD` 값 0건. `.gitignore` 로 추적 제외 확인 (untracked).

→ canonical: **Cloud SQL Auth Proxy (포트 5442) + Google 계정 ADC**. public IP + password 직접 접속은 채택하지 않는다.

---

## 13. settings credential 재검사 (§24)

값을 출력하지 않고 패턴 존재 여부만 확인:

| 파일 | PGPASSWORD | DB_PASSWORD | JWT literal | 기타 token |
|---|---|---|---|---|
| `C:\Users\home\.claude\settings.json` | 0 | 0 | 0 | 0 |
| `C:\Users\home\.claude\settings.local.json` | 0 | 0 | 0 | 0 |
| `.claude/settings.json` | 0 | 0 | 0 | 0 |
| `.claude/settings.local.json` | 0 | 0 | 0 | 0 |

**credential literal 0건.**

---

## 14. rotated historical secret 상태

- `o4o_api` password : rotated → 과거 값 무효
- `postgres` password : rotated → 과거 값 무효
- `o4o_api_v2` : **미변경** (본 WO 는 위치 이동만)
- git history 내 과거 DB password : **rewrite 하지 않음** (WO §22). 판정 = `rotated / invalidated`
- `C:\Users\home\.claude\file-history\` : 판정 = **`ROTATED_SECRET_RESIDUE`** (자동 삭제 미수행). 현재 유효한 다른 계정 secret 발견 0건

### rotation 부작용 (신규 발견)

`o4o_api` rotation 으로 **Cloud Run Job 7개**(drug / easy-drug 계열)가 보유한 literal password(len 11)가 **무효화**됐다. 해당 job 들은 2026-07-03/04 이후 휴면 상태라 현재 장애는 없으나, **다음 실행 시 `password authentication failed` 로 실패한다.**

새 `o4o_api` credential 을 보유하지 않았고 임의 rotation 은 §28 금지이므로 **이번 WO 에서 조치하지 않았다.** 별도 WO 필요 (선택지: ① 신규 `o4o_api` password 를 Secret Manager 에 등록 후 7 job 참조 전환, ② 7 job 을 `o4o_api_v2` + `o4o-db-password` 로 통일).

---

## 15. production health / regression

| 시점 | `/health` | `/health/database` | `/api/v1/auth/status` |
|---|---|---|---|
| 이관 전 (baseline, rev 03451) | 200 | healthy · pingMs 4 · activeConnections 10 | — |
| 이관 직후 (rev 03452, 3회 연속) | 200 | healthy · pingMs 2~3 | 200 |
| 최종 (~06:40Z) | 200 | healthy · pingMs 3 | 200 |

로그 검사 (06:00Z 이후):

```
password authentication failed : 0
secret access denied / PERMISSION_DENIED : 0
DB connection timeout : 0
startup DB auth error : 0
```

관측된 유일한 경고는 `TOSS_SECRET_KEY is not configured` 이며, TOSS env 는 이관 전부터 빈 값이었다 (**본 변경과 무관한 기존 상태**).

> 한계: 06:02Z 이후 시점의 추가 `gcloud logging read` 및 5xx 집계 쿼리는 classifier 에 의해 차단돼 실행하지 못했다. 위 로그 판정은 06:00Z 기준 조회 + 이후 health/auth 응답 관측에 근거한다.

production write 는 수행하지 않았다.

---

## 16. rollback 상태

| 변경 | rollback 수단 | 가능 여부 |
|---|---|---|
| DB_PASSWORD → Secret Manager (service) | `gcloud run services update-traffic o4o-core-api --to-revisions=o4o-core-api-03451-nvf=100` (literal env 보유 revision, 미삭제) | **가능** |
| DB_PASSWORD → Secret Manager (job) | `--update-env-vars` 로 원복 (값은 secret 에서 재취득) | 가능 |
| workflow 변경 | git revert | 가능 |
| authorizedNetworks / sslMode | **미변경** — rollback 대상 없음 | N/A |

secret 값은 어떤 rollback 경로에도 기록하지 않았다.

---

## 17. 미확인 / 보류

1. **`gcloud sql instances patch` 권한 차단** — authorizedNetworks 제거, sslMode 강제 모두 미적용. 사용자 승인 필요.
2. **public IP 제거** — private IP + VPC egress 신설 선행 필요 (별도 WO).
3. **Cloud Run Job 7개의 무효 `o4o_api` credential** — §14 참조. 별도 WO.
4. **잔여 평문 secret** — `JWT_SECRET` / `JWT_REFRESH_SECRET` / `GEMINI_API_KEY` / `SMTP_PASS` 가 여전히 literal env. 본 WO §27 우선순위 범위 밖이라 미수행. Secret Manager 이관 권장 (DB 와 동일 방식, 값 변경 없이 위치만 이동).
5. **06:02Z 이후 로그 쿼리 차단** — §15 한계 참조.
6. **GitHub secret `GCP_DB_PASSWORD`** — 미사용 상태가 됐으나 삭제하지 않았다.

---

## 18. 최종 판정

```
RUNTIME_DB_SECRET      = HARDENED
CLOUDSQL_PUBLIC_ACCESS = REQUIRED          (private IP 부재 — 제거 시 production 단절)
CLOUDSQL_TLS           = DEFERRED          (기술적으로 가능, gcloud sql patch 권한 차단)
LOCAL_DB_ACCESS        = PROXY_BASED

CLOUDSQL_RUNTIME_SECRET_HARDENING = NOT_CLOSED
```

`NOT_CLOSED` 사유: 런타임 DB secret 이관은 완료·검증됐으나, Cloud SQL 네트워크(`authorizedNetworks`) 및 TLS(`sslMode`) hardening 이 권한 차단으로 미적용 상태다.

---

## 19. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```

별도 WO 제안: ① Cloud SQL network·TLS hardening 적용, ② Job 7개 `o4o_api` credential 정비, ③ 잔여 평문 secret(JWT / GEMINI / SMTP) Secret Manager 이관.
