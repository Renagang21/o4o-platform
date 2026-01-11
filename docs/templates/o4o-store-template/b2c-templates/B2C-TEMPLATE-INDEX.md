# O4O B2C Store Templates

> **Phase 8 확정 문서**
> B2C 매장형 O4O 서비스를 위한 4종 경험 템플릿

## 개요

이 템플릿들은 **O4O Store Template Rules (CLAUDE.md §21)**을 준수하면서,
B2C에 적합한 **톤/레이아웃/콘텐츠 구조**를 제공합니다.

### 공통 원칙 (Phase 8 고정)

모든 템플릿은 다음을 **절대 변경하지 않습니다**:

| 고정 규칙 | 내용 |
|----------|------|
| 주문 생성 | `checkoutService.createOrder()` 전용 |
| 주문 원장 | `checkout_orders` |
| 구분 키 | `OrderType` enum |
| 주문 테이블 | 생성 금지 |
| 결제/정산 | Core 책임 |

---

## 템플릿 목록

### 1. Modern Standard Store
> 범용 / 확장용 / 가장 많이 복제될 기본형

- **포지션**: 모든 업종에 적용 가능한 O4O 기본 표준
- **톤**: 밝은 배경, 여백 중심, 카드 기반
- **권장 OrderType**: `COSMETICS`, `TOURISM`, 신규 매장 초기값
- **폴더**: `b2c-templates/modern-standard/`

### 2. Professional Service Store
> 신뢰/전문성 중심 (약국, 헬스케어, 전문 매장)

- **포지션**: 전문가 공간, "싸게 파는 곳"이 아닌 신뢰 매장
- **톤**: 차분한 컬러, 텍스트 가독성 우선, 정보 구조 명확
- **권장 OrderType**: `PHARMACY` (향후), `GLYCOPHARM` (read-only)
- **폴더**: `b2c-templates/professional-service/`

### 3. Beauty Experience Store
> 감성/브랜드/이미지 중심 B2C

- **포지션**: 화장품, K-Beauty, 라이프스타일
- **톤**: 이미지 중심, 강한 시각 대비, 스크롤 경험 중시
- **권장 OrderType**: `COSMETICS` (표준 레퍼런스)
- **폴더**: `b2c-templates/beauty-experience/`

### 4. Local Community Store
> 지역 밀착형 B2C + 신뢰 + 생활 서비스

- **포지션**: 동네 약국, 지역 매장, "내가 아는 가게"
- **톤**: 따뜻한 색감, 사람/공간 사진, 모바일 최적화
- **권장 OrderType**: `COSMETICS`, `PHARMACY`, `LOCAL_STORE` (확장용)
- **폴더**: `b2c-templates/local-community/`

---

## 템플릿 선택 가이드

```
┌─────────────────────────────────────────────────────────────┐
│                    새 매장 생성                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ 매장의 핵심 가치는 무엇인가? │
              └───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ 전문성  │          │ 브랜드  │          │ 지역    │
   │ 신뢰    │          │ 감성    │          │ 친밀감  │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
        ▼                    ▼                    ▼
  Professional         Beauty              Local
  Service Store        Experience          Community
                       Store               Store
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │ 위 3개에 해당    │
                    │ 안 하면?         │
                    └────────┬────────┘
                             │
                             ▼
                      Modern Standard
                      Store (기본형)
```

---

## 템플릿 구성 요소

각 템플릿은 다음 파일들을 포함합니다:

```
b2c-templates/{template-name}/
├── README.md              # 템플릿 설명
├── layout-preset.json     # 화면 레이아웃 설정
├── theme-config.json      # 색상/폰트/스타일 설정
├── sections/              # 섹션별 컴포넌트 정의
│   ├── hero.json
│   ├── featured-products.json
│   ├── categories.json
│   └── ...
├── sample-data/           # 초기 데이터 예시
│   ├── products.json
│   ├── categories.json
│   └── store-info.json
└── assets/                # 템플릿 에셋 (이미지 플레이스홀더)
    └── placeholders/
```

---

## 사용 방법

### 1. 템플릿 선택

위 선택 가이드를 참고하여 적합한 템플릿 선택

### 2. 템플릿 복사

```bash
# 예: Beauty Experience Store 사용
cp -r docs/templates/o4o-store-template/b2c-templates/beauty-experience \
      apps/api-server/src/routes/{new-store}/template-config
```

### 3. 설정 커스터마이징

- `theme-config.json`: 브랜드 색상, 폰트 변경
- `layout-preset.json`: 섹션 순서, 표시 여부 변경
- `sample-data/`: 실제 데이터로 교체

### 4. Store Template Checklist 완료

`NEW-STORE-CHECKLIST.md` 의 모든 항목 확인

---

## 주의사항

### 변경 가능한 것
- UI/UX 톤 (색상, 폰트, 간격)
- 섹션 순서 및 구성
- 콘텐츠 텍스트
- 이미지/에셋

### 변경 불가능한 것 (Phase 8 고정)
- 주문 생성 방식 (`checkoutService.createOrder()` 필수)
- OrderType 사용 방식
- 결제/정산 로직 (Core 책임)
- 주문 테이블 구조

---

*Phase 8 (2026-01-11) - O4O B2C Store Templates*
