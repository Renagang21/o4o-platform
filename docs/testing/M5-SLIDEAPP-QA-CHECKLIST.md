# M5 SlideApp QA 체크리스트

> **작성일**: 2025-10-29
> **대상**: SlideApp 통합 (M1~M4 완료 후)
> **목적**: 기능, 성능, 접근성 검증

---

## 📋 테스트 환경

### 필수 브라우저
- [ ] Chrome 130+ (Windows/macOS)
- [ ] Safari 18+ (macOS/iOS)
- [ ] Edge 최신 버전
- [ ] Firefox 최신 버전

### 테스트 기기
- [ ] Desktop (1920x1080 이상)
- [ ] Tablet (iPad 또는 Galaxy Tab)
- [ ] Mobile (iPhone 15 또는 Galaxy S23)

### 네트워크 조건
- [ ] Fast 3G (Chrome DevTools Throttling)
- [ ] Slow 4G
- [ ] WiFi (정상 속도)

---

## 🧪 1. 기능 검증 (Core Functionality)

### 1.1 admin-dashboard (Gutenberg 에디터)

**테스트 페이지**: `/admin/posts/new`

#### 블록 삽입 및 설정
- [ ] o4o/slide 블록 삽입 가능
- [ ] 사이드바 패널에서 설정 변경 가능
  - [ ] Autoplay 토글
  - [ ] Autoplay Delay 입력 (ms)
  - [ ] Loop 토글
  - [ ] Navigation 토글
  - [ ] Pagination 선택 (dots, numbers, progress, none)
  - [ ] Aspect Ratio 선택 (16/9, 4/3, 1/1)
  - [ ] A11y 레이블 입력
- [ ] 에디터 미리보기에서 슬라이드 표시
- [ ] Autoplay는 에디터에서 **항상 비활성화**되어야 함 (UX 정책)

#### 저장 및 렌더링
- [ ] 블록 저장 후 게시물 발행
- [ ] 프론트엔드에서 정상 렌더링 확인
- [ ] 레거시 속성 (autoPlay → autoplay) 변환 정상

---

### 1.2 main-site (BlockRenderer)

**테스트 페이지**: 게시물에 o4o/slide 블록이 있는 페이지

#### 기본 렌더링
- [ ] o4o/slide 블록이 정상 렌더링
- [ ] core/slide 블록도 동일하게 렌더링 (호환성)
- [ ] 슬라이드 이미지 lazy loading 동작
- [ ] 빈 슬라이드 배열 시 "No slides to display" 메시지 표시

#### 슬라이드 전환
- [ ] 이전/다음 버튼 클릭 시 전환
- [ ] Pagination dots 클릭 시 해당 슬라이드로 이동
- [ ] 자동재생 활성화 시 설정한 delay대로 전환
- [ ] Loop 모드: 마지막 슬라이드 → 첫 슬라이드 순환

#### 인터랙션
- [ ] 마우스 hover 시 autoplay 일시정지
- [ ] 마우스 leave 시 autoplay 재개
- [ ] 슬라이드 클릭 시 onSlideClick 이벤트 발생 (설정된 경우)

---

### 1.3 ecommerce (ProductCarousel)

**테스트 페이지**: 상품 목록이 있는 페이지 (홈 또는 카테고리)

#### 상품 슬라이드
- [ ] 상품 이미지가 슬라이드로 표시
- [ ] 제품 정보 오버레이 표시 (이름, 가격, 할인율)
- [ ] 할인 badge 표시 (-X%)
- [ ] 추천 badge 표시
- [ ] 품절 badge 표시

#### 전환 및 네비게이션
- [ ] 이전/다음 버튼으로 상품 전환
- [ ] 슬라이드 클릭 시 상품 상세 페이지 이동
- [ ] Autoplay 동작 (설정 시)
- [ ] 빈 상품 배열 시 "표시할 상품이 없습니다" 메시지

---

## 🚀 2. 성능 측정 (Performance)

### 2.1 Chrome DevTools Performance

**측정 방법**:
1. Chrome DevTools → Performance 탭 열기
2. 슬라이드 자동재생 시작
3. 10-20초 녹화
4. 분석

#### 체크 항목
- [ ] **FPS**: 60fps 유지 (그래프가 60 라인 아래로 떨어지지 않음)
- [ ] **CPU**: 평균 15% 이하
- [ ] **메모리**: 1시간 autoplay 후 누수 없음 (Memory 탭에서 확인)
- [ ] **Layout Shift**: CLS < 0.1 (Lighthouse)

### 2.2 Lighthouse 성능 점수

**측정 방법**: Chrome DevTools → Lighthouse → Performance 체크

#### 목표 점수
- [ ] **Performance**: ≥ 90점
- [ ] **First Contentful Paint (FCP)**: < 1.8s
- [ ] **Largest Contentful Paint (LCP)**: < 2.5s
- [ ] **Cumulative Layout Shift (CLS)**: < 0.1

---

## ♿ 3. 접근성 검증 (Accessibility)

### 3.1 Lighthouse Accessibility

**측정 방법**: Chrome DevTools → Lighthouse → Accessibility만 체크

#### 목표
- [ ] **Accessibility 점수**: ≥ 95점

#### 필수 체크 항목
- [ ] `role="region"` 존재
- [ ] `aria-roledescription="carousel"` 존재
- [ ] Navigation 버튼에 `aria-label` 존재
- [ ] `aria-live="polite"` 영역 존재
- [ ] 현재 슬라이드에 `aria-current="true"` 속성

### 3.2 키보드 제어

#### 포커스 관리
- [ ] Tab 키로 슬라이드 영역 포커스 가능
- [ ] 포커스 시 visible outline/ring 표시
- [ ] Tab 순서가 논리적 (이전 버튼 → 슬라이드 → 다음 버튼 → Pagination)

#### 키보드 단축키
- [ ] **ArrowLeft**: 이전 슬라이드 이동
- [ ] **ArrowRight**: 다음 슬라이드 이동
- [ ] **Home**: 첫 번째 슬라이드 이동
- [ ] **End**: 마지막 슬라이드 이동
- [ ] **Space**: Autoplay 일시정지/재개 (토글)

### 3.3 스크린리더 테스트 (선택)

#### Windows (NVDA)
- [ ] NVDA 실행 (Ctrl+Alt+N)
- [ ] 슬라이드 영역 포커스 시 "Carousel" 발표
- [ ] 슬라이드 전환 시 "Slide 2 of 5" 발표 (300ms 디바운스)
- [ ] 버튼 포커스 시 "Previous slide" / "Next slide" 발표

#### macOS (VoiceOver)
- [ ] VoiceOver 활성화 (Cmd+F5)
- [ ] 슬라이드 영역 포커스 시 "carousel" roledescription 발표
- [ ] 슬라이드 전환 시 "Slide X of Y" 발표
- [ ] 버튼 레이블 정확하게 발표

#### iOS (VoiceOver)
- [ ] 슬라이드 영역 스와이프 가능
- [ ] 버튼 double-tap으로 활성화
- [ ] 슬라이드 정보 발표 정확

---

## 📱 4. 모바일 터치 테스트

### 4.1 스와이프 제스처
- [ ] 좌/우 스와이프로 슬라이드 전환
- [ ] 스와이프 중 autoplay 일시정지
- [ ] 스와이프 완료 후 autoplay 재개

### 4.2 터치 인터랙션
- [ ] 슬라이드 터치 시 onSlideClick 이벤트 발생
- [ ] Pagination dots 터치로 슬라이드 이동
- [ ] 버튼 터치 영역 충분 (최소 44x44px)

### 4.3 반응형 레이아웃
- [ ] 모바일 (< 640px): 슬라이드 full-width
- [ ] 태블릿 (640-1024px): 적절한 padding
- [ ] 데스크톱 (> 1024px): 최대 너비 제한

---

## 🐛 5. 오류 및 경고 점검

### 5.1 브라우저 콘솔
- [ ] **Errors**: 0개
- [ ] **Warnings**: 0개
- [ ] **Failed to load resource**: 없음
- [ ] **Deprecated API**: 사용 없음

### 5.2 네트워크 탭
- [ ] 슬라이드 이미지 로딩 상태 200
- [ ] 중복 요청 없음
- [ ] Cache 헤더 적절히 설정

---

## 🔄 6. 회귀 테스트 (Regression)

### 6.1 admin-dashboard
- [ ] 기존 paragraph 블록 정상 동작
- [ ] 기존 heading 블록 정상 동작
- [ ] 기존 image 블록 정상 동작
- [ ] 다른 블록과 슬라이드 블록 혼용 시 정상

### 6.2 main-site
- [ ] SlideBlock 없는 게시물이 정상 렌더링
- [ ] 다른 블록 렌더러 정상 동작 (ImageBlock, VideoBlock 등)
- [ ] 페이지 로딩 속도 영향 없음

### 6.3 ecommerce
- [ ] ProductCarousel 없는 페이지 정상
- [ ] 기존 상품 카드 레이아웃 영향 없음
- [ ] 장바구니/결제 기능 정상

---

## 🎬 7. 특수 시나리오 (Edge Cases)

### 7.1 빈 데이터
- [ ] slides: [] → "No slides to display" 메시지
- [ ] products: [] → "표시할 상품이 없습니다" 메시지

### 7.2 단일 슬라이드
- [ ] 슬라이드 1개일 때 navigation 버튼 숨김 처리
- [ ] Loop 설정 무시 (순환 불필요)
- [ ] Pagination 표시 안 함

### 7.3 대량 슬라이드
- [ ] 슬라이드 50개 이상 → 성능 저하 없음
- [ ] Pagination dots 많을 때 UI 깨지지 않음
- [ ] 메모리 사용량 정상

### 7.4 이미지 오류
- [ ] 이미지 404 시 placeholder 표시
- [ ] alt 텍스트 정상 표시
- [ ] 콘솔 에러 없음

### 7.5 긴 텍스트
- [ ] 슬라이드 title 긴 경우 말줄임(...)
- [ ] 상품명 긴 경우 line-clamp-2
- [ ] 오버플로 없음

---

## ✅ M5 최종 수용 기준 (DoD)

| 영역 | 기준 | 측정 방법 |
|------|------|----------|
| **기능** | 전환/키보드/autoplay 모두 정상 | 수동 테스트 |
| **성능** | 60fps, CPU < 15%, CLS < 0.1 | Chrome DevTools + Lighthouse |
| **접근성** | Lighthouse Accessibility ≥ 95점 | Lighthouse |
| **키보드** | Arrow/Home/End/Space 정상, 포커스 visible | 수동 테스트 |
| **스크린리더** | "Slide X of N" 발표 확인 | NVDA/VoiceOver |
| **콘솔** | 0 errors, 0 warnings | Browser Console |
| **회귀** | 기존 블록 정상 동작 | 수동 테스트 |
| **모바일** | 터치/스와이프 정상, 44x44px 터치 영역 | 실기기 테스트 |

---

## 📝 테스트 결과 기록

### 테스터 정보
- **이름**: _______________
- **날짜**: _______________
- **환경**: _______________

### 발견된 이슈
| 번호 | 심각도 | 설명 | 재현 경로 | 상태 |
|------|--------|------|-----------|------|
| 1 | 🔴 High | | | ⏳ Open |
| 2 | 🟡 Medium | | | ⏳ Open |
| 3 | 🟢 Low | | | ⏳ Open |

### 최종 승인
- [ ] 모든 필수 항목 통과
- [ ] Critical/High 이슈 0개
- [ ] M5 DoD 충족

**승인자**: _______________
**승인일**: _______________

---

## 🔗 참고 문서

- [SlideApp README](/packages/slide-app/README.md)
- [Block Renderer 가이드](/packages/block-renderer/README.md)
- [WCAG 2.2 Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- [Embla Carousel Docs](https://www.embla-carousel.com/)

---

**작성자**: Claude (o4o-platform AI Assistant)
**버전**: 1.0
**최종 수정**: 2025-10-29
