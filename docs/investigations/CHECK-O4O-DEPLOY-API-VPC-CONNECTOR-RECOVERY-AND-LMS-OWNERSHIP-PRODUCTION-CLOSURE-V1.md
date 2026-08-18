# CHECK-O4O-DEPLOY-API-VPC-CONNECTOR-RECOVERY-AND-LMS-OWNERSHIP-PRODUCTION-CLOSURE-V1

- **WO**: `WO-O4O-DEPLOY-API-VPC-CONNECTOR-RECOVERY-AND-LMS-OWNERSHIP-PRODUCTION-CLOSURE-V1`
- **선행 CHECK**: [`CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1`](./CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1.md) (판정 `CODE_PASS / DEPLOY_BLOCKED`)
- **일자**: 2026-08-18
- **시작 commit**: `5d946291d` / **최종 commit**: `7c57a002b`
- **최종 판정**: **PASS — 배포 복구 완료 + LMS enrollment ownership production closure 완료** (선행 CHECK 의 `DEPLOY_BLOCKED` 를 대체한다)

---

## 1. 기존 deploy 실패 원인

```
ERROR: (gcloud.run.deploy) VPC connector
projects/netureyoutube/locations/asia-northeast3/connectors/o4o-vpc-connector
does not exist, or Cloud Run does not have permission to use it.
```

감사 로그 기준 원인 (모두 2026-08-18, 계정 `sohae2100@gmail.com`):

| 시각(UTC) | 이벤트 |
|---|---|
| 04:16:40 / 04:19:36 | Memorystore 인스턴스 `o4o-redis-cache` 삭제 |
| 04:20:33 (후속 04:24:34) | Serverless VPC Access connector `o4o-vpc-connector` 삭제 |
| 04:25 | 본 세션의 첫 배포 시도 → 위 에러로 실패 |

- 실패 run: `32098517053`(`527ed7e23`), `32099099587`(`ca73ac342`)
- 즉, **코드 변경이 아니라 인프라 리소스 삭제 후 workflow 참조가 잔재로 남은 것**이 실패 원인이다.
- 프로덕션이 그동안 정상이었던 이유: 기존 서빙 리비전(`o4o-core-api-03350-cpg`)은 이미 기동된 상태였고, DB 접속은 VPC 가 아니라 `/cloudsql/` 유닉스 소켓을 사용하므로 connector 부재의 영향을 받지 않았다.

## 2. connector 가 실제로 필요한가 — 판정 **B (잔재 참조)**

| 근거 | 확인 결과 |
|---|---|
| Cloud SQL 접속 방식 | `--add-cloudsql-instances` + `DB_HOST=/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db` (유닉스 소켓) → VPC 불필요 |
| connector 의 원래 용도 | Memorystore private IP `10.165.134.11` 접근 전용 |
| Memorystore 현황 | `gcloud redis instances list --region asia-northeast3` → **0건** (인스턴스 삭제됨) |
| connector 현황 | `gcloud compute networks vpc-access connectors list --region asia-northeast3` → **0건** |
| 코드 상 Redis 의존 | `apps/api-server/src/main.ts` 에 Redis 참조 **0건** (세션 Redis 는 선행 세션에서 제거됨). 잔존 소비처는 lazy 초기화 3곳뿐 |
| 서빙 리비전 로그 | Redis 관련 에러 없음 |

→ **새 connector 를 생성하지 않는다.** A(재생성)·C(다른 connector 로 이전) 모두 근거 없음.

## 3. 변경 파일 (최소 수정)

`.github/workflows/deploy-api.yml` **1개 파일, 1 insertion / 2 deletions**

```diff
-          --vpc-connector=o4o-vpc-connector \
-          --vpc-egress=private-ranges-only \
+          --clear-vpc-connector \
           --add-cloudsql-instances=netureyoutube:asia-northeast3:o4o-platform-db
```

- **플래그 삭제만으로는 부족하다**: Cloud Run 서비스에는 `run.googleapis.com/vpc-access-connector: o4o-vpc-connector` 어노테이션이 남아 있었고 `gcloud run deploy` 는 기존 어노테이션을 보존한다. 따라서 `--clear-vpc-connector` 로 **명시 해제**했다.
- 새 connector 생성: **없음** / 권한·SA·secret 변경: **없음** / Cloud SQL 연결 방식 변경: **없음** / 다른 workflow 변경: **없음**
- YAML 파싱 검증 PASS (`yaml.safe_load` → jobs: `build-and-deploy`)

## 4. 배포 결과

| 항목 | 값 |
|---|---|
| Deploy API Server run | `32099872911` — **success** |
| 배포 commit | `7c57a002b` |
| 새 Cloud Run revision | **`o4o-core-api-03353-v4s`** (이전 `o4o-core-api-03350-cpg`) |
| traffic | latestRevision 100% |
| vpc-access-connector 어노테이션 | **제거됨(빈 값)** |
| migration | `Migrations executed: 0` / `No pending migrations` |
| 새 리비전 severity>=WARNING 로그 | **0건** |
| `/health` | **200** |

## 5. 배포 전 코드 기준 확인 (WO §6)

배포된 `7c57a002b` 트리에 다음이 포함됨을 확인:

- `apps/api-server/src/modules/lms/utils/lms-enrollment-owner-guard.ts`
- `apps/api-server/src/__tests__/lms-enrollment-ownership-boundary.spec.ts`
- `EnrollmentController` 의 mutation 4개(`update`/`start`/`complete`/`cancel`) `ensureOwnEnrollment` 호출 (L151/L173/L196/L218)
- `getEnrollment` 의 `resolveOwnedEnrollmentOrRespond` (L77), `listEnrollments` 의 `isLmsElevatedManager` 기반 본인 범위 축소 (L98)

자동화 테스트: `lms-enrollment-ownership-boundary.spec.ts` + `lms-crossservice-read-write-boundary.spec.ts` → **60 tests PASS**

## 6. LMS ownership production runtime 검증 (읽기 전용)

프로덕션 write 없음. mutation 미실행 (WO §8-B 계약 준수).

대상: 본인 `ca7fd6e1-…`(sohae2100 소유) / 타인 `6d025cca-…`(renagang21 소유, 동일 서비스 `kpa-society`)

| 검증 | 배포 전 (03350) | 배포 후 (03353) |
|---|---|---|
| **[A] 본인 GET** (sohae2100) | 200 | **200** |
| **[B] 동일 서비스 타인 GET** (sohae2100 → renagang21 것) | **200 + userId·email 노출** | **404 `NOT_FOUND`** |
| **[C] cross-service GET** (`?serviceKey=glycopharm`) | 404 | **404** |
| **[A2] 본인 GET** (renagang21) | 200 | **200** |
| **[B2] 동일 서비스 타인 GET** (renagang21 → sohae2100 것) | **200 + email 노출** | **404 `NOT_FOUND`** |
| **[D] `GET /lms/enrollments`** | 200 n=9 / 3 userId / 3 email | 200 n=9 (아래 §7-1 참조) |
| **[E] `/health`** | 200 | **200** |
| scope 축소 `GET /lms/enrollments?serviceKey=glycopharm` | — | 200 n=0 (타 서비스 0건 확인) |

→ **이전 200 email leak → 수정 후 404 전환 확인 (양방향 2건 모두)**. 단건 읽기 leak 는 production 에서 종료됐다.

## 7. 잔여 리스크

### 7-1. `GET /lms/enrollments` 본인 범위 축소는 런타임으로 관찰하지 못했다 (검증 한계)

- 목록 축소는 `isLmsElevatedManager(req)` 가 false 인 사용자에게만 적용된다.
- 프로덕션 role 실측: `sohae2100@gmail.com` = `kpa:admin`, `renagang21@gmail.com` = **`lms:instructor`** → **두 계정 모두 elevated** 이므로 전체 9건을 보는 것이 설계상 정상 동작이다.
- enrollment 를 보유한 세 번째 계정 `sohae21@naver.com` 은 `users.status='deleted'` 로 로그인 불가, 그 외 문서화된 계정에는 비-elevated 로그인 수단이 없다. 신규 계정 생성은 프로덕션 write 이므로 수행하지 않았다.
- 따라서 목록 축소는 **코드 + 자동화 테스트(목록 leak 5건)** 로만 닫혔다. 런타임 재확인은 비-elevated 계정 확보 후 별도 수행이 필요하다.

### 7-2. `renagang21@gmail.com`(매장 경영자)이 `lms:instructor` 를 보유

- 그 결과 매장 계정이 `GET /lms/enrollments` 에서 전 사용자 enrollment(이메일 포함)를 조회할 수 있다.
- 코드 결함이 아니라 **프로덕션 role 데이터 문제**다. 본 WO 범위 밖 → 별도 WO 로 role 정리 판단 필요.

### 7-3. Redis env 잔재

- `REDIS_HOST=10.165.134.11` / `REDIS_ENABLED=true` 가 workflow env 에 남아 있으나 Memorystore 는 삭제됐다.
- 기동 경로에 Redis 가 없어 현재 영향은 없고(새 리비전 WARNING 0건), lazy 소비처 3곳(`cache.config.ts`, `ai-job-queue.service.ts`, `webhook.queue.ts`)만 남는다.
- deploy 정상화 범위를 넘으므로 이번에 건드리지 않았다. 별도 WO 로 env·소비처 정리 권장.

### 7-4. WO §10 제외 항목 (선행 CHECK 에서 이월)

- certificate id 기반 read owner check 3경로 미적용 — 범위 외 유지.
- KPA 강의 상세의 `GET /api/v1/kpa/appreciation/lms_course/{id}/summary|recent` **404 2건**은 이번 배포 이전부터 존재하는 기존 결함이며 이번 변경과 무관하다 (§8 회귀 스모크에서 동일하게 재확인).

## 8. 회귀 스모크 (WO §9)

| 대상 | 결과 |
|---|---|
| `/health` | 200 |
| 로그인 (`kpa-society`, 2계정) | 200 |
| KPA `/lms` 목록 | 200 · `GET /kpa/lms/courses` n=3 · serviceKey 전부 `kpa-society` · console error 0 |
| KPA 강의 상세 | 200 · 코스/레슨 API 200 · 404 는 기존 appreciation 2건뿐 |
| 인증 상태 코스·레슨 조회 | `/kpa/lms/courses/{id}` 200, `/{id}/lessons` 200 |
| enrollment 단건 조회 | 200 (본인) |
| K-Cosmetics `/lms` | 200 · n=0 빈 상태 정상 · console error 0 |
| GlycoPharm `/lms` | 200 · n=0 빈 상태 정상 · console error 0 |
| 신규 404/500 | **0건** (기존 appreciation 404 제외) |
| 백지 화면 / JS 예외 | 0건 |
| cross-service LMS 혼입 | 0건 |

## 9. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

- 선행 CHECK `CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1` 의 판정 `CODE_PASS / DEPLOY_BLOCKED` 는 본 CHECK 로 대체된다(본문 수정은 하지 않고 여기서 명시).
- 별도 WO 제안: (1) 비-elevated 계정 확보 후 `GET /lms/enrollments` 범위 축소 런타임 재확인, (2) `renagang21@gmail.com` 의 `lms:instructor` role 정합성 정리, (3) Redis env·잔존 소비처 정리.
