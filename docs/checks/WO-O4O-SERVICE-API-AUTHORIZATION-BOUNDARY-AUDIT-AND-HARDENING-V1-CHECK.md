# WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1 — CHECK

- 작성일: 2026-08-21
- 대상: `/api/v1/service/*` 전체 (provisioning + monitor)
- 결론: `/api/v1/service` (provisioning) 7개 endpoint 전부 **MISSING_AUTH** → `authenticate` + `requireAdmin` 적용. `/api/v1/service/monitor` 8개는 이미 SECURE.

---

## 1. Mount 전수 확인 (§4)

`bootstrap/register-routes.ts` 기준, `/api/v1/service` 로 시작하는 mount 는 3개다.

| Line | Mount | Router | Phase | Mount-level middleware |
|---|---|---|---|---|
| 180 | `/api/v1/service/monitor` | `service-monitor.routes.ts` | Core(1) | 없음 (라우터 내부 guard 존재) |
| 252 | `/api/v1/service` | `service-provisioning.routes.ts` | Domain(2) | 없음 (라우터 내부 guard **부재** — 본 WO 대상) |
| 268 | `/api/v1/service-admin` | `service-admin.routes.ts` | Domain(2) | 없음 (라우터 내부 guard 존재) |

- `/api/v1` 전역 인증 미들웨어 **없음** → 라우터 guard 누락이 곧 경계 누락.
- 중복 mount 없음. `/service/monitor` 가 `/service` 보다 먼저 등록돼 경로 잠식 없음.
- legacy alias path 없음.

---

## 2. Endpoint Census (§3) — 미조사 0

### A. `/api/v1/service` (provisioning) — 7개, **변경 전 guard 0**

| Method | Path | R/W | Route MW (전) | Controller/Service | Persistence | 분류(전) |
|---|---|---|---|---|---|---|
| GET | `/templates` | R | 없음 | `templateRegistry.getAllTemplates` | FILESYSTEM(JSON) | PUBLIC_READ(의도치 않음) |
| GET | `/templates/:id` | R | 없음 | `templateRegistry.getTemplate` | FILESYSTEM | PUBLIC_READ(의도치 않음) |
| GET | `/templates/:id/preview` | R | 없음 | `serviceInstaller.getInstallationPreview` | 없음(계산) | PUBLIC_READ(의도치 않음) |
| POST | `/create` | **W** | 없음 | `serviceInstaller.provisionService` | in-memory registry + initializer(stub) | **PRIVILEGED_WRITE 인데 무가드** |
| POST | `/templates/:id/install` | **W** | 없음 | `serviceInstaller.installServiceTemplate` | in-memory registry | **PRIVILEGED_WRITE 인데 무가드** |
| GET | `/templates/recommend/:serviceGroup` | R | 없음 | `serviceInstaller.getRecommendedTemplates` | FILESYSTEM | PUBLIC_READ(의도치 않음) |
| GET | `/stats` | R | 없음 | `templateRegistry.getStats` | FILESYSTEM | PUBLIC_READ(의도치 않음) |

### B. `/api/v1/service/monitor` — 8개, `router.use(authenticate)` + `router.use(requireAdmin)`

`/tenants` `/apps` `/themes` `/warnings` `/summary` `/tenant/:tenantId` `/report` (R) + `POST /validate` (W) — 전부 **AUTHENTICATED + PRIVILEGED**, 판정 **SECURE**. 변경 없음.

read 7 / write 1.

### 합계

- `/api/v1/service/*` endpoint **15개** (provisioning 7 + monitor 8), 미조사 0
- read **12** / write **3**
- 변경 전 **무인증 write 가능 endpoint 2개** (`POST /create`, `POST /templates/:id/install`)

---

## 3. 인증 경계 (§5)

| 대상 | 판정(전) | 판정(후) |
|---|---|---|
| `/api/v1/service` 7개 | **AUTH_MISSING** (라우터·mount·controller·service 어디에도 `authenticate`·`req.user` 참조 없음) | AUTH_PRESENT |
| `/api/v1/service/monitor` 8개 | AUTH_PRESENT | AUTH_PRESENT |

`AUTH_OPTIONAL_INTENDED` 로 볼 근거는 없다 — 소스·주석·문서 어디에도 공개 의도 표기가 없고,
동일 read 가 이미 인증된 `/api/v1/service-admin/{templates,stats}` 로도 제공된다. UNKNOWN 0.

---

## 4. 인가 경계 (§6) 및 Scope (§7)

- provisioning 대상은 **플랫폼 전역 리소스**(템플릿 레지스트리 + 프로세스 registry)다.
  `app_registry` 와 마찬가지로 `serviceKey` / `organizationId` 컬럼이 없다.
- `POST /create` 는 body 의 `organizationId` / `tenantId` 를 그대로 받지만,
  **요청자 membership·ownership 을 조회하는 코드가 존재하지 않는다.**
- 따라서 형제 라우터(`/service/monitor`, `/service-admin`, `/admin/apps`)와 동일하게
  **`platform:super_admin` 전용**으로 잠근다. 플랫폼 전역 권한이므로 tenant scope 검사는 성립하지 않으며,
  §2·§11 지시대로 **없는 ownership 축을 새로 만들지 않는다.**
- 공격 경로 판정(적용 후): 비로그인 → 401 / 일반 member·operator·서비스 admin → 403 /
  cross-service·cross-organization write 경로 자체가 super_admin 외에는 존재하지 않음.

---

## 5. write 의미 (§8)

| Endpoint | 분류 | 실측 근거 |
|---|---|---|
| `POST /create` | **IN_MEMORY_WRITE** (+ initializer 는 **NO_EFFECT**) | `provisionService` → `installAppsInOrder` → `appStoreService.installApp` → ModuleLoader in-memory Map. 후속 `serviceInitializer.initializeService` 는 메뉴/카테고리/페이지/설정/역할 생성이 **전부 TODO 스텁**이라 DB write 0 |
| `POST /templates/:id/install` | **IN_MEMORY_WRITE** | 동일 경로. `dataSource` 를 넘기지 않아 lifecycle hook 의 DB 접근도 없음 |
| `POST /monitor/validate` | 검증 계산 | 상태 변경 없음 |

production 한정으로는 두 write 모두 **NO_EFFECT** 다 — 배포 이미지에
`src/service-templates/templates/*.json` (repo 에는 6개 존재)이 COPY 되지 않아
`templateRegistry` 가 항상 0개이고, template 조회 단계에서 먼저 끊긴다.
단순 200 을 write 성공으로 보지 않고 registry·DB 상태까지 확인한 결과다.

---

## 6. 취약점 판정 (§10)

| Endpoint | 판정 |
|---|---|
| `POST /service/create` | **MISSING_AUTH** (구조) / production 실효는 ERROR_MAPPING_ONLY |
| `POST /service/templates/:id/install` | **MISSING_AUTH** (구조) / production 실효는 ERROR_MAPPING_ONLY |
| `GET /service/templates`·`/:id`·`/:id/preview`·`/recommend/:sg`·`/stats` | **MISSING_AUTH** (내부 프로비저닝 메타데이터가 비인증 공개) |
| `POST /service/templates/:id/install` 의 "template 없음 → 500" | **ERROR_MAPPING_ONLY** (별도 교정) |
| `/service/monitor/*` 8개 | **SECURE** |

UNKNOWN 0.

> 구분 근거: production 에서 비인증 write 가 실제 상태 변경에 도달하지 못했으므로
> 즉시 악용 가능한 P0 는 아니다. 그러나 도달 실패의 이유가 **가드가 아니라 배포 이미지의
> 파일 누락**이므로(로컬·dev 에서는 registry 가 채워져 write handler 가 그대로 실행된다)
> 구조 판정은 MISSING_AUTH 로 둔다.

---

## 7. 목표 권한 계약 (§11) 및 적용 (§12)

```text
/api/v1/service/*        → authenticate + requireAdmin (platform:super_admin)
/api/v1/service/monitor/* → 기존 동일 (변경 없음)
```

- 기존 공통 middleware(`authenticate`, `requireAdmin`)만 재사용. 신규 role·permission·guard **0**.
- 공통 middleware 자체는 수정하지 않았다(다른 API 영향 0).
- read 를 공개로 남기지 않은 이유: 소비자용 카탈로그가 아니라 내부 app id·service group 구성을
  드러내는 **내부 프로비저닝 메타데이터**이며, 비인증 소비처가 0이고, 동일 read 가 이미 가드된
  `/service-admin/{templates,stats}` 에 존재한다.

### 수정 파일

- `apps/api-server/src/routes/service-provisioning.routes.ts`
  - `authenticate`, `requireAdmin` import + `router.use(...)` 2줄 (첫 handler 앞)
  - `POST /templates/:id/install`: template 없음 → **500 → 404**
  - 판정·근거 헤더 주석 추가
- `apps/api-server/src/__tests__/service-provisioning-guard.spec.ts` (신규)

mount 지점(`register-routes.ts`), controller/service 계층, DB schema **미변경**.

---

## 8. 상태코드 계약 (§13)

| 상황 | 전 | 후 |
|---|---|---|
| 비로그인 | 200/400/404/500 (handler 도달) | **401** |
| 로그인·권한 없음 | 동일하게 통과 | **403** |
| 필수 필드 누락 (`/create`) | 400 | 400 (유지) |
| 없는 template (`/create`, read 3종) | 404 | 404 (유지) |
| 없는 template (`/install`) | **500** | **404** |
| 설치 일부 실패 | 500 | 500 (실제 서버측 실패이므로 유지) |

409 는 본 라우터 계약에 해당 없음(중복 설치는 `skipped` 로 처리).

---

## 9. Dead / Legacy 및 중복 계약 (§14·§18)

### Consumer

| Endpoint | Consumer |
|---|---|
| `GET /service/templates` | ACTIVE — `admin-dashboard` `ServiceTemplateSelector` (AppStorePage 내부) |
| `GET /service/templates/:id/preview` | ACTIVE — 동일 |
| `POST /service/templates/:id/install` | ACTIVE — 동일 (super_admin 전용 화면) |
| `GET /service/templates/:id` | CONSUMER_ZERO (api 함수 정의만 존재, 호출 0) |
| `POST /service/create` | CONSUMER_ZERO |
| `GET /service/templates/recommend/:sg` | CONSUMER_ZERO |
| `GET /service/stats` | CONSUMER_ZERO |

admin-dashboard 외 서비스(KPA / PharmacyHub / K-Cosmetics / GlycoPharm / Neture) 프론트에서
`/api/v1/service/*` 호출 **0건**.

### 판정

- 라우터 전체는 **KEEP_ACTIVE** (활성 소비처 3개 존재) → retire 불가.
- 소비처 0인 4개는 **RETIRE_CANDIDATE** 로만 기록한다. production 에서 registry 가 비어
  기능이 사실상 무효인 점까지 함께 판단해야 하므로 본 WO 에서는 제거하지 않았다.
- **중복 계약**: `GET /service/templates` ↔ `GET /service-admin/templates`,
  `GET /service/stats` ↔ `GET /service-admin/stats` (같은 `templateRegistry`).
  판정 — `/service-admin/*` = CANONICAL(먼저 가드됨), `/service/*` read = DUPLICATE.
  §18 지시대로 본 WO 에서 통합하지 않고 후속 후보로 기록한다.

---

## 10. 테스트 (§15)

| 스펙 | 결과 |
|---|---|
| `src/__tests__/service-provisioning-guard.spec.ts` (신규) | **42 tests PASS** |
| `src/__tests__/service-admin-guard.spec.ts` | 39 PASS (회귀 없음) |
| `src/routes/__tests__/appstore-auth-boundary.test.ts` | 17 PASS (회귀 없음) |
| `src/__tests__/admin-api-guard-inventory.spec.ts` | 8 PASS |
| `npx tsc --noEmit` | 본 변경 관련 오류 0 |

커버: 비로그인 401(7) · 일반 사용자 403(7) · 비허용 역할 6종 403 · super_admin guard 통과(7) ·
**비로그인/비허용 write 가 installer 계층에 도달하지 않음(spy 호출 0)** · 400/404 매핑 ·
소스 계약(guard 위 endpoint 0건, 신규 role 상수 0, mount 미변경).

---

## 11. Production 실측 (§9·§17)

### 배포 전 (비로그인, 비파괴)

| 요청 | 결과 |
|---|---|
| `GET /service/templates` | **200** `data:[] count:0` |
| `GET /service/stats` | **200** `total:0` |
| `GET /service/templates/platform-core` | 404 |
| `GET /service/templates/platform-core/preview` | 404 |
| `GET /service/templates/recommend/global` | **200** |
| `POST /service/create` `{}` | **400** (handler 도달) |
| `POST /service/create` (없는 template) | **404** (handler 도달) |
| `POST /service/templates/{없는id}/install` | **500** (handler 도달, write 계층까지 진입) |
| `GET /service/monitor/summary` | 401 |
| `POST /service/monitor/validate` | 401 |

→ 비인증 요청이 write handler 본문까지 도달했음이 실측으로 확인됨. 실제 상태 변경은 registry 공백으로 차단.

### 배포 후

(배포 후 채움)

---

## 12. 후속 후보

1. `/service/*` read 와 `/service-admin/*` read 의 DUPLICATE 정리 (canonical = `/service-admin`)
2. 소비처 0인 4개(`GET /templates/:id`, `POST /create`, `GET /templates/recommend/:sg`, `GET /stats`) retire 판단
3. `service-templates/templates/*.json` · `init-packs` 가 배포 이미지에 없어 provisioning 전체가 production 무효 — 살릴지/은퇴할지 결정 (ModuleLoader 와 동일한 축)
4. `serviceInitializer` 전 단계 TODO 스텁 — 기능 미구현 상태 명문화 또는 제거
5. `/api/v1/service/monitor` 가 Core phase, `/api/v1/service` 가 Domain phase 에 등록되는 mount 분산 정리
