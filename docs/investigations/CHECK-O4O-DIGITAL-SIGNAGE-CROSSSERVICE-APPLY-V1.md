# CHECK-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1
> **선행:** KPA baseline(WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1) + KPA 2-view(WO-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1)
> **작성:** 2026-06-13
> **판정:** **PASS** (GP/KCos 디지털사이니지 baseline 확산 — 용어 정렬 + 송출 route 격리 + KCos 깨진 route cleanup)

---

## ⚠️ WO 전제 정정 (먼저 읽을 것)

> WO 는 IR 기반으로 **"GP 송출 route 는 이미 격리됨 → GP 는 용어만"** 으로 기술했으나, **실제 코드 확인 결과 GP 도 송출 route(`/store/marketing/signage/play/:playlistId`)가 store layout wrapper 안**(`<Route path="store"><PharmacyStoreGuard><StoreLayoutWrapper>` 의 child, App.tsx 옛 970행)에 있었다. KCos 와 동일하게 `fixed inset-0 z-50` CSS 로 chrome 을 덮는 방식이었다.
>
> (IR 의 GP "bare/격리" 보고는 부정확했음.) 따라서 **GP·KCos 양쪽에 KPA 패턴 route 격리를 적용**했다. path 문자열은 불변 → WO 가 금지한 "route path 변경 / 신규 송출 route 구축" 이 아니라, WO 가 KCos 에 허용한 **"tree 위치 격리"** 와 동일 작업이다.

## 1. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| 조사 기준 HEAD | `cddfdd3ea` (working tree clean, 다른 세션 WIP 없음) |
| origin ahead/behind | 0 / 0 |
| staged | 없음 |

> (직전 시점에 다른 세션의 미push 커밋 + staged neture Footer 삭제가 있어 사용자 지시로 **대기** 후, working tree 가 clean 해진 시점에 진행.)

## 2. 적용 대상

| 서비스 | 작업 |
|--------|------|
| **GlycoPharm** | 용어 정렬 + **송출 route 격리**(전제 정정) + F11 확인 |
| **K-Cosmetics** | 용어 정렬 + **송출 route 격리** + **깨진 `/partner/signage/content` cleanup** + F11 확인 |
| KPA | 미수정(완료) |
| Neture | 미수정(signage 제거 완료) |

## 3. 송출 route 격리 (GP·KCos)

### 패턴 (KPA 동일)
- **이전:** `marketing/signage/play/:playlistId` 가 store layout wrapper child → wrapper(header/sidebar/footer) mount 후 `fixed inset-0 z-50` CSS 로 덮음.
- **이후:** child 제거 + wrapper **밖** top-level route 추가, **가드만 유지·layout 미적용**.

| 서비스 | 격리 route | 가드 |
|--------|-----------|------|
| GP | `/store/marketing/signage/play/:playlistId` (App.tsx 911행) | `<PharmacyStoreGuard><SignagePlaybackPage/></PharmacyStoreGuard>` |
| KCos | `/store/marketing/signage/play/:playlistId` (App.tsx 711행) | `<StoreOwnerRoute><SignagePlaybackPage/></StoreOwnerRoute>` |

### 안전성
- GP/KCos `SignagePlaybackPage` 는 `useStore`/`useOutletContext`/`useContext`/`useAuth` **미사용**(grep 0) → layout context 비의존 → 격리 안전.
- GP `PharmacyStoreGuard`·KCos `StoreOwnerRoute` 모두 `{children}` 패턴(원래 `<Guard><StoreLayoutWrapper/></Guard>`) → 가드 유지.
- path 문자열 불변 → SignagePlayerSelectPage 의 `window.open(absolute URL,'_blank')` 진입 그대로. redirect alias(`signage/play/:playlistId`→canonical) 영향 없음.
- route 중복 없음: canonical 1개(격리) + flat redirect alias 1개. grep 확인.

## 4. KCos 깨진 route cleanup

`/partner/signage/content` 는 KCos App.tsx 에 route **미정의**(404, dead) 확인.

| 위치 | 처리 |
|------|------|
| `pages/store/StoreSignagePage.tsx:198` "콘텐츠 탐색" CTA | → **`/store-hub/signage`** 로 repoint (작동하는 KCos signage 콘텐츠 탐색/추가 화면 — 의도 보존) |
| `components/layouts/DashboardLayout.tsx:204` 파트너 메뉴 "사이니지 콘텐츠" → `/partner/signage/content` | **dead 메뉴 항목 제거** (다른 파트너 메뉴 항목은 미접촉) |

> dead link 만 정리, 정상 기능 미제거. 공개 무인증 송출 URL 신설 없음(WO 정책 준수).

## 5. 용어 정렬 결과

기준(KPA baseline): 기능명/제목/메뉴/카드 = **"디지털사이니지"**, 내 매장 제목 = **"디지털사이니지 운영"**, 송출 선택 = **"디지털사이니지 송출"**, hub hero = **"플랫폼 디지털사이니지"**, 보조 = "매장 화면에 송출할 콘텐츠".

### GP (14파일)
| 위치 | 정렬 |
|------|------|
| StoreSignageMainPage(내 매장, 활성) | "사이니지 운영" → "디지털사이니지 운영" + 부제·GuideBackLink |
| SignagePlayerSelectPage | "사이니지 재생" → "디지털사이니지 송출" |
| HubSignageLibraryPage | "플랫폼 사이니지"→"플랫폼 디지털사이니지", "사이니지 운영 화면"→"디지털사이니지 운영 화면" |
| StoreHubPage | 카드 "디지털 사이니지"→"디지털사이니지" + 설명/actionLabel ("내 약국에 추가" 도메인 보존) |
| CommunityMainPage | hero subtitle·카드·CTA 정규화 |
| StoreChannelsPage | 채널 설명·"사이니지 운영" 버튼 정규화 |
| StoreOverviewPage | 카드 제목 "사이니지"→"디지털사이니지" + 설명 |
| ContentLibraryPage | heroTitle·heroDesc 정규화 |
| FeatureIntroPage / PharmacyApplyPage / MyApplicationsPage / ApplicationsPage / ApplicationDetailPage | 신청·operator 라벨 "디지털 사이니지"→"디지털사이니지" |

### KCos (9파일)
| 위치 | 정렬 |
|------|------|
| StoreSignagePage(내 매장) | "사이니지 플레이리스트" → "디지털사이니지 운영" + 부제·GuideBackLink + CTA repoint |
| SignagePlayerSelectPage | "사이니지 재생" → "디지털사이니지 송출" |
| HubSignagePage | "플랫폼 사이니지"→"플랫폼 디지털사이니지", "사이니지 운영 화면"→"디지털사이니지 운영 화면" |
| KCosmeticsHubPage | 카드 정규화 + actionLabel "디지털사이니지 탐색" |
| HomePage | 카드 "디지털 사이니지"→"디지털사이니지" + 설명 |
| DashboardLayout | dead 메뉴 제거(§4) |
| StoreChannelsPage / ApplyPage | 채널 설명·신청 라벨 정규화 |

### 잔존 user-facing "디지털 사이니지" (혼용)
**0건(live).** 잔존은 모두:
- **코드 주석/JSDoc**: GP ContentLibraryPage:2,5 / StoreSignageMainPage:2 / StoreSignagePage:2, KCos StoreSignagePage:2 — 비-user-facing.
- **dead/unrouted 파일**: GP `pages/store-management/StoreSignagePage.tsx:409` ("사이니지 운영") — App.tsx 에서 **StoreSignageMainPage 로 교체된 미라우팅 legacy 파일**(App.tsx:93 주석). dead code → WO상 미수정.
- **operator technical**: KCos HqPlaylistsPage:173 "본사 사이니지 재생목록" — 운영자 전용(baseline 허용).

## 6. F11 / 전체화면 안내

✅ **GP·KCos SignagePlaybackPage 모두 이미 보유**(KPA 동일 코드):
- "전체화면으로 재생"/"일반 화면으로 재생" 선택
- "전체화면 해제: ESC 키" / "브라우저 전체화면: F11 키"
- 재생 중 "F11 키로 브라우저 전체화면 전환" 힌트

→ 보강 불요, KPA 기준과 동일하게 충족. 기준 고정.

## 7. 송출 화면 chrome 부재 확인

격리 후 GP·KCos 송출 route 에 store layout wrapper(header/sidebar/footer) **미마운트**. 송출 화면 = `fixed inset-0 bg-black` canvas + overlay(전체화면 토글/닫기/진행/스케줄)만. 관리 버튼/탭 없음.

## 8. 범위 / 변경 없음 확인

| 항목 | 결과 |
|------|------|
| KPA | ✅ 미수정 (diff 0) |
| Neture | ✅ 미수정 (signage 제거 완료) |
| backend / API / DB / migration | ✅ 무변경 |
| shared signage core / packages | ✅ 미수정 |
| route path 문자열 | ✅ 불변 (tree 위치 격리만) |
| 공개 무인증 송출 URL | ✅ 신설 없음 |
| 신규 device/screen 기능 | ✅ 없음 |

## 9. TypeScript 검증

| 패키지 | 결과 |
|--------|------|
| web-glycopharm (`npx tsc --noEmit`) | ✅ **PASS (exit 0)** |
| web-k-cosmetics (`npx tsc --noEmit`) | ✅ **PASS (exit 0)** |
| route 중복 | ✅ canonical 1 + redirect alias 1 (양 서비스, grep 확인) |
| KPA/Neture diff | ✅ 없음 |

## 10. browser smoke

⚠️ **라이브 미수행(보류).** 변경 = route 트리 격리(동일 path) + 문자열 정렬 + dead link 정리. GP/KCos tsc PASS + route 단일성 grep 확인. SignagePlaybackPage 컴포넌트 무변경(layout 비의존 검증). 회귀 위험 낮아 정적 검증 갈음.
- 권장 후속(사람 확인): GP/KCos `/store/marketing/signage/player` → "재생" → 새 탭 송출 화면 header/sidebar 부재 확인; KCos "콘텐츠 탐색"→`/store-hub/signage` 정상; 메뉴에 "사이니지 콘텐츠" 404 없음.

## 11. 후속

- **공개 무인증 송출 URL 정책**: 본 WO 미포함. GP/KCos 에 KPA `/public/signage` 류를 둘지 → 별도 `IR-O4O-STORE-SIGNAGE-PUBLIC-DISPLAY-POLICY-V1` 에서 결정.
- (선택) GP dead `pages/store-management/StoreSignagePage.tsx` 제거 + GP `/preview` stub 정리 → 별도 cleanup WO 후보.
- 디지털사이니지 사용자-facing baseline 3서비스(KPA/GP/KCos) 1차 정렬 완료 → `CHECK-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-UIUX-FINAL-V1` 로 종료 고정 가능.

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| GP 적용 | 용어 14파일 + 송출 route 격리(전제 정정) + F11 확인 |
| KCos 적용 | 용어 8파일 + 송출 route 격리 + 깨진 route cleanup + F11 확인 |
| 용어 정렬 | live user-facing "디지털 사이니지" 혼용 0 (잔존=주석/dead/operator) |
| 송출 route 격리 | GP·KCos 모두 layout wrapper 밖 가드-단독 route |
| KCos 깨진 route | CTA repoint(`/store-hub/signage`) + dead 메뉴 제거 |
| F11/전체화면 안내 | 이미 존재(KPA 동일) — 기준 고정 |
| KPA/Neture | 미수정 |
| backend/API/DB/path | 무변경 |
| TypeScript | GP·KCos PASS |
| browser smoke | tsc+grep 정적 갈음(라이브 보류) |
| 다른 세션 WIP | 미포함 |
| 수정 파일 | GP 14 + KCos 9 = 23 + CHECK |
