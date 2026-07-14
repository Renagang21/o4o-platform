# CHECK-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1

> WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1 구현 결과.
> 태블릿 관리 화면을 **[코너별 운영] / [태블릿 콘텐츠]** 두 탭으로 분리.

## 범위

- **코너별 운영**: 코너 선택 → 현재 사용 중인 화면 세트 확인 → 다른 세트로 **교체** → 실제 태블릿 **화면 열기**. 세트 원본 수정·생성·보관은 없음.
- **태블릿 콘텐츠**: 매장 전체 화면 세트(콘텐츠 원본) **카드 목록**. 카드마다 이름 / 템플릿명 / 블록 수 / **사용 중인 코너** + `[미리보기]` `[수정]` `[보관]`. 새 세트 생성.

프론트 UI 재배치 중심. **DB / API / public runtime / kiosk-core 무변경.**

## 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | `mode: 'corner' \| 'library'` + `tablets` prop 추가. corner=현재 사용 중+교체(적용/해제)만, library=목록·수정·보관·생성. 단일 소비처(아래 페이지)만 사용. |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 상단 탭 바 추가, 헤더 간소화, 코너 상세 축소(legacy 편집기 접이식 이동), 콘텐츠 탭 렌더. |

라우트 무변경: `commerce/tablet-displays` (KPA `App.tsx`).

## 결정 및 WO 대비 편차 (근거)

1. **`[삭제]` → `[보관]` 로 수렴.**
   백엔드에 화면 세트 **하드 삭제 API가 없음** — `DELETE /screen-sets/:id` 는 실제로 `archiveScreenSet`(보관, 적용 중이면 409 `SCREEN_SET_IN_USE`). WO의 "API 변경 금지"와 상충하므로 하드 삭제는 신설하지 않고, 소프트 삭제인 **보관**만 노출. (하드 삭제 필요 시 별도 백엔드 WO.)

2. **legacy 실행 편집기(대기화면·화면 설정·진열·서비스 공통 대기영상)는 삭제하지 않고 코너 상세 하단 접이식 "고급 설정"(기본 접힘)으로 이동.**
   공개 뷰어(kiosk-core)가 **아직 화면 세트를 소비하지 않아** 이 legacy 값들이 **현재 실제 고객 화면을 결정**한다. 완전 제거 시 라이브 고객 화면 설정을 편집할 유일한 경로가 사라져 **기능 은폐**(CLAUDE.md "기능 은폐 0")가 되므로 보존. primary 화면은 "교체·화면 열기" 중심으로 축소하되 legacy 는 접어서 유지.
   - 상단 헤더의 통합 `저장` 버튼 제거에 따라, 진열 저장은 진열 섹션(현재 태블릿 화면 구성) 헤더의 **`진열 저장`** 맥락 버튼으로 이동(대기화면 저장·화면 설정 저장은 기존대로 각 섹션 내 존재).

3. **`[미리보기]`** 는 후속 `PREVIEW-MODAL` WO 대상 → 카드에 **비활성 버튼(자리만)** 으로 배치.

4. **`복제`** 는 후속 WO → 버튼 미배치.

5. **코너별 표시·숨김** 은 후속 배정 WO → 이번 제외.

## 헤더 간소화

- 제거: `고객 화면 미리보기`(상단), 통합 `저장`, `코너 추가`(각 탭 맥락 버튼이 이미 존재).
- 유지: `운영 안내`(도움말 모달).
- 신설: 상단 탭 바 `[코너별 운영] [태블릿 콘텐츠]`.

## 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` | ✅ EXIT=0 (에러 0) |
| `vite build` | ✅ EXIT=0 (`StoreTabletDisplaysPage` 청크 정상 빌드) |
| 탭 전환 [코너별 운영]/[태블릿 콘텐츠] | 코드 경로 확인 (`activeTab` 게이트) |
| 코너 카드 홈 유지 | ✅ (기존 코너 카드 홈 재사용, corners 탭 게이트) |
| 콘텐츠 카드 목록 표시 | ✅ (`mode='library'`, `fetchScreenSets()` 전체) |
| 사용 중인 코너 표시 | ✅ (`tablets[].currentScreenSetId` → 세트별 코너명 매핑) |
| 콘텐츠 수정 진입 | ✅ (`수정` → 기존 편집 패널/블록/콘텐츠 목록 재사용) |
| 보관 정책 유지 | ✅ (`archiveScreenSet`, 적용 중 409 처리 기존과 동일) |
| legacy 기능 보존 | ✅ (접이식 고급 설정으로 이동, 삭제 아님) |
| 모바일/태블릿 폭 | 반응형 클래스 유지(`grid`, `min-h-[44px]` 터치 타깃) |

> 배포 후 브라우저 스모크(약국 계정 `renagang21`, SSOT=`docs/local/TEST-ACCOUNTS.local.md`): 탭 전환 / 코너 교체(적용·해제) / 콘텐츠 목록·수정·보관 / 고급 설정 접이 동작을 실측 권장(성공·실패 toast + API success/error 확인).

## 다음 단계 (병렬 가능)

- `SCREEN-SET-DUPLICATE-V1` (복제)
- `CONTENT-PREVIEW-MODAL-V1` (미리보기 모달 — 콘텐츠 탭 `[미리보기]` 버튼 연결)
- 코너별 표시·숨김 배정 WO
- (필요 시) 화면 세트 하드 삭제 백엔드 WO
