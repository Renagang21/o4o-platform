# IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1

> **조사 전용 IR (Read-Only Audit)** — 코드 수정 없음. O4O 전 서비스의 로그인 후 시작 화면(post-login redirect) 정책을 조사하고, 약국/매장 경영자(store_owner) 첫 화면 정책의 서비스 간 정합성과 O4O 철학 충돌 여부를 판단한다.

- **작성일:** 2026-06-02
- **유형:** Investigation Report (조사 전용)
- **범위:** web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture + 공통 패키지(auth-utils, store-ui-core)
- **기준 문서:** `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`, `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md`
- **방침:** 코드/문서 수정·이동·삭제 없음. 추측 금지. 주석-구현 불일치는 명시적으로 표기.

---

## 0. 한 줄 결론

> **GlycoPharm·K-Cosmetics 는 store_owner 를 로그인 직후 `/store`(내 매장/내 약국)로 자동 이동시킨다. KPA-Society 만 store_owner 를 자동 이동시키지 않고 커뮤니티 Home 에 머무르게 한다.** 이 차이는 **우발적 잔재가 아니라 명시적 정책 결정**(`WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1`)이며, "KPA = 커뮤니티 서비스" 전제 위에 서 있다. 이 전제는 본 IR 이 채택한 O4O 철학("KPA 도 약국 경쟁력 강화 O4O 서비스, 예외 아님")과 **정면 충돌**한다. 더불어 KPA `LoginModal.tsx` 에는 구현과 반대되는 **stale 주석**("약국 경영자 → /store")이 남아 있다.

---

## 1. 현재 구조 요약

### 1-1. 서비스별 로그인 후 기본 이동 경로 (store_owner 관점)

| 서비스 | store_owner 역할명 | 로그인 직후 store_owner 이동 | Home 유지 여부 | 비고 |
|--------|-------------------|------------------------------|----------------|------|
| **GlycoPharm** | `glycopharm:store_owner` | **`/store`** (내 약국 워크스페이스) | 자동 이동됨 | 정책-구현 일치 |
| **K-Cosmetics** | `cosmetics:store_owner` | **`/store`** (StoreCockpitPage) | 자동 이동됨 | 정책-구현 일치 |
| **KPA-Society** | `kpa:store_owner` | **이동 없음 → 커뮤니티 Home 유지** | 유지됨 | `/store` 는 헤더 "내 약국" 메뉴로만 진입 |
| **Neture** | `store_owner` (참여 유형, role 아님) | `/seller/overview` (일반 overview) | 자동 이동됨 | B2B 공급자/파트너 중심 — store_owner 정식 role 없음 |

### 1-2. 역할별 Dashboard Map (서비스별)

공통 엔진: 모든 서비스가 `packages/auth-utils/src/getPrimaryDashboardRoute.ts` 의 `getPrimaryDashboardRoute(roles, PRIORITY, MAP)` 를 호출. 우선순위 배열의 **첫 매칭 role** 이 승리(다중 역할 시 상위 우선).

**KPA-Society** — [config/dashboard.ts:35-51](services/web-kpa-society/src/config/dashboard.ts#L35)
| role | route |
|------|-------|
| `platform:super_admin` | `/admin` |
| `kpa:admin` | `/admin` |
| `kpa:operator` | `/operator` |
| `kpa:store_owner` | **(map 에 없음) → null → Home 유지** |
| `lms:instructor` / `kpa:pharmacist` / 일반 | null → Home 유지 |

**GlycoPharm** — [config/dashboard.ts:21-37](services/web-glycopharm/src/config/dashboard.ts#L21)
| role | route |
|------|-------|
| `platform:super_admin` | `/admin` |
| `glycopharm:admin` | `/admin` |
| `glycopharm:operator` | `/operator` |
| `glycopharm:store_owner` | **`/store`** |
| `glycopharm:pharmacist` | `/store/hub` |
| `customer` | `/patient` |

**K-Cosmetics** — [config/dashboard.ts:18-34](services/web-k-cosmetics/src/config/dashboard.ts#L18)
| role | route |
|------|-------|
| `platform:super_admin` / `cosmetics:admin` | `/admin` |
| `cosmetics:operator` | `/operator` |
| `cosmetics:store_owner` | **`/store`** |
| `consumer` / `customer` (legacy) | `/` |

**Neture** — [config/dashboard.ts:28-52](services/web-neture/src/config/dashboard.ts#L28)
| role | route |
|------|-------|
| `platform:super_admin` / `neture:admin` | `/admin` |
| `neture:operator` | `/operator` |
| `neture:supplier` / `supplier` | `/supplier/dashboard` |
| `neture:partner` / `partner` | `/partner/dashboard` |
| `store_owner`(참여유형) / `seller` | `/seller/overview` |

### 1-3. Home 유지 여부와 redirect 조건 (공통 패턴)

4개 서비스 모두 **동일한 `PostLoginRedirect` 패턴**(`WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1`, KPA reference 기반)을 App.tsx 에 복제 보유:

- redirect 는 **`/` 또는 `/login` 경로에서만** 1회 발동 (`didRedirectRef` + `wasAuthRef` 이중 가드)
- 이미 워크스페이스 경로(`/store`, `/operator`, `/admin`, `/supplier`, `/partner`, `/seller`, `/instructor` 등)면 early-exit
- 공개 Home(`/`)은 **로그인 사용자가 수동 방문 시 그대로 머무름** — 자동으로 쫓아내지 않음 (단, 로그인 직후엔 위 redirect 발동)
- `RoleBasedHome` 은 KPA·K-Cos 에서 명시적으로 제거됨 (`WO-O4O-ROLEBASED-HOME-REMOVAL-...`) — "/" 는 항상 커뮤니티/사이트 Home

---

## 2. 서비스별 차이 분석

### 2-1. KPA-Society — 커뮤니티 우선(store_owner 자동 이동 없음)

- **로그인 진입:** 모달 전용([LoginModal.tsx:113-116](services/web-kpa-society/src/components/LoginModal.tsx#L113)) + fallback [App.tsx:330-377](services/web-kpa-society/src/App.tsx#L330)
- **store_owner 정책:** `KPA_DASHBOARD_MAP` 에 `kpa:store_owner` 키 자체가 없음 → `getKpaPostLoginRoute()` 가 `null` 반환 → Home 유지.
- **명시적 근거 주석** — [config/dashboard.ts:28-33](services/web-kpa-society/src/config/dashboard.ts#L28):
  > `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1: kpa:store_owner 제거 — 약국 경영자도 메인/커뮤니티 유지. /store 는 GlobalHeader/StoreHub 메뉴에서 직접 진입.`
  > `null → 현재 화면 유지 (커뮤니티 철학 — 일반 회원/강사/약국 경영자는 메인/커뮤니티 유지)`
- **/store 진입 경로:** 헤더 contextual nav "내 약국"(`myStoreLabel`)→`/store`, `visibleWhen: 'storeOwner'` ([navigation.ts:44-46](services/web-kpa-society/src/config/navigation.ts#L44)). 모바일은 "약국 경영" 탭.
- **/store Guard:** `PharmacyGuard` → 공통 `StoreOwnerGuard(serviceKey='kpa')` + 승인 상태 체크. 미승인 시 `/pharmacy` 안내 페이지.
- ⚠️ **주석-구현 불일치 (확정):** [LoginModal.tsx:107-108](services/web-kpa-society/src/components/LoginModal.tsx#L107) 에 `"약국 경영자(isStoreOwner) → /store"` 주석이 남아 있으나, 실제 구현은 `null`(이동 없음). 이는 `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1` 이전 설계의 **잔재 주석**이다.

### 2-2. GlycoPharm — store_owner → /store (정책-구현 일치)

- **로그인 진입:** [LoginModal.tsx](services/web-glycopharm/src/components/common/LoginModal.tsx) + [App.tsx:436-481 PostLoginRedirect](services/web-glycopharm/src/App.tsx#L436)
- **store_owner 정책:** `glycopharm:store_owner` → `/store`(StoreOverviewPage, "내 약국 홈"). pharmacist 는 `/store/hub`(읽기 중심). 우선순위상 store_owner > pharmacist.
- **/store Guard:** `PharmacyStoreGuard` → 공통 `StoreOwnerGuard(serviceKey='glycopharm')`, membership(`pharmacy` active/approved)도 허용, operator/admin 통과. 거부 시 `/`.
- **헤더:** "내 약국"→`/store`(storeOwner), "매장 운영 허브"→`/store-hub`. 모바일 "약국 경영" 탭.
- 주석-구현 일치. 다중 WO 로 store_owner 진입 보장 안정화됨([App.tsx:865-870](services/web-glycopharm/src/App.tsx#L865)).

### 2-3. K-Cosmetics — store_owner → /store (정책-구현 일치)

- **로그인 진입:** LoginModal/LoginPage + [App.tsx:327-370 PostLoginRedirect](services/web-k-cosmetics/src/App.tsx#L327)
- **store_owner 정책:** `cosmetics:store_owner` → `/store`(StoreCockpitPage).
- **/store Guard:** `StoreOwnerGuard(serviceKey='cosmetics')`. ⚠️ membership SSOT 미보유 — 현재 role/operator 분기로만 통과([App.tsx:280-286](services/web-k-cosmetics/src/App.tsx#L280) 주석). 이는 *향후 도입 예정* 명시이므로 불일치 아님(미래 계획 주석).
- **헤더:** "내 매장"→`/store`(storeManager). 모바일 "매장 경영"→`/mobile/store`(데스크톱 `/store` 와 경로 상이 — 주: 모바일 별도 경로).

### 2-4. Neture — 구조적으로 다름 (공급자/파트너 중심)

- **store_owner 는 정식 role 이 아니라 참여 유형(participant type).** [config/dashboard.ts:10-13](services/web-neture/src/config/dashboard.ts#L10):
  > `store_owner 가 canonical (Neture 내부 participant type, 권한 role 아님)... neture:store_owner role 은 만들지 않으며 다른 서비스 store_owner 와 연결하지 않는다.`
- **핵심 역할 이동:** supplier→`/supplier/dashboard`, partner→`/partner/dashboard`, admin→`/admin`, operator→`/operator`. store_owner/seller→`/seller/overview`(전용 대시보드 아님, 헤더 진입점 없음).
- [navigation.ts:32-39](services/web-neture/src/config/navigation.ts#L32): `Neture 는 공급자·파트너 조직 중심 — store owner / 매장 허브 구조를 적용하지 않는다.` (명시적 설계)
- **판단:** Neture 는 O4O 매장 경영자 흐름의 대상이 아니라 **공급 계층** 서비스. store_owner 첫 화면 정책 비교에서 KPA/GP/K-Cos 와 동일 축으로 두면 안 됨.

---

## 3. O4O 철학 기준 충돌 여부

### 3-1. KPA 예외 취급 여부 — **예외로 취급되고 있음 (확정)**

KPA 는 코드 레벨에서 **명시적으로 "커뮤니티 서비스"로 특별 취급**된다. 근거:
1. `KPA_DASHBOARD_MAP` 이 admin/operator 만 매핑하고 store_owner 를 의도적으로 배제 — `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1` 주석에 "커뮤니티 철학" 명시.
2. `WO-O4O-ROLEBASED-HOME-REMOVAL-AND-ROUTING-NORMALIZATION-V1` 로 "/" 를 항상 커뮤니티 Home 으로 고정.
3. GlycoPharm/K-Cosmetics 는 동일 store_owner 를 `/store` 로 보내지만 KPA 만 보내지 않음.

→ **이 예외는 우발적 잔재(legacy residue)가 아니라 "의도된 최근 정책 결정"이다.** 다만 그 정책의 전제("KPA = 커뮤니티 우선")가 본 IR 의 O4O 철학 기준과 충돌한다.

### 3-2. store_owner 첫 화면 정책의 서비스 간 불일치 — **불일치 존재 (확정)**

| | GlycoPharm | K-Cosmetics | KPA-Society |
|---|:---:|:---:|:---:|
| store_owner 로그인 직후 | `/store` | `/store` | **Home 유지** |

매장/약국 경영자가 동일한 역할 의미를 갖는데도 KPA 만 첫 경험이 다르다. O4O 철학("약국/매장 경영자는 주 사용자")을 적용하면 이는 정책 표류(drift)에 해당.

### 3-3. Home/Community 중심 구조가 O4O 목적과 충돌하는지 — **부분 충돌**

- 공개 Home 을 비로그인/일반 참여자 진입점으로 유지하는 것 자체는 O4O 목적과 충돌하지 않음(IR 판단 기준과 일치).
- 충돌 지점은 **"로그인한 store_owner 까지 커뮤니티 Home 에 머무르게 하는 것"** 이다. Home 을 내 약국으로 바꾸지 않고도(=공개 Home 유지) store_owner 의 첫 화면만 `/store` 로 보내는 것이 GlycoPharm/K-Cos 에서 이미 구현되어 있으므로, KPA 도 Home 구조를 훼손하지 않고 정렬 가능.

---

## 4. 구현 리스크 분석 (KPA 정렬 가정 시)

> 본 절은 후속 WO 가 "KPA store_owner → /store 자동 이동"을 채택할 경우의 영향 범위 예측이다. 실제 수정은 하지 않는다.

| 리스크 | 내용 | 수준 |
|--------|------|------|
| **redirect 변경 영향 범위** | `KPA_DASHBOARD_MAP` 에 `kpa:store_owner: '/store'` 추가 + priority 배열 포함이면 충분. `getPrimaryDashboardRoute` 공통 엔진은 그대로. 단일 config 파일 변경. | 낮음 |
| **Guard/access** | `/store` 는 이미 `PharmacyGuard`(승인 상태 체크) 보호 중. **미승인 store_owner 가 자동 이동되면 `/pharmacy` 안내 페이지로 재차 튕김** → 첫 화면이 안내 페이지가 되는 UX 검토 필요. | 중간 |
| **다중 역할 사용자** | operator/admin 도 함께 가진 사용자는 우선순위상 `/admin`·`/operator` 로 감(store_owner 보다 상위). 의도된 동작이나 "운영자 겸 약국주"의 첫 화면 기대치 확인 필요. | 중간 |
| **LoginModal/PostLoginRedirect 중복** | KPA 의 stale 주석(§2-1) 정리 필요. PostLoginRedirect 는 4서비스 복제본이나 이번 변경은 config 만 → 컴포넌트 무수정. | 낮음 |
| **모바일 메뉴** | KPA 모바일 "약국 경영" 탭 동작과 자동 이동 정합성 확인. | 낮음 |
| **승인 흐름 의존** | KPA store_owner 는 승인(approved) 게이트가 강함. 자동 이동 정책은 "승인된 store_owner"에 한정하는 조건부 설계가 안전. | 중간 |

---

## 5. 권장 정책안

### 5-1. O4O 공통 post-login redirect 정책 (제안)

> 공통 엔진(`getPrimaryDashboardRoute`)은 이미 4서비스가 공유하므로, 정책 정렬은 **각 서비스 `config/dashboard.ts` 의 MAP/PRIORITY 값만** 손대면 된다(구조 변경 불필요).

| 역할 계열 | 권장 로그인 후 첫 화면 |
|-----------|----------------------|
| admin / super_admin | `/admin` (현행 유지) |
| operator | `/operator` (현행 유지) |
| **store_owner / pharmacy_owner** | **`/store` (내 매장/내 약국) — 전 서비스 공통** |
| pharmacist / member / student / customer | 커뮤니티 Home 또는 MyPage (현행 유지) |
| supplier / partner (Neture) | `/supplier`·`/partner` 대시보드 (현행 유지) |

### 5-2. KPA store_owner 를 `/store` 로 보낼지 — **최종 권고: 보낸다 (조건부)**

- **근거:** 본 IR 이 채택한 O4O 철학상 KPA 는 예외 서비스가 아니며, 약국 경영자는 주 사용자다. GlycoPharm/K-Cos 와의 불일치를 제거하는 것이 정합적이다.
- **조건부 설계 권고:** 무조건 이동이 아니라 **"승인된(approved) store_owner 에 한해 `/store` 자동 이동"**. 미승인자는 현행대로 `/pharmacy` 안내 또는 Home 유지(Guard 재튕김 UX 방지).
- **공개 Home 은 유지** — Home 을 내 약국으로 바꾸지 않는다. 변경 대상은 "로그인 직후 store_owner 의 목적지"뿐.
- **stale 주석 정리:** KPA `LoginModal.tsx:107-108` 의 "약국 경영자 → /store" 주석을 구현과 일치시키는 작업을 동반.

### 5-3. 서비스별 예외 (근거 명시)

- **Neture 예외 유지 (정당):** store_owner 가 role 이 아닌 참여 유형이며, 공급자/파트너 중심 B2B 구조. O4O 매장 경영자 흐름의 대상이 아니므로 `/store` 정책에서 제외하는 것이 옳다. 단, 이는 "KPA 식 커뮤니티 예외"와 성격이 다른 **구조적 예외**임을 문서에 명기.

---

## 6. 후속 WO 필요 여부

**필요함 (권장).** 코드 수정이 수반되므로 별도 Work Order 로 진행한다 (본 IR 은 조사 전용, 수정 없음).

### 제안 후속 WO (가칭)
`WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1`

### 수정 대상 파일 후보 (실제 수정은 본 IR 범위 외)
| 파일 | 변경 성격 |
|------|----------|
| [services/web-kpa-society/src/config/dashboard.ts](services/web-kpa-society/src/config/dashboard.ts) | `KPA_DASHBOARD_MAP` + `KPA_ROLE_PRIORITY` 에 `kpa:store_owner` 추가 (조건부 이동 로직 포함) |
| [services/web-kpa-society/src/components/LoginModal.tsx:107](services/web-kpa-society/src/components/LoginModal.tsx#L107) | stale 주석 정리 (구현 일치) |
| [services/web-kpa-society/src/App.tsx:330](services/web-kpa-society/src/App.tsx#L330) | 승인 상태 기반 조건부 이동 검토 (필요 시) |

> ⚠️ 단, KPA 의 "커뮤니티 우선" 정책은 `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1` 에서 **의도적으로 결정된 것**이다. 이를 뒤집는 WO 는 해당 WO 의 결정을 명시적으로 갱신(supersede)하는 것이므로, 착수 전 **사업 의사결정 확인**(KPA 를 store_owner 첫 화면 기준으로 GlycoPharm/K-Cos 와 동일하게 둘 것인지)이 선행되어야 한다.

---

## 7. Current Structure vs O4O Philosophy Conflict Check

| # | O4O 철학 기준 (본 IR 채택) | 현재 구조 | 충돌? |
|---|---------------------------|-----------|:-----:|
| 1 | 약국/매장 경영자는 O4O 주 사용자 | GlycoPharm/K-Cos: store_owner→/store ✅ / KPA: Home 유지 ❌ | **충돌 (KPA)** |
| 2 | KPA 는 O4O 철학의 예외 서비스가 아니다 | 코드가 KPA 를 "커뮤니티 철학" 예외로 명시 취급 | **충돌** |
| 3 | 공개 Home 유지 가능 | 4서비스 모두 공개 Home 유지 ✅ | 일치 |
| 4 | 로그인 후 시작 화면은 역할에 맞아야 함 | admin/operator 는 전 서비스 일치 ✅ / store_owner 는 KPA 만 불일치 ❌ | **부분 충돌** |
| 5 | 일반 회원/약사/학생/소비자는 커뮤니티/MyPage 유지 | 전 서비스 일치 ✅ | 일치 |
| 6 | 운영자/관리자는 operator/admin 대시보드 | 전 서비스 일치 ✅ | 일치 |
| 7 | Neture 는 공급자/파트너 별도 구조, 충돌 없어야 | Neture 는 구조적으로 분리, store_owner role 미생성 ✅ | 일치(구조적 예외) |

**충돌 요약:** 전체 7개 기준 중 **3개(#1·#2·#4)에서 KPA-Society 가 O4O 철학과 충돌**한다. 충돌의 근원은 단일하다 — **"KPA store_owner 만 로그인 직후 `/store` 로 가지 않는다."** 나머지 모든 축(admin/operator/일반회원/Neture 구조)은 이미 철학과 정합적이다.

---

## 완료 보고 (요약)

- **조사한 주요 파일:** 4서비스 `config/dashboard.ts`·`config/navigation.ts`·`App.tsx`(PostLoginRedirect)·`LoginModal.tsx`·각 Guard, 공통 `packages/auth-utils/src/getPrimaryDashboardRoute.ts`·`packages/store-ui-core/src/auth/StoreOwnerGuard.tsx`
- **서비스별 post-login redirect 표:** §1-1 / §1-2
- **store_owner 계열 실제 이동 경로:** GP `/store` · K-Cos `/store` · **KPA Home 유지** · Neture `/seller/overview`(참여유형)
- **KPA 예외 여부:** **명시적·의도적 예외**(legacy 잔재 아님). 단 `LoginModal.tsx` 에 구현과 반대되는 stale 주석 1건 확정.
- **공통화 가능성:** 핵심 로직은 이미 ~85% 공통화(`getPrimaryDashboardRoute`, `StoreOwnerGuard`). 정렬은 **KPA `config/dashboard.ts` 값 변경만으로 가능**(구조 변경 불필요). `PostLoginRedirect`/`RoleGuard` 는 4서비스 복제본(이번 정렬과 무관, 별도 추출 후보).
- **후속 WO 필요 여부:** **필요(권장)** — `WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1`(가칭). 단, KPA 커뮤니티 정책을 뒤집는 결정이므로 착수 전 사업 의사결정 확인 선행.

*— 본 IR 은 조사 전용. 코드/문서 수정·이동·삭제 없음.*
