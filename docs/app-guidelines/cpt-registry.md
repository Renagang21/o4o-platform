# CPT Registry Guide

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

CPT Registry의 SSOT(Single Source of Truth) 구조와 등록 규칙을 정의한다.

## 2. Overview

- CPT Registry는 모든 CPT 스키마를 중앙에서 관리한다.
- manifest.ts 선언 → CMS Registry 자동 등록 → View 연결
- 타입 안전성과 런타임 검증을 제공한다.

## 3. Key Benefits

| 특성 | 설명 |
|------|------|
| **SSOT** | 모든 CPT 정의가 manifest에 집중 |
| **Type Safety** | TypeScript 지원 |
| **Validation** | 스키마 구조 자동 검증 |
| **Runtime Access** | 런타임에 스키마 조회 가능 |

## 4. Registration Flow

```
manifest.ts 선언 → Module Loader 로드 → CMS Registry 등록 → View 자동 생성
```

## 5. Validation Rules

| 대상 | 규칙 |
|------|------|
| CPT name | `/^[a-z_][a-z0-9_]*$/` (snake_case) |
| Field name | `/^[a-z_][a-z0-9_]*$/` (snake_case) |
| Meta key | `/^[a-zA-Z0-9_:-]{1,255}$/` |

## 6. Runtime API

```typescript
import { registry } from '@o4o/cpt-registry';

registry.get('forum-post');    // 스키마 조회
registry.list();               // 전체 목록
registry.has('forum-post');    // 존재 확인
```

## 7. Rules

1. **manifest 등록 필수**: CPT는 manifest.cpt에서만 선언한다.
2. **네이밍 규칙 준수**: snake_case, 소문자만 사용.
3. **meta 설정 필수**: allowed 또는 forbidden으로 메타 키 제한.
4. **중복 금지**: 플랫폼 전체에서 CPT slug 고유해야 한다.
5. **검증 통과**: `pnpm verify:cpts`로 검증 후 배포.

---

## Related Documents

- [cpt-acf-development.md](./cpt-acf-development.md)
- [cms-integration.md](./cms-integration.md)
- [registry-architecture.md](./registry-architecture.md)

---
*최종 업데이트: 2025-12-10*
