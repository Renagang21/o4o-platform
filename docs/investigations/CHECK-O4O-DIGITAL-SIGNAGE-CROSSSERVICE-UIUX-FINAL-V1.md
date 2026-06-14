# CHECK-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-UIUX-FINAL-V1

> **유형:** 최종 점검 CHECK (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA / GlycoPharm / K-Cosmetics 디지털사이니지 사용자-facing UI-UX baseline 정렬 완료 상태를 최종 점검하고 공식 종료한다.
> **작성:** 2026-06-13
> **판정:** **PASS — 디지털사이니지 사용자-facing baseline 완료 고정**

---

## 1. 최종 판정 문구

> **디지털사이니지 사용자-facing UI-UX baseline 은 KPA / GlycoPharm / K-Cosmetics 기준으로 PASS 완료 고정한다.**
> Neture 는 signage frontend surface 제거 완료로 공통화 대상에서 제외한다.
> 남은 항목은 공개 송출 정책, dead surface cleanup, operator console 공통화 등 후속 backlog 이며, 현재 baseline 완료를 막는 blocker 가 아니다.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `99d10733b` |
| origin ahead/behind | `0 / 0` (동기화됨) |
| git status --short | (clean) |
| 다른 세션 WIP | 없음 |
| 조사 기준 commit | `99d10733b` |

## 3. 진행 경과 (선행 산출물)

| # | 산출물 | 결과 |
|---|--------|------|
| 1 | IR-O4O-DIGITAL-SIGNAGE-CROSSSURFACE-UIUX-AUDIT-V1 | surface 전수 조사, Neture signage 존재 발견, drift=프론트 표시층 |
| 2 | WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1 | Neture signage frontend surface 제거 (core/backend/DB 보존) |
| 3 | WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1 | KPA 용어/제목/CTA baseline (commit 829d6bf27) |
| 4 | IR-O4O-STORE-SIGNAGE-PLAYLIST-VIEW-MODES-AUDIT-V1 | 2-view 구조 조사 (commit 3b4057436) |
| 5 | WO-O4O-KPA-STORE-SIGNAGE-PLAYLIST-TWO-VIEW-V1 | KPA 송출 route 격리 (commit 9058a81f6) |
| 6 | WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1 | GP/KCos 확산+격리+cleanup (commit 4dbcb7ec7) |

## 4. 최종 완료 기준 점검

| # | 기준 | 결과 |
|:-:|------|:--:|
| 1 | KPA/GP/KCos 기능명 = `디지털사이니지` | ✅ |
| 2 | 내 매장 제목 = `디지털사이니지 운영` | ✅ (KPA·GP StoreSignageMainPage·KCos StoreSignagePage) |
| 3 | 실제 송출 화면이 관리 layout 과 분리 | ✅ (3서비스 송출 route layout wrapper 밖 격리) |
| 4 | 송출 화면 header/sidebar/footer/tabs/관리버튼 미마운트 | ✅ (가드-단독 route, layout 미적용) |
| 5 | F11/ESC 전체화면 안내 존재 | ✅ (3서비스 SignagePlaybackPage 동일 코드) |
| 6 | GP/KCos 에 KPA baseline 확산 | ✅ |
| 7 | KCos 깨진 route/link cleanup | ✅ (`/partner/signage/content` repoint+제거) |
| 8 | Neture signage frontend surface 제거 | ✅ (route/page/lazy import/menu 그룹 제거) |
| 9 | backend/API/DB/migration/shared signage core 무변경 | ✅ |
| 10 | 공개 무인증 송출 URL 미도입 | ✅ |

## 5. 서비스별 상태

| 서비스 | 상태 | 판정 |
|--------|------|:--:|
| **KPA Society** | 기준 baseline + 2-view 송출 route 격리 완료 | **PASS** |
| **GlycoPharm** | baseline 확산 + 송출 route 격리 완료 | **PASS** |
| **K-Cosmetics** | baseline 확산 + 송출 route 격리 + 깨진 route cleanup 완료 | **PASS** |
| **Neture** | signage frontend surface 제거 완료 | **대상 제외** |

## 6. 용어 정렬 (정적 재검증)

| 서비스 | live user-facing "디지털 사이니지"(띄어쓰기) | 비고 |
|--------|:--:|------|
| KPA | 0 | 잔존=코드 주석/JSDoc만 |
| GP | 0 | 잔존=주석 + dead/unrouted `StoreSignagePage.tsx`(StoreSignageMainPage 로 교체) |
| KCos | **0** (grep count 0 재확인) | — |

기준: 기능명/제목/메뉴/카드 = `디지털사이니지`, 내 매장 = `디지털사이니지 운영`, 송출 선택 = `디지털사이니지 송출`, hub hero = `플랫폼 디지털사이니지`. operator technical term("사이니지 미디어/플레이리스트")·도메인 문구("내 약국에 추가")는 정책상 보존.

## 7. 2-view 구조 (3서비스 정렬 확인)

| 보기 | route | layout | 가드 |
|------|-------|--------|------|
| 일반 관리 | `/store/marketing/signage/{playlist,videos,schedules,player}` | store layout(chrome 포함) | KPA PharmacyGuard / GP PharmacyStoreGuard / KCos StoreOwnerRoute (+ StoreLayoutWrapper) |
| 실제 송출 | `/store/marketing/signage/play/:playlistId` | **layout wrapper 밖** | 동일 가드 **단독**(StoreLayoutWrapper 미적용) |

- path 문자열 불필요 변경 없음(트리 위치만 격리). 인증/승인 가드 유지.
- 송출 화면 = `fixed inset-0 bg-black` canvas + overlay(전체화면 토글/닫기/진행/스케줄)만.
- F11/ESC 안내: "전체화면으로 재생"/"일반 화면으로 재생" + "전체화면 해제: ESC 키"/"브라우저 전체화면: F11 키" (3서비스 동일).

## 8. Neture 제외 확인

| 항목 | 결과 |
|------|------|
| signage route(`/supplier/signage/manage`·`/admin/signage/*`·`/operator/signage/*`) | ✅ 제거(App.tsx 제거 마커 주석만 잔존) |
| operator signage 메뉴 그룹 | ✅ 제거(operatorMenuGroups 제거 마커 + 미사용 enum 안전 default 1건만) |
| 사용자-facing signage 진입점 | ✅ 없음 |
| shared signage core/backend/DB | ✅ 보존(미변경) |
| Neture signage DB 데이터 | ✅ 미삭제(후속 정책) |

> 잔존 "signage/사이니지" 문자열(14파일 38건)은 **제거 마커 주석 + 미사용 enum 안전 default + guide/manual 설명 텍스트**이며 live signage surface 아님.

## 9. 무변경 확인

| 항목 | 결과 |
|------|------|
| backend / API | ✅ 무변경 |
| DB / migration | ✅ 무변경 |
| shared signage core (`@o4o-apps/digital-signage-core`, `@o4o/shared-space-ui` signage, `@o4o/types/signage`) | ✅ 미변경 |
| 공개 무인증 송출 URL | ✅ 미도입 |
| signage data model | ✅ 무변경 |

## 10. 빌드 검증 (참고)

직전 `WO-...-APPLY-V1` 후 GP/KCos 빌드 확인 — KCos PASS, GP 는 **무관한 forum 회귀**(`ForumPage.tsx` viewCount, 타 세션 commit 260f84485)로 막혀 1줄 가드(commit 99d10733b) unblock 후 **GP·KCos 빌드 PASS**. signage 변경 자체는 빌드 무이슈.

## 11. 남은 backlog (완료 blocker 아님)

### 선택적 cleanup
- GP dead `StoreSignagePage.tsx` / `/preview` stub 정리
- KCos 추가 dead link 정밀 점검
- signage operator console 3서비스 공통 추출
- signage hub template 추가 수렴(매장 허브 3 local copy → SignageHubTemplate)

### 정책 backlog
- 공개 무인증 송출 URL 도입 여부 / token 기반 display·player route
- device/screen 연결 기능 확장
- GP/KCos 공개 송출 정책
- Neture signage DB 데이터 cleanup 여부

### 후속 후보
- `IR-O4O-STORE-SIGNAGE-PUBLIC-DISPLAY-POLICY-V1`
- `IR-O4O-NETURE-SIGNAGE-DATA-CLEANUP-AUDIT-V1`
- `WO-O4O-DIGITAL-SIGNAGE-OPERATOR-CONSOLE-COMMONIZATION-V1`
- `WO-O4O-DIGITAL-SIGNAGE-DEAD-SURFACE-CLEANUP-V1`

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 생성 CHECK | `docs/investigations/CHECK-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-UIUX-FINAL-V1.md` |
| 조사 기준 commit | `99d10733b` |
| 최종 판정 | **PASS 완료 고정** (KPA/GP/KCos) |
| KPA/GP/KCos | 용어 + 2-view 송출 route 격리 + (KCos)cleanup 완료 |
| Neture | signage frontend surface 제거 완료 → 대상 제외 |
| backend/API/DB/migration/shared core | 무변경 |
| 공개 무인증 송출 URL | 미도입 |
| 남은 backlog | 선택적 cleanup + 정책(공개 송출/operator 공통화/data cleanup) — blocker 아님 |
| 코드/UI/route/menu 변경 | 없음(문서 1개) |
| 다른 세션 WIP | 미포함 |
