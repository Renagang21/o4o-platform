# WO-O4O-KCOS-GLYCOPHARM-MOBILE-BOTTOM-NAV-COMMONIZATION-G2-V1

- **작성일**: 2026-08-11
- **선행**: [`CHECK-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1`](../checks/CHECK-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1.md) §8 G2 · G1 (`CHECK-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1`) PASS 종료
- **성격**: 구현 WO (조사 → 최소 구현 → 검증 → CHECK → commit → push)
- **대상 서비스**: **K-Cosmetics · GlycoPharm 2개만**

---

## 1. 목표 · 배경

`services/web-k-cosmetics/src/components/MobileBottomNav.tsx`(161줄)와
`services/web-glycopharm/src/components/MobileBottomNav.tsx`(163줄)는 **사실상 같은 파일**이다.
현행 HEAD 실측 결과 두 파일의 차이는 **아래 4가지뿐**이고 나머지 전 구간이 바이트 동일이다.

| # | 축 | K-Cosmetics | GlycoPharm |
|---|---|---|---|
| 1 | 탭 라벨 | `매장 경영` | `약국 경영` |
| 2 | 이동 경로 | `/mobile/store` | `/mobile/pharmacy` |
| 3 | 활성 판정 함수명 | `isStoreActive` | `isPharmacyActive` (본문 동일) |
| 4 | 강조색 | `#db2777` | `#059669` |

즉 **동작·계약·접근성 속성·safe-area 처리·스타일 상수가 전부 같고, 값 4개만 다르다.**
G1(`getUserDisplayName`)과 같은 성격의 회수 작업이며, 값 차이는 Config 주입으로 처리한다.

목표는 공통화 자체가 아니라 **중복 정의 2 → 1 로 줄여 향후 수정 비용을 낮추는 것**이다.

---

## 2. 승인 범위

### 2-1. Core 로 회수 (공용 패키지)

배치처는 **`packages/ui/src/layout/ServiceBottomNav.tsx` (신규 파일 1개)** 로 한다.

- **신규 패키지를 만들지 않는다.** `@o4o/ui` 는 두 서비스가 이미 `package.json` 에 `workspace:*` 로 의존하고
  `App.tsx` · `GlobalHeader` · `config/navigation.ts` 에서 실제 소비 중이므로 **Dockerfile COPY 변경이 발생하지 않는다.**
- 같은 디렉터리에 `MobileSafeArea` · `ResponsiveTabBar` · `GlobalHeader` 가 있어 계층이 일치한다.
- `packages/ui/src/layout/index.ts` 에 `export * from './ServiceBottomNav';` 1줄 추가.

Core 가 책임지는 것:

1. 하단 메뉴 렌더링 셸 (`<nav>` + `NAV_CLASS` + `navSafeArea`)
2. 활성 메뉴 판정 (아래 2-3 계약 그대로)
3. **로그인 상태에 따른 분기** (비로그인 = 커뮤니티 + 로그인 버튼 / 로그인 = 4탭)
4. 모바일 표시·숨김 조건 — `md:hidden` **Tailwind class 로만** 제어
5. 접근성 속성 (`aria-label="모바일 하단 메뉴"`, 탭별 `aria-label`)
6. safe-area 처리 (`paddingBottom: env(safe-area-inset-bottom, 0px)`)
7. 스타일 상수 (`tabStyle` · `labelStyle` · `activeStyle` · `loginStyle` 골격)

### 2-2. 서비스에 남기는 것 (Config 주입)

- 실제 탭 항목과 **순서**
- 라벨 · 아이콘 · 경로
- 브랜드 강조색 (`accentColor`)
- 기본 이동 경로
- 로그인 모달 열기 동작 (`onLoginClick`) — 각 서비스 `LoginModalContext` 는 별개다
- 인증 상태 (`isAuthenticated`) — 각 서비스 `AuthContext` 는 별개다

**`useAuth` · `useLoginModal` 을 Core 가 직접 import 하지 않는다.** 반드시 props 주입으로 받는다.

### 2-3. 반드시 보존해야 하는 현행 동작 (변경 금지)

공통화는 **동작 보존 리팩터가 아니라 중복 회수**다. 아래는 결함으로 보여도 **이번에 고치지 않는다.**

1. `/store` 활성 판정의 소비자 경로 제외 정규식 — `afterStore` 가 **숫자로 시작(`/^\d/`)** 하면 비활성.
   GlycoPharm 주석은 "숫자 또는 UUID" 라고 적혀 있으나 **실제 코드는 숫자만 본다.** 코드 동작을 기준으로 보존한다.
2. `isCommunity` 판정 대상 5경로 (`/`, `/forum`, `/lms`, `/resources`, `/content`).
3. **알림 탭은 `/mypage` 로 이동하며, `isNotif` 는 `pathname.includes('notif')` 를 요구해 현재 구조상 참이 될 수 없다**
   (= 알림 탭이 활성 표시되지 않는다). 두 서비스 모두 같다. **본 WO 에서 고치지 않고 CHECK 에 관찰로 기록한다.**
4. `handleStoreTab` 은 이미 활성일 때 navigate 하지 않는다.
5. 비활성 `strokeWidth` 1.75 / 활성 2.5, 아이콘 `size=22`, 기본색 `#94a3b8`.

---

## 3. 실행 순서

1. **동기화·조사** — `git status --short` clean 확인. 두 `MobileBottomNav.tsx` 현행 전문을 읽고
   §1 의 4가지 외 차이가 없음을 **직접 재확인**한다. 차이가 더 발견되면 §5 중지 조건을 적용한다.
2. **Core 작성** — `packages/ui/src/layout/ServiceBottomNav.tsx` 신규. props 계약(안):
   - `items: ServiceBottomNavItem[]` — `{ key, label, icon, to?, onClick?, isActive(pathname): boolean }`
   - `isAuthenticated: boolean`
   - `onLoginClick: () => void`
   - `accentColor: string`
   - `guestItems: ServiceBottomNavItem[]` (비로그인 탭)
   - 계약은 구현자가 조정할 수 있으나 **Core 안에 서비스 이름 분기(`if (service === ...)`)가 생기면 안 된다.**
3. `packages/ui/src/layout/index.ts` export 1줄 추가.
4. **K-Cosmetics 전환** — `MobileBottomNav.tsx` 를 Config 주입 형태로 축소. 파일은 유지한다(삭제하지 않는다).
5. **GlycoPharm 전환** — 동일.
6. **검증** (§6) → **CHECK 작성** → **path-specific stage** → commit → push.

착수 순서를 K-Cosmetics 먼저로 두는 이유: 강조색·라벨만 다르고 GlycoPharm 이 그 사본이라 회귀 판단이 쉽다.

---

## 4. 제외 범위

- **KPA-Society · Neture 는 이번 단계에 포함하지 않는다.** KPA(371줄)는 크레딧 등 고유 요소,
  Neture(274줄)는 공급자·파트너 역할 축이 있어 구조가 다르다. G3 에서 확장 가능성을 별도 판단한다.
- **역할별 메뉴 필터를 새로 만들지 않는다.** 현행 두 서비스의 하단 메뉴에는 역할 기반 분기가 **존재하지 않고**
  로그인 여부만 본다. 없는 정책을 이번에 도입하면 신규 구조 추가가 된다. 역할 필터는 **G4** 소관이다.
- `getKpaUserDisplayName` · `getNetureUserDisplayName` alias 제거 — **G3** 소관.
- 루트 Jest ESM 설정 복구 — 별도 기반 정비 소관.
- 헤더 · 사이드바 · MainLayout · operator wrapper — 본 WO 대상 아님.
- 백엔드 · DB · migration · route · 권한 · 디자인 토큰 변경 없음.

---

## 5. 중지 조건

- 현행 두 파일의 차이가 §1 의 4가지를 **초과**하는 것이 확인될 때 (특히 동작 차이)
- Core 계약을 만족시키려면 `@o4o/ui` 안에 **서비스 이름 분기**가 필요해질 때 → 공통화 중단, Local 유지
- `@o4o/ui` 의 기존 export 나 다른 소비처에 **breaking change** 가 필요할 때
- `package.json` · lockfile · Dockerfile · CI 변경이 필요해질 때
- 두 서비스 외 파일 수정이 필요해질 때 / 다른 세션의 dirty·미추적 파일을 건드려야 할 때
- 현재 변경과 무관한 build · test 실패

---

## 6. 검증 · Git

### 검증

| # | 항목 | 기준 |
|---|---|---|
| 1 | `@o4o/ui` build | PASS |
| 2 | K-Cosmetics · GlycoPharm `tsc --noEmit` | PASS |
| 3 | 두 서비스 production build | PASS |
| 4 | 전환 전후 렌더 결과 대조 | 탭 수 · 라벨 · 순서 · 아이콘 · 색 · `aria-label` 불일치 **0건** |
| 5 | 활성 판정 경계 대조 | `/`, `/forum/x`, `/store`, `/store/1`(비활성), `/store/abc`(활성), `/store-hub`, `/mobile/store`(`/mobile/pharmacy`), `/mypage` 최소 8케이스 서비스별 |
| 6 | **실브라우저 모바일 뷰포트** | 비로그인·로그인 각 1회. 하단바 노출, `md` 이상에서 숨김, safe-area 여백, 탭 이동, 로그인 모달 열림 |
| 7 | 전체 build | **불필요** — 변경 패키지·서비스만 |

검증 계정은 `docs/local/TEST-ACCOUNTS.local.md` 를 참조한다. **자격증명을 CHECK·코드·커밋에 기록하지 않는다.**

### Git

- path-specific stage 만 사용한다 (`git add .` 금지).
- 대상 경로: `packages/ui/src/layout/**` · `services/web-k-cosmetics/src/components/MobileBottomNav.tsx` ·
  `services/web-glycopharm/src/components/MobileBottomNav.tsx` · `docs/checks/CHECK-…-G2-V1.md`
- 완료 조건: **본 WO 범위 미커밋 0건 + `HEAD == origin/main`**. 다른 세션의 dirty 파일은 남아 있어도 무방하다.
- 범위가 명확하므로 중지 조건이 아니면 **중간 승인 없이 구현 → 검증 → CHECK → commit → push 까지 완료**한다.

---

## 7. 완료 보고

`CHECK-O4O-KCOS-GLYCOPHARM-MOBILE-BOTTOM-NAV-COMMONIZATION-G2-V1.md` 에 아래를 기록하고 같은 내용을 보고한다.

1. 전환 전후 줄수 — 현행 161 + 163 = **324줄** → Core + 서비스 Config 합계 (감소량 명시)
2. 중복 정의 개수 변화 (2 → 1)
3. **공용 컴포넌트 내 서비스 이름 분기 개수 — 0 이어야 한다**
4. 보존 확인 — §2-3 의 5개 항목 각각 PASS/FAIL
5. 검증 결과 6항목 (실브라우저 관측 포함, 건너뛴 항목은 숨기지 않고 명시)
6. 관찰 기록 — 알림 탭 비활성 문제, GlycoPharm 주석과 코드 불일치(UUID 언급)
7. G3 확장 판단에 필요한 근거 (KPA·Neture 적용 시 예상 장애물)
8. `문서 정합:` 1줄 (발견 N건 / SUPERSEDED N건 / 링크 수정 N건 / 별도 WO 제안 N건)
9. commit hash · push 결과 · Git 상태
