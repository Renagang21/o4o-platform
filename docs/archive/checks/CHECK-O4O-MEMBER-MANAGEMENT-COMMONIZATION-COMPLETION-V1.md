# CHECK-O4O-MEMBER-MANAGEMENT-COMMONIZATION-COMPLETION-V1

**날짜**: 2026-06-01
**목적**: O4O 4개 서비스 회원 관리 공통화 완료 판정
**범위**: read-only 검증 (코드·DB·migration·source 수정 없음)

---

## 1. Executive Summary

**판정: CONDITIONAL PASS** ✅

핵심 회원 관리 공통화 항목이 완료되었다. 현재 단계에서 완료 선언이 가능하다.

| 영역 | 진행도 |
|------|:-----:|
| 공통 wrapper (`OperatorMembersConsolePage`) | ✅ 4개 서비스 적용 |
| admin roleTabs/statusTabs 정렬 | ✅ GP/KCOS 완료 |
| searchPlaceholder prop | ✅ wrapper 노출 완료 |
| Delete Flow 공통화 | ✅ GP/KCOS 공통화. KPA/Neture 공통 패턴 기완료 |
| Neture canonical route | ✅ `/operator/members` 정합 |
| TypeScript 기준선 | ✅ kpa/kcos/neture/api-server 0 errors |
| Care/GlucoseView 재오염 | ✅ 없음 |
| K-Cos pharmacist/supplier 재도입 | ✅ 없음 |

**남은 항목**: GlycoPharm tsconfig 구조 특이점(tsconfig.json `files:[]`)으로 단독 `tsc --noEmit`이 실제 검사 없이 통과하는 구조. pre-existing 22개 오류는 모두 LMS/Hub 영역이며 회원 관리와 무관.

---

## 2. 검증 대상 commit / 작업 목록

| # | WO / 작업 | commit | 상태 |
|---|----------|--------|:----:|
| 1 | `WO-O4O-MEMBER-MANAGEMENT-ADMIN-ROLETAB-STATUSTAB-ALIGNMENT-V1` | `c39f728d7` | ✅ |
| 2 | `WO-O4O-MEMBER-MANAGEMENT-WRAPPER-SEARCH-PLACEHOLDER-PROP-V1` | `02c5da8fb` | ✅ |
| 3 | `CHECK-O4O-MEMBER-MANAGEMENT-TYPESCRIPT-PREEXISTING-ERROR-BASELINE-V1` | `158fec89f` | ✅ |
| 4 | `WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1` | `6f9471173` | ✅ |
| 5 | `WO-O4O-NETURE-MEMBER-MANAGEMENT-BULK-AND-ROUTE-ALIGNMENT-V1` | `7b62a1071` | ✅ |
| — | CommonEditUserModal 공통화 | 선행 WO | ✅ |
| — | KPA wrapper 전환 | 선행 WO | ✅ |
| — | Neture bulk action | `7b62a1071` | ✅ |
| — | K-Cos pharmacist/supplier 잔재 제거 | 선행 WO | ✅ |

---

## 3. 4개 서비스 회원 관리 구조 현황

| 서비스 | operator page | admin page | 공통 wrapper | 남은 독립 구현 | 판정 |
|--------|--------------|-----------|:------------:|:------------:|:----:|
| **KPA** | `MemberManagementPage` (thin wrapper + 외부 ApplicationsTab) | `AdminMemberManagementPage` | ✅ (`OperatorMembersConsolePage`) | ApplicationsTab (정당 분리), `MemberDeleteRiskModal` (공통 패턴 적용 완료) | ✅ |
| **GlycoPharm** | `UsersPage` (thin wrapper) | `GlycoPharmAdminMembersPage` (thin wrapper) | ✅ | `gpFetchDeleteRisk`/`gpExecuteDelete` adapter (정상) | ✅ |
| **K-Cosmetics** | `UsersPage` (thin wrapper) | `KCosmeticsAdminMembersPage` (thin wrapper) | ✅ | `kcosFetchDeleteRisk`/`kcosExecuteDelete` adapter (정상) | ✅ |
| **Neture** | `UsersManagementPage` (thin wrapper) | `AdminMemberManagementPage` (hard delete 전용, wrapper 미사용 — 의도된 분리) | ✅ (operator) | `AdminMemberDeleteModal` (공통 패턴 적용 완료) | ✅ |

모든 4개 서비스에서 `OperatorMembersConsolePage` 기반 구조가 적용되어 있다.

---

## 4. 공통화 완료 항목 검증

| 항목 | 완료 여부 | commit | 비고 |
|------|:--------:|--------|------|
| `OperatorMembersConsolePage` wrapper | ✅ | 선행 WO | 4개 서비스 전부 |
| `CommonEditUserModal` 공통화 | ✅ | 선행 WO | GP/KCOS/Neture. KPA는 `KpaEditUserModal` (정당 분리) |
| KPA thin wrapper 전환 | ✅ | 선행 WO | 1427줄 → wrapper |
| Neture bulk action (정지/복원/탈퇴) | ✅ | `7b62a1071` | extraBulkActions 3개 |
| GP/KCOS statusTabs (operator) 확장 | ✅ | 선행 WO | GP 4개, KCOS 5개 |
| GP/KCOS admin roleTabs/statusTabs 정렬 | ✅ | `c39f728d7` | canonical role 추가 |
| GP/KCOS admin extraColumns (운영 권한) | ✅ | `c39f728d7` | operator 기준 정렬 |
| K-Cos pharmacist/supplier 회원 유형 제거 | ✅ | 선행 WO | DB 0건 확인됨 |
| `searchPlaceholder` prop | ✅ | `02c5da8fb` | MemberListLayout 전달 |
| `OperatorMemberDeleteFlow` 공통화 | ✅ | `6f9471173` | GP/KCOS admin 적용 |
| Neture `/operator/members` canonical route | ✅ | `7b62a1071` | `/operator/users` alias 유지 |
| Care/GlucoseView 재오염 없음 | ✅ | — | `GlycoPharm active code 0` 유지 |

---

## 5. Delete Flow 공통화 검증

### OperatorMemberDeleteFlow 구조

```
packages/operator-core-ui/src/modules/members/
  OperatorMemberDeleteFlow.tsx        — 공통 컴포넌트 (soft+hard 선택)
  components/MemberHardDeleteConfirmModal.tsx — hard delete 확인 UI
```

### 서비스별 적용 현황

| 서비스 | 적용 방식 | 상태 |
|--------|---------|:----:|
| **GlycoPharm** | `OperatorMemberDeleteFlow` + `gpFetchDeleteRisk`/`gpExecuteDelete` adapter | ✅ |
| **K-Cosmetics** | `OperatorMemberDeleteFlow` + `kcosFetchDeleteRisk`/`kcosExecuteDelete` adapter | ✅ |
| **KPA** | `MemberDeleteRiskModal` → 내부에서 `MemberHardDeleteConfirmModal` 사용 (공통 패턴) | ✅ |
| **Neture** | `AdminMemberDeleteModal` → 내부에서 `MemberHardDeleteConfirmModal` 사용 (공통 패턴) | ✅ |

### 정책 보존 확인

| 정책 | 상태 |
|------|:----:|
| operator = soft delete만 가능 | ✅ |
| admin = soft + hard delete 가능 | ✅ |
| bulk hard delete 미지원 | ✅ |
| hard delete risk 확인 유지 | ✅ |
| backend/API/DB/migration 미수정 | ✅ |

### 기존 인라인 컴포넌트

- `GpAdminDeleteFlow` (230줄 인라인) — **제거됨**, 사용처 0 확인
- `KCosAdminDeleteFlow` (200줄 인라인) — **제거됨**, 사용처 0 확인

---

## 6. Neture route canonical 검증

**`services/web-neture/src/App.tsx`**:
```tsx
// WO-O4O-NETURE-MEMBER-MANAGEMENT-BULK-AND-ROUTE-ALIGNMENT-V1
<Route path="/operator/members"     element={<UsersManagementPage />} />  // canonical
<Route path="/operator/members/:id" element={<UserDetailPage />} />       // canonical detail
<Route path="/operator/users"       element={<UsersManagementPage />} />  // legacy alias
<Route path="/operator/users/:id"   element={<UserDetailPage />} />       // legacy detail alias
```

**`services/web-neture/src/config/operatorMenuGroups.ts`**:
```ts
{ label: '회원 관리', path: '/operator/members' }  // canonical
```

**admin route 미변경**:
```tsx
<Route path="/admin/members" element={<AdminMemberManagementPage />} />  // 별도 유지
```

| 항목 | 상태 |
|------|:----:|
| `/operator/members` canonical | ✅ |
| `/operator/members/:id` detail | ✅ |
| `/operator/users` legacy alias | ✅ |
| `/operator/users/:id` detail alias | ✅ |
| menu path `/operator/members` | ✅ |
| admin `/admin/members` 미변경 | ✅ |

---

## 7. TypeScript 기준선

| 서비스 | 검사 방법 | 오류 수 | 회원 관리 관련 | 상태 |
|--------|---------|:-------:|:-------------:|:----:|
| `web-kpa-society` | `tsc --noEmit` | **0** | — | ✅ |
| `web-k-cosmetics` | `tsc --noEmit` | **0** | — | ✅ |
| `web-neture` | `tsc --noEmit` | **0** | — | ✅ |
| `api-server` | `tsc --noEmit` | **0** | — | ✅ |
| `web-glycopharm` | `tsc --noEmit` (tsconfig.json) | **0** ⚠️ | — | 구조적 문제 |
| `web-glycopharm` | `tsc --noEmit -p tsconfig.app.json` | **22** | **0** | ✅ (pre-existing) |

### GlycoPharm tsconfig 특이점 (중요)

GlycoPharm의 `tsconfig.json`은 `"files": []` + references 구조로, `pnpm exec tsc --noEmit` 단독으로는 실제 type-checking이 수행되지 않는다. 반드시 `tsc --noEmit -p tsconfig.app.json`으로 검증해야 한다.

GlycoPharm pre-existing 22개 오류:
- `src/api/lms.ts` — LMS API response shape 불일치
- `src/App.tsx` — 미사용 imports
- `src/components/layouts/` — unused variable
- `src/pages/education/` — LMS course/lesson 타입
- `src/pages/hub/` — HubContent 타입
- `src/pages/instructor/` — CSS property 타입

**모두 LMS/Hub 영역 — 회원 관리와 무관.** 어떤 admin/member 페이지 관련 오류도 없음.

---

## 8. 서비스별 유지해야 할 차이 검증

### KPA — 유지 확인 ✅

| 항목 | 상태 |
|------|:----:|
| 약사/약대생 직역 탭 (`pharmacist`, `student`) | ✅ |
| 면허번호/약국 정보 (`drawerExtraSections → KpaDrawerSections`) | ✅ |
| 활동 유형/추가 권한 extraColumns | ✅ |
| ApplicationsTab 외부 렌더 (가입 신청서) | ✅ |
| KpaEditUserModal (도메인 특화 editModal) | ✅ |
| `/kpa/members` 별도 endpoint | ✅ |

### GlycoPharm — 유지 확인 ✅

| 항목 | 상태 |
|------|:----:|
| 약사 / 약국 경영자 roleTabs | ✅ (`glycopharm:pharmacist`, `glycopharm:store_owner`) |
| businessInfoLabel='약국 정보' | ✅ |
| Care/GlucoseView active code 0 | ✅ (`public.ts` 내 mock data만 잔존, active route 없음) |
| 당뇨인 회원 유형 제거 상태 | ✅ |

### K-Cosmetics — 유지 확인 ✅

| 항목 | 상태 |
|------|:----:|
| 판매자/소비자 중심 roleTabs | ✅ (`cosmetics:store_owner`, `seller`, `consumer`) |
| pharmacist/supplier K-Cos 자체 회원 분류 미재도입 | ✅ |
| profileClassification (`cosmetics_members.subRole`) | ✅ |
| 상품 공급자/이벤트 공급자 개념 별도 유지 (`supplierName` 컬럼 = 상품 관련) | ✅ |

### Neture — 유지 확인 ✅

| 항목 | 상태 |
|------|:----:|
| supplier/partner/seller 참여 유형 | ✅ |
| 대시보드 접근 extraColumn | ✅ |
| 특수 updateStatus (pending→`/neture/operator/registrations/:id/approve`) | ✅ |
| `/operator/members` canonical + `/operator/users` alias | ✅ |
| admin hard delete 전용 페이지 (`AdminMemberManagementPage`) | ✅ |

---

## 9. 남은 항목 분류

### A. 완료로 닫아도 되는 항목

- 공통 wrapper (OperatorMembersConsolePage) 4개 서비스 적용 ✅
- Delete Flow 공통화 ✅
- searchPlaceholder prop ✅
- admin roleTabs/statusTabs 정렬 ✅
- Neture canonical route ✅
- KPA thin wrapper ✅
- Neture bulk action ✅
- K-Cos pharmacist/supplier 잔재 제거 ✅

### B. 후순위 optional cleanup

| 항목 | 우선도 |
|------|:-----:|
| GlycoPharm tsconfig.json `files:[]` 구조 — 항상 `tsconfig.app.json`으로 검증해야 하는 불편함 | 낮음 |
| GlycoPharm pre-existing 22 오류 (LMS/Hub) 정리 | 낮음 (별도 LMS WO) |
| `/operator/users` legacy alias 장기 제거 (사용자 북마크 소멸 후) | 장기 |
| KPA `AdminMemberManagementPage` wrapper 전환 여부 재검토 | 장기 |
| Neture `AdminMemberDeleteModal` wrapper 통합 재검토 | 장기 |

### C. 별도 IR 필요 항목

| 항목 | 설명 |
|------|------|
| Backend response contract 단일화 | KPA kpa_members entity vs SM-based 3서비스 — 큰 범위 |
| Organization membership display 표준화 | 서비스별 조직 정보 표시 방식 |
| 4개 서비스 admin/operator 권한 matrix 문서화 | 현황은 구현되었으나 문서 없음 |

### D. 지금 진행하면 안 되는 항목

| 항목 | 이유 |
|------|------|
| 회원 role 의미 통일 (예: KPA 약사 = KCOS 판매자) | 철학적 충돌 — 각 서비스 도메인 의미가 다름 |
| 서비스별 회원 유형 강제 통합 | 도메인 차이 무시 |
| Neture supplier/partner approval을 일반 회원 관리로 흡수 | 전혀 다른 플로우 |
| KPA ApplicationsTab을 wrapper 내부로 강제 편입 | wrapper가 표현 불가 구조 |

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **"회원 의미 통일" 아님, "관리 UX/동작 패턴 정합"** | wrapper는 list/search/tab/bulk/drawer/editModal을 공통화. 회원 유형의 의미(약사/소비자/공급자)는 서비스별 유지. | ✅ |
| **operator = 일상 운영, admin = 정책/구조/거버넌스** | operator: soft delete만. admin: soft + hard delete. hard delete는 admin-only 정책 전 서비스 일관. | ✅ |
| **RBAC F11 (service_memberships 기반)** | 모든 회원 관리가 `service_memberships.status`를 SSOT로 사용. KPA는 `kpa_members` 추가이나 SM 참조. | ✅ |
| **KPA canonical 기준, 다른 서비스는 slot으로 차이 흡수** | KPA 구조가 wrapper의 reference implementation. 다른 3서비스는 adapter/slot으로 차이 흡수. | ✅ |
| **1인 개발 생산성 vs 중복 유지** | GP/KCOS admin delete flow 공통화로 약 430줄 중복 제거. wrapper 4개 서비스 적용으로 개별 구현 비용 ↓. | ✅ |
| **도메인 분리 원칙** | KPA 약사 직역 / KCOS store 기반 / GP 약국 경영자 / Neture 공급자·파트너 — 각 도메인 데이터 서비스별 유지. wrapper는 공통 UX 제공만. | ✅ |
| **Boundary Policy F6** | serviceKey 기반 scope 분리 (`/operator/members?serviceKey=glycopharm`). cross-service 접근 방지 유지. | ✅ |

**결론**: O4O 철학과 충돌 없음. 공통화가 "의미 통일"이 아닌 "패턴 통일"로 올바르게 구현되었다.

---

## 11. Working tree / staged 파일 격리 상태

```
M  services/web-glycopharm/src/pages/hub/HubContentListPage.tsx  ← 다른 세션 WIP (미포함)
?? docs/investigations/CHECK-O4O-STORE-HUB-CANONICAL-CROSSSERVICE-COMPLETION-V2.md  ← 다른 세션 WIP (미포함)
?? *.png  ← 사용자 스크린샷 (미포함)
```

staged 없음. 코드/DB/source 수정 없음.

---

## 12. 최종 판정

**CONDITIONAL PASS** ✅

| 판정 기준 | 결과 |
|---------|:----:|
| 핵심 회원 관리 공통화 항목 완료 | ✅ |
| Delete Flow 공통화 완료 (GP/KCOS) | ✅ |
| Neture canonical route 정합 | ✅ |
| kpa/kcos/neture/api-server TypeScript 0 errors | ✅ |
| glycopharm 회원 관리 신규 TS 오류 없음 | ✅ |
| Care/GlucoseView 재오염 없음 | ✅ |
| K-Cos supplier/pharmacist 회원 유형 재도입 없음 | ✅ |
| backend/API/DB/migration 미수정 | ✅ |
| O4O 철학 충돌 없음 | ✅ |

**CONDITIONAL 이유**: GlycoPharm pre-existing 22개 오류(LMS/Hub)가 잔존하고 있으며, browser smoke test는 미실행. 회원 관리 공통화 자체에는 문제없으나 전체 clean 상태는 아님.

---

## 13. 후속 후보

회원 관리 공통화는 현재 단계에서 **완료**로 선언 가능. 다음 대형 흐름 후보:

| 후보 | 설명 |
|------|------|
| **GlycoPharm LMS/Hub pre-existing 오류 정리** | 22개 오류 대상 별도 WO/IR |
| **backend회원 관리 contract IR** | KPA kpa_members vs SM-based 3서비스 API 단일화 검토 |
| **회원 관리 공통화 → 다음 공통화 도메인** | 매장 관리 / 상품 관리 / 주문 관리 공통화 흐름 시작 가능 |
| **Neture-KPA UX canonical alignment** | IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1 후속 |

---

*검증 수행: Claude Code (2026-06-01)*
*source file 수정 없음. 다른 세션 WIP 미포함.*
