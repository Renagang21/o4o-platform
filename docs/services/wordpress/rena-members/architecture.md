# Rena Members 플러그인 아키텍처

## 개요
Rena Members는 WordPress 사이트에 고급 회원 관리 기능을 제공하는 플러그인입니다. 이 문서는 플러그인의 전반적인 아키텍처와 구조를 설명합니다.

## 디렉토리 구조
rena-members/
├── assets/
│ ├── css/
│ │ ├── admin.css
│ │ └── public.css
│ └── js/
│ ├── admin.js
│ └── public.js
├── includes/
│ ├── admin/
│ │ └── class-admin.php
│ ├── core/
│ │ ├── class-access.php
│ │ └── class-user.php
│ └── functions/
│ ├── template.php
│ └── utilities.php
├── templates/
│ ├── admin/
│ │ ├── dashboard.php
│ │ ├── users.php
│ │ ├── roles.php
│ │ └── settings.php
│ └── public/
│ ├── login-form.php
│ └── member-content.php
├── languages/
│ ├── rena-members-ko_KR.po
│ └── rena-members-ko_KR.mo
└── rena-members.php


## 핵심 컴포넌트

### 1. 관리자 인터페이스 (Admin)
- `class-admin.php`: 관리자 메뉴, 설정 페이지, 사용자 관리 인터페이스 제공
- 대시보드, 사용자 목록, 역할 관리, 설정 페이지 구현

### 2. 접근 제어 시스템 (Access)
- `class-access.php`: 콘텐츠 접근 제어 로직 처리
- 회원 전용 콘텐츠 보호
- 역할 기반 접근 제어
- 숏코드 처리

### 3. 사용자 관리 (User)
- `class-user.php`: 사용자 관련 기능 처리
- 사용자 등록/수정/삭제
- 역할 및 권한 관리
- 프로필 확장 기능

### 4. 템플릿 시스템
- 관리자 및 공개 템플릿 제공
- 테마 오버라이드 지원
- 커스텀 템플릿 태그 제공

## 데이터베이스 구조

### WordPress 기본 테이블 활용
- `wp_users`: 기본 사용자 정보
- `wp_usermeta`: 확장 사용자 메타 데이터

### 커스텀 메타 키
- `_rena_members_restricted`: 콘텐츠 제한 설정
- `_rena_members_allowed_roles`: 허용된 역할 목록

## 후크 시스템

### 액션 훅
- `rena_members_init`: 플러그인 초기화
- `rena_members_user_registered`: 사용자 등록 완료
- `rena_members_access_denied`: 접근 거부 시

### 필터 훅
- `rena_members_restricted_message`: 제한된 콘텐츠 메시지 수정
- `rena_members_allowed_roles`: 허용된 역할 목록 수정
- `rena_members_can_access`: 접근 권한 확인

## 보안

### 데이터 검증
- WordPress 보안 함수 사용
- 입력값 sanitization
- nonce 검증

### 권한 확인
- 사용자 역할 기반 접근 제어
- WordPress 기본 권한 시스템 활용

## 성능 최적화

### 캐싱
- 트랜지언트 API 활용
- 객체 캐시 사용
- 쿼리 최적화

### 자원 로딩
- 필요한 페이지에만 스크립트/스타일 로드
- 파일 최소화 및 결합
