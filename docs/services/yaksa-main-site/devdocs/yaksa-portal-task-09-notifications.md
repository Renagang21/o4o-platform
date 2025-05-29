
# 🧾 Task 09: 약사 전용 알림 센터 (`/yaksa/notifications`)

## 🎯 목적
약사 사용자가 수신한 알림을 목록으로 관리하고, 상태를 확인할 수 있도록 구성한다.

## ✅ 경로 및 보호
- 페이지: `src/pages/yaksa/Notifications.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 기능
- 알림 목록 (최신순)
- 읽음/안읽음 구분
- 클릭 시 관련 페이지 이동
- "모두 읽음 처리" 버튼

## 🧱 상태 관리
- `yaksaNotificationStore.ts` 또는 공통 store 확장
