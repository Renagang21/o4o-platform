# CHECK-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1

> **WO**: `WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1`
> **선행**: `IR-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-BASELINE-V1` · `WO-O4O-GLYCOPHARM-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1`
> **목적**: GlycoPharm 서비스 admin 을 "서비스 설정 관리자" 역할로 축소. operator 성격 메뉴 제거, 권한 지정 메뉴 제거, 회원 관리 라벨 정리. Finance 는 현상 유지.
> **작성일**: 2026-06-16
> **상태**: 코드 완료 · app typecheck PASS(아래 §6 주의) · browser smoke 배포 후 대기

---

## 1. 변경 전 / 후 GlycoPharm admin 메뉴표

### Sidebar (`components/layouts/DashboardLayout.tsx`)

| 그룹 | 변경 전 | 변경 후 |
|------|---------|---------|
| Overview | 대시보드 | 대시보드 (유지) |
| Users | 회원 관리 | **회원 데이터 관리** (라벨 변경) |
| Approvals | 약국 네트워크 | **제거** (그룹 삭제) |
| Finance | 정산/청구 리포트/청구 미리보기/인보이스 | 동일 (**현상 유지**) |
| Governance | 역할 관리 | **제거** (그룹 삭제) |
| System | 설정 · 법정정보·약관 · 문의 관리 · 문의 설정 | 설정 · 법정정보·약관 · **문의 설정** (문의 관리 제거) |

### Admin Dashboard (`pages/admin/GlycoPharmAdminDashboard.tsx`)

| 영역 | 변경 |
|------|------|
| Policy 항목(buildAdminPolicies) | `pharmacy-network`·`role-management` 제거. Finance 3종 유지 |
| Quick Actions(ADMIN_QUICK_ACTIONS) | `pharmacies`·`roles` 제거. `users` → '회원 데이터 관리' 라벨/설명 변경 |
| Link Block: Governance | **블록 삭제** (역할 관리) |
| Link Block: Network → 회원 구조 | 약국 네트워크 링크 제거, '회원 데이터 관리'만 유지. 제목 '회원 구조', stats 회원 수만 |
| Link Block: Finance | 동일 (**현상 유지**) |

---

## 2. 제거한 admin 메뉴 (UI 진입점)

```
문의 관리       (System)      → operator /operator/contacts 로 이관 완료(선행 WO)
약국 네트워크    (Approvals)   → operator /operator/stores 로 일원화
역할 관리       (Governance)  → O4O 전체 관리자 영역
```

## 3. 유지한 admin 메뉴

```
관리자 홈(대시보드)
회원 데이터 관리 (구 '회원 관리')
법정정보·약관 설정
문의 설정
서비스 설정
Finance (정산/청구 리포트/청구 미리보기/인보이스)  ← 현상 유지
```

---

## 4. 항목별 판단 근거

### 4.1 Finance 현상 유지
- 메뉴/화면/API/권한/라벨 **일절 변경 없음**. 결제·정산 흐름은 실운영 후 설계 대상 → 본 WO 범위 외(WO §3.1).

### 4.2 문의 관리 operator 이관 확인
- 선행 WO 로 `/operator/contacts`(`OperatorContactInquiriesPage`) 신설 완료. 본 WO 는 admin 측 **UI 진입점만 제거**.
- 문의 **설정**(`/admin/settings/contact`)은 admin 유지 — 변경 없음.

### 4.3 약국 운영 `/operator/stores` 일원화
- admin `/admin/pharmacies`(`PharmaciesPage`)는 조회 전용 stub. operator canonical 은 `/operator/stores`(`OperatorStoresPage`) — 유지 확인.
- admin UI 진입점(sidebar Approvals + dashboard Network/QuickAction/Policy) 제거.

### 4.4 역할 관리 제거 근거
- 운영자/권한 지정은 platform admin 영역(서비스 admin 이 직접 부여하지 않음). admin UI 진입점(sidebar Governance + dashboard Governance/QuickAction/Policy) 제거.

### 4.5 회원 데이터 관리 라벨/범위 정리
- 라벨 '회원 관리' → '회원 데이터 관리'. 설명을 데이터 보존·삭제·파기 관점으로 정리(일상 운영=operator 안내).
- **기능은 변경하지 않음**. hard delete / 개인정보 파기 신규 구현 없음(WO §3.5). → 후속 과제(§7).

---

## 5. route / page 보존·제거 판단

**모든 대상 route/page 는 보존**한다 (WO §4.2 보수적 옵션). UI 진입점만 제거했고 직접 URL 접근은 동작한다 → 가역적, 기능 파괴 0.

| route | page | 처리 |
|-------|------|------|
| `/admin/contact-inquiries` | `pages/admin/ContactInquiriesPage.tsx` | **보존** (UI 진입점 제거). operator 가 canonical |
| `/admin/pharmacies` | `pages/operator/PharmaciesPage.tsx` | **보존** (UI 진입점 제거). stub |
| `/admin/roles` | `pages/operator/RoleManagementPage.tsx` | **보존** (UI 진입점 제거) |

- App.tsx 라우트 정의는 변경하지 않음. 잔존 참조는 App.tsx 주석 2건뿐(코드 링크 아님) — 다른 컴포넌트의 링크 참조 0 (grep 확인).
- 후속 WO 에서 이 route/page 들을 prune 하거나, 역할 관리는 platform admin 으로 이식할 수 있다.

---

## 6. typecheck 결과

- **web-glycopharm app typecheck: PASS** — 내 변경 파일 및 서비스 코드 에러 0.
- ⚠️ **외부 concurrent 세션 이슈(내 변경 무관)**: `packages/tablet-kiosk-core/src/TabletKioskPage.tsx(50)` 에서 `@o4o/content-editor` 모듈 미해결 TS2307 1건.
  - 해당 파일·`packages/tablet-kiosk-core/package.json` 은 **다른 세션의 미커밋 WIP**(git status `M`, 본 WO 커밋에 미포함).
  - 본 WO 첫 단계(선행 contact migration) 시점 `tsc -b` 는 EXIT=0 이었음 → 이후 타 세션 변경으로 발생.
  - 본 WO 커밋은 path-specific 이라 해당 WIP 미포함 → 커밋 트리 기준 CI 영향 없음. 타 세션이 content-editor 배선 완료 시 해소.

변경 파일별 잔여 lint 위험: 미사용 아이콘 import 정리 완료 — `DashboardLayout`(`Store`,`ShieldCheck` 제거), `GlycoPharmAdminDashboard`(`ShieldCheck`,`Building2` 제거). noUnusedLocals=true 충족.

---

## 7. 후속 과제 / 미구현 사항

```
- 회원 hard delete / 개인정보 파기 기능 실구현 여부 점검 (현재 라벨/설명만 정렬)
- admin 역할 관리 → O4O 전체 관리자(platform) 영역으로 실제 이식 (route/page 보존 중)
- 보존된 admin route(contact-inquiries/pharmacies/roles) prune 여부 별도 판단
- 관리자 대시보드 API(fetchOperatorDashboard) → admin 관점 endpoint 분리 검토
```

---

## 8. 검증 항목 결과

| 항목 | 결과 |
|------|------|
| admin 접근 정상 (코드) | ✅ AdminAreaLayout/Route 무변경 |
| admin 문의 관리 메뉴 제거 | ✅ sidebar + dashboard |
| admin 약국 네트워크 메뉴 제거 | ✅ sidebar + dashboard |
| admin 역할 관리 메뉴 제거 | ✅ sidebar + dashboard |
| 법정정보·약관 설정 유지 | ✅ |
| 문의 설정 유지 | ✅ |
| 회원 데이터 관리 라벨/범위 정리 | ✅ (기능 무변경) |
| Finance 메뉴/화면 현상 유지 | ✅ 무변경 |
| `/operator/contacts` 보존 | ✅ 무변경 |
| `/operator/stores` 보존 | ✅ 무변경 |
| typecheck | ✅ app PASS (§6 외부 이슈 별개) |
| browser smoke | ⏳ 배포 후 (cleanup 묶음 검증) |

### browser smoke 체크리스트 (배포 후)
```
admin 로그인 → sidebar: 약국 네트워크 / 역할 관리 / 문의 관리 미노출 확인
admin 대시보드 → Governance 블록·약국 네트워크 카드 미노출, Finance 블록 정상
회원 데이터 관리(/admin/members) 진입 정상
법정정보·약관(/admin/settings/legal-terms) · 문의 설정(/admin/settings/contact) 정상
Finance 4종 진입 정상
operator: /operator/contacts · /operator/stores 정상
```

---

## 9. 후속 확장 순서

```
1. K-Cosmetics admin scope alignment
   ⚠️ KCos scopeRoleMapping 엄격 → GlycoPharm operator 문의 관리 패턴 복제 시 403.
      backend guard / operator scope 별도 판단 필요.
2. KPA-Society admin scope alignment (삭제보다 필수 admin 기능 보강 중심)
3. Neture admin / platform scope 분리 IR
```

---

*frontend-only. backend/DB 무변경. route/page 보존(UI 진입점만 제거). app typecheck PASS.*
