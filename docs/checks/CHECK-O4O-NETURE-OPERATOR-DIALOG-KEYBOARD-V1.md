# Neture 운영자 대화상자 키보드 검증

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **연결 WO**: [WO](../work-orders/WO-O4O-NETURE-OPERATOR-DIALOG-KEYBOARD-V1.md)

## 변경

시각적으로 모달을 표시하던 상품 상세·승인/거절/삭제 확인, 공급자 거절, 체험 해결 창에 앱 내부 native `showModal()` lifecycle을 적용했다. 입력 또는 안전한 취소/닫기 버튼을 먼저 포커스하고 Tab을 순환시킨다. 처리 중 비활성화된 컨트롤 대신 dialog에 초점을 유지한다. Escape와 cancel 이벤트가 부모 drawer/dialog까지 전파되지 않도록 하며, 중첩 취소는 부모의 호출 버튼으로 복귀한다. 성공으로 호출 row가 사라지면 페이지 제목을 fallback으로 사용한다.

React StrictMode 재마운트 시 원래 호출 요소를 보존하고 이전 cleanup의 지연 초점 복귀를 무효화했다. 기존 taxonomy lifecycle 및 공통 UI 패키지는 변경하지 않았다. 상품 상세의 backdrop 취소는 유지하고 승인/거절/삭제/해결 요청 및 권한 판정은 기존 함수를 사용한다.

## 검증

- Node 22.18.0 · pnpm 10.25.0 · npm 10.9.3, frozen offline 설치·공통 패키지 빌드.
- `pnpm --filter @o4o/web-neture build`: TypeScript 및 Vite build PASS.
- `pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=2`: 최종 104 files / 965 tests PASS.
- 신규 lifecycle 5건 및 공급자/체험 페이지의 초기 초점·취소·호출 버튼 복귀 회귀 2건 추가. jsdom은 lifecycle만 확인하며 native modality는 Chromium에서 검증한다.
- 변경 TS/TSX ESLint: 오류 0건. 체험 화면의 기존 Hook dependency 경고 2건은 범위 밖이며 유지했다.
- 실제 Chromium · React StrictMode · 1440/390/320px에서 상품 상세→중첩 거절, 공급자 상세→거절, 체험 포럼 연계 실패→해결을 9개 시나리오 PASS. 초기 초점, 양방향 Tab, 단계별 Escape, busy 닫기 차단, 실패 alert·메모 보존·재시도, 요청 메모 동일성을 확인했다.
- 추가로 각 viewport에서 상품 승인·삭제의 초기 초점·Escape 복귀와 쓰기 미발생, desktop 상품 상세 backdrop 취소3개 추가 시나리오 PASS.

브라우저 fixture는 실제 페이지와 컴파일된 CSS를 사용하고 API만 합성 응답으로 대체했다. 외부 요청은 차단했다. 스크린샷으로 320px 중첩 거절창의 입력·오류·버튼을 확인했다. fixture·스크린샷은 `/tmp`에 두고 커밋하지 않는다. 운영 로그인·운영 DB 쓰기·운영 배포 smoke는 수행하지 않았다. 기존 Browserslist 데이터 및 큰 chunk 경고는 비차단이다.

최종 브라우저 12개 시나리오 PASS이며 pageerror와 문서 가로 overflow는 0건이다. 개발 담당 종료점은 검증·커밋·push·PR 인계이며 병합·배포는 통합 담당 범위다.

문서 정합: WO·CHECK만 추가했으며 현행 정본은 변경하지 않았다.
