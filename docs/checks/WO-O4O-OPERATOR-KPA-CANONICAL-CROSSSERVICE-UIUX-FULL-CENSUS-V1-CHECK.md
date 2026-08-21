# WO-O4O-OPERATOR-KPA-CANONICAL-CROSSSERVICE-UIUX-FULL-CENSUS-V1 — CHECK

- **작업일**: 2026-08-21
- **기준 커밋**: `5e3b3f205` (`HEAD == origin/main`, 작업트리 clean)
- **성격**: **조사 전용** — 코드 / DB / API 변경 0건
- **Canonical**: KPA-Society Operator
- **비교 대상**: Neture · K-Cosmetics · GlycoPharm · PharmacyHub

---

## 0. 모집단 산출 근거 (과거 census 미재사용)

기존 WO·census 숫자를 재사용하지 않고 `origin/main` 현재 상태에서 새로 산출했다.

| 축 | 산출 경로 | 결과 |
|---|---|---|
| route | `services/web-kpa-society/src/routes/OperatorRoutes.tsx`, 나머지 4개는 `src/App.tsx` 의 `/operator` 서브트리 | KPA 65 · GlycoPharm 64 · K-Cosmetics 49 · Neture 34 · PharmacyHub 12 |
| menu | `services/*/src/config/operatorMenuGroups.ts` | KPA 37 · Neture 68(admin 혼재) · GlycoPharm 36 · K-Cosmetics 30 · PharmacyHub 10 |
| page | `services/*/src/pages/operator/**/*.tsx` | 203 파일 (GP 59 · KPA 55 · KCos 45 · Neture 32 · PH 12) |
| common 소비처 | `@o4o/operator-core-ui/modules/*` deep import · `@o4o/operator-ux-core` · `@o4o/ui` table primitive | 아래 §3 |

> route 수는 `:id` · redirect · index 를 포함한 **URL 단위**이고, 판정 모집단은 이를 **업무 단위**로
> 접은 뒤 서비스 5축을 곱한 값이다 (§5).

---

## 1. KPA canonical UI/UX 패턴 (실측 확정)

### 1-1. 공통 primitive 정본 위치

| 계층 | 위치 | 구성 |
|---|---|---|
| 표준 리스트 | `packages/operator-ux-core/src/list/` | `DataTable` · `SearchBar` · `Pagination` · `useBatchAction` · `action-policy` · `delete-policy` |
| 표준 리스트(신) | `packages/operator-ux-core/src/list/standard/` | `StandardListToolbar` · `useStandardListQuery` · `normalizePaginatedResponse` |
| 테이블 상호작용 | `packages/ui/src/components/table/` | `ActionBar` · `BulkResultModal` · `RowActionMenu` · `ConfirmActionDialog` · `BaseDetailDrawer` · `SelectionTable` · `FilterBar` · `BaseTable` |
| 업무 모듈 | `packages/operator-core-ui/src/modules/` | 30개 모듈 (forum-hub · members · signage-hq · hub-content-list/write · qr-template-write · stores · store-detail · store-channels · resources · cms-content · guide-contents · lms-courses · surveys · contact-inquiry · operator-analytics · service-legal · product-applications · recruitment-exposure 등) |
| 셸 · IA | `packages/operator-ux-core/src/layout/OperatorAreaShell.tsx` · `sidebar/DomainIASidebar.tsx` · `sidebar/operatorDomainIA.ts` | 5개 서비스 전부 채택 |

### 1-2. KPA canonical 작업 흐름 (브라우저 실측)

`/operator/members` · `/operator/signage/hq-media` 에서 확인한 전체 체인:

```
DomainIASidebar(커뮤니티 운영 / 매장 HUB 운영 / 운영 공통)
 → KPI 4-tile
 → SearchBar
 → 상태 tab (전체 6 / 약사 5 / 약대생 0)
 → DataTable [select-all checkbox | 액션(⋮ RowActionMenu) | …컬럼 | StatusBadge]
 → 선택 시 ActionBar  "N개 선택 · 정지 (N) · 탈퇴 처리 (N) · 선택 해제"
 → ConfirmActionDialog → useBatchAction → BulkResultModal
 → 행 클릭 / RowActionMenu → BaseDetailDrawer 또는 Detail Page
```

### 1-3. KPA 자체의 canonical 이탈 (숨기지 않고 기록)

| 화면 | 이탈 내용 |
|---|---|
| `LegalManagementPage.tsx` (323줄) | 공통 패키지 import 0. `service-legal` 모듈이 있는데 미사용 |
| `OperatorContentDetailPage.tsx` (326줄) | 공통 primitive 0 |
| `event-offer/EventOfferManagePage.tsx` (1082줄) | `ConfirmActionDialog` 만 사용. DataTable/Selection/ActionBar 미사용 — 5개 서비스 통틀어 최대 단일 파일 |
| `signage/AiContentGenerationModal.tsx` (457줄) | 공통 primitive 0 |
| `multilingual-product-content/…WritePage.tsx` (424줄) | 공통 primitive 0 |
| `AuditLogPage.tsx` (333줄) | `DataTable`+`Pagination` 만. Search/Filter/Selection/RowAction 없음 |
| `KpaEditUserModal` | 공통 패키지 **안에** KPA 전용 fork 존재 (`CommonEditUserModal` 과 병존) |

---

## 2. 브라우저 실측 (production, read-only)

### 2-1. 실측 조건과 한계 — **숨기지 않고 기록**

| 항목 | 상태 |
|---|---|
| 5개 operator 콘솔 도달성 | ✅ 전부 HTTP 200 (`kpa-society.co.kr` · `glycopharm.co.kr` · `k-cosmetics.site` · `neture.co.kr` · `pharmacyhub.co.kr`) |
| **웹 폼 로그인** | ❌ **불가** — 웹 폼은 `serviceKey` 를 보내 L2(`service_credentials`) 로 판정되는데, `docs/local/TEST-ACCOUNTS.local.md §2` 기준 **(계정 × 5서비스) L2 비밀번호가 전부 unknown** |
| 실제 사용한 채널 | L1(`serviceKey` 없음) 로그인 → accessToken 획득 → `localStorage` 주입 (TEST-ACCOUNTS §124-132 문서화된 우회) |
| 계정 | `sohae2100@gmail.com` (L1 200, 비밀번호는 env 주입 — 본 문서·로그에 미기록) |
| production write | 0건 (조회 · select-all 토글만. 저장/승인/삭제 미실행) |
| viewport | desktop 1440×900 · mobile 390×844 |
| 수집량 | 46 화면 관측 + 10 상호작용 관측, 스크린샷 56장 |

> **주의**: L1 토큰 주입은 "로그인 성공"과 동치가 아니다. 화면 렌더·컬럼·selection 동작은
> 실측했으나, **서비스별 로그인 경로 자체의 UX 는 이번에 검증하지 못했다.**

### 2-2. 회원 관리 — desktop 1440×900 실측 컬럼

| 서비스 | 컬럼 | checkbox | 선택 후 ActionBar |
|---|---|:---:|---|
| **KPA (canonical)** | `☐ · 액션 · 이름▴ · 이메일▴ · 유형 · 활동 유형 · 추가 권한 · 가입일▴ · 상태` | 7 | `6개 선택 / 정지 (6) / 탈퇴 처리 (6) / 선택 해제` |
| GlycoPharm | `☐ · 액션 · 이름 · 이메일▴ · 회원 유형 · 운영 권한 · 가입일▼ · 상태` | 5 | `4개 선택 / 정지 (4) / 탈퇴 처리 (4) / 선택 해제` |
| K-Cosmetics | `☐ · 액션 · 이름 · 이메일▴ · 회원 유형 · 운영 권한 · 가입일▼ · 상태` | 6 | `5개 선택 / 정지 (5) / 탈퇴 처리 (5) / 선택 해제` |
| Neture | `☐ · 액션 · 이름 · 이메일▴ · 회원 유형 · 회사명 · 공급자 프로필 · 가입일▼ · 상태` | 8 | `7개 선택 / 정지 (7) / 탈퇴 처리 (7) / 선택 해제` |
| **PharmacyHub** | `이름 · 이메일▴ · 회원 유형 · 운영 권한 · 가입일▼ · 상태` | **0** | **없음 (선택 자체 불가)** |

→ 4개 서비스는 selection→ActionBar 어휘까지 완전 동일. **PharmacyHub 만 selection/bulk/row-action 부재.**
   원인은 사고가 아니라 `MembersPage.tsx` 주석의 의도적 미주입("파괴적 액션은 주입하지 않는다").

### 2-3. 사이니지 HQ 미디어 — canonical vs GlycoPharm (VIEW_DUPLICATED 실증)

| | KPA / K-Cosmetics | GlycoPharm |
|---|---|---|
| 컬럼 | `☐ · 액션 · 이름 · 타입 · 소스 · 상태 · 생성일` | `미리보기 · 제목 · 소스 · 상태 · 사용 여부 · 생성일 · ∅` |
| checkbox | 6 / 1 | **0** |
| RowActionMenu | ✅ ⋮ | ❌ |
| 검색 | 공통 SearchBar | 자체 SearchBar + 필터칩(전체/활성/초안/대기/아카이브) |
| StatusBadge | `활성` + `HUB 노출 중` 2단 | `상태`/`사용 여부` 2컬럼 분리 |
| empty state | — (데이터 5건) | "HQ 미디어가 없습니다 / + 첫 미디어 등록" |
| 코드 | `@o4o/operator-core-ui/modules/signage-hq` thin wrapper 23줄 | 자체 구현 571줄, 공통 primitive 0 |

### 2-4. 404 / deep link + refresh

- 5개 서비스 전부 `/operator/<bogus>` → HTTP 200 + **동일한 공통 404 화면**
  ("404 / 요청하신 페이지를 찾을 수 없습니다 / 홈으로 이동 / 이전 화면으로 돌아가기") → **FULLY_COMMON**
- deep link 직접 진입 + refresh: 46/46 화면 전부 정상 렌더, `/login` 튕김 0건

### 2-5. mobile 390×844 — **cross-service 공통 결함**

- 셸은 반응형 정상: sidebar → "운영자 메뉴" 접이식 + 하단 탭바
- **그러나 DataTable 컬럼이 desktop 과 100% 동일** (5개 서비스 · 23개 화면 전수 일치).
  card 전환 · 컬럼 우선순위 · horizontal scroll container 없음 → 390px 에서 **테이블이 화면 밖으로 잘림**
  (KPA `/operator/members` 는 `이름` 컬럼에서 절단, 나머지 6컬럼 접근 불가)
- 이는 특정 서비스 drift 가 아니라 **공통 `DataTable` 자체의 미구현**이다 → §10 3차 WO 로 분리

> 부수 관측: KPA `/operator/members` 회원 1건의 이름이 `◆◆◆◆◆` 로 깨져 렌더된다 (인코딩 아티팩트).
> 본 WO 범위 밖이므로 수정하지 않고 보고만 한다.

---

## 3. 공통 모듈 채택 매트릭스 (`@o4o/operator-core-ui/modules/*` deep import 수)

| 모듈 | KPA | Neture | K-Cos | GlycoPharm | PH |
|---|:--:|:--:|:--:|:--:|:--:|
| forum-requests / forum-categories / forum-delete-requests / forum-analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| forum-hub | ✅ | ❌ | ✅ | ✅ | ✅ |
| community-home | ✅ | ✅ | ❌ | ✅ | ❌ |
| members | ✅ | ✅ | ✅ | ✅ | ✅ |
| service-legal / service-contact-settings | ✅ | ✅ | ✅ | ✅ | ✅ / ❌ |
| operator-analytics | ✅ | ✅ | ❌ | ❌ | ✅ |
| guide-contents | ✅ | ✅ | ✅ | ✅ | ❌ |
| cms-content / resources | ✅ | ❌ | ✅ | ✅ | ❌ |
| operator-content-hub | ✅ | ❌ | ❌ | ✅ | ❌ |
| **signage-hq** | ✅ ×18 | ❌ | ✅ ×18 | **❌** | ❌ |
| **hub-content-list / hub-content-write** | ✅ ×10 | ❌ | ✅ ×10 | **❌** | ❌ |
| **qr-template-write** | ✅ ×3 | ❌ | ✅ ×3 | **❌** | ❌ |
| store-detail / store-channels | ✅ | ❌ | ✅ | **❌** | ❌ |
| recruitment-exposure | ✅ | ❌ | ✅ | (ux-core 경유) | ❌ |
| contact-inquiry | ❌ | ❌ | ✅ | ✅ | ❌ |
| product-applications | ✅ | ❌ | ✅ | ✅ | ❌ |
| lms-courses / surveys | ✅ | ❌ | ✅ | 부분 | ❌ |

**핵심 신호**: GlycoPharm 은 signage · blog/POP/QR · store-detail · store-channels · surveys 를
**공통 모듈이 존재함에도 전부 자체 구현**하고 있다. K-Cosmetics 는 KPA 와 거의 완전 동형이다.

---

## 4. 업무군별 상세 판정표

범례: **FC** FULLY_COMMON · **UD** UX_DRIFT · **VD** VIEW_DUPLICATED · **SS** SERVICE_SPECIFIC · **NA** NOT_APPLICABLE · **NI** NOT_IMPLEMENTED

### A. 회원 / 가입 (6 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| A1 | 회원 관리 목록 | FC | FC | FC | FC | **UD** | PH 만 selection/bulk/RowAction 미주입(의도적) — 실측 cb=0 |
| A2 | 회원 상세 | FC | FC | FC | FC | FC | 5개 전부 `@o4o/ui` UserDetailPage wrapper (52~86줄) |
| A3 | 회원 수정 모달 | **UD** | FC | FC | FC | NA | 공통 패키지 안에 `KpaEditUserModal` fork 병존 |
| A4 | 가입 신청 승인 | NA | **VD** | **VD** | **VD** | FC | PH 만 공통 `consoleMode='approval'` 채택. 나머지 3개는 각자 구현(880/255/284줄) |
| A5 | 가입 신청 상세 | NA | **VD** | NA | **VD** | FC | Neture 1249줄 · GP 391줄 자체 구현 |
| A6 | 회원 삭제/탈퇴 플로우 | FC | FC | FC | FC | NA | `OperatorMemberDeleteFlow` 공통 |

### B. 커뮤니티 / 포럼 (6 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| B1 | 포럼 운영 허브 | FC | **VD** | FC | FC | FC | Neture 만 자체 `ForumManagementPage`(50줄). KPA=쓰기가능/others=read-only 는 권한경계(정상) |
| B2 | 포럼 신청 관리 | FC | FC | FC | FC | FC | KPA 만 `유형/태그` 컬럼 1개 추가 (실측) |
| B3 | 포럼 목록 관리 | FC | FC | FC | FC | FC | |
| B4 | 삭제 요청 | FC | **UD** | FC | FC | FC | Neture 는 `/forum-delete` · `/forum-delete-requests` 2 URL 이 같은 페이지 |
| B5 | 포럼 분석 | FC | FC | FC | FC | FC | |
| B6 | Home 편집(community-home) | FC | FC | NA | FC | NA | |

### C. 콘텐츠 / 자료 (5 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| C1 | 공지사항/뉴스(CMS) | FC | NI | FC | FC | NI | Neture·PH 는 커뮤니티 보유 서비스인데 운영자 CMS 콘솔 없음 |
| C2 | 콘텐츠 허브 | FC | NI | NI | FC | NA | |
| C3 | 자료실 관리 | FC | NI | FC | FC | NI | |
| C4 | 안내 문구 관리 | FC | FC | FC | FC | NI | |
| C5 | 홈페이지 CMS | NA | **SS** | NA | NA | NA | Neture 고유(316줄) |

### D. 승인 업무 (8 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| D1 | 공급 상품 신청 승인 | FC | NA | FC | FC | NA | 공통 `ProductApplicationManagementConsole` |
| D2 | 공급자 콘텐츠 승인 | **UD** | NA | NA | NA | NA | KPA 전용 423줄, primitive 직접 조립 |
| D3 | 이벤트 오퍼 승인 | **UD** | NA | **VD** | **VD** | NA | KPA 1082줄 / KCos 275줄 / GP 221줄 — 3개 전부 별개 구현 |
| D4 | 판매자 모집 노출 승인 | FC | NA | FC | **UD** | NA | GP 만 ux-core Console 직접 호출(91줄) |
| D5 | 매장 가입/승인 | NA | NA | NA | **VD** | NA | GP `StoreApprovals` 421+838줄 자체 구현 |
| D6 | 공급자 승인 | NA | **SS** | NA | NA | NA | Neture 798줄 — 유일하게 `StandardListToolbar`+`useStandardListQuery` 신표준 사용 |
| D7 | 상품 승인 / 후보 검토 | NA | **SS** | NA | NA | NA | Neture 584+793+1168줄 |
| D8 | 강사 승인(자격) | FC | NA | NA | FC | NA | KPA 529줄 / GP 497줄 — **canonical 전체 체인 보유 화면** |

### E. 매장 (4 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| E1 | 매장 관리 목록 | FC | **VD** | FC | **UD** | **NI** | GP 는 core-ui+ux-core 혼용(192줄). PH 는 baseline §5 "매장 조회 KEEP" 인데 화면 없음 |
| E2 | 매장 상세 | FC | NA | FC | **VD** | NA | GP 419줄 자체 구현 |
| E3 | 채널 관리 | FC | NA | FC | **VD** | NA | GP 408줄 자체 구현 |
| E4 | 내 매장(콕핏) | NA | NA | **SS** | NA | NA | KCos 676줄 |

### F. 상품 / 주문 (3 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| F1 | 상품 현황 | FC | **SS** | FC | FC | NA | 공통 `OperatorProductStatusPage`. Neture 는 유통 원장이라 성격이 다름 |
| F2 | 상품 상세 | NA | NA | **VD** | **VD** | NA | KCos 309줄 · GP 387줄, 공통 primitive 0 |
| F3 | 주문 현황 | FC | **VD** | FC | FC | NA | Neture 454줄 자체 구현 |

### G. 사이니지 (4 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| G1 | HQ 미디어 | FC | NA | FC | **VD** | NA | GP 571+228줄. 브라우저 실측 §2-3 |
| G2 | HQ 플레이리스트 | FC | NA | FC | **VD** | NA | GP 310+101+286줄 |
| G3 | 템플릿 | FC | NA | FC | **VD** | NA | GP 119+187줄 |
| G4 | 강제 콘텐츠 | FC | NA | FC | **VD** | NA | GP 431줄 |

### H. QR / POP / 블로그 / 동영상 / 태블릿 / 다국어 (6 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| H1 | 매장 HUB 블로그 | FC | NA | FC | **VD** | NA | GP 450+252줄. **컬럼은 실측상 KPA 와 동일** — 시각 수렴·코드 중복 |
| H2 | 매장 HUB POP | FC | NA | FC | **VD** | NA | GP 442+254줄 |
| H3 | 매장 HUB QR | FC | NA | FC | **VD** | NA | GP 476+365줄 |
| H4 | 매장 HUB 동영상 | **UD** | NA | NI | NI | NA | KPA 전용 493+299줄. 공통 hub-content 모듈 미사용 |
| H5 | 다국어 상품 콘텐츠 | **UD** | NA | NI | NI | NA | KPA 전용 501+424줄 |
| H6 | 태블릿 화면(Screen Set) | **UD** | NA | NI | NI | NA | KPA 전용 262줄 |

### I. LMS / 설문 / 문의 (3 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| I1 | 강의 관리 | FC | NA | FC | **VD** | NI | GP `LmsCoursesPage` 226줄 + 공통 wrapper 27줄 **이중 존재** |
| I2 | 설문조사 관리 | FC | NA | FC | **VD** | NI | GP 224+270줄 자체 구현 |
| I3 | 문의 관리 | **NI** | **VD** | FC | FC | NI | KPA 는 `/admin/settings/contact` 설정만 있고 운영자 콘솔 없음. Neture 282줄 자체 |

### J. 대시보드 / 분석 / AI (5 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| J1 | Operator 대시보드 | FC | FC | FC | FC | FC | 5개 전부 `OperatorDashboardLayout`. nav 실측 KPA 10 / GP 9 / KCos 10 / Neture 10 / PH 5 |
| J2 | AI 리포트 | FC | FC | FC | FC | **NI** | 4개는 `@o4o/ui` 공통 + `aiReportConfig` 주입 |
| J3 | 운영 분석 | FC | FC | **NI** | **VD** | FC | KCos 는 route·page 자체가 없음. GP 는 329줄 자체 구현 |
| J4 | Action Queue | NA | **SS** | NA | NA | NA | Neture 225줄 |
| J5 | AI 사용량 / 정산 | NA | **SS** | NA | **SS** | NA | GP 394+378+353+891줄 · Neture ai-operations/asset-quality |

### K. 역할 / 감사 / 법정 / 설정 (4 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| K1 | 역할 관리 | FC | FC | FC | FC | FC | 5개 전부 `@o4o/ui` wrapper (16~32줄) — **가장 깨끗한 공통화** |
| K2 | 감사 로그 | **UD** | NI | NI | NI | NI | KPA 만 존재(333줄), Search/Selection 없음 |
| K3 | 법정정보·약관 | **UD** | FC | FC | FC | FC | KPA 만 공통 `service-legal` 미사용(323줄 자체) |
| K4 | 서비스 설정 | NA | FC | **VD** | **VD** | NA | KCos 161줄 · GP 513줄 자체 구현 |

### L. 셸 / 공통 UX (4 업무)

| # | 업무 | KPA | Neture | K-Cos | GP | PH | 비고 |
|:--:|---|:--:|:--:|:--:|:--:|:--:|---|
| L1 | Operator 셸 · 사이드바 | FC | FC | FC | FC | FC | 5개 전부 `OperatorAreaShell` + `DomainIASidebar` |
| L2 | Domain IA 구성 | FC | **SS** | FC | FC | **SS** | Neture=공급·유통/커머스·정산/커뮤니티·콘텐츠/운영공통, PH=가입·회원/커뮤니티/공통 (정당한 주입) |
| L3 | 404 / deep link | FC | FC | FC | FC | FC | 실측 5/5 동일 |
| L4 | mobile 반응형 리스트 | **NI** | **NI** | **NI** | **NI** | **NI** | 5개 전부 컬럼 미축약 — 공통 DataTable 미구현 |

---

## 4-A. 업무군 단위 요약 (KPA canonical / drift / 난이도 / API 차이 / 즉시 가능)

| 업무군 | KPA canonical 패턴 | 서비스별 drift | 공통화 난이도 | API·데이터 모델 차이 | 바로 공통화 |
|---|---|---|:---:|---|:---:|
| **A 회원/가입** | `OperatorMembersConsolePage` + selection→ActionBar(정지/탈퇴) + `@o4o/ui` UserDetailPage | PH selection 미주입 · 가입승인 3서비스 각자 구현 · KPA EditUserModal fork | **상** | 승인 대상 엔티티가 서비스마다 다름(`registration_requests` / 서비스별 application / `service_memberships`) | ❌ |
| **B 커뮤니티/포럼** | `modules/forum-*` 5종 전부 thin wrapper | Neture 만 forum-hub 미채택 · 삭제요청 2 URL | **하** | 없음 — 공통 `/api/v1/forum/operator/*` | ✅ (Neture 1건) |
| **C 콘텐츠/자료** | `cms-content` · `operator-content-hub` · `resources` · `guide-contents` | Neture/PH 다수 미구현 | **중** | Neture 는 CMS 축 자체가 다름(HomepageCms) | 부분 |
| **D 승인** | `ProductApplicationManagementConsole` + `recruitment-exposure` | 이벤트오퍼 3서비스 별개 · GP 매장승인 자체 축 · Neture 승인 3종 고유 | **상** | 승인 도메인이 서비스마다 상이. F12 Product Resource 정합 필요 | ❌ |
| **E 매장** | `modules/stores` · `store-detail` · `store-channels` | GP 상세·채널 자체 구현 · Neture 자체 · PH 미구현 | **하** | 없음 (GP·KPA·KCos 동일 backend) | ✅ (GP 2건) |
| **F 상품/주문** | `OperatorProductStatusPage` · `OperatorOrderStatusPage` | Neture 주문 자체 · 상품상세 공통 모듈 부재 | **중** | Neture=유통 원장 vs 나머지=서비스 상품 현황 | 부분 |
| **G 사이니지** | `modules/signage-hq` ×18 thin wrapper (23~25줄) | **GP 전량 자체 구현 (1,946줄)** | **하** | **없음** — GP 도 동일 `/signage/hq-*` | ✅ (GP 4건) |
| **H QR/POP/블로그** | `hub-content-list/write` · `qr-template-write` | **GP 전량 자체 구현 (2,239줄)** · KPA 동영상/다국어/태블릿은 KPA 전용 | **하** | **없음** — 실측 컬럼까지 KPA 와 동일 | ✅ (GP 3건) |
| **I LMS/설문/문의** | `lms-courses` · `surveys` · `contact-inquiry` | GP LMS **이중 존재** · GP 설문 자체 · Neture 문의 자체 · KPA 문의 콘솔 없음 | **하** | 없음 | ✅ (GP 2건) |
| **J 분석/AI** | `OperatorDashboardLayout` 5-Block · `operator-analytics` · `@o4o/ui` AI 리포트 | KCos 운영분석 **부재** · GP 자체 구현 · Neture/GP AI 고유 축 | **하** | AI 정산(GP)·Action Queue(Neture)는 고유 — 공통화 대상 아님 | ✅ (GP 1건) |
| **K 역할/감사/법정** | `@o4o/ui` RoleManagement wrapper · `service-legal` | **KPA 만 법정정보 자체 구현** · 감사로그 KPA 전용 · 설정 KCos/GP 자체 | **중** | 감사 로그는 KPA 외 backend 미확인 | 부분 |
| **L 셸/공통 UX** | `OperatorAreaShell` + `DomainIASidebar` + 공통 404 | Domain IA 는 Neture/PH 가 정당하게 다름 | **하** | 없음 | ✅ (mobile 1건, 공통 패키지 수정) |

---

## 5. 전체 census 집계

**모집단 = 58 업무 × 5 서비스 = 290 셀** (§4 판정표에서 기계 집계)

| 판정 | 셀 수 | 비율 |
|---|---:|---:|
| FULLY_COMMON | 130 | 44.8% |
| UX_DRIFT | 12 | 4.1% |
| VIEW_DUPLICATED | 28 | 9.7% |
| SERVICE_SPECIFIC | 10 | 3.4% |
| NOT_APPLICABLE | 81 | 27.9% |
| NOT_IMPLEMENTED | 29 | 10.0% |
| **합계** | **290** | **100%** |
| **미조사** | **0** | — |
| **UNCLASSIFIED** | **0** | — |

**서비스별 분포**

| 서비스 | FC | UD | VD | SS | NA | NI | 계 |
|---|--:|--:|--:|--:|--:|--:|--:|
| KPA-Society | 37 | 8 | 0 | 0 | 11 | 2 | 58 |
| Neture | 17 | 1 | 6 | 7 | 22 | 5 | 58 |
| K-Cosmetics | 36 | 0 | 4 | 1 | 10 | 7 | 58 |
| GlycoPharm | 26 | 2 | 18 | 1 | 6 | 5 | 58 |
| PharmacyHub | 14 | 1 | 0 | 1 | 32 | 10 | 58 |

**판정**

- KPA 는 채택률(37/58)에서 canonical 이 맞지만 **UX_DRIFT 8건으로 이탈도 5개 서비스 중 최다**다.
  즉 canonical 서비스 자신이 canonical 을 온전히 지키지 않는다.
- **K-Cosmetics 가 실질적으로 KPA 와 가장 동형**이다 (FC 36 · UD 0 · VD 4).
  KPA↔KCos 는 이미 사실상 공통화가 끝난 축이다.
- **GlycoPharm 의 VIEW_DUPLICATED 18건이 전체 28건의 64%** — 단일 최대 부채.
- PharmacyHub 의 NA 32건은 대부분 baseline 이 명시적으로 REMOVE 한 축이므로 **정상**이다.

---

## 6. UX_DRIFT 전 목록 (12건 — 전수)

| # | 서비스 | 업무 | 내용 |
|:--:|---|---|---|
| 1 | KPA | A3 회원 수정 모달 | 공통 패키지 **안에** `KpaEditUserModal` fork 가 `CommonEditUserModal` 과 병존 |
| 2 | KPA | D2 공급자 콘텐츠 승인 | 423줄 primitive 직접 조립, 모듈화 안 됨 |
| 3 | KPA | D3 이벤트 오퍼 승인 | 1082줄 — DataTable/Selection/ActionBar 미사용 |
| 4 | KPA | H4 매장 HUB 동영상 | 493+299줄, 공통 hub-content 모듈 미사용 |
| 5 | KPA | H5 다국어 상품 콘텐츠 | 501+424줄, 공통 hub-content 모듈 미사용 |
| 6 | KPA | H6 태블릿 Screen Set | 262줄, 대응 공통 모듈 자체가 없음 |
| 7 | KPA | K2 감사 로그 | 333줄 — Search/Filter/Selection/RowAction 부재 |
| 8 | KPA | K3 법정정보·약관 | 323줄 자체 구현 — 공통 `service-legal` 미사용 (나머지 4개 서비스는 사용) |
| 9 | Neture | B4 삭제 요청 | `/forum-delete` · `/forum-delete-requests` 2 URL → 동일 컴포넌트 (중복 진입점) |
| 10 | GlycoPharm | D4 판매자 모집 노출 승인 | 91줄 — 공통 모듈 대신 ux-core `RecruitmentExposureConsole` 직접 호출 |
| 11 | GlycoPharm | E1 매장 관리 목록 | 192줄 — core-ui + ux-core 혼용 |
| 12 | PharmacyHub | A1 회원 관리 목록 | 동일 공통 모듈이나 selection/bulk/RowAction 미주입 — **실측 checkbox 0** |

> `L4 mobile 반응형 리스트` 는 5개 서비스 전부 **NOT_IMPLEMENTED** 로 판정했다 (§8).
> 서비스 간 차이가 아니라 공통 `DataTable` 에 기능 자체가 없기 때문이다.

## 7. VIEW_DUPLICATED 전 목록 (28건 — 전수)

### GlycoPharm (18건) — 최대 부채

| 업무군 | 화면 | 자체 구현 규모 | 대체 가능 공통 모듈 |
|---|---|---:|---|
| 사이니지 | HQ 미디어 / 상세 | 571+228 | `modules/signage-hq` |
| 사이니지 | HQ 플레이리스트 / 생성 / 상세 | 310+101+286 | `modules/signage-hq` |
| 사이니지 | 템플릿 / 상세 | 119+187 | `modules/signage-hq` |
| 사이니지 | 강제 콘텐츠 | 431 | `modules/signage-hq` |
| HUB 자료 | 블로그 목록 / 작성 | 450+252 | `modules/hub-content-list` / `hub-content-write` |
| HUB 자료 | POP 목록 / 작성 | 442+254 | 동일 |
| HUB 자료 | QR 목록 / 작성 | 476+365 | `qr-template-write` |
| 매장 | 매장 상세 | 419 | `modules/store-detail` |
| 매장 | 채널 관리 | 408 | `modules/store-channels` |
| 매장 | 매장 승인 목록 / 상세 | 421+838 | (신설 필요) |
| 상품 | 상품 상세 | 387 | (신설 필요) |
| LMS | 강의 관리 | 226 | `modules/lms-courses` (**공통 wrapper 와 이중 존재**) |
| 설문 | 설문 목록 / 생성 | 224+270 | `modules/surveys` |
| 분석 | 운영 분석 | 329 | `modules/operator-analytics` |
| 설정 | 서비스 설정 | 513 | `service-contact-settings` |
| 승인 | 이벤트 오퍼 | 221 | (KPA 와 통합 필요) |
| 가입 | 가입 신청 목록 / 상세 | 284+391 | `members(consoleMode='approval')` |

GP VD 18건 = A4 · A5 · D3 · D5 · E2 · E3 · F2 · G1 · G2 · G3 · G4 · H1 · H2 · H3 · I1 · I2 · J3 · K4

**GlycoPharm 자체 구현 총량 ≈ 9,900줄** — 공통 모듈로 대체 가능한 것이 대부분이다.

### Neture (6건)

| 업무 | 자체 구현 | 대체 가능 공통 모듈 |
|---|---:|---|
| A4 가입 신청 승인 | 880 | `members(consoleMode='approval')` |
| A5 가입 신청 상세 | 1249 | 동일 |
| B1 포럼 운영 허브 | 50 | `modules/forum-hub` |
| E1 매장 관리 | 69 | `modules/stores` |
| F3 주문 관리 | 454 | `OperatorOrderStatusPage` |
| I3 문의 메시지 | 282 | `modules/contact-inquiry` |

### K-Cosmetics (4건)

A4 가입 신청(255) · D3 이벤트 오퍼(275) · F2 상품 상세(309) · K4 서비스 설정(161)

## 8. NOT_IMPLEMENTED 전 목록 (29건 — 전수)

| 서비스 | 건수 | 업무 |
|---|:--:|---|
| KPA | 2 | I3 문의 관리(설정만 있고 운영자 콘솔 없음 — KCos·GP 는 보유) · L4 mobile |
| Neture | 5 | C1 CMS · C2 콘텐츠 허브 · C3 자료실 · K2 감사 로그 · L4 mobile |
| **K-Cos** | 7 | C2 콘텐츠 허브 · H4 동영상 · H5 다국어 · H6 태블릿 · **J3 운영 분석** · K2 감사 로그 · L4 mobile |
| GlycoPharm | 5 | H4 동영상 · H5 다국어 · H6 태블릿 · K2 감사 로그 · L4 mobile |
| **PharmacyHub** | 10 | C1 CMS · C3 자료실 · C4 안내 문구 · **E1 매장 관리** · I1 LMS · I2 설문 · I3 문의 · J2 AI 리포트 · K2 감사 로그 · L4 mobile |

**특히 주목할 3건**

1. **K-Cos J3 운영 분석** — 4개 서비스가 보유한 업무인데 route·page 자체가 없다. 공통 `operator-analytics` 모듈도 존재한다.
2. **PH E1 매장 관리** — `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1 §5` 가 "매장·회원 조회 = **KEEP**" 으로 판정했는데 화면이 없다. baseline 과 구현의 불일치.
3. **L4 mobile (5/5)** — 서비스 drift 가 아니라 공통 `DataTable` 미구현. 단일 수정으로 5서비스 동시 해결 가능.

> PH 의 승인·매장지원 축(D1~D8 · G1~G4 · H1~H3)은
> `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1 §5` 가 **REMOVE(신설 금지)** 로 못박았으므로
> NOT_IMPLEMENTED 가 아니라 **NOT_APPLICABLE** 로 판정했다. K2 감사 로그는 REMOVE 목록에 없어 NI 로 둔다.

---

## 9. API / 데이터 모델 차이로 즉시 합칠 수 없는 항목

| # | 항목 | 차이 | 필요 선행 작업 |
|:--:|---|---|---|
| 1 | 가입 신청 승인 (A4/A5) | Neture=`registration_requests` · GP/KCos=서비스별 application · PH=`service_memberships` | 승인 대상 엔티티 축 통일 판단. **PH 의 `consoleMode='approval'` 이 유일한 공통 구현체** |
| 2 | 회원 목록 컬럼 (A1) | KPA=`유형/활동 유형/추가 권한` · GP/KCos=`회원 유형/운영 권한` · Neture=`회사명/공급자 프로필` | column config 주입 계약 확장. RBAC role→label 파생 규칙이 서비스마다 다름 |
| 3 | 매장 승인 (D5) | GP 만 `store_approvals` 별도 축 | 공통 승인 모듈 신설 여부 결정 |
| 4 | 상품 (F1/F2) | Neture=유통 원장(ProductMaster/Listing) · KPA/KCos/GP=서비스 상품 현황 | **F12 Product Resource Baseline** 과 정합 필요. 단순 합침 금지 |
| 5 | 이벤트 오퍼 (D3) | KPA 1082줄이 오퍼 생성까지 포함 · KCos/GP 는 승인만 | `EVENT-OFFER-COMMON-DOMAIN-V1` 기준 재정렬 선행 |
| 6 | AI 정산 (J5) | GP 만 `ai_usage`/`invoices`/`settlements` 보유 | 서비스 고유 — 공통화 대상 아님 |
| 7 | signage (G1~G4) | **차이 없음** — GP 도 동일 backend `/signage/hq-*` 사용 | **선행 조건 없음. 즉시 교체 가능** |
| 8 | blog/POP/QR (H1~H3) | **차이 없음** — 실측 컬럼까지 동일 | **선행 조건 없음. 즉시 교체 가능** |
| 9 | 포럼 (B1~B5) | 이미 공통 API `/api/v1/forum/operator/*` | Neture B1 만 교체하면 완결 |
| 10 | mobile (L4) | 데이터 차이 없음 | 공통 `DataTable` 단일 수정으로 5개 서비스 동시 해결 |

**즉시 공통화 가능 (선행 조건 0 · 13건)**

- GlycoPharm 12건 — G1 G2 G3 G4 (사이니지) · H1 H2 H3 (블로그/POP/QR) · E2 E3 (매장상세/채널) · I1 I2 (LMS/설문) · J3 (운영분석)
- Neture 1건 — B1 (포럼 운영 허브)

**선행 판단이 필요한 VD (15건)**: A4 A5 (엔티티 축 통일) · D3 (이벤트오퍼 도메인 정렬) · D5 F2 (공통 모듈 신설 필요) · K4 (설정 축) · F3 E1 I3 (Neture)

---

## 10. 후속 실행 순서 (대형 WO 단위)

### 1차 — GlycoPharm VIEW_DUPLICATED 일괄 수렴 (최대 효과 · 최저 위험)

```
대상: GP 12 업무 (G1~G4 사이니지 · H1~H3 블로그/POP/QR · E2 E3 매장상세/채널 · I1 I2 LMS/설문 · J3 운영분석)
      + Neture B1 포럼 운영 허브  = 13 업무 / 약 24 파일
방식: 이미 존재하는 공통 모듈로 thin wrapper 교체 (KPA/KCos 가 이미 동일 모듈 사용 중)
근거: API/데이터 모델 차이 0 (§9-7,8,9). 실측 컬럼도 blog 는 이미 KPA 와 동일
제거 예상: 약 5,900줄
위험: 낮음 — backend 무변경. GP·Neture 단독 회귀 범위
주의: 공통 패키지는 건드리지 않는다 (소비처만 교체) → SHARED-MODULE-CHANGE-PROTOCOL 미해당
```

### 2차 — 회원 + 가입 승인 UX 통일

```
대상: A1 PH selection 정책 결정 · A3 KpaEditUserModal fork 해소 · A4/A5 가입 승인 3서비스 수렴
선행: 승인 대상 엔티티 축 통일 판단 (§9-1) — IR 필요
근거: PH 의 consoleMode='approval' 이 이미 공통 구현체로 검증됨
주의: PH 의 "파괴적 액션 미주입"은 사고가 아니라 정책 → 유지/변경을 먼저 결정
```

### 3차 — 공통 DataTable mobile 대응 (단일 수정 · 5서비스 동시 해결)

```
대상: L4 (5서비스 전부 NOT_IMPLEMENTED)
방식: packages/operator-ux-core/src/list/DataTable.tsx 에
      컬럼 우선순위 / card 전환 / overflow container 도입
효과: 23개 실측 화면 + 미관측 화면 전부 동시 해소
위험: 중간 — 공통 패키지 변경이므로 SHARED-MODULE-CHANGE-PROTOCOL 준수 필요
```

### 4차 — KPA canonical 자체 정합 + 잔여 drift

```
대상: KPA UX_DRIFT 8건 (A3 회원수정모달·D2 공급자콘텐츠승인·D3 이벤트오퍼·H4 동영상·H5 다국어·H6 태블릿·K2 감사로그·K3 법정정보)
      + Neture 포럼허브/문의/주문 + KCos 운영분석 NI
목적: "canonical 이 canonical 을 지키게" 한 뒤 나머지를 맞춘다
```

### 5차 — cross-service browser audit (재검증)

```
선결: 5개 서비스 L2 service_credentials 비밀번호 확보 (§2-1 — 현재 전부 unknown)
      → 확보 전에는 실제 로그인 경로 UX 검증 불가
범위: 1~4차 결과를 desktop/mobile 양 viewport 에서 KPA 대조 재실측
```

---

## 11. 종료 조건 확인

| 항목 | 결과 |
|---|---|
| 미조사 | **0** (290/290 셀 판정) |
| UNCLASSIFIED | **0** |
| 코드 변경 | **0** |
| DB / API 변경 | **0** |
| production write | **0** |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건 (§10)

**범위 밖 발견 (수정하지 않고 보고만)**
1. KPA `/operator/members` 회원 1건 이름 인코딩 깨짐 (`◆◆◆◆◆`)
2. GlycoPharm LMS 강의 관리가 자체 226줄 + 공통 wrapper 27줄 **이중 존재** — route 는 `lms` → 공통, `lms/courses` → redirect
3. Neture `/operator/forum-delete` 와 `/operator/forum-delete-requests` 가 동일 컴포넌트 (중복 진입점)
4. K-Cosmetics 운영 분석: 4개 서비스가 보유한 업무인데 route·page 부재
5. `docs/local/TEST-ACCOUNTS.local.md §2` — 5서비스 × 3계정 L2 비밀번호 전부 unknown → 웹 폼 로그인 검증이 구조적으로 막혀 있음
