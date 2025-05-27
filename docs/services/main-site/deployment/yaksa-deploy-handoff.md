
# 🔀 yaksa.site 작업 이관 요약 문서 (프론트/배포 테스트용)

## 📌 목적
이 문서는 yaksa.site 프로젝트의 프론트 화면 구성 및 배포 테스트를 진행하기 위해, 다른 채팅방 또는 프로젝트 환경에서 이어서 파악할 수 있도록 요약한 상태 문서입니다.

---

## ✅ 현재까지 완료된 작업

### 1. 메인 포털 구성
- `/`: 서비스 진입 카드 UI (쇼핑몰, 펀딩, 포럼 등)
- 역할별 접근 UI 설계 완료

### 2. 인증 흐름
- `/login`, `/register` UI 구현 Task 완료
- 소비자: 자동 승인 → 홈 리디렉션
- 약사: 면허번호 입력 + 전화번호 (수동 승인 필요)

### 3. 보호 라우트 및 역할 분기
- `<ProtectedRoute />`, `<YaksaProtectedRoute />`, `<RoleProtectedRoute />` 구현
- 약사 인증 전 상태는 일반 사용자로 간주

### 4. 약사 전용 화면
- `/yaksa/dashboard`
- `/yaksa/notifications`
- `/yaksa/profile`

### 5. 관리자 승인 화면
- `/admin/yaksa-approvals`: superadmin 전용 약사 승인 페이지

---

## 🔧 현재 테스트 목적

- yaksa.site 접속 시 `502 Bad Gateway` 오류 해결
- React 앱 빌드/serve 상태 점검 및 Nginx 연결 확인
- 실제 URL로 진입 가능한 화면 구성 여부 확인

---

## 📄 관련 Task 문서 요약

| 문서명 | 설명 |
|--------|------|
| `yaksa-portal-task-00-start.md` | 전체 Portal UI 시작 Task |
| `yaksa-portal-task-11-router-setup.md` | 전체 라우터 구조 연결 |
| `yaksa-deploy-task-01-react-build-serve.md` | 502 오류 해결 위한 빌드 및 serve 실행 요청 |

---

## ⏭️ 다음 예상 작업 흐름

- Nginx 설정 확인 (Task 12로 분리 예정)
- 실제 화면 접근 테스트 체크리스트 생성
- 화면 단위 에러 처리 / 경고 메시지 구성
