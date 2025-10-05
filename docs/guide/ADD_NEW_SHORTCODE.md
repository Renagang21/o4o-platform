# 새 숏코드 추가하기

이 가이드는 새로운 숏코드를 추가하고 AI가 자동으로 인식하도록 하는 방법을 설명합니다.

## 방법 1: 일반 숏코드 추가 (권장)

간단한 콘텐츠 숏코드는 `shortcode-registry.ts`에 등록하면 됩니다.

### 1. 숏코드 레지스트리에 등록

**파일**: `apps/admin-dashboard/src/services/ai/shortcode-registry.ts`

```typescript
// 적절한 카테고리에 추가
export const contentShortcodes: Record<string, ShortcodeConfig> = {
  // ... 기존 숏코드들

  // 새 숏코드 추가
  'my_shortcode': {
    description: '내 숏코드 설명',
    category: 'Content',  // Content, Media, Forms, E-commerce 중 선택
    attributes: {
      title: {
        type: 'string',
        required: true,
        description: '제목'
      },
      count: {
        type: 'number',
        default: 5,
        description: '표시 개수'
      }
    }
  }
};
```

### 2. 숏코드 컴포넌트 작성

**파일**: `apps/admin-dashboard/src/components/shortcodes/MyShortcode.tsx`

```typescript
import React from 'react';

interface MyShortcodeProps {
  title?: string;
  count?: number;
}

const MyShortcode: React.FC<MyShortcodeProps> = ({
  title = '기본 제목',
  count = 5
}) => {
  return (
    <div className="my-shortcode">
      <h3>{title}</h3>
      <p>표시 개수: {count}</p>
      {/* 숏코드 로직 구현 */}
    </div>
  );
};

export default MyShortcode;
```

### 3. ShortcodeRenderer에 등록

**파일**: `apps/admin-dashboard/src/components/shortcodes/ShortcodeRenderer.tsx`

```typescript
// Import 추가
import MyShortcode from './MyShortcode';

// COMPONENT_MAP에 추가
const COMPONENT_MAP = {
  // ... 기존 컴포넌트들
  'MyShortcode': MyShortcode,
  'my_shortcode': MyShortcode,  // 언더스코어 버전도 추가
};
```

### 4. 완료!

이제 AI가 자동으로 새 숏코드를 인식합니다:

```
사용자: "제품 리뷰 페이지를 만들어줘"
AI: [my_shortcode title="제품 리뷰" count="10"]을 사용하여 페이지를 생성합니다...
```

---

## 방법 2: Dropshipping 숏코드 추가

드롭쉬핑 관련 숏코드는 별도 레지스트리에 등록합니다.

### 1. 카테고리별 파일에 추가

**Partner 숏코드**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/index.ts`

```typescript
export const partnerShortcodes = {
  // ... 기존 숏코드들

  'partner_new_feature': {
    component: 'PartnerNewFeature',
    description: '파트너 새 기능',
    attributes: {
      mode: {
        type: 'string',
        default: 'default',
        description: '표시 모드'
      }
    }
  }
};
```

### 2. 컴포넌트 작성

**파일**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/PartnerNewFeature.tsx`

```typescript
import React from 'react';

const PartnerNewFeature: React.FC<{ mode?: string }> = ({ mode = 'default' }) => {
  return (
    <div className="partner-new-feature">
      <h2>새 기능 ({mode})</h2>
      {/* 구현 */}
    </div>
  );
};

export default PartnerNewFeature;
```

### 3. Export 추가

**파일**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/index.ts`

```typescript
// Export 추가
export { default as PartnerNewFeature } from './PartnerNewFeature';
```

### 4. ShortcodeRenderer에 등록

```typescript
import { PartnerNewFeature } from './dropshipping/partner';

const COMPONENT_MAP = {
  // ...
  'PartnerNewFeature': PartnerNewFeature,
};
```

---

## 방법 3: 동적 런타임 등록

프로그램 실행 중에 동적으로 숏코드를 등록할 수 있습니다.

```typescript
import { registerShortcode } from '@/services/ai/shortcode-registry';

// 앱 초기화 시
registerShortcode('dynamic_shortcode', {
  description: '동적으로 등록된 숏코드',
  category: 'Custom',
  attributes: {
    param: {
      type: 'string',
      required: true,
      description: '파라미터'
    }
  }
});
```

---

## 숏코드 사용 예시

### 페이지/포스트에서 사용

```
[my_shortcode title="안녕하세요" count="10"]

[partner_dashboard]

[product_grid category="전자제품" limit="8"]
```

### AI 생성 페이지에서 자동 사용

AI가 프롬프트를 분석하여 적절한 숏코드를 자동으로 삽입합니다:

```
프롬프트: "파트너 대시보드 페이지 만들어줘"

AI 생성 결과:
{
  "blocks": [
    {
      "type": "core/heading",
      "content": {"text": "파트너 대시보드"}
    },
    {
      "type": "core/shortcode",
      "content": {"shortcode": "[partner_dashboard]"}
    }
  ]
}
```

---

## 숏코드 카테고리

숏코드는 다음 카테고리로 분류됩니다:

- **Content**: 일반 콘텐츠 (게시물, 작성자 등)
- **Media**: 미디어 (갤러리, 비디오 등)
- **Forms**: 폼 및 데이터 뷰
- **E-commerce**: 상품, 장바구니 등
- **Dropshipping**: 드롭쉬핑 관련 기능
- **Custom**: 사용자 정의

---

## 속성 타입

숏코드 속성은 다음 타입을 지원합니다:

```typescript
{
  // 문자열
  name: {
    type: 'string',
    required: true,
    default: '기본값',
    description: '설명'
  },

  // 숫자
  count: {
    type: 'number',
    required: false,
    default: 10,
    description: '개수'
  },

  // 불린
  enabled: {
    type: 'boolean',
    default: true,
    description: '활성화 여부'
  },

  // 선택 옵션
  mode: {
    type: 'string',
    options: ['grid', 'list', 'carousel'],
    default: 'grid',
    description: '표시 모드'
  }
}
```

---

## 문서 자동 업데이트

숏코드를 추가한 후 사용자 매뉴얼을 업데이트하려면:

```bash
npm run update-ai-docs
```

이 명령은 `docs/manual/ai-page-generation.md` 파일을 자동으로 업데이트합니다.

---

## 체크리스트

새 숏코드 추가 시 확인사항:

- [ ] 숏코드 레지스트리에 등록
- [ ] 컴포넌트 작성
- [ ] ShortcodeRenderer에 등록
- [ ] 속성 타입 및 기본값 정의
- [ ] 설명 작성
- [ ] 카테고리 지정
- [ ] 예제 테스트
- [ ] (선택) 문서 업데이트

---

## 예제: 최근 댓글 숏코드

전체 과정을 보여주는 예제입니다.

### 1. 레지스트리 등록

```typescript
// shortcode-registry.ts
export const contentShortcodes: Record<string, ShortcodeConfig> = {
  'recent_comments': {
    description: '최근 댓글 목록을 표시합니다',
    category: 'Content',
    attributes: {
      limit: {
        type: 'number',
        default: 5,
        description: '표시할 댓글 수'
      },
      show_avatar: {
        type: 'boolean',
        default: true,
        description: '아바타 표시 여부'
      }
    }
  }
};
```

### 2. 컴포넌트 작성

```typescript
// RecentComments.tsx
import React, { useEffect, useState } from 'react';

interface Comment {
  id: string;
  author: string;
  content: string;
  avatar?: string;
}

interface RecentCommentsProps {
  limit?: number;
  show_avatar?: boolean;
}

const RecentComments: React.FC<RecentCommentsProps> = ({
  limit = 5,
  show_avatar = true
}) => {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // API 호출하여 댓글 가져오기
    fetch(`/api/comments?limit=${limit}`)
      .then(res => res.json())
      .then(setComments);
  }, [limit]);

  return (
    <div className="recent-comments">
      <h3>최근 댓글</h3>
      {comments.map(comment => (
        <div key={comment.id} className="comment">
          {show_avatar && comment.avatar && (
            <img src={comment.avatar} alt={comment.author} />
          )}
          <div>
            <strong>{comment.author}</strong>
            <p>{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentComments;
```

### 3. 등록

```typescript
// ShortcodeRenderer.tsx
import RecentComments from './RecentComments';

const COMPONENT_MAP = {
  'RecentComments': RecentComments,
  'recent_comments': RecentComments,
};
```

### 4. 사용

```
[recent_comments limit="10" show_avatar="true"]
```

---

## 문제 해결

### AI가 새 숏코드를 인식하지 못함

1. 레지스트리에 올바르게 등록되었는지 확인
2. 앱 재시작 또는 페이지 새로고침
3. 브라우저 콘솔에서 확인:
   ```javascript
   import { extractShortcodesMetadata } from '@/services/ai/block-registry-extractor';
   console.log(extractShortcodesMetadata());
   ```

### 숏코드가 렌더링되지 않음

1. `COMPONENT_MAP`에 등록되었는지 확인
2. 컴포넌트 import 경로 확인
3. 콘솔 에러 메시지 확인

---

## 참고

- [블록/숏코드 참조 시스템](../architecture/AI_BLOCK_REFERENCE_SYSTEM.md)
- [AI 페이지 생성 매뉴얼](../manual/ai-page-generation.md)
- [WordPress Shortcode API](https://codex.wordpress.org/Shortcode_API)
