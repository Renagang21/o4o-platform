# Customizer 설정 스키마 명세서

**목적**: Customizer 설정의 타입 및 구조 정의

---

## 📐 전체 스키마 구조

```typescript
interface AstraCustomizerSettings {
  siteIdentity: SiteIdentitySettings;
  colors: ColorSettings;
  typography: TypographySettings;
  header: HeaderSettings;
  footer: FooterSettings;
  blog: BlogSettings;
  sidebar: SidebarSettings;
  buttons: ButtonSettings;
}
```

---

## 🔑 핵심 필드 상세

### 1. footer.widgets.columns

**경로**: `settings.footer.widgets.columns`

**타입**: `ResponsiveColumns` (객체)

**구조**:
```typescript
interface ResponsiveColumns {
  desktop: 1 | 2 | 3 | 4 | 5;  // 필수
  tablet: 1 | 2 | 3 | 4 | 5;   // 필수
  mobile: 1 | 2 | 3 | 4 | 5;   // 필수
}
```

**기본값**:
```typescript
{
  desktop: 4,
  tablet: 2,
  mobile: 1
}
```

**변환 규칙**:
```typescript
// ❌ 잘못된 형식 (legacy)
columns: 4  // number

// ✅ 정규화 후
columns: {
  desktop: 4,
  tablet: 2,
  mobile: 1
}
```

**어댑터 로직**:
```typescript
function normalizeColumns(value: unknown): ResponsiveColumns {
  // Case 1: number (legacy)
  if (typeof value === 'number') {
    return {
      desktop: value as 1 | 2 | 3 | 4 | 5,
      tablet: Math.max(2, Math.floor(value / 2)) as 1 | 2 | 3 | 4 | 5,
      mobile: 1
    };
  }

  // Case 2: object (current)
  if (typeof value === 'object' && value !== null) {
    return {
      desktop: (value as any).desktop ?? 4,
      tablet: (value as any).tablet ?? 2,
      mobile: (value as any).mobile ?? 1
    };
  }

  // Case 3: undefined/null (fallback)
  return { desktop: 4, tablet: 2, mobile: 1 };
}
```

---

### 2. siteIdentity

**경로**: `settings.siteIdentity`

**타입**: `SiteIdentitySettings`

**구조**:
```typescript
interface SiteIdentitySettings {
  title: string;                    // 사이트 제목
  tagline: string;                  // 태그라인
  logo?: {
    url: string;                    // 로고 URL
    width?: number;                 // 로고 너비 (px)
    height?: number;                // 로고 높이 (px)
  };
  favicon?: string;                 // 파비콘 URL
}
```

**기본값**:
```typescript
{
  title: "My Site",
  tagline: "",
  logo: undefined,
  favicon: undefined
}
```

**검증 규칙**:
- `title`: 1~100자
- `tagline`: 0~200자
- `logo.width`: 10~500 (px)
- `logo.height`: 10~500 (px)

---

### 3. colors

**경로**: `settings.colors`

**타입**: `ColorSettings`

**구조**:
```typescript
interface ColorSettings {
  primary: string;        // Primary 색상 (hex)
  accent: string;         // Accent 색상 (hex)
  text: string;           // 텍스트 색상 (hex)
  background: string;     // 배경 색상 (hex)
  link: string;           // 링크 색상 (hex)
}
```

**기본값**:
```typescript
{
  primary: "#0073aa",
  accent: "#00a0d2",
  text: "#333333",
  background: "#ffffff",
  link: "#0073aa"
}
```

**검증 규칙**:
- 형식: `#RRGGBB` (6자리 hex)
- 예: `#FF5733`, `#0073AA`

---

### 4. typography

**경로**: `settings.typography`

**타입**: `TypographySettings`

**구조**:
```typescript
interface TypographySettings {
  fontFamily: {
    body: string;         // 본문 폰트
    heading: string;      // 제목 폰트
  };
  fontSize: {
    base: number;         // 기본 크기 (px)
    h1: number;           // H1 크기 (px)
    h2: number;           // H2 크기 (px)
    h3: number;           // H3 크기 (px)
  };
  lineHeight: {
    body: number;         // 본문 줄높이
    heading: number;      // 제목 줄높이
  };
}
```

**기본값**:
```typescript
{
  fontFamily: {
    body: "system-ui, -apple-system, sans-serif",
    heading: "system-ui, -apple-system, sans-serif"
  },
  fontSize: {
    base: 16,
    h1: 32,
    h2: 28,
    h3: 24
  },
  lineHeight: {
    body: 1.6,
    heading: 1.2
  }
}
```

---

## 🛡️ 검증 규칙

### 1. 숫자 키 차단
```typescript
// ❌ 거부
{
  "0": "value",
  "1": "value"
}

// ✅ 허용
{
  "desktop": 4,
  "tablet": 2
}
```

### 2. 알 수 없는 키 차단
```typescript
// ❌ 거부 (스키마에 없는 키)
{
  footer: {
    unknownField: "value"
  }
}

// ✅ 허용 (스키마 정의된 키만)
{
  footer: {
    widgets: { ... }
  }
}
```

### 3. 타입 불일치 차단
```typescript
// ❌ 거부
{
  colors: {
    primary: 123  // string 기대, number 전달
  }
}

// ✅ 허용
{
  colors: {
    primary: "#FF5733"
  }
}
```

---

## 🔄 변환 및 정규화 플로우

```
사용자 입력
    ↓
[1] sanitizeSettings (숫자 키 제거)
    ↓
[2] normalizeCustomizerSettings (타입 변환)
    ↓
[3] mergeWithDefaults (기본값 병합)
    ↓
[4] validate (스키마 검증)
    ↓
저장 (DB)
```

---

## 📊 API 응답 구조

### GET `/api/v1/settings/customizer`

**성공 응답**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "siteIdentity": { ... },
      "colors": { ... },
      "footer": {
        "widgets": {
          "enabled": true,
          "columns": {
            "desktop": 4,
            "tablet": 2,
            "mobile": 1
          }
        }
      }
    }
  }
}
```

### PUT `/api/v1/settings/customizer`

**요청 본문**:
```json
{
  "settings": {
    "siteIdentity": { ... },
    "colors": { ... }
  }
}
```

**성공 응답**:
```json
{
  "success": true,
  "data": {
    "settings": { ... }  // 저장된 최종 스냅샷
  }
}
```

**실패 응답 (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Contaminated data detected",
  "details": [
    "footer.widgets: 2 numeric key(s)"
  ]
}
```

---

## 🧪 테스트 케이스

### 케이스 1: 정상 입력
**입력**:
```json
{
  "footer": {
    "widgets": {
      "columns": {
        "desktop": 4,
        "tablet": 2,
        "mobile": 1
      }
    }
  }
}
```

**기대 결과**: ✅ 200 OK

---

### 케이스 2: Legacy 형식 (number)
**입력**:
```json
{
  "footer": {
    "widgets": {
      "columns": 4
    }
  }
}
```

**정규화 후**:
```json
{
  "footer": {
    "widgets": {
      "columns": {
        "desktop": 4,
        "tablet": 2,
        "mobile": 1
      }
    }
  }
}
```

**기대 결과**: ✅ 200 OK

---

### 케이스 3: 숫자 키 포함
**입력**:
```json
{
  "footer": {
    "widgets": {
      "0": "invalid"
    }
  }
}
```

**기대 결과**: ❌ 400 Bad Request
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Contaminated data detected"
}
```

---

### 케이스 4: 타입 불일치
**입력**:
```json
{
  "colors": {
    "primary": 123
  }
}
```

**기대 결과**: ❌ 400 Bad Request
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid type for colors.primary"
}
```

---

## 📚 참고 자료

- TypeScript 타입 정의: `apps/admin-dashboard/src/pages/appearance/astra-customizer/types/`
- 정규화 유틸: `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/normalize-settings.ts`
- 서버 검증: `apps/api-server/src/routes/v1/settings.routes.ts`

---

**다음 단계**: 스키마 기반 어댑터 구현
