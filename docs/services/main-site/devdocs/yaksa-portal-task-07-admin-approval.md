
# 🧾 Task 07: 관리자 승인 대시보드 (약사 인증 처리)

## 🎯 목적
yaksa.site에서 가입한 약사 사용자 중 '승인 대기' 상태(`yaksaStatus = 'pending'`)인 계정을 관리자가 승인하거나 거절할 수 있는 관리 UI를 구현한다.

---

## ✅ 작업 경로

- 페이지 파일: `src/pages/admin/YaksaApprovals.tsx`
- 보호 라우트: `<RoleProtectedRoute roles={['superadmin']}>`
- 상태 관리/연동: mock 데이터 기반 또는 `authStore` 확장

---

## 📋 화면 구성

### 1. 대시보드 테이블

| 항목 | 설명 |
|------|------|
| 이름 | 사용자 이름 |
| 이메일 | 가입 시 입력된 이메일 |
| 면허번호 | 가입 시 입력된 약사 면허번호 |
| 전화번호 | 연락용 |
| 상태 | `pending` |
| 액션 | [승인] [거절] 버튼

### 2. 승인 버튼 클릭 시
- 사용자 상태를 `yaksaStatus = 'approved'`, `role = 'yaksa'`로 변경
- 메시지: "승인 완료되었습니다"

### 3. 거절 시
- 사용자 제거 또는 `yaksaStatus = 'rejected'`
- 선택적으로 사유 입력 (추후 확장)

---

## 🧱 Tailwind 기반 UI
- 카드 또는 테이블 형태
- 버튼 색상: 승인 `bg-green-500`, 거절 `bg-red-500`
- 상태 뱃지: `text-yellow-600`, `text-green-600`

---

## 🔐 보호 및 조건

- 이 페이지는 `superadmin` 전용
- 인증된 관리자만 접근 가능 (`RoleProtectedRoute` 적용)

---

## 📎 참고 문서

- `yaksa-portal-task-05-register-flow.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `docs/yaksa-site/wireframes/08-role-permissions.md`
