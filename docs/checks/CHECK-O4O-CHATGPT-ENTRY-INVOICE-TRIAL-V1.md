# ChatGPT 연결 안내와 거래명세서 문서 보관 검증

> **상태**: ACTIVE
> **작성일**: 2026-11-14 · **최종 갱신**: 2026-11-14
> **근거**: 사용자 요청 · [사용 안내](../guides/O4O-CHATGPT-WORK-QUICKSTART-V1.md)

## 판정

1차 안내 구현과 2차 문서 보관의 격리 검증은 PASS. **실제 거래명세서의 ChatGPT 판독·사용자 확인·운영 저장은 미실행**이다. 실제 파일이 제공되지 않았다. 운영 DB 쓰기·LLM 공급자 호출·거래장 반영·주문 실행은 하지 않았다.

## 변경

- 기존 `/mypage/settings` 외부 AI 연결 카드에 접이식 이용 안내와 요청 예제 3개를 추가했다. 연결 없음·조회 실패 때도 안내를 볼 수 있다. 복사 성공·실패와 오래된 비동기 결과의 덮어쓰기를 처리한다.
- MCP의 `list_workspaces`, `get_material`, `save_content_draft` 설명을 보완했다. O4O 키워드는 선택 사항이며, 자료 정리와 명세서 문서 저장을 구체화했다. 파일 판독·원장 반영·주문 확정과 구분했다.
- 인증·권한·도구 스키마·모델 경로·운영 데이터는 변경하지 않았다. ChatGPT에서 이미 읽은 내용을 O4O가 다시 판독하는 기능은 추가하지 않았다.

## 합성 명세서

시험 자료는 API 테스트 옆 `apps/api-server/src/modules/external-ai/__tests__/fixtures/chatgpt-invoice-trial/`에 있다. 실제 인물·거래처·상품의 정보를 포함하지 않는다.

| 자료 | 용도 |
|---|---|
| `invoice.sample.html` · `invoice.sample.png` | 이미지 원본. A 3갑 × 1200 = 3600, B 2박스 × 2500 = 5000, C 수량 불명 × 700, 확인 가능한 합계 8600 |
| `reviewed-draft.html` | C 수량 4개라고 사용자가 정정한 상황을 **가정**한 저장 입력. C 2800, 합계 11400, 부가세 포함 여부는 계속 확인 필요 |

PNG를 브라우저로 생성하고 직접 열어 불명확한 값과 단위 표시를 확인했다. 별도 OCR 모델 호출·인식 정확도 측정은 하지 않았다. 정정 입력은 fixture이며 실제 사용자 승인을 받은 결과가 아니다.

## 자동 검증

- API Jest 4 suites / 50 tests 통과: 새 명세서 4건과 기존 MCP structured content·실행 경계·추론 소스 미호출 검사.
- 새 명세서 시험은 실제 `ExternalAiToolService` → `StoreAdapter` → 자료함 검증 함수를 사용한다. 저장소는 메모리 대역이며 인증 조회·권한 resolver는 격리했다. 실제 SQL DB 통합 시험이나 OAuth 전체 시험으로 해석하지 않는다.
- 표·금액·미확정 세금 표시 보존, 비공개 문서 상태·revision·열기 주소, 재시도 중복 방지, 저장 권한 부족 거절, 저장 도구의 첨부 입력 거절을 확인했다. 모의 쿼리에 거래장·장바구니·주문 쓰기가 없음을 확인했다.
- UI Vitest 3 files / 14 tests 통과: 새 안내 3, 연결 카드 4, 기존 동의 화면 7.
- API `tsconfig.build.json` 및 web-neture TypeScript 검사 통과. 변경 TypeScript 파일 ESLint 오류 없음.

주요 재실행 경로: API의 `invoice-document-trial.spec.ts`, `mcp-structured-content.spec.ts`, `content-execution-boundary.spec.ts`, `content-no-inference-source.spec.ts`; web-neture의 `ChatgptWorkGuide.test.tsx`, `ExternalAiConnectionsCard.test.tsx`, `ExternalAiConsentPage.test.tsx`.

## 브라우저 검증

로컬 Vite harness에서 실제 연결 카드 컴포넌트와 API 응답 fixture를 사용했다. Chromium의 1280px·390px 각 화면에서 연결 없음·조회 실패·연결됨 6조합을 확인했다. 안내 펼치기·예제 표시·실제 클립보드 복사 정상, 수평 넘침 없음, 페이지 실행 오류 없음. 모바일 캡처를 직접 열어 읽기와 버튼 배치를 확인했다. harness는 임시 경로이며 운영 응답을 사용하지 않았다.

이는 컴포넌트 smoke 결과이다. 전체 앱의 실제 인증·라우팅·최종 CSS 배포 확인을 대신하지 않는다.

## 실제 자료·배포 후 남은 확인

1. 사용자 거래명세서 사진 첨부 → ChatGPT 정리 → 사용자 수정·저장 요청 → 허용된 작업공간 저장 → 사용자 재조회. 실제 문서는 사용 목적에 맞게 보관하며 시험용 운영 데이터를 만들지 않는다.
2. 통합·배포 담당이 배포 후 Demo 경영자·근무자의 `/mypage/settings`를 PC·모바일로 확인한다. 기존 동의·해제·조회 범위와 연결 없는 상태의 안내를 확인한다.
3. 현재 자료함 삭제는 비활성화 방식이므로 임시 명세서를 운영에 만들고 삭제로 끝내지 않는다. 완전 정리가 필요한 변경 시험은 격리 환경에서 한다.
4. 기존 업무 데이터 원본 제한에 맞는 실제 거래장 입력은 3차에서 설계한다. 전문 상담 최종 품질 검수는 별도 세션이다.

PR 생성·병합·배포는 이 작업에서 실행하지 않았다. 개발 branch와 결과는 HANDOFF를 통해 통합 담당에게 전달한다.
