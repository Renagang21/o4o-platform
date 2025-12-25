# Forum-Core Extensions Analysis (C1-2)

> **Phase**: C1 - Core Extension Cleanup
> **Core**: forum-core
> **분석일**: 2025-12-25
> **상태**: 분석 완료

---

## 1. Core 패키지 상태

### forum-core
- **버전**: 1.0.0
- **상태**: Active
- **Entities**: ForumPost, ForumCategory, ForumComment, ForumTag, ForumLike, ForumBookmark
- **Services**: ForumService, PostService, CategoryService, CommentService
- **Migrations**: 4개 (forum tables, organization field, fulltext, column align)
- **Lifecycle**: ✅ 완결

---

## 2. 확장앱 분류

### 2.1 서비스 기반 Extension

| 패키지 | 역할 | 의존성 | Lifecycle | 상태 |
|--------|------|--------|-----------|------|
| forum-yaksa | 약사회 포럼 (복약지도, 케이스스터디) | forum-core | ✅ 완결 | Active |
| forum-cosmetics | 화장품 포럼 (피부타입, 성분) | forum-core | ✅ 완결 | Active |

### 2.2 통합 Extension

| 패키지 | 역할 | 의존성 | Lifecycle | 상태 |
|--------|------|--------|-----------|------|
| organization-forum | 조직-포럼 통합 | forum-core, organization-core | ✅ 완결 | Active |

---

## 3. 의존성 그래프

```
forum-core (Core)
├── forum-yaksa (extension)
│   └── 사용처: member-yaksa, yaksa-admin
├── forum-cosmetics (extension)
└── organization-forum (extension)
    └── 연결: organization-core ↔ forum-core
```

---

## 4. 발견된 이슈

### 4.1 수정 완료

| 이슈 | 패키지 | 상태 |
|------|--------|------|
| lifecycle/index.ts 누락 | organization-forum | ✅ 생성됨 |

### 4.2 권고 사항 (선택)

| 이슈 | 패키지 | 설명 |
|------|--------|------|
| 버전 불일치 | organization-forum | package.json 0.1.0 vs manifest 1.0.0 |
| InitPack 없음 | forum-core | CLAUDE.md §2.4 권고 |

---

## 5. 확장 패턴 판정

### 5.1 서비스 특화 Extension

```
forum-core → forum-yaksa (약사 도메인)
forum-core → forum-cosmetics (화장품 도메인)
```

**판정**: ✅ 올바른 패턴
- 각 Extension은 도메인별 ACF/CPT 확장
- Core의 forum_post를 확장 (pharmacy_meta, cosmetics_meta)
- 자체 카테고리 세트 제공

### 5.2 Cross-Core 통합

```
organization-core + forum-core → organization-forum
```

**판정**: ✅ 올바른 패턴
- 얇은 레이어 (자체 테이블 없음)
- 조직 생성 시 카테고리 자동 생성

---

## 6. 존치 근거 명확화

| 패키지 | 존치 이유 | 삭제/병합 필요 |
|--------|-----------|----------------|
| forum-core | 플랫폼 Core | ❌ 불필요 |
| forum-yaksa | 약사 도메인 특화 | ❌ 불필요 |
| forum-cosmetics | 화장품 도메인 특화 | ❌ 불필요 |
| organization-forum | 통합 레이어 | ❌ 불필요 |

---

## 7. 결론

**forum-core 확장앱 생태계 판정: ✅ 건강함**

- 구조: 잘 설계됨
- 의존성: 깔끔함
- Lifecycle: 완결
- 이슈: 매우 적음 (1개 수정 완료)

---

*Phase C1-2 분석 완료*
*작성일: 2025-12-25*
