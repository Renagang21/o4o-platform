
# 🧾 Task 23: 관리자 시스템 설정 백업 및 복원 기능 구현

## 📌 목적
관리자가 시스템 설정(테마, 알림, 권한, 환경설정 등)을 백업하고 복원할 수 있도록 기능을 제공하여 재설정 부담을 줄이고 안정적인 운영을 지원한다.

---

## ✅ 요구 기능

### 백업 항목
- 관리자 테마 설정 (다크/라이트)
- 알림 수신 설정
- 사용자 권한 구성
- 주소지/배송 설정
- 기타 운영환경 설정 (선택적)

### 기능 요건
- 설정 다운로드 버튼 → JSON 파일로 저장
- 설정 복원 버튼 → JSON 업로드 후 반영
- 복원 전 확인 다이얼로그

---

## 🧱 구현 방식

- 페이지: `/admin/settings` 또는 `/admin/settings/backup`
- 백업 구성:
  - 현재 상태(`adminSettingsStore`, `themeStore`, `adminAuthStore` 등) → JSON 변환
- 복원 구성:
  - 업로드된 JSON → 상태 적용 + localStorage 반영
- UI:
  - TailwindCSS로 구성된 버튼, 모달

---

## 💡 추가 포인트

- 자동 백업 주기 설정
- 클라우드 저장 연동 (예: Google Drive, AWS S3)
- 설정 버전 관리 (복원 시점 선택)

---

## 🔐 보안

- `superadmin`만 접근 가능
- JSON 내 민감 정보 암호화 필요 (선택)

---

## ⏭️ 다음 작업 연결

- Task-24: 시스템 운영 상태 모니터링 대시보드 (서버 상태, 요청 수 등)
