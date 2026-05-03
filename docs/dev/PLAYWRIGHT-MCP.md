# Playwright MCP — 개발 환경 설정

> WO-O4O-PLAYWRIGHT-MCP-PORTABLE-CONFIG-V1
> Claude Code (또는 Playwright MCP를 지원하는 다른 클라이언트)에서 production 화면을 브라우저로 검증할 때 사용.

---

## 1. 적용된 설정

`.mcp.json` (repo root):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.30", "--headless", "--isolated"]
    }
  }
}
```

- **`@playwright/mcp@0.0.30`**: 안정 `playwright@1.54.1`을 의존하는 *유일한* stable 버전. 더 최근 0.0.31~0.0.73은 npm registry에 존재하지 않는 alpha playwright를 의존해서 `npx` 설치 시 `ETARGET` 에러 발생.
- **`--headless`**: GUI 없이 실행.
- **`--isolated`**: 매 세션 새 임시 프로필 → OS/사용자 홈 경로 의존 0.
- 사용자 홈 절대경로, 브라우저 executable 경로 모두 제거 — 어떤 머신에서도 동일하게 동작.

---

## 2. 1회 초기 셋업

각 개발 머신에서 처음 한 번만:

```bash
# Playwright 1.54.1 호환 chromium 다운로드
npx -y playwright@1.54.1 install chromium
```

설치 위치 (Playwright 기본):
- Windows: `%LOCALAPPDATA%\ms-playwright\chromium-XXXX\`
- macOS: `~/Library/Caches/ms-playwright/chromium-XXXX/`
- Linux: `~/.cache/ms-playwright/chromium-XXXX/`

이후 Claude Code를 재시작하면 MCP 서버가 새 설정으로 로드된다.

---

## 3. 동작 확인

Claude Code 세션에서 Playwright MCP 도구 (`browser_navigate`, `browser_click`, `browser_snapshot` 등)가 deferred tool 목록에 노출되면 정상.

수동 확인 명령:

```bash
npx -y @playwright/mcp@0.0.30 --help
```

옵션 페이지가 출력되면 npm install + cli 로딩이 정상이다.

---

## 4. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `npm error code ETARGET ... playwright@1.X.X-alpha-...` | mcp 버전이 alpha playwright를 의존. `.mcp.json`이 `@playwright/mcp@0.0.30`인지 확인. `@latest`/`@next`로 변경 금지. |
| `browserType.launch: Executable doesn't exist at ...chromium-XXXX` | 1회 셋업의 `playwright install chromium`을 안 했음. 위 §2 실행. |
| Claude Code에서 도구 목록에 보이지 않음 | Claude Code 재시작 필요. MCP 서버 설정은 세션 시작 시 한 번만 로드됨. |
| 도구 호출 시 timeout / hang | `--headless`가 적용되어 있는지 확인 (headed 모드는 GUI 없는 환경에서 hang). |

---

## 5. 운영/보안 주의

- **계정/비밀번호를 `.mcp.json`/문서에 기록 금지.** 검증용 테스트 계정은 prompt 또는 별도 secret manager로 전달.
- **production 데이터에 영향을 주는 작업은 금지.** Playwright는 클릭/입력이 가능하므로 검증 시 read-only 흐름만 사용. 폼 제출, 결제, 메시지 발송 등은 사전 사용자 승인.
- **세션 격리(`--isolated`)** 덕분에 자격증명/쿠키가 디스크에 남지 않음. 단 메모리상에는 존재하므로 다른 사용자가 같은 머신을 사용하는 환경에서 주의.

---

## 6. 향후 업그레이드

- Microsoft가 stable playwright를 의존하는 새 mcp 버전을 publish하면 `.mcp.json`의 `0.0.30`만 교체.
- 다음 stable 후보 확인: `npm view @playwright/mcp@<version> dependencies.playwright` → alpha/beta가 아닌지 + `npm view playwright@<dep> version`이 존재하는지.
