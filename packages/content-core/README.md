# Content Core

> **상태: SKELETON (사용되지 않음)**

## 이 패키지는 무엇인가

Content Core는 o4o 플랫폼의 **콘텐츠 단일 진실 원천(Single Source of Truth)**이다.

모든 콘텐츠(동영상, 이미지, 문서, 블록)는 이 Core를 통해 관리되어야 한다.

## 현재 상태

⚠️ **이 패키지는 아직 사용되지 않는다.**

| 항목 | 상태 |
|------|------|
| API | ❌ 없음 |
| UI | ❌ 없음 |
| 마이그레이션 | ❌ 없음 |
| 기존 시스템 연결 | ❌ 없음 |

이 패키지는 **Skeleton**으로만 존재한다:
- 타입과 엔티티 정의만 포함
- 플랫폼의 어떤 기능도 변경하지 않음
- 향후 Extension이 참조할 수 있는 기반

## Content Core의 책임

### 책임지는 것

- 콘텐츠 메타데이터 관리
- 콘텐츠 유형 정의 (video, image, document, block)
- 콘텐츠 상태 관리 (draft, published, archived)
- 콘텐츠 접근 제어 (public, restricted)
- 소유권 관리 (platform, service, partner)

### 책임지지 않는 것

- ❌ 학습 진도 (LMS Extension 책임)
- ❌ 재생 정책 (Signage Extension 책임)
- ❌ 콘텐츠 렌더링 (각 App 책임)
- ❌ 사용자 인증 (Auth Core 책임)

## 디렉토리 구조

```
content-core/
├── src/
│   ├── entities/
│   │   ├── ContentAsset.ts    # 핵심 엔티티
│   │   └── index.ts
│   ├── types/
│   │   ├── ContentTypes.ts    # Enum 정의
│   │   └── index.ts
│   └── index.ts               # 진입점
├── package.json
├── tsconfig.json
└── README.md
```

## 타입 정의

### ContentType

콘텐츠 유형을 정의한다.

```typescript
enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  DOCUMENT = 'document',
  BLOCK = 'block',
}
```

### ContentStatus

콘텐츠 상태를 정의한다.

```typescript
enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
```

### ContentVisibility

콘텐츠 공개 범위를 정의한다.

```typescript
enum ContentVisibility {
  PUBLIC = 'public',
  RESTRICTED = 'restricted',
}
```

### ContentOwnerType

콘텐츠 소유자 유형을 정의한다.

```typescript
enum ContentOwnerType {
  PLATFORM = 'platform',
  SERVICE = 'service',
  PARTNER = 'partner',
}
```

## ContentAsset 엔티티

핵심 엔티티의 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 식별자 |
| type | ContentType | 콘텐츠 유형 |
| title | string | 제목 |
| description | string? | 설명 |
| status | ContentStatus | 상태 |
| visibility | ContentVisibility | 공개 범위 |
| ownerType | ContentOwnerType | 소유자 유형 |
| createdAt | Date | 생성 일시 |
| updatedAt | Date | 수정 일시 |

## 참조 문서

- 📄 [Content Core 개요](../../docs/platform/content-core/CONTENT-CORE-OVERVIEW.md)
- 📄 [Extension 일반 가이드](../../docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md)

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 0.1.0-skeleton | 최초 생성 (Skeleton) |

---

*이 패키지는 CLAUDE.md 규칙에 따라 관리됩니다.*
