# 📚 O4O Platform 문서 센터

> **Phase 1 완료** | **Phase 2 진행 중** | **실시간 업데이트**

O4O Platform의 모든 문서가 체계적으로 정리되어 있습니다. 목적에 맞는 섹션을 선택하여 시작하세요.

[![Phase 1 완료](https://img.shields.io/badge/Phase_1-완료-brightgreen)](https://github.com/Renagang21/o4o-platform)
[![프로덕션 운영](https://img.shields.io/badge/neture.co.kr-운영중-blue)](https://neture.co.kr)
[![API 구현](https://img.shields.io/badge/API-14개_완료-success)](03-api-reference/ecommerce-api-specification.md)
[![문서 완료](https://img.shields.io/badge/문서-체계화_완료-purple)](current-status/project-status.md)

---

## ⚠️ **AI 코딩 필수 참조**

### **🔢 [버전 관리 가이드](00-version-management/current-versions.md)**
**AI가 코딩할 때 반드시 참조해야 하는 정확한 버전 정보**

- **Node.js**: `20.18.0` (현재 시스템: 22.16.0 ⚠️ 불일치!)
- **React**: `19.1.0` (최신 React 19)
- **TypeScript**: `5.8.3` (최신)
- **Tailwind CSS**: `4.1.7` (v4)
- **Express**: `4.18.2` + **TypeORM**: `0.3.20`

> **중요**: 인공지능이 오래된 버전으로 코딩하는 것을 방지하기 위해 **반드시 이 문서를 먼저 확인**하세요!

---

## 🚀 **빠른 시작**

### 👥 **역할별 시작 가이드**

| 역할 | 시작 문서 | 소요 시간 |
|------|-----------|-----------|
| **🆕 신규 개발자** | [5분 퀵스타트](01-getting-started/quick-start.md) | 5분 |
| **💻 백엔드 개발자** | [API 개발 가이드](04-development/coding-standards.md) | 15분 |
| **🎨 프론트엔드 개발자** | [React 앱 설정](../services/main-site/README.md) | 10분 |
| **🏗️ DevOps 엔지니어** | [배포 가이드](06-operations/postgresql-setup.md) | 30분 |
| **📊 기획자/PM** | [비즈니스 로직](05-business/pricing-system.md) | 20분 |

---

## 📁 **문서 구조**

### **🌟 1. 시작하기** - `01-getting-started/`
신규 개발자를 위한 필수 가이드

- [**⚡ 5분 퀵스타트**](01-getting-started/quick-start.md) - 즉시 개발 시작
- [**🔧 개발환경 설정**](01-getting-started/development-setup.md) - 상세 설정 가이드
- [**🆘 문제 해결**](01-getting-started/troubleshooting.md) - 자주 발생하는 문제

### **🏗️ 2. 아키텍처** - `02-architecture/`
시스템 설계 및 구조

- [**📋 전체 개요**](02-architecture/overview.md) - 시스템 아키텍처
- [**🗄️ 데이터 모델**](02-architecture/data-model.md) - DB 스키마 + ERD
- [**⚙️ 서비스 구조**](02-architecture/service-structure.md) - 마이크로서비스 구조

### **🔌 3. API 참조** - `03-api-reference/`
완전한 API 문서

- [**🛍️ E-commerce API**](03-api-reference/ecommerce-api-specification.md) - 14개 엔드포인트
- [**🔐 인증 시스템**](03-api-reference/api-specifications.md) - JWT 인증/권한
- [**📊 기술 스택**](03-api-reference/tech-stack.md) - 사용 기술 정리
- [**❌ 에러 코드**](03-api-reference/README.md) - 표준 에러 처리

### **💻 4. 개발 가이드** - `04-development/`
개발자를 위한 실무 가이드

- [**📏 코딩 표준**](04-development/coding-standards.md) - TypeScript 표준
- [**🌿 Git 워크플로우**](04-development/git-workflow.md) - 브랜치 전략
- [**🧪 테스트 가이드**](04-development/testing-guide.md) - 테스트 전략
- [**🔧 Cursor 가이드**](04-development/cursor-guide.md) - AI 개발 도구

### **💼 5. 비즈니스 로직** - `05-business/`
핵심 비즈니스 규칙

- [**💰 가격 시스템**](05-business/pricing-system.md) - 역할별 차등가격
- [**📦 재고 관리**](05-business/inventory-management.md) - 실시간 재고
- [**🛒 주문 처리**](05-business/order-processing.md) - 트랜잭션 보장

### **🚀 6. 운영 관리** - `06-operations/`
프로덕션 운영 가이드

- [**🗄️ PostgreSQL 설정**](06-operations/postgresql-setup.md) - DB 설치/설정
- [**📊 모니터링**](06-operations/monitoring.md) - 시스템 모니터링
- [**🔒 보안 정책**](06-operations/security.md) - 보안 가이드

---

## 📊 **현재 상태**

### **✅ Phase 1 완료 (2025-06-22)**
- **백엔드 API**: 14개 엔드포인트 100% 완료
- **데이터 모델**: 9개 엔티티 완성
- **비즈니스 로직**: 역할별 가격, 재고관리, 트랜잭션
- **프로덕션**: neture.co.kr 운영 중

### **⏳ Phase 2 진행 중**
- **데이터베이스**: PostgreSQL 연결 설정 중 (80% 완료)
- **프론트엔드**: React 앱 API 연동 대기
- **통합 테스트**: 전체 기능 검증 준비

### **📈 실시간 상태 확인**
- [**📊 프로젝트 현황**](current-status/project-status.md) - 실시간 진행상황
- [**🛠️ 구현 상태**](current-status/implementation-status.md) - 상세 구현 현황
- [**🚨 알려진 이슈**](current-status/known-issues.md) - 해결 중인 문제들

---

## 🔍 **빠른 찾기**

### **🎯 목적별 문서**

| 목적 | 추천 문서 |
|------|-----------|
| **🚀 즉시 개발 시작** | [5분 퀵스타트](01-getting-started/quick-start.md) |
| **🛍️ API 사용법** | [E-commerce API](03-api-reference/ecommerce-api-specification.md) |
| **🗄️ 데이터베이스 설정** | [PostgreSQL 가이드](06-operations/postgresql-setup.md) |
| **💰 가격 시스템 이해** | [비즈니스 로직](05-business/pricing-system.md) |
| **🐛 문제 해결** | [트러블슈팅](01-getting-started/troubleshooting.md) |

### **📱 서비스별 문서**

| 서비스 | 문서 위치 |
|---------|-----------|
| **🔗 API 서버** | [services/api-server/README.md](../services/api-server/README.md) |
| **🎨 메인 사이트** | [services/main-site/README.md](../services/main-site/README.md) |
| **🛍️ E-commerce** | [services/ecommerce/README.md](../services/ecommerce/README.md) |

---

## 🤝 **기여하기**

### **📝 문서 업데이트**
```bash
# 문서 업데이트 워크플로우
git checkout -b docs/update-section
# 문서 수정
git commit -m "docs: update section"
git push origin docs/update-section
```

### **🆘 도움 요청**
- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Discord**: 실시간 질의응답
- **이메일**: 긴급 지원 요청

---

## 📋 **문서 업데이트 로그**

| 날짜 | 업데이트 내용 | 담당자 |
|------|---------------|--------|
| 2025-06-25 | 문서 구조 재편 및 네비게이션 허브 생성 | Claude |
| 2025-06-24 | Phase 2 진행상황 업데이트 | Team |
| 2025-06-22 | Phase 1 완료 문서화 | Team |

---

<div align="center">

**🎯 목표: 5분 내 원하는 정보 찾기**

[🚀 바로 시작하기](01-getting-started/quick-start.md) • [📊 현재 상황](current-status/project-status.md) • [🛍️ API 문서](03-api-reference/ecommerce-api-specification.md)

**신규 개발자도 5분이면 개발 시작! 🚀**

</div>
