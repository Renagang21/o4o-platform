# digital-signage-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** digital-signage-core
- **App Type:** core
- **Package:** @o4o-apps/digital-signage-core
- **Service Group:** signage
- **Status:** Active

## 역할 및 책임

### 주요 역할
디지털 사이니지 Core 엔진으로서 미디어, 디스플레이, 스케줄, 액션 관리를 제공한다.

### 책임 범위
- Media Source 관리 (URL/file-based)
- Media List 구성
- Display Device 관리
- Display Slot 설정
- Schedule 관리
- Action Execution 추적

### 경계
- 사이니지 인프라만 담당
- 업종별 콘텐츠는 Extension에 위임 (signage-pharmacy-extension 등)
- 실제 렌더링은 digital-signage-agent에 위임

## 의존성

### Core Dependencies
- platform-core
- cms-core

### Optional Dependencies
(없음)

## 외부 노출

### Services
(manifest에 services 없음)

### Types
- MediaSource
- MediaList
- Display
- Schedule
- ActionExecution

### Events
(manifest에 events 없음)

## 설정

### 기본 설정
(defaultConfig 없음)

### 환경 변수
(없음)

## 특징

- Extension Interface 제공 (Phase 3에서 구현 예정)
- digital-signage-agent와 연동
