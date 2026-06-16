# IR-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-BASELINE-V1

> **유형**: Investigation Report (조사 전용 — 코드 수정 없음)
> **대상 서비스**: GlycoPharm (1차 기준 서비스)
> **목적**: 서비스별 admin 의 역할 범위를 코드 기준으로 조사하여, admin 에 남길 기능 / operator 로 이관할 기능 / O4O 전체 관리자로 올릴 기능을 확정하고, 이후 K-Cosmetics · KPA-Society · Neture 에 적용할 admin 역할 기준(baseline)을 세운다.
> **작성일**: 2026-06-16
> **상태**: 조사 완료 — 정책 확정 대기

---

## 0. 역할 기준 (조사 판단의 전제)

본 IR 은 다음 3단 역할 모델을 기준으로 GlycoPharm admin 의 각 기능을 판정한다. (CLAUDE.md §11 Admin/Operator 역할 구분 + O4O-BUSINESS-PHILOSOPHY-V1 §3.2 과 정렬)

| 역할 | 범위 |
|------|------|
| **O4O 전체 관리자 (platform admin)** | 서비스 생성, 서비스별 admin/operator **지정**, 전체 권한·역할 관리, 플랫폼 계정 관리 |
| **서비스 admin** | 서비스 설정, 법정정보·약관, 문의 **설정**, 회원 데이터 **완전 삭제**/개인정보 파기, 공개 상태 확인 — **운영 업무를 직접 수행하지 않는다** |
| **서비스 operator** | 회원 이용중지·상태 관리·운영 메모, 약국/매장 운영, 문의 **처리·답변**, 콘텐츠, 상품/오퍼 승인, 정산 실무 |

핵심 원칙: **"서비스 admin 은 운영 업무를 하지 않는다."** 운영 업무가 admin 에 있으면 → operator 로 이관(또는 operator 에 신설). 권한 지정 업무가 service admin 에 있으면 → O4O 전체 관리자로 이관.

---

## 1. GlycoPharm Admin 현재 상태 (코드 실측)

### 1.1 라우트 정의

`services/web-glycopharm/src/App.tsx:772-801`
- 가드: `RoleGuard` + `allowedRoles={['glycopharm:admin', 'platform:super_admin']}`
- 레이아웃: `AdminAreaLayout`

### 1.2 메뉴 정의

`services/web-glycopharm/src/config/operatorMenuGroups.ts` — 통합 메뉴(UNIFIED_MENU) 의 `system` 그룹에 `adminOnly: true` 항목으로 노출. `filterMenuByRole()` 로 admin 만 표시.

### 1.3 Admin 메뉴 → Route → Component → API 종합표

| # | 메뉴명 | Route | Component | 주요 API |
|---|--------|-------|-----------|----------|
| 1 | 관리자 대시보드 | `/admin` (index) | `pages/admin/GlycoPharmAdminDashboard.tsx` | `GET /operator/dashboard` |
| 2 | 회원 관리 (Admin) | `/admin/members` | `pages/admin/GlycoPharmAdminMembersPage.tsx` | `GET/PATCH/POST /operator/members/*`, `DELETE /operator/members/{id}?mode=soft\|hard`, `GET …/delete-risk` |
| 3 | 약국 네트워크 | `/admin/pharmacies` | `pages/operator/PharmaciesPage.tsx` | `glycopharmApi.getPharmacies()` (현재 stub 수준) |
| 4 | 정산 관리 | `/admin/settlements` | `pages/operator/SettlementsPage.tsx` | `GET/POST /admin/settlements` |
| 5 | 청구 리포트 | `/admin/reports` | `pages/operator/ReportsPage.tsx` | `GET /admin/reports` |
| 6 | 청구 미리보기 | `/admin/billing-preview` | `pages/operator/BillingPreviewPage.tsx` | `GET /admin/billing-preview` |
| 7 | 인보이스 | `/admin/invoices` | `pages/operator/InvoicesPage.tsx` | `GET/POST /admin/invoices` |
| 8 | 역할 관리 | `/admin/roles` | `pages/operator/RoleManagementPage.tsx` (`@o4o/ui` wrapper) | 공통 RoleManagement API |
| 9 | 법정정보·약관 설정 | `/admin/settings/legal-terms` | `pages/admin/ServiceLegalSettingsPage.tsx` | `GET/PUT /admin/services/glycopharm/legal-profile`, `GET/POST/PUT/PATCH …/policies*` |
| 10 | 문의 관리 | `/admin/contact-inquiries` | `pages/admin/ContactInquiriesPage.tsx` | `GET/PATCH /admin/services/glycopharm/contact-inquiries*` |
| 11 | 문의 설정 | `/admin/settings/contact` | `pages/admin/ServiceContactSettingsPage.tsx` | `GET/PUT /admin/services/glycopharm/contact-settings` |
| - | 회원 상세 | `/admin/members/:id` | `UserDetailPage.tsx` | (회원 관리 하위) |

---

## 2. Operator 대응 현황 (중복/이관 판정의 핵심)

> ⚠️ **사전 가설 정정**: 1차 계획서는 "약국 네트워크 / 문의 관리 / Finance 가 operator 에 이미 있으므로 admin 에서 제거"를 전제했다. **코드 실측 결과 이 전제는 틀렸다.** 이 기능들은 operator 에 중복 존재하지 않고 **admin 전용**이다. 따라서 처리 방향은 "삭제"가 아니라 **"운영 업무를 operator 로 이관(또는 operator 에 신설)"** 이다.

| Admin 기능 | Operator 동일/유사 기능 존재? | 근거 |
|-----------|:---:|------|
| 회원 관리 | **부분 중복** | operator `/operator/members`(`UsersPage.tsx`) 존재 — 단, operator 는 soft delete 만, admin 은 soft+hard delete + delete-risk |
| 약국 네트워크(`/admin/pharmacies`) | **NO (다른 축)** | operator 에는 `/operator/stores`(매장 관리) + `/operator/store-channels` 가 별도로 존재. admin pharmacies 는 현재 stub |
| 문의 관리(처리/답변) | **NO** | operator 메뉴에 문의 처리 항목 없음 — admin 전용 |
| 정산/청구/인보이스 | **NO (다른 도메인)** | operator 는 `/operator/ai-billing`(AI 청구)만. admin 은 약국 정산. 도메인이 다름 |
| 역할 관리 | **NO** | operator 에 없음 — admin 전용 |
| 법정정보·약관 / 문의 설정 | **NO** | operator 에 없음 — admin 전용 (정상: 설정은 admin 영역) |

Operator 전용 기능(참고): 상품 현황, 주문 현황, 공지/뉴스, Home 편집, LMS, 강사 승인, 안내문구, 블로그/POP/QR(HUB), 매장/채널 관리, 상품·오퍼·포럼 승인, 포럼 분석, AI 리포트/사용량/정산, 운영 분석, 자료실, Signage 일체.

---

## 3. 항목별 판정

각 admin 메뉴를 §0 역할 기준으로 판정한다.

| # | 메뉴 | 판정 | 사유 |
|---|------|------|------|
| 1 | 관리자 대시보드 | **유지 (재구성)** | admin 진입점. 단 API 가 `/operator/dashboard` 를 호출 — admin 성격(구조·정책·거버넌스 스냅샷)으로 재구성 검토 |
| 2 | 회원 관리 | **분리** | hard delete / 개인정보 파기 / delete-risk 는 **admin 유지**. 일반 조회·상태변경(이용중지 등 운영)은 operator 와 중복 → admin 면을 **"회원 데이터 관리(삭제·파기 전용)"** 로 좁힘 |
| 3 | 약국 네트워크 | **이관 후보 → operator** | 약국 운영 업무. operator `/operator/stores` 축과 정합. admin 에서 제거하고 operator 로 일원화 (단 현재 stub 이라 실기능 확인 필요) |
| 4 | 정산 관리 | **판단 보류 (정책 결정)** | 정책 설정이면 admin, 실무 정산 처리면 operator/finance-operator. 현재 admin 위치. → 정산 정책 vs 실무 경계 결정 필요 |
| 5 | 청구 리포트 | **판단 보류 (4와 동일)** | Finance 실무 묶음 |
| 6 | 청구 미리보기 | **판단 보류 (4와 동일)** | Finance 실무 묶음 |
| 7 | 인보이스 | **판단 보류 (4와 동일)** | Finance 실무 묶음 |
| 8 | 역할 관리 | **제거 → O4O 전체 관리자로** | 운영자/권한 지정은 platform admin 영역. service admin 에서 제거 |
| 9 | 법정정보·약관 설정 | **유지** | 서비스 admin 정위치 |
| 10 | 문의 관리(처리·답변) | **이관 → operator** | 문의 답변은 운영 업무. operator 에 신설하고 admin 에서 제거 |
| 11 | 문의 설정 | **유지** | 설정은 서비스 admin 정위치 |

---

## 4. 결론: GlycoPharm Admin 목표 형상

### 4.1 Admin 에 **유지**

```
관리자 홈(대시보드)        — 구조·정책·거버넌스 스냅샷으로 재구성
서비스 설정                — /operator/settings (adminOnly) 위치 점검
법정정보·약관 설정          — 유지
문의 설정                  — 유지
회원 데이터 관리            — 회원 관리에서 hard delete/파기 전용으로 축소
(공개 상태 확인)           — 신설 여부 검토
```

### 4.2 Operator 로 **이관**

```
문의 관리(처리·답변)        — operator 신설, admin 제거
약국 네트워크              — operator /stores 축으로 일원화, admin 제거 (stub 실기능 확인 선행)
```

### 4.3 O4O 전체 관리자로 **이관(제거)**

```
역할 관리                  — platform admin 영역, service admin 에서 제거
```

### 4.4 정책 결정 필요 (보류)

```
Finance (정산/청구/리포트/인보이스)
  → "정산 정책 설정"(admin 유지) vs "실무 정산 처리"(operator/finance-operator 이관) 경계 확정
```

---

## 5. 후속 적용 기준 (K-Cosmetics / KPA / Neture)

본 IR 의 §0 역할 모델과 §4 목표 형상을 각 서비스에 적용한다. 단, 출발점이 다르다.

| 서비스 | 출발 상태 | 적용 방향 |
|--------|----------|----------|
| **K-Cosmetics** | GlycoPharm 과 유사한 매장형, admin 메뉴 중간 | GlycoPharm 목표 형상을 가장 직접 적용. 매장 네트워크/문의 처리 이관, 역할 관리 제거, 법정·약관·문의 설정 정비 |
| **KPA-Society** | admin 메뉴 과소 | **삭제보다 보강** — 법정정보·약관, 문의 설정, 회원 데이터 관리, 공개 상태 확인 신설. 커뮤니티/약국 운영/콘텐츠/문의 답변/상품·오퍼 승인/역할 관리는 admin 에 넣지 않음 |
| **Neture** | 서비스 admin + platform admin 혼재 | **별도 IR 선행** — Neture 서비스 admin(법정·약관·문의설정·회원데이터) 과 O4O 전체 관리자(서비스 생성·권한 지정) 분리가 핵심 |

후속 WO/IR 명:
- `WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1` (본 IR 정책 확정 후)
- `WO-O4O-KCOS-ADMIN-SCOPE-ALIGNMENT-FROM-GLYCOPHARM-V1`
- `WO-O4O-KPA-ADMIN-SCOPE-ALIGNMENT-FROM-GLYCOPHARM-V1`
- `IR-O4O-NETURE-ADMIN-SCOPE-ALIGNMENT-FROM-SERVICE-ADMIN-V1`

---

## 6. 정책 확정 전 결정 필요 항목 (사용자 판단)

1. **Finance 4종(정산/청구/리포트/인보이스)** — service admin 유지 vs operator/finance-operator 이관?
2. **문의 관리 이관** — operator 에 "문의 처리" 메뉴 신설을 본 라인에서 진행 vs 별도 WO?
3. **약국 네트워크** — admin pharmacies 가 stub 인데, operator `/stores` 로 완전 일원화해도 되는지 (admin 면 실데이터 의존 여부 확인 필요)?
4. **회원 데이터 관리** — admin 회원 메뉴를 "삭제·파기 전용"으로 축소하는 범위 (조회까지 남길지)?

---

## 7. 근거 파일 (요약)

- 메뉴 정의: `services/web-glycopharm/src/config/operatorMenuGroups.ts`
- Admin 라우트: `services/web-glycopharm/src/App.tsx:772-801`
- Operator 라우트: `services/web-glycopharm/src/App.tsx:803-907`
- Admin 회원: `services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx`
- Admin 대시보드: `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx`
- 법정·약관: `services/web-glycopharm/src/pages/admin/ServiceLegalSettingsPage.tsx`
- 문의 관리/설정: `services/web-glycopharm/src/pages/admin/ContactInquiriesPage.tsx`, `ServiceContactSettingsPage.tsx`
- Operator 회원: `services/web-glycopharm/src/pages/operator/UsersPage.tsx`
- 약국 네트워크(stub): `services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx`
- Finance: `services/web-glycopharm/src/pages/operator/{SettlementsPage,ReportsPage,BillingPreviewPage,InvoicesPage}.tsx`
- 역할 관리: `services/web-glycopharm/src/pages/operator/RoleManagementPage.tsx`

---

*Investigation only. 코드 수정 없음. 정책 확정 후 `WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1` 로 진행.*
