# CHECK-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1

> **WO**: `WO-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1`
> **선행**: GlycoPharm 기준 모델 (`IR-/WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-*`) · `WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1`
> **목적**: K-Cosmetics 서비스 admin 을 "서비스 설정 관리자" 역할로 축소 (GlycoPharm 과 동일 기준). operator 성격 진입점 제거, 권한 지정 메뉴 제거, 회원 라벨 정리.
> **작성일**: 2026-06-16
> **상태**: 코드 완료 · app typecheck PASS · browser smoke 배포 후 대기

---

## 1. 변경 전 / 후 K-Cosmetics admin 메뉴표

### Sidebar (`components/layouts/DashboardLayout.tsx` — roleConfig.admin)

| 그룹 | 변경 전 | 변경 후 |
|------|---------|---------|
| Overview | 대시보드 | 대시보드 (유지) |
| Users | 회원 관리 | **회원 데이터 관리** (라벨 변경) |
| Approvals | 매장 네트워크 (/admin/stores) | **제거** (그룹 삭제, operator /operator/stores 대응) |
| System | 설정 · 법정정보·약관 · 문의 관리 · 문의 설정 · 역할 관리 | 설정 · 법정정보·약관 · **문의 설정** (문의 관리·역할 관리 제거) |

> KCos sidebar 에는 **Finance 그룹이 없음** (GlycoPharm 과 차이) → Finance 현상 유지 관련 변경 없음.

### Admin Dashboard (`pages/admin/KCosmeticsAdminDashboard.tsx`)

| 영역 | 변경 |
|------|------|
| Policy(buildAdminPolicies) | `store-management`·`role-management` 제거. `user-management`(→ '회원 데이터 관리' 라벨)·`product-approval`·`settings` 유지 |
| Quick Actions | `stores`·`roles` 제거. `users` → '회원 데이터 관리' 라벨/설명 변경. `settings` 유지 |
| Link Block: Governance | **블록 삭제** (역할 관리) |
| Link Block: 회원·매장 구조 → 회원 구조 | 매장 관리 링크 제거, '회원 데이터 관리'만 유지, 제목 '회원 구조' |

---

## 2. 제거한 admin 진입점 (UI)

```
문의 관리       (System)      → operator /operator/contacts (선행 WO 이관 완료)
매장 네트워크    (Approvals)   → operator /operator/stores (동일 컴포넌트 OperatorStoresPage)
역할 관리       (System)      → O4O 전체 관리자 영역
```

## 3. 유지한 admin 메뉴

```
관리자 홈(대시보드)
회원 데이터 관리 (구 '회원 관리')
법정정보·약관 설정
문의 설정
서비스 설정
상품 승인 관리 (dashboard policy, → /operator/products)  ← 본 WO 제거 범위 외, 유지
```

---

## 4. 항목별 판단 근거

### 4.1 문의 관리 operator 이관 확인
- 선행 WO 로 `/operator/contacts`(`OperatorContactInquiriesPage`) + backend 가드 operator 조정 완료. 본 WO 는 admin UI 진입점만 제거.

### 4.2 문의 설정 admin 유지
- `/admin/settings/contact`(`ServiceContactSettingsPage`) 미변경. 가드 `requireServiceLegalScope('admin')` 그대로.

### 4.3 법정정보·약관 유지
- `/admin/settings/legal-terms` 미변경.

### 4.4 회원 데이터 관리 라벨/범위
- '회원 관리' → '회원 데이터 관리' (sidebar + dashboard). 설명을 보존·삭제·파기 관점으로 정리(일상 운영=operator).
- 기능 무변경. hard delete / 개인정보 파기 신규 구현 없음 → 후속 과제(§7).

### 4.5 역할 관리 제거
- 운영자/권한 지정 = platform admin 영역. admin UI 진입점(sidebar System + dashboard Governance/QuickAction/Policy) 제거.

### 4.6 매장/네트워크성 메뉴 판단
- admin `/admin/stores` 는 **operator 와 동일 컴포넌트 `OperatorStoresPage`** 사용 (App.tsx:651 admin / :687 operator). operator `/operator/stores`('매장 관리') + `/operator/store-cockpit`('내 매장') 대응 존재.
- ⇒ operator 대응 있음 → admin 진입점 제거 (WO §4.6).

### 4.7 Finance 현상 유지
- KCos admin 에 Finance 그룹/메뉴 없음 → 변경 없음(자동 충족).

---

## 5. route / page 보존·제거 판단

**모든 대상 route/page 보존** (UI 진입점만 제거). 직접 URL 동작 → 가역적, 기능 파괴 0.

| route | element | 처리 |
|-------|---------|------|
| `/admin/contact-inquiries` | `pages/admin/ContactInquiriesPage` (App.tsx:663) | **보존** |
| `/admin/stores` | `OperatorStoresPage` (App.tsx:651) | **보존** |
| `/admin/roles` | `OperatorRoleManagementPage` (App.tsx:667) | **보존** |
| `/admin/users` → `/admin/members` redirect | (App.tsx:657) | **보존** (회원 데이터 관리 진입) |

- App.tsx 라우트 미변경. 다른 컴포넌트의 링크 참조 0 (grep: `/admin/stores`·`/admin/roles`·`/admin/contact-inquiries` 매치 없음).

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| admin 접근 정상 (코드) | ✅ Route/Layout 무변경 |
| admin 문의 관리 진입점 제거 | ✅ sidebar + dashboard |
| 문의 설정 유지 | ✅ |
| 법정정보·약관 유지 | ✅ |
| 회원 데이터 관리 라벨/범위 정리 | ✅ (기능 무변경) |
| 역할 관리 진입점 제거 | ✅ sidebar + dashboard |
| 매장/네트워크성(매장 네트워크) 처리 | ✅ operator 대응 확인 후 제거 |
| Finance 현상 유지 | ✅ (KCos admin Finance 부재) |
| route/page 보존 | ✅ contact-inquiries/stores/roles/users |
| 미사용 import 정리 | ✅ dashboard `ShieldCheck`·`Store` 제거 (noUnusedLocals 충족) |
| KCos app typecheck | ✅ PASS (에러 0) |
| browser smoke | ⏳ 배포 후 |

### browser smoke 체크리스트 (배포 후)
```
KCos admin 로그인 → sidebar: 매장 네트워크 / 역할 관리 / 문의 관리 미노출
KCos admin 대시보드 → Governance 블록·매장 관리 카드 미노출
회원 데이터 관리(/admin/users → /admin/members) 진입 정상
법정정보·약관(/admin/settings/legal-terms) · 문의 설정(/admin/settings/contact) 정상
KCos operator: /operator/contacts 목록/상세/상태변경 200 (선행 WO 이관 검증)
GlycoPharm operator: /operator/contacts 무회귀 (KCos WO 의 backend 가드 공통 변경 영향 재확인)
```

---

## 7. 후속 과제 / 미구현 사항

```
- 회원 hard delete / 개인정보 파기 실구현 여부 점검 (현재 라벨/설명만 정렬)
- admin 역할 관리 → O4O 전체 관리자(platform) 영역으로 실제 이식 (route/page 보존 중)
- 보존된 admin route(contact-inquiries/stores/roles) prune 여부 별도 판단
- admin 대시보드 'product-approval' policy(→ /operator/products) 의 admin 잔존 적절성 재검토
```

---

## 8. 후속 확장 순서

```
1. KPA-Society admin scope alignment (삭제보다 필수 admin 기능 보강 중심)
2. Neture admin / platform scope 분리 IR (서비스 admin vs O4O 전체 관리자 혼재)
```

---

*frontend-only. backend/DB 무변경(문의 가드는 선행 WO 에서 처리됨). route/page 보존(UI 진입점만 제거). app typecheck PASS.*
