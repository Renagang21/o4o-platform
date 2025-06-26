# 프로젝트 개요 (2024-06-18 기준)

- **메인 서비스**: o4o-platform (React + Express 기반)
- **현재 개발/운영 중심**: o4o-platform (auth 제외)
- **주요 이슈**: 서버 2대, GitHub-서버 동기화 불안정, CI/CD 미흡, 사이트 가시성 불안정
- **문서/AI 협업**: docs-hub(공통), o4o-platform/docs(실전)

## 주요 폴더 구조

```
o4o-platform/
├── docs/                # 프로젝트 문서 (이 폴더)
├── services/            # 서비스별 소스코드
│   ├── api-server/      # Express API 서버
│   └── main-site/       # React 웹앱
├── scripts/             # 자동화 스크립트
└── tests/               # E2E 테스트
```

## 현재 개발/운영 현황
- **실제 개발/운영은 o4o-platform이 중심**
- **auth 제외, 나머지 서비스 집중 개발 중**
- **문서/AI 협업은 o4o-platform/docs를 기준으로 진행**

## 참고
- 상위 정책/공통 문서는 [docs-hub](https://github.com/Renagang21/docs-hub) 참조
