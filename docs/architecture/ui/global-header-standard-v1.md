# O4O Global Header / Layout / Navigation Standard v1.0

> **작성일**: 2026-04-17
> **근거**: IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1
> **상태**: Active Standard
> **범위**: kpa-society, glycopharm, neture, k-cosmetics 및 향후 신규 서비스 전체
> **원칙**: 이 문서는 표준 정의만 포함한다. 구현 코드, 컴포넌트 API, props 설계는 포함하지 않는다.

---

## 1. 문서 목적

O4O 플랫폼의 모든 서비스가 따라야 할 **Global Header / Layout / Navigation 표준 원칙**을 정의한다.

이 문서가 해결하는 문제:

- Main/Public Header에 대한 플랫폼 공통 컴포넌트가 존재하지 않는다
- 4개 서비스 모두 독립적으로 Header를 구현하고 있다
- Navigation 메뉴가 각 서비스/파일에 하드코딩으로 분산되어 있다
- 스타일링 방식이 서비스별로 다르다 (inline style vs Tailwind)
- 역할에 따라 완전히 다른 사이트처럼 보이는 경우가 있다

이 문서가 하지 않는 것:

- 구체적 컴포넌트 API 정의
- props/interface 설계
- 구현 일정 확정
- 기존 코드의 즉각적 변경 요구

---

## 2. 조사 결과 요약

IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1 (2026-04-17) 핵심 수치:

| 항목 | 수치 |
|------|------|
| 조사 대상 서비스 | 4개 (kpa-society, glycopharm, neture, k-cosmetics) |
| Layout 파일 총 수 | 26개+ |
| Header 파일 총 수 | 8개+ |
| Main/Public Header 공유 컴포넌트 | **없음** |
| Operator Shell 공유 | 있음 (`@o4o/ui` OperatorShell, 4개 서비스) |
| Store Shell 공유 | 있음 (`@o4o/store-ui-core` StoreDashboardLayout, 3개 서비스) |
| Admin Header 공유 | **없음** |
| 메뉴 중앙 관리 시스템 | **없음** (전체 서비스 하드코딩) |

식별된 문제 유형:

| 유형 | 설명 | 해당 서비스 |
|------|------|-------------|
| TYPE A | Header 서비스별 완전 분리 | 전체 4개 |
| TYPE B | 역할별 Header 분리 | kpa, glycopharm |
| TYPE C | Layout 구조 중복 | kpa, neture |
| TYPE D | Navigation 하드코딩 분산 | 전체 4개 |
| TYPE E | 공유 컴포넌트 미활용 | neture (Store) |

---

## 3. 왜 공통 표준이 필요한가

### 3.1 사용자 경험 일관성

같은 플랫폼의 서비스들은, 화면이 달라도 **같은 플랫폼 위에 있다는 느낌**을 줘야 한다.
현재는 서비스를 전환하면 Header 구조, 높이, 정렬, 사용자 메뉴 위치가 모두 달라져서 별도 사이트처럼 느껴진다.

### 3.2 역할 전환의 자연스러움

operator, store owner, admin은 **같은 서비스 내에서 하는 다른 일**이다.
현재는 역할이 바뀌면 Header 자체가 사라지거나 완전히 다른 구조로 교체되어, 사용자가 같은 서비스 안에 있다는 인식을 잃는다.

### 3.3 유지보수 효율

4개 서비스 × 서비스당 평균 2~3개 Header = 8~12개의 독립된 Header 코드가 존재한다.
동일한 기능(로그인 버튼, ServiceSwitcher, 사용자 드롭다운)이 각각 별도로 구현되어 있어 변경 비용이 선형적으로 증가한다.

### 3.4 신규 서비스 온보딩

새 서비스가 추가될 때 기존 서비스의 Header를 복사해서 시작해야 한다.
표준이 없으면 복사본이 또다시 독립적으로 분기된다.

---

## 4. Global Header 표준 원칙

### 4.1 표준화 목표

1. 같은 서비스 안에서는 화면이 달라도 **같은 사이트**처럼 느껴져야 한다
2. Main/Public Header는 서비스별 독립 구현이 아니라 **플랫폼 공통 체계** 아래 있어야 한다
3. 역할별(operator/store/admin)은 "다른 사이트"가 아니라 **같은 서비스 내 컨텍스트**로 표현해야 한다
4. 신규 서비스 추가 시에도 **동일 표준을 재사용**할 수 있어야 한다
5. 기존에 잘 작동하는 공유 자산(OperatorShell, StoreDashboardLayout)과 **충돌하지 않아야** 한다

### 4.2 표준 구조

```
GlobalLayout
 ├── GlobalHeader
 │    ├── BrandSlot
 │    ├── PrimaryNav
 │    ├── UtilityArea
 │    └── UserArea
 ├── ContextBar (optional)
 ├── WorkspaceShell (optional)
 └── PageContent
```

### 4.3 각 슬롯의 책임

#### BrandSlot

| 항목 | 설명 |
|------|------|
| 역할 | 현재 서비스의 브랜드 아이덴티티 표시 |
| 포함 요소 | 서비스 로고 아이콘, 서비스명, (선택) 서브타이틀 |
| 서비스별 차이 | 허용 — 아이콘, 색상, 서비스명은 서비스마다 다를 수 있음 |
| 구조 차이 | 비허용 — 위치, 크기 비율, 배치 순서는 동일해야 함 |

#### PrimaryNav

| 항목 | 설명 |
|------|------|
| 역할 | 서비스의 핵심 이동축 |
| 포함 요소 | 서비스별 주요 진입 메뉴 (공개 메뉴 중심) |
| 서비스별 차이 | 허용 — 메뉴 항목은 서비스마다 다를 수 있음 |
| 구조 차이 | 비허용 — 표현 형태(수평 탭/링크), 위치, 간격은 동일해야 함 |
| 제약 | 역할 전용 메뉴를 공개 메뉴와 무분별하게 섞지 않음 |

#### UtilityArea

| 항목 | 설명 |
|------|------|
| 역할 | 서비스 횡단 기능 제공 |
| 포함 요소 | ServiceSwitcher, (선택) 검색, 알림, 도움말 |
| 서비스별 차이 | 최소한 — ServiceSwitcher는 동일 컴포넌트/동일 위치 |
| 구조 차이 | 비허용 — 위치, 순서 고정 |

#### UserArea

| 항목 | 설명 |
|------|------|
| 역할 | 사용자 인증 상태 및 계정 관리 |
| 포함 요소 | 비인증: 로그인/회원가입 버튼. 인증: 사용자 아바타, 드롭다운(이름, 이메일, 역할, 대시보드, 마이페이지, 로그아웃) |
| 서비스별 차이 | 최소한 — 아바타 gradient 색상 정도만 허용 |
| 구조 차이 | 비허용 — 드롭다운 항목, 순서, 위치 통일 |

---

## 5. Layout 계층 구조 원칙

### 5.1 3-Layer 모델

모든 서비스의 Layout은 아래 3개 층위로 구분한다.

#### Layer A: Global Layer

**모든 서비스 공통 상단 구조.**

- GlobalHeader가 위치하는 계층
- 서비스와 무관하게 동일한 구조
- BrandSlot만 서비스별 주입, 나머지는 공통

해당하는 현재 컴포넌트:
- kpa: `Header.tsx` (Main)
- glycopharm: `Header.tsx`
- neture: `NetureLayout` / `MainLayout` 내장 Header
- k-cosmetics: `Header.tsx`

→ 이들은 모두 **같은 계층의 같은 역할**을 수행하고 있으며, 하나의 공통 표준으로 통합 가능하다.

#### Layer B: Context Layer

**현재 서비스/역할/업무 상태를 보조적으로 표현하는 계층.**

- Global Header 아래에 위치하거나, Header 내부에 Badge/Indicator로 표현
- 역할 상태를 사용자에게 시각적으로 전달
- Header 자체를 교체하지 않고 "현재 맥락"을 덧입히는 역할

표현 가능한 컨텍스트:
- 운영자 모드 (Operator)
- 내 매장 (Store)
- 파트너 영역 (Partner)
- 공급자 영역 (Supplier)
- HUB 영역

Context 표현 방법 (허용):
- ContextBar (Header 아래 보조 바)
- Context Badge (Header 내 뱃지/라벨)
- Breadcrumb
- Sidebar 타이틀 영역

Context 표현 방법 (비허용):
- Header 자체를 완전히 다른 컴포넌트로 교체
- Layout 전체를 역할별로 분리하여 Global Header가 사라지게 하는 것

#### Layer C: Workspace Layer

**페이지 본문 또는 좌측 사이드바 중심 업무 영역.**

- 실제 작업이 일어나는 콘텐츠 영역
- Sidebar, 대시보드 패널, 메인 콘텐츠 등

해당하는 기존 자산:
- Operator Sidebar (OperatorShell → 11-Capability Group)
- Store Sidebar (StoreDashboardLayout → StoreSidebar)
- Hub Sidebar (PharmacyHubLayout, GlycoPharmHubLayout)
- Admin Sidebar (AdminLayout, DashboardLayout)

→ Workspace Layer는 서비스/역할마다 다를 수 있으며, 이 계층의 다양성은 **정상**이다.

### 5.2 계층 조합 원칙

```
                ┌──────────────────────────────────────┐
  Layer A       │         GlobalHeader (공통)           │
                │  Brand │ PrimaryNav │ Utility │ User  │
                └──────────────────────────────────────┘
                ┌──────────────────────────────────────┐
  Layer B       │      ContextBar (선택, 역할 표시)      │
  (optional)    │      "운영자 모드" / "내 약국" 등       │
                └──────────────────────────────────────┘
                ┌────────┬─────────────────────────────┐
  Layer C       │Sidebar │       PageContent            │
  (varies)      │(varies)│       (varies)               │
                └────────┴─────────────────────────────┘
```

핵심: **Layer A (GlobalHeader)는 항상 존재하고 공통이다.** 차이는 Layer B와 Layer C에서 처리한다.

### 5.3 기존 공유 자산과의 관계

| 기존 자산 | Layer 위치 | 표준과의 관계 |
|-----------|-----------|---------------|
| OperatorShell (`@o4o/ui`) | Layer B + C | 유지. OperatorShell은 Context(Operator 모드) + Workspace(Sidebar+Content)를 함께 제공하는 복합 Shell. GlobalHeader 표준과 충돌하지 않음 |
| StoreDashboardLayout (`@o4o/store-ui-core`) | Layer B + C | 유지. Store Owner Context + Workspace를 함께 제공. GlobalHeader 표준과 충돌하지 않음 |
| ServiceSwitcher | Layer A (UtilityArea) | 통합 대상. 현재 각 서비스에서 독립적으로 import하여 사용 중이나, 위치와 스타일은 표준화되어야 함 |

장기 방향:
- Main/Public + Operator + Store가 **하나의 Layout 철학** 아래 정렬
- OperatorShell과 StoreDashboardLayout은 Layer B+C의 표준 Shell로 유지
- GlobalHeader(Layer A)는 이 Shell들 위에 일관되게 존재

---

## 6. Navigation 관리 원칙

### 6.1 현재 문제

모든 서비스의 메뉴가 각 Header/Layout 파일 내부에 상수 배열로 하드코딩되어 있다.

- kpa: 4곳 분산 (`menuItems`, `demoMenuItems`, `KPA_STORE_NAV_ITEMS`, `HUB_MENU_ITEMS`)
- glycopharm: 2곳 분산 (`publicMenuItems`+`pharmacyMenuItems`, `roleConfig`)
- neture: 2곳 분산 (NetureLayout 내 nav, MainLayout 내 nav)
- k-cosmetics: 1곳 (Header.tsx 내 nav)
- **중앙화된 메뉴 설정 시스템이 없음**

### 6.2 표준 원칙

1. **Navigation은 Header 내부 하드코딩이 아니라 중앙 관리형 설정을 지향한다**
2. **서비스별 메뉴는 config 또는 manifest 구조로 관리한다**
3. **노출 조건은 role / capability / feature flag 기준으로 처리한다**
4. **공개 메뉴와 조건부 메뉴를 같은 계층에서 무분별하게 뒤섞지 않는다**

### 6.3 메뉴 계층 구조

서비스의 Navigation은 다음 계층으로 분리한다:

```
serviceNavigation
 ├── publicNav        — 모든 사용자에게 노출되는 메뉴
 ├── contextualNav    — 인증/역할 조건에 따라 노출되는 메뉴
 ├── utilityNav       — 서비스 횡단 기능 (ServiceSwitcher 등)
 └── userMenu         — 사용자 계정 관련 메뉴
```

#### publicNav

- 비인증 사용자도 볼 수 있는 메뉴
- 서비스의 주요 콘텐츠 진입점
- 예: 홈, 커뮤니티, 포럼, 강의, 허브

#### contextualNav

- 인증 상태, 역할, 권한에 따라 조건부 노출
- 노출 조건은 명시적으로 선언 (role 목록, capability 이름 등)
- 예: 내 약국(약사 역할), 매장 관리(store owner 역할), 운영 대시보드(operator 역할)

#### utilityNav

- ServiceSwitcher, 알림, 검색 등 서비스 횡단 기능
- 인증 상태에 따라 일부 항목만 노출

#### userMenu

- 드롭다운 형태의 사용자 계정 메뉴
- 대시보드, 마이페이지, 로그아웃 등
- 인증 시에만 표시

### 6.4 메뉴 정의 위치 원칙

| 대상 | 정의 위치 | 비고 |
|------|-----------|------|
| 서비스별 publicNav / contextualNav | 서비스 config 파일 (1곳) | Header 내부가 아닌 별도 config |
| utilityNav 항목 | 공통 패키지 또는 공통 config | ServiceSwitcher 등 |
| userMenu 항목 | 공통 패키지 또는 공통 config | 모든 서비스 동일 |
| Operator Sidebar 메뉴 | 서비스 `operatorMenuGroups.ts` (기존 유지) | OperatorShell에 전달 |
| Store Sidebar 메뉴 | `@o4o/store-ui-core` config (기존 유지) | StoreDashboardLayout에 전달 |

---

## 7. 역할 기반 UI 처리 원칙

### 7.1 핵심 원칙

1. **operator/store/admin은 기본적으로 GlobalHeader를 바꾸지 않는다**
2. **역할 상태는 ContextBar, Badge, Sidebar, Quick Actions로 표현한다**
3. **같은 서비스 안에서 Header 자체가 별도 사이트처럼 갈라지지 않는다**
4. **예외적으로 완전 분리된 백오피스가 필요할 경우에만 별도 Shell을 허용한다**

### 7.2 역할별 UI 표현 방식

| 역할/컨텍스트 | GlobalHeader 변경 | Context 표현 | Workspace 변경 |
|-------------|:-----------------:|:----------:|:--------------:|
| 일반 사용자 (공개) | 없음 | 없음 | 없음 |
| 인증된 사용자 | 없음 (UserArea만 인증 상태 반영) | 없음 | 없음 |
| Store Owner | 없음 | ContextBar 또는 Badge ("내 매장") | Store Sidebar 표시 |
| Operator | 없음 | ContextBar 또는 Badge ("운영") | Operator Sidebar 표시 |
| Admin | 없음 | ContextBar 또는 Badge ("관리") | Admin Sidebar 표시 |
| Supplier/Partner | 없음 | ContextBar 또는 Badge | Space Sidebar 표시 |

### 7.3 현재 위반 사례와 표준 방향

| 현재 상태 | 문제 | 표준 방향 |
|-----------|------|-----------|
| kpa: Admin 진입 시 Header 완전 소멸, AdminSidebar만 표시 | 같은 서비스인지 인식 불가 | GlobalHeader 유지 + Admin Sidebar 표시 |
| kpa: Operator 진입 시 커스텀 renderHeader로 완전 교체 | 브랜드 일관성 약화 | GlobalHeader 유지 + Operator Context 표현 |
| glycopharm: Admin 진입 시 DashboardLayout 이중 헤더 | 공개 페이지와 완전히 다른 경험 | GlobalHeader 유지 + Admin Context 표현 |
| neture: 역할별로 완전히 다른 Layout (Supplier/Partner 등) | 동일 서비스 내 분절 | GlobalHeader 공통 + Space별 Workspace 분리 |

### 7.4 별도 Shell 허용 기준

다음 조건을 **모두** 만족하는 경우에만 GlobalHeader 없이 독립 Shell을 허용한다:

1. 해당 영역이 일반 사용자와 **완전히 분리된 백오피스**이다
2. 사용자가 해당 영역에 진입할 때 **명시적 컨텍스트 전환**을 인지한다 (예: "운영 대시보드로 이동")
3. 해당 영역에서 **공개 페이지로의 자연스러운 이동이 필요하지 않다**
4. 기존 공유 Shell (OperatorShell, StoreDashboardLayout) 중 하나를 사용한다

→ 현재 OperatorShell과 StoreDashboardLayout은 이 기준에 부합하므로 **유지한다**.
→ 다만, 장기적으로 이 Shell들도 GlobalHeader와 연결성을 강화하는 방향을 지향한다.

---

## 8. 스타일링 원칙

### 8.1 현재 상태

| 서비스 | 스타일링 방식 | Header 높이 |
|--------|--------------|:-----------:|
| kpa-society | inline style | 70px |
| glycopharm | Tailwind CSS | 64px |
| neture | Tailwind CSS | 64px |
| k-cosmetics | inline style | 64px |

### 8.2 표준 방향

1. **신규 공통 Header/Layout 컴포넌트는 Tailwind CSS 기반을 표준으로 한다**
   - 이유: 기존 4개 서비스 중 2개(glycopharm, neture)가 이미 Tailwind 사용 중
   - 이유: 공유 패키지(`@o4o/ui`, `@o4o/store-ui-core`)가 Tailwind 기반

2. **기존 inline style 서비스(kpa, k-cosmetics)는 즉시 전면 교체하지 않는다**
   - 점진적 이관 대상으로 분류
   - 신규 작성 코드부터 표준 적용

3. **Header 높이는 64px로 통일한다**
   - kpa의 70px는 이관 시 64px로 조정

4. **표준 컴포넌트는 디자인 토큰 기반으로 작성한다**
   - 색상, 간격, 타이포그래피 등 서비스별 차이는 토큰으로 관리
   - 서비스별 커스터마이징은 토큰 주입으로 해결

### 8.3 서비스별 브랜드 토큰 (참고)

| 서비스 | Primary Color | 로고 아이콘 | 서비스명 | 서브타이틀 |
|--------|:------------:|:----------:|:--------:|:---------:|
| kpa-society | `#2563eb` (blue) | 💊 | 대한약사회 | 약사 전문 플랫폼 |
| glycopharm | `#10b981` (green) | Activity (lucide) | GlycoPharm | 혈당 관리 플랫폼 |
| neture | `#059669` (green) | 텍스트 로고 | Neture | B2B 유통 플랫폼 |
| k-cosmetics | `#e91e63` (pink) | 💄 | K-Cosmetics | K-Beauty 전문 플랫폼 |

→ 이 차이는 BrandSlot의 서비스별 주입으로 해결하며, Header 구조 자체를 바꾸는 이유가 아니다.

---

## 9. 서비스별 차등 허용 범위

### 9.1 허용

| 항목 | 설명 |
|------|------|
| 브랜드 색상 | 서비스별 Primary Color 사용 |
| 브랜드 아이콘/로고 | 서비스별 로고 사용 |
| PrimaryNav 항목 | 서비스별 메뉴 항목이 다를 수 있음 |
| ContextBar 문구/배지 | 역할별 컨텍스트 라벨이 다를 수 있음 |
| Workspace Sidebar | 역할별/서비스별 사이드바 구성이 다를 수 있음 |
| Footer 콘텐츠 | 서비스별 하단 정보가 다를 수 있음 |

### 9.2 비허용

| 항목 | 설명 |
|------|------|
| Header 구조 자체의 변경 | BrandSlot/PrimaryNav/UtilityArea/UserArea 배치 순서와 구조는 고정 |
| 서비스마다 전혀 다른 Header 컴포넌트 | 공통 Header를 사용하고 props로 차이를 주입 |
| operator/store 진입 시 독립 헤더로 전면 교체 | GlobalHeader 유지 + Context/Workspace에서 차이 처리 |
| 메뉴 정의를 각 Header/Layout 파일 내부에 하드코딩 | 중앙 config에서 관리 |
| Header 높이를 서비스별로 임의 변경 | 64px 고정 |
| ServiceSwitcher 위치/스타일 임의 변경 | UtilityArea 내 고정 위치 |
| UserArea 드롭다운 항목/순서 임의 변경 | 표준 항목 세트 준수 |

---

## 10. 예외 허용 기준

### 10.1 GlobalHeader 표준에서 면제되는 경우

다음 유형의 화면은 GlobalHeader를 포함하지 않아도 된다:

| 예외 유형 | 설명 | 예시 |
|-----------|------|------|
| Kiosk 모드 | 매장 내 전용 디바이스 화면 | `/store/:id/kiosk/*` |
| Tablet 모드 | 매장 내 태블릿 전용 화면 | `/store/:id/tablet/*`, `/tablet/:slug` |
| Fullscreen Signage | 디지털 사이니지 전용 화면 | signage display pages |
| Embedded Display | 외부 임베드용 화면 | iframe 등 |
| 소비자 Storefront (몰입형) | 단일 매장 전면 표시 화면 | `/store/:slug` (소비자 진입) |
| 인쇄/PDF 출력 | 인쇄 전용 레이아웃 | 주문서, 영수증 등 |

### 10.2 예외 등록 원칙

- 위 목록에 해당하지 않는 새로운 예외는 **명시적 WO 승인**이 필요하다
- "편의상" 또는 "디자인이 다르니까"는 예외 사유가 아니다
- 예외 화면이라도 **서비스로 돌아가는 경로**는 반드시 제공해야 한다

---

## 11. 적용 우선순위

> 이 섹션은 구현 지시가 아니라 **표준 적용의 권장 순서**다.

### Phase 1: Main/Public Header 표준 컴포넌트 정의 및 구축

- 공통 패키지(`@o4o/ui` 또는 신규)에 GlobalHeader 컴포넌트 설계
- BrandSlot, PrimaryNav, UtilityArea, UserArea 슬롯 구조 확정
- Navigation config 구조 정의

### Phase 2: 파일럿 적용 — KPA Society

- 가장 복잡한 서비스에 먼저 적용하여 표준의 충분성을 검증
- Layout 구조 정리 (Layout + DemoLayout 통합 등)
- 6개 Header 계열 → GlobalHeader + Context 체계로 정리

### Phase 3: GlycoPharm 적용

- 이미 Tailwind 기반이므로 스타일 전환 부담 적음
- DashboardLayout 이중 헤더 → GlobalHeader + Context + Workspace로 분리

### Phase 4: Neture 적용

- NetureLayout + MainLayout 이중 브랜드 문제 해결
- Supplier/Partner Space의 GlobalHeader 연결

### Phase 5: K-Cosmetics 적용

- 가장 단순한 구조이므로 적용 부담 최소
- inline style → Tailwind 이관 병행

### Phase 6: 신규 서비스 강제 적용

- 이 시점 이후 생성되는 모든 서비스는 GlobalHeader 표준을 필수 적용
- 독립 Header 구현을 코드 리뷰에서 거부

---

## 12. 결론

### 핵심 원칙 요약

| # | 원칙 | 근거 |
|---|------|------|
| 1 | **Main/Public Header는 플랫폼 공통 컴포넌트로 존재해야 한다** | TYPE A — 4개 서비스 모두 독립 구현 중 |
| 2 | **Layout은 Global / Context / Workspace 3-Layer로 구분한다** | TYPE B, C — 역할별 Header 교체 및 Layout 중복 해소 |
| 3 | **GlobalHeader는 역할이 바뀌어도 유지된다** | TYPE B — operator/store/admin 진입 시 Header 소멸 방지 |
| 4 | **Navigation은 중앙 config에서 관리한다** | TYPE D — 4개 서비스 전체 하드코딩 분산 해소 |
| 5 | **서비스별 차이는 BrandSlot과 PrimaryNav 항목으로 표현한다** | 브랜드 아이덴티티 유지하면서 구조 통일 |
| 6 | **역할 상태는 ContextBar/Badge/Sidebar로 표현한다** | Header 자체를 교체하지 않는 원칙 |
| 7 | **스타일링은 Tailwind 기반을 표준으로 한다** | glycopharm/neture 및 공유 패키지 기존 방식 계승 |
| 8 | **Header 높이는 64px로 통일한다** | 3개 서비스 64px, 1개 70px → 64px 통일 |
| 9 | **기존 OperatorShell / StoreDashboardLayout은 유지한다** | 이미 검증된 공유 자산, 충돌 없이 공존 |
| 10 | **Kiosk/Tablet/Signage 등 전용 화면만 예외로 허용한다** | 명확한 예외 기준으로 표준 회피 방지 |

### 이 문서의 위치

- IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1 → **본 문서 (표준 정의)** → WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1 (구현)
- 본 문서는 구현의 **필수 선행 조건**이다
- 구현 WO는 본 문서의 원칙을 벗어나지 않아야 한다

---

*작성: WO-O4O-GLOBAL-HEADER-STANDARD-V1*
*근거: IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1 (2026-04-17)*
*다음 단계: WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1 (구현)*
