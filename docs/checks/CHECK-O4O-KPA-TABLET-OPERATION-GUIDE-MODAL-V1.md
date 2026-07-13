# CHECK-O4O-KPA-TABLET-OPERATION-GUIDE-MODAL-V1

> WO: `WO-O4O-KPA-TABLET-OPERATION-GUIDE-MODAL-V1`
> 성격: 관리 화면 사용성 개선(UI only). 구현 + 배포 + smoke.
> Date: 2026-07-13

---

## 0. 결론

`/store/commerce/tablet-displays` 상단의 상시 노출 **크롬 태블릿 운영 안내** 박스를 제거하고, 헤더 **"운영 안내" 버튼 → 모달**로 옮겼다. 작업 영역(코너 목록·현재 화면 구성·Screen Set 편집)이 위로 올라온다.

- 안내는 삭제가 아니라 **접기**(버튼 클릭 시 모달). 문구는 현재 screen_set/content_list 구조에 맞게 정리.
- UI only — API/runtime/kiosk-core/schema/운영 데이터 무변경. typecheck 0.
- **모달 화면 클릭 smoke는 Deferred**(관리 화면 /login·자동 로그인 금지).

---

## 1. 변경 전 문제
- 상단에 `bg-sky-50` 안내 박스(7개 항목 `<ul>`)가 **항상 펼쳐져** 화면 상단을 크게 차지 → 코너 선택/현재 구성/편집 영역이 아래로 밀림.

## 2. 변경 후 구조
- 헤더 우측 버튼 그룹에 **"운영 안내"**(Info 아이콘) 버튼 추가(미리보기/추가/저장 옆).
- 상시 안내 박스 **제거** → 클릭 시 **모달**(제목 "크롬 태블릿 운영 안내").
- 닫기: **X · 배경 클릭 · ESC · '확인' 버튼** 모두 지원(`showGuide` state + keydown Escape effect).
- 상단이 헤더만 남아 작업 영역이 바로 위로 올라옴.

## 3. 모달 문구 (현재 구조 반영)
1. 크롬 브라우저에서 매장 태블릿 주소를 열어 사용합니다.
2. 홈 화면에 바로가기로 추가하면 주소 입력 없이 실행할 수 있습니다.
3. 화면 자동 꺼짐(절전) 시간을 매장 상황에 맞게 확인하세요.
4. 화면 구성을 바꾼 뒤에는 태블릿에서 새로고침하거나 다시 열어 최신 화면을 확인하세요.
5. '고객 화면 미리보기'로 실제 태블릿 화면을 미리 확인할 수 있습니다.
6. **고객 태블릿 화면에는 해당 코너에 적용된 화면 세트의 내용(코너 설명·콘텐츠·상품·QR·대기화면)이 표시됩니다.** (기존 "저장된 진열 구성만" → screen_set/content_list 반영)
7. **공개 URL에 tabletId가 포함되면 해당 코너/태블릿 화면이 표시됩니다. tabletId가 없거나 유효하지 않으면 기본 활성 태블릿 기준으로 표시됩니다.** (기존 "첫 번째 활성 태블릿 기준" → tabletId 우선 반영)

## 4. 변경 파일
```
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
```
- import Info 추가 · showGuide state + ESC effect · 헤더 '운영 안내' 버튼 · 상시 박스 → 모달 JSX 교체.

## 5. 금지 범위 준수
| 금지 | 준수 |
|------|------|
| DB migration / API / public runtime / kiosk-core / schema | ✅ 없음 |
| Screen Set·content_list 구조 변경 | ✅ 없음 |
| 상품/콘텐츠 seed · 운영 샘플 변경 · 새 템플릿 | ✅ 없음 |
| OPL/service_key·Supplier/Neture 혼합 | ✅ 없음 |
- UI only. 기존 코너 선택/공개 URL 복사/미리보기/Screen Set 편집기 동작 **무변경**(코드 미접촉).

## 6. typecheck / build
- web-kpa-society `tsc --noEmit`: **StoreTabletDisplaysPage 에러 0**.
- KPA 전용 페이지 → GP/KCos 무관.

## 7. browser smoke
- 배포: web deploy run 29229825980 **success**.
- 관리 화면 `/store/commerce/tablet-displays` → **`/login` 리다이렉트(미인증)**. 정책상 자동 로그인/체험계정 클릭 금지 → **모달 열기/닫기·레이아웃 화면 클릭 검증 Deferred**.
- 대체 검증: typecheck 0 + 코드(버튼/모달/ESC·X·배경·확인 닫기/문구 정리/상시 박스 제거). 인증 세션에서 후속 시각 확인 권장.

## 8. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 상단 긴 안내 박스 제거 | ✅ (코드) |
| '운영 안내' 버튼 추가 | ✅ |
| 모달로 안내 확인 | ✅ (X/ESC/배경/확인) |
| 문구 screen_set/content_list 구조 정합 | ✅ (§3) |
| 작업 영역 상향 | ✅ (상시 박스 제거) |
| 기존 관리 기능 불변 | ✅ (미접촉) |
| typecheck/build | ✅ |
| CHECK commit/push | ✅ |
| 시각 클릭 smoke | ⏸ Deferred(/login·자동 로그인 금지) |

---

*태블릿 관리 화면 상단 상시 운영 안내 박스 → 헤더 '운영 안내' 버튼+모달(X/ESC/배경/확인 닫기) · 문구를 screen_set/content_list·tabletId 구조에 맞게 정리 · UI only(API/runtime/schema/샘플 무변경) · typecheck 0 · 배포 success · 시각 클릭 Deferred(/login).*
