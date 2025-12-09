# 🧾 Customizer Preview 제거 및 프리뷰 페이지 구축 – Phase-1 작업요청서

**작성일**: 2025-11-09
**목적**: iFrame 프리뷰 제거 후 잔여 코드 정리 및 `/preview/site-style` 전용 페이지 구축으로 Customizer 안정화 마무리
**선행 태그**: `customizer-reset-v1`

---

## 📍 1. 브랜치 & 범위

* **작업 브랜치:** `feature/customizer-phase1-cleanup`
* **기반 태그:** `customizer-reset-v1`
* **대상 디렉터리:**

  * `apps/admin-dashboard/` (미사용 iFrame 관련 코드 제거)
  * `apps/main-site/` (프리뷰 전용 페이지 생성)

---

## 🧹 2. Phase-1 삭제 목록

| 범주                     | 대상                                                              | 조치               | 리스크    |
| ---------------------- | --------------------------------------------------------------- | ---------------- | ------ |
| **iFrame 로더**          | `/pages/appearance/CustomizePreview.tsx`                        | 삭제               | Low    |
| **Bridge 훅**           | `/hooks/usePreviewBridge.ts`, `/hooks/usePostMessageHandler.ts` | 삭제               | Low    |
| **Message Channel**    | `/utils/previewMessageBus.ts`                                   | 삭제               | Low    |
| **프리뷰 전용 스타일/토큰**      | `/styles/preview.scss`, `/tokens/preview.ts`                    | 삭제               | Low    |
| **가드/컨텍스트**            | `PreviewContext.tsx`                                            | 삭제               | Low    |
| **라우트 등록**             | `router/index.tsx` 내 `/customize/preview`                       | 제거               | Low    |
| **postMessage 수신 핸들러** | `Customize.tsx` 내 window.addEventListener('message', …)         | 제거               | Medium |
| **프리뷰 플래그**            | `ENABLE_IFRAME_PREVIEW`                                         | 정의만 남기고 false 고정 | Low    |
| **프리뷰 관련 번역키**         | i18n `"preview_mode"` 등                                         | 삭제               | Low    |
| **프리뷰용 CSS 변수 주입기**    | `/lib/injectPreviewCSS.ts`                                      | 삭제               | Low    |

🧩 *모든 파일은 우선 `/deprecated/preview/`로 이동 후 1회 빌드 검증 후 완전 삭제.*

---

## 🎨 3. `/preview/site-style` 페이지 구성

**폴더:** `apps/main-site/src/pages/preview/site-style.tsx`

**목적:**
저장된 외모 설정(customizer.settings)을 시각적으로 확인.

### 섹션 구성

| 섹션                 | 내용                    | 표시 항목                           |
| ------------------ | --------------------- | ------------------------------- |
| **Header/Footer**  | 레이아웃 샘플               | 로고, 메뉴, 링크, 아이콘 (더미)            |
| **Site Identity**  | 사이트 타이틀/설명            | 로고 폭·타이틀 폰트·간격                  |
| **Colors**         | 팔레트 칩 + 버튼/링크 Hover   | primary, secondary, text, muted |
| **Typography**     | H1~H6, Body, Small    | responsive 크기 전환                |
| **Spacing/Layout** | 카드/섹션 여백 데모           | gap, padding, margin            |
| **Components**     | 버튼/Input/Badge/Alert  | 색상·폰트 반영                        |
| **Viewport 토글**    | Desktop/Tablet/Mobile | CSS mediaQuery toggle           |

### 상단 컨트롤 바

* 🔄 **Refresh** → 최신 설정 재적용 (`/api/v1/settings/customizer` GET)
* 🌐 **Open Frontend** → 새 탭으로 `/` 오픈

---

## 🧱 4. 데이터 흐름

1. 페이지 마운트 → `GET /api/v1/settings/customizer` → settings state 저장
2. 모든 섹션은 동일 어댑터(`normalizeCustomizerSettings`)로 데이터 보정 후 렌더
3. "Refresh" 클릭 시 1단계 재호출
4. 프리뷰는 **읽기 전용** (저장 없음)

---

## 🧩 5. 테스트 시나리오 (스모크)

| ID | 항목            | 합격 기준                             |
| -- | ------------- | --------------------------------- |
| S1 | 페이지 로드        | 콘솔 에러 0, 리로드 0                    |
| S2 | 색상 반영         | normal/hover 색상 반영 OK             |
| S3 | Responsive 토글 | desktop/tablet/mobile 폰트·간격 즉시 전환 |
| S4 | Refresh 버튼    | 저장 후 클릭 시 최신 반영                   |
| S5 | Front 열기      | 새 탭 `/` 정상 오픈                     |

---

## 📊 6. 완료 기준 (DoD)

* [ ] Admin iFrame 관련 코드 완전 제거
* [ ] `/preview/site-style` 정상 작동, 콘솔 에러 0
* [ ] 저장 후 Refresh로 최신 설정 즉시 반영
* [ ] Network `me|active` 호출 0
* [ ] 빌드 성공 + 번들 크기 감소 기록
* [ ] PR 제목: `chore(customizer): remove iframe preview and add standalone preview page`

---

## 🔖 7. 배포 및 문서화

1. PR Merge → main
2. 태그 생성: `customizer-preview-cleanup-v1`
3. 릴리스 노트:

   * "iFrame 프리뷰 제거 완료, 단일 `/preview/site-style` 페이지 추가"
   * "저장/검증 구조 단순화 및 안정화 완료"

---

## 📝 참고 문서

* `docs/dev/tasks/customizer_preview_off_hotfix.md` - Phase-0 핫픽스 완료 내역
* `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/normalize-settings.ts` - 데이터 어댑터

---

**최종 업데이트**: 2025-11-09
**담당자**: Local Agent
**상태**: 대기 중
