# 🧩 Task: 상품 커스터마이징 UI 개발 (`/products/customizer`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 이 프로젝트의 실제 작업 폴더는 다음과 같습니다:

- ✅ 정확한 경로:  
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\services\main-site
  Coding\main-site
  Coding\src\components
  ```

---

## 🎯 목적
판매자가 상품을 자신의 브랜드로 커스터마이징할 수 있는 화면을 제작합니다.  
라벨 업로드, 가격 설정, 실시간 미리보기 기능이 포함된 UI를 구성합니다.

---

## 📐 기능 및 레이아웃 구성

### 1. 상품 선택
- 드롭다운 또는 카드 리스트로 커스터마이징 가능한 상품 목록 노출

### 2. 라벨 업로드
- 판매자가 JPG/PNG 로고 업로드
- 드래그 앤 드롭 지원
- 업로드 후 실시간 미리보기 반영

### 3. 가격 설정
- 기본 제공가 + 판매자가 추가 마진 설정
- 실시간 최종 판매가 반영
- 입력 유효성 검사 포함

### 4. 상품 미리보기
- 이미지 기반 Mockup (병, 캡슐, 통 등)
- 사용자 입력 반영된 라벨 적용
- 미리보기 이미지 클릭 시 확대 보기 가능

---

## 💡 디자인 참고
- [Supliful](https://www.supliful.com/), [Blanka](https://www.blankabrand.com/)의 Product Editor
- 직관적이며 게임처럼 즐거운 인터랙션 중심

---

## 🧪 테스트 체크리스트
- 라벨 업로드 시 에러 없이 반영되는가?
- 가격 설정 후 실시간 반영되는가?
- 모바일 뷰에서도 UI가 정상 작동하는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/ProductCustomizer.tsx`

## 컴포넌트 구조 (추천)
- `/components/product/` 디렉토리에 다음 컴포넌트 생성:
  - `ProductSelector.tsx`
  - `LabelUploader.tsx`
  - `PriceInput.tsx`
  - `LivePreview.tsx`

## 작업 요청
1. `ProductCustomizer.tsx` 페이지에 위 컴포넌트를 조합하여 UI를 구성합니다.
2. TailwindCSS로 반응형 디자인을 적용합니다.
3. 상태관리는 local state로 우선 처리합니다 (필요 시 React Context 고려).
4. 이미지 미리보기는 간단한 이미지 + 라벨 overlay 방식으로 구성합니다.
5. 전체 페이지가 정상 렌더링되고 동작 테스트가 가능해야 합니다.
