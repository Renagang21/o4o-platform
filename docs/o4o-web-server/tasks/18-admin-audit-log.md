
# 🧾 Task 18: 관리자 감사 로그 시스템 (행위 추적) 구현

## 📌 목적
운영자 활동의 투명성과 보안을 강화하기 위해 관리자 행위 로그를 기록하고 조회할 수 있는 감사 로그 시스템을 구현한다.

---

## ✅ 요구 기능

### 감사 로그 항목
- 작업 시간 (Timestamp)
- 관리자 ID/이메일
- 작업 종류 (예: 상품 수정, 주문 상태 변경, 회원 차단 등)
- 대상 객체 (상품 ID, 주문 ID, 사용자 ID 등)
- 작업 상세 메시지

---

## ✅ 로그 기록 대상
- 상품 등록/수정/삭제
- 주문 상태 변경
- 회원 상태 변경/권한 변경
- 관리자 로그인/로그아웃
- 설정 변경

---

## 🧱 구현 방식

- 로그 기록 방식:
  - 클라이언트 → 백엔드 `/admin/logs` 엔드포인트로 전송
  - 추후 로그 기록은 서버에서 자동 처리하는 방식으로 전환 가능
- 로그 보기 페이지: `/admin/logs`
  - 검색, 날짜 필터, 작업 종류 필터
  - TailwindCSS 테이블 UI

---

## 💡 UI 및 확장 포인트

- 로그 항목은 실시간 또는 페이지 진입 시 갱신
- 추후 CSV 다운로드, JSON 내보내기 기능 추가 가능
- 로그 항목을 Recharts 등으로 시각화 가능

---

## 🔐 보안

- `superadmin`만 로그 열람 가능
- 로그 기록은 반드시 관리자 인증 상태에서 수행

---

## ⏭️ 다음 작업 연결

- Task-19: 관리자 알림 히스토리 및 필터 기반 조회
