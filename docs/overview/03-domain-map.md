# 03. 도메인 맵 및 URL 구조 (개정판)

본 문서는 `neture.co.kr` 플랫폼의 도메인 구성과 서브도메인 구조를 설명합니다.  
역할 기반 접근 제어와 서비스 분리를 위한 서브도메인 분리가 원칙입니다.

---

## 🏠 메인 도메인 및 사용자 진입점

| 도메인 | 설명 |
|--------|------|
| `https://neture.co.kr` | 모든 사용자의 진입점 (메인 사이트) |
| `https://auth.neture.co.kr` | 공통 로그인/회원가입/인증 API 호출용 프록시 또는 전용 도메인 |

---

## 🛠 관리자 및 운영자 도메인

| 도메인 | 설명 |
|--------|------|
| `https://admin.neture.co.kr` | 전체 관리자 포털 |
| `https://admin.neture.co.kr/store` | 매장 관리자 전용 |
| `https://admin.neture.co.kr/seller` | 판매자 관리자 (입점사 승인 등) |
| `https://admin.neture.co.kr/supplier` | 공급자 전용 관리자 |

---

## 🏬 매장 및 판매자 도메인

| 도메인 | 설명 |
|--------|------|
| `https://neture.co.kr/store/{store-name}` | 개별 매장 (B2C) |
| `https://neture.co.kr/seller/{seller-name}` | 개별 판매자 (B2B) |
| `https://neture.co.kr/store/{store-name}/webpos` | 매장용 POS (WebPOS) |

---

## 📦 기능 서비스별 전용 도메인

| 도메인 | 설명 |
|--------|------|
| `https://forum.neture.co.kr` | 포럼 (커뮤니티) |
| `https://lms.neture.co.kr` | 학습 콘텐츠 (LMS) |
| `https://signage.neture.co.kr` | 디지털 사이니지 |
| `https://funding.neture.co.kr` | 매장 후원형 크라우드 펀딩 |
| `https://ai.neture.co.kr` | AI 서비스 호출용 API (문서요약, 추천 등) |
| `https://rpa.neture.co.kr` | RPA 자동화 기능 호출용 API |

---

## 🔐 도메인 설계 원칙

1. **기능 기반 분리**
   - API 호출을 전용 서브도메인 또는 프록시 경로로 분리
   - 기능 독립성 및 보안 강화를 동시에 고려

2. **역할 기반 분기**
   - 로그인 후 역할(`user`, `seller`, `admin` 등)에 따라 접근 도메인 분기
   - 인증이 완료되어도 `admin.` 접근은 별도 승인 필요

3. **동적 라우팅 대응**
   - `{store-name}`, `{seller-name}` 등은 React 라우터 또는 Nginx 리라이트 규칙으로 처리

---

## 🧭 향후 고려 사항

- AI와 RPA 도메인은 API 전용이며, 프론트는 main-site 내부 연동 또는 별도 React SPA로 발전 가능
- 인증 흐름은 초기에는 통합 로그인 → 추후 OAuth2, SSO 기반 확장 고려
