# 05. GitHub 저장소 및 디렉터리 구조 (개정판)

본 문서는 GitHub 저장소 `https://github.com/Renagang21/o4o-platform`의 최신 구조를 설명합니다.  
AI 및 RPA 기능이 포함되면서 서비스 폴더 구조가 확장되었습니다.

---

## 🔗 저장소 주소

- GitHub: [o4o-platform](https://github.com/Renagang21/o4o-platform)

---

## 📁 최상위 폴더 구조

```
o4o-platform/
├── services/          # 서비스별 코드
├── docs/              # 문서 정리
├── .github/           # GitHub Actions 등 (선택사항)
├── .env*, .gitignore  # 공통 설정
└── README.md
```

---

## 🗂 services/ 내부 구성

```
services/
├── main-site/               # 프론트엔드 SPA (사용자, 관리자)
│   └── src/pages/
│       ├── login.tsx, register.tsx, profile.tsx
│       ├── admin/ 승인, 통계, 역할 등
│
├── ecommerce/               # 커머스 서비스
│   ├── api/                 # Medusa 기반 API 서버
│   └── admin/               # 관리자 기능 (상품 승인, 주문 처리 등)
│
├── api-server/              # 공통 인증 API 서버 (JWT, 회원가입 등)
├── ai-service/              # AI 기능 API (문서요약, 추천 등)
├── rpa-service/             # 반복업무 자동화 및 예약 실행 API
├── forum/                   # 사용자 커뮤니티 (예정)
├── crowdfunding/            # 크라우드 펀딩 서비스
├── signage/                 # 디지털 사이니지
└── lms/                     # 학습 콘텐츠 (LMS)
```

---

## 📚 docs/ 내부 구조

```
docs/
├── overview/                # 시스템 구조, 도메인, 개요 문서
├── services/                # 서비스별 개발 방향 및 기능 설명
├── tasks/                   # Cursor/Gemini용 Task 지시서
└── legacy/                  # 백업된 과거 문서
```

---

## 🧩 기타 구성요소

- `.cursor/`, `.vscode/`: IDE 설정
- `package.json`, `tsconfig.json`: 각 서비스 단위로 별도 존재 가능
- `README.md`: 저장소 루트 및 각 서비스 폴더별로 별도 배치 예정

---

## 📌 참고 및 설계 기준

- 모든 서비스는 독립적인 실행과 배포를 고려하여 모듈화됨
- 서비스 단위로 역할, 기능, 개발 책임을 분리하여 유지보수 용이
- GitHub 커밋은 서비스 단위 또는 기능 단위로 구분하여 기록

