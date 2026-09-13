/**
 * WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0 — 서버 계층: production 격리(§4·§59) 잠금
 *
 * 계측 창(`windows.o4o-test-surface`)은 개발/검증 fixture 다. 서버 등재부 · allowlist · 도구 정의 · Work Target 해석 어디에도 없어야
 * production Work Agent 가 고를 수 없다. agent 쪽 정의는 별도 파일(`windows-test-surface.mjs`)에 있고 O4O_DEV_TARGETS 게이트 뒤에 있다.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { LOCAL_AGENT_ACTIONS, isAllowedLocalAction, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { WINDOWS_APP_IDS, findWindowsApp } from '../services/local-agent/windows-app-registry.js';

const SRC = join(__dirname, '..');
const AGENT_SRC = join(SRC, '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
const read = (p: string) => readFileSync(p, 'utf8');
const TEST_SURFACE = 'windows.o4o-test-surface';

describe('production 격리', () => {
  it('서버 등재부 · allowlist · 도구/대상 해석에 계측 창이 없다', () => {
    expect((WINDOWS_APP_IDS as readonly string[]).includes(TEST_SURFACE)).toBe(false);
    expect(findWindowsApp(TEST_SURFACE)).toBeUndefined();
    for (const base of [LOCAL_AGENT_ACTIONS.UIA_INSPECT, LOCAL_AGENT_ACTIONS.UIA_SET_VALUE, LOCAL_AGENT_ACTIONS.UIA_INVOKE, LOCAL_AGENT_ACTIONS.UIA_KEY, LOCAL_AGENT_ACTIONS.UIA_CLICK, LOCAL_AGENT_ACTIONS.TARGET_PREPARE]) {
      expect(isAllowedLocalAction(`${base}#${TEST_SURFACE}`)).toBe(false);
    }
    expect(parseLocalAction(`local.uia.inspect#${TEST_SURFACE}`).appId).toBe(TEST_SURFACE); // 파싱은 되지만 allowlist 가 거절한다
    // 서버 소스 어디에도 계측 창 식별자가 없다(테스트 파일 제외).
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
    const hits = walk(join(SRC, 'services')).filter((f) => /\.(ts|js)$/.test(f) && read(f).includes(TEST_SURFACE));
    expect(hits).toEqual([]);
  });

  it('agent: 정의는 별도 파일 · dev 게이트 뒤 · production 등재부 파일에 식별자 없음 · 스크립트는 WinForms 기본만', () => {
    const reg = read(join(AGENT_SRC, 'windows-app-registry.mjs'));
    expect(reg).not.toContain(`appId: '${TEST_SURFACE}'`);
    expect(reg).toContain("findDevTarget(appId)");
    const ts = read(join(AGENT_SRC, 'windows-test-surface.mjs'));
    expect(ts).toContain(`appId: '${TEST_SURFACE}'`);
    expect(ts).toContain("process.env.O4O_DEV_TARGETS === '1'");
    expect(ts).toContain('launchAllowed: false');
    expect(ts).toContain('devOnly: true');
    // index.mjs 의 일반 `run` 은 개발 대상을 켜지 않는다 — test-surface 명령 분기에서만.
    const index = read(join(AGENT_SRC, 'index.mjs'));
    const runBlock = index.slice(index.indexOf("if (command === 'run')"), index.indexOf("if (command === 'data')"));
    expect(runBlock).not.toContain('O4O_DEV_TARGETS');
    expect(index.slice(index.indexOf("if (command === 'test-surface')"))).toContain("process.env.O4O_DEV_TARGETS = '1'");
    // 스크립트: Start-Process · 입력 hook · 외부 실행 · 파일/네트워크 없음. 행 3개는 그려지고(OnPaint) UIA 자식이 아니다.
    const ps = read(join(AGENT_SRC, 'windows-test-surface.ps1')).split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    for (const forbidden of ['Start-Process', 'Invoke-', '-Command', 'DllImport', 'SetWindowsHookEx', 'Set-Content', 'Out-File', 'Net.', '$env:', 'Get-Process']) expect(ps).not.toContain(forbidden);
    expect(ps).toContain('AccessibleRole]::List');
    expect(ps).toContain('Add_Paint');
  });
});
