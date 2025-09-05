# 🚀 O4O Platform 실전 테스트 가이드

## 🎯 테스트 목표
**"WordPress와 동일한 사용 경험"** - Admin에서 홈페이지를 편집하고 Main-site에서 즉시 확인!

---

## 📋 사전 준비

### 1. 서버 실행 확인
```bash
# 프로젝트 루트에서
pnpm run dev
```

### 2. 접속 URL
- **Admin Dashboard**: http://localhost:3001
- **Main Site**: http://localhost:3000
- **API Server**: http://localhost:4000

---

## 🧪 테스트 시나리오

### Step 1: Admin Dashboard 접속
1. 브라우저에서 http://localhost:3001 접속
2. 로그인 화면이 나타나면 임시 계정으로 로그인
   - Email: admin@example.com
   - Password: password123

### Step 2: 홈페이지 편집기 접근
1. 좌측 사이드바에서 **"콘텐츠 관리"** 클릭
2. 하위 메뉴에서 **"홈페이지 편집"** 클릭
3. 홈페이지 편집기가 열립니다

### Step 3: 블록 추가 및 편집
1. **Hero Section 추가**
   - 좌측 패널에서 "Hero Section" 클릭
   - 제목: "Welcome to Our Platform"
   - 부제목: "Build Amazing Websites"
   - 버튼 추가 가능

2. **Heading 추가**
   - "Heading" 블록 클릭
   - 텍스트: "Our Features"
   - 레벨: H2

3. **Paragraph 추가**
   - "Paragraph" 블록 클릭
   - 내용 입력

4. **Button 추가**
   - "Button" 블록 클릭
   - 텍스트: "Get Started"
   - URL: "/signup"

### Step 4: 블록 관리
- **순서 변경**: 블록 우측의 ↑↓ 버튼으로 이동
- **삭제**: 블록 우측의 🗑️ 버튼
- **편집**: 블록 클릭 후 좌측 패널에서 설정 변경

### Step 5: 저장 및 발행
1. 상단의 **"Save"** 버튼 클릭 (임시 저장)
2. **"Publish"** 버튼 클릭 (실제 발행)
3. "Homepage published successfully!" 알림 확인

### Step 6: Main-site에서 확인
1. 새 탭에서 http://localhost:3000 접속
2. Admin에서 편집한 내용이 반영되었는지 확인
3. 페이지 새로고침하여 최신 내용 확인

---

## 🔧 문제 해결

### API 서버 연결 실패
- Mock 모드가 활성화되어 있으므로 DB 없이도 동작합니다
- `.env` 파일에서 `USE_MOCK=true` 확인

### 템플릿을 찾을 수 없음
- 첫 실행 시 자동으로 기본 템플릿이 생성됩니다
- Admin에서 직접 생성도 가능합니다

### 변경사항이 반영되지 않음
1. "Publish" 버튼을 클릭했는지 확인
2. Main-site 페이지를 새로고침
3. 브라우저 캐시 삭제 (Ctrl+Shift+R)

---

## ✨ 고급 기능

### 블록 설정
각 블록을 클릭하면 좌측 패널에서 상세 설정 가능:
- Hero: 배경 이미지, 오버레이, 높이
- Heading: 텍스트 정렬, 크기
- Image: 크기, 정렬, 캡션
- Button: 스타일, 색상, 크기

### 미리보기
편집기 상단의 "Preview" 버튼으로 편집 중인 내용을 미리 확인

---

## 🎉 축하합니다!
WordPress 스타일의 홈페이지 편집 시스템이 완성되었습니다!
Admin에서 자유롭게 편집하고 Main-site에서 즉시 확인하세요.