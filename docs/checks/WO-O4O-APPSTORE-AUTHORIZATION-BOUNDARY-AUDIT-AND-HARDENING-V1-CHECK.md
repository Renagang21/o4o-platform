# CHECK — WO-O4O-APPSTORE-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1

- **일자**: 2026-08-21
- **대상**: `/api/v1/appstore/*` 전체 API 의 인증·인가 경계 전수조사 및 하드닝
- **판정**: `MISSING_AUTH` 확정 → 하드닝 완료

---

## 1. Endpoint Census (§3) — 미조사 0

조사 시점 기준 `apps/api-server/src/routes/appstore.routes.ts` 의 전체 엔드포인트는 7개다
(WO 가 열거한 6개 + 문서화되지 않았던 `GET /modules`).

| # | Method | Path | R/W | 조사 전 route middleware | Controller | Service | 조사 전 분류 |
|:-:|---|---|:-:|---|---|---|---|
| 1 | GET | `/api/v1/appstore` | R | **없음** | inline handler | `APPS_CATALOG` + `moduleLoader.getModule()` | `PUBLIC_READ` (의도됨) |
| 2 | GET | `/api/v1/appstore/modules` | R | **없음** | inline handler | `moduleLoader.getRegistry()` | `INTERNAL_ONLY` (디버그가 공개됨) |
| 3 | GET | `/api/v1/appstore/:appId` | R | **없음** | inline handler | `appStoreService.getAppDetails()` | `PUBLIC_READ` (의도됨) |
| 4 | POST | `/api/v1/appstore/install` | **W** | **없음** | inline handler | `appStoreService.installApp()` | **`MISSING_AUTH`** |
| 5 | POST | `/api/v1/appstore/activate` | **W** | **없음** | inline handler | `appStoreService.activateApp()` | **`MISSING_AUTH`** |
| 6 | POST | `/api/v1/appstore/deactivate` | **W** | **없음** | inline handler | `appStoreService.deactivateApp()` | **`MISSING_AUTH`** |
| 7 | DELETE | `/api/v1/appstore/uninstall` | **W** | **없음** | inline handler | `appStoreService.uninstallApp()` | **`MISSING_AUTH`** |

`UNKNOWN` 0건.

---

## 2. 인증 경로 추적 (§4)

WO §2 지침대로 "route 에 middleware 가 없다"만으로 확정하지 않고 내부까지 추적했다.

| 확인 지점 | 결과 |
|---|---|
| route-level middleware | `router.use(...)` 없음. 7개 핸들러 어디에도 guard 인자 없음 |
| mount 지점 | `bootstrap/register-routes.ts:238` — `app.use('/api/v1/appstore', appstoreRoutes)` 로 **가드 없이** mount |
| 상위 global middleware | `/api/v1` 전역 인증 없음 (기존 관리자 API guard P0 트랙 결론과 동일: 라우터 guard 가 유일 방어선) |
| controller 내부 `req.user` | 파일 전체에 `req.user` 참조 **0건** |
| `AppStoreService` 내부 | 인증·권한 검사 코드 **0건** (`installApp`/`activateApp`/`deactivateApp`/`uninstallApp` 모두 appId 만 받는다) |
| `ModuleLoader` 내부 | 인증·권한 검사 코드 **0건** |
| service context / JWT / cookie | 이 라우터 경로에서 소비하는 코드 없음 |

**결론**: 조사 전 상태에서 4개 write 엔드포인트는 **인증 자체가 존재하지 않았다** → `MISSING_AUTH`.

---

## 3. 인가 · 공격 경로 (§5)

| 공격 경로 | 조사 전 결과 |
|---|---|
| 비로그인 → write | **요청 도달함** (401 없음). 프로덕션 실측에서 handler 내부까지 진입해 서비스 예외로 500 반환 |
| 일반 member → write | 동일 (권한 구분 자체가 없음) |
| 다른 organization 사용자 → 타 installation write | **해당 없음** (아래 §4 — API 에 tenant 축이 없다) |
| 동급 operator → 타 조직 write | **해당 없음** (동일) |
| platform·admin → 허용 범위 | 구분 없음 (모두 동일하게 무제한) |

중복 설치 처리: `installApp()` 은 이미 설치된 경우 `logger.info` 후 `return` — 예외 없이 idempotent 성공이다(409 아님). 이 계약은 변경하지 않았다.

---

## 4. Scope / Ownership 계약 (§6) — **N/A by construction**

`request user → membership → organization/service scope → app_registry / app_instances → write` 사슬을 추적한 결과:

- `/api/v1/appstore` 의 요청 계약에는 `organizationId` · `serviceKey` · `instanceId` 가 **하나도 없다**. 모든 write 는 `{ appId }` 단일 필드만 받는다.
- 이 경로가 변경하는 대상은 `ModuleLoader` 의 **프로세스 전역 in-memory `Map` registry** 다. `app_registry` / `app_instances` 테이블에 쓰지 않는다.
- 즉 tenant 별 리소스가 아니라 **플랫폼 전역 리소스**이며, cross-tenant write 라는 개념이 성립하지 않는다.
- DB 영속 경로는 별도 API 인 `/api/v1/admin/apps`(`AppManager` → `app_registry`)이고, 이쪽은 이미 `authenticate` + `requireAdmin` 으로 보호돼 있다.

따라서 tenant scope 를 새로 도입하지 않았다 (§2 "서비스별/조직별 scope 를 훼손하지 않는다", §10 "App Store 전용으로 새로운 인증 체계를 만들지 않는다").
**cross-tenant write 가능성 = 구조적으로 0.**

---

## 5. 실제 무권한 write 가능 여부 (§8)

- 프로덕션 컨테이너에서 `ModuleLoader.scanWorkspace()` 는 `packages/**/manifest.ts` (**TypeScript 원본**)를 glob 하며 `**/dist/**` 를 ignore 한다. 컴파일된 런타임 이미지에는 `.ts` manifest 가 없으므로 registry 가 항상 비어 있다.
- 실측: 비인증 `GET /api/v1/appstore/modules` → `200 {"data":[],"total":0,"activeCount":0}`.
- 그 결과 activate/deactivate/uninstall 은 `App ... not installed` 로, install 은 catalog 통과 후 `package not found in workspace` 로 **실제 상태 변경 전에 실패**했다.

**판정**: 현재 시점에 실 DB write 또는 registry 변경까지 도달한 무권한 write 는 **확인되지 않았다**. 다만 이는 런타임 모듈 부재에 따른 결과이며 **무인증 write 계약 자체는 존재**했다. WO §8 기준으로 `ERROR_MAPPING_ONLY` 가 아니라 **`MISSING_AUTH`** 로 판정하고 가드를 적용했다.

---

## 6. 최종 권한 계약 (§9) 및 수정 내역 (§10)

| Endpoint | 최종 분류 | 가드 |
|---|---|---|
| `GET /api/v1/appstore` | `PUBLIC_READ` | 없음 (유지) |
| `GET /api/v1/appstore/:appId` | `PUBLIC_READ` | 없음 (유지) |
| `GET /api/v1/appstore/modules` | `PRIVILEGED_READ` | `authenticate` + `requireAdmin` |
| `POST /install` | `PRIVILEGED_WRITE` | `authenticate` + `requireAdmin` |
| `POST /activate` | `PRIVILEGED_WRITE` | `authenticate` + `requireAdmin` |
| `POST /deactivate` | `PRIVILEGED_WRITE` | `authenticate` + `requireAdmin` |
| `DELETE /uninstall` | `PRIVILEGED_WRITE` | `authenticate` + `requireAdmin` |

- 공개 조회 유지 근거: 두 엔드포인트는 정적 카탈로그 메타데이터 + 설치 상태만 반환하며 사용자·조직 데이터를 포함하지 않는다. WO §2 "공개 목록/상세를 무조건 인증화하지 않는다" 를 따랐다.
- 역할 선택 근거: 단순 `isAuthenticated` 로 끝내지 않고(§9), **DB 영속 경로인 `/api/v1/admin/apps` 와 동일한 조합**(`router.use(authenticate); router.use(requireAdmin);`)을 그대로 재사용했다. `requireAdmin` 은 `platform:super_admin` 을 요구한다(WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1).
- `GET /modules` 가드 근거: registry 내부 상태(로드 실패 사유 포함)를 노출하는 디버그 엔드포인트 — CLAUDE.md §8 "HTTP 가 불가피하면 requireAuth + role guard 필수".
- 공통 auth middleware 는 **수정하지 않았다** (Core Freeze 준수). 새 인증 체계 도입 0.

### 수정 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/appstore.routes.ts` | `requirePlatformAdmin = [authenticate, requireAdmin]` 적용(5개 엔드포인트) · 헤더에 권한 계약 문서화 · write 4개의 generic 500 catch → `respondWithAppStoreError()` 매핑 |
| `apps/api-server/src/services/AppStoreService.ts` | `AppStoreError extends Error` 추가(status·code) · 기존 6개 `throw new Error` 를 typed throw 로 교체 |
| `apps/api-server/src/routes/__tests__/appstore-auth-boundary.test.ts` | 신규 계약 테스트 28건 |

---

## 7. 상태코드 계약 (§11 · §12)

| 상황 | 조사 전 | 조사 후 | code |
|---|:-:|:-:|---|
| 비인증 write | 500 (핸들러 진입 후 서비스 예외) | **401** | `AUTH_REQUIRED` |
| 인증됐으나 권한 없음 | 500 (동일) | **403** | `FORBIDDEN` |
| `appId` 누락 | 400 | 400 (유지) | — |
| 카탈로그에 없는 app install | 500 | **404** | `APP_NOT_IN_CATALOG` |
| **은퇴한 app install** | 500 | **404** | `APP_NOT_IN_CATALOG` |
| 설치되지 않은 app 의 activate/deactivate/uninstall | 500 | **404** | `APP_NOT_INSTALLED` |
| 의존성 누락 | 500 | **409** | `APP_DEPENDENCY_MISSING` |
| 카탈로그엔 있으나 workspace 에 패키지 없음 | 500 | 500 (유지 — 실제 서버측 조건) | `APP_PACKAGE_NOT_LOADED` |
| 이미 설치된 app 재설치 | 200 (idempotent) | 200 (유지, 계약 변경 없음) | — |
| 존재하지 않는 app 상세 조회 | 404 | 404 (유지) | — |

message 문자열 파싱이 아니라 도메인 오류가 실은 status/code 를 route 가 그대로 사용한다.

---

## 8. 테스트 (§13)

`apps/api-server/src/routes/__tests__/appstore-auth-boundary.test.ts` — **28 케이스, 28 PASS**

- 공개 read 4 (비인증 목록 200 / 비인증 상세 200 / 없는 app 404 / 은퇴 app 404)
- write 인증 경계 12 (비인증 4×401 · 일반 사용자 4×403 · service operator 4×403)
- 디버그 read 3 (401 / 403 / super_admin 200)
- 상태코드 계약 9 (appId 누락 4×400 · 카탈로그 없음 404 · 은퇴 app 404 · 미설치 3×404)

tenant isolation test 는 §4 사유로 해당 없음 — 대신 **service operator(`cosmetics:operator`) 도 403** 인 것을 명시적으로 고정해 "서비스 권한 보유자가 플랫폼 전역 registry 를 건드릴 수 없음" 을 검증했다.

---

## 9. 회귀 검증 (§14)

`apps/api-server/tests/multi-tenant/appstore.spec.ts` — **24 PASS** (테스트 변경 없음).
대조군 `cosmetics-seller-extension` · `forum-cosmetics` · `market-trial` 목록 노출·상세·카탈로그 계약 회귀 0.
공개 목록/상세 응답 형식 무변경. active App Store 기능 축소 0.

- typecheck: 이번 WO 변경 파일 오류 **0**.
  (동일 작업트리에 다른 세션의 `packages/action-log-core` 삭제 WIP 가 있어 `@o4o/action-log-core` 미해결 오류가 다수 나오지만 본 WO 와 무관하며 손대지 않았다 — CLAUDE.md 중지 조건 "현재 변경과 무관한 build·test 실패".)

---

## 10. Production 실측 (§7 · §15)

### 배포 전 (비파괴 실측)

| 요청 | 결과 |
|---|---|
| 비인증 `GET /api/v1/appstore` | 200 · 카탈로그 17건 |
| 비인증 `GET /api/v1/appstore/modules` | **200** · `{"data":[],"total":0}` (디버그 노출) |
| 비인증 `GET /api/v1/appstore/cosmetics-supplier-extension` (은퇴) | 404 |
| 비인증 `POST /api/v1/appstore/activate {"appId":"cosmetics-seller-extension"}` | **500** `App ... not installed` (무인증 진입) |
| 비인증 `POST /api/v1/appstore/install {}` | 400 |
| 비인증 `GET /api/v1/admin/apps/market` (대조군) | 401 |

### 배포 후 (revision `o4o-core-api-03422-kdm`, 2026-08-21)

**비인증**

| 요청 | 결과 |
|---|---|
| `GET /api/v1/appstore` | 200 · 카탈로그 17건 (변동 없음) |
| `GET /api/v1/appstore/cosmetics-seller-extension` | 200 |
| `GET /api/v1/appstore/no-such-app-xyz` | 404 |
| `GET /api/v1/appstore/cosmetics-supplier-extension` (은퇴) | 404 |
| `GET /api/v1/appstore/modules` | **401** `AUTH_REQUIRED` (배포 전 200) |
| `POST /appstore/install` | **401** (배포 전 500) |
| `POST /appstore/activate` | **401** (배포 전 500) |
| `POST /appstore/deactivate` | **401** |
| `DELETE /appstore/uninstall` | **401** |
| `POST /appstore/install {}` (body 누락) | **401** — 인증이 body 검증보다 먼저 |
| `GET /api/v1/admin/apps/market` (대조군) | 401 (변동 없음) |

**인증됐으나 권한 없음** — `renagang21@gmail.com` (약국 경영자, serviceKey `kpa-society`, 쿠키 세션)

| 요청 | 결과 |
|---|---|
| `POST /appstore/install` · `activate` · `deactivate` · `DELETE /uninstall` | 전부 **403** `{"error":"Admin privileges required","code":"FORBIDDEN"}` |
| `GET /appstore/modules` | **403** |
| `GET /appstore` | **200** (공개 조회 유지 확인) |
| `GET /admin/apps/market` (대조군) | 403 — 동일 계약 |

**서비스 관리자** — `sohae2100@gmail.com` (KPA-Society admin/operator)

| 요청 | 결과 |
|---|---|
| `GET /appstore/modules` | **403** |
| `GET /admin/apps/market` (대조군) | **403** — 두 API 가 동일하게 `platform:super_admin` 을 요구함을 확인 |

**허용(200) 경로 실측은 수행하지 못했다.** `docs/local/TEST-ACCOUNTS.local.md` 에
`platform:super_admin` 자격증명이 없어 프로덕션에서 super_admin 성공 경로를 확인할 수 없었다.
해당 경로는 jest 계약 테스트(`platform:super_admin` → `GET /modules` 200)로만 검증했다.
또한 §15 지침대로 실제 active app 의 install/uninstall write 는 프로덕션에서 수행하지 않았다.

**상태 · 로그**

| 항목 | 결과 |
|---|---|
| `/health` | 200 `alive` |
| `/health/database` | 200 `healthy` (pingMs 3, activeConnections 10) |
| 신규 revision `severity>=ERROR` | **0건** |
| 신규 revision `httpRequest.status>=500` | **0건** |
| 카탈로그 대조군 노출 | `cosmetics-seller-extension` · `forum-cosmetics` · `market-trial` 정상 노출 (회귀 0) |

---

## 11. Git

- commit: `88f06da0a` (코드·테스트·CHECK) → 본 배포 후 실측 기록은 후속 commit
- push: `origin/main` 완료
- 배포 revision: `o4o-core-api-03422-kdm`

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.

## 13. 후속 후보 (구현하지 않음)

1. `/api/v1/appstore` 와 `/api/v1/admin/apps` 의 **이중 App 관리 계약 정리** — 전자는 in-memory registry, 후자는 `app_registry` DB. 프론트 소비처는 후자뿐이고 전자는 소비처 0이다. 은퇴 또는 통합 여부는 별도 WO 판단 대상.
2. `ModuleLoader` 가 프로덕션 이미지에서 `packages/**/manifest.ts` 를 찾지 못해 registry 가 항상 비는 문제 — install 기능이 런타임에서 사실상 동작하지 않는 상태의 정식 판정.
