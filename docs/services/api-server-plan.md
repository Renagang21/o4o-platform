# 공통 인증 및 사용자 역할 API 설계 개요 (`api-server`)

이 문서는 플랫폼의 사용자 인증, 회원가입, 역할 확인 등을 전담하는 공통 API 서버(`services/api-server`)의 구조와 설계 방향을 설명합니다.

---

## 🎯 목적

- 커머스, 포럼, LMS 등 모든 서비스에 공통 적용할 수 있는 인증 API
- 역할 기반 라우팅과 권한 확인을 중앙집중화
- 사용자 승인 절차 및 상태별 접근 제한 관리

---

## 🧱 기능 구성

| 기능 영역 | 설명 |
|-----------|------|
| 회원가입 | 기본 사용자(`user`)로 가입 후 승인 대기 |
| 로그인 | JWT 발급 기반 로그인 API |
| 역할 조회 | 사용자 역할을 반환 (`user`, `seller`, `admin`, `supplier` 등) |
| 승인 흐름 | 약사/판매자 등은 승인 전까지 제한된 기능만 접근 |
| 역할 변경 | 관리자 승인 시 역할 상향 (`user` → `yaksa`, `seller`, `supplier`) |
| 토큰 갱신 | Refresh Token 기반 토큰 재발급 예정 |

---

## 🔐 인증 흐름

1. 사용자는 `POST /register`로 회원가입
2. 기본 역할은 `user`, 상태는 `대기`
3. `POST /login` 시 JWT 발급, 이후 API 접근 시 `Authorization` 헤더 필요
4. 관리자 승인 시 `PATCH /users/:id/role`로 역할 변경
5. 승인 전까지는 접근 가능한 페이지 제한됨

---

## 🔌 API 경로 예시

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/register` | 회원가입 |
| `POST` | `/login` | 로그인 및 JWT 발급 |
| `GET` | `/me` | 현재 로그인된 사용자 정보 |
| `GET` | `/me/role` | 현재 사용자 역할 반환 |
| `PATCH` | `/users/:id/role` | 관리자에 의한 역할 변경 |
| `POST` | `/logout` | 토큰 폐기 |
| `POST` | `/refresh` | Access Token 재발급 |

---

## 🗃 폴더 구조 예시

```
api-server/
├── src/
│   ├── controllers/
│   ├── middleware/       # 인증 보호 미들웨어
│   ├── routes/
│   ├── services/
│   └── utils/
├── prisma/               # 사용자 DB 스키마
├── .env
└── index.ts
```

---

## 🧩 기술 스택

- Express.js (또는 Fastify 등 Node 기반 선택)
- PostgreSQL (Prisma ORM 사용)
- JWT 인증 (access/refresh 토큰)
- CORS, helmet, bcrypt 등 기본 보안 포함

---

## 📌 고려사항

- 로그인 실패/승인 대기 시 사용자에게 명확한 피드백 제공
- 추후 OAuth2, 카카오/네이버/Google 로그인 연동 고려
- 다른 서비스에서도 동일 토큰 기반 인증 유지
