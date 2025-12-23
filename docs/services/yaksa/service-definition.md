# Yaksa Branch Service - Definition

> 서비스 정의 문서

## 서비스 정보

- **Service Group:** yaksa
- **상태:** 운영중 (Active)
- **Templates:** yaksa-branch
- **InitPacks:** yaksa-branch-init

## 서비스 목적

약사 조직 인트라넷으로서 회원 관리, 연차 보고, 교육, 포럼, 연회비 관리를 제공한다.

## 대상 사용자

- 약사 회원 (Pharmacist)
- 조직 관리자 (Organization Admin)
- 교육 담당자 (Educator)

## 서비스 범위

### 포함되는 기능
- 회원 인증 및 라이선스 검증
- 연차 보고 시스템
- 교육 과정 (LMS)
- 포럼/커뮤니티
- 연회비 관리
- 조직 계층 관리

### 제외되는 기능
- 약국 운영 관리 (별도 서비스)
- 의약품 유통 (별도 서비스)
- 외부 교육 기관 연동

## 서비스 구성

### Required Apps (Core)
- cms-core
- organization-core
- forum-core
- lms-core

### Required Apps (Extension)
- membership-yaksa

### Optional Apps (Extension)
- forum-yaksa
- reporting-yaksa
- lms-yaksa
- annualfee-yaksa
- yaksa-scheduler

### Optional Apps (Feature)
- organization-forum
- organization-lms

## 서비스 의존성

### 필수 서비스
(없음 - 독립 서비스)

### 선택 서비스
(없음)

## Applications

- admin-dashboard
- api-server
- main-site
