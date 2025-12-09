# Registry Architecture

> Phase P1-C: Single Source of Truth (SSOT) 구조 문서
> 작성일: 2025-01-25

## 1. Overview

O4O Platform은 **Shortcode**, **Block**, **CPT**(Custom Post Type) 세 가지 확장 시스템을 사용합니다.
각각은 Single Source of Truth (SSOT) 패턴을 따라 중앙 집중식 메타데이터 관리를 합니다.

### Registry 역할

- **Shortcode Registry**: 쇼트코드 메타데이터 정의 및 AI 참조
- **Block Registry**: 블록 에디터 블록 정의 및 렌더링
- **CPT Registry**: 커스텀 콘텐츠 타입 정의 및 스키마 관리

### 핵심 원칙

1. **SSOT**: 모든 메타데이터는 단일 소스에서 관리
2. **Consistency**: 검증 스크립트로 SSOT와 구현의 일관성 보장
3. **AI-Friendly**: AI가 참조할 수 있는 명확한 메타데이터 제공

---

## 2. Single Source of Truth (SSOT) 위치

### Shortcodes
- **SSOT 위치**: `packages/shortcodes/src/metadata.ts`
- **타입**: `ShortcodeMetadata[]`
- **사용처**:
  - `apps/main-site`: 렌더링 및 실제 UI
  - `apps/admin-dashboard`: AI 메타데이터 참조
  - `apps/api-server`: 검증 및 메타데이터 제공

### Blocks
- **SSOT 위치**: `packages/block-renderer/src/metadata.ts`
- **타입**: `BlockMetadata[]`
- **사용처**:
  - `apps/admin-dashboard`: 블록 에디터 및 AI 참조
  - `apps/main-site`: (future) 블록 렌더링
  - `apps/api-server`: 검증 및 메타데이터 제공

### CPTs
- **SSOT 위치**: `apps/api-server/src/schemas/*.schema.ts`
- **타입**: `CPTSchema` (각 파일)
- **등록**: `apps/api-server/src/init/cpt.init.ts`
- **사용처**:
  - `apps/api-server`: CPT CRUD 및 데이터 관리
  - `apps/admin-dashboard`: CPT 관리 UI

---

## 3. 각 앱에서의 사용 방식

### apps/main-site
- **역할**: 프론트엔드 렌더링
- **사용**: Shortcode 컴포넌트 렌더링
- **패턴**: SSOT에서 가져온 메타데이터 기반으로 React 컴포넌트 매핑

### apps/admin-dashboard
- **역할**: 콘텐츠 관리 및 에디터
- **사용**: Block Editor, AI 메타데이터 조회
- **패턴**: SSOT를 AI에게 전달하여 페이지 생성 지원

### apps/api-server
- **역할**: 백엔드 API 및 검증
- **사용**: SSOT 기반 검증, AI 참조 데이터 제공
- **패턴**:
  - Shortcode/Block: 메타데이터만 제공
  - CPT: 실제 데이터 CRUD + 스키마 검증

---

## 4. 검증 스크립트

Phase P0-D에서 도입된 검증 스크립트는 SSOT와 구현의 일관성을 보장합니다.

### 실행 방법

```bash
# 전체 검증
pnpm verify

# 개별 검증
pnpm verify:shortcodes
pnpm verify:blocks
pnpm verify:cpts
```

### 스크립트 위치 및 역할

| 스크립트 | 위치 | 검증 내용 |
|---------|------|---------|
| `verify-shortcodes.ts` | `scripts/` | SSOT ↔ main-site 구현 일치 여부 |
| `verify-blocks.ts` | `scripts/` | SSOT ↔ admin-dashboard 블록 일치 여부 |
| `verify-cpts.ts` | `scripts/` | Schema ↔ cpt.init.ts 등록 일치 여부 |

### 검증 내용

**Shortcodes:**
- ✅ SSOT에 정의된 모든 shortcode가 main-site에 구현되어 있는가?
- ✅ main-site에 구현된 shortcode가 SSOT에 등록되어 있는가?

**Blocks:**
- ✅ SSOT에 정의된 모든 block이 admin-dashboard에 등록되어 있는가?
- ✅ admin-dashboard에 등록된 block이 SSOT에 정의되어 있는가?

**CPTs:**
- ✅ Schema 파일이 cpt.init.ts에 등록되어 있는가?
- ✅ cpt.init.ts에 등록된 CPT가 Schema 파일을 가지고 있는가?

---

## 5. 새 항목 추가 시 체크리스트

### Shortcode 추가

1. [ ] `packages/shortcodes/src/metadata.ts`에 메타데이터 추가
2. [ ] `apps/main-site/src/components/shortcodes/`에 컴포넌트 구현
3. [ ] `pnpm verify:shortcodes` 실행하여 일관성 확인
4. [ ] (Optional) Admin Dashboard AI 프롬프트에 추가

### Block 추가

1. [ ] `packages/block-renderer/src/metadata.ts`에 메타데이터 추가
2. [ ] `apps/admin-dashboard/src/blocks/`에 블록 구현
3. [ ] `apps/admin-dashboard/src/blocks/index.ts`에 등록
4. [ ] `pnpm verify:blocks` 실행하여 일관성 확인

### CPT 추가

1. [ ] `apps/api-server/src/schemas/`에 `{name}.schema.ts` 파일 생성
2. [ ] `apps/api-server/src/init/cpt.init.ts`에 스키마 import 및 등록
3. [ ] `pnpm verify:cpts` 실행하여 일관성 확인
4. [ ] (Optional) ACF Field Group 설계

---

## 6. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     SSOT (메타데이터)                        │
├─────────────────────────────────────────────────────────────┤
│  packages/shortcodes/metadata.ts                            │
│  packages/block-renderer/metadata.ts                        │
│  apps/api-server/src/schemas/*.schema.ts                    │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴──────────┬──────────────┐
       │                    │              │
       ▼                    ▼              ▼
┌─────────────┐      ┌──────────────┐   ┌──────────────┐
│ main-site   │      │ admin-dash   │   │ api-server   │
│             │      │              │   │              │
│ Shortcode   │      │ Block Editor │   │ CPT CRUD     │
│ Rendering   │      │ AI Reference │   │ Validation   │
└─────────────┘      └──────────────┘   └──────────────┘
       │                    │              │
       └─────────┬──────────┴──────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Verify Scripts│
         │ (consistency) │
         └──────────────┘
```

---

## 7. 참고 문서

- [CPT & ACF 가이드](./CPT_ACF_GUIDE.md)
- [블록 개발 가이드](../../BLOCKS_DEVELOPMENT.md)
- Phase P0 완료 보고서: commit `ef53683a6`
- Phase P1-A 완료 보고서: commit `596830eb2`

---

**최종 업데이트**: 2025-01-25 (Phase P1-C)
