# @o4o/shortcodes

WordPress 스타일의 shortcode 시스템 for O4O Platform

## 특징

- 🔧 **통합 Parser**: 단일 소스로 모든 shortcode 파싱
- 🎨 **React 컴포넌트**: shortcode를 React 컴포넌트로 렌더링
- 🔄 **동적 데이터**: CPT, ACF, Meta 필드 지원
- 📦 **TypeScript**: 완전한 타입 안정성
- 🚀 **캐싱**: API 요청 최적화

## 사용법

```typescript
import { defaultParser, ShortcodeRenderer } from '@o4o/shortcodes';

// Parse shortcodes
const parsed = defaultParser.parse('[cpt_list type="ds_product" count="6"]');

// Render shortcodes
<ShortcodeRenderer content="[cpt_list type='ds_product' count='6']" />
```

## 지원하는 Shortcodes

### 동적 데이터
- `[cpt_list]` - CPT 게시물 목록
- `[cpt_field]` - CPT 필드 값
- `[acf_field]` - ACF 커스텀 필드
- `[meta_field]` - 메타 필드 값

### 기본 Shortcodes
- `[gallery]` - 이미지 갤러리
- `[button]` - 버튼
- `[embed]` - 외부 컨텐츠 임베드

## 개발

```bash
# 빌드
pnpm run build

# 타입 체크
pnpm run type-check

# 개발 모드 (watch)
pnpm run dev
```
