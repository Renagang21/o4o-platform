# AI 블록 생성 가이드

이 문서는 AI가 WordPress Gutenberg 블록을 정확하게 생성하기 위한 가이드입니다.

## 🎯 의도별 블록 매핑

### 슬라이드/캐러셀/갤러리
**블록**: `enhanced/gallery`, `core/gallery`
**키워드**: "슬라이드", "캐러셀", "이미지 슬라이더", "갤러리", "사진모음", "이미지 그리드"
**중요**: 여러 이미지가 필요할 때는 core/image를 반복하지 말고 갤러리 블록을 사용!

### 버튼 그룹
**블록**: `core/columns` + 각 컬럼에 `core/button`
**키워드**: "버튼 3개", "CTA 버튼들", "버튼 그룹"
**구조**:
```json
{
  "type": "core/columns",
  "innerBlocks": [
    {
      "type": "core/column",
      "innerBlocks": [{"type": "core/button", "content": {"text": "버튼1"}}]
    }
  ]
}
```

### 소셜 아이콘
**블록**: `enhanced/social-icons`
**키워드**: "소셜 아이콘", "SNS", "페이스북", "인스타그램", "트위터"

### 테이블/표
**블록**: `core/table`, `enhanced/table`
**키워드**: "표", "테이블", "데이터", "목록"

### 인용문
**블록**: `core/quote`, `enhanced/quote`
**키워드**: "인용", "인용문", "명언", "testimonial"

### 커버/히어로
**블록**: `enhanced/cover`, `core/cover`
**키워드**: "히어로", "커버", "배경이미지", "전체화면"

## 📝 기본 블록

### 텍스트 블록
- `core/heading`: 제목 (h1-h6)
- `core/paragraph`: 본문 텍스트
- `core/list`: 목록 (ordered/unordered)
- `core/quote`: 인용문
- `core/preformatted`: 서식 있는 텍스트
- `core/code`: 코드 블록

### 미디어 블록  
- `core/image`: 단일 이미지
- `core/gallery`: 이미지 갤러리
- `core/video`: 비디오
- `enhanced/image`: 고급 이미지 (효과 포함)
- `enhanced/gallery`: 고급 갤러리 (슬라이더 모드)

### 레이아웃 블록
- `core/columns`: 다단 레이아웃
- `core/group`: 그룹핑
- `core/separator`: 구분선
- `core/spacer`: 여백
- `enhanced/cover`: 커버/히어로 섹션

### 디자인 블록
- `core/button`: 버튼
- `enhanced/social-icons`: 소셜 아이콘
- `core/table`: 테이블

### 임베드 블록
- `core/embed/youtube`: YouTube 비디오
- `core/embed/instagram`: 인스타그램
- `core/embed/facebook`: 페이스북

## 🔧 Shortcode 블록

### 기본 사용법
**블록**: `shortcode/custom`
**형식**:
```json
{
  "type": "shortcode/custom",
  "content": {"shortcode": "[shortcode_name param1='value1']"}
}
```

### 주요 Shortcode 카테고리
- **드롭쉬핑**: 제품 관련
- **포럼**: 게시판 관련  
- **사이니지**: 디스플레이 관련
- **이커머스**: 쇼핑 관련

## ⚠️ 중요 규칙

### 1. 이미지 처리
- 이미지 src는 절대 포함하지 않음
- alt 텍스트만 포함
- placeholder URL 사용 금지

### 2. 버튼 처리
- URL은 "#" 사용
- 실제 링크 제공 금지

### 3. 슬라이드 요청 시
```
❌ 잘못된 방법:
여러 개의 core/image 블록 생성

✅ 올바른 방법:
enhanced/gallery 블록 (slider 모드) 또는 core/gallery 블록
```

### 4. 복합 구조
복잡한 레이아웃은 core/columns와 core/group을 조합하여 구성

## 🎨 스타일 가이드

### 색상
기본 색상 클래스 사용 권장

### 폰트 크기
- small, medium, large, x-large 클래스 사용

### 정렬
- left, center, right, justify

## 📋 블록 속성 예시

### heading 블록
```json
{
  "type": "core/heading",
  "content": {"text": "제목"},
  "attributes": {
    "level": 1,
    "textAlign": "center",
    "fontSize": "large"
  }
}
```

### 갤러리 블록 (슬라이더)
```json
{
  "type": "enhanced/gallery", 
  "content": {
    "images": [
      {"alt": "첫 번째 이미지 설명"},
      {"alt": "두 번째 이미지 설명"}
    ]
  },
  "attributes": {
    "displayType": "slider",
    "columns": 1
  }
}
```

### 버튼 블록
```json
{
  "type": "core/button",
  "content": {
    "text": "클릭하세요",
    "url": "#"
  },
  "attributes": {
    "className": "is-style-primary",
    "textAlign": "center"
  }
}
```

## 🔍 키워드 매핑 치트시트

| 사용자 요청 | 추천 블록 | 주의사항 |
|------------|-----------|----------|
| "슬라이드 만들어" | enhanced/gallery | ❌ core/image 반복 금지 |
| "버튼 3개" | core/columns + core/button | 각 컬럼에 버튼 하나씩 |
| "소셜 아이콘" | enhanced/social-icons | 개별 이미지 대신 전용 블록 |
| "표 만들어" | core/table | 단순 텍스트 나열 금지 |
| "인용문" | core/quote | 일반 paragraph 대신 |
| "히어로 섹션" | enhanced/cover | 배경이미지 + 텍스트 오버레이 |

---

**마지막 업데이트**: 2025-01-01
**버전**: 1.0