# CHECK-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1

> Work Order: `WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1` (+ Partner Workspace Mobile IA Skeleton 추가 범위)
>
> 목적: KPA에서 확정한 모바일 IA 원칙(햄버거=사이트 nav / 프로필=역할·계정 / 하단 utility=알림·프로필 / 업무 sidebar drawer / 역할코드 미노출)을 Neture 실제 구조에 맞춰 정렬. 파트너 포함.

## 1. 조사 결과 (실제 원인)

- **Neture 에는 모바일 하단 utility nav 가 아예 없었다.** `MobileBottomNav`/`BottomNav` 부재. 모바일(<768px)에서 상단 `NetureGlobalHeader` utility(NotificationBell·사용자 메뉴)는 숨겨지므로, **모바일에서 알림·프로필 접근 경로가 전무**했다.
- `NetureGlobalHeader` 는 `showMobileUserMenu` 미지정(기본 true) → 모바일 햄버거 drawer 에 사용자 영역(이름·이메일·userMenuItems·로그아웃)이 사이트 nav 와 섞여 노출됐다.
- **역할·route·layout 은 이미 canonical 하게 존재**: 역할 SSOT `role-constants`(neture:admin/operator/supplier/partner + platform + legacy). userMenuItems 는 admin/operator/supplier/partner 대시보드 진입점을 이미 역할별로 렌더. workspace layout(Operator/Admin=OperatorAreaShell, Supplier/Partner=자체 sidebar+drawer) 도 모두 존재.
- **파트너는 skeleton 신설 대상이 아니었다** — `neture:partner` 역할 + `/partner/*`(PartnerSpaceLayout, sidebar groups, 모바일 탭) + `/partner/dashboard` 가 이미 구현되어 있었다. 이번 작업은 파트너 영역에 **모바일 하단 utility coverage 를 포함**하는 것.
- **내부 역할코드 노출 없음**: KPA 의 `kpa:admin` 같은 장식 배지가 Neture 관리자 대시보드에 없음. `neture:*` 는 전부 기능용(role filter, `<option value>` — 라벨은 "운영자/관리자" 한글). PlatformAdmin 페이지의 설명용 `<code>platform:*</code>` 만 존재(admin 전용 접근 안내, drift 아님) → 제거 대상 없음.

## 2. 조사 Matrix

| 영역 | 대표 route | layout | 역할/guard | 하단 utility (before → after) | 업무 drawer | 판정 |
|---|---|---|---|---|---|---|
| 공개/일반 | `/` | NetureLayout | login | ✗ → ✓ (인증 시) | — | 결함→해소 |
| 마이페이지 | `/mypage` | NetureLayout | login | ✗ → ✓ | — | 결함→해소 |
| 공통 정보 | `/o4o`·`/store`·`/seller` | MainLayout | login | ✗ → ✓ (인증 시) | — | 결함→해소 |
| 관리자 | `/admin` | AdminLayoutWrapper(OperatorAreaShell) | neture:admin | ✗ → **✓** | 운영자 메뉴 drawer (기존) | 결함→해소 |
| 운영자 | `/operator` | OperatorLayoutWrapper(OperatorAreaShell) | operator+ | ✗ → **✓** | 운영자 메뉴 drawer (기존) | 결함→해소 |
| 공급자 | `/supplier` | SupplierSpaceLayout | supplier | ✗ → **✓** | 공급자 메뉴 drawer (기존, lg) | 결함→해소 |
| **파트너** | `/partner` | PartnerSpaceLayout | neture:partner | ✗ → **✓** | 파트너 메뉴 탭 (기존, md) | 결함→해소 |

## 3. 구현 (KPA 복사 아님 — Neture 실제 역할·route 사용)

- **NetureBottomNav.tsx (신규)**: 모바일 하단 utility nav(**홈 / 알림 / 내정보**). **인증 사용자에게만 렌더**(비인증 시 null → 공개 `/qr/:slug`·`/p/:publicKey` 랜딩 누출 방지). 알림 badge + bottom-sheet(NetureGlobalHeader 와 동일 `useNotifications(NOTIFICATION_SERVICE_KEY)` source, markAsRead/markAllAsRead/항목 라우팅). 프로필 sheet(역할별 업무 공간 + 계정 + 로그아웃). 하단 여백 스페이서 내장(인증 시에만, layout별 별도 스페이서 불필요). openSheet 단일 상태(알림/내정보 상호 배타).
- **NetureUserMenu.tsx (신규)**: 역할 업무 메뉴 SSOT(`NetureUserMenuItems`, `useNetureUserRoles`, `getNetureUserDisplayName`). 데스크톱 드롭다운 + 모바일 프로필 sheet 공유. 역할 판정은 role-constants 재사용(새 로직 없음).
- **notificationRouting.ts (신규)**: `resolveNetureNotificationTarget` SSOT(metadata.targetUrl). 데스크톱 벨 + 모바일 sheet 공유.
- **NetureGlobalHeader.tsx**: `userMenuItems` → `<NetureUserMenuItems>`, `handleNotificationClick` → resolveNetureNotificationTarget, **`showMobileUserMenu={false}`**(햄버거 = 사이트 nav 만).
- **NetureBottomNav 렌더**: 인증 workspace layout 6곳 — NetureLayout / MainLayout / OperatorLayoutWrapper / AdminLayoutWrapper / SupplierSpaceLayout / PartnerSpaceLayout. 각 route 는 정확히 하나의 layout 만 사용 → **중복 렌더 없음**.
- **공용 GlobalHeader 변경 0**: `showMobileUserMenu` 는 KPA WO 에서 이미 main 에 추가된 additive prop 재사용.

## 4. 정적 검증

- `web-neture` `tsc --noEmit` **exit 0**, production build(`tsc && vite build`) **성공**
- shared package 변경 0 → 타 서비스 회귀 없음

## 5. 배포

- commit `e27e68a85` push → CI "Deploy Web Services (Cloud Run)" **success**, 번들 반영

## 6. 운영 smoke (프로덕션 `neture.co.kr`)

두 계정으로 검증: supplier-only(renagang21) · admin+operator(sohae2100).

| 항목 | route / 뷰포트 | 결과 |
|---|---|---|
| 하단 nav 렌더(홈/알림/내정보), count=1 | `/`·`/supplier/dashboard`·`/admin`·`/operator`·`/partner/dashboard` 390px | **PASS** (전부) |
| 알림 badge + 시트 목록(동일 source) | `/supplier` 390px | **PASS** (unread 5, 실제 알림 목록) |
| 프로필 sheet — 보유 역할만 표시 | 390px | **PASS** (supplier=공급자 대시보드만 / admin+operator=관리자·운영 대시보드) |
| 햄버거 = 사이트/컨텍스트 nav 만(이름·이메일·계정·로그아웃 미표시) | 390px | **PASS** (`showMobileUserMenu=false`) |
| 업무 drawer 별도 진입점(사이트 햄버거와 분리) | `/supplier`·`/admin` | **PASS** (공급자/운영자 메뉴 버튼 별도) |
| 로그아웃 → 하단 nav 미렌더(비인증 null) | `/` 390px | **PASS** |
| 데스크톱 하단 nav 숨김 + 상단 벨·프로필 유지 | `/supplier` 1280px | **PASS** (`display:none`, bell+user menu visible) |
| 관리자 대시보드 역할코드 배지 미노출 | `/admin` | **PASS** (제목·부제만) |

- 콘솔: 로그인 전 401(auth/me)·partner commission 404 등 본 변경과 무관한 항목만. 관련 오류 0.

## 7. 파트너 영역 (추가 범위 결과)

- 기존 partner 코드 **존재**: `neture:partner` role, `PARTNER_ONLY_ROLES`, `/partner/*`(PartnerSpaceLayout), `/partner/dashboard`, `/account/partner/*`(PartnerAccountLayout).
- partner ≠ supplier: 별도 role·route·layout·sidebar(Overview/Products/신청·승인/Marketing/Finance/Partner HUB). supplier 와 병합/재사용 없음.
- canonical route: `/partner` (프로필 진입점 `/partner/dashboard`).
- guard/role 상태: 실제 role 체계 존재 → 프로필 메뉴 `파트너 대시보드` 는 `isPartner` 조건부(미보유 시 미표시) 이미 정상. skeleton 신설 불필요.
- 이번 추가: PartnerSpaceLayout 에 NetureBottomNav coverage 포함(모바일 알림·내정보). 라이브 검증 PASS.
- 미구현 가짜 화면 생성 0.

## 8. 보존

- route / 권한 판정 / API / DB / role migration / 알림 backend 변경 0
- 공용 `GlobalHeader` 등 shared package 변경 0 (additive prop 재사용)
- 사이트 public nav·데스크톱 상단 utility·workspace sidebar/drawer·내부 role code 무변경

## 9. Git

- code commit `e27e68a85` (10 files, path-scoped) → push `90de0fe67..e27e68a85`
- CHECK commit: 본 문서
- HEAD == origin/main. 동시 세션 파일 무접촉.

## 10. 상태

구현·정적검증·배포·운영 smoke 완료. **DONE**.
