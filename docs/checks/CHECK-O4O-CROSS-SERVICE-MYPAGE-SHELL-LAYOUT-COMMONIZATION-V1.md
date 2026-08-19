# CHECK-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1

> **WO**: [`WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1.md)
> **판정**: **PASS_WITH_OPEN** (구현·adoption·정적검증 완료 / PH 인증 화면 브라우저 검증 OPEN)
> **작성일**: 2026-08-19

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| WO 기준 commit | `fcd837ec0` |
| 구현 commit | `6828d9db6` |
| CHECK commit | 본 문서 커밋 |
| 배포 CI run | `32208982789` — detect-changes / pharmacy-hub / kpa-branch / neture / glycopharm / kpa-society / k-cosmetics / summary **전부 success** |

---

## 2. 5서비스 route · page census

| 서비스 | base | route 수 | page 파일 |
|---|---|---:|---|
| KPA-Society | `/mypage` | 9 | `services/web-kpa-society/src/pages/mypage/*` + `src/layouts/MyPageLayout.tsx` |
| GlycoPharm | `/mypage` | 7 | `services/web-glycopharm/src/pages/mypage/*` |
| K-Cosmetics | `/mypage` | 7 | `services/web-k-cosmetics/src/pages/mypage/*` |
| Neture | `/mypage` | 4 (공급자 4 / 일반 3) | `services/web-neture/src/pages/mypage/*` |
| Pharmacy-Hub | `/account` (§13 계약) | 2 | `services/web-pharmacy-hub/src/pages/account/*` (+ 호환 `/store-owner/account`) |

Pharmacy-Hub 는 `/mypage` 축을 **신설하지 않았다**. §13 계약(개인=`/account`, 매장 셸=`/store-owner/account` 호환 route) 유지.

---

## 3. 12개 기능 단위 census (미조사 0)

| # | 기능 | KPA | GP | KCos | Neture | PH |
|---:|---|:--:|:--:|:--:|:--:|:--:|
| 1 | Profile (개인) | O | O | O | O | O |
| 2 | Business Profile | — | — | — | O (공급자) | SERVICE_SPECIFIC (`/store-owner/info`) |
| 3 | Settings | O | O | O | O | SERVICE_SPECIFIC (내 프로필 안 SecuritySection) |
| 4 | Requests (내 신청) | O | O | O | — | SERVICE_SPECIFIC (`/join/status`) |
| 5 | Membership / 가입 상태 | 조직 소속 표시 | 상태 뱃지 | 역할 뱃지 | 역할 뱃지 | `/join/status` |
| 6 | Enrollments (내 수강) | O | O | O | — | — |
| 7 | Certificates (학습 결과) | O | O | O | — | — |
| 8 | Credits | O | O | O | — | — |
| 9 | Forum (내 포럼) | O | — | — | 바로가기 | — |
| 10 | Qualifications (내 자격) | O | — | — | — | — |
| 11 | Notification | 헤더 | 헤더 | 헤더 | 헤더 | 화면 내 `NotificationBell` |
| 12 | Activity (감사 활동 등) | O | O | O | 최근 활동 | — |

`—` = 해당 서비스에 기능 자체가 없음. `SERVICE_SPECIFIC` = 기능은 있으나 다른 축에 존재(§17 예외 사유 명시).

---

## 4. 화면 구조 census — 발견 결함

| # | 결함 | 서비스 | 처리 |
|---:|---|---|---|
| D1 | 로딩·오류·빈 상태 early-return 이 layout 밖 → 헤더·네비게이션 유실 | KPA 5개 화면 | 수정 (Shell 안에서 렌더) |
| D2 | navItems 미주입 → 측면 이동 수단 사실상 죽음(기본 3개만) | GlycoPharm 전 화면 | 수정 (`GLYCOPHARM_MYPAGE_NAV_ITEMS` 신설) |
| D3 | 요약 카드 4중 중복 구현 | KPA/GP/KCos/Neture | 공통 `MyPageUserSummary` 로 흡수 |
| D4 | 진입 카드 그리드 중복 | GP/KCos/Neture | 공통 `MyPageEntryCardGrid` 로 흡수 |
| D5 | 미인증 화면이 골격 밖 (직접 구현 카드) | GP/KCos/Neture | `MyPageAuthRequired` 를 Shell 안에서 렌더 |
| D6 | `/mypage/business-profile` 이 제목·breadcrumb·nav 전부 없음 | Neture | 수정 |
| D7 | `/account` 가 골격 없이 본문만 | Pharmacy-Hub | 수정 (`MyPageShell` + 2항목 nav) |
| D8 | 모바일에서 활성 탭이 스크롤 밖으로 밀림 | 공통 | 수정 (활성 탭 auto-reveal) |

---

## 5. Before / After

- **Before**: 서비스마다 헤더·breadcrumb·탭·요약카드·진입카드를 각자 구현. 상태 화면(로딩/오류/미인증)은 골격 밖. 폭 기준 제각각.
- **After**: `MyPageShell` 단일 골격 + 서비스별 `navItems.ts` 주입. 상태 화면도 같은 그릇 안. 폭은 `width` prop(`wide` 1120 / `form` 860, 미지정 시 legacy `max-w-4xl` 보존).

---

## 6. 공통 Shell · Layout

`packages/account-ui/src/components/`

| 파일 | 역할 |
|---|---|
| `MyPageShell.tsx` | canonical 골격 (header / nav / statusNotice / userSummary / children / extension) |
| `MyPageLayout.tsx` | 하위호환 shim — `MyPageShell` re-export (`MyPageLayout` alias 유지, 약 20개 기존 호출부 무변경) |
| `MyPageNavigation.tsx` | nav item 모델 확장 + 활성 탭 auto-reveal |
| `MyPageUserSummary.tsx` | 요약 카드 단일 구현 |
| `MyPageEntryCardGrid.tsx` | 진입 카드 그리드 단일 구현 |

**§6 준수**: Shell 안에 serviceKey · role · 서비스명 분기 **0건**. 차이는 전부 props/slot 주입.
**신규 패키지 만들지 않음** — 기존 `@o4o/account-ui`(5서비스 모두 이미 소비) 안에 추가. Dockerfile 선별 COPY 함정 회피.

**설계 편차 1건(의도적)**: WO §6 다이어그램은 `userSummary` 를 nav 위에 두지만, 4개 서비스의 기존 시각 순서를 깨지 않기 위해 `header → nav → statusNotice → userSummary → children → extension` 순으로 고정했다.

---

## 7. Navigation 계약

```ts
interface MyPageNavItem {
  label: string; path: string; href?: string; icon?: ReactNode;
  visible?: boolean; mobileVisible?: boolean; group?: string; end?: boolean;
}
```

- 활성 판정: `isHome || end` → 완전일치, 그 외 `startsWith`. `aria-current="page"` 부여.
- `href` 는 basePath 밖 절대경로용(PH `/join/status`).
- `visible` 은 **서비스가 계산해서 넘긴다** — Shell 은 role 문자열을 모른다.

---

## 8. 서비스별 Extension

| 서비스 | navItems 소스 | 비고 |
|---|---|---|
| KPA | `KPA_MYPAGE_NAV_ITEMS` (기존) | 9항목 |
| GlycoPharm | `GLYCOPHARM_MYPAGE_NAV_ITEMS` (신설) | 7항목 |
| K-Cosmetics | `KCOS_MYPAGE_NAV_ITEMS` (기존) | 7항목 |
| Neture | `getNetureMyPageNavItems(roles)` (신설) | **기존 `SUPPLIER_ONLY_ROLES` SSOT 재사용 — 새 역할 로직 없음(§11)** |
| Pharmacy-Hub | `PHARMACY_HUB_ACCOUNT_NAV_ITEMS` (신설) | basePath `/account`, 2항목 |

---

## 9. 5서비스 adoption (§17)

| 서비스 | 적용 | 미적용 사유 |
|---|:--:|---|
| KPA-Society | O | — |
| GlycoPharm | O (부분) | `My{Certificates,Credits,Enrollments}Page.tsx` 3개는 **다른 세션 미커밋 WIP** → §21 중지조건 적용, 미접촉 |
| K-Cosmetics | O | — |
| Neture | O | — |
| Pharmacy-Hub | O | `/store-owner/account` 는 `withShell={false}` — 매장 셸이 이미 chrome 보유(이중 셸 금지) |

한 서비스만 적용하고 종료한 항목 **없음**.

---

## 10. Profile 연결

Profile Core(`AccountProfileSection` · `BusinessProfileSection` · `AccountSecuritySettings` · `MyPageAuthRequired`)와 canonical `PATCH /api/v1/users/me/profile` 은 **내부 수정 0건**. Shell 이 감싸기만 한다(§8 준수).

---

## 11. Desktop · Mobile

- 모바일에서 사라지는 기능 진입점 **없음**. `mobileVisible` 은 계약만 제공하고 실제 숨김 적용 0건.
- 모바일 활성 탭 auto-reveal 실측(KPA `/mypage/credits`, 390×844): `scrollLeft 359 / scrollWidth 702 / clientWidth 328`, 활성 탭 visible, `aria-current="page"`.

---

## 12. Production browser 검증

| 서비스 | 화면 | Desktop 1440×900 | Mobile 390×844 |
|---|---|:--:|:--:|
| KPA | `/mypage` | PASS | — |
| KPA | `/mypage/certificates` (빈 상태) | PASS (Shell 안) | — |
| KPA | `/mypage/credits` (로딩 상태) | PASS (Shell 안) | PASS |
| GlycoPharm | `/mypage` | PASS (7항목 nav 신규 생존) | PASS |
| GlycoPharm | `/mypage/settings` | PASS | — |
| K-Cosmetics | `/mypage` (`k-cosmetics.site`) | PASS | PASS |
| Neture | `/mypage` 미인증 | PASS (사업자 정보 숨김) | PASS |
| Neture | `/mypage` 공급자 | PASS (사업자 정보 노출 · 👤 정상) | PASS |
| Neture | `/mypage/business-profile` | PASS (breadcrumb+title+nav, 활성 탭 `aria-current`) | PASS |
| Pharmacy-Hub | `/account` 미인증 | PASS (Shell + 2항목 nav) | PASS |
| Pharmacy-Hub | `/account` 인증 · `/store-owner/account` | **OPEN** | **OPEN** |

**PH OPEN 사유**: PH 로그인 화면의 "테스트 매장 경영자 계정으로 채우기" 버튼이 **stale 비밀번호**를 주입해 401 이며(프론트 하드코딩 데모 문자열), 저장된 브라우저 자격증명도 없었다. 자격증명 직접 입력은 사용자 제약으로 금지되어 **억지 PASS 대신 OPEN 으로 보고**한다. 정적으로는 `/store-owner/account` 가 `withShell={false}` 로 이중 셸을 피하는 것이 확인된다.

---

## 13. Backend · DB 변경 여부

**변경 0건.** 신규 API · role 계약 · membership · schema · migration 모두 없음 (§16 준수).

---

## 14. 잔존 기능 공통화 후보 (후속 WO)

1. Requests / Membership / Notification / Activity / Help 개별 기능 내부 (§15 — 이번 범위 밖)
2. GP `MySettingsPage` · `MyProfilePage` 의 breadcrumb 누락(선행 결함, KPA/KCos/Neture 와 불일치)
3. LMS 계열(Enrollments/Certificates/Credits) 3서비스 화면 본문 공통화
4. PH `/account` ↔ `/store-owner/account` 진입점 IA 정리

---

## 15. MUST_FIX_BEFORE_CLOSE

| # | 항목 | 상태 |
|---:|---|---|
| 1 | GP `My{Certificates,Credits,Enrollments}Page.tsx` 에 `navItems` 주입 | **BLOCKED** — 다른 세션 미커밋 WIP(§21). 각 파일 prop 1줄 추가면 완료 |
| 2 | PH 인증 화면 브라우저 검증 | **OPEN** — 위 §12 사유 |
| 3 | PH 로그인 데모 계정 버튼 stale 비밀번호 | **보고만** — 범위 밖 별도 WO |

---

## 16. CHECK · commit · push

- 구현 commit `6828d9db6` (path-specific stage, `git add .` 미사용)
- 정적 검증: 5서비스 `tsc --noEmit` — My Page 관련 오류 0 (KPA 5건 잔여는 `@o4o/forum-core` · `@o4o/block-renderer` 선행 문제로 My Page 무관), 5서비스 `vite build` 전부 성공
- 배포: CI run `32208982789` 전 job success
