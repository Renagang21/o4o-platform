# O4O Platform Documentation - 권장 읽기 순서

> 최종 업데이트: 2025-12-10 (Phase 11-C)
> 신규 개발자를 위한 문서 학습 경로

---

## 🎯 Quick Start (필수 - 30분)

신규 개발자가 **반드시** 먼저 읽어야 하는 핵심 문서:

| 순서 | 문서 | 소요 시간 | 목적 |
|------|------|-----------|------|
| 1 | [CLAUDE.md](../CLAUDE.md) | 5분 | 프로젝트 규칙 |
| 2 | [app-overview.md](./app-guidelines/app-overview.md) | 5분 | 앱 개발 전체 흐름 |
| 3 | [cms-overview.md](./design/architecture/cms-overview.md) | 10분 | CMS 2.0 구조 |
| 4 | [appstore-overview.md](./design/architecture/appstore-overview.md) | 10분 | AppStore 시스템 |

---

## 📚 Level 1: Architecture Foundation (1시간)

CMS 2.0과 AppStore 기반 아키텍처 이해:

| 순서 | 문서 | 핵심 내용 |
|------|------|-----------|
| 5 | [module-loader-spec.md](./design/architecture/module-loader-spec.md) | 백엔드 자동 로딩 |
| 6 | [view-system.md](./design/architecture/view-system.md) | View Component 렌더링 |
| 7 | [extension-lifecycle.md](./design/architecture/extension-lifecycle.md) | 앱 라이프사이클 |
| 8 | [glossary.md](./reference/glossary.md) | 공식 용어집 |

---

## 📚 Level 2: App Development (2시간)

앱 개발 가이드라인 (역할별 선택):

### Core App 개발자
| 순서 | 문서 |
|------|------|
| 9 | [core-app-development.md](./app-guidelines/core-app-development.md) |
| 10 | [manifest-specification.md](./app-guidelines/manifest-specification.md) |
| 11 | [backend-structure.md](./app-guidelines/backend-structure.md) |
| 12 | [cpt-acf-development.md](./app-guidelines/cpt-acf-development.md) |

### Extension App 개발자
| 순서 | 문서 |
|------|------|
| 9 | [extension-app-guideline.md](./app-guidelines/extension-app-guideline.md) |
| 10 | [manifest-specification.md](./app-guidelines/manifest-specification.md) |
| 11 | [app-dependency-handling.md](./app-guidelines/app-dependency-handling.md) |

### Service App 개발자
| 순서 | 문서 |
|------|------|
| 9 | [service-app-guideline.md](./app-guidelines/service-app-guideline.md) |
| 10 | [manifest-specification.md](./app-guidelines/manifest-specification.md) |
| 11 | [view-guideline.md](./app-guidelines/view-guideline.md) |

---

## 📚 Level 3: Domain Specifications (필요시)

특정 도메인 개발 시 참조:

### Forum 개발
| 문서 | 내용 |
|------|------|
| [forum-overview.md](./specs/forum/forum-overview.md) | Forum Core 구조 |
| [app-structure.md](./specs/forum/app-structure.md) | 앱 구조 |

### Organization 개발
| 문서 | 내용 |
|------|------|
| [core-overview.md](./specs/organization/core-overview.md) | Organization Core |
| [lifecycle-hooks.md](./specs/organization/lifecycle-hooks.md) | 라이프사이클 |
| [rbac-scope.md](./specs/organization/rbac-scope.md) | 권한 시스템 |

### Dropshipping 개발
| 문서 | 내용 |
|------|------|
| [dropshipping-overview.md](./specs/dropshipping/dropshipping-overview.md) | 드롭쉬핑 시스템 |
| [api-contract.md](./specs/dropshipping/api-contract.md) | API 계약 |

### Cosmetics 개발
| 문서 | 내용 |
|------|------|
| [cosmetics-overview.md](./specs/cosmetics/cosmetics-overview.md) | 화장품 스토어 |

---

## 📚 Level 4: Technical Reference (필요시)

### 인증/권한
| 문서 | 내용 |
|------|------|
| [authentication-integration.md](./reference/auth/authentication-integration.md) | 인증 통합 |
| [authorization-rules.md](./reference/auth/authorization-rules.md) | 권한 규칙 |

### API
| 문서 | 내용 |
|------|------|
| [api-documentation.md](./reference/api/api-documentation.md) | API 문서 |
| [api-safety-guide.md](./reference/api/api-safety-guide.md) | API 안전 가이드 |

### Blocks
| 문서 | 내용 |
|------|------|
| [blocks-development.md](./reference/blocks/blocks-development.md) | 블록 개발 |

---

## 🗺️ Learning Path Summary

```
Quick Start (30분)
     │
     ▼
Level 1: Architecture (1시간)
     │
     ▼
Level 2: App Development (2시간)
     │
     ├─► Core App Path
     ├─► Extension App Path
     └─► Service App Path
     │
     ▼
Level 3: Domain Specs (필요시)
     │
     ▼
Level 4: Technical Reference (필요시)
```

---

## Related Documents

- [INDEX.md](./INDEX.md) - 전체 문서 인덱스
- [glossary.md](./reference/glossary.md) - 공식 용어집
- [Document Standards](./_standards/) - 문서 작성 기준

---

*Phase 11-C Final Stability Pass에서 자동 생성*
