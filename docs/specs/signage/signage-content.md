# Digital Signage Content Data Model

> 최종 업데이트: 2025-12-10
> 슬라이드 콘텐츠 및 플레이리스트 구조

---

## 1. Slide Data Model

### Slide Entity

슬라이드는 ViewRenderer JSON 기반으로 정의된다.

```typescript
interface SignageSlide {
  id: string;
  title: string;
  description?: string;
  json: SlideJSON;        // ViewRenderer 호환
  thumbnail?: string;
  duration: number;       // seconds
  category?: string;
  tags?: string[];
  active: boolean;
}
```

### Slide JSON Structure

```json
{
  "type": "slide",
  "layout": "full",
  "background": {
    "type": "image",
    "src": "https://cdn.example.com/bg.jpg"
  },
  "content": {
    "title": "신제품 출시",
    "subtitle": "50% 할인 이벤트",
    "textColor": "#ffffff"
  }
}
```

### Slide Types

| Type | 설명 | 용도 |
|------|------|------|
| `text` | 텍스트 전용 | 공지사항, 안내 |
| `image` | 이미지 전용 | 제품 이미지, 광고 |
| `video` | 비디오 전용 | 프로모션 영상 |
| `mixed` | 복합 레이아웃 | 이미지+텍스트 조합 |

---

## 2. Playlist Structure

### Playlist Entity

```typescript
interface SignagePlaylist {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  loop: boolean;
  items: PlaylistItem[];
}

interface PlaylistItem {
  id: string;
  playlistId: string;
  slideId: string;
  order: number;
  duration?: number;    // override slide default
}
```

### Playlist Example

```json
{
  "id": "playlist-1",
  "title": "오전 프로모션",
  "loop": true,
  "items": [
    { "slideId": "slide-1", "order": 1, "duration": 15 },
    { "slideId": "slide-2", "order": 2 },
    { "slideId": "slide-3", "order": 3, "duration": 20 }
  ]
}
```

---

## 3. API Endpoints

### Slides

| Method | Path | 설명 |
|--------|------|------|
| GET | /signage/slides | 슬라이드 목록 |
| GET | /signage/slides/:id | 슬라이드 상세 |
| POST | /signage/slides | 슬라이드 생성 |
| PUT | /signage/slides/:id | 슬라이드 수정 |
| DELETE | /signage/slides/:id | 슬라이드 삭제 |

### Playlists

| Method | Path | 설명 |
|--------|------|------|
| GET | /signage/playlists | 플레이리스트 목록 |
| GET | /signage/playlists/:id | 플레이리스트 상세 |
| POST | /signage/playlists | 플레이리스트 생성 |
| PUT | /signage/playlists/:id | 플레이리스트 수정 |
| POST | /signage/playlists/:id/items | 아이템 추가 |

---

## 4. Content Integration

### slide-app 연동

```typescript
// SlideApp 컴포넌트 Props
interface SlideAppProps {
  slides: Slide[];
  autoplay?: {
    enabled: boolean;
    delay: number;
    pauseOnInteraction?: boolean;
  };
  loop?: boolean;
  navigation?: boolean;
  pagination?: 'none' | 'dots' | 'numbers' | 'progress';
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  onSlideChange?: (index: number) => void;
}
```

### 슬라이드 타입 변환

```typescript
// SignageSlide → SlideApp Slide
function toSlideAppSlide(signageSlide: SignageSlide): Slide {
  const json = signageSlide.json;
  return {
    id: signageSlide.id,
    type: json.type || 'mixed',
    src: json.background?.src,
    content: json.content?.title,
    title: json.content?.title,
    subtitle: json.content?.subtitle,
    backgroundColor: json.background?.color,
    textColor: json.content?.textColor,
  };
}
```

---

## 5. Category & Tags

### 권장 카테고리

| 카테고리 | 용도 |
|----------|------|
| `promotion` | 프로모션/할인 |
| `product` | 신제품 소개 |
| `notice` | 공지사항 |
| `event` | 이벤트 안내 |
| `brand` | 브랜드 이미지 |

### 태그 활용

```json
{
  "category": "promotion",
  "tags": ["summer", "cosmetics", "discount", "skincare"]
}
```

---

## Related Documents

- [Signage Overview](./signage-overview.md)
- [Playback System](./signage-playback.md)

---

*Phase 12-3에서 생성*
