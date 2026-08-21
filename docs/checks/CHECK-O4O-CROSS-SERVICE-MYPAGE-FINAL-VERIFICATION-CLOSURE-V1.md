# CHECK — WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1

> **판정: CROSS-SERVICE MY PAGE TRACK = FINAL CLOSED**
> 검증일: 2026-08-21 · 근거 WO: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-VERIFICATION-CLOSURE-V1.md)
> 선행 CHECK: [`CHECK-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1.md`](CHECK-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1.md)

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| 검증 기준 commit | `dc32baf7a` (= 검증 시작 시점 `origin/main`) |
| 본 WO 수정 commit | `807f3c5d4` — KPA MembershipGate dead nav 제거 |
| 본 WO 문서 commit | `7b63a676a` — 본 CHECK 신규 + 선행 CHECK 정합화 |

| Cloud Run 서비스 | 검증 시점 latest ready revision |
|---|---|
| `kpa-society-web` | `kpa-society-web-01868-mgh` |
| `glycopharm-web` | `glycopharm-web-01300-tcq` |
| `k-cosmetics-web` | `k-cosmetics-web-01043-r77` |
| `neture-web` | `neture-web-01495-p7t` |
| `pharmacy-hub-web` | `pharmacy-hub-web-00119-4gr` |

---

## 2. pending / rejected 테스트 계정 census

SSOT = `docs/local/TEST-ACCOUNTS.local.md` (자격증명은 본 문서에 적지 않는다).

| 서비스 | membership status `pending` 계정 | `rejected` 계정 |
|---|:---:|:---:|
| KPA-Society | 없음 | 없음 |
| GlycoPharm | 없음 | 없음 |
| K-Cosmetics | 없음 | 없음 |
| Neture | 없음 | 없음 (E2E fixture 1건이 표기돼 있으나 My Page 검증용 상시 계정 아님) |
| Pharmacy-Hub | 없음 | 없음 |

문서에 등재된 계정은 전부 `active` 또는 운영자/관리자 계정이다.

- WO §16 이 **새 테스트 계정 생성을 중지 조건**으로 지정했고 WO §6·§15 가 **membership 상태 변경을 전면 금지**했으므로,
  계정 생성·상태 변경을 수행하지 않았다.
- 따라서 완료 경로는 WO §7-B (**테스트 계정 부재 + 3단 정적 계약 증거**) 를 적용한다. WO §7 기준상 §7-A 와 **동등한 PASS 경로**다.

---

## 3. pending / rejected — 3단 정적 계약 증거 (WO §6 · §7-B)

### 축 1 — guard / route 계약 (route tree 최상단부터의 guard ordering)

| 서비스 | My Page route guard | membership 분기 위치 | unreachable branch |
|---|---|---|---|
| GlycoPharm | `SoftGuard feature="mypage"` (`services/web-glycopharm/src/App.tsx:434`) — auth-only | 페이지 내부 `RoleBadgeGroup` 상태 배지 | 도달 가능 (gate 없음) |
| KPA-Society | `MyPageGuard` (`services/web-kpa-society/src/App.tsx:465`) — auth-only, 미인증 시 `/login` | 페이지 내부 `MembershipStatusBadge` | 도달 가능 |
| K-Cosmetics | `ProtectedRoute = RoleGuard` → `createRouteGuard({ MembershipGate })` (`services/web-k-cosmetics/src/components/auth/RoleGuard.tsx`) | `MembershipGate` (route 레벨) | 도달 가능 |
| Neture | route guard 없음 — 페이지 레벨 auth 처리 | 페이지 내부 상태 배지 | 도달 가능 |
| Pharmacy-Hub | `/account` 는 **의도적 무게이트**(`services/web-pharmacy-hub/src/App.tsx:205` 주석 명시), `/store-owner/*` 는 `StoreOwnerShell` → `MembershipGate` | 양쪽 모두 | 도달 가능 |

`packages/auth-react/src/createRouteGuard.tsx` ordering 실측:
`isLoading` → `!isAuthenticated || !user` → `redirectMap` → `allowedRoles` → `enforceMembership && MembershipGate` → `children`.
**membership 분기는 role 분기 뒤·children 앞이라 도달 가능하며 ordering 오류 없음.**

### 축 2 — 렌더 분기 / 컴포넌트 경로

- 5 서비스 `MembershipGate` 는 동일 패턴: `isLoading` → `!isAuthenticated`(호출자 위임) → `isPlatformSuperAdmin` → `status === 'active'` → **그 외 전부** `MembershipStatusNotice` + `buildMembershipViewModel`.
- 즉 `pending` / `rejected` / `suspended` / `withdrawn` / `none` 는 **같은 안내 화면 분기**로 수렴한다 (분기 누락 없음).
- Shell 밖 early return 없음: PH `MyProfilePage` 는 `frame()` 헬퍼로 loading / unauthenticated / error / 정상 **모든 상태**를 `MyPageShell` 안에서 렌더한다 (런타임에서도 로딩 상태에 제목·nav 유지 확인 — §5).
- K-Cosmetics 는 route 레벨 `MembershipGate` 가 먼저 걸리므로 `MyPageHub` 내부 상태 배지의 non-active 값은 실질적으로 도달하지 않는다. 사용자에게는 **route 레벨 상태 화면이 대신 노출**되므로 결함이 아니라 설계 결과로 기록한다.

### 축 3 — status normalizer / mapping

- SSOT: `packages/auth-utils/src/membershipGate.ts` — 알 수 없는/legacy status 는 **`'none'` 으로 보수적 fallback**(차단 방향). `'pending'` 으로 낙관 fallback 하지 않는다.
- `packages/account-ui/src/adapters/membershipNormalizers.ts:48` — `const key = status && status.length > 0 ? status : 'none';`
  → **WO 부기 D 가 지목한 `?? 'pending'` 기본값은 이 파일에 존재하지 않는다.** silent pending 표시 우려는 실측상 성립하지 않는다.
  - 실제 `?? 'pending'` 은 `packages/account-ui/src/adapters/requestNormalizers.ts:46` 의 **내 신청 row status** 로 membership 축과 다른 축이다. 기록만 남긴다.
- 라벨/톤 매핑: `pending` = "승인 대기"/amber, `active` = "승인됨"/emerald, `rejected` = "반려됨"/rose, `none` = "미가입"/slate.
  안내 문구: pending = "가입 승인 대기 중"(⏳), rejected = "가입 신청 반려"(🚫).

**3단 정적 증거 = PASS** (축 1·2·3 모두 실코드에서 확인).

---

## 4. GP mobile 390×844

Playwright MCP · viewport 390×844 · `https://www.glycopharm.co.kr`

| route | 렌더 | nav | `aria-current` | page overflow (`scrollWidth`/`clientWidth`) |
|---|:---:|:---:|:---:|:---:|
| `/mypage` | OK | OK | 홈 | 382 / 382 |
| `/mypage/profile` | OK | OK | 프로필 | 382 / 382 |
| `/mypage/settings` | OK | OK | 설정 | 382 / 382 |
| `/mypage/enrollments` | OK | OK | 내 수강 | 382 / 382 |
| `/mypage/certificates` | OK | OK | 학습 결과 | 382 / 382 |
| `/mypage/credits` | OK | OK | 크레딧 | 382 / 382 |
| `/mypage/my-requests` | OK | OK | 내 신청 | 382 / 382 |

- 페이지 레벨 가로 overflow **0건** (7/7 route 에서 `scrollWidth == clientWidth`).
- nav 컨테이너는 `overflow-x: auto` (scrollWidth 520 / clientWidth 342) 로 **의도된 가로 스크롤**이며 활성 항목이 자동으로 view 안으로 스크롤된다.
- double shell 없음 (`shellCount: 1`, `h1Count: 1`).
- 뒤로가기·하드 리프레시 정상.
- console error **0**, network 요청 **전부 200** (401/403/404/5xx 0건).
- 관찰(결함 아님): breadcrumb "홈"(16px) · "프로필 수정"(32px) 이 40px 미만 터치 타깃. 클릭은 정상. §11 backlog 로 기록.

**WO 부기 B 검증**: WO 원문의 `/mypage/requests` 는 GP 에 정의된 적이 없는 경로이며,
**nav 항목·카드 어디에서도 `/mypage/requests` 를 가리키지 않는다** (GP nav "내 신청" → `/mypage/my-requests`).
→ dead link 아님. 404 오판정하지 않았다.

---

## 5. PH mobile 390×844

Playwright MCP · viewport 390×844 · `https://pharmacyhub.co.kr`
로그인은 **정상 로그인 폼**으로 수행했다 (WO §11 대로 demo autofill 버튼 미사용).

### `/account` (PublicLayout · 무게이트 — 설계상 pending/rejected 도 열람 가능)

| 항목 | 결과 |
|---|---|
| bootstrap 단계 | `MyPageShell` 안에서 "계정 정보를 불러오는 중..." — 제목("내 프로필")·nav 유지 (Shell 밖 early return 없음) |
| 로드 후 | h1 = "내 프로필", nav = 내 프로필(`/account`) + 가입 상태(`/join/status`), `aria-current` = 내 프로필 |
| 서비스 가입 상태 | 승인됨 / role = 약국 경영자 |
| 보안 설정 | 비밀번호 변경 폼 **열람만** (제출 없음 → write 0) |
| overflow | `scrollWidth 375 / clientWidth 375` — 0건 |
| console error | 0 |
| network | `auth/me` 200 · `users/me/profile` 200 · `notifications/unread-count` 200 · `public/services/pharmacy-hub/footer-legal` 200 — 401/403/404/5xx 0건 |

### `/store-owner/account` (StoreOwnerShell · MembershipGate 경유)

| 항목 | 결과 |
|---|---|
| compatibility URL | 유지 — `/store-owner/account` 정상 진입 |
| guard | "권한을 확인하는 중..." → 통과 후 정상 렌더 |
| store-owner sidebar | 정상 (홈 / 매장 정보 / 내 계정 …) |
| "내 계정" 활성 표시 | `aria-current="page"` + 활성 스타일 확인 |
| thin wrapper | `AccountPage` → `<MyProfilePage showNotifications withShell={false} />` — 실제 렌더도 h1 1개("내 프로필") |
| double shell | 없음 (`MyPageShell` nav 미중복, h1 1개) |
| overflow | `scrollWidth 375 / clientWidth 375` — 0건 |
| console error | 0 |
| network | 전부 200 |

---

## 6. 선행 결함 최소 회귀 (WO §14)

| # | 회귀 항목 | 근거 commit | 프로덕션 실측 | 판정 |
|---|---|---|---|:---:|
| 1 | K-Cosmetics role 라벨 (raw key 미노출) | `c9fd2d6a4` | `/mypage` · `/mypage/profile` 에서 "관리자" 표시 | PASS |
| 2 | Neture role badge 중복 없음 | `c9fd2d6a4` | `/mypage` 에서 "관리자" 1회 + "승인됨" 1회 | PASS |
| 3 | Neture auth bootstrap 중 "로그인이 필요합니다" 오노출 제거 | `142943486` | bootstrap 단계에는 Shell + "마이페이지를 불러오는 중..." 만 노출. 미인증이 확정된 뒤에만 "로그인이 필요합니다" 노출 | PASS |
| 4 | KPA 자격 로딩 중 Shell 유지 | `c9fd2d6a4` | `/mypage/qualifications` 를 400ms 간격 10회 샘플링 — 전 구간 h1 "내 자격" + 마이페이지 nav 유지 | PASS |
| 5 | K-Cosmetics leaf 화면 제목 (허브 제목 아님) | `6777d7503` | `/mypage/profile` → "프로필", `/mypage/settings` → "설정" | PASS |
| 6 | notification dead target 0 | 선행 WO | **미확인** — 알림 목록 열람이 읽음처리 write 를 유발할 수 있어 WO §15(읽음처리 금지) 준수를 위해 클릭하지 않았다. 선행 CHECK 판정을 유지한다 | 미확인 |

---

## 7. production browser 관측 (WO §18 · 부기 G)

측정한 것만 적는다. 측정하지 않은 것은 0 이 아니라 **미확인**으로 적는다.

| 항목 | GP `/mypage` 7 route | PH `/account`·`/store-owner/account` | KCos `/mypage`·`/profile`·`/settings` | Neture `/mypage` | KPA `/mypage`·`/qualifications` |
|---|:---:|:---:|:---:|:---:|:---:|
| white screen | 0 | 0 | 0 | 0 | 0 |
| JS exception (console error) | 0 | 0 | 0 | 0 (인증 상태) | 0 |
| unexpected 401/403 | 0 | 0 | 0 | 0 | 0 |
| 404 | 0 | 0 | 0 | 0 | 0 |
| 5xx | 0 | 0 | 0 | 0 | 0 |
| page 가로 overflow | 0 | 0 | 0 | 0 | 0 |
| double shell | 0 | 0 | 0 | 0 | 0 |
| mobile 기능 소실 | 0 | 0 | 0 | 0 | 0 |

- 미로그인 상태에서 Neture `/mypage` 진입 시 `auth/me` 401 · `auth/refresh` 401 이 관측되나 이는 **미인증 사용자의 정상 bootstrap 경로**이며 로그인 후 재측정에서 0 이다. unexpected 아님.
- KPA `/mypage` 미인증 진입은 `MyPageGuard` 가 `/login` 으로 정상 redirect (정적 계약과 일치).

---

## 8. production write

**write 0건.** 수행하지 않은 것:

```text
Profile 저장 / Password 변경 / 신청 생성·취소 / Membership 상태 변경
Notification 읽음처리 / DB 직접 변경 / 테스트 계정 생성
```

- PH `/account` 에서 비밀번호 변경 폼을 **열었다가 취소**만 했다 (제출 없음).
- 로그인은 조회를 위한 인증 행위이며 WO §15 의 write 대상이 아니다.

---

## 9. 코드 수정 여부 — MUST_FIX 1건 발견·수정

**발견 결함 (WO §7 "dead navigation" 유형):**

`services/web-kpa-society/src/components/auth/MembershipGate.tsx` 의 `APPLY_PATH` 가
`'kpa-society': '/member/apply'` 를 가리키고 있었으나 **KPA-Society route tree 에 `/member/apply` 는 존재하지 않는다**
(`services/web-kpa-society/src/App.tsx` 의 catch-all `<Route path="*" element={<NotFoundPage />} />` 로 떨어짐).
→ membership 이 없는(`none`) 사용자에게 "가입 신청하기" CTA 가 노출되면 **404 로 이어지는 dead navigation**.

- 유입 이력: `6d04c3d2f` (WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1, 2026-05-14) 에서 도입.
- 대체 후보 검토: `/register` 는 **신규 계정 가입 모달**(이미 로그인한 사용자에게 부적합), `/join/pharmacy` 는 안내·문의 페이지로 canonical 신청 화면이 아니다.
- **최소 수정 채택**: `APPLY_PATH` 매핑을 비워 CTA 자체를 렌더하지 않는다 (Neture 도 동일하게 신청 경로 없음). "홈으로 돌아가기" CTA 는 유지.
  KPA 가입 신청 화면이 실제로 생기면 그때 canonical 경로를 추가하도록 주석으로 계약을 남겼다.

수정 파일: `services/web-kpa-society/src/components/auth/MembershipGate.tsx` (1 파일 · +9 / −4)

**수정 후 재검증 한계 (숨기지 않고 기록):**
`none` 상태 KPA 계정이 존재하지 않으므로 CTA 가 사라진 화면을 **런타임으로 재현할 수 없다.**
재검증은 축 2(렌더 분기) 정적 확인으로 수행했다 — `!membership.membershipExists && applyPath` 조건에서 `applyPath` 가 항상 `null` 이므로 apply action 이 push 되지 않는다.

---

## 10. typecheck / build

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` (`services/web-kpa-society`) | 수정 전 `error TS` **1347건** / 수정 후 **1347건** — **증감 0** |
| 변경 파일 자체의 오류 | `components/auth/MembershipGate.tsx` **0건** |

- 위 1347건은 전부 워크트리에서 workspace 패키지 산출물이 없어 발생하는 `TS2307 Cannot find module '@o4o/*'` 및 그로부터 파생된 `TS7006` 계열의 **선행 환경 오류**이며 본 WO 변경과 무관하다.
- 동일 tsconfig 로 수정 전/후를 각각 실행해 건수가 동일함을 실측했다.
- monorepo 전체 build 는 로컬에서 수행하지 않았고, **CI/CD 로 확인했다**: push 후 `Deploy Web Services (Cloud Run)` 의 `detect-changes` → `deploy-kpa-society` 잡이 **성공**했고 `kpa-society-web` 이 `kpa-society-web-01868-mgh` → **`kpa-society-web-01869-wmb`** 로 갱신됐다.
- **배포 후 재검증 (390×844)**: `https://kpa-society.co.kr/mypage` — h1 "마이페이지", nav 9 항목 정상, 가로 overflow 0 (`scrollWidth 375 / clientWidth 375`), console error 0, 문서 전체에 `/member/apply` 링크 **0건**.

---

## 11. 잔존 backlog (WO §21 — FINAL CLOSE blocker 아님)

```text
email 변경 / 탈퇴 3축 / sessions UI / Help self-read 문의 계약 / FAQ
Activity backend / Activity type enum / membership metadata self-read
Neture membership none 가입 동선 / PH 복수 role 표현 / 조회 실패 삼킴 계약화
notification 장기 followup / KPA 고아 page / PH 로그인 demo autofill 401
```

본 WO 에서 추가로 기록하는 관찰(전부 blocker 아님):

- GP breadcrumb "홈"(16px) · "프로필 수정"(32px) 터치 타깃 40px 미만.
- `packages/account-ui/src/adapters/requestNormalizers.ts:46` 의 `?? 'pending'` (내 신청 row status 기본값).
- K-Cosmetics `MyPageHub` 내부 상태 배지의 non-active 값은 route 레벨 `MembershipGate` 때문에 실질 도달하지 않음.
- **KPA 가입 신청(apply) 화면 부재** — §9 수정으로 dead link 는 제거했으나 `none` 상태 사용자를 위한 KPA 신청 동선 자체는 여전히 없다 (§21 "Neture membership none 가입 동선" 과 같은 성격의 backlog).

---

## 12. MUST_FIX_BEFORE_CLOSE

```text
MUST_FIX_BEFORE_CLOSE = 0
```

발견된 1건(KPA `/member/apply` dead navigation)은 본 WO 안에서 최소 수정·commit·배포로 해소했다.

---

## 13. 최종 판정

```text
CROSS-SERVICE MY PAGE TRACK = FINAL CLOSED
MYPAGE HELP/SUPPORT TRACK = FINAL CLOSED (선행 판정 유지)
```

WO §18 대응:

| 완료 기준 | 결과 |
|---|:---:|
| pending/rejected — 테스트 계정 부재 + 3단 정적 증거 PASS | PASS (§3) |
| GP mobile 390×844 PASS | PASS (§4) |
| PH mobile 390×844 PASS | PASS (§5) |
| white screen = 0 | 측정 완료 · 0 (§7) |
| JS exception = 0 | 측정 완료 · 0 (§7) |
| unexpected 401/403 = 0 | 측정 완료 · 0 (§7) |
| 404 = 0 | 측정 완료 · 0 (§7) |
| 5xx = 0 | 측정 완료 · 0 (§7) |
| dead nav/card = 0 | 1건 발견 → 수정 완료 (§9) |
| double shell = 0 | 측정 완료 · 0 (§7) |
| mobile 기능 소실 = 0 | 측정 완료 · 0 (§7) |
| MUST_FIX_BEFORE_CLOSE = 0 | 0 (§12) |

미확인으로 남긴 항목 (판정에 영향 없음, 정직 기록):

- notification dead target 재확인 (§6-6) — write 금지 준수로 미수행.
- KPA `none` 상태 실렌더 재검증 (§9) — 해당 상태 계정 부재.
- monorepo 전체 build (§10) — CI/CD 로 위임.

---

## 14. CHECK / commit / push

| 항목 | 값 |
|---|---|
| 수정 commit | `807f3c5d4` fix(kpa-society): MembershipGate 가입 신청 CTA dead navigation 제거 |
| CHECK 문서 commit | `7b63a676a` docs(check): 본 CHECK 신규 + 선행 CHECK 상태 정합화 |
| stage 방식 | path-specific only (`git add .` 미사용) |
| 다른 세션 파일 | 미접촉 |
| 완료 조건 | 충족 — 본 WO 범위 미커밋 0 · `HEAD == origin/main` (`7b63a676a`) |
| 비고 | push 시 origin/main 이 `60b6d33ac` 로 선행돼 있어 rebase 후 push 했다 (다른 세션 커밋 미변경) |
