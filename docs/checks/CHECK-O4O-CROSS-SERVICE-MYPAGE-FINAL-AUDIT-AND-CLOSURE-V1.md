# CHECK — O4O Cross-Service My Page 최종 감사 및 종료

- **WO**: [`WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1.md)
- **작성일**: 2026-08-20
- **판정**: **CLOSED_WITH_FOLLOWUPS**
- **판정 근거 요약**: WO §28 의 MUST_FIX 조건(노출된 진입점이 backend 단절로 죽어 있음 / 잘못된 role·status 노출 / dead route / Shell 우회)에 해당하는 **발견분 6건을 전량 수정·배포·프로덕션 재검증 완료**했다. 남은 항목은 전부 §31 backlog(진입점 없음 · 도달 불가 코드 · 축 밖 화면 · 검증 공백)이며 사용자 노출 결함이 아니다. `FINAL CLOSED` 를 선언하지 않는 이유는 §27 에 명시한다.

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| WO 원문 존재 commit | `61e3422ff` |
| 수정 commit 1 | `c9fd2d6a4` — KCos 역할 라벨 · Neture 미인증 분기 · Neture 배지 중복 · KPA 로딩 Shell 우회 (4 파일) |
| 수정 commit 2 | `142943486` — Neture My Page auth bootstrap 오노출 제거 (4 파일) |
| 문서 commit | `b4a030629` — Help/Support 트랙 상태 정합화 |
| 수정 commit 3 | `6777d7503` — KCos leaf 화면 제목 교정 (2 파일) |
| CHECK commit | 본 문서 (아래 §28) |

배포 후 Cloud Run latest ready revision (2026-08-20 실측):

| 서비스 | revision | 비고 |
|---|---|---|
| `kpa-society-web` | `kpa-society-web-01868-mgh` | `c9fd2d6a4` 반영 · 프로덕션 재검증 완료 |
| `glycopharm-web` | `glycopharm-web-01300-tcq` | 이번 WO 코드 변경 0 |
| `k-cosmetics-web` | `k-cosmetics-web-01043-r77` | `c9fd2d6a4` + `6777d7503` 반영 · 프로덕션 재검증 완료 |
| `neture-web` | `neture-web-01495-p7t` | `142943486` 반영 · 프로덕션 재검증 완료 |
| `pharmacy-hub-web` | `pharmacy-hub-web-00119-4gr` | 이번 WO 코드 변경 0 |

---

## 2. route/page/menu census

| 서비스 | My Page base | 등록 route | nav 항목 | entry card | DEAD_ROUTE | ROLE_MISMATCH |
|---|---|---:|---:|---:|---:|---:|
| KPA | `/mypage` | 12 (렌더 10 + redirect 2) | 9 | 6 | 0 | 0 |
| GP | `/mypage` | 7 | 7 | 4 | 0 | 0 |
| KCos | `/mypage` | 7 | 7 | 4 | 0 | 0 |
| Neture | `/mypage` | 4 | 4 (role 파생) | 4 | 0 | 0 |
| PH | `/account` | 1 leaf (+ `/store-owner/account`) | 2 | 없음 (hub 미구현) | 0 | 0 |

- KPA 비-nav 렌더 route `/mypage/my-forums/:forumId/members` 는 `/mypage/my-forums` 에서 진입한다 → dead 아님.
- KPA redirect 2건 (`LEGACY_COMPAT`): `/mypage/my-forums/request → /forum/request`, `/mypage/completions → /mypage/certificates`.
- Neture nav 는 role 파생이라 공급자 계정에서 4항목(홈·프로필·사업자 정보·설정), 비공급자에서 3항목이다.

---

## 3. 전체 기능 census

| 기능축 | 공통 자산 (`@o4o/account-ui`) | 소비 |
|---|---|---|
| Shell/Layout | `MyPageShell` / `MyPageLayout` | 5/5 |
| Profile | `AccountProfileSection` | GP · KCos · Neture · PH (KPA 는 자체 구현) |
| 미인증 | `MyPageAuthRequired` | GP · KCos · Neture · PH (KPA 는 route guard 로 `/login` 이동) |
| 로딩 | `MyPageLoadingState` | PH · Neture (이번 WO 채택) |
| 역할 라벨 | `resolveRoleLabel` | KCos (이번 WO 채택) · Neture · PH |
| 상태/역할 배지 | `MembershipStatusBadge` / `RoleBadgeGroup` | 3/2 로 갈림 (backlog B5) |
| 알림 | `useNotifications` · `NotificationSheet` | 5/5 |
| 활동 | `MyPageActivityFeed` | KPA · GP · KCos · Neture |
| 네비게이션 | `MyPageNavigation` | 5/5 |

---

## 4. 전체 closure matrix

```text
Track               KPA               GP                KCos              Neture            PH                Final
Profile             SERVICE_SPECIFIC  ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED
Shell/Layout        ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED
Home/Hub            ADOPTED           ADOPTED           ADOPTED           ADOPTED           NOT_IMPLEMENTED   ADOPTED
Requests            ADOPTED           ADOPTED           ADOPTED           NOT_IMPLEMENTED   NOT_IMPLEMENTED   ADOPTED
Settings/Security   ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED
Membership/Role     ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED
Notifications       ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED           ADOPTED
Activity/History    ADOPTED           ADOPTED           ADOPTED           ADOPTED           NOT_IMPLEMENTED   ADOPTED
Help/Support        NOT_IMPLEMENTED   NOT_IMPLEMENTED   NOT_IMPLEMENTED   NOT_IMPLEMENTED   NOT_IMPLEMENTED   NOT_IMPLEMENTED
```

- KPA Profile = `SERVICE_SPECIFIC`: 약사 자격·분회 등 KPA 고유 필드를 포함한 자체 구현. 진입점·동작 정상이며 `AccountProfileSection` 미채택은 backlog B3.
- PH Home/Hub · Requests · Activity = `NOT_IMPLEMENTED`: `/account` 단일 leaf 설계로 해당 진입점 자체가 없다 → §28 기준 blocker 아님.
- Neture Requests = `NOT_IMPLEMENTED`: 공급자 신청 축은 `/supplier/*` 소관이며 My Page 축에 신청 개념이 없다.

---

## 5. Shell 우회 감사

| 서비스 | 발견 | 조치 |
|---|---|---|
| KPA | 1건 — `MyQualificationsPage.tsx` 로딩만 `MyPageLayout` 밖 | **수정** (`c9fd2d6a4`) |
| GP | 0 | — |
| KCos | 0 (Shell 우회 없음. 제목 drift 는 §25 M6) | — |
| Neture | 1건 — `MyBusinessProfilePage.tsx` 미인증 분기 부재 → supplier API 401 오류 화면 노출 | **수정** (`c9fd2d6a4`) |
| Neture | 4건 — Hub/Profile/Settings/BusinessProfile 로딩 분기 부재 | **수정** (`142943486`) |
| PH | 0 — `frame()` 패턴으로 로딩·미인증 모두 Shell 안 (`MyProfilePage.tsx:233-256`) | — |

- 잔존 1건: KPA `ForumMemberManagementPage.tsx:21` 이 Shell 대신 `navSlot={<MyPageNavigation …>}` 를 주입한다. 골격은 유지되므로 사용자 노출 결함 아님 → backlog B2.

---

## 6. local duplicate 재발 감사

- `services/web-kpa-society/src/layouts/MyPageLayout.tsx` 는 **중복이 아니라 `MyPageShell` 에 위임하는 문서화된 어댑터**다. WO 부기가 지목한 오탐 그대로 확정.
- 5서비스에서 `@o4o/account-ui` 컴포넌트의 로컬 복제 구현 **0건**.
- `VIEW_DUPLICATED = 0` · `CORE_ONLY = 0`.

---

## 7. navigation/entry

- nav 정의 5개 · entry card grid 4개의 **모든 목적지가 등록된 route 로 해석**된다 (DEAD_ROUTE 0).
- 프로덕션 실측 nav 항목 수: KPA 9 · GP 7 · KCos 7 · Neture 4(공급자) · PH 2 — 코드 census 와 일치.
- 고아 화면 1건: KPA `AnnualReportFormPage.tsx` 가 `pages/mypage/index.ts:8` 에서 export 되지만 route 가 없다 → `NOT_IMPLEMENTED_NO_ENTRY` (backlog B1). 진입점이 없으므로 dead link 아님.

---

## 8. role/membership matrix

프로덕션 실측 (자격증명·개인정보는 기록하지 않는다):

| 서비스 | 표시 역할 | 표시 상태 | 판정 |
|---|---|---|---|
| KPA | 정상 | 정상 | PASS |
| GP | `운영자` | `승인됨` | PASS |
| KCos | `관리자` | `승인됨` | PASS (수정 전 `역할: -` → `c9fd2d6a4` 로 해소) |
| Neture | `공급자` | `승인됨` | PASS (수정 전 `공급자` 배지 2회 → `c9fd2d6a4` 로 해소) |
| PH | `약국 경영자` | `승인됨` | PASS |

- 잔존: PH 홈(`/`)이 `서비스 가입 상태: active` 로 raw enum 을 노출한다. **My Page 축(`/account`) 밖**이라 이번 범위 외 → backlog B6.

---

## 9. unauthenticated UX

| 서비스 | 미인증 진입 결과 | 판정 |
|---|---|---|
| KPA | `MyPageGuard` (`App.tsx:465`) → `/login` redirect | PASS — route guard 계약 (WO 부기가 지목한 오탐 확정) |
| GP | `SoftGuard` (`App.tsx:434`) → Shell 안 로그인 안내 | PASS |
| KCos | `ProtectedRoute` (`App.tsx:555-611`) → `/login` redirect | PASS |
| Neture | route guard 없음 → Shell 안 `MyPageAuthRequired` (4화면 전부) | PASS (`/mypage/business-profile` 은 이번 WO 로 해소) |
| PH | Shell 안 "로그인이 필요합니다" | PASS |

**§11 KCos followup 최종 판정 — 사용자 노출 결함 아님.**

KCos 5화면(`MyProfilePage:29-40` · `MySettingsPage:21-32` · `MyCertificatesPage:62` · `MyCreditsPage:50` · `MyEnrollmentsPage:42`)은 `MyPageAuthRequired` 를 `MyPageLayout` **밖**에서 반환한다. 그러나 `App.tsx:555-611` 의 `ProtectedRoute` 가 모든 `mypage/*` 를 감싸고 **동일 조건을 더 먼저 평가**하므로 이 분기는 도달 불가다. 실제 프로덕션 로그아웃 세션에서 `/mypage` 는 `/login` 으로 이동했다.

→ `MyPageHub.tsx:60-69` 한 파일만 보고 판단하지 않았고, 나머지 6화면 + 실 프로덕션 로그아웃 세션까지 확인했다. 도달 불가 코드(코드 위생)로 backlog B4 에 기록한다.

---

## 10. pending/rejected UX

- 5서비스 모두 승인 상태를 `MembershipStatusBadge` 또는 동등 배지로 표기하며, 프로덕션 검증 계정은 전부 `승인됨` 이었다.
- **pending / rejected 계정의 실제 프로덕션 렌더는 검증하지 못했다.** 해당 상태의 테스트 계정이 SSOT(`docs/local/TEST-ACCOUNTS.local.md`)에 없고, §24(production write = 0)에 따라 상태를 만들지 않았다. → **미확인**, backlog B7.

---

## 11. Profile

- 프로덕션 5서비스 전부 이름·이메일·역할 렌더 정상.
- KCos `역할: -` 해소: `ROLE_LABELS[user.roles[0]]` 이 backend 배열 순서에 의존하던 것을 `resolveRoleLabel(user.roles, { labels, priority, fallback })` 로 교체.
- §24 준수 — 저장 버튼 클릭 0건.

---

## 12. Requests

- KPA · GP · KCos `/mypage/my-requests` 프로덕션 렌더 정상, 오류 문구 0.
- Neture · PH 은 My Page 축에 신청 개념 없음 → `NOT_IMPLEMENTED`.

---

## 13. Settings/Security

- KPA · GP · KCos · Neture `/mypage/settings` · PH `/account` 보안 영역 전부 렌더 정상.
- 비밀번호 변경 UI 존재 확인. **§24 에 따라 제출하지 않았다.**

---

## 14. Membership/Role

§8 과 동일. 수정 후 기준 잘못된 role/status 노출 = **0**.

---

## 15. Notifications

- 5서비스 모두 헤더 알림 진입점 존재, `useNotifications` 공통 소비.
- 선행 followup 잔존: KPA `store.` catch-all 라우팅 오배치(B8) · `MobileBottomNav` 읽음처리 비대칭(B9) · 레거시 mojibake 알림 row 2건(B10). 이번 WO 에서 새로 악화된 항목은 없다.

---

## 16. Activity/History

- KPA · GP · KCos · Neture `MyPageActivityFeed` 렌더 정상 ("최근 활동이 없습니다" 등은 정상 빈 상태).
- PH 미구현 → `NOT_IMPLEMENTED`.

---

## 17. Help/Support 최종 판정

**판정 = (A) 공통화 완료 + 신규 기능 미구현 (`NOT_IMPLEMENTED`).**

선행 문서를 인용하지 않고 **현재 main 코드와 프로덕션에서 직접 재확인**한 사실:

| 확인 항목 | 결과 |
|---|---|
| 5서비스 My Page nav 정의(5개)의 Help/Support 항목 | 0 |
| entry card grid(4개)의 Help/Support 항목 | 0 |
| `packages/account-ui` 의 Help/Support 전용 component | 0 |
| GP/KCos `contact_inquiries` · Neture `neture_contact_messages` 의 소유자 컬럼 | 없음 — self-read 가 설계된 적 없음 |
| 프로덕션 실측 | KPA 푸터 `협업 문의` → `/contact`, GP·KCos 푸터 고객지원 → `/contact` + `support@…`, Neture `Contact Us` → `/contact`, PH 푸터 문의 링크 없음. 전부 **공개 문의 폼**이며 My Page 축 진입점이 아니다 |

§28 분기선 적용: (B) 의 전제인 **"이미 사용자에게 노출된 진입점"이 존재하지 않는다** → blocker 아님.

---

## 18. dead route 검사

`DEAD_ROUTE = 0` · `ROLE_MISMATCH = 0` (5서비스 전수). §2 · §7 참조.

---

## 19. desktop/mobile

| 서비스 | desktop 1440x900 | mobile 390x844 |
|---|---|---|
| KPA | 9 route 전수 PASS (제목·nav 9·오류 0) | `/mypage/qualifications` PASS · 가로 overflow 없음 (scrollWidth 375 ≤ 390) |
| GP | 7 route 전수 PASS | 미실시 — **미확인** |
| KCos | 7 route 전수 PASS (`/mypage/profile` = "프로필", `/mypage/settings` = "설정") | `/mypage/profile` PASS · overflow 없음 |
| Neture | 4 route 전수 PASS | `/mypage` PASS · overflow 없음 |
| PH | `/account` PASS | 미실시 — **미확인** |

> GP · PH 은 이번 WO 코드 변경이 **0** 이라 모바일 회귀 위험이 없다고 판단해 desktop 검증만 수행했다. 숨기지 않고 미확인으로 기록한다.

---

## 20. production browser

- 검증 도메인: `kpa-society.co.kr` · `www.glycopharm.co.kr` · `www.k-cosmetics.site` · `neture.co.kr` · `pharmacyhub.co.kr`.
- 5서비스 전부 실제 로그인 세션으로 검증했다. 자격증명은 SSOT 만 참조하고 어디에도 기록하지 않는다.
- §23 합격 기준(잘못된 role/status 노출 0 · Shell 유실 0 · dead link 0 · 미인증 오노출 0) → **충족**.

---

## 21. production write

**write = 0.** 프로필 저장 미클릭 · 비밀번호 미제출 · 알림 읽음처리 미실행 · membership/request 상태 변경 0. 로그인은 읽기 세션 확보 목적이며 도메인 데이터를 변경하지 않는다.

---

## 22. typecheck/build/test

| 대상 | 결과 |
|---|---|
| `services/web-kpa-society` `tsc --noEmit` | 0 errors |
| `services/web-neture` `tsc --noEmit` | 0 errors (로딩 분기 추가 후 재실행 포함) |
| `services/web-k-cosmetics` `tsc --noEmit` | 0 errors (제목 교정 후 재실행 포함) |
| 위 3서비스 `vite build` | 전부 성공 |
| GP · PH | 코드 변경 0 → §26 에 따라 build 를 늘리지 않았다 |

- `packages/financial-core` 의 `tsup: No input files` 는 **선행 상태**이며 이번 변경과 무관하다.
- 워크스페이스 패키지 dist 부재로 최초 `tsc` 가 `TS2307` 를 대량 출력했으나 `pnpm install --frozen-lockfile` + 패키지 빌드 후 해소됐다 (코드 결함 아님).

---

## 23. backend/DB/schema

**변경 0.** 이번 WO 의 수정은 전부 frontend 렌더 분기·라벨·제목이다. migration · seed · SQL write 없음.

---

## 24. 잔존 backlog

| # | 항목 | 서비스 | 성격 |
|---|---|---|---|
| B1 | `AnnualReportFormPage.tsx` 고아 (export 있으나 route 없음) | KPA | `NOT_IMPLEMENTED_NO_ENTRY` |
| B2 | `ForumMemberManagementPage.tsx:21` 이 Shell 대신 `navSlot` 주입 | KPA | 코드 위생 |
| B3 | `AccountProfileSection` · `MyPageAuthRequired` 미채택 (인라인 프로필 UI 약 360줄) | KPA | 공통화 미수렴 |
| B4 | `MyPageAuthRequired` 를 Layout 밖에서 반환하는 도달 불가 분기 5건 | KCos | 코드 위생 |
| B5 | `MembershipStatusBadge` vs `RoleBadgeGroup`-status 3/2 분기 | 전체 | 공통화 미수렴 |
| B6 | 홈에서 가입 상태를 raw enum `active` 로 노출 | PH | My Page 축 밖 |
| B7 | pending / rejected 계정 프로덕션 렌더 미검증 | 전체 | 검증 공백 |
| B8 | 알림 `store.` catch-all 라우팅 오배치 | KPA | 선행 followup |
| B9 | `MobileBottomNav` 읽음처리가 desktop 과 비대칭 | 전체 | 선행 followup |
| B10 | 레거시 mojibake 알림 row 2건 | — | 데이터 위생 |
| B11 | 로그인 화면 "테스트 매장 경영자 계정으로 채우기" 가 낡은 비밀번호를 채워 항상 401 | PH | My Page 축 밖 · 별도 WO 권장 |
| B12 | My Page leaf 화면에 breadcrumb 없음 (KPA·Neture 는 있음) | KCos · GP | 표기 일관성 |

§31 에 따라 위 항목은 트랙을 자동 실패시키지 않는다.

---

## 25. MUST_FIX_BEFORE_CLOSE

이번 WO 에서 확정된 결함 6건, **전량 해소 + 프로덕션 재검증 완료**.

| # | 결함 | 서비스 | commit | 프로덕션 재검증 |
|---|---|---|---|---|
| M1 | 프로필 `역할: -` (잘못된 role 노출) | KCos | `c9fd2d6a4` | PASS — `관리자` |
| M2 | `/mypage/business-profile` 로그아웃 시 supplier 401 오류 화면 노출 | Neture | `c9fd2d6a4` | PASS — Shell 안 로그인 안내 |
| M3 | 허브에 `공급자` 배지 2회 중복 노출 | Neture | `c9fd2d6a4` | PASS — `공급자` + `승인됨` |
| M4 | `/mypage/qualifications` 로딩이 Shell 밖 → 골격 순간 유실 | KPA | `c9fd2d6a4` | PASS — 제목·breadcrumb·nav 9 유지 |
| M5 | auth bootstrap 중 로그인 사용자에게 "로그인이 필요합니다" 수 초 노출 (4화면) | Neture | `142943486` | PASS — `계정 정보를 불러오는 중...` 후 정상 렌더 |
| M6 | leaf 화면 제목이 허브 제목("마이페이지")과 같아 현재 화면 식별 불가 | KCos | `6777d7503` | PASS — `프로필` / `설정` (`k-cosmetics-web-01043-r77`) |

`MUST_FIX_BEFORE_CLOSE = 0` (잔여 없음).

---

## 26. Help/Support 상태 정합

[`CHECK-O4O-CROSS-SERVICE-MYPAGE-HELP-SUPPORT-COMMONIZATION-V1.md`](CHECK-O4O-CROSS-SERVICE-MYPAGE-HELP-SUPPORT-COMMONIZATION-V1.md) 를 §29 에 따라 정합화했다 (`b4a030629`).

- 상단 판정 줄만 `CLOSED_WITH_FOLLOWUPS` → `FINAL CLOSED` 로 교체하고 "판정의 의미"(= 현행 공통화 대상 전량 수렴 ≠ self-read 문의 기능 구현)를 명시했다.
- §21 작성 시점 기록은 **원문 그대로 보존**하고 전환 근거를 별도 절로 덧붙였다.
- §20 followup **F1~F10 전량 유지**. history 삭제 0.

---

## 27. CROSS-SERVICE MY PAGE FINAL CLOSE 판정

```text
CROSS-SERVICE MY PAGE TRACK = CLOSED_WITH_FOLLOWUPS
  (사용자 노출 결함 = 0 · MUST_FIX 잔여 = 0
   미해소는 검증 공백 2건뿐)
```

**§30 의 `FINAL CLOSED` 를 선언하지 않는 이유** — §31 에 따라 강제 종료보다 정확한 기록을 택한다.

1. **pending / rejected 계정의 프로덕션 렌더가 미검증**이다 (B7). §24 production write = 0 제약과 SSOT 계정 부재로 이번 WO 에서 확인할 수 없었다.
2. **GP · PH 의 mobile 390x844 검증이 미실시**다 (§19). 두 서비스는 코드 변경이 0 이라 회귀 위험이 낮다고 판단했으나, "5서비스 desktop/mobile 전체 검증" 문언은 충족하지 못했다.

위 2건은 모두 **검증 공백이지 결함이 아니다.** 해소되면 별도 확인만으로 `FINAL CLOSED` 로 전환할 수 있으며, 그 전환은 본 CHECK 의 history 를 삭제하지 않고 §26 과 동일한 방식으로 덧붙인다.

---

## 28. CHECK/commit/push

| 항목 | 값 |
|---|---|
| 코드 commit | `c9fd2d6a4` · `142943486` · `6777d7503` |
| 문서 commit | `b4a030629` (Help/Support 정합) · 본 CHECK |
| push | 전부 `origin/main` 반영 |
| 다른 세션 dirty/untracked 파일 | 접촉 0 (guide 공통화 경로 미접촉) |
| stage 방식 | path-specific only — `git add .` 미사용 |
| 완료 조건 | WO 범위 미커밋 0 · `HEAD == origin/main` |
