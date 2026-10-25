# WO-O4O-PARTNER-SUPPORT-WORKSPACE-V1

> 상태: ACTIVE · 최초 작성: 2026-10-25
> 범위: 신규 Partner 지원 서비스의 첫 로컬 개발 버전
> 근거: 사용자의 신규 인플루언서 지원 사업 정의 및 개발 착수 지시

## 사업 경계

- 홍보 주체는 공급자·제품 보유 사업자와 홍보자다.
- O4O는 콘텐츠·자료공간·홍보 도구·활동 기록·정산 처리 도구를 제공한다.
- 협의는 오프라인·각자 이메일·게시판·포럼 등에서 자율적으로 진행한다.
- 협상·계약·협의 기록 수집·보상 판정·분쟁 중재를 제품 기능으로 만들지 않는다.
- 모집부터 정산까지 단일 절차를 강제하지 않는다. 외부에서 시작한 활동도 기록 가능하다.

## 현재 코드 판단

- 현재 체크아웃의 과거 Partner runtime은 이미 은퇴했고 전용 웹 앱은 없다.
- `services/web-partner`를 신규 작성한다. 과거 Partner 스키마·역할을 복구하지 않는다.
- 다른 서비스의 Seller Recruitment·공통 인증·API·과거 migration은 삭제하지 않는다.
- 기존 Neture의 준비 중 안내는 전용 앱 배포 전까지 유지한다.
- 준비된 격리 cloud checkout과 `work` branch를 사용한다. onboarding 지침대로 별도 worktree를 생성하지 않는다.
- 시작 HEAD: `f196b3cf225acf909eb3eb70222a1b7802a64bba`. 원격 main이 이후 이동했음을 확인했으며 자동 merge/reset 하지 않았다.

## TODO — 1차 로컬 작업공간

- [x] 사업 경계·데이터 모델·기존 코드 처분 결정 기록
- [x] 독립 React/Vite 서비스와 반응형 탐색·시작 화면
- [x] 사업자의 홍보 제안 등록·검색·채널 필터·외부 문의 링크
- [x] 홍보자 프로필·활동 채널·대표 콘텐츠 등록
- [x] 콘텐츠 자료실·사용 범위·원본 링크·문구 다운로드
- [x] 입력 사실 기반 채널별 구성안 생성·편집·자료실 저장
- [x] 제안·홍보자별 UTM 링크 생성 (클릭 집계 아님)
- [x] 게시 결과·직접 입력 조회수 기록과 출처 표시
- [x] 수동 지급 내역·외부 지급 기록·CSV 명세
- [x] 브라우저 저장·손상 데이터 덮어쓰기 방지·JSON 백업
- [x] 타입 검사·프로덕션 빌드·의미 있는 자동 테스트
- [x] 데스크톱·모바일 브라우저 기능·레이아웃 검증
- [x] 변경 범위 점검·검증 결과 기록 (commit/push 결과는 완료 보고로 인계)

## TODO — 서버 공유와 운영 연결 (후속 구현)

- [ ] 기존 계정과 연결할 신규 Partner membership·사업자/홍보자 권한 설계
- [ ] 서버 API·데이터 모델·격리 테스트 DB, migration 적용은 별도 승인 경계 준수
- [ ] 사업자 공통 자료실·초대형 공동공간·접근 권한·사용자별 자료 분리
- [ ] 파일 업로드·권리/버전 관리·백업 복원
- [ ] 외부 전환 수집·검증 출처·기간·중복 처리
- [ ] 지급 기록 수정 이력·명세 연동, 실송금·세금 처리는 별도 연동 설계
- [ ] AI 생성 서비스 연결 (현재는 규칙 기반 템플릿)
- [ ] 제품 체험·샘플 배송 지원
- [ ] 공식 SNS API 권한 검증 후 지원 채널 연동
- [ ] `partner.neture.co.kr` 배포·라우팅·운영 검증은 통합 담당 인계

## 실행·검증

도구 활성화: `source /workspace/.o4o-tools/activate.sh`.
저장소 루트에서 `pnpm --filter @o4o/web-partner run build`.
테스트: `pnpm --dir services/web-partner test`.
개발: `pnpm --filter @o4o/web-partner dev` (포트 3011).

현재 데이터는 브라우저별 localStorage에만 저장된다. 인증된 다중 사용자 공유·실제 추적 집계·송금·세금 처리를 제공한다고 표시하지 않는다.
테스트 데이터는 로컬 브라우저/메모리 fixture에서만 생성한다. 운영 DB·실계정·유료 AI·실제 지급을 호출하지 않는다.
공개 문서에는 실제 이름·이메일·계정·계좌·비밀값을 기록하지 않는다.

## 검증 결과

- `pnpm install --frozen-lockfile --offline --ignore-scripts --verify-store-integrity=true --store-dir /workspace/.o4o-tools/pnpm-store`: 성공. 기존에 검증된 의존성으로 새 importer를 확인했고 기존 native 모듈 재설치는 하지 않았다.
- `pnpm --filter @o4o/web-partner build`: 타입 검사와 production build 성공.
- `pnpm --dir services/web-partner test`: 2개 파일, 34 tests 통과.
- 신규 서비스의 TypeScript/React ESLint: 오류·경고 없음.
- production preview에서 `PARTNER_TEST_ORIGIN=http://127.0.0.1:3011 pnpm --dir services/web-partner test:browser`: 성공.
- Chromium: 제안 등록·새로고침·검색, 콘텐츠 생성/편집/자료실 저장/다운로드, UTM 생성, 조회수 0 기록, 수동 정산·외부 지급 기록, CSV/JSON 다운로드 확인.
- 360/390/768/1440px에서 7개 화면씩 총 28회 가로 넘침 검사, 모바일 탐색·검색 성공. desktop/mobile 스크린샷 육안 확인.
- 첫 브라우저 검사에서 편집 textarea의 label에 내용이 합쳐지는 접근성 문제를 발견했고, 명시적 label/control ID 연결로 수정 후 전체 흐름 재검증 성공.
- 브라우저 오류·예기치 않은 외부 API 호출 0건. 테스트는 격리된 일회성 context에서만 실행했고 종료 후 context를 닫았다.
- 실계정 로그인·서버 공유·실제 전환/클릭 수집·AI·송금·세금 처리·운영 도메인 배포는 미실행이며 후속 TODO다.
- 전체 monorepo CI는 실행하지 않았다. 운영 배포는 명시적으로 지정된 통합 담당의 범위다.

문서 정합: 기존 역할 Architecture의 FUTURE PARTNER = GREENFIELD 방향을 따른다. 기존 정본의 상태·본문·색인은 변경하지 않는다.
