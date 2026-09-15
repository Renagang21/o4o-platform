/**
 * Windows Computer Use 캡처 명령 발행 (WO-O4O-WINDOWS-VISUAL-COMPUTER-USE-AND-FAST-LOOP-V1 §4·§4-1)
 *
 *   서버 → `local.computer.capture#<appId>` → agent(inspect 스크립트, O4O_INSPECT_CAPTURE=1)
 *        → 두 갈래로 분리:
 *          · pickSafeComputerInfo → 로그·DB·프롬프트 텍스트에 남는 image-free 뷰
 *          · pickCaptureImage     → **요청 메모리 전용** JPEG base64 (planner 호출까지만)
 *
 * windows-uia-executor 와 같은 자리다. 로그에는 tool·appId·action·status·code·시간·(이미지) 존재 여부·치수만
 * 남는다 — base64 는 로그·DB 어디에도 넣지 않는다(§4-1 파일·DB·장기로그 0 = SENSITIVE_IMAGE_PERSISTENCE 0).
 *
 * 캡처는 대상 창이 foreground 일 때만 성공한다. 그래서 먼저 등재 앱 창을 활성화하고(부작용은 대상 앱 한정),
 * 그다음 캡처한다. 활성화에 실패해도 캡처를 시도한다 — 스크립트가 foreground 여부로 다시 판정한다.
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import type { VerifiedToolContext } from './ai-tool-contract.js';
import {
  LOCAL_AGENT_ACTIONS,
  composeAppAction,
  composeComputerAction,
  pickSafeComputerInfo,
  pickCaptureImage,
  type CaptureImage,
} from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';

export interface ComputerCaptureResult {
  status: string;
  errorCode?: string;
  /** 로그·DB·프롬프트 텍스트에 남을 수 있는 image-free 안전 뷰. */
  safe: Record<string, unknown>;
  /** 요청 메모리 전용 이미지. planner 에만 넘기고 로그·DB 에 쓰지 않는다. 없으면 null. */
  image: CaptureImage | null;
}

export async function issueComputerCapture(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  deviceId: string,
  tool: string,
  appId: string,
): Promise<ComputerCaptureResult> {
  const startedAt = Date.now();
  // 1) 대상 앱 창을 앞으로 — 캡처는 foreground 에서만 성공한다. 실패해도 캡처 시도(스크립트가 재판정).
  try {
    await issueCommand(dataSource, {
      userId: ctx.userId,
      deviceId,
      action: composeAppAction(LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW, appId),
      toolName: tool,
      args: undefined,
    }).then((issued) => (issued.ok === false ? null : awaitCommandResult(dataSource, issued.command.commandId)));
  } catch {
    /* 활성화 실패는 무시 — 아래 캡처가 foreground 여부로 판정한다. */
  }

  // 2) 캡처.
  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE, appId),
    toolName: tool,
    args: undefined,
  });
  if (issued.ok === false) return { status: 'denied', errorCode: issued.errorCode, safe: {}, image: null };
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeComputerInfo(result.data);
  const image = result.status === 'success' ? pickCaptureImage(result.data) : null;
  logger.info('local-agent computer capture', {
    tool,
    appId,
    action: LOCAL_AGENT_ACTIONS.COMPUTER_CAPTURE,
    automationMethod: 'computer_use',
    status: result.status,
    errorCode: result.errorCode ?? null,
    foreground: typeof safe.foreground === 'boolean' ? safe.foreground : null,
    // 이미지 자체가 아니라 "있었는가 + 인코딩 치수" 만 로그에 남는다.
    imagePresent: image !== null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe, image };
}

/**
 * Visual Computer Use 조작 발행 (§4) — `local.computer.click|type_text|key#<appId>`.
 *   UIA 가 요소를 노출하지 못해 시각 fallback 에 들어갔을 때만 runtime 이 부른다. 좌표는 client 영역 정규화(0..1),
 *   텍스트/키는 computer-use 안전 규칙(길이·credential·허용키)을 이미 통과한 값이다. agent 는 실행 직전/직후 foreground
 *   를 다시 확인하고 대상 창이 아니면 보내지 않는다(COMPUTER_USE_TARGET_LOST). 이미지·base64 는 여기 흐르지 않는다.
 */
export async function issueComputerAction(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  deviceId: string,
  tool: string,
  appId: string,
  baseAction: string,
  args: Record<string, unknown> | undefined,
): Promise<{ status: string; errorCode?: string; safe: Record<string, unknown> }> {
  const startedAt = Date.now();
  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeComputerAction(baseAction, appId),
    toolName: tool,
    args,
  });
  if (issued.ok === false) return { status: 'denied', errorCode: issued.errorCode, safe: {} };
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeComputerInfo(result.data);
  logger.info('local-agent computer action', {
    tool,
    appId,
    action: baseAction,
    automationMethod: 'computer_use',
    status: result.status,
    errorCode: result.errorCode ?? null,
    foreground: typeof safe.foreground === 'boolean' ? safe.foreground : null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe };
}
