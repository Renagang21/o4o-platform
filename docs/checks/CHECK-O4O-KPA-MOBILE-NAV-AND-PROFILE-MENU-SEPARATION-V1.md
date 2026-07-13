# CHECK-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1

> Work Order: `WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1`
>
> 목적: KPA Society 모바일에서 사이트 내비게이션(상단 햄버거)과 사용자 프로필·역할 메뉴(하단 '내정보')를 분리한다.

## 1. 실제 원인

- 직전 WO(WO-O4O-KPA-ROLE-BADGE-REMOVE-AND-USER-MENU-PARITY-RESTORE-V1)에서 KPA의 `mobileUserMenuItems` 축소 주입을 제거하자 공용 `GlobalHeader`의 fallback(`mobileUserMenuItems ?? userMenuItems`)이 작동해 역할 메뉴 접근성은 복원됐다.
- 그러나 공용 `GlobalHeader` 모바일 drawer 는 `publicNav + 사용자 이름·이메일 + userMenuItems + 로그아웃`을 한 화면에 렌더한다. 결과적으로 **모바일 햄버거 안에 사용자 프로필 메뉴 전체가 함께 노출**되어 IA 가 잘못된 상태가 됐다.
- 모바일에는 이미 하단 네비게이션(`MobileBottomNav`)의 '내정보' 탭(프로필 아이콘)이 존재하나, `/mypage` 로의 단순 링크였다.

## 2. 구현 방식

- **KPA service-local + 공용 additive prop** 조합. 우선안 A(기존 제어 prop)은 없어서, 대안 B(backward-compatible additive prop)를 채택.
- 공용 `GlobalHeader` 에 `showMobileUserMenu?: boolean`(기본 `true`) 추가. `false` 일 때만 모바일 drawer 의 **인증 사용자 영역**(이름·이메일·userMenuItems·로그아웃)을 렌더하지 않는다. 데스크톱 드롭다운과 비인증 로그인/회원가입 버튼은 영향 없음.
- 역할 메뉴는 신규 `KpaUserMenu.tsx`(SSOT)로 추출 — 데스크톱 드롭다운과 모바일 프로필 시트가 **동일 데이터·동일 역할 판정**을 재사용.

## 3. 변경 파일

| 파일 | 목적 |
|---|---|
| `packages/ui/src/layout/GlobalHeader.tsx` | additive `showMobileUserMenu` prop. false 시 모바일 drawer 인증 사용자 영역 미렌더(기본 true = 기존 동작 불변). |
| `services/web-kpa-society/src/components/KpaUserMenu.tsx` (신규) | 역할 메뉴 항목 + 역할 판정 SSOT (`KpaUserMenuItems`, `useKpaUserRoles`, `getKpaUserDisplayName`). |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | `userMenuItems` 인라인 → `<KpaUserMenuItems user={user} />`. `showMobileUserMenu={false}` 주입. 미사용 role 로컬/아이콘 import 정리. |
| `services/web-kpa-society/src/components/MobileBottomNav.tsx` | '내정보' 탭 = 프로필 bottom-sheet 열기. 이름·이메일 + 역할별 대시보드 + 계정 메뉴 + 로그아웃. ESC/backdrop/닫기 버튼, 내부 스크롤, safe-area, 라우트 이동 시 자동 닫힘. |

## 4. 모바일 햄버거 (검증 결과)

- 표시: 커뮤니티 / 내 약국 / 약국 운영 허브 / 서비스 안내 / About (사이트 nav 만)
- 미표시: 사용자 이름·이메일 / 관리자 대시보드 / 운영 대시보드 / 내 매장 / 마이페이지 / 설정 / 로그아웃

## 5. 모바일 프로필 ('내정보' 시트, 검증 결과)

- 사용자 정보: `서철환님` / `sohae2100@gmail.com`
- 역할별 메뉴(보유 역할): 관리자 대시보드(/admin) / 운영 대시보드(/operator) / 내 매장(/store)
- 계정 메뉴: 마이페이지(/mypage) / 설정(/mypage/settings)
- 로그아웃 버튼
- close: 닫기(X) 버튼·backdrop 클릭·ESC·라우트 이동 시 자동 닫힘. `role="menu"`, `aria-expanded` 토글, `max-h-[80vh]` 내부 스크롤, safe-area padding.

## 6. 데스크톱 보존 (검증 결과)

- 상단 사이트 nav: 커뮤니티 / 내 약국 / 약국 운영 허브 / 서비스 안내 / About — 유지
- 프로필 드롭다운(1280px): 관리자 대시보드 / 운영 대시보드 / 내 매장 / 마이페이지 / 설정 / 로그아웃 — 리팩터(KpaUserMenuItems) 후 동일

## 7. 정적 검증

- `@o4o/ui` `tsc --noEmit` **exit 0**, `tsc --build` **성공**(dist d.ts 에 `showMobileUserMenu` 반영)
- `web-kpa-society` `tsc --noEmit` **exit 0**, production build(`tsc && vite build`) **성공**
- Shared Module Change Protocol — 공용 GlobalHeader 소비 3서비스 회귀 검증: `web-glycopharm` / `web-k-cosmetics` / `web-neture` `tsc --noEmit` **각 exit 0** (prop 기본값 true, 미주입 → 영향 없음)

## 8. 배포

- commit `636d66c41` push → CI "Deploy Web Services (Cloud Run)" **success**
- 신규 KPA 번들 `index-DX8hZSF8.js` 프로덕션 반영 확인

## 9. 운영 smoke (프로덕션 `kpa-society.co.kr`, admin+operator+store_owner 다중역할 계정)

| 항목 | 뷰포트 | 결과 |
|---|---|---|
| 상단 햄버거 = 사이트 nav 만 (사용자 영역 미표시) | 390px | **PASS** |
| 하단 '내정보' 버튼 → 프로필 시트(이름·이메일 + 역할 대시보드 + 계정 + 로그아웃) | 390px | **PASS** |
| 프로필 시트 닫기(닫기 버튼) | 390px | **PASS** |
| md 경계: 하단 nav·햄버거 숨김, 데스크톱 헤더 표시 | 768px | **PASS** (bottomNav display:none, desktop user menu visible) |
| 모바일 레이아웃: 햄버거·하단 nav 표시, 데스크톱 메뉴 숨김 | 430px | **PASS** (bottomNav display:flex h=51px) |
| 데스크톱 드롭다운 = 기존 항목 유지 | 1280px | **PASS** |
| 관리자 진입점 라벨 `관리자 대시보드` | 390/1280px | **PASS** |

- 콘솔 오류: 로그인 전 401(auth check)·미게시 법정문서(terms/privacy) 404 등 본 변경과 무관한 항목만. 본 변경 관련 오류 0.

## 10. 보존

- route / 권한 판정 / API / DB / 역할 데이터 변경 0
- 관리자·운영자·store guard 변경 0
- 공용 `GlobalHeader` 는 additive(기본 동작 불변), 타 서비스 변경 0
- 사이트 nav 항목·데스크톱 헤더·모바일 store 업무 drawer 무변경

## 11. Git

- code commit `636d66c41` (4 files) → push `429a531b4..636d66c41`
- CHECK commit: 본 문서
- HEAD == origin/main
- 동시 세션 파일(`pnpm-lock.yaml` 등) 무접촉 — path-specific 커밋

## 12. 상태

구현·정적검증·배포·운영 smoke 완료. **DONE**.
