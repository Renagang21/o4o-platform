# cms-core

> **Status**: FROZEN (Foundation Core) | **Version**: 2.0.0 | **Package**: @o4o-apps/cms-core

## 역할

플랫폼 CMS 엔진. 모든 서비스에 콘텐츠 생성/관리 기능 제공.

| 책임 | 경계 |
|------|------|
| CPT (Custom Post Type) 시스템 | 콘텐츠 저장/조회만 |
| ACF (Advanced Custom Fields) | 비즈니스 로직 → 서비스 앱 |
| Block Editor Core | 권한 → organization-core |
| Template System / ViewBlock Pipeline | |

## 외부 노출

**Services**: CPTService, ACFService, BlockService, TemplateService
**Types**: CPT, ACF, Block, Template, ViewBlock
**Events**: `cpt.created`, `cpt.updated`, `content.published`, `template.registered`

## API Routes

- `/api/v1/cms/cpt`, `/api/v1/cms/acf`
- `/api/v1/cms/blocks`, `/api/v1/cms/templates`

## Dependencies

- platform-core (암묵적)
