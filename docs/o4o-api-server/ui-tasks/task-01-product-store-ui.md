# Task: 상품 등록 및 스토어 구성 UI 개발

## 📂 작업 범위
- 개발 환경: `o4o-platform`
- 문서 위치: `docs/o4o-api-server/02~06.md` 기반
- 작업 요청 위치: `docs/ui-tasks/task-01-product-store-ui.md`

## 🎯 목적
Medusa 기반 o4o-platform에서 관리자용 상품/재고 등록 화면을 React로 개발하고자 한다. Backend API는 이미 구축되어 있으며 인증은 JWT 방식이다.

## 📌 참고 문서
- `o4o-api-server/02-server-setup.md`: Medusa 서버 설정 및 포트 정보
- `o4o-api-server/03-admin-user-setup.md`: 관리자 계정 수동 생성 방식
- `o4o-api-server/04-auth-module-config.md`: 인증 모듈 설정
- `o4o-api-server/05-env-and-config-reference.md`: .env 설정 값
- `o4o-api-server/06-api-task-guide.md`: 상품/재고 관련 API 가이드

## ✅ 구현 대상 기능

### 1. 상품 등록 폼
- 입력 항목: 상품명, 설명, 가격
- 전송: POST `/admin/products`
- 인증: JWT 토큰 필요 (`Authorization: Bearer ...`)
- 개발 도구: React + TailwindCSS

### 2. 재고 목록 조회
- API: GET `/admin/inventory-items`
- 결과 테이블 표시
- 인증 필수

### 3. 스토어 구성 화면 (더미 UI만)
- 스토어명, 메모 입력 필드
- 실제 연동은 추후 예정

## 🧪 테스트 조건
- JWT는 localStorage에서 불러와 자동 헤더 설정
- 인증되지 않은 경우 로그인 요구 문구 출력
- API 응답은 콘솔 출력

## 💡 기타
- 상태 관리는 간단한 Context 또는 useState 사용
- 이 UI는 관리자 전용 화면임
- 컴포넌트 분리는 자유롭게 해도 무방

---

요청:

**"위 내용을 기반으로 React + Tailwind로 두 개의 화면(상품 등록, 재고 확인)을 만들어줘. JWT 인증 포함하고 API 요청은 medusa 기본 관리자 API에 맞춰줘."**
