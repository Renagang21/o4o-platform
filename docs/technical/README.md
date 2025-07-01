# 🔧 기술 문서

> **이 폴더는**: O4O Platform의 모든 기술적 세부사항과 7개 서비스별 상세 분석을 담고 있습니다.

---

## 📁 폴더 내용

### 📄 메인 기술문서
- **[TECH_DOCS.md](./TECH_DOCS.md)** - 전체 플랫폼 종합 기술 분석

### 📄 서비스별 기술문서 (7개)
- **[ecommerce_TECH.md](./ecommerce_TECH.md)** - E-commerce 서비스 기술 분석
- **[admin-dashboard_TECH.md](./admin-dashboard_TECH.md)** - Admin Dashboard 기술 분석  
- **[signage_TECH.md](./signage_TECH.md)** - Digital Signage 기술 분석
- **[crowdfunding_TECH.md](./crowdfunding_TECH.md)** - Crowdfunding 기술 분석
- **[forum_TECH.md](./forum_TECH.md)** - Forum 기술 분석
- **[main-site_TECH.md](./main-site_TECH.md)** - Main-Site 기술 분석

---

## 🎯 문서 버전 정보

| 문서 | 버전 | 상태 | 최종 업데이트 |
|------|------|------|---------------|
| TECH_DOCS.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| ecommerce_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| admin-dashboard_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| signage_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| crowdfunding_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| forum_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |
| main-site_TECH.md | v0.1.0 | ✅ 완성 | 2025-06-30 |

---

## 📋 문서 읽는 순서

### 🔰 처음 읽는 경우
1. **[TECH_DOCS.md](./TECH_DOCS.md)** - 전체 플랫폼 이해
2. **[ecommerce_TECH.md](./ecommerce_TECH.md)** - 핵심 비즈니스 로직
3. 담당 서비스의 개별 기술문서

### 🎯 특정 서비스 개발자
1. 담당 서비스의 기술문서 우선
2. **[TECH_DOCS.md](./TECH_DOCS.md)** - 서비스 간 연동 이해
3. 연관 서비스의 기술문서

### 🏗️ 아키텍트/CTO
1. **[TECH_DOCS.md](./TECH_DOCS.md)** - 전체 아키텍처
2. 모든 서비스별 기술문서
3. 연동 구조 및 확장성 검토

---

## 🔍 주요 분석 내용

### 🛍️ E-commerce 중심 분석
- **핵심 비즈니스 로직**: 역할 기반 가격 차별화, ACID 트랜잭션
- **데이터 모델**: 스냅샷 기반 주문, 재고 관리
- **API 구조**: RESTful 설계, 20개 이상 엔드포인트

### 🔗 서비스 간 연동
- **통합 인증**: JWT 기반 크로스 서비스 인증
- **실시간 동기화**: Socket.IO 기반 실시간 업데이트
- **공유 컴포넌트**: 일관된 UI/UX 시스템

### 📊 개발 현황
- **완전 구현**: Digital Signage (20개 API 엔드포인트)
- **부분 구현**: E-commerce, Admin Dashboard
- **설계 완료**: Crowdfunding, Forum

---

## 👥 대상 독자

### 🧑‍💻 개발자
- 시스템 아키텍처 이해
- API 설계 및 구현 가이드
- 서비스 간 연동 방법

### 🏗️ 시스템 설계자
- 전체 플랫폼 아키텍처
- 확장성 및 성능 고려사항
- 기술 스택 선택 근거

### 📋 프로젝트 매니저
- 개발 현황 및 우선순위
- 기술적 의존성 파악
- 로드맵 및 일정 계획

---

## 🔗 관련 문서

- **개발 가이드**: [development/](../development/) - 실제 개발 방법
- **사용자 가이드**: [user-guides/](../user-guides/) - 기능 사용법
- **운영 가이드**: [operations/](../operations/) - 배포 및 운영
- **비즈니스 문서**: [business/](../business/) - 비즈니스 로직

---

## ⚠️ 주의사항

### 문서 업데이트
- **새로운 기능 추가 시** 관련 기술문서 업데이트 필수
- **API 변경 시** 해당 서비스 기술문서 수정
- **아키텍처 변경 시** TECH_DOCS.md 업데이트

### 버전 관리
- 메이저 변경 시 버전 업그레이드 (v0.2.0)
- 마이너 변경 시 패치 버전 (v0.1.1)
- 이전 버전은 archive/ 폴더로 이동

---

*이 폴더는 O4O Platform의 기술적 핵심을 담고 있습니다. 정확하고 최신의 정보 유지가 중요합니다.*