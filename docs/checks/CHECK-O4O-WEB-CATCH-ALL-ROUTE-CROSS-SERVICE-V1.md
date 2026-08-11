# CHECK-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1

> WO: `WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1`
> 선행: [`CHECK-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1`](CHECK-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1.md)
> 작업일: 2026-08-11 · 기준 commit: `adcd988a5` → 구현 commit: `4157505c9`
> 결과: **PASS** — 5개 서비스 중 **수정 1개**(Pharmacy-Hub), 나머지 4개는 이미 정상

---

## 1. 기준 commit

| 항목 | 값 |
|------|-----|
| 기준 (작업 시작) | `adcd988a5` |
| 구현 | `4157505c9` (다른 세션 commit `293247727` 위로 rebase) |
| CHECK 문서 | 본 문서 (후속 commit) |
| 브랜치 | `main` (직접 작업) |

---

## 2. 서비스별 catch-all 보유 여부

| 서비스 | catch-all 위치 | 방식 | 분류 |
|------|------|------|------|
| `web-kpa-society` | `App.tsx:1133` → 같은 파일 `NotFoundPage()` (inline) | **render** | `PASS_ALREADY_HAS_CATCH_ALL` |
| `web-glycopharm` | `App.tsx:1101` → `pages/NotFoundPage.tsx` | **render** | `PASS_ALREADY_HAS_CATCH_ALL` |
| `web-k-cosmetics` | `App.tsx:879` → `pages/NotFoundPage.tsx` | **render** | `PASS_ALREADY_HAS_CATCH_ALL` |
| `web-pharmacy-hub` | `App.tsx:221` → `<Navigate to="/" replace />` | **redirect** ❌ | `FIX_ADD_CATCH_ALL` |
| `web-neture` | `App.tsx:1251` → `pages/NotFoundPage.tsx` | **render** | 선행 WO 처리 완료 · 회귀 확인만 |

> **Pharmacy-Hub 만 문제였던 이유** — route 자체는 있었으나 `Navigate` 라 없는 주소가 **안내 없이 홈으로 흡수**됐다.
> 요청 URL 이 사라져 사용자는 "주소 오타 / 페이지 삭제 / 권한 없음" 을 구분할 수 없다. WO §4 "404 는 render, 주소 보존" 위반이다.
> Neture 의 원래 증상(빈 화면)과는 다르지만 **같은 UX 결함**이다.

하위 트리 catch-all (전부 의도된 것으로 유지 — 수정 대상 아님):

| 위치 | 내용 | 판단 |
|------|------|------|
| `web-kpa-society/src/routes/AdminRoutes.tsx:45` | `<Navigate to="kpa-dashboard" replace />` | admin 서브트리 기본 화면 지정 — 의도된 redirect |
| `web-kpa-society/src/routes/OperatorRoutes.tsx:244` | `<Navigate to="/operator" replace />` | operator 서브트리 기본 화면 지정 — 의도된 redirect |

---

## 3. 서비스별 `/about` 링크 조사 결과

| 서비스 | `/about` route 존재 | 링크 | 판정 |
|------|:---:|------|------|
| `web-kpa-society` | **있음** (`App.tsx:919` → `pages/about/AboutPage`) | `Footer.tsx:24` · `ContactPage.tsx:96` · `MobilePharmacyPage.tsx:96` | ✅ 정상 링크 (dead link 아님) |
| `web-glycopharm` | 없음 | 0건 | ✅ 해당 없음 |
| `web-k-cosmetics` | 없음 | `components/home/NoticeSection.tsx:54` 1건 | ⚠️ **아래 §5 참조** |
| `web-pharmacy-hub` | 없음 | 0건 | ✅ 해당 없음 |
| `web-neture` | 없음 | 0건 (선행 WO 에서 제거) | ✅ 정상 |

실브라우저에서도 KPA `/about` 이 실제 소개 페이지(`약사와 약국을 위한 하나의 전문 공간`)를 렌더함을 확인했다 — **KPA 의 3개 링크는 고칠 대상이 아니다.**

---

## 4. 수정한 서비스와 파일

**`services/web-pharmacy-hub` 1개 서비스만 수정했다.** (commit `4157505c9`, +67/−2)

| 파일 | 변경 |
|------|------|
| `src/pages/NotFoundPage.tsx` | **신규** — API 호출 0 · layout 비의존 · Tailwind (서비스 컨벤션 일치) |
| `src/App.tsx` | catch-all `<Navigate to="/">` → `<NotFoundPage />` · import 추가 · `Navigate` import 제거 |

> `Navigate` 를 import 에서 뺀 이유: 이 교체로 `App.tsx` 내 사용처가 0 이 됐다(다른 redirect 없음).
> 남겨두면 `tsc -b` 가 unused 로 실패한다. 주석으로 근거를 남겼다.

404 화면 구성 (Neture 와 동일 문구 축):

- `404` · **요청하신 페이지를 찾을 수 없습니다.**
- 주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
- 요청한 경로 표시 (`location.pathname`)
- **홈으로 이동** (`<Link to="/">`) · **이전 화면으로 돌아가기** (`navigate(-1)`)

> Pharmacy-Hub 에는 `/forum` · `/contact` route 가 없어 KPA/GlycoPharm/K-Cos 의 3버튼(홈·커뮤니티·문의) 대신
> Neture 와 같은 2버튼 구성을 썼다. 존재하지 않는 route 로 가는 버튼을 만드는 것은 dead link 를 새로 만드는 것이다.

---

## 5. 수정하지 않은 서비스와 이유

| 서비스 | 이유 |
|------|------|
| `web-kpa-society` | catch-all render 보유 · `/about` route 실재 → 링크 3건 전부 유효. **수정할 결함 없음** |
| `web-glycopharm` | catch-all render 보유 · `/about` 참조 0건 |
| `web-k-cosmetics` | catch-all render 보유 · `/about` 참조 1건이나 **orphan** (아래) |
| `web-neture` | 선행 WO 에서 처리 완료 — 본 WO 는 회귀 확인만 |

### K-Cosmetics `/about` 링크를 고치지 않은 근거

`components/home/NoticeSection.tsx:54` 의 `<Link to="/about">전체보기 ›</Link>` 는 route 가 없어 형태상 dead link 지만,
**해당 컴포넌트를 소비하는 곳이 0건**이다 (`grep -rn "NoticeSection" services/web-k-cosmetics/` → 자기 자신 3줄 뿐).
실브라우저 홈에서도 이 컴포넌트가 아닌 다른 공지 섹션(`공지 / 전체보기 → /forum`)이 렌더된다.

- **렌더 경로가 없으므로 사용자가 클릭할 수 없다** — 실브라우저 smoke 전 경로에서 `a[href="/about"]` **0건**(§6).
- 교체할 유효 route 도 없다 (K-Cosmetics 에 notices/about route 부재).
- orphan 컴포넌트 삭제는 본 WO 범위(catch-all · dead link)를 벗어난 **정리 작업**이다.

→ 고치지 않고 **보고**한다. 후속 후보 §10-1.

---

## 6. 정상 route smoke

프로덕션 실브라우저(비인증 세션). SPA 내부 전환 + 하드 내비게이션 병행.

| 서비스 | 경로 | h1 / 관측 | 판정 |
|------|------|------|:---:|
| KPA | `/` | 정보를 매장 실행 경쟁력으로 연결합니다 | ✅ |
| KPA | `/store-hub` | `/login` 으로 이동 (**기존 HubGuard** — 비인증) | ✅ |
| KPA | `/forum` | KPA-Society 포럼 | ✅ |
| KPA | `/contact` | 협업과 연결 | ✅ |
| KPA | `/about` | 약사와 약국을 위한 하나의 전문 공간 (**실제 소개 페이지**) | ✅ |
| GlycoPharm | `/` | GlycoPharm 관리 현황 | ✅ |
| GlycoPharm | `/forum` | GlycoPharm 포럼 | ✅ |
| GlycoPharm | `/contact` | 문의하기 | ✅ |
| K-Cosmetics | `/` | K-Beauty Community Hub | ✅ |
| K-Cosmetics | `/forum` | K-Cosmetics 포럼 | ✅ |
| K-Cosmetics | `/contact` | 문의 | ✅ |
| Pharmacy-Hub | `/` | Pharmacy-Hub 파머시 허브 | ✅ |
| Pharmacy-Hub | `/login` | Pharmacy-Hub 로그인 | ✅ |
| Pharmacy-Hub | `/join` | Pharmacy-Hub 가입 신청 | ✅ |
| Pharmacy-Hub | `/join/status` | Pharmacy-Hub 가입 상태 | ✅ |
| Pharmacy-Hub | `/store-owner` | `/login` 으로 이동 (**기존 StoreOwnerShell guard** — 비인증) | ✅ |
| Neture | `/` | Neture | ✅ |

> WO §5 의 KPA `/community` 는 코드상 `<Navigate to="/" replace />` (App.tsx:616) 라 별도 화면이 없다.
> 실제 화면이 있는 `/forum` · `/contact` 로 대체했다 (§5 "실제 route 가 다르면 코드 기준으로 대체" 지시).

**auth guard route 는 기존 guard 화면을 그대로 유지**했다 — 404 로 가로채지 않았다.
KPA `/store-hub` · Pharmacy-Hub `/store-owner` 가 `/login` 으로 가는 것은 catch-all 이 아니라 **기존 guard 동작**이며,
guard 코드는 이번 작업에서 전혀 건드리지 않았다.

**redirect loop 0건** — 모든 경로에서 1회 이동 후 안정.

---

## 7. 없는 route smoke

| 서비스 | 요청 경로 | 도착 주소 | 404 안내 | `a[href="/about"]` |
|------|------|------|:---:|:---:|
| KPA | `/not-existing-test` | 동일 유지 | ✅ (`404` · 페이지를 찾을 수 없습니다) | 0 |
| KPA | `/store-hub/not-existing-test` | 동일 유지 | ✅ | 0 |
| GlycoPharm | `/about` | 동일 유지 | ✅ | 0 |
| GlycoPharm | `/not-existing-test` | 동일 유지 | ✅ | 0 |
| K-Cosmetics | `/about` | 동일 유지 | ✅ | 0 |
| K-Cosmetics | `/not-existing-test` | 동일 유지 | ✅ | 0 |
| Pharmacy-Hub | `/about` | 동일 유지 | ✅ (**신규**) | 0 |
| Pharmacy-Hub | `/not-existing-test` | 동일 유지 | ✅ (**신규**) | 0 |
| Pharmacy-Hub | `/store-owner/not-existing-test` | 동일 유지 | ✅ (**신규**) | 0 |
| Neture | `/about` | 동일 유지 | ✅ | 0 |
| Neture | `/not-existing-test` | 동일 유지 | ✅ | 0 |
| Neture | `/supplier/not-existing-test` | 동일 유지 | ✅ | 0 |
| Neture | `/partner/not-existing-test` | 동일 유지 | ✅ | 0 |

전 서비스·전 경로에서 **요청 주소 보존**(`location.pathname === 요청 경로`) · **blank 0건** · **홈 흡수 0건**.

Pharmacy-Hub 는 주소창 직접 진입(`https://pharmacyhub.co.kr/not-existing-test`)으로도 별도 확인했다 — 예전에는 `/` 로 튕겼다.

### console error

| 서비스 | 관측 | 판정 |
|------|------|------|
| Pharmacy-Hub | 에러 **0건** (autocomplete 힌트 VERBOSE 2건뿐) | ✅ |
| KPA · GlycoPharm · K-Cosmetics · Neture | `401 /api/v1/auth/me` · `401 /api/v1/auth/refresh` · `Authentication failed. Tokens cleared.` | ⚠️ 비인증 세션 기인 · 본 변경과 무관 |

선행 WO 에서 Neture 는 **인증 상태로 재실행하여 console error 0건**임을 이미 확인했다.
나머지 3개 서비스는 이번 작업에서 **코드를 변경하지 않았으므로** 비인증 401 은 사전 상태 그대로다 — 숨기지 않고 기록한다.

---

## 8. typecheck · build · deploy

| 서비스 | typecheck | build | deploy |
|------|:---:|:---:|:---:|
| `web-pharmacy-hub` | ✅ `pnpm run type-check` (`tsc -b`) PASS | ✅ `pnpm run build` PASS (15.04s) | ✅ run **31450226915** · `deploy-pharmacy-hub: success` |
| `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-neture` | — | — | detect-changes **skipped** (변경 0) |

**API 배포 없음** (WO §7 준수) — 백엔드 파일 변경 0건.

---

## 9. 금지사항 준수 (WO §4)

| 금지 | 준수 |
|------|:---:|
| 기존 route 삭제 | ✅ 없음 (catch-all 의 element 만 교체 — route 수 불변) |
| redirect 대량 정책 변경 | ✅ 없음 (단일 catch-all 1건 · 서브트리 redirect 2건은 그대로 유지) |
| auth / role / permission 변경 | ✅ 없음 (guard 파일 무접촉 · `/store-owner` guard 동작 동일) |
| backend 변경 | ✅ 없음 |
| DB write | ✅ 없음 |
| migration | ✅ 없음 |
| 공통 패키지 승격 | ✅ 없음 (서비스 로컬 페이지로 생성) |
| 서비스 IA 대개편 | ✅ 없음 (메뉴·네비 무변경) |
| 404 를 redirect 로 처리 | ✅ 없음 (render · 주소 보존) |

---

## 10. 후속 후보 (본 WO 범위 아님)

1. `WO-O4O-KCOS-ORPHAN-HOME-COMPONENT-CLEANUP-V1` — `web-k-cosmetics` `components/home/NoticeSection.tsx` 소비처 0건 정리 (내부 `/about` dead link 동반 제거)
2. `WO-O4O-NOTFOUND-PAGE-CONVENTION-ALIGN-V1` — 서비스별 404 문구·복귀 네비가 3종으로 갈라져 있다(KPA inline / GlycoPharm·K-Cos 3버튼 / Neture·PH 2버튼). 공통 패키지 승격 여부 판단
3. `WO-O4O-WEB-DEAD-LINK-SWEEP-CROSS-SERVICE-V1` — `/about` 외 전 서비스 내부 링크 ↔ route 선언 대조 전수 (이번엔 `/about` 한 축만 봤다)

---

## 11. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§10 — 전부 코드 정리이며 기준 문서 정합 문제 아님)
