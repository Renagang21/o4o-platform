# CHECK-O4O-GLYCOPHARM-AUTHORIZATION-HIERARCHY-AUDIT-AND-FIX-V1

> WO: `WO-O4O-GLYCOPHARM-AUTHORIZATION-HIERARCHY-AUDIT-AND-FIX-V1`
> 작업일: 2026-08-10 · 결과: **PASS (구현 완료)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `76c3435d2` (clean · `HEAD == origin/main`) |
| 결과 commit | §10 |

---

## 2. 역할 · scope 현행 구조

GlycoPharm 은 `glycopharm:admin` · `glycopharm:operator` 2역할이다
(`glycopharm:store_owner` · `glycopharm:pharmacist` 는 매장/약사 신분 역할로 scope guard 축이 아니다).

**guard 체인** — `requireAuth` → `createMembershipScopeGuard(GLYCOPHARM_SCOPE_CONFIG)` → handler

| 계층 | 파일 | 역할 |
|---|---|---|
| scope 판정 | [`packages/security-core/src/service-scope-guard.ts`](../../packages/security-core/src/service-scope-guard.ts) | `scopeRoleMapping[scope]` 있으면 그 목록, **없으면 `allowedRoles` 전체로 fallback** |
| membership 판정 | [`apps/api-server/src/common/middleware/membership-guard.middleware.ts`](../../apps/api-server/src/common/middleware/membership-guard.middleware.ts) | Core F10 Freeze. `service_memberships(glycopharm).status='active'` 필수 |
| 서비스 config | [`packages/security-core/src/service-configs.ts`](../../packages/security-core/src/service-configs.ts) | `GLYCOPHARM_SCOPE_CONFIG` |

`serviceKey` ↔ scope 변환: role prefix `glycopharm` 은 self-map 이라
`resolveCanonicalServiceKey('glycopharm') === 'glycopharm'` (kpa→kpa-society, cosmetics→k-cosmetics 와 달리 변환 없음).

---

## 3. 문제의 정확한 원인

**`GLYCOPHARM_SCOPE_CONFIG` 에만 `scopeRoleMapping` 이 없었다.**

guard 는 mapping 이 없으면 `allowedRoles` 전체(`['glycopharm:admin','glycopharm:operator']`)로 fallback 한다.
따라서 **`requireGlycopharmScope('glycopharm:admin')` 이 `glycopharm:operator` 에게도 통과**했다 —
admin 전용으로 선언된 API 가 전부 operator 에게 열려 있었다 (권한 상승).

반대 방향(`glycopharm:operator` scope 에 admin 통과)은 fallback 으로 이미 성립해 있어, 이번 수정으로
operator 업무 API 의 접근 집합은 **변하지 않는다.**

대조: KPA · Neture · K-Cosmetics 는 `service-configs.ts` 에, Pharmacy-Hub 는 로컬 미들웨어에
동일 계층을 명시하고 있었다. GlycoPharm 만 누락된 상태였다.

**프런트는 이미 올바랐다** — backend 만 어긋난 비대칭이다.

| 프런트 | 가드 | 허용 역할 |
|---|---|---|
| `web-glycopharm` `/admin/*` | `ProtectedRoute allowedRoles` ([App.tsx:790](../../services/web-glycopharm/src/App.tsx)) | `glycopharm:admin` · `platform:super_admin` |
| `web-glycopharm` `/operator/*` | `OperatorRoute` → `isOperatorOrAbove` ([App.tsx:819](../../services/web-glycopharm/src/App.tsx)) | `glycopharm:admin` · `glycopharm:operator` · `platform:super_admin` |

---

## 4. API별 권한 판정표

`requireGlycopharmScope` 에 전달되는 scope 문자열은 `glycopharm:admin`(19곳) · `glycopharm:operator`(25곳)
**두 종류뿐**이다. 아래는 그 전수 분류다.

### 4-1. ADMIN_ONLY — 수정으로 operator 접근이 차단된 API

| # | Endpoint | 위치 | 프런트 소비 |
|---:|---|---|---|
| 1-5 | `GET·POST /api/v1/glycopharm/admin/pharmacies`, `GET·PUT /admin/pharmacies/:id`, `PATCH /admin/pharmacies/:id/status` | `glycopharm.controller.ts:145,171,213,240,285` | admin-dashboard `pages/glycopharm/pharmacies/*` |
| 6-10 | `GET·POST /api/v1/glycopharm/admin/products`, `GET·PUT /admin/products/:id`, `PATCH /admin/products/:id/status` | `glycopharm.controller.ts:330,362,414,441,500` | admin-dashboard `pages/glycopharm/products/*` |
| 11 | `POST /api/v1/glycopharm/operator/actions/execute/:actionId` | `glycopharm.routes.ts:363` (executeGuard) | **없음** (§5) |
| 12 | `PUT /api/v1/admin/services/glycopharm/legal-profile` | `admin-service-legal.controller.ts:105` | GP `/admin/settings/legal-terms` |
| 13-15 | `POST /policies`, `PUT /policies/:id`, `PATCH /policies/:id/publish` (`/api/v1/admin/services/glycopharm/*`) | 동 `:187,238,287` | 동상 |
| 16-17 | `GET·PUT /api/v1/admin/services/glycopharm/contact-settings` | `admin-service-contact-settings.controller.ts:147` | GP `/admin/settings/contact` |

17개 모두 **프런트에서 이미 admin 전용 화면**에서만 호출된다 → 차단해도 정상 동선 훼손 0.

### 4-2. OPERATOR_ALLOWED — 접근 집합 불변 (admin 도 계속 통과)

| 그룹 | Endpoint | 위치 |
|---|---|---|
| Operator Dashboard 전체 | `/api/v1/glycopharm/operator/**` (router-level) | `operator.controller.ts:34` |
| 진열·모집 | `PATCH /operator/products/:id/partner-recruiting`, `/operator/featured-products` 5종 | `glycopharm.controller.ts:543,595,628,678,708,748` |
| Event Offer 승인 | `GET /operator/event-offers/pending-listings`, `POST .../approve`, `.../reject` | `event-offer-operator.controller.ts:39,60,96` |
| Community Hub | 8 endpoints | `glycopharm-community-hub.controller.ts:68~182` |
| 자료실 | `/operator/resources` 4종 | `resources.controller.ts:361,425,495,532` |
| 공급 상품 신청 승인 | `/operator/product-applications` | `glycopharm.routes.ts:557` |
| 판매자 모집 노출 승인 | recruitment exposure proxy | `glycopharm.routes.ts:561` |
| 뉴스/공지 운영 | `/news` 운영 ops | `glycopharm.routes.ts:725` |
| Action Queue 조회·보류 | `GET /operator/actions`, `POST /operator/actions/dismiss/:id` | `action-queue.controller.ts:39,132` |
| 약관·문의 조회 | `GET legal-profile`, `GET policies`, `GET policies/:id` | `admin-service-legal.controller.ts:90,148,169` |
| 문의 처리 | `contact-inquiries` 목록·상세·상태·메모 | `admin-contact-inquiry.controller.ts:88` (`requireServiceLegalScope('operator')`) |

### 4-3. STORE_OWNER / PUBLIC_OR_AUTHENTICATED — 영향 없음

- `store_owner` 축(`/pharmacy/*`, `/store-hub/*`, `/stores/*`)은 `createPharmacyContextMiddleware` ·
  serviceKey 주입 store guard 를 쓰며 **scope guard 를 경유하지 않는다.**
  `pharmacy-context.middleware.ts` 의 `ADMIN_ROLES` 는 자체 인라인 배열이라 `scopeRoleMapping` 과 무관하다.
- `forum` · `public` · `checkout` · `payments` · `home` · `contents` 는 `authenticate`/`optionalAuth` 축.

### 4-4. UNUSED / REVIEW

`requireGlycopharmScope` 로 보호되면서 소비처가 없는 endpoint 는 발견되지 않았다. REVIEW 대상 0건.

---

## 5. Action Queue 판정 (WO §3.6)

**확정: `glycopharm:admin` = execute 만. 조회·보류는 operator 업무.**

근거 — `createActionQueueRouter(dataSource, config, executeGuard)` 의 3번째 인자는
[`action-queue.controller.ts:129`](../../apps/api-server/src/common/action-queue/action-queue.controller.ts)
의 `POST /actions/execute/:actionId` **한 곳에만** 적용된다 (router-level 가드가 아니다).

```text
GET  /actions                    → 가드 없음(상위 operator 가드에 종속)
POST /actions/execute/:actionId  → executeGuard = glycopharm:admin
POST /actions/dismiss/:actionId  → 가드 없음(동상)
```

`/operator` 는 `operator.controller.ts:34` 의 `router.use(requireGlycopharmScope('glycopharm:operator'))`
가 먼저 걸리므로, action queue 조회·보류도 **operator 이상만** 도달한다 (인증만으로 뚫리지 않음 — 실측 확인).

3개 서비스 모두 executeGuard 로 `{service}:admin` 을 넘기고 있어 **execute=admin 은 교차 서비스 공통 계약**이다
(KPA `kpa.routes.ts:267` · Cosmetics `cosmetics.routes.ts:116`). GlycoPharm 만 mapping 부재로 그 의도가
실현되지 않고 있었다.

> **WO §4 경고 준수**: mapping 추가는 `/glycopharm/operator/**` 를 admin 전용으로 만들지 **않는다.**
> operator 업무 API 전량(§4-2)은 그대로 유지되고, execute 1개만 설계 의도대로 admin 전용이 된다.
> 프런트 전수 조사 결과 **어떤 서비스도 `actions/execute` 를 호출하지 않아** UI 회귀도 0이다.

---

## 6. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/security-core/src/service-configs.ts` | **동작 변경 1건** — `GLYCOPHARM_SCOPE_CONFIG.scopeRoleMapping` 추가 |
| `apps/api-server/src/__tests__/security/scope-guard.spec.ts` | 계층·교차서비스·config 계약 테스트 4건 추가 |
| `apps/api-server/src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` | 주석만 (GlycoPharm 상태 서술이 사실과 어긋나게 되어 정정) |
| `apps/api-server/src/modules/contact-inquiry/admin-contact-inquiry.controller.ts` | 주석만 (동상) |
| `services/web-glycopharm/src/pages/operator/OperatorContactInquiriesPage.tsx` | 주석만 (backend 가드 레벨·fallback 서술 정정) |
| `docs/rbac/RBAC-ROLE-CATALOG-V1.md` | 정본 문서 — GlycoPharm 예외 서술 해소 반영 |

핵심 변경:

```ts
scopeRoleMapping: {
  'glycopharm:admin':    ['glycopharm:admin'],
  'glycopharm:operator': ['glycopharm:operator', 'glycopharm:admin'],
},
```

`security-core` 는 F1 Freeze 대상이나 본 변경은 **권한 상승 결함의 버그 수정**이며 구조 변경이 아니다
(KPA `WO-KPA-SCOPE-HIERARCHY-FIX-V1` 이 같은 파일에 동일 형태로 선행 적용된 전례가 있다).
`membership-guard.middleware.ts`(Core F10) 는 **무변경**이다.

---

## 7. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 보안 테스트 전체 | `pnpm run test:security` | ✅ **13 suites / 300 tests PASS** |
| 신규 계층 테스트 | `jest scope-guard --verbose` | ✅ 32 tests PASS (신규 4건 실행 확인) |
| 가드 인벤토리 | `jest admin-api-guard-inventory` | ✅ 8 PASS |
| KPA 역할 가드 (무회귀) | `jest kpa-role-guard` | ✅ 24 PASS |
| security-core 빌드 | `pnpm --filter @o4o/security-core run build` | ✅ exit 0 (dist 반영 확인) |
| api-server typecheck | `tsc --noEmit` | ✅ exit 0 |
| api-server build | `tsc -p tsconfig.build.json` | ✅ exit 0 |
| web-glycopharm typecheck | `tsc -b` | ✅ exit 0 |

### 7-1. WO §7 최소 검증표

| 역할 | Admin 전용 API | Operator 허용 API | 타 서비스 영향 |
|---|---|---|---|
| GlycoPharm admin | ✅ 허용 (`glycopharm:admin` scope PASS) | ✅ 허용 (mapping 으로 operator scope 포함) | 없음 |
| GlycoPharm operator | ✅ **차단 403** (신규 테스트로 증명) | ✅ 허용 (집합 불변) | 없음 |
| store_owner | ✅ 차단 (allowedRoles 미포함) | 계약에 따름 — scope guard 비경유 축(§4-3) | 없음 |
| 타 서비스 역할 (kpa/neture/cosmetics) | ✅ 차단 403 | ✅ 차단 403 (신규 테스트로 증명) | 없음 |
| 인증 없음 | ✅ 401 (기존 계약 유지) | ✅ 401 | 없음 |

신규 테스트가 직접 증명하는 항목:

```text
glycopharm:admin  role → glycopharm:operator scope  ALLOW
glycopharm:operator role → glycopharm:admin scope   DENY 403
kpa/neture/cosmetics:admin → glycopharm 양 scope    DENY 403
scopeRoleMapping 전 scope 명시 (fallback 의존 금지)   계약 고정
```

---

## 8. 타 서비스 영향 0 확인

- `GLYCOPHARM_SCOPE_CONFIG` 소비처는 GlycoPharm 미들웨어·라우트·테스트와
  `service-legal-scope.ts` 뿐이다. 후자는 `:serviceKey` path param 으로 **서비스별 config 를 각각** 조회하므로
  `serviceKey='glycopharm'` 요청에만 적용된다.
- KPA · Neture · K-Cosmetics · Pharmacy-Hub 의 config 는 **한 줄도 변경하지 않았다.**
- 무회귀 실측: `kpa-role-guard` 24 PASS · `pharmacy-hub-scope-guard` PASS · `cross-service` PASS.

---

## 9. 금지사항 준수

| 금지 | 준수 |
|---|:---:|
| KPA·K-Cosmetics·Neture·Pharmacy-Hub 권한 변경 | ✅ 없음 (config 무변경, 주석 1곳만) |
| 메뉴·레이아웃 공통화 | ✅ 없음 |
| 라우트 URL 변경 | ✅ 없음 |
| 인증 방식·로그인 API 변경 | ✅ 없음 |
| role·scope 명칭 변경 | ✅ 없음 |
| DB write · migration | ✅ 없음 (DB 접속 없음) |
| 계정·membership 데이터 수정 | ✅ 없음 |
| 임시 권한 우회 | ✅ 없음 |
| 무관한 리팩터링 | ✅ 없음 (주석·정본 정정은 본 변경으로 사실이 바뀐 서술에 한정) |
| lockfile · 타 세션 파일 스테이징 | ✅ 없음 — §9-1 |
| 운영 배포 | ✅ 없음 |

### 9-1. 병렬 세션 격리

작업 중 다른 세션이 `apps/admin-dashboard/src/{api/vendor,components/vendor,pages/supplierops}/**` 를
staged 삭제·수정·미추적 생성 상태로 보유하고 있었다. **접촉하지 않았고**,
커밋은 `git commit -- <pathspec>` 으로 본 WO 6파일 + CHECK 로 범위를 고정했다.

---

## 10. commit / push

| 항목 | 값 |
|---|---|
| commit | §아래 |
| push | §아래 |
| 완료 조건 | 본 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

## 11. 후속 (본 WO 범위 아님)

1. **`WO-O4O-CROSSSERVICE-SCOPE-FALLBACK-BAN-V1`** — `createServiceScopeGuard` 의 mapping 부재 fallback 자체가
   위험 기본값이다. 5개 서비스 모두 mapping 을 갖춘 지금, fallback 을 제거하거나 起動 시 경고를 내는 안을 검토.
2. **K-Cosmetics Action Queue 진입 가드** — `cosmetics.routes.ts:116` 은 KPA 와 달리 mount 지점에
   router-level operator 가드가 없다. GlycoPharm 은 `operator.controller` 가 선행해 덮고 있으나
   KCos 도 동일한지는 본 WO 범위 밖이라 확인하지 않았다.

---

*작성: 2026-08-10 · 기준 commit `76c3435d2`*
