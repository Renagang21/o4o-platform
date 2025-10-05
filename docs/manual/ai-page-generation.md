# AI 페이지 자동 생성 기능 매뉴얼

## 목차
1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [사용 방법](#사용-방법)
4. [지원하는 AI 모델](#지원하는-ai-모델)
5. [템플릿 종류](#템플릿-종류)
6. [사용 가능한 블록](#사용-가능한-블록)
7. [사용 가능한 숏코드](#사용-가능한-숏코드)
8. [문제 해결](#문제-해결)

---

## 개요

AI 페이지 자동 생성 기능은 최신 AI 모델(GPT-5, Gemini 2.5, Claude 4.5 등)을 활용하여 간단한 프롬프트만으로 전문적인 웹 페이지를 자동으로 생성하는 기능입니다.

### 주요 기능
- ✨ 자연어 프롬프트로 페이지 생성
- 🎨 다양한 템플릿 지원 (랜딩, 소개, 상품, 블로그)
- 🤖 최신 AI 모델 지원 (2025년 기준)
- 📦 Gutenberg 블록 및 숏코드 자동 생성
- 🔄 실시간 진행 상황 표시

---

## 사전 준비

### 1. AI API 키 설정

페이지 생성 기능을 사용하려면 먼저 AI API 키를 설정해야 합니다.

**설정 위치:** `설정 → AI 설정` 또는 `Settings → AI Settings`

#### OpenAI API 키 설정
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. API Keys 메뉴에서 새 API 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력

#### Google Gemini API 키 설정
1. [Google AI Studio](https://makersuite.google.com/)에 접속
2. API 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력

#### Anthropic Claude API 키 설정
1. [Anthropic Console](https://console.anthropic.com/)에 로그인
2. API Keys 섹션에서 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력

### 2. 권한 확인

AI 페이지 생성 기능은 다음 권한이 필요합니다:
- 페이지 편집 권한 (`content:write`)
- 또는 관리자 권한 (`system:admin`)

---

## 사용 방법

### 1. 편집기에서 AI 페이지 생성 시작

#### 방법 1: 상단 도구 모음에서
1. 페이지 또는 포스트 편집 화면 진입
2. 상단 도구 모음에서 **"AI 페이지 생성"** 버튼 클릭
3. AI 페이지 생성 모달 열림

#### 방법 2: 새 페이지 생성 시
1. `페이지 → 새 페이지 추가` 메뉴 선택
2. 편집기 상단에서 **"AI 페이지 생성"** 버튼 클릭

### 2. AI 모델 및 템플릿 선택

#### AI 제공자 선택
- **OpenAI**: GPT-5, GPT-4.1, GPT-4o 등
- **Google Gemini**: Gemini 2.5 Flash/Pro, Gemini 2.0
- **Anthropic Claude**: Claude Sonnet 4.5, Claude Opus 4

#### 모델 선택 가이드
| 용도 | 권장 모델 | 특징 |
|------|----------|------|
| 일반 페이지 | Gemini 2.5 Flash | 빠르고 경제적 |
| 복잡한 콘텐츠 | GPT-5 | 최신 추론 모델 |
| 창의적 콘텐츠 | Claude Sonnet 4.5 | 자연스러운 문장 |
| 고품질 콘텐츠 | Gemini 2.5 Pro | 강력한 성능 |

#### 템플릿 선택
- **Landing**: 랜딩 페이지 (제품/서비스 소개)
- **About**: 회사/개인 소개 페이지
- **Product**: 상품 상세 페이지
- **Blog**: 블로그 포스트

### 3. 프롬프트 작성

효과적인 프롬프트 작성 팁:

#### ✅ 좋은 예시
```
스마트 홈 IoT 제품을 판매하는 회사의 랜딩 페이지를 만들어주세요.
주요 내용:
- 헤더: 회사 로고와 메뉴 (Home, Products, About, Contact)
- 히어로 섹션: "스마트 홈, 더 편리하게" 슬로건과 CTA 버튼
- 제품 소개: 3가지 주요 제품 (스마트 조명, 온도 조절기, 보안 카메라)
- 특징: 간편한 설치, AI 자동화, 모바일 제어
- 고객 후기 섹션
- 문의 폼
```

#### ❌ 나쁜 예시
```
홈페이지 만들어줘
```

### 4. 생성 진행 및 완료

1. **생성 시작**: "페이지 생성" 버튼 클릭
2. **진행 상황**:
   - 10%: AI 모델 연결 중
   - 30%: AI 응답 생성 중
   - 80%: 응답 처리 중
   - 100%: 페이지 생성 완료
3. **결과 확인**: 생성된 블록들이 편집기에 자동 삽입
4. **수정 및 저장**: 필요한 부분 수정 후 저장

---

## 지원하는 AI 모델

### OpenAI (2025)
| 모델 | 이름 | 특징 |
|------|------|------|
| `gpt-5` | GPT-5 | 최신 추론 모델 |
| `gpt-5-mini` | GPT-5 Mini | 빠르고 경제적 |
| `gpt-5-nano` | GPT-5 Nano | 초고속 |
| `gpt-4.1` | GPT-4.1 | 복잡한 작업용 |
| `gpt-4o` | GPT-4o | 멀티모달 |

### Google Gemini (2025)
| 모델 | 이름 | 특징 |
|------|------|------|
| `gemini-2.5-flash` | Gemini 2.5 Flash | **권장** - 빠르고 강력 |
| `gemini-2.5-pro` | Gemini 2.5 Pro | 최강력 |
| `gemini-2.0-flash` | Gemini 2.0 Flash | 멀티모달 |

### Anthropic Claude (2025)
| 모델 | 이름 | 특징 |
|------|------|------|
| `claude-sonnet-4.5` | Claude Sonnet 4.5 | 최신 모델 |
| `claude-opus-4` | Claude Opus 4 | 최강력 |
| `claude-sonnet-4` | Claude Sonnet 4 | 안정적 |

---

## 템플릿 종류

### 1. Landing (랜딩 페이지)
**용도**: 제품/서비스 소개, 전환율 최적화

**포함 요소**:
- 히어로 섹션 (Hero Section)
- 주요 기능/특징
- 고객 후기 (Testimonials)
- 가격 플랜
- CTA (Call-to-Action) 버튼
- FAQ

**예시 프롬프트**:
```
AI 기반 마케팅 자동화 SaaS 제품의 랜딩 페이지를 만들어주세요.
- 타겟: 중소기업 마케팅 담당자
- 주요 기능: 이메일 자동화, SNS 예약 발행, 성과 분석
- 3가지 가격 플랜 (Basic, Pro, Enterprise)
```

### 2. About (소개 페이지)
**용도**: 회사/개인/팀 소개

**포함 요소**:
- 회사 소개
- 비전 및 미션
- 팀 소개
- 연혁 (Timeline)
- 문화 및 가치

**예시 프롬프트**:
```
친환경 패션 브랜드의 About 페이지를 만들어주세요.
- 창립: 2020년, 서울
- 미션: 지속 가능한 패션 생태계 구축
- 핵심 가치: 환경 보호, 공정 무역, 윤리적 생산
- 팀: 3명의 공동 창업자 소개
```

### 3. Product (상품 페이지)
**용도**: 단일 상품 상세 설명

**포함 요소**:
- 상품 이미지 갤러리
- 상품명 및 가격
- 상세 설명
- 스펙 및 옵션
- 리뷰
- 관련 상품

**예시 프롬프트**:
```
프리미엄 무선 이어폰 상품 페이지를 만들어주세요.
- 상품명: AirPods Pro Max
- 가격: 549,000원
- 주요 기능: ANC, 공간 음향, 20시간 배터리
- 컬러: 실버, 스페이스 그레이, 골드
```

### 4. Blog (블로그 포스트)
**용도**: 정보성 콘텐츠, 튜토리얼, 뉴스

**포함 요소**:
- 제목 및 서론
- 목차
- 본문 (소제목별 구조화)
- 이미지 및 코드 블록
- 결론
- 관련 글 링크

**예시 프롬프트**:
```
"React 19 새로운 기능 완벽 가이드" 블로그 포스트를 작성해주세요.
- 주요 내용: React Compiler, Server Components, Actions
- 난이도: 중급 개발자
- 코드 예시 포함
- 1500-2000자 분량
```

---

## 사용 가능한 블록

AI가 생성할 수 있는 Gutenberg 블록 목록입니다.

### 텍스트 블록

#### core/paragraph (단락)
일반 텍스트 단락
```json
{
  "type": "core/paragraph",
  "content": {
    "text": "여기에 텍스트 내용이 들어갑니다."
  }
}
```

#### core/heading (제목)
H1~H6 제목 (level: 1-6)
```json
{
  "type": "core/heading",
  "content": {
    "text": "페이지 제목"
  },
  "attributes": {
    "level": 1
  }
}
```

#### core/list (리스트)
순서 있는/없는 리스트
```json
{
  "type": "core/list",
  "content": {
    "items": ["항목 1", "항목 2", "항목 3"]
  },
  "attributes": {
    "ordered": false
  }
}
```

#### core/quote (인용구)
```json
{
  "type": "core/quote",
  "content": {
    "text": "훌륭한 제품은 디테일에서 나온다.",
    "citation": "스티브 잡스"
  }
}
```

#### core/code (코드 블록)
```json
{
  "type": "core/code",
  "content": {
    "code": "const hello = 'world';",
    "language": "javascript"
  }
}
```

### 미디어 블록

#### core/image (이미지)
**중요**: AI 생성 시 `src`는 비워두고 `alt`만 포함
```json
{
  "type": "core/image",
  "content": {
    "alt": "스마트폰을 사용하는 사람"
  }
}
```

#### core/video (비디오)
```json
{
  "type": "core/video",
  "content": {
    "caption": "제품 소개 영상"
  }
}
```

#### core/gallery (갤러리)
```json
{
  "type": "core/gallery",
  "content": {
    "images": []
  }
}
```

### 디자인 블록

#### core/button (버튼)
```json
{
  "type": "core/button",
  "content": {
    "text": "지금 시작하기",
    "url": "#"
  },
  "attributes": {
    "variant": "primary"
  }
}
```

**variant 옵션**: `primary`, `secondary`, `outline`

#### core/columns (다단 레이아웃)
```json
{
  "type": "core/columns",
  "content": {
    "columns": [
      {
        "blocks": [
          {
            "type": "core/heading",
            "content": {"text": "왼쪽 칼럼"}
          }
        ]
      },
      {
        "blocks": [
          {
            "type": "core/heading",
            "content": {"text": "오른쪽 칼럼"}
          }
        ]
      }
    ]
  }
}
```

#### core/separator (구분선)
```json
{
  "type": "core/separator"
}
```

---

## 사용 가능한 숏코드

숏코드는 특수 기능을 간단하게 삽입할 수 있는 코드입니다.

### E-commerce 숏코드

#### [product]
단일 상품 표시
```
[product id="123"]
```

**속성**:
- `id`: 상품 ID (필수)

#### [product_grid]
상품 그리드 레이아웃
```
[product_grid category="전자제품" limit="8" columns="4"]
```

**속성**:
- `category`: 카테고리 이름
- `limit`: 표시할 상품 수 (기본: 8)
- `columns`: 열 개수 (기본: 4)

#### [add_to_cart]
장바구니 추가 버튼
```
[add_to_cart id="123" text="장바구니 담기"]
```

**속성**:
- `id`: 상품 ID (필수)
- `text`: 버튼 텍스트 (기본: "장바구니 담기")

#### [featured_products]
추천 상품 표시
```
[featured_products limit="4" columns="4"]
```

**속성**:
- `limit`: 상품 수 (기본: 4)
- `columns`: 열 개수 (기본: 4)

### Forms 숏코드

#### [form]
폼 삽입
```
[form id="contact-form"]
```

**속성**:
- `id`: 폼 ID (필수)

#### [view]
데이터 뷰 삽입
```
[view id="submissions"]
```

**속성**:
- `id`: 뷰 ID (필수)

### Media 숏코드

#### [video]
비디오 임베드 (YouTube, Vimeo 등)
```
[video url="https://youtube.com/watch?v=..." width="800" height="450"]
```

**속성**:
- `url`: 비디오 URL (필수)
- `width`: 너비 (기본: 640)
- `height`: 높이 (기본: 360)

#### [gallery]
이미지 갤러리
```
[gallery ids="1,2,3,4" columns="3" size="medium"]
```

**속성**:
- `ids`: 이미지 ID 목록 (쉼표로 구분)
- `columns`: 열 개수 (기본: 3)
- `size`: 이미지 크기 (`thumbnail`, `medium`, `large`, `full`)

---

## 문제 해결

### 1. API 키 오류

**문제**: "API 키가 유효하지 않습니다" 오류 발생

**해결 방법**:
1. AI 설정 페이지에서 API 키 재확인
2. API 키에 공백이나 특수문자가 없는지 확인
3. AI 제공자 플랫폼에서 키가 활성화되어 있는지 확인
4. 사용량 한도를 초과하지 않았는지 확인

### 2. 생성 실패

**문제**: "AI 페이지 생성 중 오류가 발생했습니다" 메시지

**해결 방법**:
1. 프롬프트가 너무 길거나 복잡하지 않은지 확인 (2000자 이하 권장)
2. 인터넷 연결 확인
3. 다른 AI 모델로 시도
4. 브라우저 콘솔에서 자세한 오류 메시지 확인

### 3. 생성된 콘텐츠가 기대와 다름

**문제**: AI가 생성한 내용이 원하는 것과 다름

**해결 방법**:
1. **더 구체적인 프롬프트 작성**
   - ❌ "회사 소개 페이지 만들어줘"
   - ✅ "친환경 화장품 브랜드의 소개 페이지. 비건 인증, 동물실험 반대, 재활용 용기 사용 강조"

2. **예시 제공**
   ```
   다음과 같은 구조로 페이지를 만들어주세요:
   1. 히어로 섹션 (제목 + 부제 + CTA 버튼)
   2. 3가지 주요 특징 (아이콘 + 제목 + 설명)
   3. 고객 후기 (3개)
   4. 문의 폼
   ```

3. **템플릿 변경**
   - 목적에 맞는 템플릿 선택 (Landing, About, Product, Blog)

4. **모델 변경**
   - 창의적 콘텐츠: Claude Sonnet 4.5
   - 구조화된 콘텐츠: GPT-5
   - 빠른 생성: Gemini 2.5 Flash

### 4. 이미지가 표시되지 않음

**문제**: 생성된 페이지의 이미지 블록이 비어있음

**설명**: 이것은 정상입니다! AI는 이미지 URL을 생성하지 않고 `alt` 텍스트만 제공합니다.

**해결 방법**:
1. 각 이미지 블록을 클릭
2. "Select image" 버튼 클릭
3. 미디어 라이브러리에서 적절한 이미지 선택

### 5. 생성 진행률이 멈춤

**문제**: 진행률이 30%에서 멈춰있음

**해결 방법**:
1. 최소 1~2분 대기 (AI 응답 생성 시간)
2. 여전히 진행되지 않으면 "취소" 후 재시도
3. 더 짧은 프롬프트로 시도
4. 더 빠른 모델 선택 (GPT-5 Mini, Gemini 2.5 Flash)

### 6. 권한 오류

**문제**: "페이지를 생성할 권한이 없습니다" 메시지

**해결 방법**:
1. 관리자에게 `content:write` 권한 요청
2. 또는 `system:admin` 역할 부여 요청

---

## 추가 리소스

### 관련 문서
- [편집기 사용 가이드](./editor-guide.md)
- [외모 사용자 정의](./appearance-customize.md)
- [숏코드 레퍼런스](../architecture/SHORTCODE_REFERENCE.md)

### 지원
- 기술 지원: [GitHub Issues](https://github.com/your-org/o4o-platform/issues)
- 문의: support@your-domain.com

---

**마지막 업데이트**: 2025-10-05
**버전**: 1.0.0
**적용 대상**: O4O Platform Admin Dashboard v3.0+
