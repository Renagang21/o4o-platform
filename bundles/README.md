# Service Bundles

## 개요

Service Bundle은 특정 서비스에 최적화된 앱 조합을 정의하는 템플릿입니다.
각 서비스(neture, yaksa 등)는 Core App + Extension App 조합으로 구성됩니다.

## 구조

```
bundles/
├── neture.bundle.json     # Neture 화장품 매장 번들
├── yaksa.bundle.json      # 약사 조직 관리 번들
└── README.md             # 이 파일
```

## Bundle JSON 스키마

```json
{
  "bundleId": "unique-bundle-id",
  "name": "번들 이름",
  "version": "1.0.0",
  "description": "번들 설명",
  "type": "service-bundle",
  "targetService": "도메인명",

  "apps": [
    {
      "appId": "app-id",
      "version": ">=1.0.0",
      "required": true,
      "description": "앱 설명"
    }
  ],

  "bundleConfig": {
    "theme": "테마명",
    "brandColor": "#HEX",
    "features": {}
  },

  "installOrder": ["app1", "app2", "app3"],

  "metadata": {
    "author": "작성자",
    "createdAt": "날짜",
    "tags": ["태그"]
  }
}
```

## 사용법

### 1. Bundle 설치

```bash
# Neture 서비스 전체 앱 설치
npm run bundle:install neture

# Yaksa 서비스 전체 앱 설치
npm run bundle:install yaksa
```

### 2. Bundle 업데이트

```bash
# 번들 내 모든 앱을 최신 호환 버전으로 업데이트
npm run bundle:update neture
```

### 3. Bundle 제거

```bash
# 번들 내 모든 앱 제거 (역순)
npm run bundle:uninstall neture
```

## Neture Bundle

**목적**: 화장품 쇼핑몰 운영

**포함 앱**:
- `catalog-core` + `catalog-neture`: 성분 분석, 피부타입 필터링
- `forum-core` + `forum-neture`: 사용후기, 루틴 공유
- `review-core` (선택): 제품 리뷰 시스템
- `wishlist-core` (선택): 찜하기 기능

**특징**:
- 피부타입별 제품 추천
- 성분 분석 및 알러지 경고
- 루틴 빌더
- 화장품 특화 포럼

## Yaksa Bundle

**목적**: 약사 조직 및 지점 관리

**포함 앱**:
- `b2b-core` + `b2b-yaksa`: 도매 거래, 거래처 관리
- `forum-core` + `forum-yaksa`: 복약지도, 케이스 스터디
- `education-core` (선택): 교육 관리
- `attendance-core` (선택): 출퇴근 관리

**특징**:
- 지점별 재고 관리
- 약물 데이터베이스 연동
- 케이스 스터디 공유
- 약사 전용 승인 시스템

## 번들 추가 방법

새로운 서비스 번들을 추가하려면:

1. `bundles/[service-name].bundle.json` 생성
2. 스키마에 맞춰 앱 목록 정의
3. `installOrder` 순서 설정 (의존성 고려)
4. 번들 설치 스크립트에 추가

## AppManager 연동

번들은 AppManager의 `installBundle()` 메소드로 설치됩니다:

```typescript
// bundles/neture.bundle.json을 읽어서 설치
await appManager.installBundle('neture');

// 내부 동작:
// 1. Bundle JSON 파싱
// 2. 의존성 그래프 생성
// 3. installOrder에 따라 순차 설치
// 4. bundleConfig 적용
```

## 주의사항

1. **의존성 순서**: installOrder는 의존성 그래프에 맞게 설정해야 합니다
   - Core App이 Extension App보다 먼저 와야 함
   - 예: `["forum-core", "forum-neture"]`

2. **버전 호환성**: 앱 간 버전 호환성을 확인하세요
   - semver 사용: `">=1.0.0"`, `"^2.0.0"` 등

3. **선택적 앱**: `required: false`인 앱은 설치 실패 시 스킵됩니다

4. **테마 충돌**: 하나의 서비스에는 하나의 번들만 설치하세요
