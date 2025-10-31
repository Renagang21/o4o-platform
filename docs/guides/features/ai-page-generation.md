# AI 페이지 생성 - 완벽 가이드

> **O4O Platform의 AI 기반 페이지 자동 생성 시스템**
> 프롬프트 한 줄로 전문가급 페이지를 생성합니다.

---

## 목차

- [Part 1: 사용자 가이드](#part-1-사용자-가이드)
  - [시작하기](#시작하기)
  - [템플릿 선택](#템플릿-선택)
  - [효과적인 프롬프트 작성법](#효과적인-프롬프트-작성법)
  - [AI 모델 선택](#ai-모델-선택)
  - [예제 모음](#예제-모음)
  - [문제 해결](#문제-해결)
- [Part 2: 기술 레퍼런스](#part-2-기술-레퍼런스)
  - [시스템 아키텍처](#시스템-아키텍처)
  - [작동 원리](#작동-원리)
  - [API 엔드포인트](#api-엔드포인트)
  - [블록 및 숏코드 레지스트리](#블록-및-숏코드-레지스트리)
- [Part 3: 개발자 문서](#part-3-개발자-문서)
  - [새 블록 추가하기](#새-블록-추가하기)
  - [새 템플릿 추가하기](#새-템플릿-추가하기)
  - [AI 커스터마이징](#ai-커스터마이징)
  - [테스트 및 디버깅](#테스트-및-디버깅)
- [부록](#부록)
  - [지원되는 블록 전체 목록](#지원되는-블록-전체-목록)
  - [지원되는 숏코드 전체 목록](#지원되는-숏코드-전체-목록)
  - [프롬프트 예제 라이브러리](#프롬프트-예제-라이브러리)

---

# Part 1: 사용자 가이드

## 시작하기

### AI 페이지 생성이란?

O4O Platform의 AI 페이지 생성은 최신 AI 모델(Google Gemini 2.5, OpenAI GPT-5, Anthropic Claude 4.5)을 활용하여 자연어 프롬프트로부터 완성도 높은 페이지를 자동 생성하는 기능입니다.

### 필요한 것

1. **Google Gemini API 키** (권장)
   - [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 발급
   - 또는 설정 → AI Services에서 사전 등록

2. **페이지 편집 권한**
   - 관리자 또는 편집자 역할 필요

### 첫 페이지 생성하기

1. **페이지 편집기 열기**
   - 관리자 대시보드 → 페이지 → 새 페이지 추가
   - 또는 기존 페이지 편집

2. **AI 생성 버튼 클릭**
   - 편집기 상단의 "✨ AI 페이지 생성" 버튼 클릭
   - 또는 편집 모드에서 "AI로 편집" 버튼 클릭

3. **프롬프트 입력**
   ```
   혁신적인 AI 기반 웹사이트 빌더를 소개하는 랜딩 페이지를 만들어주세요.
   ```

4. **설정 확인**
   - **템플릿**: 랜딩 페이지 (자동 선택됨)
   - **AI 모델**: Gemini 2.5 Flash (권장)
   - **API 키**: 사전 저장된 키 자동 입력 또는 수동 입력

5. **생성 시작**
   - "페이지 생성" 버튼 클릭
   - 20-60초 대기 (모델과 프롬프트 복잡도에 따라 다름)

6. **결과 확인 및 수정**
   - 생성된 블록들이 편집기에 자동 삽입
   - 필요시 수동으로 수정 가능
   - "저장" 또는 "미리보기"로 확인

---

## 템플릿 선택

AI는 4가지 템플릿을 지원합니다. 각 템플릿은 특정 페이지 유형에 최적화된 구조를 제공합니다.

### 1. 랜딩 페이지 (Landing Page)

**용도**: 제품/서비스 소개, 마케팅 캠페인

**구성 요소**:
- 매력적인 헤드라인 (H1)
- 부제목 설명 (H2)
- 주요 기능/장점 3개 (단락)
- CTA(Call-to-Action) 버튼
- 이미지 플레이스홀더 (alt 텍스트만)

**예제 프롬프트**:
```
차세대 AI 콘텐츠 생성 도구를 소개하는 랜딩 페이지를 만들어주세요.
주요 기능: 자동 글쓰기, 다국어 지원, SEO 최적화
```

### 2. 회사 소개 (About)

**용도**: 회사/팀 소개, 비전/미션 전달

**구성 요소**:
- 회사 소개 헤드라인
- 회사 비전/미션
- 핵심 가치 3-4개 (리스트)
- 팀 소개 섹션
- 연락처 정보

**예제 프롬프트**:
```
창의적이고 혁신적인 기술 스타트업 회사 소개 페이지를 만들어주세요.
회사명: TechNova, 비전: AI로 세상을 바꾼다
```

### 3. 제품 소개 (Product)

**용도**: 제품 상세 설명, 기능 소개

**구성 요소**:
- 제품명과 한 줄 설명
- 주요 기능 소개 (리스트)
- 제품 장점 3-5개
- 사용법/활용 사례
- 가격 정보
- CTA 버튼

**예제 프롬프트**:
```
스마트워치 제품 페이지를 만들어주세요.
제품명: FitPro X1
주요 기능: 심박수 측정, GPS, 50m 방수, 7일 배터리
가격: 299,000원
```

### 4. 블로그 포스트 (Blog)

**용도**: 블로그 글, 뉴스, 튜토리얼

**구성 요소**:
- 매력적인 제목 (H1)
- 서론 (문제 제기)
- 본문 3-4개 섹션 (H2 + 단락)
- 인용구나 코드 블록
- 실용적인 팁 (리스트)
- 결론 및 요약

**예제 프롬프트**:
```
2025년 AI와 웹 개발의 미래 트렌드에 대한 블로그 포스트를 작성해주세요.
주요 주제: LLM 통합, No-Code AI, 자동화
```

---

## 효과적인 프롬프트 작성법

### ✅ 좋은 프롬프트의 특징

1. **구체적이고 명확한 요구사항**
   ```
   ❌ "회사 소개 페이지 만들어줘"
   ✅ "친환경 화장품 회사 소개 페이지를 만들어주세요.
       회사명: GreenBeauty
       핵심 가치: 동물실험 반대, 비건, 재활용 패키징"
   ```

2. **주요 정보 포함**
   ```
   ✅ "온라인 교육 플랫폼 랜딩 페이지를 만들어주세요.
       대상: 직장인 재교육
       주요 기능: 1:1 멘토링, 실습 프로젝트, 수료증 발급
       특별 할인: 첫 달 50% 할인"
   ```

3. **톤앤매너 지정**
   ```
   ✅ "고급스럽고 전문적인 톤으로 부동산 컨설팅 서비스 소개 페이지를 만들어주세요"
   ```

### ❌ 피해야 할 프롬프트

1. **너무 짧고 모호함**
   ```
   ❌ "페이지 만들어줘"
   ❌ "뭔가 멋진 거"
   ```

2. **이미지 URL 요청**
   ```
   ❌ "제품 사진을 https://example.com/image.jpg 에서 가져와서 넣어줘"
   (AI는 이미지 URL을 생성하지 않습니다 - alt 텍스트만 생성)
   ```

3. **숏코드/태그 직접 요청**
   ```
   ❌ "[social_login] 숏코드를 넣어줘"
   (AI는 숏코드를 자동 생성하지 않습니다 - 수동 추가 필요)
   ```

### 💡 프롬프트 템플릿

#### 랜딩 페이지 템플릿
```
[제품/서비스명]을(를) 소개하는 랜딩 페이지를 만들어주세요.

- 대상 고객: [타겟 고객층]
- 주요 기능:
  1. [기능 1]
  2. [기능 2]
  3. [기능 3]
- 특별 혜택: [할인/프로모션]
- 톤앤매너: [전문적/친근함/고급스러움]
```

#### 블로그 포스트 템플릿
```
[주제]에 대한 블로그 포스트를 작성해주세요.

- 타겟 독자: [초보자/전문가/일반인]
- 포함할 내용:
  1. [핵심 주제 1]
  2. [핵심 주제 2]
  3. [핵심 주제 3]
- 스타일: [설명형/튜토리얼/의견]
```

---

## AI 모델 선택

O4O Platform은 3개 AI 제공사의 최신 모델을 지원합니다.

### Google Gemini (권장) ⭐

| 모델 | 속도 | 품질 | 비용 | 추천 용도 |
|------|------|------|------|----------|
| **Gemini 2.5 Flash** ⭐ | 매우 빠름 | 우수 | 매우 저렴 | 일반 페이지, 빠른 프로토타입 |
| **Gemini 2.5 Pro** | 느림 | 최고 | 비싸지만 합리적 | 복잡한 페이지, 정교한 구조 |
| **Gemini 2.0 Flash** | 빠름 | 좋음 | 저렴 | 멀티모달 콘텐츠 |

**특징**:
- ✅ 가장 빠른 응답 속도 (Flash 모델)
- ✅ JSON 구조 출력 안정성 최고
- ✅ 무료 티어 제공 (월 15 RPM)
- ✅ Pro 모델 타임아웃 시 자동 Flash 폴백

**권장 설정**:
```
모델: Gemini 2.5 Flash
온도: 0.7 (기본값)
최대 토큰: 16384
```

### OpenAI GPT (대안)

| 모델 | 속도 | 품질 | 비용 | 추천 용도 |
|------|------|------|------|----------|
| **GPT-5** | 보통 | 최고 | 비쌈 | 최고 품질 필요 시 |
| **GPT-5 Mini** | 빠름 | 우수 | 보통 | 일반 페이지 |
| **GPT-4.1** | 느림 | 최고 | 매우 비쌈 | 복잡한 작업 |

**특징**:
- ✅ 최고 수준의 언어 이해
- ⚠️ 비용이 Gemini보다 3-5배 높음
- ⚠️ JSON 출력이 가끔 불안정 (마크다운으로 감싸는 경우 있음)

### Anthropic Claude (대안)

| 모델 | 속도 | 품질 | 비용 | 추천 용도 |
|------|------|------|------|----------|
| **Claude Sonnet 4.5** | 빠름 | 최고 | 보통 | 균형 잡힌 선택 |
| **Claude Opus 4** | 느림 | 최고 | 매우 비쌈 | 최고 품질 |

**특징**:
- ✅ 긴 컨텍스트 처리 우수
- ✅ 안전하고 정확한 출력
- ⚠️ 무료 티어 없음

### 모델 선택 가이드

```
┌─────────────────────────────────────┐
│ 빠른 프로토타입, 일반 페이지        │
│ → Gemini 2.5 Flash ⭐              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 복잡한 구조, 정교한 레이아웃        │
│ → Gemini 2.5 Pro 또는 GPT-5        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 최고 품질, 비용 무관                │
│ → Claude Opus 4 또는 GPT-5         │
└─────────────────────────────────────┘
```

---

## 예제 모음

### 예제 1: 랜딩 페이지 - SaaS 제품

**프롬프트**:
```
혁신적인 AI 기반 프로젝트 관리 도구를 소개하는 랜딩 페이지를 만들어주세요.

제품명: TaskFlow AI
주요 기능:
- AI 자동 업무 배분
- 실시간 진행률 추적
- 팀 협업 도구 통합 (Slack, Gmail, Notion)
- 스마트 데드라인 추천

특별 혜택: 첫 달 무료 체험
대상 고객: 스타트업, 중소기업 팀장
톤앤매너: 전문적이지만 친근하게
```

**생성 결과** (예상):
```
- H1: "TaskFlow AI로 프로젝트 관리를 혁신하세요"
- H2: "AI가 자동으로 업무를 배분하고 팀 생산성을 200% 향상시킵니다"
- 단락 1: AI 자동 업무 배분 소개
- 단락 2: 실시간 진행률 추적 기능
- 단락 3: 통합 협업 도구
- CTA 버튼: "무료로 시작하기"
```

### 예제 2: 블로그 포스트 - 튜토리얼

**프롬프트**:
```
React 초보자를 위한 "첫 번째 React 앱 만들기" 튜토리얼을 작성해주세요.

포함할 내용:
1. React란 무엇인가?
2. 개발 환경 설정 (Node.js, npm)
3. create-react-app으로 프로젝트 생성
4. 간단한 "Hello World" 컴포넌트 만들기
5. 실행 및 확인

스타일: 친절하고 단계별로 설명
대상: 프로그래밍 경험은 있지만 React는 처음인 개발자
```

**생성 결과** (예상):
```
- H1: "React 초보자 가이드: 첫 번째 앱 만들기"
- H2: "React란 무엇인가?"
  - 단락: React 소개
- H2: "개발 환경 설정"
  - 리스트: Node.js 설치 단계
- H2: "프로젝트 생성하기"
  - 코드 블록: npx create-react-app 명령어
- H2: "Hello World 컴포넌트"
  - 코드 블록: 컴포넌트 코드
- H2: "실행 및 확인"
  - 단락: npm start 설명
```

### 예제 3: 제품 페이지 - 전자제품

**프롬프트**:
```
프리미엄 무선 이어폰 제품 페이지를 만들어주세요.

제품명: SoundPro Elite
주요 사양:
- ANC (능동 소음 차단)
- 30시간 재생 시간
- IPX7 방수
- USB-C 고속 충전 (10분 충전 = 3시간 재생)
- 블루투스 5.3
- 6가지 색상

가격: 198,000원
특별 혜택: 론칭 기념 20% 할인
톤앤매너: 고급스럽고 프리미엄
```

**생성 결과** (예상):
```
- H1: "SoundPro Elite - 프리미엄 무선 이어폰의 새로운 기준"
- H2: "완벽한 침묵, 완벽한 사운드"
- 리스트: 주요 기능
  - ANC 능동 소음 차단
  - 30시간 장시간 재생
  - IPX7 완벽 방수
  - 고속 충전 (10분 = 3시간)
- 단락: 블루투스 5.3 안정성
- 단락: 6가지 색상 선택
- CTA 버튼: "지금 20% 할인가로 구매하기"
- 단락: 가격 정보 (정가 198,000원 → 158,400원)
```

---

## 문제 해결

### 일반적인 오류

#### 1. "API 키가 유효하지 않습니다"

**원인**: 잘못된 API 키 또는 만료된 키

**해결 방법**:
1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 새 API 키 발급
2. 설정 → AI Services → Gemini 앱 설치 후 API 키 저장
3. 모달에서 API 키 재입력

#### 2. "요청 시간이 초과되었습니다" (Timeout)

**원인**: 프롬프트가 너무 복잡하거나 Pro 모델이 응답 지연

**해결 방법**:
1. **자동 폴백 활용** (Gemini Pro → Flash 자동 전환)
2. 프롬프트 단순화
   ```
   ❌ "10개 섹션, 각 섹션마다 3개 이미지, 5개 버튼..."
   ✅ "3-4개 주요 섹션으로 구성된 랜딩 페이지"
   ```
3. Flash 모델 사용 (Pro 대신)

#### 3. "생성된 블록이 없습니다"

**원인**: AI가 JSON 형식을 잘못 출력하거나 빈 응답 반환

**해결 방법**:
1. 프롬프트 재작성 (더 구체적으로)
2. 다른 모델 시도 (Gemini Flash ↔ Pro)
3. 브라우저 콘솔에서 에러 로그 확인 (F12 → Console)

#### 4. "프롬프트가 너무 깁니다" (5000자 제한)

**원인**: 편집 모드에서 기존 콘텐츠가 너무 많음

**해결 방법**:
1. 페이지를 2개로 분할
2. 일부 콘텐츠 삭제 후 AI 편집 실행
3. 신규 모드로 새 페이지 생성 후 복사

#### 5. "요청 한도를 초과했습니다" (Rate Limit)

**원인**: API 무료 티어 한도 초과 (Gemini: 15 RPM)

**해결 방법**:
1. 1분 후 재시도
2. 유료 API 키로 업그레이드
3. 다른 제공사 모델 사용 (GPT, Claude)

### 결과가 기대와 다를 때

#### 문제: 생성된 내용이 너무 짧거나 부실함

**해결 방법**:
```
프롬프트에 "상세하게", "구체적으로", "최소 5개 섹션" 등 명시

예:
"랜딩 페이지를 만들어주세요. 최소 6개 섹션으로 구성하고,
각 섹션마다 구체적인 설명을 포함해주세요."
```

#### 문제: 톤앤매너가 맞지 않음

**해결 방법**:
```
프롬프트에 톤앤매너 명확히 지정

예:
"고급스럽고 전문적인 톤으로" (X)
"20대 여성을 대상으로 친근하고 캐주얼한 톤으로" (O)
```

#### 문제: 불필요한 블록이 포함됨

**해결 방법**:
1. 생성 후 수동 삭제 (편집기에서 블록 제거)
2. 프롬프트에 제외 사항 명시
   ```
   "이미지나 갤러리는 포함하지 마세요. 텍스트와 버튼만 사용해주세요."
   ```

### 성능 최적화 팁

1. **Flash 모델 우선 사용** (20-40초 응답)
2. **프롬프트 간결하게 유지** (200-500자 권장)
3. **템플릿 선택 정확히** (랜딩/블로그/제품/회사 중 선택)
4. **API 키 사전 저장** (설정 → AI Services)

---

# Part 2: 기술 레퍼런스

## 시스템 아키텍처

### 전체 구조

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │            SimpleAIModal.tsx (UI)                  │  │
│  │  - 프롬프트 입력                                   │  │
│  │  - 템플릿 선택 (Landing/About/Product/Blog)       │  │
│  │  - 모델 선택 (Gemini/GPT/Claude)                  │  │
│  │  - 진행률 표시                                     │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│                   ▼                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │       SimpleAIGenerator.ts (Service)               │  │
│  │  - 레퍼런스 데이터 로드 (블록/숏코드 목록)         │  │
│  │  - 시스템 프롬프트 구성 (템플릿별)                │  │
│  │  - AI 프록시 API 호출                              │  │
│  │  - 응답 검증 및 블록 배열 변환                     │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
                    ▼ POST /api/ai/generate
┌──────────────────────────────────────────────────────────┐
│                Backend (Node.js + TypeScript)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │        ai-proxy.service.ts (Proxy)                 │  │
│  │  - 요청 검증 (모델 화이트리스트, 파라미터 제한)   │  │
│  │  - API 키 주입 (DB 또는 환경변수)                 │  │
│  │  - LLM 호출 (OpenAI/Gemini/Claude)                │  │
│  │  - 재시도 로직 (429/503 에러)                     │  │
│  │  - 타임아웃 처리 (120초)                          │  │
│  │  - 사용량 로그 저장 (AIUsageLog)                  │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
                    ▼ HTTPS Request
┌──────────────────────────────────────────────────────────┐
│              External LLM APIs                            │
│  - OpenAI: https://api.openai.com/v1/chat/completions   │
│  - Gemini: https://generativelanguage.googleapis.com    │
│  - Claude: https://api.anthropic.com/v1/messages        │
└──────────────────────────────────────────────────────────┘
```

### 데이터 흐름 (7단계)

1. **사용자 입력** (Frontend)
   - 프롬프트, 템플릿, 모델 선택
   - SimpleAIModal → SimpleAIGenerator 호출

2. **레퍼런스 로드** (Frontend)
   - referenceFetcher.fetchCompleteReference()
   - 서버에서 블록/숏코드 메타데이터 가져오기
   - 캐싱 (ETag)으로 중복 요청 방지

3. **프롬프트 구성** (Frontend)
   - 시스템 프롬프트: 템플릿 규칙 + 블록 목록
   - 사용자 프롬프트: 입력 내용 + JSON 예제

4. **프록시 호출** (Frontend → Backend)
   - POST /api/ai/generate
   - Body: { provider, model, systemPrompt, userPrompt, temperature, maxTokens }

5. **LLM 호출** (Backend → External API)
   - API 키 주입 (DB 또는 환경변수)
   - 재시도 로직 (exponential backoff)
   - 타임아웃 120초

6. **응답 처리** (Backend → Frontend)
   - JSON 파싱 및 검증
   - 블록 배열 추출 ({ blocks: [...] })
   - 사용량 로그 저장

7. **편집기 삽입** (Frontend)
   - 블록 배열을 GutenbergBlockEditor에 전달
   - 사용자가 수동 편집 가능

---

## 작동 원리

### 레퍼런스 시스템 (Server-First Strategy)

AI가 정확한 블록/숏코드를 생성하려면 **실시간 메타데이터**가 필요합니다. O4O는 서버 우선 전략을 사용합니다.

#### 1. 서버 레지스트리 (SSOT: Single Source of Truth)

**블록 레지스트리**:
```typescript
// apps/api-server/src/services/block-registry.service.ts
export const BLOCK_DEFINITIONS: BlockMetadata[] = [
  {
    name: 'o4o/heading',
    title: 'Heading',
    category: 'text',
    attributes: {
      content: { type: 'string', default: '' },
      level: { type: 'number', default: 2, min: 1, max: 6 }
    },
    example: {
      type: 'o4o/heading',
      content: {},
      attributes: { content: '제목', level: 2 }
    }
  },
  // ... 26개 블록 정의
];
```

**숏코드 레지스트리**:
```typescript
// apps/api-server/src/services/shortcode-registry.service.ts
export const SHORTCODE_DEFINITIONS: ShortcodeMetadata[] = [
  {
    name: 'cpt_list',
    description: 'Display CPT posts in grid/list layout',
    category: 'dynamic',
    attributes: {
      type: { type: 'string', required: true, description: 'CPT slug' },
      count: { type: 'number', default: 10 },
      template: { type: 'string', enum: ['default', 'grid', 'list'], default: 'default' }
    },
    example: '[cpt_list type="product" count="6" template="grid"]'
  },
  // ... 10개 숏코드 정의
];
```

#### 2. API 엔드포인트

**GET /api/ai/blocks/reference**:
```json
{
  "blocks": [
    {
      "name": "o4o/heading",
      "title": "Heading",
      "category": "text",
      "attributes": { "content": "string", "level": "number (1-6)" },
      "example": "..."
    }
  ],
  "count": 26
}
```

**GET /api/ai/shortcodes/reference**:
```json
{
  "shortcodes": [
    {
      "name": "cpt_list",
      "description": "Display CPT posts",
      "attributes": { "type": "string (required)", "count": "number", "template": "grid|list|default" },
      "example": "[cpt_list type=\"product\" count=\"6\"]"
    }
  ],
  "count": 10
}
```

#### 3. 프론트엔드 Fetcher

```typescript
// apps/admin-dashboard/src/services/ai/reference-fetcher.service.ts
class ReferenceFetcher {
  async fetchCompleteReference(): Promise<string> {
    try {
      // 1. 서버에서 로드 시도 (권장)
      const [blocksRes, shortcodesRes] = await Promise.all([
        authClient.api.get('/ai/blocks/reference'),
        authClient.api.get('/ai/shortcodes/reference')
      ]);

      const blocks = blocksRes.data.blocks;
      const shortcodes = shortcodesRes.data.shortcodes;

      // 2. 마크다운 형식으로 변환
      return this.formatReference(blocks, shortcodes);

    } catch (error) {
      // 3. 서버 실패 시 로컬 폴백 (정적 파일)
      console.warn('서버 실패 - 로컬 폴백 사용');
      return this.fetchLocalFallback();
    }
  }

  private formatReference(blocks: any[], shortcodes: any[]): string {
    return `
# Available Blocks (${blocks.length})

${blocks.map(b => `
## ${b.name}
- Title: ${b.title}
- Category: ${b.category}
- Attributes: ${JSON.stringify(b.attributes)}
- Example: ${JSON.stringify(b.example, null, 2)}
`).join('\n')}

# Available Shortcodes (${shortcodes.length})

${shortcodes.map(s => `
## [${s.name}]
- Description: ${s.description}
- Attributes: ${JSON.stringify(s.attributes)}
- Example: ${s.example}
`).join('\n')}
    `;
  }
}
```

### AI 프롬프트 구성

#### 시스템 프롬프트

```typescript
private getSystemPrompt(template: string, availableBlocks: string): string {
  const baseRules = `
중요한 규칙:
1. 반드시 JSON 형식으로만 응답하세요: {"blocks": [...]}
2. 이미지 URL은 절대 사용하지 마세요 (placeholder 사이트 포함)
3. 이미지 블록에는 alt 텍스트만 포함하고 src는 비워두세요
4. 버튼은 실제 링크 대신 "#" 사용
5. 한국어로 작성하세요
6. 사용자가 요청한 내용에 정확히 맞춰 생성하세요
7. **절대 금지: shortcode, [tag] 형태, {{ }} 형태 출력 금지**
8. shortcode는 수작업으로만 추가 가능합니다`;

  return `${baseRules}\n\n${availableBlocks}\n\n${템플릿별_구성}`;
}
```

#### 사용자 프롬프트

```typescript
private buildUserPrompt(prompt: string): string {
  return `다음 요구사항으로 페이지를 정확히 생성하세요: ${prompt}

블록 형식 예시 (반드시 이 구조를 따르세요):
{
  "blocks": [
    {
      "type": "o4o/heading",
      "content": {},
      "attributes": {"content": "제목 텍스트", "level": 2}
    },
    {
      "type": "o4o/paragraph",
      "content": {},
      "attributes": {"content": "문단 내용"}
    }
  ]
}`;
}
```

### 응답 검증 및 변환

```typescript
private validateBlocks(blocks: any[]): Block[] {
  return blocks
    .filter(block => !block.type.includes('shortcode')) // 숏코드 블록 제거
    .map((block, index) => {
      // 1. core/ → o4o/ prefix 변환
      let blockType = block.type.startsWith('core/')
        ? block.type.replace('core/', 'o4o/')
        : block.type;

      // 2. content/attributes 정규화
      let content = block.content || {};
      let attributes = block.attributes || {};

      // 3. Heading 블록: content.text → attributes.content
      if (blockType === 'o4o/heading') {
        if (content.text) {
          attributes.content = content.text;
          attributes.level = content.level || 2;
          content = {};
        }
      }

      // 4. Paragraph 블록: content.text → attributes.content
      if (blockType === 'o4o/paragraph') {
        if (content.text) {
          attributes.content = content.text;
          content = {};
        }
      }

      // 5. innerBlocks 재귀 처리
      let innerBlocks = block.innerBlocks
        ? this.validateBlocks(block.innerBlocks)
        : undefined;

      return {
        id: `block-${Date.now()}-${index}`,
        type: blockType,
        content,
        attributes,
        ...(innerBlocks ? { innerBlocks } : {})
      };
    });
}
```

---

## API 엔드포인트

### POST /api/ai/generate

AI 페이지 생성 메인 엔드포인트

#### 요청

```typescript
POST /api/ai/generate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "provider": "gemini" | "openai" | "claude",
  "model": "gemini-2.5-flash" | "gpt-5" | "claude-sonnet-4.5",
  "systemPrompt": "...",
  "userPrompt": "...",
  "temperature": 0.7,
  "maxTokens": 16384
}
```

#### 응답 (성공)

```typescript
{
  "success": true,
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 1234,
    "completionTokens": 567,
    "totalTokens": 1801
  },
  "result": {
    "blocks": [
      {
        "type": "o4o/heading",
        "content": {},
        "attributes": { "content": "AI 생성 제목", "level": 1 }
      }
    ]
  },
  "requestId": "req_abc123"
}
```

#### 응답 (에러)

```typescript
{
  "success": false,
  "error": "Rate limit exceeded",
  "type": "RATE_LIMIT_ERROR",
  "retryable": true,
  "requestId": "req_abc123"
}
```

#### 에러 타입

| 타입 | 설명 | 재시도 가능 |
|------|------|------------|
| VALIDATION_ERROR | 잘못된 요청 (모델, 파라미터) | ❌ |
| AUTH_ERROR | 인증 실패 (API 키 없음/만료) | ❌ |
| PROVIDER_ERROR | LLM API 에러 | ⚠️ 상황에 따라 |
| TIMEOUT_ERROR | 요청 시간 초과 (120초) | ✅ |
| RATE_LIMIT_ERROR | 요청 한도 초과 | ✅ (Retry-After 후) |

### GET /api/ai/blocks/reference

블록 메타데이터 조회

#### 요청

```
GET /api/ai/blocks/reference
Authorization: Bearer <JWT_TOKEN>
```

#### 응답

```json
{
  "blocks": [
    {
      "name": "o4o/heading",
      "title": "Heading",
      "category": "text",
      "attributes": {
        "content": { "type": "string", "default": "" },
        "level": { "type": "number", "default": 2 }
      },
      "example": { "type": "o4o/heading", "attributes": { "content": "제목", "level": 2 } }
    }
  ],
  "count": 26
}
```

### GET /api/ai/shortcodes/reference

숏코드 메타데이터 조회

#### 요청

```
GET /api/ai/shortcodes/reference
Authorization: Bearer <JWT_TOKEN>
```

#### 응답

```json
{
  "shortcodes": [
    {
      "name": "cpt_list",
      "description": "Display CPT posts",
      "category": "dynamic",
      "attributes": {
        "type": { "type": "string", "required": true },
        "count": { "type": "number", "default": 10 }
      },
      "example": "[cpt_list type=\"product\" count=\"6\"]"
    }
  ],
  "count": 10
}
```

---

## 블록 및 숏코드 레지스트리

### 블록 카테고리

| 카테고리 | 블록 수 | 주요 블록 |
|----------|---------|----------|
| TEXT | 7 | paragraph, heading, list, quote, code, markdown, table |
| MEDIA | 6 | image, gallery, cover, slide, video, youtube |
| LAYOUT | 4 | columns, column, group, conditional |
| DESIGN | 2 | button, buttons |
| WIDGETS | 2 | social-links, shortcode |
| DYNAMIC | 3 | universal-form, form-field, form-submit |
| EMBED | 2 | file, youtube |

### 숏코드 카테고리

| 카테고리 | 숏코드 수 | 주요 숏코드 |
|----------|-----------|-----------|
| Auth | 3 | social_login, login_form, oauth_login |
| Dropshipping | 3 | seller_dashboard, supplier_dashboard, affiliate_dashboard |
| Dynamic | 4 | cpt_list, cpt_field, acf_field, meta_field |

전체 목록은 [부록](#지원되는-블록-전체-목록)을 참조하세요.

---

# Part 3: 개발자 문서

## 새 블록 추가하기

AI가 새 블록을 생성할 수 있도록 하려면 3단계 작업이 필요합니다.

### 1단계: 블록 컴포넌트 구현 (Frontend)

```typescript
// apps/admin-dashboard/src/components/editor/blocks/MyNewBlock.tsx
import React from 'react';
import { BlockProps } from '@/types/blocks';

export const MyNewBlock: React.FC<BlockProps> = ({ attributes, setAttributes }) => {
  return (
    <div className="my-new-block">
      <input
        type="text"
        value={attributes.customField || ''}
        onChange={(e) => setAttributes({ customField: e.target.value })}
        placeholder="Enter custom field"
      />
    </div>
  );
};
```

### 2단계: Block Registry 등록 (Frontend)

```typescript
// apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts
import { MyNewBlock } from '@/components/editor/blocks/MyNewBlock';

export const registerAllBlocks = () => {
  blockRegistry.register({
    name: 'o4o/my-new-block',
    title: 'My New Block',
    category: 'widgets',
    icon: '🆕',
    component: MyNewBlock,
    attributes: {
      customField: {
        type: 'string',
        default: ''
      }
    }
  });
};
```

### 3단계: 서버 레지스트리 추가 (Backend)

```typescript
// apps/api-server/src/services/block-registry.service.ts
export const BLOCK_DEFINITIONS: BlockMetadata[] = [
  // ... 기존 블록들
  {
    name: 'o4o/my-new-block',
    title: 'My New Block',
    category: 'widgets',
    description: 'Custom block for specific purpose',
    attributes: {
      customField: {
        type: 'string',
        default: '',
        description: 'Custom field description'
      }
    },
    example: {
      type: 'o4o/my-new-block',
      content: {},
      attributes: { customField: 'Example value' }
    }
  }
];
```

이제 AI가 이 블록을 생성할 수 있습니다!

---

## 새 템플릿 추가하기

### 1단계: 템플릿 타입 추가

```typescript
// apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts
export interface GenerateRequest {
  prompt: string;
  template?: 'landing' | 'about' | 'product' | 'blog' | 'portfolio'; // ← 추가
  config: AIConfig;
}
```

### 2단계: 시스템 프롬프트 정의

```typescript
private getSystemPrompt(template: string, availableBlocks: string): string {
  const prompts = {
    // ... 기존 템플릿들
    portfolio: `${baseRules}

${availableBlocks}

포트폴리오 페이지 구성:
- 작가/디자이너 소개 헤드라인
- 프로필 사진 (alt 텍스트만)
- 프로젝트 갤러리 (3-6개)
- 각 프로젝트: 제목, 설명, 사용 기술
- 연락처 정보
- CTA 버튼`
  };

  return prompts[template] || prompts.landing;
}
```

### 3단계: UI에 템플릿 추가

```typescript
// apps/admin-dashboard/src/components/ai/SimpleAIModal.tsx
const templates = [
  // ... 기존 템플릿들
  { key: 'portfolio', name: '포트폴리오', description: '개인 작품 및 경력 소개' },
];
```

---

## AI 커스터마이징

### 온도(Temperature) 조정

```typescript
// apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts
const response = await authClient.api.post('/ai/generate', {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  temperature: 0.7,  // ← 0.0 (결정론적) ~ 2.0 (창의적)
  // ...
});
```

**권장 값**:
- `0.3-0.5`: 정확성 중시 (기술 문서, 공식 안내)
- `0.7-0.9`: 균형 (일반 페이지, 블로그)
- `1.0-1.5`: 창의성 중시 (마케팅, 스토리텔링)

### 최대 토큰(maxTokens) 조정

```typescript
const response = await authClient.api.post('/ai/generate', {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  maxTokens: 16384,  // ← Gemini 기본값
  // ...
});
```

**모델별 기본값**:
- Gemini: 16384
- GPT: 8192
- Claude: 8192

### 커스텀 시스템 프롬프트

```typescript
// 특정 브랜드 가이드라인 적용
const customSystemPrompt = `
${기본_규칙}

브랜드 가이드라인:
- 항상 "고객님"으로 호칭
- 존댓말 사용
- 브랜드 컬러: 블루(#0066cc), 화이트(#ffffff)
- 폰트: Noto Sans KR
- 톤앤매너: 전문적이면서 친근하게
`;
```

---

## 테스트 및 디버깅

### 로컬 테스트

```bash
# 1. API 서버 실행
cd apps/api-server
npm run dev

# 2. Admin 대시보드 실행
cd apps/admin-dashboard
npm run dev

# 3. 브라우저에서 테스트
# http://localhost:3000/admin/pages/new
```

### 디버깅 로그 확인

**Frontend (브라우저 콘솔)**:
```javascript
// SimpleAIGenerator.ts에 로그 추가
console.log('AI Request:', { provider, model, prompt });
console.log('AI Response:', response.data);
```

**Backend (서버 로그)**:
```typescript
// apps/api-server/src/services/ai-proxy.service.ts
logger.info('AI proxy request started', {
  requestId,
  userId,
  provider,
  model,
  promptSize
});

logger.info('AI proxy request completed', {
  requestId,
  status: 'success',
  usage: response.usage
});
```

### 에러 추적

**AI 응답 파일로 저장** (디버깅용):
```typescript
// apps/api-server/src/services/ai-proxy.service.ts (Gemini 응답 처리 부분)
try {
  const fs = require('fs');
  const debugPath = `/tmp/ai-response-${requestId}.json`;
  fs.writeFileSync(debugPath, JSON.stringify(parsed.blocks, null, 2));
  logger.info('AI response saved to file', { requestId, debugPath });
} catch (debugError) {
  logger.warn('Failed to save debug file', { requestId, error: debugError.message });
}
```

### 단위 테스트

```typescript
// apps/admin-dashboard/src/services/ai/__tests__/SimpleAIGenerator.test.ts
import { simpleAIGenerator } from '../SimpleAIGenerator';

describe('SimpleAIGenerator', () => {
  it('should generate blocks from prompt', async () => {
    const blocks = await simpleAIGenerator.generatePage({
      prompt: '간단한 랜딩 페이지',
      template: 'landing',
      config: { provider: 'gemini', model: 'gemini-2.5-flash' }
    });

    expect(blocks).toBeDefined();
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toMatch(/^o4o\//);
  });
});
```

---

# 부록

## 지원되는 블록 전체 목록

### TEXT (7개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/paragraph` | 일반 텍스트 단락 | content (string) |
| `o4o/heading` | 제목 (H1-H6) | content (string), level (1-6) |
| `o4o/list` | 순서/비순서 목록 | items (array), ordered (boolean) |
| `o4o/quote` | 인용구 | content (string), citation (string) |
| `o4o/code` | 코드 블록 | code (string), language (string) |
| `o4o/markdown` | 마크다운 | markdown (string) |
| `o4o/table` | 테이블 | rows (array), columns (array) |

### MEDIA (6개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/image` | 이미지 | url (string), alt (string) |
| `o4o/gallery` | 이미지 갤러리 | images (array), columns (number) |
| `o4o/cover` | 커버 이미지 + 텍스트 | url (string), overlayText (string) |
| `o4o/slide` | 슬라이드쇼 | slides (array) |
| `o4o/video` | 비디오 임베드 | url (string), provider (youtube/vimeo) |
| `o4o/youtube` | YouTube 임베드 | videoId (string) |

### LAYOUT (4개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/columns` | 컬럼 컨테이너 | columnCount (number), innerBlocks (array) |
| `o4o/column` | 단일 컬럼 | width (number), innerBlocks (array) |
| `o4o/group` | 블록 그룹 | innerBlocks (array) |
| `o4o/conditional` | 조건부 표시 | condition (object), innerBlocks (array) |

### DESIGN (2개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/button` | 버튼 | text (string), url (string), style (primary/secondary) |
| `o4o/buttons` | 버튼 그룹 | buttons (array) |

### WIDGETS (2개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/social-links` | 소셜 링크 | links (array) |
| `o4o/shortcode` | 숏코드 래퍼 | shortcode (string) |

### DYNAMIC (3개)

| 블록명 | 설명 | 주요 속성 |
|--------|------|----------|
| `o4o/universal-form` | 범용 폼 | fields (array), submitAction (string) |
| `o4o/form-field` | 폼 필드 | fieldType (text/email/etc), label (string) |
| `o4o/form-submit` | 제출 버튼 | buttonText (string) |

---

## 지원되는 숏코드 전체 목록

### Auth (3개)

| 숏코드 | 설명 | 예제 |
|--------|------|------|
| `[social_login]` | 소셜 로그인 버튼 | `[social_login providers="google,naver"]` |
| `[login_form]` | 로그인 폼 | `[login_form redirect="/dashboard"]` |
| `[oauth_login]` | OAuth 로그인 (별칭) | `[oauth_login]` |

### Dropshipping (3개)

| 숏코드 | 설명 | 예제 |
|--------|------|------|
| `[seller_dashboard]` | 판매자 대시보드 | `[seller_dashboard view="orders"]` |
| `[supplier_dashboard]` | 공급자 대시보드 | `[supplier_dashboard]` |
| `[affiliate_dashboard]` | 제휴사 대시보드 | `[affiliate_dashboard]` |

### Dynamic (4개)

| 숏코드 | 설명 | 예제 |
|--------|------|------|
| `[cpt_list]` | CPT 게시물 목록 | `[cpt_list type="product" count="6" template="grid"]` |
| `[cpt_field]` | CPT 필드 값 | `[cpt_field field="title" post_id="123"]` |
| `[acf_field]` | ACF 필드 값 | `[acf_field name="price" format="currency"]` |
| `[meta_field]` | 메타 필드 값 | `[meta_field key="_stock" default="재고 없음"]` |

---

## 프롬프트 예제 라이브러리

### 랜딩 페이지 (10개)

1. **SaaS 제품**
   ```
   클라우드 기반 팀 협업 도구 랜딩 페이지를 만들어주세요.
   제품명: TeamSync
   주요 기능: 실시간 채팅, 화상회의, 파일 공유, 작업 관리
   대상: 중소기업 팀장
   특별 혜택: 14일 무료 체험
   ```

2. **모바일 앱**
   ```
   AI 기반 건강 관리 앱 랜딩 페이지를 만들어주세요.
   앱 이름: HealthAI
   주요 기능: 식단 추천, 운동 계획, 수면 분석, 건강 리포트
   타겟: 20-40대 직장인
   ```

3. **전자상거래**
   ```
   친환경 생활용품 쇼핑몰 랜딩 페이지를 만들어주세요.
   브랜드: EcoLife
   핵심 가치: 제로 웨이스트, 비건, 동물실험 반대
   특별 행사: 신규 회원 20% 할인
   ```

### 블로그 포스트 (10개)

1. **기술 튜토리얼**
   ```
   "Next.js 14로 블로그 만들기 완벽 가이드" 튜토리얼을 작성해주세요.
   대상: React 경험이 있는 개발자
   포함 내용: 프로젝트 설정, 라우팅, 마크다운 파싱, 배포
   ```

2. **트렌드 분석**
   ```
   "2025년 웹 개발 트렌드 10가지" 블로그 포스트를 작성해주세요.
   주요 주제: AI 통합, 서버리스, Edge Computing, WebAssembly
   톤: 전문적이지만 이해하기 쉽게
   ```

3. **제품 리뷰**
   ```
   "MacBook Pro M4 Max 리뷰 - 3개월 사용 후기" 포스트를 작성해주세요.
   평가 항목: 성능, 배터리, 디스플레이, 가성비
   대상 독자: 크리에이터, 개발자
   ```

### 제품 페이지 (10개)

1. **가전제품**
   ```
   스마트 공기청정기 제품 페이지를 만들어주세요.
   제품명: AirPure Pro
   주요 사양: HEPA 필터, 360도 순환, 앱 제어, 소음 25dB
   가격: 389,000원
   ```

2. **패션**
   ```
   프리미엄 가죽 지갑 제품 페이지를 만들어주세요.
   제품명: Leather Craft Wallet
   소재: 이탈리아 풀그레인 가죽
   색상: 블랙, 브라운, 네이비
   가격: 128,000원
   ```

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-10-31
**작성자**: Claude Code (AI Assistant)
**검토**: O4O Platform Team

---

## 관련 문서

- [SHORTCODES.md](./SHORTCODES.md) - 숏코드 완벽 가이드
- [BLOCKS_REFERENCE.md](./BLOCKS_REFERENCE.md) - 블록 완벽 가이드
- [DEPLOYMENT.md](/docs/DEPLOYMENT.md) - 배포 가이드
- [BLOCKS_DEVELOPMENT.md](/docs/BLOCKS_DEVELOPMENT.md) - 블록 개발 가이드

**질문이나 피드백**:
- GitHub Issues: https://github.com/o4o-platform/o4o-platform/issues
- 이메일: dev@o4o-platform.com
