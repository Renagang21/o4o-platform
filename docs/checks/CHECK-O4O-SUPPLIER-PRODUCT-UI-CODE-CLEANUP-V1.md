# 공급자 상품 UI 코드 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거 WO**: [WO-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1](../work-orders/WO-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)

## 검증 대상과 결과

main `f66ed5f5f` + 앞선 미통합 승인 작업 `8f671674c` 기반의 독립 branch에서 검사했다.
Node 22.18.0/pnpm 10.25.0, frozen install 및 web dependency build 후 수행했다.
실제 화면을 렌더하되 API 응답은 fixture다. 운영 계정·DB·실제 외부 발송/승인/가격 변경은 사용하지 않았다.

| 검사 | 결과 |
|---|---|
| 신규 화면 상호작용 검사, 수정 전 원래 코드 | 2 files / 28 tests PASS |
| 동일 화면 검사, 수정 후 | 28 tests PASS |
| 전체 web-neture 회귀 | 76 files / 660 tests PASS, unhandled error 0 |
| web-neture tsc + Vite build | PASS. 기존 큰 chunk 안내 유지 |
| 변경 파일 ESLint | 오류 0 / 경고 0 |
| 원래 코드 대비 AST 비교 | 24 항목 PASS — mutation 본문·base column schema·조회 effect 의존성 보존 |
| PC 1440px/mobile 390px browser | 원래/수정 후 각 18개 흐름 PASS. JS page error 0 |
| browser 전후 비교 | 컬럼 이름/순서·Drawer bounds·API 호출 순서/전송값 동일 |
| main 통합/배포/실계정 | NOT_RUN — 사용자 종료 범위/유예 |

브라우저는 실제 EditableDataTable, ProductForm, RichTextEditor 및 기존 상세 섹션을 사용했다.
API/auth/template/media I/O는 독립 harness의 fixture로 대체하고 외부 요청을 차단했다.
18개는 2 viewport × 9개 업무 흐름이다. 실운영 기능 성공을 의미하지 않는다.
Vitest의 form/table/editor 내부 adapter 검사와 실제 공통 UI의 browser 검사를 구분했다.

## 확인한 동작

- 목록 실패/정상 0건/필터 0건, 카운트 독립 오류와 retry
- 검색·승인 탭 query, 현재 페이지를 유지한 승인 후 rows/count 동시 갱신
- 승인 취소/제외 사유, 일괄 삭제/저장 부분 실패 표시, 선택 해제
- Drawer 진입/저장 후 목록 갱신, 연속 작업의 다음 미완성 행 이동
- B2B-only 설명 저장과 nullable trim, offer-only payload, offer 실패 시 후속 B2B 호출 중단
- offer 성공 후 B2B 실패 안내와 기존 갱신/편집 종료 계약
- dirty-close/Escape 확인, clean Escape 편집 취소, 상품 전환 초기화
- 이미지 등록/업로드/삭제 실패 시 오류 안내와 성공 callback 부재
- 스팟 정책 forbidden/load/정상 0건, stale 응답 거부, 생성 후 재조회 실패 구분
- 서비스 가격 입력 검증과 저장/재조회, 공급 서비스 철회 확인, Operator 승인 callback

초기 전체 테스트에서 연속 작업의 지연 스크롤이 jsdom 종료 후 실행됐다.
검사가 실제 스크롤 실행까지 기다리도록 보완한 후 전체 회귀를 재실행해 unhandled error 0을 확인했다.
제품의 타이머 동작을 검사 통과 목적으로 삭제하거나 assertion을 약화하지 않았다.

## 확인된 기존 한계와 인계

모바일 390px에서 Drawer 폭은 기존/수정 후 모두 480px, x=-90이다.
왼쪽 제목/내용 일부가 잘린다. 이번 책임 분리에서 layout을 변경하지 않았으므로 **모바일 사용성 개선 완료로 판정하지 않는다**.
모바일 폭 보완과 실계정 검증은 후속 대상이다. 운영 요청의 동시성/권한 구현/네트워크 실패를 fixture로 완전 검증했다고 주장하지 않는다.

검증 로그/JSON/스크린샷은 `/workspace/artifacts/supplier-code-phase1-*`와
`/workspace/artifacts/supplier-phase1-browser/`에 보존했다. 검증용 로컬 서버는 작업 종료 시 중지했다.

구현 commit `17c255e82fc82b60f01763bd230f6f9bf1e5da09`의 branch push와 원격 일치를 확인했다.
이번 Git 인계는 main PR/merge·CI Gate·운영 배포 검증을 포함하지 않는다.

문서 정합: 정본 의미 변경 없음. 모바일 한계는 이번 검증 기록에 명시.
