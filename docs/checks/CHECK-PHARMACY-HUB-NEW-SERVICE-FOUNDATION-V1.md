# CHECK-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1

> WO: [WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1](../work-orders/WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md)
> 실행일: 2026-07-30
> 기준: 현재 `main` 실제 코드 (문서보다 코드 우선)
> 판정: **PASS** — Foundation 범위 완료, 배포 미연결(WO §6 준수)

---

## 1. 조사 — 신규 서비스가 모노레포에 등록되는 실제 축

| # | 축 | Canonical 위치 | Pharmacy-Hub 조치 |
|:-:|---|---|---|
| 1 | 서비스 키 상수 | `apps/api-server/src/constants/service-keys.ts` (`SERVICE_KEYS`) | 키 2개 추가 |
| 2 | 서비스 identity (표시명/도메인/가입) | `apps/api-server/src/config/service-catalog.ts` (`O4O_SERVICES`) | 엔트리 추가 (`joinEnabled: false`) |
| 3 | 역할 타입·레지스트리 | `apps/api-server/src/types/roles.ts` (`ServiceType`, `PrefixedRole`, `ROLE_REGISTRY`) | 3역할 추가 |
| 4 | Scope Guard 타입 | `packages/security-core/src/types.ts` (`ServiceKey` union) | type-only union 확장 |
| 5 | Scope Guard 인스턴스 | `createMembershipScopeGuard(config)` — 기본 DENY | api-server 로컬 config 신설 |
| 6 | 라우트 마운트 | `apps/api-server/src/bootstrap/register-routes.ts` | 블록 27b 추가 |
| 7 | 가입/승인 SSOT | `service_memberships (user_id, service_key, status)` | **구조 변경 불필요** (이미 service-generic) |
| 8 | RBAC SSOT | `role_assignments` (F9/F11) | prefix `pharmacy-hub:` self-map |
| 9 | role prefix → membership key | `resolveCanonicalServiceKey` | self-map 이므로 **매핑 추가 불필요** |
| 10 | 프론트 앱 | `services/web-*` (pnpm workspace `services/*`) | `services/web-pharmacy-hub` 신설 |
| 11 | 배포 | `.github/workflows/deploy-web-services.yml` + Dockerfile | **미변경** (Dockerfile 파일만 포함) |
| 12 | CORS/쿠키 | `getServiceOrigins()` (service-catalog 파생) | 카탈로그 엔트리로 자동 반영 |
| 13 | 이벤트 오퍼 매핑 | `constants/event-offer-service-mapping.ts` (`TARGET_TO_EVENT_OFFER_KEY`) | **미변경** (§4 참조) |

### 재사용 기반 선정

**선정: 공통 패키지 조립 (`@o4o/auth-client` + `@o4o/auth-utils`) — 기존 앱 clone 아님.**

- 기존 4개 웹 서비스는 serviceKey 를 login/membershipGate/apiClient 등 여러 파일에 하드코딩하는 패턴을 공유한다. clone 하면 그 drift 를 그대로 승계한다.
- Pharmacy-Hub 는 `src/config/service.ts` 단일 SSOT 만 참조하도록 시작했다.
- 인증·멤버십 판정 로직은 신규 작성하지 않고 공통 패키지 헬퍼(`parseAuthResponse` / `normalizeMemberships` / `extractRoles` / `resolveAuthError`)를 그대로 사용한다.

### 문서 ↔ 코드 차이

- `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx:58` 에 `key: 'pharmacy-hub'` 가 존재하나, 이는 **UI 카드 그룹 키**("약국 HUB 운영")로 서비스 키 축과 무관하다. 충돌 아님.

---

## 2. 등록한 서비스 키

| 키 | 층위 | 용도 | 현재 연결 상태 |
|---|---|---|---|
| `pharmacy-hub` | platform-level | `service_memberships.service_key` · role prefix · 라우트 · 카탈로그 | 연결됨 |
| `pharmacy-hub-event-offer` | event-offer | 후속 이벤트 오퍼 WO | **키만 등록** — `TARGET_TO_EVENT_OFFER_KEY` 미등록 |

`pharmacy-hub-event-offer` 를 매핑에 넣으면 기존 공급자 제안 UI 에 즉시 노출되므로 Foundation 범위 밖으로 유보했다.

---

## 3. 생성·변경 목록

### 변경 (6)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/constants/service-keys.ts` | `PHARMACY_HUB`, `PHARMACY_HUB_EVENT_OFFER` |
| `apps/api-server/src/config/service-catalog.ts` | `nameKo?` optional 필드 + `pharmacy-hub` 엔트리 |
| `apps/api-server/src/types/roles.ts` | `ServiceType` 확장 · `PharmacyHubRole` · `ROLE_REGISTRY` 3엔트리 |
| `apps/api-server/src/bootstrap/register-routes.ts` | 블록 27b — `/api/v1/pharmacy-hub` |
| `packages/security-core/src/types.ts` | `ServiceKey` union 에 `'pharmacy-hub'` (type-only) |
| `pnpm-lock.yaml` | `pharmacy-hub-web` importer |

### 신규 (23 파일, 1,027줄)

- `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts` (59)
- `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` (111)
- `services/web-pharmacy-hub/**` (21 파일, 857)

### 구현 라우트

| 메서드 | 경로 | 가드 |
|---|---|---|
| GET | `/api/v1/pharmacy-hub/service-info` | public (카탈로그 조회 실패 시 500 `SERVICE_NOT_REGISTERED`) |
| GET | `/api/v1/pharmacy-hub/me/access` | `requireAuth` — membershipStatus + 역할 + entryPoints |
| GET | `/api/v1/pharmacy-hub/operator/ping` | `requireAuth` + `requirePharmacyHubScope('pharmacy-hub:operator')` |
| GET | `/api/v1/pharmacy-hub/store-owner/ping` | `… ('pharmacy-hub:store_owner')` |
| GET | `/api/v1/pharmacy-hub/supplier/ping` | `… ('pharmacy-hub:supplier')` |

프론트 라우트: `/` · `/login` · `/store-owner` · `/supplier` · `/operator` (뒤 3개 `MembershipGate`).

### 공유 패키지 변경 근거 (`security-core` = F1 Freeze 대상)

- 변경은 **union 확장 1건(type-only)** 뿐이며 기존 5개 키의 동작·설정은 불변이다.
- `@o4o/security-core` 의존처는 `apps/api-server` 단독. 해당 타입 위의 `Record<ServiceKey, …>` 전수 매핑은 존재하지 않는다.
- Guard 설정 본체(`service-configs.ts`)는 건드리지 않고, Pharmacy-Hub config 는 api-server 로컬에 두었다.
- Guard 기본값이 DENY 이므로 기존 서비스 config 수정은 불필요하다.

---

## 4. 재사용 경계 (설계상 — 코드 중복 0)

| 도메인 | 재사용 대상 | 분리 대상 |
|---|---|---|
| 사용자 | `users` 공통 | — |
| 가입/승인/회원상태 | `service_memberships` 공통 테이블 | `service_key='pharmacy-hub'` row 로 **서비스별 분리** |
| 권한 | `role_assignments` 공통 | prefix `pharmacy-hub:` |
| 조직 | `organizations` 공통 | — |
| 상품 | `ProductMaster` · `SupplierProductOffer` 공통 | `SupplierProductOffer.serviceKeys` 노출 경계만 |
| 주문/장바구니 | 공통 주문·결제 원장 (`checkoutService.createOrder()`) | serviceKey 경계 |
| 콘텐츠 | 공통 콘텐츠 원장 | serviceKey 경계 |

- 기존 회원 자동 편입 없음 — 미가입자는 로그인 시 `SERVICE_NOT_MEMBER` 로 차단된다.
- 운영자는 공급자↔약국 상품 거래·공급자 콘텐츠 전달에 개입하지 않는다. 이를 코드로 못박기 위해 **operator 역할이 store_owner/supplier scope 를 상속하지 않도록** `scopeRoleMapping` 을 1:1 로 두었다.
- Market Trial(유통참여 펀딩) 연동·코드 복제 **0건**.

---

## 5. 미포함 범위 (WO §6 준수)

별도 DB · Pharmacy-Hub 전용 ProductMaster · SupplierProductOffer 복제 · 기존 회원 자동 편입 · 상품 승인/카탈로그/주문/결제/정산 · 소비자 회원·주소록·CRM · 콘텐츠 저작/임포트 · 커뮤니티 · 이벤트 오퍼 자동승인 · Market Trial 연동 · 기존 서비스 정책 변경 · **migration(따라서 `platform_services` row seed 미수행)** · 배포·DNS 변경 · 타 작업자 WIP 수정.

---

## 6. Stop 조건 점검 (§5)

| # | 조건 | 판정 | 근거 |
|:-:|---|:-:|---|
| 1 | 기존 회원·주문 의미 변경 필요 | 미해당 | 기존 키 동작 불변, additive 만 |
| 2 | 상품·주문 원장 복제 필요 | 미해당 | 공통 원장 재사용 설계 |
| 3 | 멤버십이 서비스별 분리 불가 | 미해당 | `service_memberships` 이미 service-generic |
| 4 | 인증·쿠키 단일 도메인 고정 | 미해당 | `auth-register.controller.ts` 가 임의 serviceKey 수용 |
| 5 | 공유 패키지 변경이 광범위 회귀 | 미해당 | type-only, 의존처 1개, 기존 4앱+api-server 타입체크 PASS |
| 6 | 타 작업자 미커밋 변경 수정 필요 | 미해당 | `apps/api-server/src/scripts/**`·`HubContentsPage.tsx` 미접촉 |
| 7 | 도메인/Cloud Run/DNS 없이 골격 불가 | 미해당 | 로컬 빌드·렌더 PASS |

---

## 7. 검증 실행 결과 (§7)

| # | 항목 | 명령 | 결과 |
|:-:|---|---|:-:|
| 1 | 신규 키 인식 (공통 타입) | `pnpm --filter @o4o/security-core build` | PASS |
| 2 | 신규 키 인식 (backend) | `tsc -p apps/api-server/tsconfig.build.json --noEmit` | EXIT=0 |
| 2b | backend 실제 emit | `tsc -p tsconfig.build.json --outDir <temp>` | EXIT=0 |
| 3 | 신규 앱 빌드 | `pnpm --filter pharmacy-hub-web build` (`tsc -b && vite build`) | PASS — 164 modules / JS 277.36 kB · CSS 8.09 kB |
| 4 | 기본 라우트 렌더 | headless chromium, `vite preview` 5개 경로 | PASS — **콘솔 에러 0** |
| 5 | 표시명 노출 | `/` 렌더 확인 | `Pharmacy-Hub` / `파머시 허브` / `pharmacyhub.co.kr` 표시 |
| 6 | 키 충돌 없음 | 전 저장소 `'pharmacy-hub'` grep | 충돌 0 (GlycoPharm 1건은 UI 카드 키) |
| 7 | 기존 4서비스 회귀 없음 | `web-glycopharm` / `web-kpa-society` / `web-k-cosmetics` / `web-neture` `tsc -b` | 전부 EXIT=0 |
| 8 | Market Trial 흔적 없음 | grep | 0건 |
| 9 | 공통 원장 재사용 | 설계 검토 (§4) | 신규 테이블·복제 0 |

렌더 상세: `/` = 브랜드 + tagline + 도메인 + 역할별 진입점 / `/login` = "Pharmacy-Hub 로그인" / `/store-owner`·`/supplier`·`/operator` = MembershipGate "로그인이 필요합니다".

### 미수행 검증 및 사유

| 항목 | 사유 |
|---|---|
| backend 런타임 스모크 (실제 HTTP 호출) | 로컬 standalone 기동이 **기존** ESM entity 순환 위험(`MediaListItem.entity.js` → `Cannot access 'MediaList' before initialization`)과 tsx decorator metadata 미방출에 막힘. 본 변경과 무관한 사전 존재 이슈. 대체로 clean 전체 컴파일 + 정적 라우트 등록 확인 |
| 프로덕션 DB 확인 | 로컬에 프로덕션 자격증명 없음 (`apps/api-server/.env` 의 `DB_PASSWORD` 공백). DB read 미수행 |

---

## 8. 잔여 부채 / 주의점

- **`platform_services` row 미seed** — `SERVICE_KEYS` 의 모든 값은 `platform_services.code` 에 존재해야 한다는 규약이 있으나, 본 Foundation 은 migration 을 추가하지 않았다(WO §6). 가입·승인 WO 에서 `joinEnabled: true` 전환과 함께 seed 한다.
- **`apps/api-server/src/scripts/audit-roles.ts`** 에 `Record<ServiceKey | 'none', number>` 리터럴이 있어, scripts 가 빌드에 포함되면 `pharmacy-hub` 엔트리가 필요하다. 현재 `tsconfig.build.json` 이 `src/scripts/**/*` 를 제외하므로 빌드 영향 없음. 또한 해당 파일은 병행 세션 소유이므로 미접촉.
- Dockerfile 은 포함했으나 `deploy-web-services.yml` 미변경 · Cloud Run 서비스/DNS 미생성. 신규 workspace 의존 추가 시 Dockerfile COPY 2곳 동시 갱신 필수.

---

## 9. 후속 작업 (우선순위)

1. 가입·승인 (`service_memberships` write-path + 운영자 승인 콘솔, `joinEnabled: true`, `platform_services` seed)
2. 공급자 상품 공급 (`SupplierProductOffer.serviceKeys` 확장 — 운영자 상품 승인 없음)
3. B2B 카탈로그·장바구니·주문 (공통 원장 재사용)
4. 공급자 콘텐츠 · 운영자 콘텐츠(공지)
5. 커뮤니티
6. 이벤트 오퍼 (`pharmacy-hub-event-offer` → `TARGET_TO_EVENT_OFFER_KEY` 등록)
7. 소비자 직배송 배송지 (기존 B2B 주문 배송지 기능 재사용, 소비자 회원 없음)
8. `pharmacyhub.co.kr` 배포·DNS
