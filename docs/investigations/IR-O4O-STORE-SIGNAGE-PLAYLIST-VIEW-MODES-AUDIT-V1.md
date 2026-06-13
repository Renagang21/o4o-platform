# IR-O4O-STORE-SIGNAGE-PLAYLIST-VIEW-MODES-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/route/API/DB 무변경)
> **목적:** KPA/GP/KCos "내 매장" 디지털사이니지 플레이리스트의 **보기 모드**(일반 관리 보기 vs 실제 매장 송출 보기) 분리 현황을 확정한다.
> **작성:** 2026-06-13
> **선행:** IR-O4O-DIGITAL-SIGNAGE-CROSSSURFACE-UIUX-AUDIT-V1 / WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1

---

## ⚠️ 핵심 발견 (먼저 읽을 것)

> **2-view 구조는 KPA/GP/KCos 3서비스에 이미 존재한다.** "관리 보기 → player 선택 → chrome-free 전체화면 송출(새 탭)" 3단 패턴이 동일하게 구현되어 있다.
>
> 따라서 후속 WO 는 **"2-view 신규 구축"이 아니라 "격리 방식 정규화 + 공개 송출 경로 정리 + 깨진 CTA cleanup + 용어 정렬"** 로 좁혀야 한다. 본 IR 은 그 차이(drift)를 확정한다.

## 1. 조사 개요

각 서비스 "내 매장" signage 의 보기 모드를 (A) 일반 관리 보기(layout chrome 포함) vs (B) 실제 송출 보기(헤더/사이드바/버튼 없는 전체화면) 기준으로 조사. 3개 read-only 탐색(KPA / GP / KCos).

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `47c08e51f` |
| origin ahead/behind | 0 / 0 |
| git status --short | `M services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx` (다른 세션 WIP — 미접촉) |
| 조사 기준 commit | `47c08e51f` |

## 3. 조사 대상 / 제외

| 서비스 | 상태 |
|--------|------|
| KPA Society | 포함 ✅ |
| GlycoPharm | 포함 ✅ |
| K-Cosmetics | 포함 ✅ |
| Neture | 제외 (signage frontend 제거 완료, 약국형 내 매장 미해당) |

## 4. route 매트릭스

상태: LIVE / PARTIAL / MISSING / MIXED / N/A

| 서비스 | 관리 route | player 선택(브릿지) | 실제 송출 route | 공개(무인증) 송출 | 상태 |
|--------|-----------|----------------------|------------------|-------------------|:--:|
| **KPA** | `/store/marketing/signage/{playlist,videos,schedules}` (StoreSignagePage) | `/store/marketing/signage/player` (SignagePlayerSelectPage) | `/store/marketing/signage/play/:playlistId` (SignagePlaybackPage) | `/public/signage?playlist=:id` (PublicSignagePage) + `/signage/play/{media,playlist}/:id` (SignageFullscreenPlayerPage) | LIVE |
| **GP** | `/store/marketing/signage/{playlist,videos,schedules}` (StoreSignageMainPage) +`/library` +`/preview`(stub) | `/store/marketing/signage/player` (SignagePlayerSelectPage) | `/store/marketing/signage/play/:playlistId` (SignagePlaybackPage) | **없음(MISSING)** | LIVE |
| **KCos** | `/store/marketing/signage/{playlist,videos,schedules}` (StoreSignagePage) | `/store/marketing/signage/player` (SignagePlayerSelectPage) | `/store/marketing/signage/play/:playlistId` (SignagePlaybackPage) | **없음(MISSING)** | LIVE |

> 관리/송출 route 골격은 **3서비스 동일**. 차이: 공개(무인증) 송출은 **KPA만 보유**, GP 는 추가 `/library`·`/preview`(stub) 보유.

## 5. layout chrome 매트릭스 (실제 송출 보기)

| 서비스 | 송출 route | 격리 방식 | header | sidebar | footer | 관리 버튼 | 송출 적합성 |
|--------|-----------|----------|:--:|:--:|:--:|:--:|:--:|
| **KPA** | `/store/.../play/:playlistId` | **store layout wrapper 내부** + `fixed inset-0 z-50`(CSS 덮기) | 숨김(뒤에 mount) | 숨김 | 숨김 | 없음(overlay 컨트롤만) | ✅ (CSS overlay) |
| **KPA** | `/signage/play/*`, `/public/signage` | **layout 밖**(bare) | 없음 | 없음 | 없음 | 없음 | ✅ (route 격리) |
| **GP** | `/store/.../play/:playlistId` | **layout 밖**(bare, StoreLayoutWrapper 외부) | 없음 | 없음 | 없음 | 없음(overlay 컨트롤만) | ✅ (route 격리, 가장 깨끗) |
| **KCos** | `/store/.../play/:playlistId` | **store layout wrapper 내부** + `fixed inset-0 z-50`(CSS 덮기) | 숨김(뒤에 mount) | 숨김 | 숨김 | 없음(overlay 컨트롤만) | ✅ (CSS overlay) |

> **drift:** GP 송출 route 는 layout **밖**에 격리(가장 깨끗). KPA/KCos 의 `/store/.../play` 는 layout wrapper **안**에 있고 `fixed inset-0 z-50` 로 덮어 chrome 을 가림 — 시각적으로는 동일하나 store layout 이 뒤에 mount 됨(불필요 마운트). KPA 는 추가로 `/public/signage`·`/signage/play/*` 를 route-격리로 보유.

## 6. 화면 목적 분류

| 화면 | 분류 |
|------|------|
| StoreSignagePage / StoreSignageMainPage (3탭) | 관리 화면 (layout chrome 포함) |
| SignagePlayerSelectPage (`/player`) | 관리 화면(브릿지) — 게시된 플레이리스트 목록 + "재생" → 송출 route 를 **새 탭**(`window.open(_blank)`)으로 |
| SignagePlaybackPage (`/play/:playlistId`) | **실제 송출 화면** (chrome-free 전체화면) |
| KPA PublicSignagePage (`/public/signage`) | **공개 송출 화면**(무인증, 키오스크/TV URL) |
| KPA SignageFullscreenPlayerPage (`/signage/play/*`) | 커뮤니티 전체화면 재생 |
| GP SignagePreviewPage (`/preview`) | **stub("준비 중")** — dead/미완 |

## 7. 데이터 흐름

- **playlist id** → 송출 route param(`/play/:playlistId`). KPA 는 `_schedule` 특수값으로 스케줄 기반 송출.
- **content item** → 플레이리스트 항목(미디어), duration/transition, autoplay+loop, mute.
- **screen/device id** → **명시적 device/screen 엔티티 없음** — 송출은 "브라우저 전체화면" 기준(물리 device 관리 미구현). 용어상 "화면"은 송출 출력을 의미.
- **scope** → store/organizationId. 공개 송출(KPA `/public/signage`)은 `store-playlists/public/:id` 무인증 endpoint.
- **playback sequence** → timer 기반 auto-advance, requestFullscreen API(전체화면), 컨트롤 auto-hide(3~3.5s).

## 8. KPA 현재 상태

- 관리(3탭) + player 선택 + 송출(`/play`) + 공개(`/public/signage`) + 커뮤니티(`/signage/play/*`) — **가장 완비**.
- 송출(`/play/:playlistId`)은 store wrapper 내부 + `fixed inset-0 z-50` 로 chrome 가림(기능상 chrome-free).
- 전체화면 시작 화면("전체화면으로 재생"/"일반 화면으로 재생") + requestFullscreen 보유. F11 명시 텍스트 대신 버튼/힌트로 안내.

## 9. GlycoPharm 현재 상태

- 관리(3탭, StoreSignageMainPage) + `/library` + `/preview`(stub) + player 선택 + 송출(`/play`).
- 송출 route 는 **layout 밖 격리**(가장 깨끗).
- 공개(무인증) 송출 route **없음** — 실제 TV 무로그인 URL 재생 불가(store 인증 필요).
- `/preview` SignagePreviewPage 는 "준비 중" stub → cleanup/완성 판단 필요.

## 10. K-Cosmetics 현재 상태

- 관리(StoreSignagePage, 라우트 alias 3개) + player 선택 + 송출(`/play`).
- 송출 route 는 store wrapper 내부 + `fixed inset-0 z-50`(CSS 덮기).
- 공개(무인증) 송출 route **없음**.
- **깨진 CTA**: StoreSignagePage "콘텐츠 탐색" → `/partner/signage/content` (App.tsx 미정의, 404). cleanup 필요.

## 11. 2-view 설계 기준 (확정)

3서비스 공통 표준(이미 대체로 충족):

| 보기 | route 기준 | layout | UI |
|------|-----------|--------|-----|
| **일반 관리 보기** | `/store/marketing/signage/{playlist,videos,schedules}` + `/player` | store layout(chrome 포함) | 탭·편집·삭제·복사·미리보기/송출 CTA |
| **실제 송출 보기** | `/store/marketing/signage/play/:playlistId` | **layout 밖 격리 권장**(GP 패턴) | full-screen canvas + 최초 전체화면 안내 overlay만. header/sidebar/footer/탭/관리버튼 금지 |
| **공개 송출(선택)** | `/public/signage?playlist=:id` | 무인증, layout 밖 | 키오스크/TV URL 재생 |

권장 격리: **송출 route 를 store layout wrapper 밖으로** 빼서 GP 처럼 route-격리(KPA/KCos 의 `fixed inset-0` CSS 덮기 → route 격리로 정규화). 단 기능상 이미 chrome-free 이므로 **우선순위는 낮음**.

## 12. KPA 1차 정비 필요점

KPA 는 2-view 가 이미 완비 → 정비는 **경미**:
1. 송출(`/play/:playlistId`)을 store wrapper 밖 route 로 이동(불필요 layout mount 제거) — 선택.
2. 전체화면 안내 문구에 "F11" 또는 "브라우저 전체화면" 명시 보강 — 선택.
3. 송출/재생 용어 정렬("재생"/"송출"/"전체화면") — baseline 일관.

> KPA 는 baseline 정비 완료 + 2-view 완비 상태이므로, **KPA 1차 WO 는 "송출 route 격리 정규화 + 전체화면 안내 보강"** 수준의 작은 정비로 충분.

## 13. GP/KCos 확산 가능성

| 항목 | GP | KCos | 확산 판정 |
|------|-----|------|----------|
| 2-view 기본 구조 | ✅ 보유 | ✅ 보유 | 거의 동형 |
| 송출 route 격리 | ✅ 이미 layout 밖 | ⚠️ CSS 덮기 | KCos 만 정규화 후보 |
| 깨진 CTA | — | ⚠️ `/partner/signage/content` | **KCos cleanup 필수(E)** |
| stub | `/preview` 준비중 | — | GP preview 완성/제거 결정 |
| 공개 송출 | 없음 | 없음 | KPA `/public/signage` 패턴 확산 여부 결정(G) |

## 14. 권장 WO 순서

1. **`WO-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1`** (KPA 1차) — 송출 route 격리 정규화 + 전체화면 안내 보강 + 용어 정렬. (2-view 신규 구축 아님 — 정규화)
2. **`WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1`** (GP/KCos 확산) — baseline 용어 + KCos 깨진 route cleanup + (선택) 송출 route 격리.
3. **(선택) `IR-O4O-STORE-SIGNAGE-PUBLIC-DISPLAY-POLICY-V1`** — 실제 TV 무로그인 송출(공개 URL) 을 GP/KCos 에도 둘지(KPA `/public/signage` 패턴) 정책 결정.

## 15. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 2-view(관리/송출) 분리 존재? | ✅ 3서비스 모두 존재 — 사용자 우려와 달리 이미 구현됨 |
| 송출 보기 chrome-free? | ✅ 모두 chrome-free(GP=route격리, KPA/KCos=CSS overlay) |
| 송출 보기에 관리 UI 잔존? | ✅ 없음(overlay 컨트롤=전체화면 토글/닫기/진행만) |
| 전체화면 안내? | ✅ "전체화면으로 재생" + requestFullscreen. "F11" 명시 텍스트는 약함 → 보강 후보 |
| 실제 매장 TV 무로그인 송출? | ⚠️ KPA만(`/public/signage`). GP/KCos 는 store 인증 필요 — 물리 TV 시나리오 정책 결정 필요 |
| device/screen 엔티티? | ❌ 없음 — "화면"=브라우저 전체화면. device 관리 미구현(과장 금지) |
| KPA 고유 강제? | 주의 — 공개 송출/커뮤니티 재생은 KPA 고유, GP/KCos 강제 전 정책 확인 |
| 1인 유지보수성 | 송출 route 격리 방식 통일(GP 패턴) + KCos 깨진 route 제거가 유지보수 도움 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-STORE-SIGNAGE-PLAYLIST-VIEW-MODES-AUDIT-V1.md` |
| 조사 기준 commit | `47c08e51f` |
| 내 매장 signage route | 3서비스 동일 골격(`/store/marketing/signage/{playlist,videos,schedules,player,play/:id}`) |
| 일반 보기 / 실제 송출 보기 | **둘 다 3서비스 존재** (관리=chrome / 송출=chrome-free) |
| layout chrome 제거 | ✅ 모두 제거됨 (GP=route격리, KPA/KCos=`fixed inset-0 z-50` CSS) |
| F11/전체화면 안내 | requestFullscreen + "전체화면으로 재생" 보유. "F11" 명시 약함 → 보강 후보 |
| 공개(무인증) 송출 | KPA만 보유, GP/KCos 없음 |
| KCos 깨진 CTA | `/partner/signage/content` (404) — cleanup 필요 |
| KPA 1차 정비 필요점 | 송출 route 격리 정규화 + 전체화면 안내 보강(경미) |
| GP/KCos 확산 기준 | 2-view 동형 — 용어 정렬 + KCos cleanup + (선택) 격리/공개송출 |
| 권장 1차 WO | `WO-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1` |
| git status | 다른 세션 WIP 1건(LmsCoursesPage, 미접촉), 본 IR 문서만 신규 |
