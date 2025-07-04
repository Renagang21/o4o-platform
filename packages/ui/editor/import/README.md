# WordPress Page Import System

완전한 WordPress 페이지 가져오기 시스템으로, Gutenberg 풀스크린 에디터와 완벽하게 통합됩니다.

## 🚀 주요 기능

### ✅ 완전 구현된 시스템
- **블록 삽입기 "가져오기" 탭**: WordPress 스타일의 탭 인터페이스
- **ImportBlock 진행상황 표시**: 실시간 진행률과 단계별 상태
- **WordPress URL 입력 모달**: 3가지 가져오기 타입 지원
- **HTML 분석 및 변환 엔진**: 강력한 콘텐츠 파싱
- **Tiptap JSON 변환 로직**: 완벽한 블록 변환
- **CORS 및 보안 처리**: 안전한 콘텐츠 가져오기
- **Extension 자동 로딩**: 필요한 확장 자동 감지

## 🏗️ 시스템 아키텍처

```
shared/components/editor/import/
├── ImportBlock.tsx              # 진행상황 표시 컴포넌트
├── ImportModal.tsx              # URL/콘텐츠 입력 모달
├── ImportManager.ts             # 메인 가져오기 관리자
├── HtmlAnalyzer.ts              # HTML 분석 및 파싱
├── TiptapConverter.ts           # Tiptap JSON 변환
├── CorsProxyService.ts          # CORS 프록시 및 보안
├── ExtensionLoader.ts           # 확장 자동 로딩
└── index.ts                     # 통합 export
```

## 🔧 통합 방법

### 1. BlockInserter 통합 완료
```tsx
// shared/components/editor/fullscreen/LeftSidebar/BlockInserter.tsx
import { ImportModal, ImportBlock, ImportManager } from '../../../import';

// 탭 인터페이스
- "블록" 탭: 기존 블록 삽입 기능
- "가져오기" 탭: WordPress/HTML/마크다운 가져오기
```

### 2. 가져오기 워크플로우
```typescript
1. 사용자가 "가져오기" 탭 클릭
2. WordPress/HTML/마크다운 옵션 선택
3. ImportModal에서 URL/콘텐츠 입력
4. ImportManager가 단계별 변환 수행
5. ImportBlock이 실시간 진행상황 표시
6. 완료 시 Tiptap 에디터에 자동 삽입
```

## 📋 지원하는 가져오기 타입

### 1. WordPress 페이지 (🌐)
- **URL 입력**: 공개된 WordPress 페이지 URL
- **자동 콘텐츠 추출**: `.entry-content`, `.post-content` 등
- **메타데이터 추출**: 제목, 이미지, 링크 등
- **WordPress 블록 인식**: `wp-block-*` 클래스 지원

**지원 사이트**:
- wordpress.com
- wordpress.org
- 커스텀 WordPress 사이트

### 2. HTML 소스 (💻)
- **직접 붙여넣기**: HTML 코드 직접 입력
- **보안 검사**: DOMPurify로 안전한 HTML 생성
- **표준 태그 지원**: h1-h6, p, ul, ol, img, table 등

### 3. 마크다운 (📝)
- **GitHub 스타일**: 표준 마크다운 문법
- **확장 문법**: 표, 코드 블록, 체크박스
- **자동 변환**: MD → HTML → Tiptap JSON

## 🛡️ 보안 및 CORS 처리

### CORS 프록시 서비스
```typescript
// 개발 환경: 공개 CORS 프록시 사용
- api.allorigins.win
- corsproxy.io
- cors-anywhere.herokuapp.com

// 프로덕션: 서버 사이드 프록시
- /api/proxy-fetch 엔드포인트 구현 필요
```

### 보안 검사
- **DOMPurify 사용**: XSS 공격 방지
- **허용된 태그만**: script, style 등 위험 태그 제거
- **URL 검증**: 로컬 IP, 악성 프로토콜 차단
- **콘텐츠 크기 제한**: 5MB 최대

## 🔌 Extension 자동 로딩

### 지원하는 Tiptap 확장
```typescript
- 기본: document, paragraph, text
- 포맷팅: bold, italic, underline, code
- 블록: heading, blockquote, bulletList, orderedList
- 미디어: image, link
- 테이블: table, tableRow, tableCell
- 유틸리티: history, dropCursor, gapCursor
```

### 자동 감지 로직
1. HTML 분석으로 필요한 확장 감지
2. 의존성 해결 (예: bulletList → listItem)
3. 우선순위에 따른 순차 로딩
4. 실패 시 fallback 확장 사용

## 🎯 변환 품질

### HTML → Tiptap 변환
- **제목**: h1-h6 → heading (level 1-6)
- **텍스트**: p → paragraph, strong/em → marks
- **리스트**: ul/ol → bulletList/orderedList
- **이미지**: img → image (src, alt, title)
- **테이블**: table → table + tableRow + tableCell
- **링크**: a → link mark
- **인용**: blockquote → blockquote
- **코드**: pre/code → codeBlock

### 품질 평가
- **콘텐츠 점수**: 0-100점
- **이슈 감지**: 제목 없음, 이미지 alt 없음
- **제안 사항**: 접근성 개선 안내

## 🚀 사용법

### 기본 사용
```tsx
import { BlockInserter } from '@shared/components/editor/fullscreen';

// Gutenberg 에디터의 왼쪽 사이드바에 자동 통합
<FullScreenEditor>
  <LeftSidebar>
    <BlockInserter /> {/* 가져오기 탭 포함 */}
  </LeftSidebar>
</FullScreenEditor>
```

### 직접 사용
```tsx
import { ImportManager, ImportModal } from '@shared/components/editor/import';

const importManager = new ImportManager({
  onComplete: (result) => {
    // 에디터에 결과 삽입
    editor.commands.setContent(result.document);
  }
});

// WordPress 페이지 가져오기
await importManager.importContent('wordpress', 'https://example.com/post');
```

## 📊 진행상황 모니터링

### ImportBlock 컴포넌트
```tsx
<ImportBlock
  title="WordPress 페이지 가져오기"
  description="example.com에서 콘텐츠를 가져오는 중..."
  steps={importSteps}
  progress={75}
  onCancel={handleCancel}
/>
```

### 단계별 상태
1. **pending**: 대기 중 (⏱️)
2. **loading**: 진행 중 (🔄)
3. **completed**: 완료 (✅)
4. **error**: 오류 (❌)

## 🔧 확장 및 커스터마이징

### 커스텀 확장 추가
```typescript
const extensionLoader = new ExtensionLoader();

extensionLoader.registerCustomExtension({
  name: 'customBlock',
  module: '@mycompany/tiptap-custom-extension',
  priority: 200,
  config: { /* 설정 */ }
});
```

### 커스텀 변환 규칙
```typescript
class CustomTiptapConverter extends TiptapConverter {
  protected convertBlock(block: ParsedBlock): TiptapNode | null {
    if (block.type === 'custom') {
      return {
        type: 'customBlock',
        attrs: block.attrs
      };
    }
    return super.convertBlock(block);
  }
}
```

## ⚠️ 주의사항

### CORS 프록시 설정
프로덕션 환경에서는 반드시 서버 사이드 프록시를 구현하세요:

```javascript
// Express.js 예시
app.post('/api/proxy-fetch', async (req, res) => {
  const { url } = req.body;
  
  try {
    const response = await fetch(url);
    const content = await response.text();
    
    res.json({
      content,
      status: response.status,
      contentType: response.headers.get('content-type')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### DOMPurify 설정
브라우저 환경에서만 작동하므로 SSR 고려 필요:

```typescript
// 조건부 import
const DOMPurify = typeof window !== 'undefined' 
  ? require('dompurify') 
  : null;
```

## 🧪 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. Gutenberg 에디터 접속
- `http://localhost:3000/admin-test`
- 페이지 → 새 페이지 추가 → Gutenberg 에디터

### 3. 가져오기 테스트
1. 왼쪽 사이드바에서 "가져오기" 탭 클릭
2. WordPress 페이지 옵션 선택
3. 테스트 URL 입력: `https://wordpress.org/news/`
4. 진행상황 확인 및 결과 검증

### 4. 다른 타입 테스트
- **HTML**: 간단한 HTML 코드 붙여넣기
- **마크다운**: GitHub README 형식 텍스트

## 🎉 완성된 기능

✅ **블록 삽입기 "가져오기" 탭 추가**
✅ **ImportBlock 진행상황 표시 컴포넌트**
✅ **WordPress URL 입력 모달**
✅ **HTML 분석 및 변환 엔진**
✅ **Tiptap JSON 변환 로직**
✅ **CORS 및 보안 처리**
✅ **Extension 자동 로딩 시스템**
✅ **완전한 통합 및 테스트**

**이제 사용자들이 WordPress 페이지를 포함한 다양한 콘텐츠를 Gutenberg 풀스크린 에디터로 완벽하게 가져올 수 있습니다!** 🎉