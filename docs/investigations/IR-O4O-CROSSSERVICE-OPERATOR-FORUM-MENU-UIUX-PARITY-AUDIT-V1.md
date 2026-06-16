# IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1

> **분류**: Investigation Report (조사 보고서)
> **상태**: 조사 완료 (read-only, 코드 미수정)
> **작성일**: 2026-06-16
> **대상 서비스**: KPA-Society / GlycoPharm / K-Cosmetics
> **제외**: Neture (요구사항에 따라 조사 대상 제외)
> **연관 규칙**: CLAUDE.md §1 (Shared Module Change Rule), §11 (Operator Dashboard 표준), §13 (O4O 공통 구조 — Forum은 플랫폼 공통 구조)

---

## 0. 목표

KPA-Society / GlycoPharm / K-Cosmetics 3서비스의 **operator Forum 메뉴**와 **Forum 관련 화면**을 조사·비교하여, 동일한 UI-UX 구조로 정렬 가능한지 판단한다. 본 작업은 read-only 조사이며 코드를 수정하지 않는다.

---

## 1. 조사한 파일 목록

### Menu config
- `services/web-kpa-society/src/config/operatorMenuGroups.ts`
- `services/web-glycopharm/src/config/operatorMenuGroups.ts`
- `services/web-k-cosmetics/src/config/operatorMenuGroups.ts`

### Routes
- `services/web-kpa-society/src/.../OperatorRoutes.tsx` (KpaOperatorLayoutWrapper 하위)
- `services/web-glycopharm/src/App.tsx`
- `services/web-k-cosmetics/src/App.tsx`

### Forum 관련 page/component
- KPA: `OperatorForumPage.tsx`, `ForumRequestsManagementPage.tsx`, `ForumCategoriesManagementPage.tsx`, `ForumDeleteRequestsPage.tsx`, `ForumAnalyticsDashboard.tsx`
- GlycoPharm: `ForumRequestsPage.tsx`, `ForumDeleteRequestsPage.tsx`, `ForumAnalyticsPage.tsx`, `CommunityManagementPage.tsx`
- K-Cosmetics: `ForumRequestsPage.tsx`, `ForumDeleteRequestsPage.tsx`, `ForumAnalyticsPage.tsx`

### 공통 컴포넌트
- `@o4o/operator-core-ui/modules/forum-requests` → `OperatorForumRequestsConsolePage`
- `@o4o/operator-core-ui/modules/forum-delete-requests` → `OperatorForumDeleteRequestsConsolePage`
- `@o4o/operator-ux-core` → DataTable / useBatchAction / defineActionPolicy / buildRowActions

> ⚠️ **Working tree 주의**: 조사 시점에 `services/web-glycopharm/src/config/operatorMenuGroups.ts` 가 **다른 세션에서 수정 중**(uncommitted). 해당 변경은 `커뮤니티 관리`(`/operator/community`) 항목을 **Forum 그룹에서 제거**하고 content 그룹의 `Home 편집`으로 이동시킨다. 따라서 사용자 스크린샷(커뮤니티 관리 포함)은 **HEAD(커밋) 상태**이고, working tree는 이미 정리가 진행 중이다. 본 IR은 이 in-flight 정리 결과를 "정상 방향"으로 간주하고 비교한다.

---

## 2. 서비스별 Forum 메뉴 비교표

> group key 는 3서비스 모두 `forum`. icon / capability / adminOnly 는 3서비스 모든 항목에서 **미정의**(menu config 레벨에 값 없음). 따라서 아래 표는 label / path / order 중심.

| 순서 | KPA-Society | GlycoPharm (working tree) | K-Cosmetics |
|:---:|---|---|---|
| 1 | **포럼 운영** → `/operator/forum` | **포럼 신청** → `/operator/forum-requests` | **포럼 신청** → `/operator/forum-requests` |
| 2 | **포럼 신청 관리** → `/operator/forum-requests` | **포럼 삭제 요청** → `/operator/forum-delete-requests` | **삭제 요청** → `/operator/forum-delete-requests` |
| 3 | **포럼 목록 관리** → `/operator/forum-categories` | **포럼 분석** → `/operator/forum-analytics` | **포럼 분석** → `/operator/forum-analytics` |
| 4 | **삭제 요청** → `/operator/forum-delete-requests` | — | — |
| 5 | **포럼 분석** → `/operator/forum-analytics` | — | — |

**참고**: GlycoPharm HEAD(스크린샷) 상태에는 3번 자리에 `커뮤니티 관리`(`/operator/community`)가 있었으나 working tree에서 content 그룹 `Home 편집`으로 이동됨 → Forum 그룹에서 제거.

### 라벨 drift 요약

| 기능 | KPA | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| 신청 검토 | 포럼 신청 **관리** | 포럼 신청 | 포럼 신청 |
| 삭제 요청 | **삭제 요청** | **포럼** 삭제 요청 | **삭제 요청** |
| 분석 | 포럼 분석 | 포럼 분석 | 포럼 분석 ✅ 일치 |
| 운영 허브 | 포럼 운영 | ❌ 없음 | ❌ 없음 |
| 목록 관리 | 포럼 목록 관리 | ❌ 없음 | ❌ 없음 |

→ **분석(포럼 분석)을 제외하면 3서비스 라벨이 모두 다르다.** KPA만 2개 항목(운영/목록 관리)을 추가로 보유.

---

## 3. 서비스별 Forum route/page 비교표

| 논리 기능 | KPA route → component | GlycoPharm route → component | K-Cosmetics route → component |
|---|---|---|---|
| 운영 허브 | `/operator/forum` → **OperatorForumPage** (대시보드 hub) | ❌ 없음 | ❌ 없음 |
| 신청 검토 | `/operator/forum-requests` → ForumRequestsManagementPage | `/operator/forum-requests` → ForumRequestsPage | `/operator/forum-requests` → ForumRequestsPage |
| 목록(카테고리) 관리 | `/operator/forum-categories` → **ForumCategoriesManagementPage** | ❌ 없음 | ❌ 없음 |
| 삭제 요청 | `/operator/forum-delete-requests` → ForumDeleteRequestsPage | `/operator/forum-delete-requests` → ForumDeleteRequestsPage | `/operator/forum-delete-requests` → ForumDeleteRequestsPage |
| 분석 | `/operator/forum-analytics` → ForumAnalyticsDashboard | `/operator/forum-analytics` → ForumAnalyticsPage | `/operator/forum-analytics` → ForumAnalyticsPage |
| legacy redirect | `/operator/forum-management` → redirect → `/operator/forum-requests` | (이미 제거됨 — orphan removal WO) | (없음) |
| base `/operator/forum` | ✅ OperatorForumPage 렌더 | ❌ route 없음 (404 → NotFound) | ❌ route 없음 (404 → NotFound) |

### 공통 컴포넌트 사용 현황

| 화면 | 공통화 상태 |
|---|---|
| **신청 검토** (forum-requests) | ✅ **3서비스 모두** `OperatorForumRequestsConsolePage` (`@o4o/operator-core-ui`) 래핑 — service adapter만 다름 |
| **삭제 요청** (forum-delete-requests) | ✅ **3서비스 모두** `OperatorForumDeleteRequestsConsolePage` (`@o4o/operator-core-ui`) 래핑 |
| **분석** (forum-analytics) | ⚠️ **미공통화** — 3서비스 각각 별도 파일(ForumAnalyticsDashboard / ForumAnalyticsPage ×2). KPI 6종 + 30일 트렌드 + 활동 피드 **구조는 동일**, 코드 복제 + accent color만 다름 |
| **운영 허브** (OperatorForumPage) | KPA only — DataTable + ActionBar 등 `@o4o/ui`·`operator-ux-core` 사용하나 화면 자체는 KPA 전용 |
| **목록 관리** (ForumCategoriesManagementPage) | KPA only — `@o4o/ui` + `operator-ux-core` 사용하나 화면 자체는 KPA 전용 |

---

## 4. 메뉴와 route 불일치 여부

| 항목 | 상태 |
|---|---|
| 메뉴 있는데 route/page 없음 | (GlycoPharm HEAD의 `커뮤니티 관리`→`/operator/community` 가 dead link 위험이었음. working tree에서 Forum 그룹 밖으로 이동 처리 중. K-Cosmetics는 과거 `/operator/community` dead link를 이미 제거한 주석 존재) |
| route/page 있는데 메뉴 없음 | KPA `/operator/forum`(base)·`/operator/forum-management`(legacy redirect)는 메뉴에 노출되지 않으나 hub 내부 네비게이션/legacy 보존 목적 → 정상 |
| 서비스별로만 존재 | KPA: `/operator/forum`(운영 허브), `/operator/forum-categories`(목록 관리) — GP/KCos에 route·page·메뉴 모두 부재 |

→ **현재 시점 명백한 dead link는 working tree 정리로 해소되는 방향**. 핵심 불일치는 "KPA에만 운영 허브 + 목록 관리가 존재"하는 구조적 차이.

---

## 5. 기능 역할 정리 (코드 기준)

| 라벨 | 실제 기능 |
|---|---|
| **포럼 운영** (KPA `/operator/forum`) | Forum 도메인 **진입 허브**. KPI 카드(전체/활성 포럼·게시글·대기 신청·삭제 요청), 관리 바로가기, 최근 게시글 테이블(bulk delete). hub-and-spoke 네비게이션. |
| **포럼 신청 / 포럼 신청 관리** | 회원이 올린 **포럼(카테고리) 생성 요청** 검토 콘솔. 승인/거절/보완요청. 3서비스 공통 컴포넌트. |
| **포럼 목록 관리** (KPA `/operator/forum-categories`) | **생성된 포럼 카테고리 목록** 관리. 태그 편집, 활성/비활성 토글, 비활성 항목 hard delete, 게시글 수 표시. KPA 전용. |
| **삭제 요청 / 포럼 삭제 요청** | 포럼 **소유자의 삭제 요청** 검토 콘솔. 승인/반려(+코멘트), 배치 처리. 3서비스 공통 컴포넌트. |
| **커뮤니티 관리** (GlycoPharm) | Forum이 아니라 **Home/커뮤니티 편집기**(Hero 광고/페이지 광고/스폰서 CRUD). 본질적으로 content 영역 → working tree에서 content `Home 편집`으로 이동 중. **Forum 그룹 소속이 잘못된 케이스.** |
| **포럼 분석** | KPI 6종 + 30일 요청/승인 트렌드 + 최근 활동 피드. 3서비스 구조 동일(코드 복제). |

**중복 판정**: `포럼 운영`(hub)과 `포럼 목록 관리`(categories)는 **중복 아님** — 운영=요약 대시보드/진입점, 목록 관리=카테고리 CRUD 실무 화면. 단 운영 허브 KPI와 분석 KPI는 상당 부분 겹침(중복 후보).

---

## 6. KPA / GlycoPharm / K-Cosmetics 차이 원인

1. **KPA = reference implementation** (CLAUDE.md §13). Forum 공통 구조가 KPA 기준으로 가장 먼저·풍부하게 구현됨 → `포럼 운영` 허브 + `포럼 목록 관리`까지 보유.
2. **GP/KCos = 후발 부분 이식**. 공통화된 콘솔(신청/삭제요청)과 분석만 이식하고 **운영 허브·목록 관리는 미이식**. 따라서 base `/operator/forum`도 없음.
3. **GlycoPharm `커뮤니티 관리` = 잘못된 그룹 배치(과거 잔재)**. Forum 그룹에 들어가 있었으나 실제로는 Home 편집기. working tree에서 정리 중.
4. **라벨 drift = 개별 WO 누적**. 각 서비스가 독립 WO로 메뉴를 만들며 `관리` 접미사 유무, `포럼` 접두사 유무가 제각각 굳어짐.

→ **대부분 실기능 차이가 아니라 "이식 미완 + 라벨 표준 부재"의 잔재.** 단 `포럼 운영`/`포럼 목록 관리`는 실제 기능이며 GP/KCos에 의도적으로 필요한지 별도 판단 필요(아래 §13).

---

## 7. Canonical Forum 메뉴 구조 제안

3서비스 공통 운영 모델이 동일(신청 검토 / 삭제 요청 / 분석 + 운영 허브)하므로 **KPA를 canonical 기준**으로 정렬 권장.

### 권장안 A — Full Parity (KPA 기준 5항목)
| 순서 | canonical label | path |
|:---:|---|---|
| 1 | 포럼 운영 | `/operator/forum` |
| 2 | 포럼 신청 관리 | `/operator/forum-requests` |
| 3 | 포럼 목록 관리 | `/operator/forum-categories` |
| 4 | 삭제 요청 | `/operator/forum-delete-requests` |
| 5 | 포럼 분석 | `/operator/forum-analytics` |

→ GP/KCos에 `포럼 운영`·`포럼 목록 관리` 화면 이식 필요(공통 컴포넌트 추출 전제).

### 권장안 B — Minimal Parity (라벨/순서만 우선 정렬, 저위험)
| 순서 | canonical label | path |
|:---:|---|---|
| 1 | 포럼 신청 관리 | `/operator/forum-requests` |
| 2 | 삭제 요청 | `/operator/forum-delete-requests` |
| 3 | 포럼 분석 | `/operator/forum-analytics` |

→ 3서비스 즉시 정렬 가능(이미 route·page·공통 콘솔 존재). KPA의 `포럼 운영`/`포럼 목록 관리`는 별도 단계로 GP/KCos 이식 결정.

**권장**: **B를 1차로 적용**(저위험·즉시), 운영 허브/목록 관리 parity(A)는 후속 단계에서 공통 컴포넌트 추출과 함께 진행.

라벨 표준 후보: 신청=`포럼 신청 관리`, 삭제=`삭제 요청`(또는 `포럼 삭제 요청`), 분석=`포럼 분석`. (3서비스 통일이 목적이므로 어느 쪽이든 1개로 고정)

---

## 8. 기본 진입 화면 제안

- `/operator/forum` (base) 는 **3서비스 모두 `포럼 운영`(Forum dashboard)으로 진입**하는 것이 적절. 현재 KPA만 존재 → GP/KCos는 운영 허브가 없어 base route 자체가 404.
- 운영 허브 이식 전까지의 **임시 대안**: GP/KCos `/operator/forum` → `/operator/forum-requests` redirect alias(첫 actionable 화면). GlycoPharm 대시보드 Quick Action도 이미 `포럼 신청 관리`(forum-requests)를 기본 진입으로 사용 중.
- `/operator/forum-analytics` 는 **분석 전용으로 유지**. 기본 진입 화면으로 쓰지 않는다(현재 GP/KCos는 base가 없어 사용자가 분석으로 바로 들어가는 듯 보이는 것은 메뉴 첫 항목/대시보드 링크 차이 때문이지, analytics가 default여서가 아님).
- 사용자 스크린샷의 "GlycoPharm이 forum-analytics로 바로 들어간 상태"는 **base hub 부재 + 메뉴 구성 차이**의 증상으로 해석됨.

---

## 9. UI 공통화 필요 범위

| 대상 | 공통화 상태 / 필요 |
|---|---|
| 신청 검토 콘솔 | ✅ 이미 공통(`@o4o/operator-core-ui`) — 추가 작업 불필요 |
| 삭제 요청 콘솔 | ✅ 이미 공통 — 추가 작업 불필요 |
| 분석 화면 | ⚠️ 구조 동일·코드 복제. 공통 컴포넌트 추출 권장(중위험) |
| 운영 허브 | ❌ KPA 전용. GP/KCos parity 원하면 공통 컴포넌트 추출 필요(중~고위험, KPI API 의존) |
| 목록 관리 | ❌ KPA 전용. parity 원하면 공통화 필요(중위험) |
| 메뉴 라벨/순서 | ⚠️ config만 수정하면 즉시 정렬 가능(저위험) |

---

## 10. 라벨/순서만 수정 가능한 항목 (저위험)

- 3서비스 `operatorMenuGroups.ts` 의 forum 그룹 **label / 순서** 통일.
- GlycoPharm `포럼 삭제 요청` → `삭제 요청` (또는 3서비스를 `포럼 삭제 요청`으로) — 1개로 고정.
- GlycoPharm/K-Cos `포럼 신청` → `포럼 신청 관리` (KPA 기준).
- **route·page·API 변경 없이 config만 수정** → 즉시 가능. (CLAUDE.md §1 Shared Module Rule: 3서비스 동시 검증 필수)

---

## 11. route alias/redirect가 필요한 항목

- GP/KCos `/operator/forum` (base) → 운영 허브 이식 전까지 `/operator/forum-requests` 로 redirect alias 추가 권장(404 방지, 진입 통일).
- KPA `/operator/forum-management` → `/operator/forum-requests` redirect는 이미 존재(legacy 보존, 유지).
- GlycoPharm `/operator/community` 는 working tree 정리로 content(`Home 편집`)로 이동 → Forum 그룹 alias 불필요.

---

## 12. 공통 컴포넌트 추출 필요 여부

| 컴포넌트 | 판정 |
|---|---|
| ForumRequestsConsole | 이미 추출 완료 ✅ |
| ForumDeleteRequestsConsole | 이미 추출 완료 ✅ |
| **ForumAnalytics** | 추출 **권장** — 3서비스 구조 동일, 복제 코드 3벌. `@o4o/operator-core-ui/modules/forum-analytics` 후보 |
| **OperatorForumPage (운영 허브)** | parity 결정 시 추출 필요. KPI/바로가기/최근 게시글 테이블을 공통 컴포넌트 + service adapter 패턴으로 |
| **ForumCategoriesManagement (목록 관리)** | parity 결정 시 추출 필요 |

→ **기준은 KPA 화면을 공통 컴포넌트로 추출 → GP/KCos는 service adapter만 주입** (이미 신청/삭제요청에서 검증된 패턴). 새 canonical을 새로 만들 필요 없음.

---

## 13. 후속 WO 후보

| WO 후보 | 범위 | 위험도 | 선행조건 |
|---|---|:---:|---|
| **WO-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-LABEL-ORDER-PARITY-V1** | 3서비스 forum 그룹 label/순서 통일 (config only) | 저 | GlycoPharm working tree 커밋 정리 후 |
| **WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ROUTE-ALIAS-PARITY-V1** | GP/KCos `/operator/forum` base redirect alias 추가, 진입 통일 | 저~중 | 위 WO |
| **WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-UI-COMMONIZATION-V1** | forum-analytics 공통 컴포넌트 추출(복제 3벌 → 1) | 중 | — |
| **WO-O4O-CROSSSERVICE-OPERATOR-FORUM-DASHBOARD-UI-PARITY-V1** | 운영 허브(OperatorForumPage) 공통화 + GP/KCos 이식 | 중~고 | KPI/API 영향 검증 |
| **WO-O4O-CROSSSERVICE-OPERATOR-FORUM-CATEGORIES-PARITY-V1** | 목록 관리(ForumCategories) 공통화 + GP/KCos 이식 (필요 결정 후) | 중 | parity 필요성 판단 |

> §13 마지막 2개(운영 허브/목록 관리 이식)는 "GP/KCos에 실제로 필요한가" 사업 판단이 선행되어야 한다. 단순 잔재가 아니라 실기능이므로, parity를 강제하기 전에 GlycoPharm/K-Cosmetics 운영자가 해당 화면을 필요로 하는지 확인 필요.

---

## 14. 권장 진행 순서

1. **GlycoPharm working tree 정리 커밋 선완료** (다른 세션의 content/forum 그룹 변경) — 본 IR과 충돌 방지.
2. **메뉴 라벨/순서 parity** (LABEL-ORDER WO, 저위험) — 즉시 정렬, 3서비스 동시 검증.
3. **base `/operator/forum` redirect alias** (ROUTE-ALIAS WO) — 진입 통일, 404 제거.
4. **forum-analytics 공통화** (ANALYTICS WO) — 복제 제거.
5. (사업 판단 후) **운영 허브 / 목록 관리 parity** — 공통 컴포넌트 추출 → GP/KCos 이식.

---

## 15. 최종 판정

- **신청 검토 / 삭제 요청 콘솔은 이미 3서비스 공통화 완료** → Forum UI-UX 공통화의 핵심 토대는 이미 존재.
- 현재 불일치의 실체는 **(a) 메뉴 라벨/순서 drift, (b) KPA에만 있는 운영 허브·목록 관리, (c) base `/operator/forum` 부재, (d) forum-analytics 코드 복제** 4가지이며, **대부분 "이식 미완 + 라벨 표준 부재" 잔재**이지 의도된 서비스별 기능 차이가 아니다(단 운영 허브·목록 관리의 GP/KCos 필요성은 사업 판단 필요).
- **단순 메뉴명 변경만으로는 부족하다.** `/operator/forum` 기본 진입(운영 허브) 부재와 forum-analytics 복제까지 다뤄야 진정한 parity가 된다.
- **권장**: 저위험 LABEL-ORDER + ROUTE-ALIAS WO를 1차로 진행하여 즉시 가시적 정합을 확보하고, ANALYTICS 공통화 → (사업 판단 후) DASHBOARD/CATEGORIES parity 순으로 단계적 진행. canonical 기준은 **KPA(reference implementation)** 를 채택하고, 신규 canonical을 새로 만들지 않는다.

---

*본 문서는 read-only 조사 결과이며 코드/메뉴/route/API를 변경하지 않았다.*
