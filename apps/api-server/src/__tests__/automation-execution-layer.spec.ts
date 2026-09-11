/**
 * WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1 §43 — 자동 테스트(최소 17항목)
 *
 * 공통 실행 계층의 두 축(§13·§14)·Deterministic First(§5)·위험 등급(§18)·fallback 사유(§16)·
 * method 결정 함수(§39~§41)·prompt injection 경계(§32·§33)·registry drift 가드(§37)를 고정한다.
 *
 * 이 WO 는 실행기 구현이 아니라 계약·정합·가드다(§2·§38). 따라서 이 스펙은 순수 계약 함수와
 * registry 메타데이터만 검사하고, 실제 DOM/UIA/화면 조작은 부르지 않는다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  AUTOMATION_METHOD_PREFERENCE,
  AUTOMATION_RISK_ORDER,
  AUTHORITATIVE_PROVENANCE,
  FALLBACK_REASON,
  computerUseFallbackAllowed,
  isCommandAuthoritative,
  isComputerUseMethod,
  isFallbackReason,
  isMoreDeterministic,
  resolveAutomationMethod,
} from '../services/ai-tools/automation-execution-contract.js';
import type { AutomationMethod } from '../services/ai-tools/automation-execution-contract.js';
import {
  AI_TOOL_REGISTRY,
  findAutomationInvariantViolations,
} from '../services/ai-tools/ai-tool-contract.js';
import type { AiToolDefinition } from '../services/ai-tools/ai-tool-contract.js';

describe('WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1', () => {
  // ── A. AutomationMethod 축(§13) ──────────────────────────────────────────────
  describe('automation method 축 (§13)', () => {
    it('01. 선호 순서는 computer_use 를 마지막에 둔다 (§5)', () => {
      expect(AUTOMATION_METHOD_PREFERENCE[AUTOMATION_METHOD_PREFERENCE.length - 1]).toBe('computer_use');
      expect([...AUTOMATION_METHOD_PREFERENCE]).toEqual(['api', 'browser_dom', 'windows_uia', 'computer_use']);
    });

    it('02. api 는 computer_use 보다 더 결정적이다', () => {
      expect(isMoreDeterministic('api', 'computer_use')).toBe(true);
      expect(isMoreDeterministic('computer_use', 'api')).toBe(false);
      expect(isMoreDeterministic('browser_dom', 'windows_uia')).toBe(true);
    });

    it('03. isComputerUseMethod 는 computer_use 만 참이다', () => {
      expect(isComputerUseMethod('computer_use')).toBe(true);
      expect(isComputerUseMethod('api')).toBe(false);
      expect(isComputerUseMethod('browser_dom')).toBe(false);
    });
  });

  // ── B. 두 축 분리 · registry 메타(§14·§15) ────────────────────────────────────
  describe('registry 두 축 메타데이터 (§14·§15)', () => {
    it('04. 모든 tool 이 automationMethod 와 riskLevel 을 선언한다', () => {
      for (const tool of AI_TOOL_REGISTRY) {
        expect(typeof tool.automationMethod).toBe('string');
        expect(AUTOMATION_METHOD_PREFERENCE).toContain(tool.automationMethod);
        expect(AUTOMATION_RISK_ORDER).toContain(tool.riskLevel);
      }
    });

    it('05. computer_use 는 local.computer.* 넷뿐, 나머지는 전부 api (현행 census)', () => {
      const computerTools = AI_TOOL_REGISTRY.filter((t) => t.automationMethod === 'computer_use');
      expect(computerTools.map((t) => t.name).sort()).toEqual(
        ['local.computer.click', 'local.computer.inspect', 'local.computer.key', 'local.computer.type_text'].sort(),
      );
      // WO-O4O-BROWSER-DOM-CONTROL-V0: browser_dom 은 local.browser.dom.* 여덟뿐, 그 밖은 전부 api.
      const nonComputer = AI_TOOL_REGISTRY.filter((t) => t.automationMethod !== 'computer_use');
      for (const t of nonComputer) {
        expect(t.automationMethod).toBe(t.name.startsWith('local.browser.dom.') ? 'browser_dom' : 'api');
      }
    });

    it('06. browser_dom 은 BROWSER-DOM-CONTROL-V0 의 local.browser.dom.* 여덟뿐 · windows_uia 는 아직 없다 (§27·§28)', () => {
      const dom = AI_TOOL_REGISTRY.filter((t) => t.automationMethod === 'browser_dom').map((t) => t.name).sort();
      expect(dom).toEqual(
        [
          'local.browser.dom.get_context',
          'local.browser.dom.inspect',
          'local.browser.dom.find',
          'local.browser.dom.read_text',
          'local.browser.dom.read_table',
          'local.browser.dom.set_input',
          'local.browser.dom.select_option',
          'local.browser.dom.click',
        ].sort(),
      );
      expect(AI_TOOL_REGISTRY.filter((t) => t.automationMethod === 'windows_uia')).toHaveLength(0);
    });
  });

  // ── C. 위험 등급(§18·§19) ─────────────────────────────────────────────────────
  describe('위험 등급 (§18·§19)', () => {
    it('07. 위험도 오름차순은 READ < REVERSIBLE < REVIEW_REQUIRED < COMMIT', () => {
      expect([...AUTOMATION_RISK_ORDER]).toEqual(['READ', 'REVERSIBLE', 'REVIEW_REQUIRED', 'COMMIT']);
    });

    it('08. 자동 computer_use fallback 은 READ · REVERSIBLE 만 허용한다 (§17·§19)', () => {
      expect(computerUseFallbackAllowed('READ')).toBe(true);
      expect(computerUseFallbackAllowed('REVERSIBLE')).toBe(true);
      expect(computerUseFallbackAllowed('REVIEW_REQUIRED')).toBe(false);
      expect(computerUseFallbackAllowed('COMMIT')).toBe(false);
    });
  });

  // ── D. resolveAutomationMethod(§39~§41) ───────────────────────────────────────
  describe('resolveAutomationMethod (§39·§40·§41)', () => {
    it('09. 구조화 수단이 있으면 computer_use 보다 우선한다 (§5·§40)', () => {
      const r = resolveAutomationMethod({ availableMethods: ['api', 'computer_use'], riskLevel: 'REVERSIBLE' });
      expect(r.method).toBe('api');
      expect(r.blocked).toBeUndefined();
    });

    it('10. 여러 구조화 수단 중 선호 순서가 앞선 것을 고른다', () => {
      const r = resolveAutomationMethod({
        availableMethods: ['computer_use', 'windows_uia', 'browser_dom'],
        riskLevel: 'READ',
      });
      expect(r.method).toBe('browser_dom');
    });

    it('11. computer_use 만 있고 fallbackReason 이 없으면 막는다 (§41)', () => {
      const r = resolveAutomationMethod({ availableMethods: ['computer_use'], riskLevel: 'REVERSIBLE' });
      expect(r.method).toBeUndefined();
      expect(r.blocked).toBe(true);
      expect(r.blockReason).toBe('FALLBACK_REASON_REQUIRED');
    });

    it('12. computer_use + 사유 + 허용 위험 등급이면 사유와 함께 통과한다', () => {
      const r = resolveAutomationMethod({
        availableMethods: ['computer_use'],
        riskLevel: 'REVERSIBLE',
        fallbackReason: FALLBACK_REASON.STRUCTURED_METHOD_NOT_AVAILABLE,
      });
      expect(r.method).toBe('computer_use');
      expect(r.fallbackReason).toBe('STRUCTURED_METHOD_NOT_AVAILABLE');
      expect(r.blocked).toBeUndefined();
    });

    it('13. computer_use + 사유라도 COMMIT 등급이면 사람이 해야 한다 (§17·§19)', () => {
      const r = resolveAutomationMethod({
        availableMethods: ['computer_use'],
        riskLevel: 'COMMIT',
        fallbackReason: FALLBACK_REASON.DOM_ELEMENT_NOT_FOUND,
      });
      expect(r.method).toBeUndefined();
      expect(r.blocked).toBe(true);
      expect(r.blockReason).toBe('HUMAN_REQUIRED');
    });

    it('14. 어떤 수단도 없으면 막는다', () => {
      const r = resolveAutomationMethod({ availableMethods: [], riskLevel: 'READ' });
      expect(r.blocked).toBe(true);
      expect(r.blockReason).toBe('NO_METHOD_AVAILABLE');
    });
  });

  // ── E. fallback 사유(§16) ─────────────────────────────────────────────────────
  describe('fallback 사유 (§16)', () => {
    it('15. WO 가 요구한 사유 코드가 모두 있고 isFallbackReason 이 판정한다', () => {
      const required = [
        'STRUCTURED_TARGET_NOT_FOUND',
        'DOM_ELEMENT_NOT_FOUND',
        'UIA_CONTROL_NOT_FOUND',
        'ACCESSIBILITY_UNAVAILABLE',
      ];
      for (const code of required) {
        expect(Object.values(FALLBACK_REASON)).toContain(code);
        expect(isFallbackReason(code)).toBe(true);
      }
      expect(isFallbackReason('NOT_A_REASON')).toBe(false);
      expect(isFallbackReason(undefined)).toBe(false);
    });
  });

  // ── F. prompt injection 경계(§32·§33) ─────────────────────────────────────────
  describe('prompt injection 경계 (§32·§33)', () => {
    it('16. user · system 만 명령 권한을 가진다 — webpage · local_app_ui 는 UNTRUSTED', () => {
      expect(isCommandAuthoritative('user')).toBe(true);
      expect(isCommandAuthoritative('system')).toBe(true);
      expect(isCommandAuthoritative('webpage')).toBe(false);
      expect(isCommandAuthoritative('local_app_ui')).toBe(false);
      expect([...AUTHORITATIVE_PROVENANCE]).toEqual(['user', 'system']);
    });
  });

  // ── G. registry drift 가드(§37) ───────────────────────────────────────────────
  describe('registry drift 가드 (§37)', () => {
    it('17. 실제 registry 는 automation 불변식 위반이 0건이다', () => {
      expect(findAutomationInvariantViolations()).toEqual([]);
    });

    it('18. readOnly 와 riskLevel 이 어긋나면 위반으로 잡는다', () => {
      const bad: AiToolDefinition = {
        name: 'test.bad_readonly',
        description: 'x',
        requiredCapabilities: [],
        executionMode: 'server',
        automationMethod: 'api',
        riskLevel: 'REVERSIBLE', // readOnly 인데 READ 가 아니다
        readOnly: true,
      };
      const v = findAutomationInvariantViolations([bad]);
      expect(v.some((x) => x.tool === 'test.bad_readonly' && x.rule.includes('readOnly'))).toBe(true);
    });

    it('19. 구조화 tool 이 computer_use 로 표기되면 위반으로 잡는다', () => {
      const bad: AiToolDefinition = {
        name: 'workscope.get_context', // computer.* 이름이 아닌데 computer_use
        description: 'x',
        requiredCapabilities: [],
        executionMode: 'server',
        automationMethod: 'computer_use' as AutomationMethod,
        riskLevel: 'READ',
        readOnly: true,
      };
      const v = findAutomationInvariantViolations([bad]);
      expect(v.some((x) => x.rule.includes('computer_use'))).toBe(true);
    });
  });
});
