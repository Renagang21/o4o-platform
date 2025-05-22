# o4o-platform

**O4O(Online for Offline) 플랫폼 개발 프로젝트**

## 📁 프로젝트 구조

```
o4o-platform/
├── docs/                 # 설계 및 설정 문서
├── services/             # 서비스별 모듈 (ecommerce, lms, signage 등)
│   └── ecommerce/        # 전자상거래 관련 모듈
│       └── admin/        # React + Vite 기반 관리자 프론트엔드
├── infra/                # 서버 설정, 배포 관련 파일 (nginx, lightsail 등)
├── shared/               # 공통 유틸, 타입 정의 등
├── .cursorrules          # Cursor IDE 설정
└── README.md             # 이 파일
```

## ⚙️ 주요 개발 도구

- Backend: Medusa (Node.js)
- Frontend: React + Vite (TypeScript)
- Infra: AWS Lightsail, PM2, Nginx
- Docs: Markdown 기반 사양 정리

## 📌 사용 규칙

- 모든 서비스는 `services/` 내부에서 도메인 단위로 개발
- 문서는 `docs/` 내부에서 업무별로 분류
- 공통 유틸은 `shared/` 디렉토리에 위치