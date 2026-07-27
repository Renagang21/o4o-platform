# CHECK — Neture 운영자 잔여 갭 정리 및 KPA 인계

> WO-O4O-NETURE-OPERATOR-REMAINING-GAPS-CLOSE-AND-KPA-HANDOFF-V1
> 작업일: 2026-07-27
> 상태: **Neture 운영자 정비 트랙 종료 → KPA-Society 운영자 트랙 인계**

---

## 1. `AllProductsOverviewPage` 최종 판정 — **orphan 재확인 → dead code 제거**

- 동시 세션 커밋 `513b8a22c` 는 **docs-only** (load-error CHECK). 해당 화면 코드 미변경.
- 동시 load-error 세션은 `d8d44734b` 에서 **AllRegisteredProductsPage · OperatorProductApprovalPage** 를 커밋하고,
  CHECK 를 **PARTIAL(`2413dbf43`)** 로 정정하며 이 파일을 인계함.
- **라우팅 검증(smoke 준비 중) 결과 결정적 사실 발견:** `AllProductsOverviewPage` 는 **importer 0건**
  (App.tsx · 메뉴/nav/JSON 어디에도 미참조). 실제 라이브 화면은 **`AllRegisteredProductsPage`**
  (`/operator/all-registered-products` 마운트)이고, `/admin/all-products`·`/operator/all-products`·`/operator/supply`
  는 모두 그쪽으로 **redirect**. 즉 `AllProductsOverviewPage` 는 **superseded orphan**.
- 라이브 화면 `AllRegisteredProductsPage` 는 이미 `d8d44734b` 에서 **DataTable + load-error 계약**
  (loadError·AlertTriangle·다시 시도) 보유 → load-error WO 목표는 **라이브 화면에서 이미 달성**.
  PARTIAL 노트가 가리킨 orphan 파일은 실 소비 화면이 아니었음(오귀속).
- **처리(정정):** V7 에서 held → finalize(`fcfd6aeb0`) 했으나 대상이 도달 불가 화면이었음.
  orphan(소비처 0건 재확인)이므로 **dead code 로 제거**(item 4 기준 적용). 도달 불가 화면의 DataTable 사본을 유지하지 않음.
- 검증: 제거 후 web-neture vite build GREEN. 제거 커밋 `1bd1f06d2` (finalize `fcfd6aeb0` 정정).
  → **item 1 = 사용자 화면 잔여 없음(라이브 화면은 이미 표준+계약 충족, orphan 제거).**
  브라우저 smoke 는 대상 라우트가 없어 불가 — 라이브 화면(`all-registered-products`)이 표준 준수하는 것이 실질 검증.

## 2. Operator notification 정책 — **판정만 보고 (미변경, HOLD)**

- 엔드포인트: `GET/PUT /api/operator/settings/notifications` (`OperatorNotificationController`).
- 데이터 성격: **서비스별(serviceCode) 운영자 알림 정책** — 서비스별 운영자 수신 이메일 + 알림 유형 토글.
  `getOperatorEmail(serviceCode)` 로 이메일 서비스가 서비스별 발송에 소비. → 플랫폼 공통 인프라 아님.
- 현재 가드: `requireRole([platform:super_admin, platform:admin, admin, operator, staff])`.
  무접두 `admin/operator/staff` 는 role_assignments 보유자 **0명**(RBAC 는 서비스 접두 역할 사용) →
  **실질적으로 플랫폼 관리자 전용.**
- **판정:** 데이터가 서비스 범위이므로 개념상 자연 소유자는 `neture:admin`. **그러나 지금 개방하지 않는다:**
  1. 컨트롤러가 `serviceCode` 를 query/body 에서 우선 취하고 **호출자 스코프와 대상 serviceCode 일치 검사가 없음**
     → `neture:admin` 개방 시 `?serviceCode=glycopharm` 로 **교차 서비스 알림 이메일 열람/수정 가능**(경계 위반).
     안전 개방에는 serviceCode 스코프 일치 가드(백엔드 로직) 추가 필요.
  2. 선행 WO(`...ADMIN-RBAC-LEGACY-...-CONSOLIDATED-V1`)가 이 결정을 전용 정책 WO
     (`WO-…-OPERATOR-NOTIFICATION-SERVICE-SCOPE-POLICY-V1`)로 **명시적으로 이월**.
- WO 원칙("불명확하면 변경하지 않고 판정만 보고", "정책 불명확 접근 확대 금지", 중지 조건 "notification 접근 범위 충돌") 준수 → **미변경.**

## 3. 플랫폼 Super Admin 의 Neture 콘솔 접근 — **판정만 보고 (Frozen Core, 미변경)**

- 경로: `requireNetureScope` (= `createMembershipScopeGuard(NETURE_SCOPE_CONFIG)`).
  `membership-guard.middleware.ts:77` — `config.platformBypass && user.roles.includes('platform:super_admin')` → 멤버십/스코프 검사 생략 통과.
- `NETURE_SCOPE_CONFIG.platformBypass = true` (security-core `service-configs.ts:146`).
- **비상 접근:** `platform:super_admin` 은 **Neture 서비스 역할/멤버십 없이** operator/admin 콘솔 접근 가능 — 이것이 현재의 break-glass 경로("운영/디버깅 최소 예외").
- **일반 운영 vs 비상 구분:** 가드 레벨에서 **구분 없음** — 동일 코드 경로, 별도 break-glass 플래그 없음.
- **감사 로그/역할 표시:** bypass 발동 시 **감사 로그·마커 없음.**
- **판정:** 이 미들웨어는 **Frozen Core (F10 O4O-CORE-FREEZE-V1)** — CORE_CHANGE WO 없이 수정 금지.
  WO 지시("새 impersonation·역할 전환 기능 금지")와도 정렬. → **미변경.** break-glass 감사 로깅은 후속 CORE_CHANGE 후보로만 기록.

## 4. Dead controller 3종 재확인 — **1종 제거, 2종 보존(숨은 소비처)**

| 후보 | 판정 | 근거 |
|------|------|------|
| `SupplierEntityController.ts` | **제거** | route import 0 · app mount 0(3개 IR 확인) · barrel 0(entity/ 유일 파일) · 동적 import 0 · test 0 · swagger 0. 유일 참조=자기 자신 + Supplier.ts 주석(수정) + 문서. |
| `operator-registration.controller` | **보존** | **LIVE** — `neture.routes.ts:163` 에서 `router.use('/operator', createOperatorRegistrationController(...))` 마운트. 선행 IR "dead" 분류는 stale. |
| `modules/sites` | **보존** | `Site` 엔티티 **LIVE** — `database/entities.ts` TypeORM 등록 + `service-monitor.service.ts` 소비(`siteRepository`). `sites.routes.ts` 만 미마운트이나 barrel(index.ts)로 live 엔티티와 얽힘. |

- 중지 조건 "dead controller 숨은 소비처 발견" → 2종에서 발동 → 해당 항목 보존, 나머지 계속.
- `SupplierEntityController` 제거 후 api-server typecheck GREEN. 커밋 `2abe26218`.

## 5. Neture 운영자 정비 최종 잔여 — **핵심 잔여 없음 → 트랙 종료**

| 범주 | 잔여 |
|------|------|
| 사용자 화면 | 없음 (V7 24건 누계 종료. AllProductsOverview 는 orphan 으로 제거 — 라이브 화면 AllRegisteredProducts 는 이미 표준+계약 충족) |
| 권한 정책 | notification 서비스 개방 = 전용 정책 WO 로 이월(구현 아님). super_admin break-glass 감사 = Frozen Core 후속 후보 |
| 코드 정리 | SupplierEntityController 제거 완료. 나머지 2 후보는 live → 보존(잔여 아님) |
| 구조상 의도적 제외 | 트리/리포트/에디터형 화면, Frozen Core 미들웨어, 교차서비스 가드 개방 |

→ **실 업무 영향이 있는 잔여 없음. Neture 운영자 정비 트랙 종료.**

## 6. 후속 필요 여부

- 즉시 필요한 후속 **없음.**
- 조건부(정책 결정 시): `WO-…-OPERATOR-NOTIFICATION-SERVICE-SCOPE-POLICY-V1` (serviceCode 스코프 일치 가드 포함), super_admin break-glass 감사 로깅(CORE_CHANGE).

## 7. KPA-Society 운영자 트랙 인계 우선순위

CLAUDE.md §13 (KPA = 공통 구조 reference implementation) 기준, Neture 에서 정립한 패턴을 KPA 운영자에 적용:
1. KPA 운영자 콘솔 목록 화면 `DataTable` 표준화 상태 감사 (Neture V2~V7 대응).
2. KPA 운영자 조회 실패 load-error 계약 적용 상태 점검 (Neture load-error 시리즈 대응).
3. KPA 운영자 권한 가드 정합성 (`requireKpaScope` platformBypass·membership 정책 확인).

## 8. 커밋·배포

- `fcfd6aeb0` — AllProductsOverviewPage finalize (web-neture) — **`1bd1f06d2` 로 정정(orphan 제거)**
- `1bd1f06d2` — 위 orphan(AllProductsOverviewPage) dead code 제거 (web-neture)
- `2abe26218` — SupplierEntityController 제거 (api-server)
- `a3365797a` — 본 CHECK 최초 작성
- 본 CHECK 갱신(item 1 정정 + 커밋 기록) 커밋은 이 커밋 자신.
- 배포: push 후 CI detect-changes (web-neture + api-server). web-neture 는 `1bd1f06d2` 배포로 최종 상태 확정.
  라이브 화면 `AllRegisteredProductsPage` 는 이번 WO 미변경(이미 표준+계약 충족) → 회귀 위험 없음.
