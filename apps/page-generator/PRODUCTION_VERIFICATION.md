# Page Generator App - 프로덕션 검증 가이드

**배포 일시**: 2025-12-01
**버전**: v1.4.0
**브랜치**: main
**커밋**: 3c46c5184

---

## 📋 배포 확인 체크리스트

### ✅ 1. 배포 상태 확인

#### Admin Dashboard 배포 확인
```bash
# 버전 확인
curl -s https://admin.neture.co.kr/version.json

# 예상 결과:
# {
#   "version": "2025.12.01-xxxx",
#   "buildDate": "2025-12-01T...",
#   "environment": "production"
# }
```

**현재 상태**: ✅ 정상 배포됨 (2025.12.01-0322)

---

## 🧪 프로덕션 검증 항목 (브라우저 테스트)

### ✅ 1. Page Generator 접근 테스트

#### 1-1. Admin Dashboard 로그인
1. 브라우저에서 https://admin.neture.co.kr 접속
2. 로그인 (JWT 토큰 발급)
3. 메인 대시보드 확인

#### 1-2. Page Generator 메뉴 확인
- [ ] 좌측 사이드바에 "Page Generator" 메뉴 존재
- [ ] 메뉴 클릭 시 정상 페이지 로드
- [ ] URL: `/page-generator` 또는 적절한 경로

---

### ✅ 2. JSX → Block 변환 테스트

#### 2-1. 기본 변환 테스트
**테스트 JSX 코드**:
```jsx
export default function SimplePage() {
  return (
    <div className="px-4 py-20">
      <h1 className="text-4xl text-center">Hello World</h1>
      <p className="text-lg text-center">This is a test page</p>
      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg">
        Click Me
      </button>
    </div>
  );
}
```

**검증 항목**:
- [ ] JSX 에디터에 코드 입력 가능
- [ ] "변환" 버튼 클릭 시 Block JSON 생성
- [ ] Block Viewer에 변환된 JSON 표시
- [ ] 총 4개 블록 생성 (group, heading, paragraph, button)
- [ ] Placeholder 없음

---

### ✅ 3. Transform/Animation 속성 검증

#### 3-1. Transform 테스트
**테스트 JSX 코드**:
```jsx
export default function TransformTest() {
  return (
    <div className="px-4 py-16">
      <div className="p-4 bg-blue-500 rounded translate-x-4">
        Translate X
      </div>
      <div className="p-4 bg-green-500 rounded scale-105">
        Scale 105
      </div>
      <div className="p-4 bg-red-500 rounded rotate-12">
        Rotate 12deg
      </div>
    </div>
  );
}
```

**검증 항목**:
- [ ] 변환된 JSON에 `transform` 속성 존재
- [ ] `translate-x-4` → `{ "translateX": 16 }`
- [ ] `scale-105` → `{ "scale": 1.05 }`
- [ ] `rotate-12` → `{ "rotate": 12 }`

#### 3-2. Transition 테스트
**테스트 JSX 코드**:
```jsx
export default function TransitionTest() {
  return (
    <div className="px-4 py-16">
      <button className="px-6 py-3 bg-blue-600 text-white rounded transition duration-300 ease-in-out">
        Hover Me
      </button>
    </div>
  );
}
```

**검증 항목**:
- [ ] 변환된 JSON에 `transition` 속성 존재
- [ ] `transition` → `{ "property": "all", "duration": 300, "ease": "ease-in-out" }`

#### 3-3. Animation 테스트
**테스트 JSX 코드**:
```jsx
export default function AnimationTest() {
  return (
    <div className="px-4 py-16 flex gap-8">
      <div className="w-16 h-16 bg-blue-500 rounded-full animate-spin"></div>
      <div className="w-16 h-16 bg-green-500 rounded-full animate-pulse"></div>
      <div className="w-16 h-16 bg-red-500 rounded animate-bounce"></div>
      <div className="w-16 h-16 bg-purple-500 rounded-full animate-ping"></div>
    </div>
  );
}
```

**검증 항목**:
- [ ] `animate-spin` → `{ "animation": "spin" }`
- [ ] `animate-pulse` → `{ "animation": "pulse" }`
- [ ] `animate-bounce` → `{ "animation": "bounce" }`
- [ ] `animate-ping` → `{ "animation": "ping" }`

---

### ✅ 4. Placeholder 기능 검증

#### 4-1. 커스텀 컴포넌트 테스트
**테스트 JSX 코드**:
```jsx
function CustomComponent({ title }) {
  return <div>{title}</div>;
}

export default function PlaceholderTest() {
  return (
    <div className="px-4 py-16">
      <h1 className="text-3xl">Test Page</h1>
      <CustomComponent title="Custom Content" />
      <p className="text-lg">End of page</p>
    </div>
  );
}
```

**검증 항목**:
- [ ] 변환된 JSON에 `o4o/placeholder` 블록 생성
- [ ] Placeholder 목록에 "CustomComponent" 표시
- [ ] componentName, reason, props 정보 정확히 표시
- [ ] 총 4개 블록 생성 (group, heading, placeholder, paragraph)
- [ ] 통계: placeholderCount = 1

---

### ✅ 5. 페이지 생성 기능 검증

#### 5-1. 페이지 정보 입력
- [ ] 페이지 제목 입력 필드 존재
- [ ] Slug 자동 생성 또는 수동 입력 가능
- [ ] Status 선택 (draft/published)
- [ ] Type 선택 (page/post 등)

#### 5-2. API 연동 테스트
**사전 조건**:
- API 서버 정상 작동 확인 필요
- JWT 토큰 유효성 확인

**검증 항목**:
- [ ] "페이지 생성" 버튼 클릭
- [ ] API 요청 성공 (Network 탭 확인)
- [ ] 성공 메시지 표시
- [ ] 생성된 페이지 ID 반환

#### 5-3. Admin Dashboard 확인
- [ ] Admin Dashboard > Pages 메뉴 이동
- [ ] 생성된 페이지 목록에 표시
- [ ] 페이지 클릭 시 상세 정보 확인
- [ ] Block JSON이 정확히 저장됨

---

### ✅ 6. JWT 자동 Refresh 검증

#### 6-1. 토큰 만료 시나리오
**테스트 방법**:
1. 브라우저 DevTools > Application > Local Storage 열기
2. `o4o_access_token` 값 확인
3. 15분 대기 (또는 수동으로 만료된 토큰으로 교체)
4. Page Generator에서 "페이지 생성" 시도

**검증 항목**:
- [ ] 401 Unauthorized 발생 시 자동 refresh 시도
- [ ] Refresh Token으로 새 Access Token 발급
- [ ] 원래 요청 재시도 성공
- [ ] 사용자는 에러 없이 정상 작동 경험

#### 6-2. Network 탭 확인
- [ ] `/api/auth/refresh` 요청 발생
- [ ] 새 토큰으로 Authorization 헤더 업데이트
- [ ] 재시도된 API 요청 성공

---

## 🐛 알려진 이슈

### API 서버 상태
**현재 상태**: API 서버 502 Bad Gateway 발생 중
```bash
curl -s https://api.neture.co.kr/health
# → 502 Bad Gateway
```

**영향 범위**:
- Page Generator의 "페이지 생성" 기능 사용 불가
- JSX → Block 변환은 **정상 작동** (프론트엔드 로직)
- Block JSON 확인 및 Placeholder 처리는 **정상 작동**

**해결 방법**:
1. API 서버 재시작 필요
2. PM2 프로세스 확인:
   ```bash
   ssh o4o-api
   pm2 list
   pm2 restart o4o-api-server
   ```

---

## 📊 변환 성능 벤치마크

### Phase 7 최종 성과

| 항목 | 수치 |
|------|------|
| **지원 Tailwind 클래스** | 18개 카테고리 |
| **변환 성공률** | **97.6%** |
| **총 테스트 블록** | 212개 |
| **성공 변환** | 207개 |
| **Placeholder** | 5개 (2.4%) |
| **프로덕션 빌드 크기** | 272 KB (gzipped) |

### 지원 기능 목록

#### Transform (Phase 7)
- ✅ translateX, translateY
- ✅ scale, scaleX, scaleY
- ✅ rotate
- ✅ skewX, skewY
- ✅ transform-origin (9개 위치)

#### Transition (Phase 7)
- ✅ property (all, colors, opacity, shadow, transform)
- ✅ duration (밀리초)
- ✅ easing (linear, ease-in, ease-out, ease-in-out)
- ✅ delay (밀리초)

#### Animation (Phase 7)
- ✅ spin (360도 회전)
- ✅ pulse (투명도 변화)
- ✅ bounce (상하 튀기기)
- ✅ ping (확대 + 투명도)

#### Positioning (Phase 6)
- ✅ relative, absolute, fixed
- ✅ top, right, bottom, left
- ✅ inset (shorthand)
- ✅ z-index (0-50)

#### Appearance (Phase 5)
- ✅ opacity (0-100 → 0-1)
- ✅ shadow (sm, md, lg, xl, 2xl)
- ✅ backdrop-blur (sm, md, lg, xl, 2xl, 3xl)
- ✅ alpha colors (bg-white/50 → rgba)

---

## 🎯 검증 완료 기준

### 최소 검증 항목 (필수)
- [ ] Page Generator 메뉴 접근 가능
- [ ] JSX 입력 및 변환 정상 작동
- [ ] Transform 속성 정확히 파싱
- [ ] Animation 속성 정확히 파싱
- [ ] Placeholder 블록 정상 생성

### 전체 검증 항목 (권장)
- [ ] 위 최소 항목 모두 통과
- [ ] Transition 속성 정확히 파싱
- [ ] 페이지 생성 API 연동 성공
- [ ] JWT 자동 refresh 정상 작동
- [ ] Admin Dashboard에서 생성된 페이지 확인 가능

---

## 🚀 다음 단계 (검증 완료 후)

### Option A: Phase 8 - Pseudo-class 지원
- hover:*, active:*, focus:* 상태 구조 설계
- 상태별 속성 매핑 (hover시 색상 변경 등)
- Block JSON에 상태 정보 추가

### Option B: Phase 9 - Template Factory
- 자주 사용하는 패턴을 템플릿으로 저장
- 템플릿 라이브러리 구축
- 원클릭 템플릿 적용

### Option C: Phase 10 - App Store Integration
- Page Generator를 App Store에 등록
- 앱 매니페스트 작성
- 의존성 관리 및 버전 제어

---

**작성 일시**: 2025-12-01
**작성자**: Claude Code
**최종 검토**: Phase 7 완료 후
