# 🔌 Task: UI 컴포넌트 – API 연동 설계 문서

## 🎯 목적

UI/UX 개발 완료 후 실제 API 서버(Medusa 기반 또는 기타 커스텀 서버)와의 데이터 연동을 위한 구조와 우선순위를 정의합니다.  
목표는 mock 기반 컴포넌트를 실제 API와 연결하여 기능을 작동시키는 것입니다.

---

## 📌 연동 우선순위

1. ✅ 사용자 인증 API
   - 로그인, 회원가입, 승인 상태 조회
   - JWT 토큰 발급 및 세션 저장/갱신

2. ✅ 사용자 역할 관리
   - 역할 기반 접근 제어 데이터 확인
   - 관리자에 의한 역할 변경 (승인 처리)

3. ✅ 상품 관리 API
   - 판매자 상품 등록, 수정, 삭제
   - 커스터마이징 정보 (가격/라벨 등) 저장

4. ✅ 대시보드 데이터 API
   - 관리자 통계용 데이터 집계
   - 판매/공급/포럼/사이니지 통합 통계

5. ✅ 포럼 및 펀딩 데이터
   - 게시글 목록, 단일 조회, 댓글
   - 사용자 작성/삭제/수정 권한 확인 포함

6. ✅ 디지털 사이니지 콘텐츠
   - 송출 콘텐츠 등록, 상태 변경, 스케줄 설정

---

## 📁 연동 대상 컴포넌트 예시

| 컴포넌트 | 예상 API 경로 예시 | 메서드 | 설명 |
|----------|--------------------|--------|------|
| `RegisterForm` | `POST /api/auth/register` | POST | 회원 가입 |
| `LoginForm` | `POST /api/auth/login` | POST | 로그인 |
| `RoleGate` | `GET /api/auth/me` | GET | 현재 사용자 역할 정보 |
| `ProductCustomizer` | `POST /api/products` | POST | 상품 생성 |
| `AdminStatsCards` | `GET /api/admin/stats` | GET | 통계 요약 |
| `ApprovalRequestsTable` | `PATCH /api/admin/approve/:id` | PATCH | 승인 처리 |
| `ForumList` | `GET /api/forum/posts` | GET | 게시글 목록 |
| `FundingCreator` | `POST /api/funding` | POST | 펀딩 생성 |

---

## ✅ 연동 방식

- API 호출 라이브러리: `axios`
- 인증 방식: JWT → `Authorization: Bearer <token>`
- 상태 관리: React Context 또는 Zustand 활용 가능
- 에러 처리: `try/catch` + 사용자 피드백 UI 포함

---

## 🧪 테스트 시나리오 예시

- 회원가입 → 로그인 → 승인 대기 → 승인 후 화면 자동 전환
- 상품 커스터마이징 → 저장 → 재조회 시 데이터 유지
- 승인자 목록 로딩 실패 시 에러 메시지 출력 확인
- `/admin` 통계 카드에 실시간 변화 반영 확인

---

## 🧩 향후 확장 고려

- GraphQL 지원 여부
- SSE 또는 WebSocket 기반 실시간 데이터 반영
- 외부 OAuth 소셜 로그인 연동 (Google, Kakao 등)

---

# ✅ Cursor 작업 지시문

## 작업 요청

1. 각 주요 UI 컴포넌트별 API 연동 기능을 설계한 대로 구현하세요.
2. 위 예시 경로에 맞는 `axios` 호출 함수를 만들고 컴포넌트에 주입하세요.
3. 인증이 필요한 API는 반드시 JWT 토큰이 포함되도록 처리하고, 오류 시 사용자에게 명확한 메시지를 보여주세요.
