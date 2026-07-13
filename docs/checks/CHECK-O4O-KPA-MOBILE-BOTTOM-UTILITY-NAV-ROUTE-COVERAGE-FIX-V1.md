# CHECK-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1

> Work Order: `WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1`
>
> 목적: 모바일 하단 utility nav(알림/내정보)를 모든 KPA 인증 앱 영역에서 항상 사용 가능하게 하고, 하단 알림을 데스크톱 벨과 동일 source로 연결한다.

## 1. 실제 원인 (route coverage 누락)

- `MobileBottomNav` 는 **일반 `Layout` 에서만** 렌더됐다. `/admin`(AdminLayout)·`/operator`(KpaOperatorLayoutWrapper)·`/store`(KpaStoreLayoutWrapper)·`/instructor`(InstructorLayout)는 각자 다른 layout 에서 `KpaGlobalHeader` 만 렌더 → **이 영역에 하단 nav 부재**.
- 모바일(<768px)에서는 `GlobalHeader` 상단 utility(NotificationBell·사용자 메뉴)가 숨겨지므로, 하단 nav 가 없는 영역에서는 **알림·프로필 접근 경로가 사라졌다**.
- breakpoint/z-index/인증 조건 문제 아님 — 순수 **렌더 위치(layout coverage)** 문제.

## 2. route coverage (before → after)

| 영역 | 대표 route | layout | 하단 nav (before) | (after) |
|---|---|---|---|:---:|
| 일반/포럼/가이드/콘텐츠/자료실 | `/` | Layout | ✓ | ✓ |
| 마이페이지 | `/mypage` | Layout | ✓ | ✓ |
| 운영 허브 | `/store-hub` | Layout | ✓ | ✓ |
| 관리자 | `/admin/kpa-dashboard` | AdminLayout | ✗ 누락 | **✓ 복원** |
| 운영자 | `/operator` | KpaOperatorLayoutWrapper | ✗ 누락 | **✓ 복원** |
| 내 약국 | `/store` | KpaStoreLayoutWrapper | ✗ 누락 | **✓ 복원** |
| 강사 | `/instructor` | InstructorLayout | ✗ 누락 | **✓ 복원(코드)** |

## 3. 구현

- **우선안 B(영역별 layout 공통 삽입, 복사 없이 동일 컴포넌트 재사용)** 채택. 우선안 A(App shell 1회)는 공개 storefront(`/store/:slug`)·키오스크·로그인 등 비인증/고객 화면으로 누출되어 부적합.
- AdminLayout / InstructorLayout / KpaOperatorLayoutWrapper / KpaStoreLayoutWrapper 각각에 `<MobileBottomNav />` + **모바일 하단 여백 스페이서**(`md:hidden`, `calc(3.5rem + env(safe-area-inset-bottom))`) 추가. 모두 page-scroll shell, 각 route 는 정확히 하나의 layout 만 사용 → **중복 렌더 없음**.
- **알림 연결**(§8): `MobileBottomNav` '알림' 탭 = 읽지 않은 수 badge + bottom-sheet 목록. `useNotifications(notificationsApi, { serviceKey: 'kpa-society' })` — 데스크톱 `KpaGlobalHeader` 와 **동일 source**(새 API 없음). markAsRead / markAllAsRead / 항목별 클릭 라우팅 재사용.
- 클릭 라우팅은 `resolveNotificationTarget`(신규 SSOT)으로 추출 → 데스크톱 벨과 모바일 시트가 공유. `KpaGlobalHeader.handleNotificationClick` 동치 유지.
- 알림/내정보 시트는 `openSheet` 단일 상태로 **상호 배타**(중복 표시 없음). ESC/backdrop/닫기, 라우트 이동 시 자동 닫힘, safe-area padding, 내부 스크롤.

## 4. 변경 파일 (KPA service-local, shared package 무변경)

| 파일 | 목적 |
|---|---|
| `services/web-kpa-society/src/lib/notificationRouting.ts` (신규) | `resolveNotificationTarget` SSOT |
| `services/web-kpa-society/src/components/MobileBottomNav.tsx` | 알림 badge + 알림 bottom-sheet, openSheet 단일 상태 |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | handleNotificationClick → resolveNotificationTarget 사용 |
| `services/web-kpa-society/src/components/admin/AdminLayout.tsx` | MobileBottomNav + 하단 여백 |
| `services/web-kpa-society/src/components/instructor/InstructorLayout.tsx` | 동상 |
| `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | 동상 (shell 래핑) |
| `services/web-kpa-society/src/App.tsx` (KpaStoreLayoutWrapper) | 동상 |

## 5. 정적 검증

- `web-kpa-society` `tsc --noEmit` **exit 0**, production build(`tsc && vite build`) **성공**
- shared package 변경 0 → 타 서비스 회귀 없음(§13 대상 아님)

## 6. 배포

- commit `fdf5b3e95` push → CI "Deploy Web Services (Cloud Run)" **success**, 번들 `index-B17HMVIk.js` 반영

## 7. 운영 smoke (프로덕션, admin+operator+store_owner 다중역할 계정)

| 항목 | route / 뷰포트 | 결과 |
|---|---|---|
| 하단 nav 렌더(알림/내정보) | `/admin` 390px | **PASS** (이전 부재 → 복원, count=1) |
| 하단 nav 렌더 | `/operator` 390px | **PASS** (count=1, 4탭) |
| 하단 nav 렌더 | `/store` 390px | **PASS** (count=1, height 51px, 하단 고정) |
| 알림 시트 open + 실제 목록(동일 source) | `/admin`·`/store` 390px | **PASS** (가입신청/상담요청/문의 목록) |
| 알림 항목 클릭 → 라우팅 + markAsRead + 닫힘 | `/store` 390px | **PASS** (상담요청 → `/store/requests`, 시트 닫힘) |
| 중복 없음(하단 nav 1개, 알림 상·하단 동시 X) | 모든 route | **PASS** |
| 데스크톱 하단 nav 숨김 + 상단 utility 유지 | `/store` 1280px | **PASS** (`display:none`, 사용자 메뉴 표시) |

- `/instructor` 는 검증 계정에 `lms:instructor` 역할이 없어 라이브 미검증 — admin/operator/store 와 **동일 패턴**으로 코드상 커버(동일 컴포넌트·스페이서).
- 콘솔: 로그인 전 401·미게시 법정문서 404 등 무관 항목만. 관련 오류 0. (일부 알림 본문 mojibake 는 기존 데이터 인코딩 이슈, 본 변경 무관.)

## 8. 보존

- route / 권한 판정 / API / DB / 역할 데이터 / 알림 backend 변경 0
- 공용 `GlobalHeader` 등 shared package 변경 0
- 사이트 nav 항목·데스크톱 상단 utility(벨·프로필)·모바일 store 업무 drawer·admin sidebar drawer 무변경

## 9. Git

- code commit `fdf5b3e95` (7 files, path-scoped) → push `cee82e9b4..fdf5b3e95`
- CHECK commit: 본 문서
- HEAD == origin/main. 동시 세션 `pnpm-lock.yaml` 무접촉.

## 10. 상태

구현·정적검증·배포·운영 smoke 완료. **DONE**.
