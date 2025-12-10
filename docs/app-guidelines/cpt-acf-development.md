# CPT & ACF Development Guide

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

CPT(Custom Post Type)와 ACF(Advanced Custom Fields) 개발 규칙을 정의한다.

## 2. Overview

- **CPT**: 데이터 구조 정의 단위 (예: forum-post, product)
- **ACF**: CPT 내부의 동적 필드 구조
- **등록 방식**: manifest.ts에 선언 → CMS Registry 자동 등록

## 3. CPT 등록

manifest.ts에서 선언:

```typescript
cpt: [
  { slug: 'forum-post', name: 'Forum Post', visibility: 'public' }
]
```

## 4. ACF Field Types

| Category | Types |
|----------|-------|
| **Basic** | text, textarea, number, email, url |
| **Content** | image, file, gallery, wysiwyg |
| **Choice** | select, checkbox, radio, true_false |
| **Relation** | post_object, taxonomy, user, relationship |
| **Layout** | group, repeater |

## 5. ACF 등록

manifest.ts에서 선언:

```typescript
acf: [
  { group: 'post-fields', cptSlug: 'forum-post', fields: [...] }
]
```

## 6. Meta Key Rules

| 모드 | 설정 | 용도 |
|------|------|------|
| Whitelist | `allowed: ['price', 'sku']` | 허용 키만 저장 |
| Blacklist | `forbidden: ['_cache']` | 특정 키 차단 |

## 7. Rules

1. **manifest 등록 필수**: CPT/ACF는 manifest에서만 선언한다.
2. **slug 고유성**: CPT slug는 플랫폼 전체에서 고유해야 한다.
3. **필드명 규칙**: snake_case 사용 (`/^[a-z_][a-z0-9_]*$/`)
4. **relation 활용**: 앱 간 데이터 연결은 relation 타입으로 선언.
5. **ViewSystem 연동**: manifest.viewTemplates에 View를 등록하면 자동 연결.

---

## Related Documents

- [cms-integration.md](./cms-integration.md)
- [cpt-registry.md](./cpt-registry.md)
- [docs/specs/cpt-acf/cpt-acf-overview.md](../specs/cpt-acf/cpt-acf-overview.md)

---
*최종 업데이트: 2025-12-10*
