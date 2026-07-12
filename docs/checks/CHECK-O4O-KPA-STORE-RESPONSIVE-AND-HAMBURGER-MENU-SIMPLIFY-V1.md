# CHECK-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1

> 목적: KPA-Society 두 화면의 좁은 화면 UX 정리.
> ① `/store`(내 약국 홈) KPI를 모바일에서 1열이 아니라 **2열×2행**으로 조밀하게, 이중 padding 제거.
> ② 홈(`/`) 모바일 햄버거에서 **역할별 대시보드를 걷어내고** 서비스 메뉴 + 계정 메뉴만 노출.
>
> 기능·route·권한·API·DB 무변경. 모바일 노출만 단순화(데스크톱은 기존 유지).
> Work Order: `WO-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1`

---

## 1. 실제 원인

### 1-A. `/store` 모바일 1열
- **KPI grid 기본값**: `StoreHomePage.tsx`가 KPA 템플릿 `tpl.layout.grid`(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)를 사용 → 640px(sm) 미만은 무조건 1열. 360/390/430px 모두 카드가 세로로 한 개씩 쌓임.
- **이중 padding**: 상위 `StoreDashboardLayout`의 `<main className="p-4 md:p-6">` + 페이지 내부 `max-w-[960px] p-6` 가 겹쳐 모바일 좌우 공간이 과도하게 축소.

### 1-B. 햄버거 역할 대시보드 노출
- 공용 `GlobalHeader.tsx`가 단일 `userMenuItems` 노드를 **데스크톱 드롭다운**과 **모바일 햄버거** 양쪽에 동일하게 렌더.
- KPA `KpaGlobalHeader.tsx`의 `userMenuItems`에 역할별 항목(강의/관리자/운영 대시보드, 내 매장)이 포함 → 데스크톱용 역할 메뉴가 모바일 햄버거에도 그대로 노출.

---

## 2. 변경 파일 (3개)

| 파일 | 변경 목적 |
|---|---|
| `packages/ui/src/layout/GlobalHeader.tsx` | additive optional prop `mobileUserMenuItems` 추가. 모바일 햄버거는 `mobileUserMenuItems ?? userMenuItems`, 데스크톱 드롭다운은 `userMenuItems` 유지. 미주입 소비처는 기존 동작 불변(opt-in). |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | `mobileUserMenuItems`에 개인 계정 메뉴(마이페이지/설정)만 주입. 역할 대시보드는 `userMenuItems`(데스크톱)에만 유지. |
| `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx` | KPI grid를 service-local `grid-cols-2 lg:grid-cols-4`로 명시, 이중 padding(p-6) 제거, 카드 compact(`p-3 sm:p-5`, `text-xl sm:text-2xl`, `text-[11px] sm:text-xs`, `h-full`), 헤더 반응형 + 새로고침 `aria-label`, `useTemplate`/`tpl` 의존 제거. |

**Commit:** `f0ccc4f420a83a0dca4ff03769438776b7ddcc2a` — `fix(kpa): improve store responsive layout and simplify mobile menu`

---

## 3. 변경 내용 요약

### GlobalHeader (공용, additive)
```tsx
mobileUserMenuItems?: React.ReactNode;   // 신규 optional
// 모바일 햄버거 렌더:
{mobileUserMenuItems ?? userMenuItems}   // 미주입 시 기존 fallback
// 데스크톱 드롭다운: userMenuItems (무변경)
```

### KpaGlobalHeader
- `userMenuItems`(데스크톱): 강의(isInstructor)/관리자(isAdmin)/운영(isOperator)/내 매장(isStoreOwner) + 마이페이지/설정 — **무변경**.
- `mobileUserMenuItems`(모바일 신규): 마이페이지 + 설정만. (이름·이메일·로그아웃은 GlobalHeader 기본 렌더.)

### StoreHomePage
- `grid ${tpl?.layout?.grid ...}` → `grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3`.
- 3개 상태(정상/로딩/매장 미연결) 모두 `max-w-[960px] p-6` → `max-w-[960px]`(이중 padding 제거).
- 카드 `p-5` → `p-3 sm:p-5` + `h-full`, 숫자 `text-2xl` → `text-xl sm:text-2xl`, 레이블 `text-xs` → `text-[11px] sm:text-xs`.
- 헤더 반응형(`gap-2 mb-4 sm:mb-6`, 제목 `text-lg sm:text-xl`), 새로고침 버튼 `aria-label="새로고침"` + `shrink-0`.
- `useTemplate` import/호출 제거(unused 없음).

---

## 4. 보존 사항 (금지선 준수)

| 항목 | 상태 |
|---|---|
| 상단 서비스 메뉴 `내 약국`(/store) | ✅ 유지 (명칭·route 무변경) |
| 상단 서비스 메뉴 `약국 운영 허브`(/store-hub) | ✅ 유지 |
| 데스크톱 프로필 드롭다운 역할 메뉴 | ✅ 유지 (관리자·운영 대시보드·내 매장) |
| route 삭제 | 0 |
| 권한/RBAC 변경 | 0 |
| API 변경 | 0 |
| DB 변경 | 0 |
| KPI 데이터 계산·링크 | 무변경 (자료실 파일 링크 `/store/library/contents` 등 유지) |
| `내 약국` → `내 약국 관리` 개명 | 하지 않음 |

---

## 5. 정적 검증 (CI)

- `Deploy Web Services (Cloud Run)` run `29180396428` — `detect-changes`/`deploy-glycopharm`/`deploy-k-cosmetics`/`deploy-kpa-society`/`deploy-neture` **전부 success**.
- 공용 `@o4o/ui` 변경이므로 4개 web 서비스 전부 재빌드 → **KPA 외 서비스(GlycoPharm/K-Cosmetics/Neture) 빌드 성공**으로 additive prop의 backward-compat/타입 무결성 live 확인.
- `Deploy Admin Dashboard` `29180396429`, `Deploy API Server` `29180396422` — success.

| 항목 | 결과 |
|---|---|
| kpa-society-web 배포 | ✅ success |
| @o4o/ui 소비 4서비스 배포 | ✅ 전부 success |
| KPA 외 서비스 breaking change | 0 |

---

## 6. 배포

| 항목 | 값 |
|---|---|
| commit | `f0ccc4f42` |
| push | 완료 (origin/main 포함) |
| workflow | Deploy Web Services (Cloud Run) |
| run ID | `29180396428` |
| kpa-society-web live revision | `kpa-society-web-01597-9nf` |

---

## 7. 운영 브라우저 smoke (2026-07-12, prod)

계정: `sohae2100@gmail.com` (KPA admin+operator — 역할 대시보드 최대 노출로 hiding 검증 강화). Playwright.

### 7-A. `/store` KPI 반응형 — grid 실측 (getComputedStyle + BoundingRect)

| viewport | gridTemplateColumns | 배치 | 가로 스크롤 |
|---|---|---|---|
| 320px | `131.5px 131.5px` | 2열 × 2행 | 없음 (scrollW 305) |
| 390px | `166.5px 166.5px` | 2열 × 2행 (카드 h=101 균일) | 없음 (scrollW 375) |
| 768px | `346.5px 346.5px` | 2열 × 2행 | 없음 |
| 1280px | `231px ×4` | **4열 × 1행** | 없음 |

- 새로고침 버튼 `aria-label="새로고침"` DOM 확인 ✅.
- 헤더 제목("내 약국 홈") + 새로고침 버튼 한 행 compact, KPI(자료실 파일/활성 QR/진열 상품/이번주 스캔) 2×2, 이후 홍보 성과 요약/최근 활동/실행 흐름 정상 렌더(스크린샷 확인).
- KPI 수치 렌더 정상(계정 count=0 → "0" 표기, `–` 아님), 자료실 파일 카드 링크(`<a>`) 유지.

### 7-B. `/` 햄버거 메뉴 (390px)

**데스크톱 드롭다운(1280px)** — 역할 메뉴 유지 확인:
```
관리자 대시보드 / 운영 대시보드 / 내 매장 / 마이페이지 / 설정 / 로그아웃
```

**모바일 햄버거(390px)** — 실제 노출:
```
[서비스 메뉴]  커뮤니티 / 내 약국(/store) / 약국 운영 허브(/store-hub) / 서비스 안내 / About
[사용자]       서철환님 / sohae2100@gmail.com / 마이페이지 / 설정 / 로그아웃
```
- 역할 대시보드(관리자 대시보드 / 운영 대시보드 / 내 매장) **모바일에서 미노출** ✅.
- 햄버거 열기/닫기(메뉴 열기·메뉴 닫기), 서비스 메뉴 route 정상, `내 약국` 명칭 유지 ✅.

### 변경 전/후 (모바일 햄버거 사용자 영역)
```
변경 전: 관리자 대시보드 / 운영 대시보드 / 내 매장 / 마이페이지 / 설정 / 로그아웃
변경 후: 마이페이지 / 설정 / 로그아웃  (+ 이름·이메일)
```

---

## 8. 동시 작업 보호

- 작업 중 활성 repo(`C:\Users\sohae\coding\o4o-platform`)에 이번 작업과 무관한 uncommitted 변경 존재:
  `apps/api-server/.../product-landing.service.ts`, `.../product-landing.auth-gate.test.ts`, `services/web-neture/.../ProductLandingPage.tsx`.
- 위 3건은 **본 작업에서 미접촉** — stage/stash/reset/revert 미사용. KPA 커밋(`f0ccc4f42`)은 KPA 3파일만 포함.
- 브라우저 smoke 진행 중 **다른 세션이 위 변경을 별도 커밋**(`37f7f83e4 feat(neture): auto supplier credit ...`) → 정상적인 병행 작업. 본 작업은 해당 커밋에 관여하지 않음.

---

## 9. 결론

- `/store` KPI: 모바일(320~768) 2열×2행 / 데스크톱(≥1024) 4열×1행, 가로 스크롤 0, 이중 padding 제거 — **PASS**.
- 홈 모바일 햄버거: 서비스 메뉴 + 계정 메뉴만, 역할 대시보드 제거, 데스크톱 역할 메뉴 유지 — **PASS**.
- 보존선(내 약국 명칭 / 약국 운영 허브 / route / 권한 / API / DB / 데스크톱 역할 메뉴 / KPA 외 서비스) 전부 준수.

*작성: 2026-07-12 · Status: 완료*
