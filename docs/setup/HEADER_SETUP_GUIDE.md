# 헤더 설정 가이드

## 문제 상황
관리자가 "외모 → 사용자 정의하기"에서 헤더를 설정하지 않았음에도 프론트엔드에 기본 헤더가 표시되는 문제

## 원인
데이터베이스에 `isActive=true`로 설정된 기본 헤더 템플릿이 존재

## 해결 방법

### 1. 기존 헤더 비활성화 (일회성)

#### 방법 A: Admin Dashboard 사용 (권장)
1. https://admin.neture.co.kr 접속
2. **Appearance > Template Parts** 메뉴 진입
3. "Default Header" 찾기
4. 활성화 토글을 **OFF**로 변경
5. 프론트엔드 새로고침하여 헤더가 사라졌는지 확인

#### 방법 B: API 직접 호출
```bash
# 1. 헤더 ID 찾기
curl https://api.neture.co.kr/api/public/template-parts | jq '.data[] | select(.area=="header") | {id, name, isActive}'

# 2. 비활성화 (인증 토큰 필요)
curl -X PUT https://api.neture.co.kr/api/template-parts/{HEADER_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### 2. 새로운 헤더 설정

1. https://admin.neture.co.kr 접속
2. **Appearance > Customize** 진입
3. **사이트 정보 > Logo** 선택
4. 원하는 로고 이미지 선택
5. 기타 헤더 설정 (색상, 레이아웃 등)
6. **"게시"** 버튼 클릭 ← **중요!**

### 3. 확인

- Frontend (https://neture.co.kr) 접속
- 설정한 헤더가 표시되는지 확인

## 작동 원리

### Before (문제 상황)
```
DB: Default Header (isActive=true, 설정되지 않음)
  ↓
Frontend: 기본 헤더 표시 (의도하지 않음)
```

### After (해결 후)
```
Step 1: DB에서 기본 헤더 비활성화
  ↓
Frontend: 헤더 없음 (정상)

Step 2: Customizer에서 "게시" 클릭
  ↓
DB: Default Header (isActive=true, 로고 포함)
  ↓
Frontend: 설정한 헤더 표시 (정상)
```

## 기술 세부사항

### Template Parts 구조
```typescript
{
  id: "uuid",
  name: "Default Header",
  area: "header",
  isActive: boolean,  // ← 이 값이 false면 렌더링 안 됨
  isDefault: boolean,
  content: [{
    type: "core/site-logo",
    data: {
      logoUrl: "...",  // ← 게시 시 저장됨
      width: 120
    }
  }]
}
```

### TemplatePartRenderer 로직
```typescript
// apps/main-site/src/components/TemplatePartRenderer.tsx

// isActive=false인 Template Parts는 필터링됨
const { templateParts } = useTemplateParts({ area: 'header' });

// templateParts.length === 0이면 null 반환
if (templateParts.length === 0) {
  return null;  // ← 헤더 렌더링 안 함
}
```

## 추가 개선 사항

향후 다음 기능 추가 권장:
1. Customizer 첫 진입 시 "헤더가 설정되지 않음" 안내 메시지
2. "게시" 전 미리보기 기능 강화
3. Template Parts 자동 생성 방지 (명시적 게시만 허용)
