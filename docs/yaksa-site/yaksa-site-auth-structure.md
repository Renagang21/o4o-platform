
# 🔐 yaksa.site 통합 인증 구조 설계 (초안)

## 🎯 목적
yaksa.site 전반의 서비스들이 하나의 로그인으로 접근 가능하도록 OAuth2 기반 통합 인증 시스템을 설계한다.

---

## ✅ 인증 흐름 요약

1. 모든 서비스는 `auth.yaksa.site`로 인증 요청
2. 사용자 로그인 → JWT 토큰 발급
3. 토큰은 각 프론트엔드에서 저장(localStorage 등)
4. 토큰 기반으로 서비스 간 이동 시 인증 유지

---

## 👥 사용자 역할 기준 리디렉션

| 역할 | 리디렉션 위치 |
|------|----------------|
| 일반 사용자 | `/shop` |
| 기업 사용자 (약사) | `/yaksa-shop` |
| 관리자 | `admin.yaksa.site/...` (경로별 필터링 적용)

---

## 🧱 기술 구성 제안

- 인증 서버 도메인: `auth.yaksa.site`
- 인증 방식: OAuth2 + JWT (NextAuth.js, Auth0, Keycloak 등 고려)
- 역할 판단: 로그인 응답 내 포함
- 세션 유지: refresh token 또는 access token 저장

---

## 🛡️ 보안 고려 사항

- HTTPS 적용 필수
- 토큰 만료/재발급 처리
- 관리자 로그인은 별도 MFA(다단계 인증) 고려 가능
