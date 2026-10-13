# Neture 상품 승인 표시·입력 책임 정비 CHECK

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [TODO](../work-orders/WO-NETURE-PRODUCT-APPROVAL-PRESENTATION-V1.md)

## 변경과 효과

기준 main `75a28d9313fc2be31cc53c12b94d566314748d75`에서 새 census 후 진행했다.
부모 1258→957줄. 감소는 파일 전체/분기 복잡성이 모두 해결됐다는 뜻이 아니다.
Neture 내부 Drawer는 상세 표시·부모 행동 전달, 결정 모달은 입력·오류·잠금 표시, 표시 모델은 기존 품질·규제·가격 계산을 담당한다.
부모가 조회·권한·API·선택·입력 상태·실패 보존·중복 전송 guard를 유지한다.
조회 본체와 승인/거절 실행 handler, 표시 helper 본문은 기준 main과 원문 대조해 그대로 유지됨을 확인했다.
모바일 카드 wrap/정보 폭을 확보해 상품명이 사라지지 않으며 결정 모달은 Drawer 위 z-60에 표시한다.
기존 깨진 안내 문자도 같은 화면에서 정정했다. 상품 삭제·정책·API·DB는 변경하지 않았다.

## 소비처 및 검증

| 소비처 | 영향 | 검증 |
|---|---|---|
| Neture `/operator/product-service-approvals` | 동일 page의 표시/입력 분리 | 기존 API·권한·실패·응답 순서 테스트 + browser |
| Neture `/admin/product-service-approvals` | 같은 page, route/guard 무변경 | page 단위 회귀·Neture 타입/build |
| 다른 서비스·공통 패키지·약사회 분회 | 새 컴포넌트/모델 소비처 없음, 변경 0 | 역방향 import 검색 |
| scripts/tools raw-source 검사 | 관련 소비처 검색 결과 없음 | 파일명·기존 helper/template 문자열 검색 |

- 실제 packages 선행 build 완료, frozen-lockfile offline install. 의존성/lockfile 변경 0.
- Neture 전체 Vitest: 83 files / 711 tests PASS. 추가 Drawer 진입·닫기·승인/거절 record ID/사유·template/cancel·읽기 전용·완료 사유 6 tests 포함.
- 최종 focused page 회귀: 4 files / 40 tests PASS.
- 실제 Neture `tsc --noEmit`, `pnpm run build` (tsc + Vite): PASS. 기존 chunk 크기 경고 유지.
- 변경 5개 TS/TSX 파일 eslint `--max-warnings 0`: PASS. `git diff --check`, docs 민감정보 검사 수행.
- Chromium 1440px/390px 실제 page/스타일/API adapter + 합성 operator/API fixture: 30 unique 시나리오 PASS.
- 실패·전체 실패·부분 성공/재시도 12건, 조회/분석/타이머/쓰기 재조회 14건, Drawer 시작 단건 승인/거절 실패/재시도 4건.
- Drawer 시나리오에서 상품명 width>40px, 결정 모달 viewport 내 위치, elementFromPoint로 Drawer 위 표시 확인; 버튼 직접 조작. uncaught page error 0.
- 최종 desktop/mobile screenshot 확인: 상품명·배지·행동 표시. 실계정 검증으로 보고하지 않는다.

## 잔여와 문서 정합

목록/분석·삭제 실패/대상 보존은 후속이며 서비스 간 공통화는 전체 정비 때만 판단한다. 약사회 분회 제외.
전체 TODO 두 문서에서 이미 배포된 작업과 이번 push 단위 완료를 구분했다. 과거 개별 WO/CHECK의 당시 미병합 기록은 보존했다.
종료는 commit/push다. 이번 작업의 PR 생성·main merge·배포는 하지 않는다. 실계정 검증은 사용자 담당이다.
WORKTREE_DISPOSITION: KEEP — 이 branch는 아직 미병합, 기존 작업공간 보존.
