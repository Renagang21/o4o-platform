# 🔍 주요 라우트 및 인증 경로 점검 작업 문서

## 목적
- 회원가입, 로그인, 상품 조회 등 기본 페이지들이 라우팅 구조에 맞게 동작하는지 점검한다.

## 주요 경로
- `/register`: 회원가입 화면
- `/login`: 로그인 화면
- `/profile`: 사용자 정보 페이지
- `/store/products`: Medusa API에서 상품 목록 조회 화면
- `/admin/approvals`: 관리자 승인 목록

## 점검 사항
- [ ] 각 페이지가 실제 라우팅(`App.tsx`)에 포함되어 있는가?
- [ ] `RoleProtectedRoute`, `YaksaProtectedRoute` 등 보호된 경로가 올바르게 작동하는가?
- [ ] Medusa API 호출 시 CORS 또는 인증 문제는 없는가?
