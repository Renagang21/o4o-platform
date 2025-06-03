
# 📌 yaksa.site 메인 포털 개요

## 🎯 목적
yaksa.site는 약사를 위한 다양한 디지털 서비스를 통합한 포털입니다.  
B2C/B2B 사용자와 관리자가 각자의 목적에 따라 접근할 수 있도록 중앙 진입점 역할을 합니다.

---

## 🧱 주요 구성 서비스

| 서비스 | 설명 | 도메인/경로 |
|--------|------|-------------|
| B2C 쇼핑몰 | 일반 사용자용 전자상거래 | `store.yaksa.site/shop` |
| B2B 쇼핑몰 | 약사용 전자상거래 | `store.yaksa.site/yaksa-shop` |
| 크라우드펀딩 | 약사 중심 펀딩 플랫폼 | (예: `fund.yaksa.site`) |
| 약사 포럼 | B2B 이용자 커뮤니티 | (예: `forum.yaksa.site`) |
| 디지털사이니지 | 매장 디스플레이 콘텐츠 관리 | (예: `signage.yaksa.site`) |
| 관리자 패널 | 서비스 운영 관리자용 | `admin.yaksa.site/...` |

---

## 👥 사용자 유형 및 진입 흐름

- **일반 사용자 (소비자)**: `/shop` → B2C 서비스
- **기업 사용자 (약사)**: `/yaksa-shop`, 포럼, 펀딩 등 → B2B 서비스
- **관리자**: `admin.yaksa.site` 서브경로로 진입, 역할 필터링

---

## 🧩 기술 스택 및 구조

- Frontend: React SPA + TailwindCSS + 반응형 UI
- 모바일: 웹앱 형태로 지원 (카메라, 위치정보 확장 고려)
- 인증: 단일 로그인 기반 OAuth2 / JWT (추후 결정)
- 디자인: MCP/Figma 연동 예정

---
