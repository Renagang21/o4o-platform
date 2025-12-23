# cms-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** cms-core
- **App Type:** core
- **Package:** @o4o-apps/cms-core
- **Service Group:** All services
- **Status:** @status FROZEN - Foundation Core

## 역할 및 책임

### 주요 역할
플랫폼의 콘텐츠 관리 시스템(CMS) 엔진으로서 모든 서비스에 콘텐츠 생성/관리 기능을 제공한다.

### 책임 범위
- CPT (Custom Post Type) 시스템 관리
- ACF (Advanced Custom Fields) 시스템 관리
- Block Editor Core 제공
- Template System 관리
- ViewBlock Rendering Pipeline
- Content API 제공

### 경계
- 콘텐츠 저장/조회만 담당
- 비즈니스 로직은 각 서비스 앱이 담당
- 권한 관리는 organization-core에 위임

## 의존성

### Core Dependencies
- platform-core (암묵적)

### Optional Dependencies
(없음 - Foundation Core)

## 외부 노출

### Services
- CPTService
- ACFService
- BlockService
- TemplateService

### Types
- CPT
- ACF
- Block
- Template
- ViewBlock

### Events
- `cpt.created`
- `cpt.updated`
- `content.published`
- `template.registered`

## 설정

### 기본 설정
(manifest에 defaultConfig 없음 - 설정 불필요)

### 환경 변수
(없음)

## 특징

- @status FROZEN 표시 (Foundation Core)
- 모든 서비스에서 사용
- Phase A/B complete (2025-12-14)
- 수정 시 Phase review 필요
