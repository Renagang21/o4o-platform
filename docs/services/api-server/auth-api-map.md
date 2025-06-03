# 인증 API 명세서 (`auth-api-map.md`)

이 문서는 o4o-platform의 로그인, 회원가입, 사용자 정보 확인 등 인증과 관련된 API 경로, 요청/응답 형식, 처리 흐름을 정리한 문서입니다.  
API 연동 시 백엔드-프론트 간 협업 기준이 되며, 테스트 및 문서화에도 활용됩니다.

---

## 🔐 공통 구조

- 모든 API는 `/auth` 경로 하위에 위치
- 응답은 JSON 형식
- JWT 기반 인증 → 응답 시 토큰 반환, 이후 요청에 `Authorization: Bearer <token>` 포함 필요

---

## 📮 API 명세

### ✅ 1. 로그인

- `POST /auth/login`
- Request Body:

```json
{
  "email": "user@example.com",
  "password": "user1234"
}
```

- Response:

```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "abc123",
    "name": "홍길동",
    "role": "user"
  }
}
```

---

### ✅ 2. 회원가입

- `POST /auth/register`
- Request Body:

```json
{
  "email": "new@user.com",
  "password": "1234",
  "name": "홍길동"
}
```

- Response:

```json
{
  "message": "Registered successfully",
  "userId": "xyz789"
}
```

---

### ✅ 3. 사용자 정보 확인 (토큰 인증 필요)

- `GET /auth/me`
- Header:

```
Authorization: Bearer <token>
```

- Response:

```json
{
  "id": "abc123",
  "email": "user@example.com",
  "name": "홍길동",
  "role": "admin"
}
```

---

## 📌 기타 고려사항

- 향후 `/auth/refresh` 토큰 갱신 엔드포인트 추가 가능
- 비밀번호 재설정: `/auth/forgot`, `/auth/reset` 추가 예정
- `role`은 `"user"`, `"seller"`, `"admin"`, `"yaksa"` 등으로 확장 가능

---

이 문서는 프론트와 백엔드 간의 인증 연동 테스트 및 자동화에 활용됩니다.
