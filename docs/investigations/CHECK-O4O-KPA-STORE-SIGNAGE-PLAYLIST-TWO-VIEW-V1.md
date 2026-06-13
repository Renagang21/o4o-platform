# CHECK-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1
> **선행:** IR-O4O-STORE-SIGNAGE-PLAYLIST-VIEW-MODES-AUDIT-V1 / WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1
> **작성:** 2026-06-13
> **판정:** **PASS** (KPA 2-view 정규화 — 실제 송출 route 격리, 신규 구축 아님)

---

## 1. 작업 개요

KPA 내 매장 디지털사이니지 플레이리스트의 **2-view(일반 관리 보기 / 실제 송출 보기)** 를 기준화. IR 결과 2-view 는 이미 존재 → **신규 구축이 아니라 정규화**:
- 실제 송출 route(`/store/marketing/signage/play/:playlistId`)를 store layout wrapper **밖**으로 격리(layout chrome 미마운트).
- 송출 화면 chrome(header/sidebar/footer/탭/관리버튼) 부재 확인.
- F11/전체화면 안내 확인(이미 존재).
- 용어 baseline 정렬.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| 작업 시작 HEAD | `47c08e51f` → IR commit `3b4057436` 후 진행 |
| origin ahead/behind | 0 / 0 |
| 다른 세션 WIP | LmsCoursesPage(작업 중 다른 세션 커밋) — 미포함. 작업 종료 시 working tree = 내 KPA 2파일만 |

## 3. 2-view 구조 (정규화 후)

| 보기 | route | layout | chrome |
|------|-------|--------|--------|
| **일반 관리 보기** | `/store/marketing/signage/{playlist,videos,schedules}` (StoreSignagePage, 3탭) + `/player`(SignagePlayerSelectPage 선택/브릿지) | `<PharmacyGuard><KpaStoreLayoutWrapper>` | header/sidebar/footer/탭/관리버튼 **있음**(정상) |
| **실제 송출 보기** | `/store/marketing/signage/play/:playlistId` (SignagePlaybackPage) | **`<PharmacyGuard>` 단독**(layout wrapper 밖) | **없음** — full-screen canvas + 전체화면 안내 overlay만 |

## 4. 변경 내역 (2파일)

### 4.1 App.tsx — 송출 route 격리
- **이전:** `<Route path="marketing/signage/play/:playlistId">` 가 `<Route path="/store" element={<PharmacyGuard><KpaStoreLayoutWrapper/></PharmacyGuard>}>` **child** 로 존재 → KpaStoreLayoutWrapper(header/sidebar)가 뒤에 mount 되고 `fixed inset-0 z-50` CSS 로 덮어 가림.
- **이후:** child route 제거 + store wrapper **밖** top-level route 추가:
  ```tsx
  <Route path="/store/marketing/signage/play/:playlistId"
         element={<PharmacyGuard><SignagePlaybackPage /></PharmacyGuard>} />
  ```
- **효과:** 인증(PharmacyGuard)은 유지, **layout wrapper(header/sidebar/footer)는 미마운트** → 송출 화면에 app chrome 이 DOM 에 아예 올라오지 않음(CSS 덮기 의존 제거).
- **path 문자열 동일**(`/store/marketing/signage/play/:playlistId`) → SignagePlayerSelectPage 의 `window.open(absolute URL, '_blank')` 진입 그대로 동작. route 중복 없음(child 1개 제거 + top-level 1개 추가).

### 4.2 SignagePlayerSelectPage.tsx — 용어 정렬
- 헤딩 "사이니지 재생" → **"디지털사이니지 송출"**.
- 설명 "게시된 플레이리스트를 선택하여 전체 화면으로 재생합니다." → "게시된 플레이리스트를 선택해 **매장 화면으로 전체화면 송출**합니다."

## 5. 격리 안전성 검토

- SignagePlaybackPage 의존성: `useAuth`(앱 레벨 AuthProvider), `getAccessToken`, signageV2/signageSchedule API, useParams/useNavigate. **KpaStoreLayoutWrapper 가 제공하는 context 의존 없음** → wrapper 밖으로 이동해도 안전.
- PharmacyGuard 는 `{children}` 을 렌더(StoreOwnerGuard 내부) → `<PharmacyGuard><SignagePlaybackPage/></PharmacyGuard>` 로 **인증·승인 가드 유지**.
- 접근 정책 불변: 송출 보기는 여전히 store_owner 인증 필요(공개 무인증 송출은 별개 `/public/signage`).

## 6. 송출 화면 chrome 부재 확인

| 요소 | 상태 |
|------|------|
| app header(KpaGlobalHeader) | ❌ 미마운트(route 격리) |
| store sidebar(StoreDashboardLayout) | ❌ 미마운트 |
| footer | ❌ 미마운트 |
| 탭/관리 버튼 | ❌ 없음 |
| 송출 화면 UI | full-screen `fixed inset-0 bg-black` canvas + overlay(전체화면 토글/닫기/진행 dots/스케줄 배너)만 |

## 7. F11 / 전체화면 안내 확인

✅ **이미 존재**(SignagePlaybackPage start screen):
- "전체화면으로 재생"(requestFullscreen) / "일반 화면으로 재생" 선택 버튼
- "전체화면 해제: ESC 키"
- "브라우저 전체화면: F11 키"

→ 추가 보강 불요(IR 의 "F11 약함" 은 cross-service 일반화였고, KPA 는 이미 충족). baseline 으로 고정.

## 8. 용어 정렬 결과

| 위치 | 정렬 |
|------|------|
| 관리 보기 제목(StoreSignagePage) | "디지털사이니지 운영" (선행 baseline WO 완료) |
| 송출 선택(SignagePlayerSelectPage) | "디지털사이니지 송출" / "매장 화면으로 전체화면 송출" |
| 송출 버튼 | "전체화면으로 재생" / "일반 화면으로 재생" / "현재 스케줄로 TV 재생" (구체 동작 — "재생" 유지) |
| 단위 | "플레이리스트" / "콘텐츠" 유지 |

## 9. 범위 / 변경 없음 확인

| 항목 | 결과 |
|------|------|
| GP / KCos | ✅ 미수정 |
| Neture | ✅ 대상 아님(signage 제거 완료) |
| backend / API / DB / migration | ✅ 무변경 |
| route path 문자열 | ✅ 동일(`/store/marketing/signage/play/:playlistId`) — 트리 위치만 격리, menu/링크 무변경 |
| shared package | ✅ 미수정 |
| 신규 컴포넌트/플레이어/fullscreen 구현 | 없음(기존 정규화만) |

## 10. TypeScript 검증

| 패키지 | 결과 |
|--------|------|
| web-kpa-society (`npx tsc --noEmit`) | ✅ **PASS (exit 0, 0 error)** |
| route 중복 | ✅ `/store/marketing/signage/play/:playlistId` 단일 정의(grep 확인) |

## 11. browser smoke

⚠️ **라이브 미수행(보류).** 변경은 route 트리 격리(동일 path) + 문자열 2건이며 tsc PASS + route 단일성 grep 확인. SignagePlaybackPage 컴포넌트 자체 무변경(layout context 비의존 검증). 회귀 위험 낮아 정적 검증으로 갈음.
- 권장 후속(사람 확인): `/store/marketing/signage/player` 진입 → "재생" → 새 탭 `/store/marketing/signage/play/:id` 에서 **header/sidebar 부재** + 전체화면 안내 + 재생 확인.

## 12. GP/KCos 확산 기준 (다음 WO)

`WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1` 에서 적용:
1. **송출 route 격리**: GP 는 이미 layout 밖(격리 완료). **KCos 만** `/store/marketing/signage/play/:playlistId` 를 store wrapper 밖 가드-단독 route 로 격리(KPA 패턴).
2. **용어**: 송출 선택 화면 "디지털사이니지 송출" 정렬.
3. **KCos 깨진 CTA cleanup**: "콘텐츠 탐색" → `/partner/signage/content`(404) 제거/정정.
4. **F11 안내**: GP/KCos 송출 start screen 에 ESC/F11 안내 동등 보강(KPA 기준).
5. 공개 무인증 송출(`/public/signage`)은 별도 IR 정책 결정 후.

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 2-view 정규화 | ✅ 송출 route 를 layout wrapper 밖으로 격리(PharmacyGuard 단독) |
| 수정 파일 | web-kpa-society 2개 (App.tsx, SignagePlayerSelectPage.tsx) |
| 송출 chrome | ✅ 부재(route 격리로 layout 미마운트) |
| F11/전체화면 안내 | ✅ 이미 존재(ESC/F11) — 기준 고정 |
| 용어 | "디지털사이니지 송출" 정렬 |
| GP/KCos/Neture | 미수정 |
| backend/API/DB/route path/menu | 무변경(트리 위치만 격리) |
| TypeScript | web-kpa-society PASS |
| browser smoke | tsc+grep 정적 갈음(라이브 보류) |
| 다른 세션 WIP | 미포함 |
| 다음 | `WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1` (GP/KCos 확산 + KCos cleanup) |
