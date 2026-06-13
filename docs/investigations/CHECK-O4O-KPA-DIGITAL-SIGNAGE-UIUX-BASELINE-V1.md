# CHECK-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1
> **선행:** IR-O4O-DIGITAL-SIGNAGE-CROSSSURFACE-UIUX-AUDIT-V1 / WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1
> **작성:** 2026-06-13
> **판정:** **PASS** (KPA 사용자-facing 디지털사이니지 용어/제목 baseline 정렬, backend/route/IA 무변경)

---

## 1. 조사 기준 / 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| 조사 기준 HEAD | `b728a07f4` |
| origin ahead/behind | 0 / 0 |
| 다른 세션 WIP(시작 시점) | GP Footer / neture NetureLayout / footer WO doc — **미포함**(작업 중 다른 세션이 커밋, 본 작업 종료 시점 working tree 는 내 KPA 11파일만) |

## 2. Baseline 규칙 (확정)

KPA 디지털사이니지 사용자-facing 표기 기준:

1. **기능명 · 페이지/메뉴/카드 제목 = `디지털사이니지`** (붙여쓰기). "디지털 사이니지"(띄어쓰기) 혼용 금지.
2. **내 매장 화면 제목 = `디지털사이니지 운영`** (기능명 포함). 기존 "사이니지 운영" → 정렬.
3. **보조 설명 = "매장 화면에 송출할 콘텐츠" / "매장 화면 콘텐츠" / "플레이리스트"** 계열. 형용사적 "사이니지 미디어/플레이리스트" 는 보조 용어로 허용.
4. **CTA = 다른 매장 실행 자산(POP/QR/Blog)과 동일 패턴** — "내 매장에 추가"(Hub 복사), "디지털사이니지 탐색"(Hub 카드 진입).
5. **내부 code/route/API 의 `signage` technical 명칭은 유지.** 운영자 전용 화면의 "사이니지 미디어/플레이리스트" 같은 technical term 일부 허용.

## 3. 정비한 surface / 파일 (11)

### 3.1 커뮤니티 영역
| 파일 | 변경 |
|------|------|
| pages/signage/ContentHubPage.tsx | 제목 "디지털 사이니지"→"디지털사이니지", 설명 "매장 화면에 송출할 동영상과 플레이리스트를 관리하세요" |
| pages/CommunityHomePage.tsx | 카드 제목 정규화 + 설명 "매장 화면에 송출할 콘텐츠를 관리하세요" |
| components/home/SignageSection.tsx | 섹션 제목·더보기·empty/hint 정규화("디지털사이니지") |
| components/home/CommunityServiceSection.tsx | 카드 제목·설명 정규화 |
| pages/work/WorkPage.tsx | 카드 제목 정규화 |
| pages/work/WorkDisplayPage.tsx | 페이지 제목 정규화 |
| pages/about/AboutPage.tsx | 기능명 3곳(prose·카드) 정규화 |

### 3.2 매장 허브 영역
| 파일 | 변경 |
|------|------|
| components/pharmacy/PharmacyHubLayout.tsx | nav label "디지털사이니지" + 설명 "매장 화면 콘텐츠 · 플레이리스트" |
| pages/pharmacy/StoreHubPage.tsx | 카드 제목·설명·actionLabel("디지털사이니지 탐색") 정렬 |
| pages/pharmacy/HubSignageLibraryPage.tsx | hero "플랫폼 디지털사이니지" + 설명, 안내 링크 "디지털사이니지 운영 화면" |

### 3.3 내 매장 영역
| 파일 | 변경 |
|------|------|
| pages/pharmacy/StoreSignagePage.tsx | 제목 "사이니지 운영"→"디지털사이니지 운영", 부제 "매장 화면에 송출할 콘텐츠를 등록하고…", GuideBackLink label "디지털사이니지 운영 방법" |

### 3.4 운영자 영역
- 변경 없음. operator signage 콘솔(HqMediaPage/HqPlaylistsPage 등)의 "운영자 제공 사이니지 미디어/플레이리스트" 부제는 **운영자 전용 technical context 로 허용**(baseline §2-5). 사용자-facing 제목 drift 없음(operator 화면에 "디지털 사이니지" 띄어쓰기 제목 부재).

## 4. 용어 정렬 결과

| 항목 | 결과 |
|------|------|
| user-facing "디지털 사이니지"(띄어쓰기) | **0건** (전부 "디지털사이니지" 로 정규화) |
| 잔존 "디지털 사이니지" | **코드 주석/JSDoc 8건만** (App.tsx:828, SignageSection:2, WorkPage:7·177, WorkDisplayPage:2, productionTargets:13, ProductionTypeSelectorModal:23, StoreChannelsPage:95) — 비-user-facing, baseline 범위 외(보존) |
| "사이니지 운영"(내 매장 제목) | → "디지털사이니지 운영" |
| 보조 설명 | "매장 화면에 송출할 콘텐츠 / 매장 화면 콘텐츠" 계열로 통일 |

## 5. 내 매장 흐름 기준

표준 흐름(KPA 기준, GP/KCos 확산 시 적용):
1. **콘텐츠 선택** — Hub 에서 "내 매장에 추가" 또는 내 매장에서 직접 등록
2. **플레이리스트 구성** — 내 매장 디지털사이니지 운영 화면의 플레이리스트 탭
3. **화면 송출/스케줄** — 스케줄 탭에서 시간·요일 적용 → 공개 재생

> KPA 내 매장은 3탭(플레이리스트/동영상/스케줄) 구조 유지(기능 변경 없음). device 기능은 과장하지 않음(현행 player select/playback 유지).

## 6. 운영자 콘솔 기준

- operator signage = HQ 미디어/플레이리스트/템플릿 + 강제 콘텐츠, DataTable/ActionBar 패턴(operator-ux-core) 유지.
- 사용자-facing 제목은 "디지털사이니지" 기준, 운영자 내부 설명은 "사이니지 미디어/플레이리스트" technical term 허용.
- GP/KCos 확산 시 operator 콘솔은 거의 동형 → 후속 공통 추출(B) 후보(별도 WO).

## 7. GP/KCos 확산 시 적용할 기준

1. 기능명/제목 "디지털사이니지" 붙여쓰기 통일.
2. 내 매장 제목 "디지털사이니지 운영"(KCos 의 "사이니지 플레이리스트" 정렬).
3. Hub 카드 제목·CTA·설명을 §2 패턴으로 정렬, KCos 깨진 route `/partner/signage/content` cleanup(E).
4. 보조 설명 "매장 화면에 송출할 콘텐츠" 계열.
5. 서비스 테마(blue/pink)·도메인 문구("내 약국에 추가" 등)는 정책으로 보존.

## 8. 범위 / 변경 없음 확인

| 항목 | 결과 |
|------|------|
| GP / KCos / Neture | ✅ 미수정(diff 0) — Neture 는 signage 제거 완료 상태, 본 WO 대상 아님 |
| backend / API | ✅ 무변경 |
| DB / migration | ✅ 무변경 |
| route / menu IA | ✅ 무변경 (label 텍스트만 정렬, path 동일) |
| shared package | ✅ 미수정 (SignageManagerTemplate 등 — config 의 title/description 문자열만 소비처에서 주입, 패키지 자체 무변경) |
| 신규 컴포넌트/모델 | 없음 (copy 정렬만) |

## 9. TypeScript 검증

| 패키지 | 결과 |
|--------|------|
| web-kpa-society (`npx tsc --noEmit`) | ✅ **PASS (exit 0, 0 error)** |
| GP/KCos/Neture | 미수정 → 영향 없음 |

## 10. browser smoke

⚠️ **라이브 미수행(보류).** 변경은 **사용자-facing 문자열(제목/설명/CTA/empty)만** 치환(로직·route·컴포넌트 구조 무변경)이고 web-kpa-society tsc PASS. 회귀 위험 낮아 tsc + grep 정적 검증으로 갈음. (권장 후속: KPA 커뮤니티 `/signage`, Store Hub `/store-hub/signage`, 내 매장 `/store/marketing/signage`, operator `/operator/signage/*` 진입 시 제목/CTA 육안 확인.)

## 11. 후속 WO 후보

| WO 후보 | 내용 |
|---------|------|
| `WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1` | 본 baseline(§7)을 GP/KCos 에 확산 + KCos 깨진 route cleanup |
| `WO-O4O-SIGNAGE-OPERATOR-CONSOLE-EXTRACT-V1` | operator HQ 콘솔 3서비스(KPA/GP/KCos) 공통 추출 |
| `IR-O4O-SIGNAGE-MYSTORE-TAB-IA-V1` | 내 매장 탭 수 3/2/1 통일 여부 IA 결정 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 정비 surface | 커뮤니티 / 매장 허브 / 내 매장 (운영자는 기준만 확인, 변경 없음) |
| 수정 파일 | web-kpa-society 11개 (copy/제목/CTA/empty 문자열) |
| 용어 정렬 | user-facing "디지털 사이니지" → "디지털사이니지" 0건 잔존, 내 매장 "디지털사이니지 운영" |
| route/menu IA | label 텍스트만 정렬, path 무변경 |
| GP/KCos/Neture | 미수정 |
| backend/API/DB/migration | 무변경 |
| TypeScript | web-kpa-society PASS |
| browser smoke | tsc+grep 정적 갈음(라이브 보류) |
| 다른 세션 WIP | 미포함(path-specific) |
| 다음 | `WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1` (GP/KCos 확산) |
