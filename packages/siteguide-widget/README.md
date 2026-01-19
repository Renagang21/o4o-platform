# SiteGuide Widget

> **SiteGuide는 Neture 종속이 아닌, 모든 사업자를 위한 독립 AI 사이트 안내 서비스입니다.**

외부 홈페이지에 삽입 가능한 AI 안내 위젯입니다.

## Quick Start

### 방법 1: 스크립트 태그 (권장)

```html
<script
  src="https://siteguide.co.kr/widget.js"
  data-siteguide-key="your-api-key"
></script>
```

### 방법 2: JavaScript 초기화

```html
<script src="https://siteguide.co.kr/widget.js"></script>
<script>
  SiteGuide.init({
    apiKey: 'your-api-key',
    position: 'bottom-right',
    theme: 'light',
    primaryColor: '#3b82f6'
  });
</script>
```

## 설정 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `apiKey` | string | (필수) | 사업자 API 키 |
| `apiUrl` | string | `https://api.siteguide.co.kr` | API 서버 URL |
| `position` | string | `bottom-right` | 버튼 위치: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `theme` | string | `light` | 테마: `light`, `dark`, `auto` |
| `primaryColor` | string | `#3b82f6` | 메인 색상 (hex) |
| `placeholder` | string | `무엇이든 물어보세요...` | 입력 플레이스홀더 |
| `welcomeMessage` | string | (기본 메시지) | 환영 메시지 |
| `autoOpen` | boolean | `false` | 첫 방문 시 자동 열기 |

## 페이지 컨텍스트 수동 설정

자동 수집 외에 추가 정보를 제공하려면:

```javascript
SiteGuide.init({
  apiKey: 'your-api-key',
  pageContext: {
    pageType: 'product',
    category: '전자제품',
    tags: ['스마트폰', 'Android'],
    customData: {
      productId: '12345'
    }
  }
});
```

## API

### `SiteGuide.init(config)`
위젯 초기화

### `SiteGuide.open()`
채팅 패널 열기

### `SiteGuide.close()`
채팅 패널 닫기

### `SiteGuide.destroy()`
위젯 제거

## 자동 수집 정보

위젯은 다음 정보를 자동으로 수집합니다:

- 현재 페이지 URL
- 페이지 제목 (`document.title`)
- Meta description
- Open Graph description (fallback)
- Meta keywords (태그로 변환)

## 개발

```bash
# 의존성 설치
pnpm install

# 개발 빌드 (watch mode)
pnpm dev

# 프로덕션 빌드
pnpm build
```

## 서비스 정보

- **공식 도메인**: siteguide.co.kr
- **대상**: 홈페이지를 가진 모든 사업자
- **문서**: [docs/services/siteguide/](../../docs/services/siteguide/)

---

*이 패키지는 O4O Platform의 독립 서비스인 SiteGuide의 일부입니다.*
