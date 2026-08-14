# CHECK-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1

- **WO**: `WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1`
- **작성일**: 2026-08-14
- **브랜치**: `work/commonization-community` (기준 commit `95d73b9ed`)
- **대상 서비스**: KPA-Society / K-Cosmetics / GlycoPharm
- **대상 축**: 커뮤니티 홈 **최신 활동(최신글) 섹션** (View 까지 공통화)
- **선행 census**: `IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1` (F27 / 묶음 5)
- **판정**: **PASS** — VD 3셀 전부 `VIEW_DUPLICATED → FULLY_COMMON`

---

## 1. 재실측 (census 수치 재사용 금지)

census 의 F27 판정을 근거로 쓰지 않고 3서비스 파일을 직접 정독·기계 diff 했다.

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm |
|---|---|---|---|
| 홈 page 파일 | `src/pages/CommunityHomePage.tsx` (385L) | `src/pages/HomePage.tsx` (309L) | `src/pages/community/CommunityMainPage.tsx` (481L) |
| 섹션 위치 | `StandardHomeTemplate` `latestSlot` | 동일 | 동일 |
| 데이터 source | `homeApi.getLatest` → `/api/v1/kpa/home/latest` | `/api/v1/cosmetics/home/latest` | `/api/v1/glycopharm/home/latest` |
| 응답 shape | `{ success, data: LatestItem[] }` | 동일 (client 가 `data` 만 반환) | 동일 (wrapper `{ data, error }`) |
| 표시 개수 | 6 (`LATEST_SUMMARY_LIMIT`) | 6 | 6 |
| 표시 항목 | 종류 배지 / 제목 / 작성자(sm↑) / 날짜(`ko-KR` month+day) | 동일 | 동일 |
| 정렬 | backend 위임 (프론트 정렬 없음) | 동일 | 동일 |
| 탭 | all / forum / course / content / signage / resource | 동일 | 동일 |
| 탭 바로가기 | `/forum` `/lms` `/content` `/signage` `/resources` | content=`/store-hub/content` · signage=`/store/marketing/signage/playlist` | content=`/store-hub/content` · signage=`/store/marketing/signage/library` |
| loading | `Loader2` 스피너 | 동일 | 동일 |
| error | **있음** (문구 + 재시도) | **없음** (실패를 빈 목록으로 위장) | 있음 (문구 2줄 + 재시도) |
| empty | "등록된 글이 없습니다" | 동일 | 동일 |
| 클릭 destination | `item.href` (backend 제공) `<Link to>` | 동일 | 동일 |
| accent | blue | pink | emerald |
| 모바일/데스크톱 | 작성자 `hidden sm:block` 만 차이 | 동일 | 동일 |
| 로그인 필요 여부 | 없음 (공개 섹션) | 없음 | 없음 |
| 기존 shared 소비 | 없음 (인라인 100%) | 없음 | 없음 |

### 실제 diff (기계 대조)

세 파일에서 `LATEST_SUMMARY_LIMIT` ~ `LatestActivitySection` 함수 끝까지 추출해 `diff` 로 대조했다.

- **KPA ↔ KCos**: 차이 = 탭 href 2개 · accent class 3곳 · error/onRetry 분기 유무 · 주석 1줄. **그 외 전 라인 동일.**
- **KPA ↔ GP**: 차이 = 탭 href 2개 · accent class 3곳 · error 문구/버튼 스타일 · prop 이름(`error` vs `loadError`) · 주석 1줄. **그 외 전 라인 동일.**

→ **동일 업무 · 동일 데이터 계약 · 동일 UI**. 업무 모델 차이 없음 → §11 중지 조건 해당 없음.

## 2. 기존 shared `ActivitySection` 재사용 판정 (WO §4)

`packages/shared-space-ui/src/ActivitySection.tsx` 를 정독했다.

| 축 | 기존 `ActivitySection` | 이번 최신 활동 섹션 |
|---|---|---|
| 입력 | `featuredPosts` + `recentPosts` (포럼 글 전용) | 다종(forum/course/content/resource/signage) 통합 feed 1배열 |
| 구조 | "인기 글" 3-card grid + "최근 글" 리스트 | 탭 필터 + 단일 리스트 |
| 탭 | 없음 | 6탭 + 탭별 바로가기 |
| 상태 | loading / empty (2상태) | loading / error+retry / empty / list (4상태) |
| 종류 배지 | 없음 (category 문자열) | type→배지 매핑 |
| 스타일 | 인라인 `CSSProperties` | tailwind class |
| 소비처 | **0** | — |

**판정: 계약 불일치 → 채택하지 않는다.** 데이터 계약(단일 포럼 글 목록 vs 다종 통합 feed)과 UX 계약(탭/4상태)이 달라, 재사용하려면 사실상 전면 재작성이 된다. WO §4 의 "억지 재사용 금지" 에 해당하므로 **신규 shared View** 를 만들었다.

**`ActivitySection` 은 이번 작업 후에도 소비 0 = 사문화 상태 그대로다.** 이번 WO 범위(홈 최신 활동 축) 밖이라 삭제하지 않고 기록만 한다. `HeroSummarySection` · `ContentHighlightSection` · `SignagePreviewSection` · `LessonCardPreview` 도 소비 0 유지. → **소비 0 shared export 5개 처리는 별도 WO 로 분리 권고**(정리 대상 목록이 이번 CHECK 로 확정됨).

## 3. 공통 View

| 파일 | 라인 | 역할 |
|---|---:|---|
| `packages/shared-space-ui/src/community/LatestActivitySection.tsx` | 289 | 최신 활동 섹션 전체 View + 계약 타입 + accent 프리셋 + 탭 factory |
| `packages/shared-space-ui/src/index.ts` | (+16) | export 추가 |

공개 계약:

- `LatestActivitySection` (View)
- `LatestActivityItem` / `LatestActivityTab` / `LatestActivityAccent` / `LatestActivitySectionProps`
- `LATEST_ACTIVITY_ACCENTS` (`blue` / `pink` / `emerald`) · `LATEST_ACTIVITY_BADGES` · `LATEST_ACTIVITY_SUMMARY_LIMIT`
- `buildLatestActivityTabs(overrides)` — 서비스별로 다른 공간 route 만 override

불변식(WO §3):

- **`serviceType`/`serviceKey` 분기 0.** 차이는 전부 props.
- **View 안에서 fetch/API client 사용 0.** `items` / `loading` / `loadError` 는 주입.
- **react-router 직접 의존 0.** 마크업은 실제 `<a href>` 를 유지하고 좌클릭만 주입된 `navigate` 로 가로챈다(새 탭·미들클릭·크롤러 접근성 보존). `navigate` 미주입 시 앵커 기본 동작으로 폴백.
- **`lucide-react` 의존 없이** 인라인 SVG 스피너 사용 (패키지 의존 추가 0).
- 4상태(loading / loadError / empty / list) 를 각각 구분해 렌더 — 조회 실패를 empty 로 위장하지 않는다.

## 4. 서비스별 config (보존한 차이)

| 서비스 | tabs override | accent | error 상태 | navigate |
|---|---|---|---|---|
| KPA | 없음 (기본값) | `LATEST_ACTIVITY_ACCENTS.blue` | 기존 유지 | `useNavigate()` |
| KCos | content `/store-hub/content` · signage `/store/marketing/signage/playlist` | `.pink` | **신규 추가** (아래 §5) | `useNavigate()` 신규 |
| GP | content `/store-hub/content` · signage `/store/marketing/signage/library` | `.emerald` | 기존 유지 | `useNavigate()` 신규 |

섹션 제목("최신글") · 표시 개수(6) · empty 문구는 3서비스가 이미 동일해 공통 기본값으로 흡수했고, props 로 override 가능하게 열어두었다.

## 5. 부수 정합 (K-Cosmetics 실패 상태)

KCos 만 조회 실패를 빈 목록으로 위장하고 있었다(`.catch(() => setLatestItems([]))`). 공통 View 의 4상태 계약을 적용하면서:

- `src/api/home.ts` `getLatest` — 응답이 배열이 아니면 `LATEST_ACTIVITY_CONTRACT_VIOLATION` throw (KPA 의 `Array.isArray` 계약 검사와 동일 취지).
- `src/pages/HomePage.tsx` — `latestError` / `latestReloadKey` 상태 추가, 실패 시 error 렌더 + 재시도.

backend 변경 아님(프론트 실패 전달 계약 정합). KPA/GP 는 기존 동작 그대로.

## 6. LOC 변경 전/후

| 파일 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| KPA `CommunityHomePage.tsx` | 385 | 279 | **-106** |
| KCos `HomePage.tsx` | 309 | 233 | **-76** |
| GP `CommunityMainPage.tsx` | 481 | 377 | **-104** |
| 서비스 합계 | 1,175 | 889 | **-286** |
| 공통 View (신규) | 0 | 289 | +289 |
| 삭제된 duplicated JSX 블록 | 3벌 (KPA 120L · KCos 104L · GP 121L = 345L) | **0** | — |
| 공통 View 소비 서비스 수 | 0 | **3** | — |
| 잔존 inline 복제 (`function LatestActivitySection` 정의) | 3 | **0** (공통 패키지 1곳만) | — |

## 7. census 3셀 전/후 판정 (WO §7)

| # | 셀 (F27) | 전 | 후 |
|---|---|---|---|
| 1 | KPA 최신 활동 피드(홈 섹션) | VIEW_DUPLICATED | **FULLY_COMMON** |
| 2 | K-Cosmetics 최신 활동 피드 | VIEW_DUPLICATED | **FULLY_COMMON** |
| 3 | GlycoPharm 최신 활동 피드 | VIEW_DUPLICATED | **FULLY_COMMON** |

`CORE_ONLY` 로 남긴 셀 없음 · `SERVICE_SPECIFIC` 판정 없음.

## 8. Backend 변경 여부

**없음.** `apps/api-server` 무수정 · 신규 activity aggregate API 0 · DB migration 0 · feed/event 원장 통합 0 · activity 모델 변경 0.

census 묶음 5 가 함께 제안했던 **backend `/home/latest` 3벌 핸들러 파라미터화는 본 WO §6(백엔드 미변경)에 따라 수행하지 않았다.** 별도 WO 대상으로 남긴다.

## 9. 검증

| 항목 | 결과 |
|---|---|
| `@o4o/shared-space-ui` typecheck (`tsc --noEmit`) | PASS |
| KPA typecheck | PASS |
| K-Cosmetics typecheck | PASS |
| GlycoPharm typecheck | PASS |
| KPA build (`vite build`) | PASS (17.99s) |
| K-Cosmetics build | PASS (15.04s) |
| GlycoPharm build | PASS (16.56s) |
| api-server jest (`npx jest`) | PASS — 118 suites / 1,937 tests, 실패 0 |
| shared View 단위 테스트 | **추가하지 않음** — 아래 사유 |

`@o4o/shared-space-ui` 는 source-only 패키지(빌드 산출 없음)이므로 소비 서비스 build 가 곧 패키지 build 검증이다.

**단위 테스트 미추가 사유**: 해당 패키지에 테스트 러너(vitest/jest)·설정·devDependency 가 없다. 추가하려면 `package.json` / lockfile 변경이 필요하고 이는 CLAUDE.md 중지 조건(dependency 변경)에 해당한다. WO §8 의 "필요하면 추가" 조건부 항목이므로 **미실측으로 정직 기록**한다.

### 미실측 항목

- 3서비스 **실브라우저 smoke**(홈 진입 · 탭 전환 · 클릭 이동 · 모바일 레이아웃)는 수행하지 않았다. 정적 검증 + typecheck + build 까지. 배포 후 육안 검증 필요.
- error 상태는 코드 경로로만 확인했다(실제 API 실패 재현 안 함).

## 10. 잔존 duplication / 잔존 위험

1. **backend `/home/latest` 3벌 인라인 핸들러**(kpa / cosmetics / glycopharm)는 그대로다 — 본 WO 범위 밖(§6). 별도 WO.
2. **소비 0 shared export 5개**(`ActivitySection` · `HeroSummarySection` · `ContentHighlightSection` · `SignagePreviewSection` · `LessonCardPreview`) 사문화 상태 유지 — 정리 별도 WO 권고.
3. KCos 는 이번 변경으로 **실패 시 화면 표시가 달라진다**(빈 목록 → 오류 + 재시도). 의도된 4상태 계약 정합이나 KCos 사용자에게는 UX 변화다.
4. 링크가 `<Link>` → `<a href>` + navigate 가로채기로 바뀌었다. SPA 이동 동작은 동일하나, `react-router` 의 `<Link>` 전용 부가 동작(예: `state` 전달)은 사용하지 않던 코드라 영향 없음.
5. 홈의 나머지 블록(hero / 공지 / AppEntry / CTA / help)은 이번 축 밖이며 일부는 이미 공통(`StandardHomeTemplate`), 일부는 서비스별 구현이다.

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(backend `/home/latest` 파라미터화 · 소비 0 shared export 5개 정리)

---

> 본 WO 완료는 **홈 최신 활동 섹션 축** 완료일 뿐, 커뮤니티 전체 공통화 완료를 의미하지 않는다.
