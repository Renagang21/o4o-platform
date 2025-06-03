# 🧠 역할 체계 및 라우팅 공통 기준 문서

이 문서는 o4o-platform 전체에서 통합적으로 사용될 **회원 역할 체계와 기본 이동 흐름**을 정의합니다.  
모든 Task 문서, 라우팅 설정, 인증 보호, 관리자 기능 등에서 일관되게 적용되어야 합니다.

---

## ✅ 통합 회원 역할 체계

| 역할 ID | 설명 |
|---------|------|
| `user` | 게스트 또는 기본 방문자 |
| `member` | 일반 가입 사용자 |
| `contributor` | 콘텐츠 등록 권한 있는 사용자 |
| `seller` | 상품을 판매하는 판매자 |
| `vendor` | 공급자, 입점사 |
| `partner` | 제휴사 (B2B 연동 등) |
| `operator` | 운영 관리자, B2B/포럼 담당 |
| `administrator` | 최고 관리자, 모든 권한 소유자 |

---

## 🏠 기본 라우팅 정책

- 로그인 또는 회원가입 후에는 **모든 사용자가 공통적으로 `/` (메인페이지, neture.co.kr)로 이동**합니다.
- 역할에 따른 페이지 구성은 **페이지 편집기(Tiptap 등)를 통해** 다르게 표시됩니다.
- 기본 경로는 `/`, 개별 화면 권한은 RoleProtectedRoute 또는 편집기 모듈로 제어합니다.

---

## 🔐 접근 제어 기준 예시

| 페이지 | 접근 조건 예시 |
|--------|----------------|
| `/forum/create` | `allowedRoles={['contributor', 'operator', 'administrator']}` |
| `/admin/users` | `allowedRoles={['administrator']}` |
| `/partner/dashboard` | `allowedRoles={['partner']}` |

---

## ⚠️ 구현 시 주의사항

- 사용자 역할은 서버 API 또는 Context에서 항상 동기화되어야 함
- 라우트 보호 시, `RoleProtectedRoute` 또는 `useAuth().role` 기반 분기 사용
- 문서, Task, 라우팅, 테스트 시나리오에서 이 역할 체계를 기준으로 작업할 것

---

## 📁 적용 대상

- 모든 Task 문서 (예: `task-03`, `task-05`, `task-09`)
- 로그인 후 이동 흐름 정의
- 메인페이지 구성 모듈 (페이지 편집기 포함)
- 관리자 기능
