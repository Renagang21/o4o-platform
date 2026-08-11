# CHECK-O4O-WEB-ORPHAN-PAGE-COMPONENT-CLEANUP-V1

> WO: `WO-O4O-WEB-ORPHAN-PAGE-COMPONENT-CLEANUP-V1`
> 선행 WO: `WO-O4O-WEB-DEAD-LINK-SWEEP-CROSS-SERVICE-V1` (CLOSED / PASS, commit `8befb6b24`)
> 작성일: 2026-08-11
> 판정: **PASS (DELETE 13 / KEEP 0 / HOLD 2)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 시점 HEAD | `2cefa2aa7fc30bc7f03aa519ee4c36d83ca04a97` |
| 작업트리 상태 | clean (다른 세션의 untracked `apps/api-server/src/scripts/cosmetics-name-cleanup/`, `tmp/cosmetics-name-cleanup/` 2건은 미접촉) |
| 브랜치 | `main` |

---

## 2. orphan 후보 목록

선행 dead link sweep 에서 `ORPHAN_COMPONENT_ONLY` 로 분류된 파일 + 본 WO §3 의 추가 검색
(`export .* from`, `lazy\(`, `import\(`, `path=.*channel|principles|notice|about`) 결과.

| # | 서비스 | 파일 | importer | route mount | 링크 진입 |
|---|---|---|---|:---:|:---:|
| N1 | web-neture | `src/pages/channel/ChannelSalesStructurePage.tsx` (+ `pages/channel/index.ts`) | 0 (barrel re-export만) | 0 | 0 |
| N2 | web-neture | `src/pages/PlatformPrinciplesPage.tsx` | 0 | 0 | 0 |
| N3 | web-neture | `src/pages/manual/concepts/ConceptsPage.tsx` | 0 | 0 | 0 |
| K1 | web-kpa-society | `src/components/home/**` (10 파일) | 0 | 0 | 0 |
| C1 | web-k-cosmetics | `src/components/home/NoticeSection.tsx` | 0 | 0 | 0 |
| C2 | web-k-cosmetics | `src/pages/library/ContentLibraryPage.tsx` | 0 | 0 | 0 |

> **K1 은 WO 기재(“KPA orphan 1건”)보다 범위가 넓다.** 실제로는 `components/home/` 디렉터리 전체(10 파일)가 dead 였다.
> 8개 컴포넌트명 전수 grep 결과 외부 소비처 0, 경로 문자열 `components/home` 참조 0.
> KPA 홈은 현재 `CommunityHomePage` (`App.tsx:161`) 로 대체되어 있다.

---

## 3. 후보별 판정

| # | 파일 | 판정 | 근거 |
|---|---|:---:|---|
| K1 | kpa `src/components/home/**` (10) | **DELETE** | 디렉터리 전체 소비처 0. 홈 화면은 `CommunityHomePage` 로 대체 완료. 하위 `ActivitySection/ImportantNotices`·`RecentForumPosts` 도 외부 참조 0 |
| C1 | kcos `components/home/NoticeSection.tsx` | **DELETE** | 소비처 0. `HomePage.tsx` 가 공용 home 컴포넌트에 `notices={noticeItems}` 로 직접 주입하는 구조로 대체됨 |
| C2 | kcos `pages/library/ContentLibraryPage.tsx` | **DELETE** | `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` 로 `library/content` 는 `<Navigate to="/store-hub/content">` 로 대체. 상세는 별도 파일(`ContentDetailPage.tsx`) 이라 영향 없음 |
| N3 | neture `pages/manual/concepts/ConceptsPage.tsx` | **DELETE** | 소비처 0. 동일 내용의 현행 화면 `/guide/intro/concept` (`GuideIntroConceptPage` → `@o4o/shared-space-ui`) 이 이미 라이브. `pages/manual` 트리에 유일한 파일 |
| N1 | neture `pages/channel/ChannelSalesStructurePage.tsx` | **HOLD** | ① `pages/channel/index.ts` 에 선행 WO 의 명시적 보존 결정(“현재 App.tsx 직접 import 는 없으나, 외부 활용 가능성 위해 export 유지”)이 살아 있음 ② 흡수 대상이던 `/o4o/targets/{type}` 경로가 현재 App.tsx 에 존재하지 않아 “흡수처가 사라진 상태” → 삭제/route 복구 모두 IA·기획 판단 필요 |
| N2 | neture `PlatformPrinciplesPage.tsx` | **HOLD** | `WO-NETURE-PHARMA-LEGAL-JUDGMENT-INVESTIGATION-V1` 결과가 반영된 493줄 법적·규제 포지셔닝 문서(“왜 Neture 는 약국·도매상 자격을 직접 검증하지 않나요 / 자격 판단은 행정청의 권한입니다”). 대체 화면 없음. route 복구 = 법적 입장 재공표 → **CLAUDE.md 중지 조건 “법률·규제 판단 필요”** 에 해당 |

- **RESTORE 판정 0건.** N1·N2 는 “복구가 나은가”를 조사했으나 두 건 모두 사용자 판단이 필요해 HOLD 로 남겼다 (임의 route 신설 금지).
- **KEEP 판정 0건.** dynamic registry / manifest 소비 흔적은 6 후보 모두에서 발견되지 않았다.

---

## 4. 삭제 / 복구 / 유지 파일

### 삭제 (13 파일)

```
services/web-kpa-society/src/components/home/ActivitySection/ActivitySection.tsx
services/web-kpa-society/src/components/home/ActivitySection/ImportantNotices.tsx
services/web-kpa-society/src/components/home/ActivitySection/RecentForumPosts.tsx
services/web-kpa-society/src/components/home/CommunityServiceSection.tsx
services/web-kpa-society/src/components/home/FooterLinksSection.tsx
services/web-kpa-society/src/components/home/HeroCtaSection.tsx
services/web-kpa-society/src/components/home/NoticeSection.tsx
services/web-kpa-society/src/components/home/SignageSection.tsx
services/web-kpa-society/src/components/home/TabbedNewsSection.tsx
services/web-kpa-society/src/components/home/UtilitySection.tsx
services/web-k-cosmetics/src/components/home/NoticeSection.tsx
services/web-k-cosmetics/src/pages/library/ContentLibraryPage.tsx
services/web-neture/src/pages/manual/concepts/ConceptsPage.tsx
```

부수 변경 1건: `services/web-k-cosmetics/src/App.tsx` — 삭제된 파일을 가리키던 주석 1줄 갱신 (route·import 변경 없음).

### 복구

없음.

### 유지 (HOLD)

```
services/web-neture/src/pages/channel/ChannelSalesStructurePage.tsx
services/web-neture/src/pages/channel/index.ts
services/web-neture/src/pages/PlatformPrinciplesPage.tsx
```

---

## 5. smoke 결과

배포 후 프로덕션 실브라우저(Playwright) 확인.

| 서비스 | URL | 결과 |
|---|---|---|
| kpa-society | `https://kpa-society.co.kr/` | 홈 정상 렌더 · console error 0 · blank 0 |
| k-cosmetics | `https://k-cosmetics.site/` | 홈 정상 렌더 (공지 카드 포함) · console error 0 |
| k-cosmetics | `https://k-cosmetics.site/library/content` | `/store-hub/content` redirect 유지 → 비로그인이라 `/login` 으로 guard 이동 (기존 동작, 회귀 0) |
| neture | `https://neture.co.kr/guide/intro/concept` | 정상 렌더 (삭제된 ConceptsPage 의 대체 화면). console error 1건 = 비로그인 `auth/me` 401 (기존 동작, 본 변경과 무관) |
| neture | `https://neture.co.kr/manual/concepts` | route 없음 → catch-all 404 안내 render, 주소 `/manual/concepts` 보존 |

확인 항목: 삭제 파일 참조 0 / 정상 route 회귀 0 / 없는 route 는 catch-all 유지 / blank 0 — 충족.
console error 는 kpa · k-cosmetics 0 건, neture 는 비로그인 `auth/me` 401 1 건뿐이며 본 변경과 무관한 기존 동작이다.

---

## 6. typecheck · build · deploy 결과

| 서비스 | typecheck (`tsc -b`) | build (`npm run build`) | deploy |
|---|:---:|:---:|:---:|
| web-kpa-society | PASS | PASS (17.3s) | PASS |
| web-k-cosmetics | PASS | PASS (14.8s) | PASS |
| web-neture | PASS | PASS (13.7s) | PASS |

- 배포 workflow: `Deploy Web Services (Cloud Run)` run `31453474124`
- **API(`o4o-core-api`) 배포 없음** — backend 변경 0건.

---

## 7. commit SHA

| commit | 내용 |
|---|---|
| `a91e8179a` | orphan page/component 13건 삭제 + kcos App.tsx 주석 갱신 |
| (본 문서) | CHECK 문서 |

---

## 8. push 결과

`2cefa2aa7..a91e8179a  main -> main` — push 완료. `HEAD == origin/main`.

---

## 9. 후속 후보

1. **N1 `ChannelSalesStructurePage` 판정** — `/channel/structure` route 복구 vs 삭제. 흡수처였던 `/o4o/targets/{type}` 이 사라진 상태라 콘텐츠 소유처 재지정이 선행되어야 한다.
2. **N2 `PlatformPrinciplesPage` 판정** — 법적·규제 입장 공표 여부이므로 사용자 승인 필요.
3. `WO-O4O-WEB-DYNAMIC-LINK-SWEEP-V1` — 선행 sweep 에서 보류한 동적 경로 282건.

---

## 10. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**.
