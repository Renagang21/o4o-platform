# cms-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** cms-core
- **App Type:** core
- **Version:** 2.0.0
- **Package:** @o4o-apps/cms-core

## 구현 완료된 기능

### Backend
- CPT (Custom Post Type) 시스템 (Entity, Service)
- ACF (Advanced Custom Fields) 시스템 (Entity, Service)
- Block Editor Core
- Template System
- ViewBlock Rendering Pipeline
- Content API

### Frontend (Admin)
- Block Editor UI
- Template 관리 UI
- CPT 관리 UI
- ACF 관리 UI

### API Routes
- `/api/v1/cms/cpt`
- `/api/v1/cms/acf`
- `/api/v1/cms/blocks`
- `/api/v1/cms/templates`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음 - 기본 CMS 기능 모두 구현됨)

## 기본 설정

(defaultConfig 없음 - 설정 불필요)

## 특징

- @status FROZEN (Foundation Core)
- 모든 서비스에서 사용됨
- Phase A/B complete (2025-12-14)
