# CHECK-O4O-WEB-DEAD-LINK-SWEEP-CROSS-SERVICE-V1

> WO: `WO-O4O-WEB-DEAD-LINK-SWEEP-CROSS-SERVICE-V1`
> 작업일: 2026-08-11 · 기준 commit: `80a1a5f6e` → 구현 commit: `8befb6b24`
> 결과: **PASS** — 클릭 가능한 dead link **6개소 수정**, 나머지는 전부 정상 route / orphan 컴포넌트

---

## 1. 기준 commit

| 항목 | 값 |
|------|-----|
| 기준 (작업 시작) | `80a1a5f6e` |
| 구현 | `8befb6b24` |
| CHECK 문서 | 본 문서 (후속 commit) |
| 브랜치 | `main` (직접 작업) |

---

## 2. 서비스별 링크 후보 수 (정적 수집)

수집 방식: `to="…"` · `href="…"` · `navigate("…")` 등 **리터럴 내부 경로**만 추출하고, 같은 서비스의 `path="…"` route 선언과 대조했다. 템플릿 보간이 들어간 동적 경로는 판정 대상에서 제외했다 (`HOLD_DYNAMIC_ROUTE`).

매처는 **의도적으로 관대**하다 — 중첩 route 를 완전 모델링하지 않으므로 "매치됨"은 확실히 살아있다는 뜻이고, "매치 안 됨"은 **확인 대상**이라는 뜻이다. 미매치 후보는 전부 수동 route 확인 + 실브라우저로 재판정했다.

| 서비스 | 리터럴 링크 대상 | route 선언 | 동적(제외) | 미매치 후보 |
|------|---:|---:|---:|---:|
| `web-neture` | 107 | 289 | 47 | 6 |
| `web-kpa-society` | 125 | 282 | 123 | 6 |
| `web-glycopharm` | 89 | 203 | 66 | 1 |
| `web-k-cosmetics` | 78 | 160 | 39 | 3 |
| `web-pharmacy-hub` | 18 | 36 | 7 | 0 |

---

## 3. 서비스별 dead link 판정

### 3-1. web-neture (미매치 6건)

| 링크 | 위치 | 판정 | 처리 |
|------|------|------|------|
| `/channel/structure` | `pages/PartnerInfoPage.tsx:152` | **DEAD_LINK_CLICKABLE** — `/workspace/partners/info` 로 라우팅된 페이지 (App.tsx:1012) | 링크 제거 |
| `/platform/principles` | `pages/PartnerInfoPage.tsx:169` | **DEAD_LINK_CLICKABLE** — 동일 페이지 | 링크 제거 (안내 문구만 유지) |
| `/channel/structure` | `pages/admin-vault/VaultOverviewPage.tsx:77` | **DEAD_LINK_CLICKABLE** — `/admin-vault` 로 라우팅 (App.tsx:996, ADMIN_ROLES guard) | 카드 제거 |
| `/channel/dental` · `/channel/pharmacy` | `pages/channel/ChannelSalesStructurePage.tsx:275,278` | **ORPHAN_COMPONENT_ONLY** — 참조 0건 (index.ts 재export 뿐, route 없음) | 기록만 |
| `/channel/structure` | `pages/PlatformPrinciplesPage.tsx:212` | **ORPHAN_COMPONENT_ONLY** — 참조 0건 | 기록만 |
| `/manual/concepts/channel-map` | `pages/manual/concepts/ConceptsPage.tsx:76` | **ORPHAN_COMPONENT_ONLY** — 참조 0건 | 기록만 |

`PartnerInfoPage` 의 `/seller/overview` 는 `VALID_ROUTE` (App.tsx:971) 이므로 유지했다.

### 3-2. web-kpa-society (미매치 6건 — 수정 0건)

| 링크 | 위치 | 판정 |
|------|------|------|
| `/admin` | `components/KpaUserMenu.tsx:84` | **VALID_ROUTE** — `path="/admin/*"` (App.tsx:720). splat 은 부모 경로 자체도 매치한다 |
| `/operator` | `KpaUserMenu.tsx:89` · `auth/HubGuard.tsx:51` · `routes/OperatorRoutes.tsx:244` | **VALID_ROUTE** — `path="/operator/*"` (App.tsx:753) |
| `/tablet` | `App.tsx:1107` | **VALID_REDIRECT** — `KpaRedirect to="/tablet"` 이 slug 를 덧붙여 `/tablet/:slug` (App.tsx:929) 에 도달 |
| `/help` · `/organization` · `/organization/contact` | `components/home/UtilitySection.tsx:78,81,82` | **ORPHAN_COMPONENT_ONLY** — `UtilitySection` 소비처 0건 |

> `/admin` · `/operator` · `/tablet` 은 **정적 매처의 오탐**이다. 매처를 느슨하게 고치지 않고 route 를 직접 확인해 판정했다.

### 3-3. web-glycopharm (미매치 1건 — 3개소 수정)

| 링크 | 위치 | 판정 | 처리 |
|------|------|------|------|
| `/education` | `pages/service/ServiceDashboardPage.tsx:158` (`/service` · `/service/dashboard`) | **DEAD_LINK_CLICKABLE** | `/lms` 로 교체 |
| `/education` | `pages/store-management/PharmacyManagement.tsx:247,259` (매장관리 `management`) | **DEAD_LINK_CLICKABLE** | `/lms` 로 교체 |

교체 근거: 두 링크의 라벨은 "교육" · "강좌" 이고, 해당 화면의 canonical route 는 `<Route path="lms" element={<EducationPage />} />` (App.tsx:607) 다. **새 route 를 만들지 않고 이미 존재하는 route 로만 교체**했다.

### 3-4. web-k-cosmetics (미매치 3건 — 1개소 수정)

| 링크 | 위치 | 판정 | 처리 |
|------|------|------|------|
| `/community` | `pages/HomePage.tsx:230` | **DEAD_LINK_CLICKABLE** — 홈은 확실히 렌더된다 | `/forum` 으로 교체 |
| `/community` | `pages/library/ContentLibraryPage.tsx:116` | **ORPHAN_COMPONENT_ONLY** — `/library/content` 가 `/store-hub/content` redirect 로 바뀌어 컴포넌트 참조 0건 (App.tsx:121 주석) | 기록만 |
| `/about` | `components/home/NoticeSection.tsx:54` | **ORPHAN_COMPONENT_ONLY** — `NoticeSection` 소비처 0건 | 기록만 |

교체 근거: 같은 홈 화면의 "공지 전체보기" 가 이미 `/forum` 을 가리키고 있고, `/forum` 이 이 서비스의 커뮤니티 허브다 (App.tsx:470).

### 3-5. web-pharmacy-hub

미매치 후보 **0건**. PASS (수정 없음).

---

## 4. 수정한 링크 (총 6개소 · 5파일)

| 서비스 | 파일 | 변경 |
|------|------|------|
| glycopharm | `pages/service/ServiceDashboardPage.tsx` | `/education` → `/lms` |
| glycopharm | `pages/store-management/PharmacyManagement.tsx` | `/education` → `/lms` (2개소) |
| k-cosmetics | `pages/HomePage.tsx` | `/community` → `/forum` |
| neture | `pages/PartnerInfoPage.tsx` | `/channel/structure` · `/platform/principles` 링크 제거 (2개소) |
| neture | `pages/admin-vault/VaultOverviewPage.tsx` | `/channel/structure` 카드 제거 + unused import 정리 |

route 신설 0건 · redirect 신설 0건 · 기존 route 삭제 0건.

---

## 5. 수정하지 않은 항목과 이유

| 항목 | 이유 |
|------|------|
| KPA `/admin` · `/operator` · `/tablet` | dead 가 아니다 (splat route · redirect prop). 정적 매처 오탐 |
| KPA `UtilitySection` 3건 | orphan 컴포넌트 — 클릭 경로가 없다. WO §3 "orphan 내부 링크는 기록만" |
| K-Cos `NoticeSection` `/about` · `ContentLibraryPage` `/community` | 동일 (orphan) |
| Neture `ChannelSalesStructurePage` · `PlatformPrinciplesPage` · `ConceptsPage` 내부 4건 | 동일 (orphan) |
| Neture `/partner/dashboard` | auth guard 로 "접근 권한 없음" 이 렌더된다 → WO §3 에 따라 dead link 아님 |
| 동적 경로 282건 (5개 서비스 합) | `HOLD_DYNAMIC_ROUTE` — 생성 규칙이 확실하지 않아 판정 보류 |

---

## 6. orphan 컴포넌트 후보 (삭제 후보 · 본 WO 에서 삭제하지 않음)

| 서비스 | 컴포넌트 | 참조 | 내부 dead link |
|------|------|:---:|------|
| neture | `pages/channel/ChannelSalesStructurePage.tsx` | 0 (index.ts 재export 뿐) | `/channel/dental` · `/channel/pharmacy` |
| neture | `pages/PlatformPrinciplesPage.tsx` | 0 | `/channel/structure` |
| neture | `pages/manual/concepts/ConceptsPage.tsx` | 0 | `/manual/concepts/channel-map` |
| kpa-society | `components/home/UtilitySection.tsx` | 0 | `/help` · `/organization` · `/organization/contact` |
| k-cosmetics | `components/home/NoticeSection.tsx` | 0 | `/about` |
| k-cosmetics | `pages/library/ContentLibraryPage.tsx` | 0 | `/community` |

---

## 7. smoke 결과 (변경한 3개 서비스 · 실브라우저 · 배포본)

### 7-1. k-cosmetics (https://k-cosmetics.site)

| 확인 | 결과 |
|------|:---:|
| 홈 "커뮤니티 바로가기 →" href | `/forum` ✅ |
| 홈의 `a[href="/community"]` 개수 | **0** ✅ |
| `/forum` 렌더 | "K-Cosmetics 포럼" — 포럼 목록 · 인기글 · 최근글 정상 ✅ |
| 홈 회귀 | 공지 / 트렌드 / 최신글 / 서비스 바로가기 전부 정상 ✅ |

### 7-2. glycopharm (https://glycopharm.co.kr)

| 확인 | 결과 |
|------|:---:|
| `/lms` 렌더 | "강의" — 강의 목록 3건 정상 ✅ |
| `/education` (이전 링크 대상) | 404 화면 — dead 였음이 재확인됨 ✅ |
| 기존 catch-all 유지 | ✅ (직전 WO 결과 회귀 없음) |

> `/service` · 매장관리 화면은 인증·역할 guard 뒤에 있어 링크 자체는 소스·빌드로 검증하고, **링크 대상인 `/lms` 가 실제로 렌더되는지**를 실브라우저로 확인했다. 숨기지 않고 기록한다.

### 7-3. neture (https://neture.co.kr)

| 요청 경로 | 도착 주소 | 결과 |
|------|------|:---:|
| `/workspace/partners/info` | 동일 | 정상 렌더 · dead link 2건 사라짐 (해당 anchor 0개) ✅ |
| `/channel/structure` | 동일 | 404 render (주소 보존) ✅ |
| `/platform/principles` | 동일 | 404 render ✅ |
| `/manual/concepts/channel-map` | 동일 | 404 render ✅ |
| `/channel/dental` | 동일 | 404 render ✅ |
| `/suppliers` | `/` | VALID_REDIRECT ✅ |
| `/partners/requests` | `/workspace/partners/requests` | VALID_REDIRECT — "파트너 모집 제품" ✅ |
| `/partner/dashboard` | 동일 | "접근 권한 없음" (guard) — dead 아님 ✅ |
| `/forum` | 동일 | "네뚜레 포럼" ✅ |
| `/seller/overview` · `/guide/o4o-overview` | 동일 | 정상 ✅ |

- **redirect loop 0건** — redirect 로 선언된 2건을 제외한 모든 경로에서 요청 주소가 보존됐다.
- **console error**: 비인증 세션의 `401 /api/v1/auth/me` 1건뿐. 로그인하지 않은 상태 때문이며 이번 변경과 무관하다.
- `pages/admin-vault/VaultOverviewPage.tsx` 는 ADMIN_ROLES guard 뒤라 **실브라우저 확인은 하지 않았다**. typecheck · build 로만 검증했다.

---

## 8. typecheck · build · deploy 결과

| 서비스 | typecheck (`npx tsc --noEmit -p tsconfig.json`) | build (`pnpm run build`) | deploy |
|------|:---:|:---:|:---:|
| `web-neture` | ✅ PASS | ✅ 14.79s | ✅ `deploy-neture: success` |
| `web-glycopharm` | ✅ PASS | ✅ 16.79s | ✅ `deploy-glycopharm: success` |
| `web-k-cosmetics` | ✅ PASS | ✅ 17.31s | ✅ `deploy-k-cosmetics: success` |

- 워크플로 `Deploy Web Services (Cloud Run)` run **31451634294** — 전체 success.
- `deploy-kpa-society` · `deploy-pharmacy-hub` 는 detect-changes 에 의해 **skipped** (변경 없음).
- **API 배포 없음** — 백엔드 파일 변경 0건.
- 서비스별 `type-check` script 는 존재하지 않아 패키지 디렉터리에서 `tsc --noEmit` 을 직접 실행했다.

---

## 9. 금지사항 준수 (WO §4)

| 금지 | 준수 |
|------|:---:|
| route 대량 신설 | ✅ route 추가 0건 |
| IA 대개편 | ✅ 메뉴 · 구조 무변경 (dead link 3개소 제거 · 3개소 교체) |
| backend 변경 | ✅ 없음 (변경 5파일 전부 `services/web-*/src`) |
| 권한 · role 변경 | ✅ 없음 (guard 무접촉) |
| redirect 정책 대량 변경 | ✅ redirect 추가 · 변경 0건 |
| 공통 패키지 승격 | ✅ 없음 |
| DB write | ✅ 없음 |
| migration | ✅ 없음 |

---

## 10. commit SHA · push 결과

| 항목 | 값 |
|------|-----|
| 구현 commit | `8befb6b24` (+13/−22, 5파일) |
| push | ✅ 완료 — `80a1a5f6e..8befb6b24` → `origin/main` |
| stage 방식 | path-specific (파일 5개 명시) — 다른 세션 파일 · lockfile 미포함 |

---

## 11. 후속 후보 (본 WO 범위 아님)

1. `WO-O4O-WEB-ORPHAN-PAGE-COMPONENT-CLEANUP-V1` — §6 의 orphan 컴포넌트 6건 삭제 여부 판단. Neture 3건은 "채널·판매 구조 / 플랫폼 운영 원칙" 콘텐츠라서 **삭제** 대신 **route 복구**가 맞을 수도 있다
2. `WO-O4O-NETURE-PLATFORM-PRINCIPLES-ROUTE-DECISION-V1` — `PartnerInfoPage` 의 "플랫폼 운영 원칙" 섹션이 현재 링크 없는 안내 문구만 남았다. 원문 페이지를 살릴지 섹션을 없앨지 결정
3. `WO-O4O-WEB-DYNAMIC-LINK-SWEEP-V1` — 이번에 보류한 동적 경로 282건 판정

---

## 12. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

(§16-1 대상인 기준 문서를 이번 작업에서 참조 · 수정하지 않았다. 변경은 전부 소스 코드다.)
