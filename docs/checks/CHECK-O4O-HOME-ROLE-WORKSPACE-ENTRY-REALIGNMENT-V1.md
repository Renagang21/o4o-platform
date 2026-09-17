# CHECK-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1

> **WO**: `WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1` (사용자 확정 · 2026-09-17)
> **일자**: 2026-09-17 · **기준 main**: `b10277e04` (`ROLE_WORKSPACE_REFACTOR = CLOSED` 직후 · Fresh Census 에서 시작)
> **성격**: 대표 홈(`neture.co.kr` `/`) 개인화 영역을 **완료된 4대 Role Workspace(커뮤니티 · 매장 · 공급자 · 서비스 운영) 중심으로 재정렬**. 서비스별 「매장 HUB / 내 매장」 반복 나열 제거 · Platform Admin 분리 · 브라우저 메타 O4O 정렬. 새 identity / membership 모델 0 · 4 Workspace 구조 변경 0 · Community Catalog 계약 변경 0 · RBAC Core 변경 0 · API 변경 0 · migration 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2-1 · §6 · [`CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1`](CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1.md) · 선행 [`CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1`](CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1.md)
> **구현 commit**: `97bfcbe0c` (web-neture 12 파일 · 2026-09-17) · 본 CHECK 는 별도 docs 커밋

---

## 0. 한 줄 결론

대표 홈은 이제 **「내 업무 공간」 4 카드(커뮤니티 · 매장 · 공급자 · 서비스 운영) + 「플랫폼 관리」(해당 사용자만) + 「내 서비스」 + 「O4O 서비스 소식」 + 가입 · 이용 상태** 순으로 정렬된다. 서비스마다 반복되던 「매장 HUB」 · 「내 매장」 최상위 그룹은 0 이 되었고, 매장 카드는 **매장 하나 = 버튼 하나(매장 이름) → `<basePath>/workspace`(Store Workspace Home)** 만 둔다. 데이터 출처는 기존 API(`/neture/home/entry` · `/communities` · `/work-scope/operator-services` · `/auth/services`)만 사용하며 새 권한 모델은 없다. 단위 · 시나리오 테스트 81/81 · tsc · build · Cloud Run 배포 · 프로덕션 desktop / mobile smoke(버튼 랜딩 5건 포함) 전부 PASS.

---

## 1. Fresh Census (origin/main `b10277e04`) — 작업 전

| # | 항목 | 발견 | 판정 |
|---|---|---|---|
| 1 | 개인화 영역 데이터 출처 | `services/web-neture/src/lib/home-entry.ts` — 커뮤니티 = `GET /communities`, 매장 = `GET /neture/home/entry` `stores`, 공급자 = `serviceStates.supplier`, 운영 = `GET /work-scope/operator-services`, 내 서비스 = `GET /auth/services` | SSOT 이미 정합 — **그룹 구성 · 표현만 재정렬** |
| 2 | 최상위 그룹 | `community` · `store-hub`(서비스별 매장 HUB 버튼) · `my-store`(서비스별 내 매장 버튼) · `supplier` · `operator` — 그룹은 항목이 있을 때만 생성 | 서비스별 반복 나열 = 제거 대상 |
| 3 | 공급자 그룹 | `neture:admin` · `platform:super_admin` 이면 supplier active 가 아니어도 「공급자 업무」 노출(admin bypass) | §7 위반 — 제거 대상 |
| 4 | Platform Admin | `operator` 그룹 안에 `operator:platform`(「Neture 관리자」) 로 섞임 | 분리 대상 |
| 5 | 섹션 이름 | 「주요 업무」 · 「내가 이용하는 서비스」 | 「내 업무 공간」 · 「내 서비스」 로 정렬 |
| 6 | 커뮤니티 라벨 | Catalog canonical 이름만(선행 WO 에서 「Neture 커뮤니티」 제거 완료) | OK — 회귀 테스트만 추가 |
| 7 | 브라우저 메타 | `index.html` title / description / og = Neture 유통 · 협업 플랫폼 문구 · `seoRegistry.ts` 홈 항목 동일 | O4O 정체성으로 정렬 |
| 8 | `ServiceApplyPanel.tsx` | 「내가 이용하는 서비스」 문구 1건 | 「내 서비스」 로 정렬 |

---

## 2. 변경 (commit `97bfcbe0c` · 전부 `services/web-neture/`)

### 2-1. 모델 — `src/lib/home-entry.ts`

- `WorkspaceKey = 'community' | 'store' | 'supplier' | 'operator'` · `WORKSPACE_CARDS`(제목 / 짧은 설명 고정) — **카드는 항상 4개 · 같은 순서**, 사용자별로 달라지는 것은 카드 안 진입 버튼뿐.
- `HomeEntryModel.groups` = 4 카드 고정 · `platformAdmin: EntryItem | null`(`{ id:'platform:admin', label:'플랫폼 관리', action:{ kind:'internal', to:'/admin' } }`) 신설 · `myServices` · `statusItems` · `joinable` 유지.
- 매장 카드: `store:${organizationId}:${serviceKey}` · label = 매장 이름(없으면 「이름 없는 매장」) · handoff `returnPath = SERVICE_PATHS[key].myStore`(KPA · KCos `/store/workspace`, PH `/store-owner/workspace`) · `note = 서비스 이름` 은 **매장이 2개 이상일 때만** · active 가 아닌 서비스의 매장 제외 · `/store-hub` 직접 진입 0.
- 공급자 카드: `serviceStates.supplier.status === 'active'` 만 · admin bypass 제거(서버 guard 의 운영 목적 통과는 무관 — UI 노출만 분리).
- 서비스 운영 카드: `operator-services` 목록만 · label = 서비스 이름(kpa-branch 는 분회 이름) · admin scope 는 note 「관리자」 · 프런트 role 파싱 0.
- Platform Admin: `platform:super_admin` → `platformAdmin` 로 분리(카드에 섞지 않음).

### 2-2. 표현 — `src/components/home/HomeEntryPanel.tsx`

- `<Section title="내 업무 공간">` 안에 `grid grid-cols-1 gap-3 sm:grid-cols-2` · 카드 = `<section data-workspace={id} aria-labelledby>` + `h3` 제목 + 짧은 설명 + 진입 버튼(없으면 「이용 중인 항목이 없습니다.」). 흰 배경 · 회색 테두리 · 색 / 아이콘 / KPI 없음.
- `EntryButton` 의 note 는 버튼 안 작은 회색 글자(`text-xs text-slate-400`) — 별도 `<ul>` 반복 목록 제거.
- `{model.platformAdmin && <Section title="플랫폼 관리">}` · 「내 서비스」 · `newsSlot`(O4O 서비스 소식) · 가입 · 이용 상태 · 가입 가능한 서비스 순.

### 2-3. 메타 · 문구

- `index.html`: title 「O4O — 소규모 사업자를 위한 통합 업무 공간」 · description 「소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.」 · og:title / og:site_name = O4O.
- `src/config/seoRegistry.ts` 홈 항목 동일 정렬 · `src/pages/O4OHomePage.tsx` 문구 정렬 · `ServiceApplyPanel.tsx` 「내 서비스」.

### 2-4. 테스트

- 신설 `src/lib/__tests__/home-entry.role-workspace-scenarios.test.ts`(10) — 4 카드 고정 · 커뮤니티 라벨 canonical · 커뮤니티만 회원 · 매장 경영자(1 · 복수) · 공급자 active · 단일 / 복수 운영자 · 플랫폼 관리자 · 다중 역할(항목 id 전부 유일 = 출처 중복 0).
- 신설 `src/components/home/__tests__/HomeEntryPanel.workspace-cards.test.tsx`(4) — 4 카드 / 순서 / h3 · 매장 버튼 = 매장 이름 · 복수 매장 note 인라인 · 플랫폼 관리 섹션 순서 · 공급자 링크 · 「매장 HUB / ^내 매장$ / Neture 커뮤니티 / KPA Society 커뮤니티 / 주요 업무 / 내가 이용하는 서비스」 라벨 0.
- 갱신 `home-entry.service-states.test.ts` · `home-entry.operator-services.test.ts` · `home-entry.communities.test.ts` · `HomeEntryPanel.back-navigation.test.tsx` — 새 계약(4 카드 항상 · admin bypass 없음 · platformAdmin 분리)으로 정렬.

### 2-5. 변경하지 않은 것

API · route · guard · RBAC · Community Catalog · Service Catalog · store-ui-core `workspace/` · operator-ux-core · 다른 서비스 web · `package.json` / lockfile · CI · DB.

---

## 3. 검증

| 항목 | 명령 / 대상 | 결과 |
|---|---|---|
| 단위 · 시나리오 | `npx vitest run --config services/web-neture/vitest.config.mjs` | **10 files · 81 tests PASS** |
| 타입 | `npx tsc --noEmit -p tsconfig.json` (services/web-neture) | exit 0 |
| 빌드 | `pnpm --filter "@o4o/web-neture" build` | OK (chunk-size 경고만 · 기존과 동일) |
| 배포 | Deploy Web Services run `35168823313` (`97bfcbe0c`) | success (deploy-neture success · 나머지 skipped) |

### 3-1. 프로덕션 smoke (`https://neture.co.kr/` · 2026-09-17)

계정: KPA 로그인 페이지 「체험용 약국 경영자 계정」(자격정보 미기록) → `POST /auth/handoff {targetServiceKey:'neture'}` 로 Neture 진입. Playwright(MCP) 실브라우저.

| 검증 | Desktop 1005px+ | Mobile 390px |
|---|---|---|
| `document.title` | 「O4O — 소규모 사업자를 위한 통합 업무 공간」 | 동일 |
| meta description / og:title / og:site_name | 지정 문구 · O4O | 동일 |
| AI 입력창 | 상단 유지 | 유지 |
| `h2` 순서 | 「내 업무 공간」 → 「내 서비스」 → 「O4O 서비스 소식」 | 동일 |
| `[data-workspace]` | `community · store · supplier · operator` | 동일 |
| 카드 grid 열 수 | **2** | **1** · 가로 스크롤 없음 |
| 「매장 HUB」 최상위 · 「내 매장」 최상위 · 「Neture 커뮤니티」 | 0 · 0 · 0 | 0 · 0 · 0 |
| 커뮤니티 카드 | 약사 커뮤니티(note 「KPA Society에서 참여」) · 화장품 커뮤니티 · O4O 공통 커뮤니티 | 동일 |
| 매장 카드 | 테스트 약국 _KPA Society_ · 테스트 뷰티샵 _K-Cosmetics_ · 네뚜레 약국 _파머시 허브_ (버튼 3 · `<ul>` 0) | 동일 |
| 공급자 카드 | 「공급자 업무」 | 동일 |
| 서비스 운영 카드 | 「이용 중인 항목이 없습니다.」(체험 계정은 운영 서비스 없음 — 기대값) | 동일 |
| 「플랫폼 관리」 | 미표시(비관리자 — 기대값) | 동일 |
| 「내 서비스」 | 공급자 서비스 · Neture(현재 화면) · KPA Society · K-Cosmetics · 파머시 허브 · 약사회 분회 | 동일 |
| 가입 · 이용 상태 / 가입 가능 | 미표시(전부 active — 기대값) | 동일 |

버튼 랜딩(각 1회 클릭 → 최종 URL · 화면 제목):

| 버튼 | 랜딩 | 결과 |
|---|---|---|
| 테스트 약국 | `https://kpa-society.co.kr/store/workspace` — 「테스트 약국 업무공간」 | PASS |
| 테스트 뷰티샵 | `https://k-cosmetics.site/store/workspace` — Store Workspace Home | PASS |
| 네뚜레 약국 | `https://pharmacyhub.co.kr/store-owner/workspace` — 「네뚜레 약국 업무공간」 | PASS |
| 공급자 업무 | `https://neture.co.kr/supplier/dashboard` — Supplier Workspace 공급자 홈 | PASS |
| 약사 커뮤니티 | `https://kpa-society.co.kr/forum` — KPA-Society 포럼 | PASS |

### 3-2. 실계정으로 smoke 하지 않은 시나리오 (정직 기재)

- **복수 서비스 운영자** · **플랫폼 관리자(「플랫폼 관리」 섹션)** · **공급자 미승인 회원** — 체험 계정으로 재현 불가. 단위 · 시나리오 · 패널 테스트(§2-4)로만 계약을 고정했다. 운영 계정 사용은 CLAUDE.md §15 에 따라 하지 않았다.
- 소식(`newsSlot`) 내용 자체는 본 WO 범위 밖 — 위치(내 서비스 아래)만 확인.

### 3-3. 재 Census (commit 후 · `97bfcbe0c`)

`rg "매장 HUB|Neture 커뮤니티|storeHub|store-hub|내가 이용하는 서비스|주요 업무"` (home-entry.ts · components/home · O4OHomePage.tsx · 테스트 제외) → hit 3건 전부 **"반복 나열 없음 / 별도 진입을 두지 않는다"** 설명 주석. 코드 · 라벨 0.

---

## 4. 범위 밖 관찰 (수정하지 않음 · 별도 WO 후보)

| # | 관찰 | 위치 | 제안 |
|---|---|---|---|
| O1 | 전역 헤더 부제 「공급자·파트너 협업 플랫폼」 — Legacy Partner 은퇴(2026-09-15) 후 stale 문구 | `services/web-neture/src/components/layout/NetureGlobalHeader.tsx` | 헤더 · 푸터 O4O 정체성 문구 정렬 WO |
| O2 | `NETURE_SEO_DEFAULTS` title 「Neture — O4O 유통·협업 플랫폼」 이 홈 외 페이지(예: `/supplier/dashboard`)에 그대로 적용 | `services/web-neture/src/config/seoRegistry.ts` | O1 과 같은 WO 로 묶어 처리 |
| O3 | handoff 로 얻은 `neture.co.kr` 세션이 **전체 페이지 reload(`page.goto`)** 시 끊김(다른 서비스 탭에서는 `/auth/me` 401 「Tokens cleared」 로그). 본 WO 이전부터 존재 · 홈 재정렬과 무관 | 세션 · 토큰 저장 계층 | handoff 세션 영속화 IR |

---

## 5. Git

- 구현: `97bfcbe0c` (path-specific · `services/web-neture/` 12 파일) — push 완료.
- 본 CHECK: 별도 docs 커밋(path-specific) — push 후 `HEAD == origin/main`.
- 다른 세션 파일 접촉 0.

---

## 6. 최종 판정

```text
O4O_HOME_ROLE_ALIGNMENT = PASS
COMMUNITY_ENTRY = PASS
STORE_ENTRY = PASS
SUPPLIER_ENTRY = PASS
SERVICE_OPERATOR_ENTRY = PASS
PLATFORM_ADMIN_SEPARATE = PASS
TOPLEVEL_STORE_HUB = 0
TOPLEVEL_SERVICE_MY_STORE = 0
NETURE_COMMUNITY_LABEL = 0
DATA_SOURCE_DUPLICATION = 0
NEW_RBAC_MODEL = 0
DESKTOP_SMOKE = PASS
MOBILE_SMOKE = PASS
NEXT = CLOSED
```

*작성: 2026-09-17 · Claude Code (Opus 5)*
