# O4O Partner

사업자와 인플루언서의 홍보 활동에 필요한 도구를 제공하는 신규 서비스의 첫 로컬 개발 버전.
O4O는 당사자 간 협의·계약·보상 판정에 관여하지 않는다.

## 실행

저장소 루트에서 기존 lockfile로 의존성을 설치한 뒤:

```bash
pnpm --filter @o4o/web-partner dev
pnpm --filter @o4o/web-partner build
pnpm --dir services/web-partner test
```

브라우저 검증은 production preview를 실행한 후 별도 터미널에서 진행한다.

```bash
pnpm --filter @o4o/web-partner preview --host 127.0.0.1
PARTNER_TEST_ORIGIN=http://127.0.0.1:3011 pnpm --dir services/web-partner test:browser
```

브라우저 검증은 저장소에 설치된 Playwright와 Chromium을 사용한다. 기본 실행 파일은 `/usr/bin/chromium`이며 `CHROMIUM_PATH`로 지정할 수 있다.
검증 대상은 loopback으로 제한되고 격리 context의 테스트 데이터만 생성한다. 7개 화면을 360/390/768/1440px에서 확인한다.

개발 포트: 3011. Node/pnpm 기준은 루트 `package.json`과 `SETUP.md`를 따른다.
React/Vite/TypeScript/Vitest는 기존 workspace 도구를 사용한다.

## 제공 범위

- 홍보 제안·홍보자 프로필·콘텐츠 자료 등록과 탐색
- 템플릿 기반 채널별 문구·구성안 편집·보관
- UTM 링크 생성, 게시 활동과 직접 입력 지표 기록
- 수동 정산 내역, 외부 지급 기록과 CSV 내보내기
- 로컬 저장과 JSON 백업, 손상된 저장 데이터 덮어쓰기 방지

모든 자료는 해당 브라우저에만 저장된다. 실제 개인정보·계좌정보를 입력하지 않는다.
로그인·다중 사용자 공유·초대·서버 API·AI·SNS 자동 수집·클릭 집계·송금·세금 처리는 아직 연결하지 않았다.
저장 데이터를 지우면 복구할 수 없으므로 필요한 자료는 JSON 백업으로 보관한다. 백업 가져오기는 후속 구현이다.
기능별 진행 상태와 후속 작업은 `docs/work-orders/WO-O4O-PARTNER-SUPPORT-WORKSPACE-V1.md`를 참조한다.
