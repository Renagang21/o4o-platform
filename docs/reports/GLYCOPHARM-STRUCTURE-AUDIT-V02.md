# GlycoPharm 2차 목적형 재조사 체크리스트 (v0.2)

> **조사 일시**: 2026-01-11
> **조사 전제**:
> - **주축(B)**: 약국·환자·데이터를 연결하는 **O4O 허브**
> - **보완(C)**: 운영자가 큐레이션하는 **세미 프랜차이즈 쇼케이스**
> - 본 조사는 "리팩토링 결론"을 내리지 않는다.
> - 모든 항목은 **KEEP / RELOCATE / REINTERPRET(의미 재정의)** 중 하나로만 표시한다.
> - DROP 판단은 하지 않는다.

---

## 🔵 조사 축 ①: CGMService(GlucoseView)의 위치 · 비중 · 연결성

*(B안 핵심 축)*

### ①-1. CGMService의 위상 점검

**질문**:
- [ ] CGMService는 **부가 기능**처럼 보이는가?
- [x] 아니면 **O4O 허브의 한 축**으로 인식되는가?
- [ ] "약국 → 데이터 → 환자"의 흐름이 UI 상에서 **암시라도 되는가?**
- [x] CGMService가 **다른 섹션과 고립**되어 있지는 않은가?

**관찰 결과**:

**현재 CGMServiceSection 분석**:
```
위치: HomePage 4번째 섹션 (NowRunning 다음)
크기: 대형 그라데이션 카드 (padding: 32px)
구조: 독립 섹션 (h2: "연계 서비스")
내용:
  - 제목: "GlucoseView"
  - 뱃지: "CGM 연계"
  - 설명: "CGM 데이터 요약을 기반으로 환자에게 맞춤형 제품을 추천하세요"
  - 부가 설명: "※ 환자 관리가 아닌, 판매·설명용 인사이트 제공 서비스"
  - CTA: "서비스 보기 →" (https://glucoseview.co.kr)
```

**위상 진단**:
1. **부가 기능처럼 보임**: ✅ YES
   - "연계 서비스"라는 카테고리명 자체가 "부수적"을 암시
   - 독립 섹션으로 격리됨 (QuickAction/NowRunning과 분리)
   - 홈 흐름에서 **갑자기 등장**

2. **O4O 허브의 한 축으로 인식**: ❌ NO
   - "약국 → 데이터 → 환자" 흐름이 암시되지 않음
   - 단방향 설명 ("데이터 기반으로 제품 추천")
   - **데이터 연결 허브** 개념 미언급

3. **다른 섹션과 고립**: ✅ YES
   - QuickActionCard들과 디자인 일관성 없음
   - NowRunning 카드들과 연결고리 없음
   - Hero 슬라이더 3번째 슬라이드는 CGM 언급하지만 연결 약함

**체크 결과**: ☑️ **RELOCATE + REINTERPRET**

- **RELOCATE**: 독립 섹션 → QuickActionCard 4번째 카드로 축소
- **REINTERPRET**: "연계 서비스" → "데이터 허브 (CGM)"로 의미 재정의

---

### ①-2. CGMService와 홈 구조의 관계

**질문**:
- [x] 홈에서 **설명 과잉** 상태인가?
- [x] CGMService가 홈에서 "기능 소개 페이지 역할"을 하고 있지는 않은가?
- [x] 외부 링크(glucoseview.co.kr)임에도 홈에서 중복 설명하고 있지는 않은가?

**관찰 결과**:

**CGMServiceSection 콘텐츠 분석**:
```
제공 정보량:
  - 제목 (GlucoseView)
  - 뱣지 (CGM 연계)
  - 주 설명 (CGM 데이터 요약 기반 맞춤 추천)
  - 부가 설명 (환자 관리 아님, 판매/설명용)
  - CTA 버튼 (외부 링크)
```

**홈의 역할 진단**:
1. **설명 과잉**: ✅ YES
   - 3줄의 텍스트 설명
   - 부가 설명까지 포함 (※ 주석 형태)
   - **외부 서비스**인데 홈에서 재설명

2. **기능 소개 페이지 역할**: ✅ YES
   - 대형 카드 (32px padding, Activity 아이콘 64px)
   - 설명적 톤 ("추천하세요", "제공 서비스")
   - **"무엇을 할 수 있는가"**를 설명 (출발점이 아님)

3. **중복 설명**: ✅ YES
   - 외부 링크 (glucoseview.co.kr)로 이동
   - Hero 슬라이더 3번째에도 CGM 언급
   - QuickActionCard에도 배치 가능한 구조

**관찰 포인트**: "홈은 출발점인가, 설명서인가?"

**답변**: 현재는 **설명서**에 가까움
- 출발점이라면: 카드 클릭 → 즉시 다음 행동
- 설명서라면: 카드 내부에서 설명 완결 → 클릭 선택적

**체크 결과**: ☑️ **REINTERPRET**

- 현재: "이런 서비스가 있습니다" (설명)
- 제안: "CGM 데이터 연결 허브" (상태/흐름)

---

### ①-3. CGMService와 다른 카드들의 연결성

**질문**:
- [ ] Signage/Forum 카드가 CGMService와 **맥락적으로 연결**되는가?
- [ ] 환자 관리·제품 추천이 "CGM 데이터 활용 이후의 단계"로 자연스럽게 이어지는가?
- [x] 연결이 없다면, **구조 문제인가 / 표현 문제인가?**

**관찰 결과**:

**현재 홈 흐름 분석**:
```
1. HeroSection → 플랫폼 정체성 (4개 슬라이드)
   - Slide 1: "혈당관리 약국을 위한 운영 플랫폼"
   - Slide 2: "신제품 Market Trial 참여 약국 모집 중"
   - Slide 3: "CGM 데이터 요약 기반 설명·판매 지원"
   - Slide 4: "세미 프랜차이즈 플랫폼"

2. QuickActionSection → 운영 도구 (3개 카드)
   - Signage (디지털 사이니지)
   - Market Trial (신제품 체험)
   - Forum (약사 커뮤니티)

3. NowRunningSection → 진행 중 프로그램 (3개 카드)
   - Trial: "당뇨병 환자용 신규 영양제 Trial"
   - Event: "혈당관리 앱 연동 이벤트"
   - Campaign: "당뇨인의 날 캠페인"

4. CGMServiceSection → ⚠️ 갑자기 등장
   - 앞선 3개 섹션과 맥락 단절
   - CGM 언급은 Hero Slide 3에만 있음
   - QuickAction/NowRunning에 CGM 관련 없음

5. NoticeSection → 운영 공지
6. CTASection → 비로그인 유저 전환
7. PartnerTrustSection → 협력기관
```

**연결성 진단**:

1. **Signage/Forum과 CGMService 연결**: ❌ NO
   - Signage: "약국 TV 교육 콘텐츠" (CGM 언급 없음)
   - Forum: "약사 커뮤니티" (혈당관리 노하우 공유, CGM 연결 약함)
   - CGM 데이터를 활용한 콘텐츠/커뮤니티 흐름 없음

2. **환자 관리·제품 추천과 연결**: ❌ NO
   - QuickActionCard에 환자 관리 카드 없음
   - NowRunning에 "혈당관리 앱 연동 이벤트" 있지만 격리됨
   - "CGM → 환자 인사이트 → 제품 추천" 흐름 개념 부재

3. **연결 없음의 원인**:
   - **구조 문제**: ✅
     - CGMService가 독립 섹션 (다른 카드와 격리)
     - CGM 관련 카드가 QuickAction/NowRunning에 없음
   - **표현 문제**: ✅
     - "연계 서비스"라는 카테고리명이 격리 유도
     - "데이터 기반 추천"은 **단방향**
     - "약국 → CGM → 환자 → 제품" 흐름 언급 없음

**체크 결과**: ☑️ **구조 문제 (RELOCATE) + 표현 문제 (REINTERPRET)**

**제안**:
1. **구조 조정**:
   - CGMService → QuickActionCard 4번째로 이동
   - 또는 NowRunning 타입에 `cgm-event` 추가

2. **표현 조정**:
   - "연계 서비스" → "CGM 데이터 허브"
   - "추천하세요" → "지금 연결 중: GlucoseView"
   - 설명적 톤 → 상태 표시 톤

---

## 🔵 조사 축 ②: 콘텐츠 카드(Signage/Forum)의 비중과 역할

*(B안 실질 구동부)*

### ②-1. 콘텐츠의 성격 점검

**질문**:
- [ ] 현재 콘텐츠는 "정보 제공"에 머무르는가?
- [x] 아니면 "약국·환자·데이터 연결을 돕는 재료"로 기능하는가?
- [x] 콘텐츠가 **혼자 완결**되는가, **다음 행동을 유도**하는가?

**관찰 결과**:

**현재 홈에서 "콘텐츠" 요소**:
```
1. QuickActionCard "Signage"
   - 제목: "Signage"
   - 부제: "콘텐츠 라이브러리"
   - 설명: "약국 TV에 노출할 교육 콘텐츠를 관리하세요"
   - 상태: "방영 중 3개"

2. QuickActionCard "Forum"
   - 제목: "Forum"
   - 부제: "약사 커뮤니티"
   - 설명: "혈당관리 노하우와 경험을 공유하세요"
   - 상태: "신규 글 5개"
```

**NowRunningSection 재분석** (콘텐츠로 볼 수 있는가?):
```tsx
NowRunningItem[] = [
  {
    type: 'trial',
    title: '당뇨병 환자용 신규 영양제 Trial',
    supplier: '글루코헬스',
    deadline: '2026.01.31',
    participants: 23,
  },
  {
    type: 'event',
    title: '혈당관리 앱 연동 이벤트',
    supplier: 'GlucoseView',
    deadline: '2026.02.15',
  },
  {
    type: 'campaign',
    title: '당뇨인의 날 캠페인',
    deadline: '2026.03.14',
  },
]
```

**콘텐츠 성격 진단**:
1. **정보 제공**: ⚠️ 일부
   - Signage: 교육 콘텐츠 (환자용)
   - Forum: 노하우 공유 (약사용)
   - NowRunning: 진행 중 프로그램 (운영자 큐레이션)

2. **연결 재료**: ✅ YES (일부)
   - Signage: 약국 → 환자 연결 (TV 교육 콘텐츠)
   - Forum: 약사 → 약사 연결 (커뮤니티)
   - **CGM → 콘텐츠 연결 미약**

3. **완결 vs 유도**:
   - 현재: **다음 행동 유도** (link 포함)
   - Signage: "방영 중 3개" → 관리 페이지로 이동
   - Forum: "신규 글 5개" → 커뮤니티로 이동
   - **"콘텐츠를 통한 허브 연결" 개념 부재**

**발견**:
- 현재 홈에 **환자용 콘텐츠 암시** 있음 (Signage)
- NowRunning은 **약국 운영자용** + 일부 환자 이벤트
- "CGM → 콘텐츠 → 환자" 연결 개념 부재

**체크 결과**: ☑️ **REINTERPRET (역할 재정의 필요)**

**제안**:
1. Signage 카드 description 조정
   - 현재: "약국 TV에 노출할 교육 콘텐츠를 관리하세요"
   - 제안: "환자에게 혈당관리 콘텐츠를 전달합니다"
2. NowRunning에 `type: 'cgm-event'` 추가
   - "CGM 데이터 활용 워크샵"
   - "GlucoseView 연동 가이드"

---

### ②-2. 콘텐츠 카드의 위치와 밀도

**질문**:
- [ ] 콘텐츠 카드가 홈에서 **과도하게 적은가 / 많은가?**
- [x] 콘텐츠가 "이벤트처럼 튀는가", 아니면 "일상적인 재료처럼 섞이는가?"
- [ ] 추천 콘텐츠와 일반 콘텐츠의 구분이 **과도하게 강조**되어 있지는 않은가?

**관찰 결과**:

**현재 콘텐츠 밀도**:
```
QuickAction 콘텐츠 카드: 2개 (Signage, Forum)
NowRunning (운영자 큐레이션): 3개 (Trial, Event, Campaign)
CGMService: 1개 (독립 섹션)
```

**밀도 진단**:
1. **과도하게 적음**: ❌ NO
   - Signage + Forum 2개 카드 적절
   - NowRunning 3개 카드 적절
   - **CGMService 독립 섹션이 문제** (밀도 과다)

2. **이벤트 vs 일상 재료**:
   - QuickActionCard: **일상 재료** (고정 기능)
   - NowRunning: **이벤트처럼 튀는 형태**
     - type 뱃지 (Trial/Event/Campaign) 모두 일시적
     - deadline 표시로 긴박감 조성
   - **적절한 혼합 비율**

3. **추천/일반 구분**:
   - NowRunning = 운영자 추천 (암묵적)
   - QuickAction = 일반 기능 (명시적)
   - **과도하지 않음**

**체크 결과**: ☑️ **밀도 적절 (KEEP) - CGMService만 RELOCATE**

**제안**:
1. CGMService를 QuickActionCard 4번째로 축소
2. NowRunning에 CGM 관련 이벤트 추가 (선택적)

---

### ②-3. 콘텐츠와 CGMService의 관계

**질문**:
- [ ] 콘텐츠가 CGMService의 "보조 설명"처럼 보이지는 않는가?
- [ ] 콘텐츠가 CGMService의 "입구 역할"을 하고 있는가?
- [x] 약국 관점에서 "다음에 무엇을 하면 되는지"가 느껴지는가?

**관찰 결과**:

**현재 관계**:
```
콘텐츠: Signage (TV 교육), Forum (커뮤니티)
CGMService: 독립 섹션 (외부 링크)
관계: 약함 (Hero 슬라이드 3에서만 연결 암시)
```

**관계 진단**:
1. **보조 설명**: ❌ (독립 섹션)
2. **입구 역할**: ❌ (관계 단절)
3. **다음 행동 느껴짐**: ⚠️ 일부
   - Signage CTA: "콘텐츠 라이브러리" (명확)
   - Forum CTA: "약사 커뮤니티" (명확)
   - CGMService CTA: "서비스 보기 →" (외부)
   - **"CGM → Signage/Forum" 흐름 없음**

**체크 결과**: ☑️ **연결 약함 (REINTERPRET)**

**제안**:
1. Hero 슬라이드 3 메시지 강화
   - 현재: "CGM 데이터 요약 기반 설명·판매 지원"
   - 제안: "CGM → 콘텐츠 → 환자 연결 흐름"
2. NowRunning에 CGM 활용 사례 추가
   - "GlucoseView 연동 Signage 콘텐츠"
   - "CGM 데이터 활용 포럼 토론"

---

## 🔵 조사 축 ③: 운영자 큐레이션의 톤과 표현

*(C안 보완 축)*

### ③-1. 운영자의 존재감

**질문**:
- [x] 이 홈을 보고 "누군가 운영하고 있다"는 느낌이 드는가?
- [x] 그 운영자는 "통제자"인가, "큐레이터"인가?
- [x] 추천/진행 중 프로그램이 **운영자의 판단 결과**로 보이는가?

**관찰 결과**:

**운영자 존재감 요소**:
```
1. HeroSection 슬라이더 (4개 슬라이드)
   - "플랫폼 정체성" 설명적
   - 자동 슬라이드 (6초)
   - 큐레이션 느낌: ⚠️ 약함

2. QuickActionSection
   - 제목: "운영 도구"
   - 부제: "약국 운영에 필요한 핵심 기능"
   - 큐레이션 느낌: ❌ 없음 (고정 기능)

3. NowRunningSection
   - 제목: "Now Running"
   - 부제: "지금 참여 가능한 프로그램"
   - 큐레이션 느낌: ✅ 있음 (운영자가 선정한 느낌)

4. NoticeSection
   - 제목: "운영 공지"
   - isPinned 기능
   - 큐레이션 느낌: ✅ 있음 (운영자 발신)

5. PartnerTrustSection
   - "신뢰할 수 있는 기관·기업과 함께합니다"
   - 큐레이션 느낌: ✅ 있음 (운영자 선정)
```

**존재감 진단**:
1. **운영하고 있다는 느낌**: ✅ YES
   - NoticeSection의 공지
   - NowRunningSection의 "지금 참여 가능"
   - PartnerTrustSection의 기관 선정
   - **"한국당뇨협회" 협력 강조**

2. **통제자 vs 큐레이터**:
   - 통제자: ⚠️ 일부 (QuickActionSection "운영 도구")
   - 큐레이터: ✅ 주로 (NowRunning, Partner 선정)
   - **세미 프랜차이즈 톤 명확**

3. **운영자 판단 결과**: ✅ YES
   - NowRunning 3개 항목: 운영자가 선정한 느낌
   - Partner 5개 기관: 운영자가 검증한 느낌
   - Notice 핀 기능: 운영자가 중요하다 판단

**체크 결과**: ☑️ **톤 적절 (KEEP) - 일부 REINTERPRET**

**제안**:
- Hero 슬라이더를 "운영자의 지금 관점"으로 재구성
  - 현재: 플랫폼 소개 (고정)
  - 제안: "이번 주 주목", "지금 추천" (유동적)

---

### ③-2. Hero 영역의 의미 재점검

**질문**:
- [x] Hero가 "플랫폼 소개"에 머무르는가?
- [ ] 아니면 "지금 운영자가 보고 싶은 장면"을 보여주는가?
- [ ] Hero가 **상태·흐름 쇼케이스**로 해석될 여지가 있는가?

**관찰 결과**:

**현재 Hero 슬라이더 내용**:
```tsx
Slide 1: "혈당관리 약국을 위한 운영 플랫폼"
  - "제품·콘텐츠·실험·판매가 연결됩니다"
  - CTA: "시작하기" (/pharmacy)

Slide 2: "신제품 Market Trial 참여 약국 모집 중"
  - "공급사의 신제품을 먼저 체험하고 피드백을 공유하세요"
  - CTA: "자세히 보기" (/pharmacy/market-trial)

Slide 3: "CGM 데이터 요약 기반 설명·판매 지원"
  - "GlucoseView와 연계하여 환자 맞춤 제품 추천"
  - CTA: "CGM 서비스 보기" (https://glucoseview.co.kr)

Slide 4: "다수 약국·다수 기업이 함께하는 세미 프랜차이즈 플랫폼"
  - "한국당뇨협회, 협력 공급사와 함께 성장합니다"
  - CTA: 없음
```

**Hero 의미 진단**:
1. **플랫폼 소개**: ✅ YES
   - Slide 1, 4: 명확한 플랫폼 소개
   - Slide 2, 3: 기능 소개

2. **지금 운영자가 보고 싶은 장면**: ⚠️ 일부
   - Slide 2 "모집 중": 현재 상태 암시
   - 나머지: 고정 메시지

3. **상태·흐름 쇼케이스**: ❌ NO
   - "지금 15개 약국 참여 중"
   - "이번 주 신규 Trial 2건"
   - 같은 동적 상태 표시 없음

**체크 결과**: ☑️ **메시지 조정 필요 (REINTERPRET)**

**제안**:
- Slide 1: "혈당관리 약국 플랫폼" (간결)
- Slide 2: "이번 주 Trial: 글루코헬스 영양제" (구체적)
- Slide 3: "지금 23개 약국 · GlucoseView 연결 중" (상태)
- Slide 4: "신뢰할 수 있는 파트너: 한국당뇨협회..." (큐레이션)

---

### ③-3. NowRunning / 추천 영역의 위상

**질문**:
- [x] NowRunning은 "지금 주목할 흐름"으로 읽히는가?
- [ ] 추천 영역이 홈의 주인공처럼 느껴지지는 않는가?
- [x] 추천이 **강제가 아니라 제안**으로 읽히는가?

**관찰 결과**:

**NowRunningSection 구조**:
```tsx
제목: "Now Running"
부제: "지금 참여 가능한 프로그램"
카드 3개: Trial / Event / Campaign
각 카드: type 뱃지 + deadline + 참여 약국 수
```

**위상 진단**:
1. **지금 주목할 흐름**: ✅ YES
   - "Now Running" 네이밍 명확
   - deadline 표시로 시간성 강조
   - participants 숫자로 진행 상태 암시
   - **"23개 약국 참여" (사회적 증거)**

2. **주인공처럼 느껴짐**: ❌ NO
   - QuickActionSection과 동등한 비중
   - 시각적으로 과도하지 않음
   - 균형적 배치

3. **강제 vs 제안**: ✅ 제안
   - "참여 가능한" (선택적)
   - "23명 참여" (사회적 증거, 강제 아님)
   - 클릭 선택적

**체크 결과**: ☑️ **적절 (KEEP)**

---

## 🔵 최종 정리 (다음 행동을 위한 재료)

### A. 이 방향(B+C)에서 의미만 바꾸면 살아나는 요소

**항목**:
1. **CGMServiceSection**
2. **NowRunningSection**
3. **Hero 슬라이더 Slide 2, 3**

**이유**:
1. **CGMServiceSection**:
   - 구조는 우수 (대형 카드, 명확한 CTA)
   - 문제는 **위치와 표현**
   - "연계 서비스" → "CGM 데이터 허브"로 재정의
   - "데이터 기반 추천" → "지금 연결 중: GlucoseView"

2. **NowRunningSection**:
   - type 시스템 우수 (trial/event/campaign)
   - **type: 'cgm-event' 추가**로 CGM 역할 확장
   - "지금 참여 가능한 프로그램" → "지금 주목할 것"

3. **Hero 슬라이더**:
   - 구조 완벽 (자동 슬라이드, 네비게이션)
   - **메시지만 조정** (플랫폼 소개 → 상태 쇼케이스)

---

### B. 이 방향(B+C)에서 위치를 옮기면 더 잘 맞는 요소

**항목**:
1. **CGMServiceSection → QuickActionCard 4번째**

**현재 위치 → 적합 위치**:
```
현재:
  1. Hero
  2. QuickAction (3개 카드)
  3. NowRunning (3개 카드)
  4. CGMService (독립 대형 섹션) ← ⚠️
  5. Notice
  6. CTA
  7. Partner

제안:
  1. Hero
  2. QuickAction (4개 카드) ← CGMService 추가
     - Signage
     - Market Trial
     - Forum
     - CGM Hub (신규 카드)
  3. NowRunning (3-6개 카드)
     - Trial
     - Event
     - Campaign
     - CGM Event (신규 type, 선택적)
  4. Notice
  5. CTA (또는 Hero에 통합)
  6. Partner
```

**이유**:
- CGMService를 QuickAction에 포함 → **핵심 축으로 승격**
- 독립 섹션 제거 → **흐름 단순화**
- 약국·환자·데이터가 같은 레벨 → **허브 구조 명확화**

---

### C. 이 방향(B+C)에서 이미 잘 맞아떨어지는 요소

**항목**:
1. **NowRunningSection 타입 뱃지 시스템**
2. **NoticeSection 운영 공지**
3. **PartnerTrustSection 기관 큐레이션**
4. **Header.tsx 미니멀 메뉴**
5. **PharmacyDashboard Cockpit 구조**

**이유**:
1. **NowRunningSection**:
   - "지금 주목할 흐름" 개념 명확
   - type 기반 뱃지 (Trial/Event/Campaign) 확장 가능
   - 운영자 큐레이션 느낌 자연스러움

2. **NoticeSection**:
   - 운영자 존재감 강함 (isPinned 기능)
   - 발신자 명확 ("운영 공지")
   - 큐레이션 톤 적절

3. **PartnerTrustSection**:
   - 운영자가 검증한 기관 느낌
   - "신뢰할 수 있는 기관·기업과 함께합니다" (큐레이션 톤)
   - **"한국당뇨협회" 강조** (신뢰성)
   - 시각적으로 과하지 않음

4. **Header.tsx**:
   - 미니멀 메뉴 (홈/포럼/교육/참여신청/약국관리)
   - 허브 개념에 적합 (기능 나열 아님)
   - 모바일 완벽 대응

5. **PharmacyDashboard Cockpit 구조**:
   - **세미 프랜차이즈 정체성 명확**
   - Block 3: "프랜차이즈 서비스" 섹션
     - Signage (TV 콘텐츠)
     - Market Trial (신제품 체험)
     - Forum (약사 커뮤니티)
   - **운영자 큐레이션 톤 일관**

---

## 🎯 이 체크리스트의 산출물

이 2차 재조사 결과를 기반으로 다음이 **즉시 가능**합니다:

### ❌ 전면 리디자인
- 필요 없음

### ❌ 구조 재설계
- 필요 없음

### ⭕ 배치 조정 리팩토링
1. **CGMService 이동**: 독립 섹션 → QuickActionCard 4번째
2. **CTASection 이동**: 홈 하단 → Hero 슬라이더 또는 제거

### ⭕ 카드 역할/카피 재정의
1. **CGMService**:
   - "연계 서비스" → "CGM 데이터 허브"
   - "데이터 기반으로 환자에게 맞춤형 제품을 추천하세요" → "지금 연결 중: GlucoseView"
   - status: { label: '연결 중', value: 'GlucoseView' }

2. **NowRunning type 확장**:
   - `type: 'cgm-event'` 추가 (선택적)
   - 뱃지: "📊 CGM" (색상: blue)
   - 예: "GlucoseView 연동 가이드"

### ⭕ Hero / CGMService / 콘텐츠의 의미 재정렬
1. **Hero 슬라이더**:
   - Slide 1: "혈당관리 약국 플랫폼" (간결)
   - Slide 2: "이번 주 Trial: 글루코헬스 영양제" (구체적)
   - Slide 3: "지금 23개 약국 · GlucoseView 연결 중" (상태)
   - Slide 4: "신뢰할 수 있는 파트너: 한국당뇨협회" (큐레이션)

2. **CGMService → QuickActionCard**:
   ```tsx
   {
     id: 'cgm-hub',
     title: 'CGM Hub',
     subtitle: 'CGM 데이터 허브',
     description: '약국·환자·데이터를 연결합니다',
     icon: Activity,
     link: 'https://glucoseview.co.kr',
     color: 'bg-blue-500',
     status: { label: '연결 중', value: 'GlucoseView' },
   }
   ```

3. **NowRunning CGM 이벤트 예시** (선택적):
   ```tsx
   {
     id: '4',
     type: 'cgm-event',
     title: 'GlucoseView 연동 가이드',
     supplier: 'GlucoseView',
     link: 'https://glucoseview.co.kr',
   }
   ```

---

## 🔍 공통 패턴 후보 (K-Cosmetics와 GlycoPharm 비교)

### 패턴 1: "연계 서비스" 독립 섹션 문제

**K-Cosmetics**:
- TouristServiceSection (독립 섹션)
- "외국인 관광객을 매장으로 연결해드립니다"

**GlycoPharm**:
- CGMServiceSection (독립 섹션)
- "CGM 데이터 기반 환자 맞춤 제품 추천"

**공통점**:
- 둘 다 **허브 핵심 축**인데 "연계 서비스"로 격리
- 독립 섹션 (대형 카드, 32px padding)
- 설명적 톤 ("~해드립니다", "~하세요")
- QuickAction/NowRunning과 단절

**해결 방향**:
- **QuickActionCard 4번째로 이동**
- "연계 서비스" → "허브" / "연결 플랫폼"
- 설명적 톤 → 상태 표시 톤

---

### 패턴 2: Hero 슬라이더의 "플랫폼 소개" 중심

**K-Cosmetics**:
- Slide 1: "K-Beauty Store를 위한 운영 플랫폼"
- Slide 4: "검증된 정품 매장만 연결합니다"

**GlycoPharm**:
- Slide 1: "혈당관리 약국을 위한 운영 플랫폼"
- Slide 4: "세미 프랜차이즈 플랫폼"

**공통점**:
- Hero가 **플랫폼 소개**에 머무름
- 동적 상태 표시 부재
- "지금 운영자 관점" 부족

**해결 방향**:
- Slide 2, 3을 **상태 쇼케이스**로 전환
- "지금 N개 매장/약국 연결 중"
- "이번 주 Trial: 구체적 항목"

---

### 패턴 3: NowRunning 타입 시스템의 확장 가능성

**K-Cosmetics**:
- type: 'trial' | 'product' | 'campaign'
- **type: 'content' 추가 가능** (관광객용 콘텐츠)

**GlycoPharm**:
- type: 'trial' | 'event' | 'campaign'
- **type: 'cgm-event' 추가 가능** (CGM 활용 이벤트)

**공통점**:
- NowRunning 타입 뱃지 시스템 우수
- 운영자 큐레이션 톤 자연스러움
- **확장 가능한 구조**

**해결 방향**:
- 신규 타입 추가로 허브 축 강화
- K-Cosmetics: 'tourist-content'
- GlycoPharm: 'cgm-event'

---

### 패턴 4: QuickAction 카드 수 (3개 고정)

**K-Cosmetics**:
- Products
- Market Trial
- Orders
- **(TouristService는 독립 섹션)**

**GlycoPharm**:
- Signage
- Market Trial
- Forum
- **(CGMService는 독립 섹션)**

**공통점**:
- QuickAction 카드 **3개로 제한**
- 허브 핵심 축은 독립 섹션으로 격리
- **4번째 카드 추가 가능한 구조**

**해결 방향**:
- QuickActionCard 4번째 추가
- K-Cosmetics: Tourist Hub
- GlycoPharm: CGM Hub

---

### 패턴 5: 운영자 큐레이션 톤 일관성

**K-Cosmetics**:
- NowRunning: "지금 참여 가능한"
- Notice: "운영 공지"
- Partner: "신뢰할 수 있는 브랜드와 함께합니다"

**GlycoPharm**:
- NowRunning: "지금 참여 가능한 프로그램"
- Notice: "운영 공지"
- Partner: "신뢰할 수 있는 기관·기업과 함께합니다"

**공통점**:
- 운영자 존재감 명확
- 큐레이터 톤 (통제자 아님)
- **세미 프랜차이즈 정체성 일관**

**해결 방향**:
- **톤 유지** (KEEP)
- Hero 슬라이더에 큐레이션 톤 추가

---

## 📊 조사 요약

| 조사 항목 | 결과 | 액션 |
|----------|------|------|
| CGMService 위상 | 부가 기능처럼 보임 | RELOCATE + REINTERPRET |
| CGMService 설명 과잉 | YES | REINTERPRET |
| CGMService 연결성 | 단절됨 | RELOCATE (구조) + REINTERPRET (표현) |
| 콘텐츠 카드 성격 | 일부 연결 재료 | REINTERPRET |
| 콘텐츠 밀도 | 적절 (CGMService만 과다) | CGMService만 RELOCATE |
| 콘텐츠-CGM 관계 | 약함 | REINTERPRET |
| 운영자 존재감 | 적절 | KEEP (일부 REINTERPRET) |
| Hero 의미 | 플랫폼 소개 | REINTERPRET (상태 쇼케이스) |
| NowRunning 위상 | 적절 | KEEP |

---

**조사 완료일**: 2026-01-11
**다음 액션**: 사용자 피드백 대기 → 배치 조정 리팩토링 또는 시나리오 작성
