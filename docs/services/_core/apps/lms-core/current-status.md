# lms-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** lms-core
- **App Type:** core
- **Version:** 1.0.0
- **Package:** @o4o/lms-core

## 구현 완료된 기능

### Backend
- Course Entity 및 Service
- Lesson Entity 및 Service
- Enrollment Entity 및 Service
- Progress 추적

### Frontend (Admin)
- Course 목록/관리
- Lesson 관리
- Enrollment 관리
- Progress 대시보드

### API Routes
- `/api/v1/lms/courses`
- `/api/v1/lms/courses/:id/lessons`
- `/api/v1/lms/enrollments`
- `/api/v1/lms/progress`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음)

## 기본 설정

(defaultConfig 없음)

## 특징

- @status FROZEN (Foundation Core)
- yaksa, education 서비스에서 사용됨
