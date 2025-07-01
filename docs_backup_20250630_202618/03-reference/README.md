# 03-reference 📚 기술 레퍼런스

프로젝트의 기술적 구조와 아키텍처 정보를 담은 레퍼런스 문서들입니다.

## 📖 레퍼런스 문서

### 🔧 [기술 스택](tech-stack.md)
- 현재 사용 중인 기술 스택과 버전 정보
- 업데이트 히스토리 및 알려진 이슈
- 버전 관리 명령어와 기술 선택 이유

### 🏗️ [시스템 아키텍처](architecture.md)
- 전체 시스템 구조
- 서버 구성 (API + 웹서버)
- 데이터베이스 설계
- 서비스 간 통신 구조

### 📁 [폴더 구조](folder-structure.md) 
- 프로젝트 전체 폴더 구조
- 각 폴더의 역할과 책임
- 파일 네이밍 규칙

### 🌐 [API 문서](api-docs.md)
- REST API 엔드포인트 목록
- 요청/응답 예시
- 인증 및 권한 정보

## 🔍 빠른 참조

### 주요 기술 버전
- **Node.js**: 18.x+ (권장: 20.x LTS)
- **React**: 18.2.0
- **TypeScript**: 5.0.0
- **Express**: 4.18.0
- **PostgreSQL**: 14+

### 포트 정보
- **웹사이트**: http://localhost:3000
- **API 서버**: http://localhost:4000
- **PostgreSQL**: 5432
- **Redis**: 6379

### 환경별 설정
- **개발환경**: `.env` 파일 사용
- **프로덕션**: PM2 ecosystem.config.js
- **테스트**: Jest + Playwright

## 🔗 관련 문서

- [환경 설정](../01-setup/environment-setup.md) - 개발 환경 구축
- [문제 해결](../02-operations/troubleshooting.md) - 기술적 이슈 해결
- [설정 템플릿](../01-setup/config-templates.md) - 설정 파일 예시

## 📋 아키텍처 체크리스트

### 새 기능 추가 시
- [ ] API 엔드포인트 문서 업데이트
- [ ] 데이터베이스 스키마 변경 기록
- [ ] 타입 정의 추가/수정
- [ ] 테스트 케이스 작성

### 라이브러리 업그레이드 시  
- [ ] [tech-stack.md](tech-stack.md) 버전 정보 업데이트
- [ ] 호환성 확인 및 이슈 기록
- [ ] 설정 파일 마이그레이션
- [ ] 팀원들에게 변경사항 공지

## 🎯 성능 지표

### 목표 성능
- **페이지 로딩**: < 2초
- **API 응답**: < 500ms
- **빌드 시간**: < 5분

### 모니터링 도구
- PM2 모니터링
- PostgreSQL 쿼리 성능
- React DevTools

---

**참고**: 이 문서들은 기술적 참조용입니다. 실제 개발/운영 작업은 [01-setup](../01-setup)과 [02-operations](../02-operations) 폴더를 참조하세요.