# 06. 로컬 개발 환경 폴더 구조 (개정판)

본 문서는 실제 개발자가 사용하는 로컬 폴더 구조를 기준으로,  
현재 진행 중인 서비스 및 예정된 AI/RPA 기능을 반영하여 설명합니다.

---

## 📁 최상위 폴더 구조

```
~/Coding/o4o-platform/
├── services/          # 각 기능별 서비스
├── docs/              # 문서 정리 (AI, 구조, Task 등)
├── .git/              # Git 버전관리
└── README.md
```

---

## 🧩 services/ 내부 폴더 구성

```
services/
├── main-site/         # 프론트엔드 SPA
│   └── src/pages/     # 로그인, 회원가입, 관리자, 상품 등
│
├── ecommerce/
│   ├── api/           # Medusa 기반 상품/주문 API
│   └── admin/         # 상품 승인, 정산, 통계 등 관리자 기능
│
├── api-server/        # 공통 인증 및 역할 API 서버
├── ai-service/        # 문서 요약, 추천, 챗봇 등 AI 기능 API
├── rpa-service/       # 업무 자동화, 스케줄링, 외부 연동 API
├── crowdfunding/      # 펀딩 캠페인 서비스
├── forum/             # 사용자 커뮤니티 기능
├── signage/           # 디지털 사이니지 콘텐츠 송출 관리
└── lms/               # 교육 콘텐츠 및 학습 관리
```

---

## 📚 docs/ 폴더 구성

```
docs/
├── overview/          # 전체 시스템 구조 및 도메인, 아키텍처 문서
├── services/          # 서비스별 개발 구조 및 기능 설계
├── tasks/             # Cursor, Gemini용 작업 지시 문서
└── readme.md          # 문서 구조 가이드
```

> `legacy/` 폴더는 더 이상 사용되지 않으며, 모든 백업 문서는 외부로 이전됨

---

## 🛠 개발 흐름 요약

1. 프론트 작업은 `services/main-site/` 내에서 실행
2. `npm run build` → `dist/` 생성 → 서버에서 `serve` 및 `pm2` 실행
3. 각 서비스는 GitHub 커밋 → 서버로 수동/자동 반영
4. API 서버는 `ecommerce/api`, `api-server`, 향후 `ai-service`, `rpa-service` 순으로 개발

---

## 📌 참고 사항

- 개발 툴은 주로 **Cursor IDE** 및 **VS Code**
- 각 서비스는 **독립적 배포 가능성**을 고려하여 구조화됨
- `docs/tasks/` 문서는 AI Agent 및 Cursor 자동화를 위한 핵심 문서로 활용됨
