# 🧩 Task: 관리자 대시보드 통합 UI (`/admin`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 반드시 다음 경로 내부에서 작업하세요:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\admin-panel
  Coding\admin-temp
  Coding\src\admin
  ```

---

## 🎯 목적
플랫폼 관리자(administrator)가 전체 서비스를 통합적으로 모니터링하고 승인·관리할 수 있는 대시보드 UI를 설계합니다.

---

## 📐 주요 기능 모듈 및 화면

### 1. 요약 통계 카드
- 총 사용자 수 / 승인 대기 / 판매자 수 / 공급자 수
- 활성 펀딩 수 / 종료 펀딩 수
- 등록된 포럼 글 / 댓글 수
- 콘텐츠(디지털 사이니지) 송출 수

### 2. 승인 요청 관리
- 판매자/공급자/약사 승인 대기 목록
- 승인/거부 버튼
- 승인 일시/관리 로그 기록

### 3. 콘텐츠 및 활동 관리
- 펀딩 게시글 관리 (삭제/비공개)
- 포럼 게시글/댓글 모니터링
- 디지털사이니지 콘텐츠 송출 상태 모니터링

### 4. 유저 관리
- 전체 유저 리스트 보기
- 역할별 필터: seller, supplier, yaksa, affiliate 등
- 승인 상태, 가입일, 마지막 접속일 보기

---

## 📁 주요 컴포넌트

- `AdminDashboard.tsx`
- `AdminStatsCards.tsx`
- `ApprovalRequestsTable.tsx`
- `UserListTable.tsx`
- `ContentMonitoringPanel.tsx`

---

## 💡 디자인 참고

- Shopify Admin / Medusa Admin / Firebase Console UI
- 다크 테마 옵션 고려 가능

---

## 🧪 테스트 체크리스트

- 승인/거부 액션 후 UI 피드백이 즉시 반영되는가?
- 승인 상태에 따라 접근 가능한 사용자 수가 달라지는가?
- 통계 카드 및 리스트 정보가 실제 DB와 연동되는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/admin/`

## 작업 요청
1. `/admin` 페이지에 통합 대시보드 레이아웃을 구성하세요.
2. 통계 카드, 승인 요청 목록, 사용자 목록, 콘텐츠 모니터링 영역을 4분할 블록 형태로 나누어 구성하세요.
3. 승인 처리 버튼(approve / reject)을 `ApprovalRequestsTable` 컴포넌트에 구현하고, 추후 API 연동을 고려해 mock 데이터 기반으로 우선 구성하세요.
