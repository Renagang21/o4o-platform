# Yaksa Site 개발 기준 및 역할 구분

## 📌 목적

본 문서는 `o4o-platform` 프로젝트 내에서 `yaksa.site`와 관련된 프론트엔드 개발 범위와  
각 서비스 디렉토리의 역할, 서브도메인 구조를 명확히 정의하기 위한 문서입니다.

---

## 1️⃣ 서비스 디렉토리별 역할 정의

| 디렉토리 | 설명 | 서브도메인 예시 |
|----------|------|------------------|
| `yaksa-main-site` | yaksa.site 메인 포털 (홈, 소개, 접속자 진입) | `yaksa.site` |
| `ecommerce`       | 전자상거래(쇼핑몰) 전용 모듈                | `store.yaksa.site` |
| `api-server`      | API 백엔드 서버 (데이터, 인증 등)          | `api.yaksa.site` |
| `crowdfunding`    | 크라우드 펀딩 전용 프론트/기획             | (예정) |
| `forum`           | 포럼/커뮤니티 기능                         | (예정) |
| `signage`         | 디지털 사이니지 관련 모듈                  | (예정) |
| `shared`          | 공통 타입, 유틸리티, 설정 등               | (없음) |

---

## 2️⃣ 현재 개발 기준

- 모든 초기 개발 작업은 `services/yaksa-main-site`를 기준으로 시작
- `.cursor/.cursorrules`도 해당 폴더만 포함 중
- 이후 `ecommerce`, `api-server`로 단계 확장 예정

---

## 3️⃣ 서브도메인 구조 기준

각 서비스는 다음과 같은 서브도메인을 사용할 계획입니다:

- 메인 포털: **https://yaksa.site**
- 쇼핑몰: **https://store.yaksa.site**
- API 서버: **https://api.yaksa.site**
- 그 외 포럼, 사이니지, 펀딩 등은 필요 시 하위 도메인 추가

---

## ✅ 정리

> 현재는 `yaksa.site` 메인 포털 중심의 프론트 개발이 우선이며,  
> 이후 각 서비스 모듈(ecommerce, api-server 등)은 단계적으로 연계됩니다.