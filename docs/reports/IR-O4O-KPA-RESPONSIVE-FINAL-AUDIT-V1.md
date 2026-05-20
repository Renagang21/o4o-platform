# IR-O4O-KPA-RESPONSIVE-FINAL-AUDIT-V1

**작성일:** 2026-05-20
**대상:** services/web-kpa-society 전체 주요 화면
**성격:** 코드 읽기 전용 Audit — 수정 없음, 커밋 없음

---

## 1. 전체 판정

> **KPA 반응형 정비 실질적 완료.**
> 즉시 수정이 필요한 HIGH 항목 없음.
> MED 항목 2건은 후속 경량 WO로 일괄 처리 가능.
> LOW 항목은 후순위 유지보수 대상.

이번 정비 사이클(WO-O4O-KPA-HOME-SECTION-RESPONSIVE-CONSOLIDATION-V1 →
WO-O4O-KPA-LMS-COURSE-APPROVAL-MOBILE-V1 →
WO-O4O-KPA-PHARMACY-MOBILE-V1)을 통해
주요 사용자 접점 화면의 모바일 overflow, inline style drift, TS warning이
일괄 해소되었다.

---

## 2. 화면군별 상태

| 화면군 | 판정 | 비고 |
|--------|:----:|------|
| Home (CommunityHomePage) | ✅ 정상 | 이번 사이클 수정 완료 |
| Shell / Navigation | ✅ 정상 | MobileBottomNav: md:hidden, safe-area-inset-bottom 적용 |
| Forum (List / Write) | ✅ 정상 | mobile card / desktop table 분기 구현됨 |
| Forum (Detail) | ⚠️ MED | authorActions flexWrap 누락 |
| LMS (강의 목록 / 수강신청) | ✅ 정상 | 이번 사이클 수정 완료 |
| LMS (강사 대시보드) | ✅ 정상 | 이번 사이클 수정 완료 |
| MyPage (Dashboard) | ⚠️ MED | quickLinks 5개 단일 행, flexWrap 없음 |
| MyPage (Profile / Settings) | ✅ 정상 | grid minmax, flex 적절 |
| MyPage (Enrollments / Certificates) | ✅ 정상 | 주요 컨테이너 minWidth:0 / ellipsis 적용 |
| Operator Dashboard | ✅ 정상 | OperatorDashboardLayout 공통 컴포넌트 사용 |
| Operator (Forum / Content / LMS 관리) | ✅ 정상 | BaseTable / DataTable 기반, overflow 내부 처리 |
| Admin | ✅ 정상 | Operator와 동일 컴포넌트 체계 |
| Pharmacy HUB (Blog / Store / StoreHome) | ✅ 정상 | 이번 사이클 수정 완료 |
| Signage (ContentHub 모달) | ✅ 정상 | width:100% + maxWidth + margin 패턴, overlay flex 기준 정상 |
| Content / Library | ✅ 정상 | SharedSpace UI BaseTable 기반 |

---

## 3. 즉시 수정 필요 항목 (HIGH)

> **없음.** 사용자가 페이지를 열었을 때 완전히 깨지는 화면 없음.

---

## 4. 후순위 개선 항목 (MED / LOW)

### MED-01 — MyDashboardPage quickLinks 단일 행 overflow

- **파일:** `src/pages/mypage/MyDashboardPage.tsx`
- **위치:** `styles.quickLinks` (display: flex, gap: 16px, 항목 5개)
- **현상:** 각 링크에 `flex: 1` 적용 → 5개 링크가 한 줄 강제. 390px 화면에서
  개별 링크 폭 약 65px (아이콘 28px + 레이블). 좁아지지만 숨겨지지는 않음.
- **영향:** 아이콘·레이블 cramped, 탭 오동작 위험. 320px 기기에서 텍스트 겹침.
- **권장 수정:** `flexWrap: 'wrap'`, 항목당 `flex: '1 1 80px'` 또는
  모바일에서 `grid grid-cols-3 sm:grid-cols-5` 로 전환.

### MED-02 — ForumDetailPage authorActions flexWrap 누락

- **파일:** `src/pages/forum/ForumDetailPage.tsx`
- **위치:** `styles.authorActions` (display: flex, gap: 8px, 버튼 최대 3개)
- **현상:** 공지 해제 / 수정 / 삭제 버튼 3개 + 좋아요 버튼이 한 줄에 배치.
  `actions` wrapper가 `justifyContent: space-between`이므로 좁은 화면에서
  authorActions 3개 버튼 묶음이 좋아요 버튼과 겹칠 수 있음.
- **영향:** 320px~360px 기기에서 버튼 overflow 또는 클릭 영역 침범.
- **권장 수정:** `authorActions`에 `flexWrap: 'wrap'` 추가,
  `actions`에 `flexWrap: 'wrap', gap: 8px` 추가.

### LOW-01 — MyDashboardPage summaryGrid 최소 카드 폭

- **파일:** `src/pages/mypage/MyDashboardPage.tsx`
- **위치:** `gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'`
- **현상:** 390px에서 2열(각 187px)로 표시. 카드 내 수치 + 아이콘은 충분한 공간.
  실용적 문제 없음.
- **영향:** 없음. 향후 카드 내용이 복잡해질 경우만 검토.

### LOW-02 — PersonalStatusReportPage historyItem flexWrap

- **파일:** `src/pages/mypage/PersonalStatusReportPage.tsx`
- **위치:** `styles.historyItem` (display: flex, gap: 16px, flexWrap 없음)
- **현상:** 연도 + 상세 + 상태배지 한 줄. 긴 주소 등이 있으면 overflow 가능.
- **영향:** 특수 케이스(긴 텍스트)에서만 발생. 일반 화면 정상.

### LOW-03 — ContentHubPage 삭제 확인 모달 텍스트 nowrap

- **파일:** `src/pages/signage/ContentHubPage.tsx`
- **위치:** 삭제 confirm 모달 내 파일명 표시 (`whiteSpace: 'nowrap'`)
- **현상:** 긴 파일명이 `text-overflow: ellipsis`로 잘림 — 정보 손실.
- **영향:** 가시성 저하. UX 이슈이나 반응형 overflow는 아님.

---

## 5. 공통 패턴 후보

이번 Audit에서 동일 패턴이 반복 발견됨. 향후 신규 화면 작성 시 기준으로 삼을 것.

| 패턴 | 표준 처리 |
|------|-----------|
| 헤더 행 (제목 + 우측 버튼) | `display:flex, flexWrap:wrap, gap:12px` |
| 수평 버튼 그룹 (3개 이상) | `display:flex, flexWrap:wrap, gap:8px` |
| 바로가기 링크 행 (4개 이상) | `flex:wrap` 또는 `grid auto-fit minmax(80px,1fr)` |
| 모달/다이얼로그 | `width:100%, maxWidth:480px, margin:0 16px` in flex overlay |
| 상세 Drawer row (label + value) | label `flexShrink:0`, value `minWidth:0, wordBreak:break-word` |
| 테이블 래퍼 | `overflow-x:auto` → `<table style={{width:'100%'}}>` |

---

## 6. Shell / Navigation 상태 상세

**MobileBottomNav (`src/components/MobileBottomNav.tsx`)**
- `flex md:hidden fixed bottom-0 left-0 right-0 z-40` ✅
- `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` — iOS 홈 인디케이터 대응 ✅
- 비로그인/로그인 분기, 탭별 active 상태 ✅
- `display` 제어는 Tailwind만 사용 (inline style 오버라이드 없음) ✅

**Layout (`src/components/Layout.tsx`)**
- `MobileSafeArea` 컴포넌트 사용 — 하단 하단 네비 + iOS 노치 통합 처리 ✅
- GlobalHeader → KpaGlobalHeader 교체 완료 ✅

**결론:** Shell/Navigation 영역은 최근 WO(WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1,
WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1)에서 이미 정비됨. 추가 작업 불필요.

---

## 7. 다음 WO 제안

### 제안 여부: 조건부

즉시 수정 필요한 HIGH 항목이 없으므로 별도 긴급 WO는 불필요.
MED-01, MED-02 두 항목을 **단일 경량 WO**로 묶어 처리할 수 있다.

```
WO-O4O-KPA-MYPAGE-FORUM-MOBILE-POLISH-V1 (선택적)
- MyDashboardPage quickLinks flexWrap
- ForumDetailPage authorActions flexWrap
- (선택) PersonalStatusReportPage historyItem flexWrap
수정 파일: 2~3개 / 예상 소요: 30분 이내
```

단, 이 작업은 **긴급하지 않으며**, KPA canonical을 기준으로
다른 서비스(GlycoPharm, K-Cosmetics 등) 반응형 확장 작업을
먼저 진행한 뒤 일괄 처리해도 무방하다.

---

## 8. 종합 결론

| 구분 | 결과 |
|------|------|
| 즉시 수정 필요 (HIGH) | **0건** |
| 후속 WO 권장 (MED) | 2건 (MyDashboard quickLinks, Forum authorActions) |
| 후순위 (LOW) | 3건 |
| Shell / Navigation | 완료 |
| 공통 컴포넌트 체계 | 완료 (SharedSpace UI, OperatorDashboardLayout) |

**KPA 반응형 정비 사이클은 완료 처리 가능하다.**
후속 MED 2건은 다음 서비스 확장 작업과 병행하거나
별도 경량 WO로 처리하면 된다.
