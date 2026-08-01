# WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1` (`3b2b50c3c`, `4795d99b8`) ·
> `WO-O4O-ADMIN-API-DOUBLE-PREFIX-RESIDUAL-FIX-V1` (`951567cb3`, `a6275cd6c`) ·
> `IR-O4O-ADMIN-SERVICE-MONITOR-SITES-TABLE-DISPOSITION-V1` (`a2610d14a`)

---

## 1. 작업 기준

| 항목 | 값 |
|---|---|
| branch | `main` · 시작 HEAD `a2610d14a` |
| 대상 앱 | `apps/admin-dashboard` (= `admin.neture.co.kr`, `deploy-admin.yml:49`) |
| 변경 범위 | **관리자 메뉴 정의 1파일** |
| 신규 화면·route·API·DB | **0** |

---

## 2. 선행 READY / HOLD 상태

| 화면 | 선행 상태 | 메뉴 연결 | 근거 |
|---|---|:--:|---|
| 매장 네트워크 | **READY** | **YES** | 배포 후 프로덕션: `/summary`·`/top-stores`·`/insights` **200**, 실데이터(`Total Stores 3`, 서비스별 분해), 콘솔 0 |
| 오프라인 매장 | **READY** | **YES** | `?page=1&limit=20` **200**, 정상 빈 상태 안내 렌더, 콘솔 0 |
| 플랫폼 HUB | **READY** | **YES** | `/platform/hub/summary` **200**, `Global Risk Overview`·`승인율 100%`·`약국 1개 활성` 렌더, 콘솔 0 |
| 서비스 현황 | **HOLD** | NO | `sites` 미실현 모델 의존 — `IR-…-SITES-TABLE-DISPOSITION-V1` 에서 `READY_AFTER_FIX → HOLD` 하향 |
| 판매자 정산 | **HOLD** | NO | 백엔드 endpoint 부재 + 역할 전용(super_admin 접근 거부) |
| 공급자 정산 | **HOLD** | NO | 실제 경로가 `/neture/supplier/settlements` 로 불일치, `preview` 부재 |

---

## 3. 관리자 메뉴 구조 조사

| 항목 | 결과 |
|---|---|
| 메뉴 정의 파일 | **`apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`** (단일 소스) |
| 동적 메뉴 | `/api/v1/navigation/admin` 은 Phase R1 이후 **빈 배열 stub** → 정적 트리가 유일 소스 |
| 실제 레이아웃 | `components/layout/AdminSidebar.tsx` — 렌더 결과가 정적 트리와 1:1 일치함을 브라우저로 확인(선행 IR) |
| 권한 필터 | `config/rolePermissions.ts` `menuPermissions` — **항목 2개뿐**(`dashboard`, `core-users`). 정책은 **"설정 없음 = 허용"** |
| 그룹 구조 | 11 그룹 + 구분자 2(Services / Insights). Insights 아래는 **중첩 그룹이 아니라 flat 항목**(Ops Metrics · Content Manager · Reports) |
| 아이콘 | `lucide-react` 사전 import 목록 내에서만 사용(파일 내 아이콘 중복 사용은 기존에도 존재) |

### 메뉴 그룹 선정 근거 — **Insights**

- 세 화면 모두 **서비스 경계를 가로지르는 운영 현황**이다
  (`Cross-service store KPI overview` / `Cross-service store linking` / `플랫폼 통합 운영 허브 — 모든 서비스를 한눈에`).
- 같은 섹션의 **Ops Metrics** 와 성격이 동일하다.
- **Core** 는 RBAC·Service Operators·Membership·Platform Settings 로 **사람·권한·설정 축**이라 맞지 않는다.
- **새 최상위 그룹을 만들지 않았고**, 기존 섹션의 flat 항목 패턴을 그대로 따랐다.
- 기존 항목의 상대 순서를 바꾸지 않고 `Ops Metrics` 바로 뒤에 삽입했다.

---

## 4. route 재확인 (현재 main 기준)

| 화면 | 메뉴명 | 그룹 | 실제 route | 등록 파일 | 컴포넌트 | 권한 가드 | 판정 |
|---|---|---|---|---|---|---|---|
| 매장 네트워크 | `매장 네트워크` | Insights | `/admin/store-network` | `routes/platform.routes.tsx:63` | `StoreNetworkPage` | `requiredRoles={['admin']}` | ✅ canonical |
| 오프라인 매장 | `오프라인 매장` | Insights | `/admin/physical-stores` | `platform.routes.tsx:72` | `PhysicalStoresPage` | `requiredRoles={['admin']}` | ✅ canonical |
| 플랫폼 HUB | `플랫폼 HUB` | Insights | `/admin/platform/hub` | `platform.routes.tsx:81` | `PlatformHubPage` | `requiredRoles={['admin']}` | ✅ canonical |

- path parameter 없음 · query parameter 없이 기본 화면 진입 가능 · redirect/legacy 아님
- 동일 화면을 가리키는 별칭 route 없음
- 선행 자료와 현재 main 의 route **차이 없음**

### 권한 정합성

세 route 는 전부 `requiredRoles={['admin']}` 이고, **이미 메뉴에 연결되어 있는 `Ops Metrics`(`/admin/ops/metrics`) 와 동일한 가드**다.
따라서 `menuPermissions` 에 별도 항목을 추가하지 않았다 — 추가하면 오히려 비교 대상보다 더 제한적이 되어 기존 관례와 어긋난다.
권한 검사를 **약화하거나 제거하지 않았고, 신규 권한 코드·역할도 만들지 않았다.**

> 참고: 관리자 앱 자체에 앱 레벨 게이트가 있어(비관리자는 "관리자 권한이 필요합니다") 메뉴를 볼 수 있는 사용자는 이미 관리자 경계를 통과한 상태다.

---

## 5. 구현 결과

| 항목 | 값 |
|---|---:|
| 수정 파일 | **1** (`admin-menu.static.tsx`) |
| 추가 메뉴 항목 | **3** |
| 교정한 기존 메뉴 항목 | 0 (동일 의미 기존 항목 없음 — 중복 생성 아님) |
| 신규 route | **0** |
| 백엔드 변경 | **0** |
| DB 변경 | **0** |
| 신규 import | **0** (`Layers`·`BarChart2`·`Briefcase` 모두 기존 import) |

---

## 6. 제외 대상 확인

| 제외 대상 | 메뉴 미연결 | 소스 미수정 |
|---|:--:|:--:|
| 서비스 현황 `/admin/services/overview` | **PASS** | **PASS** |
| 판매자 정산 | **PASS** | **PASS** |
| 공급자 정산 | **PASS** | **PASS** |
| Multi-Site Builder / sites / themes / theme_installations / ServiceMonitor | **PASS** | **PASS** |
| Dropshipping·Monitoring 미검증 화면 | **PASS** | **PASS** |

검색 확인: 메뉴 파일 내 `services/overview|seller/settlements|supplier/settlements|sites|themes|ServiceMonitor` **0건**.

---

## 7. 검증 결과

*(배포 후 §7-1 에 기록)*

---

## 8~11.

*(배포 후 기록)*
