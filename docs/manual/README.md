# 사용자 매뉴얼

이 폴더는 O4O 플랫폼의 사용자 매뉴얼을 포함합니다.

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

### 2. [AI 페이지 생성 매뉴얼](./ai-page-generation.md)

**대상:** 콘텐츠 편집자, 마케터

**내용:**
- AI 페이지 자동 생성 기능 사용법
- 지원하는 AI 모델
- 템플릿 유형 (Landing, About, Product, Blog)
- 사용 가능한 블록 및 숏코드 레퍼런스

**업데이트:** 블록/숏코드 변경 시 자동 업데이트 가능

---

### 3. [블록 레퍼런스](./blocks-reference.md)

**대상:** 관리자, 콘텐츠 편집자, 개발자

**내용:**
- 사용 가능한 모든 블록 목록
- 각 블록의 속성과 사용법
- 카테고리별 분류 (텍스트, 레이아웃, 미디어, 인터랙티브, 동적)
- 실제 사용 예시 및 CSS 클래스
- 블록 개발 가이드

**업데이트:** 수동 관리 (코드 변경 시 문서 업데이트 필요)

**페이지로 만들기:**
1. 관리 대시보드 → 페이지 → 새 페이지 추가
2. 제목: "블록 레퍼런스"
3. `blocks-reference.md` 파일 내용을 복사하여 붙여넣기
4. 게시

**자동 동기화 (권장):**
- 마크다운 리더 블록 사용:
  ```
  [markdown_reader url="/docs/manual/blocks-reference.md"]
  ```

---

### 4. [외모 커스터마이징 가이드](./appearance-customize.md)

**대상:** 관리자, 디자이너

**내용:**
- 사이트 외모 커스터마이징 방법
- 테마 설정
- 색상 및 폰트 변경
- 레이아웃 조정

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
| shortcode-reference.md | ✅ | 2025-10-05 | ✅ |
| ai-page-generation.md | ✅ | 2025-10-05 | ⚠️ 부분 |
| blocks-reference.md | ✅ | 2025-10-08 | ❌ |
| appearance-customize.md | ✅ | - | ❌ |
| appearance-menus.md | ✅ | - | ❌ |
| appearance-template-parts.md | ✅ | - | ❌ |

**범례:**
- ✅: 최신 상태
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
