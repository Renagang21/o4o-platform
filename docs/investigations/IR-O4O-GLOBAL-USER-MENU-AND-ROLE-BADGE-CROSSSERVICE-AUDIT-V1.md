# IR-O4O-GLOBAL-USER-MENU-AND-ROLE-BADGE-CROSSSERVICE-AUDIT-V1

> **조사 전용 IR.** 코드·CSS·route·권한·API·DB 무변경.
> 발견 화면: `https://kpa-society.co.kr/admin/kpa-dashboard`
> 작성: 2026-07-12 · Status: 조사 완료 (후속 WO 미착수)

---

## 1. 조사 목적

O4O 각 서비스에서 다음 두 가지 UI 정책이 일관되게 적용되는지 조사한다.

1. **축 A** — `kpa:admin` 같은 내부 역할 코드가 사용자 화면에 그대로 노출되는 문제
2. **축 B** — 사용자 아이콘의 데스크톱 메뉴와 모바일 햄버거의 사용자 메뉴가 서로 다르게 구성되는 문제

두 축은 별개 문제이지만, **둘 다 "KPA-Society에만 존재하는 국지적 편차"** 라는 공통 결론으로 수렴한다.

---

## 2. 발견 현상 (재확인)

| 위치 | 관찰 |
|---|---|
| 관리자 화면 우측 상단 배지 | `kpa:admin` (raw 역할코드 문자열) |
| 데스크톱 사용자 아이콘 드롭다운 | 관리자 대시보드 / 운영 대시보드 / 내 매장 / 마이페이지 / 설정 / 로그아웃 |
| 모바일 햄버거 사용자 영역 | 마이페이지 / 설정 / 로그아웃 |

→ 모바일에서 **관리자 대시보드 · 운영 대시보드 · 내 매장** 이 빠져 있다.

---

## 3. 축 A — 내부 역할 코드 노출

### 3.1 `kpa:admin` 배지의 출처와 목적 (확정)

**하드코딩 리터럴이다. 역할 데이터와 무관하며, 권한 판정에도 사용되지 않는다.**

- 렌더 위치: [`KpaAdminDashboardPage.tsx:104-106`](../../services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx#L104-L106)
  ```tsx
  <span className="ml-auto inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
    kpa:admin
  </span>
  ```
  - 파일 상단 주석(`:14`)에 **"indigo 헤더 + kpa:admin 배지(시각 정체성) 유지"** 로 명시 — 의도적 장식 요소.
  - role 배열을 읽지 않고 항상 문자열 `kpa:admin` 을 고정 출력. 어떤 역할의 사용자가 보든 동일.

- **권한 판정과 완전히 분리됨**: 관리자 접근 제어는 [`AdminAuthGuard.tsx:90-92`](../../services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx#L90-L92) 의 `checkBranchAdminRole()` 이 담당하며, `ROLES.KPA_ADMIN` 상수 + `membershipRole==='admin'` 로 판정한다. 화면의 `kpa:admin` **배지 문자열은 이 로직과 무관**하다.
  → **배지를 제거·변경해도 권한·guard·route에 영향 0.**

- **페이지 제목과 정보 중복**: 같은 헤더 블록에 이미 `관리자 대시보드`(h1) + `KPA-Society 관리자 전용 공간`(부제)이 렌더된다([`:101-103`](../../services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx#L101-L103)). `kpa:admin` 배지는 그 옆에서 같은 정보를 내부 코드 형태로 반복한다.

### 3.2 전 서비스 배지 노출 대조

| 서비스 | admin 대시보드 역할 배지 | 성격 |
|---|---|---|
| **KPA** | `kpa:admin` (하드코딩) | 장식 · guard 무관 · **유일한 raw 코드 배지** |
| **GlycoPharm** | 없음 | `GlycoPharmAdminDashboard` = AdminDashboardLayout, 헤더 role 배지 없음 |
| **K-Cosmetics** | 없음 | `KCosmeticsAdminDashboard` 동일하게 없음 |
| **Neture** | 없음 (한글 문구만) | `AdminDashboardPage:39` — "O4O 플랫폼 관리" 등 한글 라벨만 |

→ **`kpa:admin` raw 코드 배지는 KPA 대시보드에만 있는 예외.** 다른 3개 서비스 대시보드는 이 패턴 자체가 없다.

### 3.3 그 외 raw 역할코드 노출 1건 (범위 참고)

- [`apps/admin-dashboard/src/pages/settings/AdminAccountsSettings.tsx:133-134`](../../apps/admin-dashboard/src/pages/settings/AdminAccountsSettings.tsx#L133-L134) — 관리자 계정 표에서 `a.roles.map(r => <span>{r}</span>)` 로 **역할코드 raw 렌더**(예: `platform:super_admin`, `kpa:admin`). 한글 변환 없음.
  - 단, 이곳은 **플랫폼 내부 관리 콘솔(admin-dashboard 앱)의 계정 관리 표**로, "계정에 부여된 정확한 역할코드"를 개발/운영 관점에서 확인하는 성격이 강하다. 서비스 사용자 화면(KPA 대시보드)의 장식 배지와 맥락이 다르므로 **동일 정책으로 묶기 전 별도 판단 필요**.

### 3.4 역할코드 → 한글 라벨 변환 표준은 **이미 존재한다**

`kpa:admin` 같은 콜론-prefix 코드를 한글 배지로 변환하는 재사용 자산이 이미 여러 곳에 있으나, **중앙 SSOT 하나로 통일돼 있지 않고 서비스별로 중복 정의**되어 있다.

| 자산 | 위치 | 커버리지 |
|---|---|---|
| **`RoleBadge` / `ROLE_STYLES`** (가장 유력한 재사용 대상) | [`packages/operator-ux-core/src/member-list/MemberBadges.tsx:30-67`](../../packages/operator-ux-core/src/member-list/MemberBadges.tsx#L30-L67) | 콜론코드→한글+색상. `kpa:admin→관리자`, `kpa:operator→운영자`, glyco/neture/kcos/`platform:super_admin→슈퍼관리자` 등. 미등록 코드는 raw fallback. |
| `ROLE_LABELS` / `getRoleLabel(role, locale)` | [`packages/types/src/auth/roles.ts:174`](../../packages/types/src/auth/roles.ts#L174) | 플랫폼 SSOT급이나 **bare 역할(`admin`,`operator`,`supplier`…)만** 매핑. 콜론-prefix 미커버 → 미매치 시 raw 반환. |
| 서비스별 로컬 매핑(중복 다수) | `web-account/UserProfileCard.tsx:11-24`(가장 포괄), neture `PlatformUsersPage`/`OperatorsPage`, glyco/kcos `*AdminMembersPage`, 각 operator `UsersPage`/`EditUserModal` 등 | 각자 콜론코드→한글 재정의 |

→ **핵심**: `KpaAdminDashboardPage` 의 하드코딩 배지와 `AdminAccountsSettings` 의 raw map 렌더만 이 표준을 우회한다. 나머지 서비스 대시보드/헤더/프로필은 모두 한글 라벨 변환을 거친다.

---

## 4. 축 B — 데스크톱 · 모바일 사용자 메뉴 정합성

### 4.1 공용 GlobalHeader 의 메뉴 슬롯 구조

[`packages/ui/src/layout/GlobalHeader.tsx`](../../packages/ui/src/layout/GlobalHeader.tsx) 는 두 슬롯을 갖는다.

- `userMenuItems` — 데스크톱 프로필 드롭다운([`:271-275`](../../packages/ui/src/layout/GlobalHeader.tsx#L271-L275))
- `mobileUserMenuItems` — 모바일 햄버거 사용자 영역([`:372`](../../packages/ui/src/layout/GlobalHeader.tsx#L372)), **미주입 시 `userMenuItems` 로 fallback** (`{mobileUserMenuItems ?? userMenuItems}` — additive, opt-in)

즉 **서비스가 `mobileUserMenuItems` 를 주입하지 않으면 데스크톱·모바일 메뉴가 자동으로 동일**해진다.

### 4.2 서비스별 대조

| 서비스 | 데스크톱 `userMenuItems` | `mobileUserMenuItems` | 모바일 실제 결과 | 판정 |
|---|---|---|---|---|
| **KPA** | 강의(instructor)/**관리자**/**운영**/**내 매장** + 마이페이지/설정 | **마이페이지/설정만 주입** | 역할 대시보드·내 매장 **누락** | **불일치 (의도적)** |
| **GlycoPharm** | 강의/관리자/운영 + 마이페이지/설정 | 미주입 → fallback | 데스크톱과 **동일** | 일치 |
| **K-Cosmetics** | 강의/관리자/운영(또는 일반 대시보드) + 마이페이지/설정 | 미주입 → fallback | **동일** | 일치 |
| **Neture** | 관리자/운영/공급자/파트너 + 마이페이지/설정 | 미주입 → fallback | **동일** | 일치 |

- KPA 근거: [`KpaGlobalHeader.tsx:193-243`](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L193-L243) — `userMenuItems`(역할 메뉴 포함)와 `mobileUserMenuItems`(마이페이지/설정만)를 별도 주입.
- Glyco/KCos/Neture 근거: 각 `*GlobalHeader.tsx` 에 `mobileUserMenuItems` prop **부재** → GlobalHeader fallback 경로 사용.

→ **데스크톱≠모바일 편차는 KPA 헤더에만 존재.** 나머지 3개 서비스는 화면 폭과 무관하게 동일 메뉴.

### 4.3 편차의 출처 (의도적 분리)

[`CHECK-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1`](../checks/CHECK-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1.md) (commit `f0ccc4f42`, 2026-07-12) 에서 **의도적으로** 도입.

- 목적: 홈(`/`) 모바일 햄버거에서 역할별 대시보드를 걷어내고 서비스 메뉴 + 계정 메뉴만 노출.
- 당시 근거: "매장 진입은 상단 서비스 메뉴 `내 약국`(/store)로 일원화되어 접근성 유지."

### 4.4 도입 후 새로 생긴 문제 (본 IR 핵심 관찰)

WO 는 **매장 경영자(store_owner)** 의 모바일 접근성을 상단 서비스 nav(`내 약국`/`약국 운영 허브`)로 보존했다. 그러나 **관리자·운영자**의 경로는 보존되지 않았다.

- KPA 상단 nav([`KpaGlobalHeader.tsx:125-132`](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L125-L132)) 구성 = `KPA_BASE_NAV` + `roleItems`(store_owner 대상 내 매장/HUB) + 서비스 안내 + About + (Contact). **`/admin`·`/operator` 는 상단 nav에 포함되지 않는다.**
- 모바일 햄버거 사용자 영역에서도 제거됨(4.2).

→ 결과: **모바일에서 admin/operator 는 홈 햄버거로부터 `/admin`·`/operator` 로 진입할 경로가 없다.** (매장 경영자는 서비스 nav로 진입 가능하나, 관리자/운영자는 진입점 부재.) 관리자 대시보드 자체는 좌측 별도 사이드바 drawer를 갖지만, 그것은 이미 `/admin` 안에 들어간 뒤의 이야기다.

### 4.5 KPA 세 번째 메뉴 표면 — 라벨 drift (추가 발견)

KPA에는 store TopBar 전용 사용자 드롭다운이 별도로 존재한다.

- [`StoreUserDropdown.tsx`](../../services/web-kpa-society/src/components/store/StoreUserDropdown.tsx) — 매장 화면(store TopBar) hover 드롭다운. `/admin` 링크 라벨이 **"관리자 콘솔"**([`:103`](../../services/web-kpa-society/src/components/store/StoreUserDropdown.tsx#L103), [`:118`](../../services/web-kpa-society/src/components/store/StoreUserDropdown.tsx#L118)).
- 반면 GlobalHeader 계열은 동일 `/admin` 을 **"관리자 대시보드"** 로 표기.

→ 같은 목적지에 대해 **"관리자 콘솔" vs "관리자 대시보드"** 라벨이 공존(경미한 정합성 편차). 후속 정책에서 함께 정렬 대상.

---

## 5. 역할별 모바일 접근 경로 (KPA 기준)

| 역할 | 데스크톱 프로필 드롭다운 | 모바일 햄버거 사용자 영역 | 모바일 대체 경로 | 모바일 접근 가능 |
|---|---|---|---|---|
| 일반 회원 | 마이페이지/설정 | 마이페이지/설정 | — | 가능 (변화 없음) |
| 매장 경영자 | 내 매장 + 마이페이지/설정 | 마이페이지/설정 | 상단 nav `내 약국`/`약국 운영 허브` | **가능** (nav로 보존) |
| 강사(instructor) | 강의 대시보드 + … | 마이페이지/설정 | 상단 nav 없음 | **불가** (진입점 부재) |
| 서비스 관리자 | 관리자 대시보드 + … | 마이페이지/설정 | 상단 nav 없음 | **불가** (진입점 부재) |
| 서비스 운영자 | 운영 대시보드 + … | 마이페이지/설정 | 상단 nav 없음 | **불가** (진입점 부재) |
| 복수 역할 | 보유 역할 전부 | 마이페이지/설정 | 부분(store만) | 부분 |

> Neture 의 복수 역할 사용자(operator+admin+super_admin)는 `mobileUserMenuItems` 미사용이라 데스크톱과 동일 메뉴를 모바일에서도 받는다 → 접근성 손실 없음. **손실은 KPA 국지적**.

---

## 6. 정책 후보 (조사 결과 반영)

### 6.1 축 A — 역할 배지

| 후보 | 내용 | 평가 |
|---|---|---|
| **A. 제거** | 페이지 제목에 이미 역할 명시(`관리자 대시보드` + `관리자 전용 공간`) → `kpa:admin` 배지 삭제 | **가장 단순 · 정보중복 해소 · 타 3서비스와 정합(그들은 배지 없음).** guard 무관이라 리스크 0. |
| B. 한글 라벨 치환 | `kpa:admin` → `관리자` (기존 `RoleBadge`/`getRoleLabel` 재사용) | 시각 정체성 유지하되 raw코드 은닉. 단 제목과 여전히 중복. |
| C. 개발 모드에서만 | prod 숨김, dev만 표시 | 시각 정체성 목적이 dev 디버깅이 아니므로 부적합 |

→ **후보 A 권고.** 타 서비스 대시보드에 배지가 아예 없다는 사실이 A를 뒷받침한다. 만약 "역할 배지 UI"를 전 서비스 표준으로 **유지**하기로 결정하면, 그때는 후보 B + 기존 `RoleBadge` 표준 채택(하드코딩 금지)로 통일.

### 6.2 축 B — 사용자 메뉴

| 후보 | 내용 | 평가 |
|---|---|---|
| **A. 데스크톱·모바일 동일** | KPA `mobileUserMenuItems` 제거 → fallback 복귀. 3개 서비스와 동일 정책. | 가장 단순 · 즉시 정합. 단 WO-...-SIMPLIFY-V1 의 "모바일 햄버거 간결화" 의도와 충돌 |
| B. 계정/업무 완전 분리 | 사용자 메뉴는 전 서비스 모바일·데스크톱 모두 마이페이지/설정/로그아웃만. 역할 대시보드는 각 업무 drawer/nav에서만 | 구조 명확 · 데스크톱·모바일 자동 일치. **단 홈에서 admin/operator 업무영역 진입 경로를 별도 확보해야 함**(현재 KPA 모바일 미비점 4.4 를 정면 해결해야 성립) |
| C. 역할 전환 단일 진입점 | 사용자 메뉴에 "내 업무 공간" 하나 → 역할 선택 | 복수역할에 적합하나 새 UI 필요, 현 단계 과설계 |

→ 현 구조에서 **후보 B가 가장 정합적**이나, 성립 전제는 **"홈에서 admin/operator 가 업무영역으로 들어가는 경로"의 확보**다. 이 경로가 현재 KPA 모바일에 부재(4.4)하므로, 후속 WO는 반드시 **진입 경로 설계를 선행**해야 한다. 진입 경로 확보가 어렵다면 과도기적으로 **후보 A**(데스크톱·모바일 동일)로 회귀하는 편이 기능 은폐(모바일에서 관리자/운영자 접근 불가)를 피한다.

> ⚠️ 현재 KPA 모바일 상태는 후보 B도 후보 A도 아닌 **중간 상태**다: 역할 대시보드를 모바일 사용자 메뉴에서 뺐지만(B 방향), 대체 진입 경로(nav/drawer)는 store_owner에게만 있고 admin/operator에겐 없다. 이것이 본 IR이 지목하는 실질 결함이다.

---

## 7. 결론 (완료 기준 대조)

| 완료 기준 | 결과 |
|---|---|
| `kpa:admin` 데이터 출처·목적 확정 | ✅ 하드코딩 리터럴 · 장식(시각 정체성) · guard 무관 (§3.1) |
| 다른 서비스 역할 배지 노출 여부 | ✅ 3개 서비스 대시보드 배지 없음. raw 노출은 KPA 대시보드 + admin-dashboard 계정표 2건 (§3.2-3.3) |
| 데스크톱·모바일 사용자 메뉴 서비스별 비교 | ✅ 편차는 KPA 헤더 국지적, 3개 서비스는 자동 일치 (§4.2) |
| 역할별 모바일 접근 경로 확인 | ✅ store_owner만 nav로 보존, admin/operator/instructor 는 모바일 진입점 부재 (§4.4, §5) |
| 이전 `mobileUserMenuItems` 분리 영향 확인 | ✅ WO-...-SIMPLIFY-V1 의도적 도입, 부작용=관리자/운영자 모바일 진입 경로 상실 (§4.3-4.4) |
| 공용 정책 필요 여부 | ✅ 필요. 축 A=배지 표준(제거 또는 `RoleBadge` 통일) / 축 B=사용자 메뉴 계정·업무 분리 원칙 + 모바일 업무 진입 경로 (§6) |
| 역할→라벨 유틸 존재 여부 | ✅ 이미 존재(`RoleBadge`, `getRoleLabel`), 중복·커버리지 편차 있음 (§3.4) |
| 코드 변경 | **0** |
| IR commit/push | 본 문서 |

---

## 8. 후속 WO 범위 제안 (본 IR 밖 — 승인 필요)

> 아래는 제안일 뿐이며, 착수하려면 별도 WO 승인이 필요하다. 공용 모듈(`packages/ui` GlobalHeader, `operator-ux-core` RoleBadge)을 건드리므로 **Shared Module Change Protocol** 대상 — 4개 서비스 전 소비처 영향 확인 필수.

1. **WO-축A (배지)**: `KpaAdminDashboardPage` 의 `kpa:admin` 하드코딩 배지 제거(후보 A) 또는 `RoleBadge` 한글 라벨로 치환(후보 B). `AdminAccountsSettings` raw map은 맥락이 달라 별도 판단.
2. **WO-축B (메뉴)**: 사용자 메뉴 = 계정 메뉴(마이페이지/설정/로그아웃)로 전 서비스 통일하되, **모바일에서 admin/operator/instructor 가 업무영역으로 진입하는 경로**를 먼저 설계(선행 전제). 설계 없이 후보 B만 적용 시 기능 은폐 발생.
3. **WO-라벨정렬**: `StoreUserDropdown` "관리자 콘솔" ↔ GlobalHeader "관리자 대시보드" 라벨 정렬.
4. **(선택) 역할라벨 SSOT 통합**: 서비스별 중복 매핑 → `RoleBadge`/`getRoleLabel` 단일 SSOT로 콜론-prefix 커버리지 통일.

---

## 9. 조사에서 하지 않은 것 (금지선 준수)

코드 수정 / 역할 코드 변경 / 권한 변경 / route 변경 / 메뉴 삭제 / 모바일 메뉴 복원 / 배지 문구 변경 / API·DB 변경 / 배포 — **전부 미수행.** 본 IR은 정적 코드 조사 + 기존 CHECK 문서 대조로만 작성.
