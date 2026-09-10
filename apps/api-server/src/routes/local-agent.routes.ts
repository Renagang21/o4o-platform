/**
 * Local Work Agent — HTTP 경계
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 방향 (§16)
 *
 *   **전부 agent → cloud 방향이다.** cloud 가 사용자의 PC 에 접속하는 경로는 없다.
 *   포트 포워딩 · 공인 IP · inbound 방화벽 규칙이 필요 없고, 애초에 그런 것을
 *   요구할 수단 자체가 이 파일에 없다. agent 가 주기적으로 찾아와 물어보는 구조다.
 *
 *   WebSocket 을 쓰지 않은 이유: 저장소에 마운트된 WS 서버가 없고(census 결과 `ws` 는
 *   의존성으로만 존재), Cloud Run 에서 장수 연결을 유지하려면 별도 인프라 판단이 필요하다.
 *   §15 가 요구한 "기존 인프라 재사용" 과 "최소 크기" 를 만족하는 것은 HTTPS 폴링이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 두 종류의 호출자
 *
 *   사용자 (브라우저, JWT)  — `/pair`, `/devices`
 *   agent  (세션 토큰)      — `/register`, `/connect`, `/heartbeat`, `/result`
 *
 *   agent 경로는 **사용자 JWT 를 쓰지 않는다**(§13). agent 는 사용자의 로그인 토큰을
 *   본 적도 없고 가질 수도 없다. 두 축이 섞이지 않게 미들웨어를 나눠 둔다.
 */

import { Router, Response, Request, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { AppDataSource } from '../database/connection.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';
import {
  authenticateAgentSession,
  claimPendingCommands,
  consumePairingAndRegisterDevice,
  createPairingCode,
  listUserDevices,
  openAgentSession,
  recordHeartbeat,
  submitCommandResult,
  type AgentSessionContext,
} from '../services/local-agent/local-agent-service.js';

const router = Router();

interface AgentRequest extends Request {
  agent?: AgentSessionContext;
}

/**
 * agent 전용 인증. `Authorization: Bearer <sessionToken>` 하나만 본다.
 *
 * 여기서 확정된 `deviceId`/`userId` 가 이후 모든 핸들러의 **유일한** 신원 출처다.
 * 요청 본문에 deviceId 가 실려 와도 읽지 않는다 — 읽는 순간 사칭이 가능해진다(§14).
 */
async function authenticateAgent(
  req: AgentRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const agent = await authenticateAgentSession(AppDataSource, token);
  if (!agent) {
    res.status(401).json({ success: false, error: 'Invalid agent session', code: 'AGENT_UNAUTHORIZED' });
    return;
  }
  req.agent = agent;
  next();
}

// ─── 사용자 축 ────────────────────────────────────────────────────────────────

/**
 * POST /api/local-agent/pair — 이 PC 를 연결하기 위한 1회용 코드 발급 (§12).
 *
 * 응답의 `code` 는 **이 순간에만 존재한다.** 서버에는 해시만 남고, 다시 조회할 수 없다.
 */
router.post('/pair', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code, expiresAt } = await createPairingCode(AppDataSource, req.user.id);
    // 코드는 사용자에게만 간다. 로그에는 절대 남기지 않는다 (§51 secret 출력 금지).
    logger.info('local-agent pairing code issued', { userId: req.user.id });
    res.json({ success: true, data: { code, expiresAt } });
  } catch (error) {
    logger.error('local-agent pair failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to create pairing code' });
  }
});

/** GET /api/local-agent/devices — 연결된 PC 목록 (§39·§40). */
router.get('/devices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const devices = await listUserDevices(AppDataSource, req.user.id);
    res.json({
      success: true,
      data: devices.map((d) => ({
        deviceId: d.id,
        deviceName: d.deviceName,
        platform: d.platform,
        agentVersion: d.agentVersion,
        online: d.online,
        lastSeenAt: d.lastSeenAt,
      })),
    });
  } catch (error) {
    logger.error('local-agent devices failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to list devices' });
  }
});

// ─── agent 축 ─────────────────────────────────────────────────────────────────

/**
 * POST /api/local-agent/register — pairing code 를 소모하고 device 로 등록한다.
 *
 * 인증 미들웨어가 없는 유일한 경로다. 인증 대신 **코드 자체가 자격**이다 —
 * 5분 · 1회용 · 특정 사용자 소유. 코드가 틀리면 왜 틀렸는지 구분해 알려주지 않는다.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { code, deviceName, platform, agentVersion } = req.body ?? {};
    const outcome = await consumePairingAndRegisterDevice(AppDataSource, {
      code: String(code ?? ''),
      deviceName: deviceName ? String(deviceName) : undefined,
      platform: String(platform ?? ''),
      agentVersion: String(agentVersion ?? ''),
    });

    if (outcome.ok === false) {
      logger.info('local-agent register rejected', { reason: outcome.reason });
      res.status(400).json({ success: false, error: 'Pairing failed', code: outcome.reason });
      return;
    }

    logger.info('local-agent device registered', { deviceId: outcome.deviceId });
    // agentCredential 도 이 응답에만 존재한다. 서버는 해시만 보관한다.
    res.json({
      success: true,
      data: { deviceId: outcome.deviceId, agentCredential: outcome.agentCredential },
    });
  } catch (error) {
    logger.error('local-agent register failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to register device' });
  }
});

/** POST /api/local-agent/connect — credential → 단명 세션 토큰 (§13). */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { deviceId, agentCredential } = req.body ?? {};
    const outcome = await openAgentSession(
      AppDataSource,
      String(deviceId ?? ''),
      String(agentCredential ?? ''),
    );
    if (outcome.ok === false) {
      logger.info('local-agent connect rejected', { reason: outcome.reason });
      res.status(401).json({ success: false, error: 'Connect failed', code: outcome.reason });
      return;
    }
    res.json({
      success: true,
      data: { sessionToken: outcome.sessionToken, expiresAt: outcome.expiresAt },
    });
  } catch (error) {
    logger.error('local-agent connect failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to connect' });
  }
});

/**
 * POST /api/local-agent/heartbeat — 생존 신고 **겸** 명령 수령 (§32).
 *
 * 두 일을 한 요청에 합쳐 둔 것은 의도적이다. endpoint 를 늘리지 않고(§39),
 * "살아 있다" 는 신호와 "할 일 있나" 라는 질문이 사실 같은 순간이기 때문이다.
 */
router.post('/heartbeat', authenticateAgent, async (req: AgentRequest, res: Response) => {
  try {
    const { deviceId } = req.agent;
    await recordHeartbeat(AppDataSource, deviceId);
    const commands = await claimPendingCommands(AppDataSource, deviceId);
    res.json({ success: true, data: { commands } });
  } catch (error) {
    logger.error('local-agent heartbeat failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Heartbeat failed' });
  }
});

/**
 * POST /api/local-agent/result — 명령 결과 제출 (§17·§18).
 *
 * replay · 만료 판정은 전부 service 안에서 일어난다. 거부되어도 200 이 아니라
 * 409 로 답해 agent 가 "제출됐다" 고 착각하지 않게 한다.
 */
router.post('/result', authenticateAgent, async (req: AgentRequest, res: Response) => {
  try {
    const { deviceId } = req.agent;
    const body = req.body ?? {};
    const outcome = await submitCommandResult(AppDataSource, deviceId, {
      commandId: String(body.commandId ?? ''),
      status: body.status,
      data: body.data,
      errorCode: body.errorCode ? String(body.errorCode) : undefined,
    });

    if (outcome.ok === false) {
      logger.info('local-agent result rejected', { errorCode: outcome.errorCode });
      res.status(409).json({ success: false, error: 'Result rejected', code: outcome.errorCode });
      return;
    }
    res.json({ success: true, data: { accepted: true } });
  } catch (error) {
    logger.error('local-agent result failed', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to submit result' });
  }
});

export default router;
