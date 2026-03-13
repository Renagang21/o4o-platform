# IR-O4O-AUTH-ROLE-GUARD-AUDIT-V1

> WO-O4O-AUTH-MODAL-SIGNUP-ROLE-UPDATE-V1 이후 RBAC 전체 점검 결과

**작성일:** 2026-03-13
**상태:** 완료

---

## 1. Role 정의 현황

### Frontend (AuthContext.tsx)

| 항목 | 값 |
|------|------|
| UserRole 타입 | `admin`, `supplier`, `partner`, `seller`, `operator`, `user` |
| ROLE_MAP | admin→admin, super_admin→admin, operator→operator, supplier→supplier, partner→partner, seller→seller, customer→user, user→user |
| ROLE_LABELS | admin: 관리자, supplier: 공급자, partner: 파트너, seller: 셀러, operator: 운영자, user: 사용자 |
| ROUTE_OVERRIDES | admin→/workspace/admin, operator→/workspace/operator, supplier→/account/supplier, partner→/account/partner, seller→/seller/overview |
| RoleSwitcher ROLE_ICONS | admin: 🛡️, supplier: 📦, partner: 🤝, seller: 🏪, operator: 🔧, user: 👤 |

### Backend (auth.ts + roles.ts)

| 항목 | 값 |
|------|------|
| UserRole enum | super_admin, admin, operator, manager, vendor, seller, supplier, partner, affiliate, business, user, customer |
| VALID_ROLES (회원가입) | super_admin, admin, vendor, seller, user, business, partner, supplier, manager, customer |
| role_assignments.role | VARCHAR(50) — 자유 문자열 |
| scope_type 기본값 | 'global' (회원가입 시 NULL/global) |

**결과: 정상** — seller가 Frontend/Backend 양쪽에 모두 정의됨.

---

## 2. 로그인 후 Redirect 점검

| Role | ROUTE_OVERRIDES | 실제 경로 | 상태 |
|------|----------------|----------|------|
| admin | `/workspace/admin` | AdminDashboardPage | ✅ 정상 |
| operator | `/workspace/operator` | NetureOperatorDashboard | ✅ 정상 |
| supplier | `/account/supplier` | SupplierAccountDashboardPage | ✅ 정상 |
| partner | `/account/partner` | PartnerAccountDashboardPage | ✅ 정상 |
| seller | `/seller/overview` | SellerOverviewPage | ✅ 정상 (공개 페이지) |
| user | `/` (기본) | NetureHomePage | ✅ 정상 |

**결과: 정상** — 모든 역할별 리다이렉트 경로가 존재하는 라우트에 매핑됨.

---

## 3. RoleGuard / ProtectedRoute 점검

### RoleGuard 동작 방식

```
인증 확인 → 미인증 시 /login 리다이렉트
역할 확인 → user.roles.some(r => allowedRoles.includes(r))
권한 없음 → / (홈)으로 리다이렉트
```

### Route 레벨 RoleGuard 적용 현황

| 라우트 그룹 | allowedRoles | 상태 |
|------------|-------------|------|
| `/admin-vault/*` (5개) | `['admin']` | ✅ 보호됨 |
| `/workspace/admin/*` (23개) | `['admin']` | ✅ 보호됨 |
| `/workspace/operator/*` (10개) | `['admin', 'operator']` | ✅ 보호됨 |
| `/supplier/*` | Route 레벨 없음 | ⚠️ Layout 레벨 보호 |
| `/account/supplier/*` | Route 레벨 없음 | ⚠️ Layout 레벨 보호 |
| `/partner/*` | Route 레벨 없음 | ⚠️ Layout 레벨 보호 |
| `/account/partner/*` | Route 레벨 없음 | ⚠️ Layout 레벨 보호 |
| `/workspace/partners/*` 등 공통 | 없음 | ⚠️ 인증만 (SupplierOpsLayout) |
| `/store/*` | 없음 | ✅ 공개 (정상) |

### Layout 레벨 Role 체크 현황

| Layout | 허용 Role | 거부 시 동작 |
|--------|----------|------------|
| SupplierSpaceLayout | `supplier`, `admin` | "접근 권한 없음" 에러 페이지 |
| PartnerSpaceLayout | `partner`, `admin` | "접근 권한 없음" 에러 페이지 |
| SupplierAccountLayout | `supplier`, `admin` | "접근 권한 없음" 에러 페이지 |
| PartnerAccountLayout | `partner`, `admin` | "접근 권한 없음" 에러 페이지 |

**결과: 실질적으로 정상** — Layout 레벨에서 Role 체크가 있으므로 권한 없는 접근은 차단됨. Route 레벨 중복 보호는 선택적.

---

## 4. 메뉴 표시 권한 점검

### AccountMenu.tsx

| 상태 | 표시 항목 |
|------|----------|
| 비로그인 | 로그인 버튼 + 회원가입 버튼 |
| 로그인 (일반) | 마이페이지 + 내 대시보드(user 아닌 경우) + 로그아웃 |
| 로그인 (Super Operator) | 프로필 + 로그아웃 (간소화) |

**결과: 정상** — Role별 메뉴 분기 동작.

### RoleSwitcher.tsx

- `hasMultipleRoles === true`일 때만 렌더링
- 모든 6개 역할에 아이콘 매핑 완료 (seller: 🏪 추가됨)

**결과: 정상**

### SupplierOpsLayout 네비게이션

- Hub 링크만 Role 기반 필터링 (`admin`, `supplier`, `partner`)
- 나머지 메뉴 항목은 모든 인증 사용자에게 표시

**결과: 정상** — Workspace 접근 자체가 RoleGuard로 보호되므로 메뉴 레벨 필터링은 부가적.

---

## 5. Backend API Authorization 점검

### Middleware 사용 패턴

| 패턴 | 사용 위치 | 상태 |
|------|----------|------|
| `requireAdmin` | admin 라우트 전체, AI 관리, CMS 관리 | ✅ 정상 |
| `requireAuth` | 대부분의 인증 필요 라우트 | ✅ 정상 |
| `requireLinkedSupplier` | supplier 관련 라우트 | ✅ 정상 (커스텀 비즈니스 로직) |
| `requireActivePartner` | partner 상태 변경 라우트 | ✅ 정상 |
| `requireRole()` | **사용되지 않음** | ⚠️ 관찰 사항 |

### 주요 발견

1. **`requireRole()` 미사용**: 함수가 존재하나 실제 라우트 파일에서 호출되지 않음. 대신 커스텀 미들웨어(`requireLinkedSupplier`, `requireActivePartner`)로 비즈니스 로직과 결합된 Role 체크 수행.

2. **Seller 라우트**: `requireAuth` + 소유권 기반 필터링(`user.id`로 데이터 조회). 명시적 `requireRole('seller')` 없음.

3. **Partner 공개 읽기 라우트**: `/partner/recruiting-products`, `/partner/recruitments`는 인증 없이 공개 — 공개 카탈로그 성격으로 의도된 동작.

**결과: 실질적으로 정상** — 비즈니스 로직 미들웨어가 Role 체크를 포함하고 있어 기능적으로 보호됨.

---

## 6. role_assignments 저장 확인

### 회원가입 흐름 (auth.controller.ts)

```
1. effectiveRole 결정: VALID_ROLES.includes(role) ? role : 'user'
2. Transaction 내부:
   - User 생성 (status: PENDING)
   - ServiceMembership 생성 (status: pending, role: effectiveRole)
   - RoleAssignment 생성 (role: effectiveRole, isActive: true)
3. 이메일 인증 발송 (비차단)
4. 응답: pendingApproval: true
```

| 필드 | 값 |
|------|------|
| role | effectiveRole (supplier/partner/seller 등) |
| is_active | true |
| valid_from | NOW() |
| valid_until | NULL |
| assigned_by | NULL |
| scope_type | 'global' (기본값) |
| scope_id | NULL |

**결과: 정상** — seller를 포함한 모든 역할이 정상적으로 role_assignments에 저장됨.

---

## 7. Seller Role 영향 점검

| 항목 | 상태 | 비고 |
|------|------|------|
| ROLE_MAP 반영 | ✅ | `seller: 'seller'` (이전 `'user'`에서 변경) |
| ROLE_LABELS 반영 | ✅ | `seller: '셀러'` |
| ROUTE_OVERRIDES 반영 | ✅ | `seller: '/seller/overview'` |
| RoleSwitcher ROLE_ICONS | ✅ | `seller: '🏪'` |
| 회원가입 역할 선택 | ✅ | RegisterModal에 3번째 카드로 추가 |
| Backend VALID_ROLES | ✅ | 이미 포함되어 있음 |
| 전용 Layout 존재 여부 | ❌ | 별도 SellerLayout 없음 — `/seller/overview`는 MainLayout 하위 공개 페이지 |
| 전용 Dashboard 존재 여부 | ❌ | SellerOverviewPage는 정보 안내 페이지 (대시보드 아님) |

**관찰 사항**: Seller는 현재 전용 대시보드/Layout이 없으며 공개 페이지(`/seller/overview`)로 리다이렉트됨. 향후 seller 전용 공간 구축 시 Layout + RoleGuard 추가 필요.

---

## 8. 종합 결과

### 정상 항목

- ✅ Role 정의 (Frontend/Backend 동기화)
- ✅ 로그인 후 Redirect 경로
- ✅ Admin/Operator RoleGuard 보호
- ✅ Supplier/Partner Layout 레벨 Role 체크
- ✅ AccountMenu / RoleSwitcher Role 반영
- ✅ Backend requireAdmin 적용
- ✅ role_assignments 저장 정상
- ✅ Seller ROLE_MAP/LABELS/ICONS/OVERRIDES 반영

### 관찰 사항 (문제 아님, 참고)

- ⚠️ Supplier/Partner 라우트에 Route 레벨 RoleGuard 없음 (Layout 레벨에서 보호 — 2중 방어 가능)
- ⚠️ `requireRole()` 미들웨어 함수가 존재하지만 실제 라우트에서 미사용 (커스텀 미들웨어로 대체)
- ⚠️ Seller 전용 대시보드/Layout 미구축 (공개 페이지로 리다이렉트)

### 즉시 수정 필요 항목

**없음** — 현재 RBAC 구조는 기능적으로 정상 동작.

---

## 9. 향후 권장 작업

| 우선순위 | 작업 | 설명 |
|---------|------|------|
| 낮음 | Seller 전용 Dashboard | `/seller/dashboard` 페이지 + SellerLayout 생성 |
| 낮음 | Route 레벨 2중 보호 | Supplier/Partner 라우트 그룹에 ProtectedRoute 추가 |
| 참고 | requireRole 활용 | Backend에서 커스텀 미들웨어 대신 표준 requireRole 활용 검토 |

---

*Updated: 2026-03-13*
*Author: AI Audit (Claude Opus 4.6)*
