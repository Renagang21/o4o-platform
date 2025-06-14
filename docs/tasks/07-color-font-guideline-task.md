# 🧩 Task: 컬러·타이포그래피 UI 가이드라인 적용

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 이 작업은 다음 경로에 공통 UI 스타일로 반영되어야 합니다:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\theme-guide
  Coding\components-only
  Coding\main-site\assets
  ```

---

## 🎯 목적
브랜드 일관성을 유지하고 사용자 인지성과 가독성을 향상시키기 위해  
컬러 팔레트와 기본 폰트 스타일을 일관되게 정의하고 적용합니다.

---

## 🎨 컬러 가이드라인

| 구분         | 색상 코드 예시 | 용도 예시                    |
|------------|---------------|----------------------------|
| Primary    | #0052cc       | CTA 버튼, 강조 문구             |
| Secondary  | #e6f0ff       | 배경, 보조 버튼, 카드 배경         |
| Success    | #1bc47d       | 성공 메시지, 승인 배지 등         |
| Danger     | #e74c3c       | 오류 메시지, 경고 등             |
| Text Main  | #1f2937       | 기본 텍스트 색상                |
| Disabled   | #9ca3af       | 비활성 버튼, 입력창 등           |

> ※ 건강/의료: 블루·화이트 계열 중심,  
> 뷰티/화장품: 핑크·라벤더 포인트 컬러를 섹션에 따라 추가 적용 가능

---

## 🔤 타이포그래피 가이드라인

- 기본 폰트: **Pretendard**, Noto Sans (Sans-serif 계열)
- 제목: `text-2xl`, `font-semibold`
- 본문: `text-base`, `leading-relaxed`
- 보조설명: `text-sm`, `text-gray-500`
- 버튼 텍스트: `text-sm`, `font-medium`, `tracking-wide`

---

## 💡 참고
- TailwindCSS 기반 테마 변수 적용 (`tailwind.config.ts`)
- 다크모드 대비 색상도 고려 (다크모드는 차후 단계에서 설정 예정)

---

## 🧪 테스트 체크리스트
- Tailwind 커스터마이징된 테마가 모든 페이지에 정상 적용되는가?
- 버튼/텍스트 색상과 폰트가 일관되게 유지되는가?
- 모바일/데스크탑에서 타이포그래피 가독성이 확보되는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/tailwind.config.ts`
- 전체 `/components/` 디렉토리 내 스타일 참조

## 작업 요청
1. 위 가이드에 따라 Tailwind의 테마 색상 및 폰트를 설정하세요.
2. 커스텀 색상은 `theme.extend.colors`에 지정하고, 텍스트 계열은 `fontFamily`에 반영하세요.
3. 테스트용으로 샘플 컴포넌트(`ColorTypographySample.tsx`)를 생성하여 브라우저에서 확인하세요.
