# 커스터마이저 스키마 명세 (컨트롤 기준)

**목적**: 컨트롤이 기대하는 데이터 타입을 명시하고 어댑터가 이를 강제하도록 함
**원칙**: UI 컨트롤 기대 스키마 = 스토어 보장 스키마 = API 응답 보장 스키마
**작성일**: 2025-11-09

---

## 📋 타입 분류

### 1. Responsive 3분기 객체 (`ResponsiveValue<T>`)

**정의**:
```typescript
interface ResponsiveValue<T> {
  desktop: T;
  tablet: T;
  mobile: T;
}
```

**사용처**: `responsive={true}` 속성을 가진 AstraSlider 컨트롤

**예시**:
```json
{
  "siteIdentity": {
    "logo": {
      "width": {
        "desktop": 180,
        "tablet": 150,
        "mobile": 120
      }
    }
  }
}
```

---

### 2. Stateful Color (`ColorState`)

**정의**:
```typescript
interface ColorState {
  normal: string;
  hover?: string;
}
```

**사용처**: `hasHover={true}` 속성을 가진 AstraColorPicker 컨트롤

**예시**:
```json
{
  "colors": {
    "linkColor": {
      "normal": "#0073aa",
      "hover": "#005177"
    }
  }
}
```

---

### 3. Token (문자열)

**정의**: 순수 문자열 값

**사용처**: `hasHover` 속성이 없는 AstraColorPicker, 단일 값 입력 컨트롤

**예시**:
```json
{
  "colors": {
    "primaryColor": "#4CAF50",
    "textColor": "#333333"
  }
}
```

---

## 🎯 사이트정보 패널 (Site Identity)

### Responsive 3분기 필드

| 경로 | 타입 | 필수 | 기본값 | 패널/컨트롤명 | 비고 |
|------|------|------|--------|--------------|------|
| `siteIdentity.logo.width` | `ResponsiveValue<number>` | ✅ | `{desktop:180, tablet:150, mobile:120}` | Logo Width | AstraSlider `responsive=true` |
| `siteIdentity.siteTitle.typography.fontSize` | `ResponsiveValue<number>` | ✅ | `{desktop:24, tablet:20, mobile:18}` | Title Font Size | AstraSlider `responsive=true` |
| `siteIdentity.siteTitle.typography.lineHeight` | `ResponsiveValue<number>` | ✅ | `{desktop:1.5, tablet:1.5, mobile:1.5}` | Title Line Height | AstraSlider `responsive=true` |
| `siteIdentity.siteTitle.typography.letterSpacing` | `ResponsiveValue<number>` | ✅ | `{desktop:0, tablet:0, mobile:0}` | Title Letter Spacing | AstraSlider `responsive=true` |
| `siteIdentity.tagline.typography.fontSize` | `ResponsiveValue<number>` | ✅ | `{desktop:14, tablet:13, mobile:12}` | Tagline Font Size | AstraSlider `responsive=true` |
| `siteIdentity.tagline.typography.lineHeight` | `ResponsiveValue<number>` | ✅ | `{desktop:1.6, tablet:1.6, mobile:1.6}` | Tagline Line Height | AstraSlider `responsive=true` |
| `siteIdentity.tagline.typography.letterSpacing` | `ResponsiveValue<number>` | ✅ | `{desktop:0, tablet:0, mobile:0}` | Tagline Letter Spacing | AstraSlider `responsive=true` |

### Stateful Color 필드

| 경로 | 타입 | 필수 | 기본값 | 패널/컨트롤명 | 비고 |
|------|------|------|--------|--------------|------|
| `siteIdentity.siteTitle.color` | `ColorState` | ✅ | `{normal:"#333", hover:"#0073aa"}` | Title Color | AstraColorPicker `hasHover=true` |
| `siteIdentity.tagline.color` | `ColorState` | ✅ | `{normal:"#666", hover:"#333"}` | Tagline Color | AstraColorPicker `hasHover=true` |

### Token 필드

| 경로 | 타입 | 필수 | 기본값 | 패널/컨트롤명 | 비고 |
|------|------|------|--------|--------------|------|
| `siteIdentity.logo.desktop` | `string \| null` | ❌ | `null` | Desktop Logo | 이미지 URL |
| `siteIdentity.logo.mobile` | `string \| null` | ❌ | `null` | Mobile Logo | 이미지 URL |
| `siteIdentity.favicon` | `string \| null` | ❌ | `null` | Favicon | 이미지 URL |
| `siteIdentity.siteTitle.text` | `string` | ✅ | `"My Site"` | Site Title Text | 텍스트 |
| `siteIdentity.tagline.text` | `string` | ✅ | `""` | Tagline Text | 텍스트 |

---

## 🎨 색상 패널 (Colors)

### Stateful Color 필드

| 경로 | 타입 | 필수 | 기본값 | 패널/컨트롤명 | 비고 |
|------|------|------|--------|--------------|------|
| `colors.linkColor` | `ColorState` | ✅ | `{normal:"#0073aa", hover:"#005177"}` | Link Color | AstraColorPicker `hasHover=true` |

### Token 필드

| 경로 | 타입 | 필수 | 기본값 | 패널/컨트롤명 | 비고 |
|------|------|------|--------|--------------|------|
| `colors.primaryColor` | `string` | ✅ | `"#4CAF50"` | Primary Color | 브랜드 메인 색상 |
| `colors.secondaryColor` | `string` | ✅ | `"#2196F3"` | Secondary Color | 브랜드 보조 색상 |
| `colors.textColor` | `string` | ✅ | `"#333333"` | Text Color | 본문 텍스트 색상 |
| `colors.bodyBackground` | `string` | ✅ | `"#ffffff"` | Body Background | 사이트 배경 색상 |
| `colors.contentBackground` | `string` | ✅ | `"#ffffff"` | Content Background | 컨텐츠 영역 배경 |
| `colors.borderColor` | `string` | ✅ | `"#dddddd"` | Border Color | 테두리 색상 |

---

## 🔧 어댑터 강제 규칙

### 규칙 1: Responsive 3분기 승격

**입력**: 숫자 또는 undefined
**출력**: `{desktop, tablet, mobile}` 객체

**변환 예시**:
```typescript
// 입력: 180 (숫자)
// 출력: {desktop: 180, tablet: 150, mobile: 120}

// 입력: undefined
// 출력: 기본값 사용
```

**적용 경로**:
- `siteIdentity.logo.width`
- `siteIdentity.siteTitle.typography.fontSize`
- `siteIdentity.siteTitle.typography.lineHeight`
- `siteIdentity.siteTitle.typography.letterSpacing`
- `siteIdentity.tagline.typography.fontSize`
- `siteIdentity.tagline.typography.lineHeight`
- `siteIdentity.tagline.typography.letterSpacing`

---

### 규칙 2: Stateful Color 승격

**입력**: 문자열 또는 undefined
**출력**: `{normal, hover}` 객체

**변환 예시**:
```typescript
// 입력: "#0073aa" (문자열)
// 출력: {normal: "#0073aa", hover: undefined}

// 입력: undefined
// 출력: 기본값 사용
```

**적용 경로**:
- `siteIdentity.siteTitle.color`
- `siteIdentity.tagline.color`
- `colors.linkColor`

---

### 규칙 3: Token 유지

**입력**: 문자열 또는 undefined
**출력**: 문자열 (변환 없음)

**변환 예시**:
```typescript
// 입력: "#4CAF50"
// 출력: "#4CAF50"

// 입력: undefined
// 출력: 기본값 사용
```

**적용 경로**:
- `colors.primaryColor`
- `colors.secondaryColor`
- `colors.textColor`
- `colors.bodyBackground`
- `colors.contentBackground`
- `colors.borderColor`
- `siteIdentity.logo.desktop`
- `siteIdentity.logo.mobile`
- `siteIdentity.favicon`
- `siteIdentity.siteTitle.text`
- `siteIdentity.tagline.text`

---

## ✅ 검증 체크리스트

### 어댑터 출력 검증

- [ ] `siteIdentity.logo.width`가 항상 `{desktop, tablet, mobile}` 형태
- [ ] `siteIdentity.siteTitle.typography.fontSize`가 항상 `{desktop, tablet, mobile}` 형태
- [ ] `siteIdentity.siteTitle.color`가 항상 `{normal, hover?}` 형태
- [ ] `siteIdentity.tagline.color`가 항상 `{normal, hover?}` 형태
- [ ] `colors.linkColor`가 항상 `{normal, hover?}` 형태
- [ ] `colors.primaryColor`가 항상 문자열
- [ ] `colors.textColor`가 항상 문자열

### UI 접근 검증

- [ ] AstraSlider (`responsive=true`)가 `.desktop` 접근 시 TypeError 없음
- [ ] AstraColorPicker (`hasHover=true`)가 `.normal` 접근 시 TypeError 없음
- [ ] 모든 컨트롤이 스토어 값을 직접 접근 가능 (가드 불필요)

### 플로우별 검증

- [ ] 초기 로드: 어댑터 경유 → 타입 보장
- [ ] 프리셋 적용: 어댑터 경유 → 타입 보장
- [ ] 초기화: 어댑터 경유 → 타입 보장
- [ ] 저장: 어댑터 경유 → 타입 보장

---

## 📊 DoD (Definition of Done)

### 스키마 일치

- ✅ 표본 3건 모두 상기 스키마 일치
- ✅ TypeError 0건 (특히 `.desktop`, `.normal` 접근)
- ✅ 프리셋/초기화 10회 반복 → 일관성 유지

### 어댑터 강제

- ✅ 모든 입력 경로가 어댑터 경유
- ✅ 어댑터가 컨트롤 기대 타입으로 자동 변환
- ✅ 숫자 키 0건

---

**다음 작업**: 어댑터에 컨트롤 기준 타입 강제 로직 추가
