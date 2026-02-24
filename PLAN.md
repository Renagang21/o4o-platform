# KPA-a 사이버 공간 템플릿 갤러리

## 개요

약국이 사이버 공간(온라인 매장)에서 사용할 디자인 템플릿을 미리보기하고 선택하는 갤러리 페이지를 만든다.

## 채널 4종 × 디자인 4종 = 16개 템플릿

### 채널 타입
| 채널 | 설명 | 화면 특성 |
|------|------|-----------|
| 블로그 | 약국 건강정보 블로그 | 콘텐츠 중심, 카드형 기사 목록 |
| 태블릿 | 매장 내 태블릿 디스플레이 | 터치 최적화, 큰 버튼, 스와이프 |
| 전자상거래 | B2C 온라인 쇼핑몰 | 상품 그리드, 카트, 프로모션 |
| 키오스크 | 무인 안내/주문 키오스크 | 세로형, 단계별 플로우, 큰 터치 영역 |

### 디자인 스타일
| 스타일 | 키워드 | 컬러 톤 |
|--------|--------|---------|
| 현대적 (Modern) | 깔끔한 선, 볼드 타이포, 그라디언트 | #0F172A → #3B82F6 |
| 감성적 (Emotional) | 따뜻한 색, 둥근 모서리, 부드러운 그림자 | #F59E0B → #EC4899 |
| 건조한 (Dry) | 초미니멀, 흑백, 날카로운 모서리, 데이터 중심 | #000000 → #6B7280 |
| 전문적 (Professional) | 의료/약국 전문, 신뢰감, 구조적 | #059669 → #0D9488 |

## 파일 구조

```
services/web-kpa-society/src/pages/pharmacy/
├── CyberTemplateGalleryPage.tsx    ← 메인 갤러리 페이지 (NEW)
├── templates/                      ← 템플릿 미리보기 컴포넌트 (NEW)
│   ├── index.ts
│   ├── BlogTemplates.tsx           ← 블로그 4종 미리보기
│   ├── TabletTemplates.tsx         ← 태블릿 4종 미리보기
│   ├── EcommerceTemplates.tsx      ← 전자상거래 4종 미리보기
│   └── KioskTemplates.tsx          ← 키오스크 4종 미리보기
```

## 페이지 구조

### CyberTemplateGalleryPage.tsx
- 경로: `/pharmacy/store/cyber-templates`
- 상단: 채널 타입 탭 (블로그 | 태블릿 | 전자상거래 | 키오스크)
- 본문: 선택된 채널의 4가지 디자인 미리보기 카드 그리드 (2×2)
- 각 카드: 축소된 미리보기 + 스타일명 + 설명 + "미리보기" 버튼
- 미리보기 모달: 클릭 시 확대된 미리보기 표시
- 하단: "이 템플릿 적용" 버튼 (현재는 선택만, 실제 적용은 향후)

### 각 템플릿 미리보기 컴포넌트
- 순수 CSS/React로 만든 mock 디자인
- 실제 데이터 없이 더미 콘텐츠로 디자인만 표현
- 각 스타일별 고유 색상/레이아웃/타이포그래피

## 라우팅 변경

1. `StoreManagementLayout.tsx`: 사이드바에 "사이버 공간" 메뉴 추가
2. `App.tsx`: `/pharmacy/store/cyber-templates` 라우트 추가
3. `pharmacy/index.ts`: export 추가

## 구현 순서

1. 블로그 템플릿 4종 (BlogTemplates.tsx)
2. 태블릿 템플릿 4종 (TabletTemplates.tsx)
3. 전자상거래 템플릿 4종 (EcommerceTemplates.tsx)
4. 키오스크 템플릿 4종 (KioskTemplates.tsx)
5. 갤러리 메인 페이지 (CyberTemplateGalleryPage.tsx)
6. 라우팅/사이드바 연결
7. 커밋 & 푸시
