# O4O 플랫폼 사용자 매뉴얼

> 마지막 업데이트: 2025-10-22
> 버전: v0.5.9 (O4O v1.0.0)

## 개요

O4O 플랫폼은 WordPress 기반의 **올인원 비즈니스 플랫폼**으로, 콘텐츠 관리(CMS), 이커머스(드롭쉬핑), 크라우드펀딩, 커뮤니티(포럼), 커스텀 콘텐츠 타입 엔진 등 다양한 기능을 통합 제공합니다.

### 주요 기능

- **콘텐츠 관리**: 글, 페이지, 미디어 관리
- **드롭쉬핑**: B2B 드롭쉬핑 플랫폼 (공급자-판매자 매칭)
- **크라우드펀딩**: 리워드 기반 펀딩 시스템
- **커뮤니티**: 포럼 게시판 및 댓글 시스템
- **CPT 엔진**: 코드 없이 커스텀 콘텐츠 타입 생성
- **외모 커스터마이징**: 테마, 메뉴, 템플릿 파트 관리
- **시스템 모니터링**: 성능 및 보안 로그

---

## 📚 문서 목록

### 1. [숏코드 레퍼런스](./shortcode-reference.md)

**대상:** 관리자, 콘텐츠 편집자

**내용:**
- 사용 가능한 모든 숏코드 목록
- 각 숏코드의 속성과 사용법
- 카테고리별 분류 (콘텐츠, 미디어, E-commerce, 드롭쉬핑 등)
- 실제 사용 예시
- 문제 해결 가이드

**업데이트 방법:**
```bash
# 숏코드 추가/변경 후 실행
npm run update:shortcode-docs
```

**페이지로 만들기:**
1. 관리 대시보드 → 페이지 → 새 페이지 추가
2. 제목: "숏코드 레퍼런스"
3. `shortcode-reference.md` 파일 내용을 복사하여 붙여넣기
4. 게시

**자동 동기화 (권장):**
- 마크다운 리더 블록 사용:
  ```
  [markdown_reader url="/docs/manual/shortcode-reference.md"]
  ```

---

### 2. AI 페이지 자동 생성 매뉴얼

#### a) [AI 사용자 가이드](./ai-user-guide.md) 👥

**대상:** 콘텐츠 편집자, 마케터, 일반 사용자

**내용:**
- AI 페이지 자동 생성 기능 사용법
- 사전 준비 (API 키 설정)
- 지원하는 AI 모델 (GPT-5, Gemini 2.5, Claude 4.5)
- 템플릿 가이드 (Landing, About, Product, Blog)
- 프롬프트 작성 팁 및 베스트 프랙티스
- 문제 해결 가이드

**특징:**
- 비기술자도 쉽게 이해 가능
- 실전 예시 중심
- 단계별 상세 설명

#### b) [AI 기술 가이드](./ai-technical-guide.md) 🛠️

**대상:** 개발자, 시스템 관리자

**내용:**
- 시스템 아키텍처 및 작동 원리
- 데이터베이스 (블록/숏코드 레지스트리)
- 참조 데이터 시스템 (서버 우선 전략)
- API 엔드포인트 레퍼런스
- 개발자 가이드 (새 블록/숏코드 추가)
- 확장 및 커스터마이징 방법
- 보안 및 성능 최적화

**특징:**
- 전체 시스템 플로우 다이어그램
- 코드 예제 포함
- API 명세 및 에러 처리

---

### 3. 블록 레퍼런스

**두 가지 버전 제공:**

#### a) [블록 레퍼런스 - AI용](./blocks-reference.md) ⚡

**대상:** AI 페이지 생성기

**특징:**
- 135줄로 매우 간결 (원본 835줄의 16%)
- AI 토큰 사용 최소화
- 표 형식으로 핵심 정보만 제공
- 블록 이름, 설명, 주요 속성, 간단한 예시만 포함

**용도:**
- AI 페이지 생성 프롬프트 참조
- 빠른 블록 검색
- 블록 타입 확인

#### b) [블록 레퍼런스 - 상세 가이드](./blocks-reference-detailed.md) 📚

**대상:** 관리자, 콘텐츠 편집자, 개발자

**내용:**
- 모든 블록의 상세 설명
- 속성 전체 목록
- CSS 클래스 레퍼런스
- 사용 팁 및 키보드 단축키
- 블록 개발 가이드
- 실제 사용 예시 (HTML 포함)

**업데이트:** 수동 관리 (코드 변경 시 문서 업데이트 필요)

**페이지로 만들기:**
1. 관리 대시보드 → 페이지 → 새 페이지 추가
2. 제목: "블록 레퍼런스"
3. `blocks-reference-detailed.md` 파일 내용을 복사하여 붙여넣기
4. 게시

**자동 동기화 (권장):**
- 마크다운 리더 블록 사용:
  ```
  [markdown_reader url="/docs/manual/blocks-reference-detailed.md"]
  ```

---

### 4. [관리자 매뉴얼](./admin-manual.md) 📖

**대상:** 관리자, 시스템 운영자

**내용:**
- O4O Admin Dashboard 전체 기능 안내
- 대시보드, 글, 미디어, 페이지 관리
- 드롭쉬핑, 크라우드펀딩, 포럼 운영
- CPT 엔진 및 사용자 관리
- 시스템 설정 및 모니터링

---

### 5. [에디터 사용 매뉴얼](./editor-usage-manual.md) ✍️

**대상:** 콘텐츠 편집자, 글 작성자

**내용:**
- 블록 에디터 사용법
- 글 및 페이지 작성 가이드
- 미디어 삽입 및 관리
- 에디터 단축키 및 팁

---

### 6. [외모 커스터마이징 가이드](./appearance-customize.md) 🎨

**대상:** 관리자, 디자이너

**내용:**
- 사이트 외모 커스터마이징 방법
- 테마 설정 (색상, 글꼴, 레이아웃)
- 헤더 및 푸터 설정
- Custom CSS 적용

---

### 7. [메뉴 관리 가이드](./appearance-menus.md) 📋

**대상:** 관리자, 콘텐츠 편집자

**내용:**
- 네비게이션 메뉴 생성 및 편집
- 메뉴 아이템 추가 (페이지, 글, 커스텀 링크)
- 메뉴 위치 설정
- 다단계 메뉴 구조 만들기

---

### 8. [템플릿 파트 가이드](./appearance-template-parts.md) 🧩

**대상:** 관리자, 개발자

**내용:**
- 템플릿 파트 개념 및 활용법
- 헤더, 푸터 템플릿 파트 관리
- 재사용 가능한 블록 섹션 만들기
- 템플릿 파트 적용 및 편집

---

### 9. [드롭쉬핑 사용자 매뉴얼](./dropshipping-user-manual.md) 📦

**대상:** 공급자, 판매자, 시스템 관리자

**내용:**
- 드롭쉬핑 플랫폼 개요
- 공급자/판매자 매뉴얼 (각 역할별)
- 상품 등록 및 관리
- 주문 처리 흐름

---

### 10. [판매자 매뉴얼](./seller-manual.md) 🛍️

**대상:** 판매자

**내용:**
- 판매자 계정 관리
- 상품 목록 및 주문 관리
- 정산 및 수수료 안내

---

### 11. [공급자 매뉴얼](./supplier-manual.md) 📋

**대상:** 공급자

**내용:**
- 공급자 계정 관리
- 상품 등록 및 재고 관리
- 주문 처리 및 배송

---

### 12. 플랫폼 기능 가이드

#### a) [플랫폼 기능 개요](./platform-features.md) 🚀

**대상:** 관리자, 시스템 운영자

**내용:**
- O4O 플랫폼 전체 기능 개요
- 각 모듈별 핵심 기능 설명
- 통합 시스템 구조

---

## 🔧 개발 문서 (Technical Documentation)

### 13. [SlideApp 마이그레이션 가이드](./slide-app-migration.md) 📊

**대상:** 개발자, 시스템 아키텍트

**내용:**
- M1~M6 단계별 마이그레이션 이력
- 레거시 슬라이드 블록 → Embla Carousel 기반 SlideApp 전환
- 아키텍처 변경사항 및 Breaking Changes
- API 스키마 확정 (AspectRatio, Autoplay, Slide fields)
- 삭제된 레거시 목록 (33 files, -11,321 lines)
- 향후 확장 계획 (M7~M10)

**버전:** v1.6.0 (2025-10-29)

**주요 성과:**
- 코드베이스 80% 간소화
- WCAG 2.2 준수 (Lighthouse Accessibility ≥ 95점)
- 6KB 경량화 (gzip)
- TypeScript strict mode 완전 준수

---

### 14. [M5 SlideApp QA 체크리스트](./M5-SLIDEAPP-QA-CHECKLIST.md) ✅

**대상:** QA 엔지니어, 테스터

**내용:**
- 기능 검증 체크리스트 (admin-dashboard, main-site, ecommerce)
- 성능 측정 가이드 (Chrome DevTools + Lighthouse)
- 접근성 검증 (키보드, 스크린리더, ARIA)
- 모바일 터치 테스트
- 회귀 테스트 시나리오
- Edge cases (빈 데이터, 단일 슬라이드, 대량 슬라이드)

**DoD 기준:**
- 60fps, CPU < 15%, CLS < 0.1
- Lighthouse Accessibility ≥ 95점
- 0 console errors

---

### 15. [CHANGELOG](./CHANGELOG.md) 📝

**대상:** 전체 팀

**내용:**
- 프로젝트 전체 변경 이력
- 버전별 Added/Changed/Removed 항목
- Breaking Changes 및 Migration Notes

**최신 버전:** v1.6.0 (2025-10-29)
- SlideApp 패키지 추가
- 레거시 슬라이드/슬라이더 블록 제거 (31 files)
- ProductCarousel 통합

---

## 📝 문서 사용 방법

### 방법 1: 마크다운 파일 직접 읽기

1. 이 폴더의 `.md` 파일을 텍스트 에디터로 열기
2. 내용 확인 및 복사

### 방법 2: 페이지로 변환

1. 관리 대시보드 → 페이지 → 새 페이지
2. 마크다운 내용을 HTML로 변환하여 붙여넣기
3. 게시

### 방법 3: 마크다운 리더 블록 사용 (권장)

```
블록 추가 → 임베드 → Markdown Reader

URL: /docs/manual/shortcode-reference.md
```

**장점:**
- 문서 업데이트 시 페이지 자동 갱신
- 별도 수정 불필요
- 항상 최신 상태 유지

---

## 🔄 문서 업데이트

### 수동 업데이트

파일을 직접 수정:
```bash
# 파일 편집
vi docs/manual/shortcode-reference.md

# Git 커밋
git add docs/manual/shortcode-reference.md
git commit -m "docs: Update shortcode reference"
```

### 자동 업데이트 (숏코드 레퍼런스)

숏코드를 추가하거나 변경한 후:

```bash
# 숏코드 레퍼런스 자동 업데이트
npm run update:shortcode-docs
```

이 명령은:
1. 실제 숏코드 레지스트리를 스캔
2. 모든 숏코드 정보를 수집
3. `shortcode-reference.md` 파일을 자동 생성
4. 카테고리별로 정리하여 저장

**주의:** 자동 생성 문서를 수동으로 편집하면 다음 업데이트 시 덮어쓰여집니다.

---

## 🎯 문서 작성 가이드

### 새 매뉴얼 추가

1. **파일 생성**
   ```bash
   touch docs/manual/new-feature-guide.md
   ```

2. **템플릿 사용**
   ```markdown
   # 기능 이름 가이드

   > 마지막 업데이트: 2025-10-05

   ## 개요

   이 기능은...

   ## 사용 방법

   1. 단계 1
   2. 단계 2
   3. 단계 3

   ## 예시

   ...

   ## 문제 해결

   ...
   ```

3. **이 README에 추가**
   - 문서 목록에 항목 추가
   - 링크 및 설명 작성

---

## 📊 문서 현황

| 문서 | 상태 | 마지막 업데이트 | 자동 생성 |
|------|------|----------------|-----------|
| README.md | ✅ | 2025-10-29 | ❌ |
| admin-manual.md | 🔄 | 2025-10-22 | ❌ |
| editor-usage-manual.md | ✅ | 2025-10-21 | ❌ |
| shortcode-reference.md | ✅ | 2025-10-05 | ✅ |
| ai-user-guide.md | ✅ | 2025-10-19 | ❌ |
| ai-technical-guide.md | ✅ | 2025-10-19 | ❌ |
| ~~ai-page-generation.md~~ | 🗑️ | 2025-10-05 | ⚠️ |
| blocks-reference.md (AI용) | ✅ | 2025-10-21 | ❌ |
| blocks-reference-detailed.md | ✅ | 2025-10-15 | ❌ |
| appearance-customize.md | ✅ | 2025-10-05 | ❌ |
| appearance-menus.md | ✅ | 2025-10-05 | ❌ |
| appearance-template-parts.md | ✅ | 2025-10-01 | ❌ |
| dropshipping-user-manual.md | ✅ | 2025-10-24 | ❌ |
| seller-manual.md | ✅ | 2025-10-28 | ❌ |
| supplier-manual.md | ✅ | 2025-10-28 | ❌ |
| platform-features.md | ✅ | 2025-10-28 | ❌ |
| **slide-app-migration.md** | ✅ | **2025-10-29** | ❌ |
| **M5-SLIDEAPP-QA-CHECKLIST.md** | ✅ | **2025-10-29** | ❌ |
| **CHANGELOG.md** | ✅ | **2025-10-29** | ❌ |

**범례:**
- ✅: 최신 상태
- 🔄: 업데이트 진행 중
- 🗑️: Deprecated (더 이상 사용하지 않음)
- ⚠️: 부분적으로 자동 생성
- ❌: 수동 관리

---

## 💡 팁

### 1. 빠른 검색

각 문서는 마크다운으로 작성되어 있어 텍스트 검색이 쉽습니다:

```bash
# 특정 숏코드 찾기
grep -n "product_grid" docs/manual/shortcode-reference.md

# 특정 키워드 찾기
grep -r "파트너" docs/manual/
```

### 2. 버전 관리

문서는 Git으로 버전 관리됩니다:

```bash
# 문서 변경 이력 확인
git log docs/manual/shortcode-reference.md

# 특정 시점으로 복원
git checkout <commit-hash> docs/manual/shortcode-reference.md
```

### 3. 페이지 자동 생성 스크립트 (향후 개선)

```typescript
// 미래 계획: 문서를 자동으로 페이지로 변환
import { createPageFromMarkdown } from '@/utils/markdown-to-page';

createPageFromMarkdown('docs/manual/shortcode-reference.md', {
  title: '숏코드 레퍼런스',
  slug: 'shortcode-reference',
  status: 'publish'
});
```

---

## 🔗 관련 문서

- [개발자 가이드](../guide/README.md)
- [아키텍처 문서](../architecture/README.md)
- [API 문서](../api-analysis/API_DOCUMENTATION.md)

---

## 📞 문의

문서 관련 문의사항:
- 오타/오류 발견: GitHub Issues
- 새 문서 요청: 개발팀에 문의
- 업데이트 요청: Pull Request
