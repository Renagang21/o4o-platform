# CMS View 프리뷰 기능 테스트

## 테스트 담당자
antigravity

## 테스트 날짜
2025-12-07

## 테스트 목적
CMS V2에서 생성한 View Template이 Main Site에서 정상적으로 프리뷰되는지 확인

---

## 사전 준비

### 1. 브라우저 캐시 클리어
- Chrome: `Ctrl + Shift + R` (Windows) 또는 `Cmd + Shift + R` (Mac)
- 완전히 새로고침하여 최신 번들 로드 확인

### 2. 접속 URL
- Admin Dashboard: https://admin.neture.co.kr
- Main Site: https://neture.co.kr

### 3. 테스트 데이터
- 기존 View: `e2e-test-view` (이미 생성됨)
- 새로 생성할 View: 아래 시나리오 참고

---

## 테스트 시나리오

### ✅ 시나리오 1: 기존 View 프리뷰 테스트

**목표:** 이미 생성된 `e2e-test-view`가 정상적으로 프리뷰되는지 확인

**단계:**
1. Admin Dashboard 로그인: https://admin.neture.co.kr
2. 좌측 메뉴: **CMS** > **View Templates** 클릭
3. 목록에서 **"E2E Test View"** 찾기
4. 우측 액션 버튼에서 **눈 아이콘 (Preview)** 클릭

**예상 결과:**
- ✅ Preview 모달이 열림
- ✅ 모달 헤더에 "Preview: e2e-test-view" 표시
- ✅ iframe 내부에 **"E테스트"** 텍스트가 보임
- ✅ 텍스트 스타일: 기본 크기, 왼쪽 정렬, 검은색

**확인 사항:**
- [ ] Preview 모달이 열리는가?
- [ ] iframe 로딩이 완료되는가?
- [ ] "E테스트" 텍스트가 화면에 보이는가?
- [ ] 브라우저 콘솔에 에러가 없는가? (F12 > Console 탭)

**실패 시 캡처:**
- 스크린샷: 전체 화면
- 콘솔 에러 로그: F12 > Console 탭의 빨간색 에러

---

### ✅ 시나리오 2: Visual Designer에서 Preview 테스트

**목표:** Designer에서 블록을 편집한 후 프리뷰가 즉시 반영되는지 확인

**단계:**
1. View Templates 목록에서 **"E2E Test View"** 선택
2. 우측 액션에서 **팔레트 아이콘 (Visual Designer)** 클릭
3. Designer 화면에서 Text 블록의 텍스트를 **"테스트 성공!"**으로 수정
4. 우측 상단 **Save** 버튼 클릭
5. 저장 후 **Preview** 버튼 클릭

**예상 결과:**
- ✅ Preview 모달에 **"테스트 성공!"** 텍스트가 표시됨
- ✅ 이전 텍스트 "E테스트"가 아닌 새 텍스트가 보임

**확인 사항:**
- [ ] Designer에서 텍스트 수정이 가능한가?
- [ ] Save 후 Preview에 변경사항이 반영되는가?
- [ ] Preview 새로고침 버튼이 작동하는가?

---

### ✅ 시나리오 3: 새 View 생성 및 프리뷰

**목표:** 처음부터 새로운 View를 만들고 프리뷰까지 테스트

**단계:**
1. View Templates 목록에서 **Create New View** 버튼 클릭
2. 기본 정보 입력:
   - **Name**: `Test View 2`
   - **Slug**: `test-view-2`
   - **Type**: `Page`
   - **Status**: `Active`
3. **Visual Designer** 버튼 클릭
4. 좌측 블록 패널에서 **Text 블록** 드래그하여 캔버스에 추가
5. Text 블록 클릭 후 우측 Properties에서:
   - **Text**: `안녕하세요, 새로운 View입니다.`
   - **Size**: `2xl`
   - **Align**: `center`
   - **Color**: `#0066CC` (파란색)
6. **Save** 버튼 클릭
7. **Preview** 버튼 클릭

**예상 결과:**
- ✅ 큰 파란색 텍스트가 중앙 정렬로 표시됨
- ✅ 내용: "안녕하세요, 새로운 View입니다."

**확인 사항:**
- [ ] Visual Designer에서 블록 추가가 가능한가?
- [ ] Properties 패널에서 속성 변경이 가능한가?
- [ ] 변경한 속성(크기, 정렬, 색상)이 Preview에 반영되는가?

---

### ✅ 시나리오 4: 여러 블록 조합 테스트

**목표:** Text 블록 여러 개를 조합하여 프리뷰

**단계:**
1. `test-view-2` Visual Designer 열기
2. 추가 Text 블록 3개 더 추가:
   - **블록 1**: "제목", size=4xl, weight=bold, align=center
   - **블록 2**: "부제목", size=xl, color=#666666, align=center
   - **블록 3**: "본문 내용입니다.", size=base, align=left
3. Save 후 Preview

**예상 결과:**
- ✅ 4개의 Text 블록이 순서대로 표시됨
- ✅ 각 블록의 스타일이 설정한 대로 적용됨

**확인 사항:**
- [ ] 여러 블록이 순서대로 렌더링되는가?
- [ ] 각 블록의 독립적인 스타일이 유지되는가?

---

### ✅ 시나리오 5: Main Site 직접 접속 테스트

**목표:** Admin을 거치지 않고 Main Site에서 직접 View 접근

**단계:**
1. 새 브라우저 탭 열기
2. URL 입력: `https://neture.co.kr/e2e-test-view?preview=1`
3. Enter

**예상 결과:**
- ✅ Main Site에서 View가 정상 렌더링됨
- ✅ Admin Preview와 동일한 내용 표시

**확인 사항:**
- [ ] Main Site에서 직접 접근이 가능한가?
- [ ] 렌더링된 내용이 Admin Preview와 일치하는가?

---

### ✅ 시나리오 6: 반응형 테스트 (Mobile/Desktop)

**목표:** Preview의 뷰포트 전환 기능 테스트

**단계:**
1. `e2e-test-view` Preview 열기
2. Preview 모달 상단의 **모니터 아이콘** 클릭 (Desktop ↔ Mobile 전환)
3. Mobile 뷰에서 렌더링 확인
4. 다시 Desktop 뷰로 전환

**예상 결과:**
- ✅ Mobile 뷰: 375px × 667px 크기로 프리뷰
- ✅ Desktop 뷰: 전체 크기로 프리뷰
- ✅ 두 뷰포트 모두 정상 렌더링

**확인 사항:**
- [ ] 뷰포트 전환 버튼이 작동하는가?
- [ ] Mobile/Desktop 모두 정상 렌더링되는가?

---

## 알려진 이슈 및 제한사항

### 🔴 현재 지원하는 블록
- ✅ **Text**: 텍스트 표시 (size, align, color, weight 지원)

### ⚠️ 아직 미구현 블록
- ❌ **Image**: 이미지 표시
- ❌ **Button**: 버튼
- ❌ **Container**: 레이아웃 컨테이너
- ❌ **Grid**: 그리드 레이아웃
- ❌ **Hero**: 히어로 섹션

**미구현 블록 사용 시:**
- "Component not found: [블록타입]" 에러 메시지 표시
- 이는 정상 동작이며, 향후 추가 예정

### 🐛 별도 확인 필요 이슈
- AppStore "require is not defined" 에러 (View 프리뷰와 무관, 별도 수정 필요)

---

## 테스트 결과 보고

### 테스트 완료 체크리스트
- [ ] 시나리오 1: 기존 View 프리뷰
- [ ] 시나리오 2: Designer 편집 후 프리뷰
- [ ] 시나리오 3: 새 View 생성 및 프리뷰
- [ ] 시나리오 4: 여러 블록 조합
- [ ] 시나리오 5: Main Site 직접 접속
- [ ] 시나리오 6: 반응형 테스트

### 발견된 버그
1. **버그 제목**:
   - **재현 방법**:
   - **예상 결과**:
   - **실제 결과**:
   - **스크린샷**:
   - **콘솔 에러**:

2. **버그 제목**:
   - (위와 동일한 형식으로 작성)

### 개선 제안
-

---

## 참고 사항

### 디버깅용 콘솔 로그
Preview 실행 시 브라우저 콘솔(F12)에 다음 로그가 표시됩니다:
```
[loadCMSView] Starting for slug: e2e-test-view, preview: true
[fetchPageBySlug] Response status: 404
[fetchViewBySlug] Response status: 200
[loadCMSView] View preview created successfully
```

이 로그가 정상적으로 보이면 백엔드는 정상 작동 중입니다.

### 에러 발생 시
1. **스크린샷 캡처** (전체 화면)
2. **브라우저 콘솔 로그 캡처** (F12 > Console 탭)
3. **Network 탭 확인** (F12 > Network 탭, 실패한 요청 확인)
4. 위 정보를 개발자에게 전달

---

## 연락처
- 개발자: Claude
- 테스터: antigravity
- 테스트 일시: 2025-12-07
