# CHECK — WO-O4O-KPA-OPERATOR-DASHBOARD-MENU-IA-AND-ROUTE-REFINE-V1

**WO 제목:** KPA-Society 운영자 대시보드·사이드바 메뉴 IA·라우트 전수 조사 및 1차 안전 정비

**상태:** 1차 안전 정비 완료 — 구현 · typecheck/build GREEN · 배포 · 운영 smoke · commit/push. 구조 분할(그룹 split·도메인 4축)은 공통 IA 변경(중지조건 §10.1)으로 **보류·보고**.

---

## 1. 목적

기술 기능·데이터 모델이 아니라 **실제 운영 업무 동선** 기준으로 운영자 대시보드 + 사이드바 메뉴를
전수 조사하고, 중지 조건에 해당하지 않는 안전 범위를 1차 정비한다.
(약국 서비스 신청 복원 금지 · 신규 기능/DB/마이그레이션 신설 금지 · `kpa_pharmacy_requests` drop 금지.)

---

## 2. 전수 Inventory (메뉴 ↔ route ↔ page ↔ 권한)

**출처:** `UNIFIED_MENU` (`config/operatorMenuGroups.ts`) + `OperatorRoutes.tsx` + 공통 `DomainIASidebar`/`operatorDomainIA`(`@o4o/operator-ux-core`) + backend `operator-dashboard.service.ts`.

### 2.1 사이드바 (UNIFIED_MENU) — 그룹·도메인·route 매핑

| 그룹(공통 key) | 도메인(공통) | 항목 | route | 상태 |
|---|---|---|---|---|
| dashboard | 운영 공통(top-pin) | 대시보드 | `/operator` | ✅ live |
| users | 커뮤니티 운영 | 회원 관리 | `/operator/members` | ✅ live |
| approvals | 매장 HUB 운영 | 공급 상품 신청 승인 | `/operator/product-applications` | ✅ live |
| approvals | 〃 | 이벤트 오퍼 승인 | `/operator/event-offers` | ✅ live |
| approvals | 〃 | ~~판매자 모집 노출 승인~~ | `/operator/recruitment-exposure` | ⚠️ **placeholder(backend 부재) → 메뉴 숨김(본 WO)** · route/page 보존 |
| products | 매장 HUB 운영 | 상품 현황(view-only) | `/operator/products` | ✅ live |
| orders | 〃 | 주문 현황(view-only) | `/operator/orders` | ✅ live |
| stores | 〃 | 매장 관리 / 채널 관리 | `/operator/stores` · `/operator/store-channels` | ✅ live (매장 운영) |
| stores | 〃 | 매장 HUB 블로그/POP/QR-code/동영상/다국어 상품 콘텐츠/태블렛 화면 | `/operator/blog·pop·qr·video·multilingual-product-contents·tablet/screen-sets` | ✅ live (매장 HUB 자료) |
| content | 커뮤니티 운영 | 공지사항/뉴스 · Home 편집 · 콘텐츠 허브 관리 · 설문조사 관리 | `/operator/content·community·docs·surveys` | ✅ live |
| resources | 커뮤니티 운영 | 자료실 관리 | `/operator/resources` | ✅ live |
| lms | 커뮤니티 운영 | 강의 관리 · 강사 승인 · 안내 문구 관리 | `/operator/lms·qualification-requests·guide-contents` | ✅ live |
| signage | 매장 HUB 운영 | HQ 미디어 · HQ 플레이리스트 · 템플릿 · 강제 콘텐츠 | `/operator/signage/hq-media·hq-playlists·templates·forced-content` | ✅ live |
| forum | 커뮤니티 운영 | 포럼 운영 · 포럼 신청 관리 · 포럼 목록 관리 · 삭제 요청 · 포럼 분석 | `/operator/forum·forum-requests·forum-categories·forum-delete-requests·forum-analytics` | ✅ live |
| analytics | 운영 공통 | AI 리포트 · 운영 분석 | `/operator/ai-report·analytics` | ✅ live |
| system | 운영 공통 | 감사 로그 · 역할 관리 | `/operator/audit-logs·roles` | ✅ live · **adminOnly** (filterMenuByRole) |

**결과:** 사이드바 메뉴 항목은 `recruitment-exposure` 를 제외하면 전부 실 route 연결(데드링크 0). `stores` 그룹은 8항목으로 과적재이나, 항목 순서가 이미 **매장 운영(관리·채널) → 매장 HUB 자료(블로그·POP·QR·동영상·다국어·태블렛)** 로 정렬되어 있음.

### 2.2 UNIFIED_MENU 외 route (숨김·legacy·redirect)

| route | 성격 | 판정 |
|---|---|---|
| `/operator/recruitment-exposure` | 준비중 placeholder page | 메뉴 숨김(본 WO)·page 보존 |
| `/operator/legal` | adminOnly, 메뉴 이미 제거·page 보존(legacy) | 유지(별도 cleanup WO) |
| `/operator/working-content`, `content-hub/:id`, `resources/new`, `resources/:id/edit`, `collaboration-requests` | 상위 화면 내부 전이/편집 경로 | 사이드바 비노출 정상(데드 아님) |
| `/operator/forum-management` → `/operator/forum-requests` | legacy redirect | 유지(구 URL 호환) |
| `/operator/community-management` → `/operator/community` | legacy redirect | 유지 |
| `/operator/news` → `/operator/content` | legacy redirect | 유지 |
| `/operator/lms/courses` → `/operator/lms`, `users`/`operators` → `/operator/members` | legacy redirect | 유지 |
| `/operator/pharmacy-requests` | 직전 WO(V1)에서 제거 | 없음(catch-all → `/operator`) |
| `/operator/organization-requests` | backend 대시보드 링크는 있으나 **operator route 부재**(admin 화면 전용 개념) | ⚠️ **데드링크(보고)** — §5 참조 |

### 2.3 backend 대시보드 링크 정합 (operator-dashboard.service.ts)

| 소비 지점 | 기존 link | 정비 후 |
|---|---|---|
| ActionQueue `forum` / AI / QuickAction `qa-forum` | `/operator/forum-management`(redirect) | **`/operator/forum-requests`** (직접) |
| QuickAction `qa-news` | `/operator/news`(redirect) | **`/operator/content`** (직접) |
| KPI `service-apps` / ActionQueue / QuickAction (admin-only 분기) | `/operator/organization-requests` | **미변경(보고)** — operator route 부재·admin 경계 판단 필요 |
| 프론트 카드그리드 `포럼 요청` | `/operator/forum-management`(redirect) | **`/operator/forum-requests`** (직접) |

그 외 KPI/ActionQueue/QuickAction 링크(`members·event-offers·product-applications·content·signage/hq-media·stores`)는 전부 실 route 연결 확인.

---

## 3. 목표 메뉴 구조(§6) 대비 판정

WO §6 목표 트리(대시보드 / 회원·커뮤니티 / 상품·거래 / 매장 운영 / 매장 HUB 자료 / 디지털 사이니지 / 운영 현황 / 시스템 관리)와 현재 공통 IA(커뮤니티 운영 / 매장 HUB 운영 / 운영 공통 3도메인 + 13 공통 그룹)의 차이:

- **매장 운영 vs 매장 HUB 자료 를 별도 섹션으로 분리** → 현재 두 성격이 동일 `stores` 공통 그룹(라벨 '매장')에 공존. 분리하려면 신규 공통 `OperatorGroupKey`(+`STANDARD_GROUPS`+`GROUP_TO_DOMAIN`) 필요 → **Neture/GlycoPharm/K-Cosmetics 3서비스 공통 영향 → 중지조건 §10.1 → 보고**.
- **사이드바 도메인 4축(회원·커뮤니티 / 상품·거래 / 매장·HUB / 운영 현황)** → 공통 `DEFAULT_OPERATOR_DOMAIN_IA` 변경 또는 `OperatorAreaShell` 의 `domainIAConfig` 주입 배선 필요 → 공통 컴포넌트 계약 변경 → **중지조건 §10.1 → 보고**.

→ 본 WO(1차 안전)에서는 **공통 IA 미변경**. 항목 순서/명칭/노출/링크 정합만 KPA 전용 파일에서 수행.

---

## 4. 구현(안전 범위)

| # | 파일 | 변경 |
|:-:|---|---|
| 1 | `config/operatorMenuGroups.ts` | `approvals` 에서 `판매자 모집 노출 승인`(recruitment-exposure) 항목 **제거(숨김)**. route/page 보존. deprecated `OPERATOR_MENU_ITEMS`(소비처 0)는 미변경 |
| 2 | `pages/operator/KpaOperatorDashboard.tsx` | 카드그리드 `포럼 요청` href `/operator/forum-management` → `/operator/forum-requests` |
| 3 | `routes/kpa/services/operator-dashboard.service.ts` | `/operator/forum-management`×4 → `/operator/forum-requests` · `qa-news` `/operator/news` → `/operator/content` |

**권한(§5.G):** `system` 그룹(감사 로그·역할 관리)은 `filterMenuByRole` 로 `adminOnly` 처리 — 비-admin 운영자 사이드바 비노출. route 측 `audit-logs`/`roles`/`legal` 는 각각 중첩 `RoleGuard`(admin 이상)로 직접 URL 접근도 차단(정적 확인). → 신규 leak 없음.

---

## 5. 보류·보고 항목 (중지 조건 적용 — 구현 안 함)

| 항목 | 중지조건 | 사유 |
|---|---|---|
| 매장 운영 / 매장 HUB 자료 **사이드바 섹션 분리** | §10.1 | 신규 공통 `OperatorGroupKey`+`STANDARD_GROUPS`+`GROUP_TO_DOMAIN` = Neture/GP/KCos 공통 영향 |
| 사이드바 **도메인 4축 재정렬** | §10.1 | 공통 `DEFAULT_OPERATOR_DOMAIN_IA` / `OperatorAreaShell` domainIAConfig 배선 = 공통 계약 변경 |
| `service-apps` KPI → `/operator/organization-requests` **데드링크** | §10.5 / §10.7 | operator route 부재 · admin 화면 전용 개념 · admin/operator 경계 및 실 데이터 연결 판단 필요 |
| `/operator/legal`·`recruitment-exposure` page **완전 제거** | §10.3 | route/page 보존이 안전 · 별도 cleanup WO 후보 |

**후속 WO 후보:** (a) 매장 운영/HUB 자료 그룹 분리 — 공통 `OperatorGroupKey` 확장 WO(3서비스 검증 포함), (b) 운영자 `organization-requests` route 신설 또는 `service-apps` KPI 재배선, (c) legacy page(legal·recruitment-exposure) 제거 cleanup.

---

## 6. 빌드 검증

- `apps/api-server` `tsc -p tsconfig.build.json --noEmit` → **EXIT 0**.
- `pnpm --filter @o4o/web-kpa-society build` → **✓ built** (16.1s).

---

## 7. 배포 · 운영 smoke

> 아래 §7 는 배포/smoke 수행 후 채움.

---

*Generated: 2026-07-24 · WO-O4O-KPA-OPERATOR-DASHBOARD-MENU-IA-AND-ROUTE-REFINE-V1*
