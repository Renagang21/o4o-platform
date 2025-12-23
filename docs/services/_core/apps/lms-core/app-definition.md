# lms-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** lms-core
- **App Type:** core
- **Package:** @o4o/lms-core
- **Service Group:** yaksa, education
- **Status:** @status FROZEN - Foundation Core

## 역할 및 책임

### 주요 역할
학습 관리 시스템(LMS) 핵심 기능을 제공하는 Foundation Core로서 코스, 레슨, 진도 관리를 담당한다.

### 책임 범위
- Course 관리
- Lesson 관리
- Enrollment 관리
- Progress 추적

### 경계
- LMS 기본 기능만 담당
- 업종별 확장은 Extension에 위임 (lms-yaksa, lms-marketing 등)
- 권한 관리는 organization-core에 위임

## 의존성

### Core Dependencies
(없음 - Foundation Core)

### Optional Dependencies
(없음)

## 외부 노출

### Services
- LMSService
- CourseService
- EnrollmentService

### Types
- Course
- Lesson
- Enrollment
- Progress

### Events
- `course.created`
- `enrollment.created`
- `progress.updated`
- `course.completed`

## 설정

### 기본 설정
(manifest에 defaultConfig 없음)

### 환경 변수
(없음)

## 특징

- @status FROZEN (Foundation Core)
- yaksa, education 서비스에서 사용
