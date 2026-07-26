# IR-O4O-OPERATOR-CONSOLE-REMAINING-USABILITY-AND-WORKFLOW-AUDIT-V1

IR: `IR-O4O-OPERATOR-CONSOLE-REMAINING-USABILITY-AND-WORKFLOW-AUDIT-V1`
일시: 2026-07-26 (KST) · 성격: **read-only 조사**
계정: `renariver21`(플랫폼) · `sohae2100`(서비스 admin/operator) · `renagang21`(store_owner/supplier)

**코드 변경 0 · DB write 0 · 배포 0.**

---

## 0. 결론 요약

운영자 콘솔의 남은 문제는 **화면 하나하나의 결함이 아니라 3개의 구조적 축**으로 수렴한다.

| # | 축 | 규모 | 성격 |
|---|-----|:---:|------|
| **A** | **표준 목록 미전환** — raw `<table>` 잔존 | **128 페이지** | 최대 항목. admin-dashboard 71 · Neture 30 · GlycoPharm 12 · K-Cos 8 · KPA 7 |
| **B** | **테이블 표준 이원화** — `BaseTable`(admin) vs `DataTable`(operator) | 2 계열 | 같은 조직의 두 콘솔이 서로 다른 목록 계약 |
| **C** | **권한 경계 2건** — 플랫폼 관리자의 서비스 콘솔 차단 · 로그인 오류 오분류 | 2 | 업무 단절 + 디버깅 오도 |

우선순위는 **C(즉시) → A(단계적) → B(정책)** 이다. C 는 실제 업무·디버깅을 막고 있고 수정 범위가 작다.

---

## 1. 운영자 메뉴 전체 지도

### 1-A. 플랫폼 Admin (`admin.neture.co.kr`)

`/operators` · `/operator/members` · `/operator/roles` · `/operator/stores` ·
`/settings/admin-accounts` · `/users`(RBAC 콘솔) 외 다수.

- 메뉴 게이트는 `menuPermissions` + `hasMenuPermission(menuId)` 단독 담당
  (2026-07-26 정리 후 유효 항목 **2건**: `dashboard` · `core-users`).
- 동적 메뉴 `/api/v1/navigation/admin` 은 **빈 배열 stub**(Phase R1) → 정적 트리가 유일 소스.

### 1-B. KPA 서비스 운영자 — 라우트 **60개**

대분류: 대시보드 · 회원(`members`, `users/:id`) · 매장(`stores`, `store-channels`) ·
승인 큐(`product-applications`, `event-offers`, `recruitment-exposure`, `qualification-requests`,
`collaboration-requests`, `forum-requests`, `forum-delete-requests`) ·
콘텐츠(`content`, `content-hub/:id`, `working-content`, `docs`, `news`, `resources`, `guide-contents`) ·
사이니지(`signage/hq-media`, `hq-playlists`, `templates`, `forced-content`) · 태블릿(`tablet/screen-sets`) ·
매장 자산(`blog`, `pop`, `qr`, `video`, `surveys`, `multilingual-product-contents`) ·
LMS · 포럼 · 분석 · 감사로그 · 역할/운영자.

### 1-C. 타 서비스

Neture · GlycoPharm · K-Cosmetics 는 **전용 OperatorRoutes 파일이 없고 `App.tsx` 인라인**이다.
KPA 만 `routes/OperatorRoutes.tsx` 로 분리되어 있어 구조가 비대칭이다.

---

## 2. 화면별 상태표 — 표준 준수

### 2-A. 공용 패키지 `@o4o/operator-core-ui` — **대체로 표준**

| 컴포넌트 | 판정 |
|----------|:---:|
| `CmsContentManager` · `OperatorForumCategoriesPage` · `ForumDeleteRequestsConsole` · `OperatorForumHubPage` · `ForumRequestsConsole` · `OperatorLmsCoursesManager` · `OperatorMembersConsolePage` · `ProductApplicationManagementConsole` · `OperatorOrderStatusPage` · `OperatorProductStatusPage` · `OperatorResourcesConsolePage` · `OperatorStoresList` | **표준(DataTable)** 12건 |
| `ContactInquiryAdminPage` · `ServiceLegalSettingsPage` | **RAW `<table>`** 2건 |

KPA 운영자 페이지 상당수는 이 패키지의 **얇은 wrapper** 다(`OperatorStoresPage` → `OperatorStoresList` 등).
→ 페이지 파일만 보면 "비표준"으로 보이지만 실제 구현은 표준이다. **감사는 패키지 레벨에서 해야 한다.**

### 2-B. KPA 운영자 페이지 직접 구현분

| 표준(DataTable) 9건 | RAW `<table>` 4건 |
|---|---|
| AuditLog · CollaborationRequests · ForumDeleteRequests · ForumRequests · OperatorContentHub · OperatorForum · OperatorStoreChannels · ProductApplicationManagement · QualificationRequests | **AnalyticsPage · CommunityManagementPage · MemberManagementPage · OperatorStoreDetailPage** |

`MemberManagementPage` 는 `ListColumnDef` 를 쓰면서도 `DataTable` 을 쓰지 않는 **혼합 상태**다
(회원 관리는 운영자 핵심 동선이라 우선순위가 높다).

### 2-C. 서비스별 재사용 격차 (raw `<table>` 잔존 페이지 수)

| 대상 | core-ui 사용 | ux-core 사용 | **raw `<table>`** |
|------|:---:|:---:|:---:|
| `admin-dashboard` | — | — | **71** (BaseTable 38) |
| `web-neture` | 11 | 17 | **30** |
| `web-glycopharm` | 23 | 27 | 12 |
| `web-k-cosmetics` | 22 | 20 | 8 |
| `web-kpa-society` | 21 | 47 | 7 |

- **admin-dashboard 가 최대 미전환 영역**이다(표준 38 vs 비표준 71 — 과반이 비표준).
- 서비스 중에서는 **Neture 가 최대 격차**(공용 재사용 최저 11 · raw table 최다 30).
- KPA 는 그동안의 정비로 **최저 잔존(7)** — 표준 전환의 reference implementation 역할을 하고 있다.

---

## 3. 실제 업무 단절 목록

### 3-1. 🔴 플랫폼 최고 관리자가 **서비스 운영자 콘솔에 접근 불가**

```
GET /api/v1/kpa/operator/dashboard
  renariver21 (platform:super_admin) → 403
  sohae2100   (kpa:admin/operator)   → 200
```

`requireKpaScope` 계열 서비스 가드는 `KPA_SCOPE_CONFIG` 의 `kpa:admin`/`kpa:operator` 만 인정하고
`platform:super_admin` 을 포함하지 않는다. 반면 `serviceScope`(operator console 공용)는
platform admin 을 특별 취급한다 → **가드 계열 간 정책 불일치**.

**업무 영향:** 플랫폼 관리자가 서비스 운영 화면을 열어 문제를 확인할 수 없다. 장애 대응·검증 시
서비스 계정으로 재로그인해야 한다.

**판단 필요:** 이것이 "서비스 격리" 의도인지, 아니면 canonical 누락인지. 두 해석 모두 성립하므로
**정책 결정 항목**으로 분류한다(§9-1).

### 3-2. 🔴 로그인 실패 오류 **오분류** — 디버깅 오도

동일 계정·동일 비밀번호로:

| 요청 | 결과 |
|------|------|
| `serviceKey` **없이** | `success:false` · **`INVALID_CREDENTIALS`** · "비밀번호가 일치하지 않습니다" |
| `serviceKey:"kpa-society"` | `success:true` |

즉 **serviceKey 누락이 "비밀번호 불일치"로 보고된다.** 실제 원인과 다른 메시지다.

**업무 영향:** 자격증명 문서가 "INVALID_CREDENTIALS 면 비번 문제"라고 안내하고 있어(그 안내 자체가
이 오분류 때문에 틀린 진단을 유도한다), 과거 세션들이 **멀쩡한 비밀번호를 drift 로 오판하고
reset 을 반복**한 정황이 있다(문서 이력의 2026-06-03 · 06-06 reset 2건).

본 IR 조사 중에도 `renagang21` 이 전 엔드포인트 401 로 나와 **계정 문제로 오인**했다가,
serviceKey 를 넣어 정상 인증됨을 확인했다. 실제 소요 시간 손실이 발생하는 결함이다.

### 3-3. 🟡 `MemberManagementPage` 혼합 구현

운영자 핵심 동선(회원 승인·상태 변경)인데 `ListColumnDef` 를 쓰면서 `DataTable` 은 미사용 →
검색·필터·정렬·페이지네이션·행 선택 계약이 표준과 어긋난다.

---

## 4. 비표준 목록·액션 목록 (구현 대상 후보)

| 우선 | 대상 | 비고 |
|:---:|------|------|
| 1 | KPA `MemberManagementPage` | 핵심 동선, 혼합 구현 |
| 2 | KPA `CommunityManagementPage` · `OperatorStoreDetailPage` · `AnalyticsPage` | raw table 4건 중 나머지 |
| 3 | 공용 `ContactInquiryAdminPage` · `ServiceLegalSettingsPage` | **공용 패키지** — 고치면 4서비스 동시 개선 |
| 4 | `web-neture` raw table 30건 | 서비스 중 최대 격차 |
| 5 | `admin-dashboard` raw table 71건 | 최대 규모, 단계적 필요 |

**3번(공용 패키지 2건)이 투자 대비 효과가 가장 크다** — 2개 파일 수정으로 4개 서비스가 동시에 개선된다.

---

## 5. 권한 경계 검증 결과 (프로덕션 실측)

| endpoint | `renariver21` | `sohae2100` | `renagang21` | 판정 |
|----------|:---:|:---:|:---:|------|
| `/api/v1/admin/platform-accounts` | **200** | 403 | 403 | ✅ 정상 |
| `/api/v1/admin/users` | **200** | 403 | 403 | ✅ 정상 |
| `/api/v1/operator/roles` | 200 | 200 | **403** | ✅ 정상 |
| `/api/v1/operator/members?serviceKey=kpa-society` | 200 | 200 | 403 | ✅ 정상 |
| `/api/v1/kpa/operator/dashboard` | **403** ⚠️ | 200 | 403 | ⚠️ §3-1 |
| `/api/operator/settings/notifications` | 200 | 403 | 403 | ⚠️ 서비스 운영자 미개방(정책 보류 중) |

- **플랫폼 기능이 서비스 화면에 섞이는 문제는 없다** — 서비스 운영자·store_owner 모두 `/admin/*` 403.
- store_owner(`renagang21`)는 모든 운영자 API 에서 정확히 차단된다.
- 3계층(플랫폼 / 서비스 운영 / 매장)이 **각각 다른 응답을 내는 것이 실증**되어, 앞으로 허용·거부
  양방향 교차 검증이 가능하다.

---

## 6. dead 메뉴·중복 기능

| 항목 | 상태 |
|------|------|
| `menuPermissions` 고아 설정 | 2026-07-26 정리 완료 (25건 → 2건) |
| `admin-menu.static.tsx` `roles` 메타데이터 | 정리 완료 |
| `/api/v1/navigation/admin` | **stub(빈 배열)** — 동적 메뉴 기능 자체가 비활성. 향후 복원/폐지 결정 필요 |
| 서비스별 OperatorRoutes 구조 | KPA 만 분리, 3서비스는 `App.tsx` 인라인 — **구조 비대칭** |
| backend dead controller | `SupplierEntityController` · `modules/sites` · `operator-registration` 미마운트 (선행 IR 확인) |

---

## 7. 우선순위별 통합 구현안

### WO-1 (권장 선행) — 운영자 권한·진단 정합화 · **저위험 + 정책 1건**

1. 로그인 오류 오분류 수정 — serviceKey 누락을 `INVALID_CREDENTIALS` 가 아닌 별도 코드로 분리(§3-2)
2. 자격 문서의 잘못된 진단 안내 정정
3. §3-1 플랫폼 관리자 서비스 콘솔 접근 — **정책 결정 후** 반영

### WO-2 — 표준 목록 전환 (공용 우선)

1. 공용 `ContactInquiryAdminPage` · `ServiceLegalSettingsPage` → DataTable (4서비스 동시 효과)
2. KPA `MemberManagementPage` 표준 완결
3. KPA 잔여 raw table 3건

### WO-3 (후속, 규모 큼) — `admin-dashboard` / `web-neture` 표준 전환

101건(71+30)이라 **단계적 분할 필수**. 화면 중요도순 배치 권장.

---

## 8. 즉시 구현 가능한 저위험 항목

| # | 항목 | 근거 |
|---|------|------|
| 1 | 로그인 오류 코드 분리 (§3-2) | 권한 변화 0, 메시지·코드만. 디버깅 손실 즉시 해소 |
| 2 | 공용 목록 컴포넌트 2건 표준 전환 (§4-3) | 공용 패키지, 4서비스 동시 개선 |
| 3 | KPA `MemberManagementPage` 표준 완결 | 이미 `ListColumnDef` 사용 중이라 전환 폭이 작다 |
| 4 | 자격 문서 진단 안내 정정 | 문서만 |

## 9. 정책 결정이 필요한 항목

| # | 항목 | 쟁점 |
|---|------|------|
| 1 | 플랫폼 관리자의 **서비스 운영자 콘솔 접근** | "서비스 격리 유지" vs "최고 관리자 전역 접근". 현재 서비스 가드(`requireKpaScope`)와 공용 `serviceScope` 가 서로 다른 정책을 쓰고 있어 **어느 쪽으로 통일할지** 결정 필요 |
| 2 | `operator-notification` 서비스 운영자 개방 | 선행 WO 에서 보류 중 |
| 3 | 동적 메뉴(`navigation/admin`) 복원 vs 폐지 | stub 상태 장기 방치 |
| 4 | 서비스별 OperatorRoutes 구조 통일 | KPA 방식으로 맞출지 |

---

## 10. 조사 방법·한계

- 정적 분석(라우트·컴포넌트 사용 집계) + 프로덕션 read-only API 실측(3계정).
- **브라우저 화면 실측은 수행하지 않았다** — 자동화 브라우저 프로필을 다른 세션이 사용 중이고,
  admin 앱은 cross-site httpOnly 쿠키(`SameSite=None`)라 해당 프로필에서 세션이 유지되지 않는다.
  따라서 "빈 상태/오류 상태 렌더", "KPI 숫자와 목록 연결", "메뉴명↔제목 일치" 같은 **시각 항목은
  미검증**이며, WO-2 구현 시 화면 단위로 확인해야 한다.
- raw `<table>` 집계는 파일 단위이므로 한 파일에 여러 목록이 있으면 과소 계상될 수 있다.
