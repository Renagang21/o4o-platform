/**
 * Market Trial Notification Wrapper
 *
 * WO-NETURE-MARKET-TRIAL-NOTIFICATION-INTEGRATION-V1
 *
 * Centralizes Market Trial lifecycle → in-app notification dispatch so call sites
 * (controllers, lifecycle cron) only need a one-line hook. Each method:
 *   - never throws — failures are logged so the main flow keeps running
 *   - is idempotent at the call site (callers must invoke only on real transitions)
 *   - emits one notification per recipient (supplier and/or each participant)
 *
 * Notification type prefix: `market_trial.*` (per WO §4 — `trial.*` is forbidden).
 *
 * Out of scope: email/SMS/KakaoTalk push, retry queue, operator broadcast.
 */

import { AppDataSource } from '../database/connection.js';
import {
  MarketTrial,
  MarketTrialParticipant,
} from '@o4o/market-trial';
import { Notification, NotificationType } from '../entities/Notification.js';
import { notificationService } from './NotificationService.js';
import logger from '../utils/logger.js';

const SERVICE_KEY = 'neture';

interface MarketTrialNotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  trial: Pick<MarketTrial, 'id' | 'title' | 'status' | 'supplierId'>;
  deepLink: string;
  participantId?: string;
  actorId?: string;
}

/**
 * Best-effort wrapper around `notificationService.createNotification`.
 * Swallows + logs errors so a notification failure never breaks the calling flow.
 */
async function safeCreate(payload: MarketTrialNotificationPayload): Promise<Notification | null> {
  try {
    return await notificationService.createNotification({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      serviceKey: SERVICE_KEY,
      actorId: payload.actorId,
      metadata: {
        trialId: payload.trial.id,
        trialTitle: payload.trial.title,
        status: payload.trial.status,
        supplierId: payload.trial.supplierId,
        participantId: payload.participantId,
        deepLink: payload.deepLink,
      },
    });
  } catch (error) {
    logger.error('[MarketTrialNotification] createNotification failed', {
      type: payload.type,
      userId: payload.userId,
      trialId: payload.trial.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function supplierDeepLink(trialId: string): string {
  return `/supplier/market-trial/${trialId}`;
}

function publicDeepLink(trialId: string): string {
  return `/market-trial/${trialId}`;
}

async function fetchTrial(trialId: string): Promise<MarketTrial | null> {
  return AppDataSource.getRepository(MarketTrial).findOne({ where: { id: trialId } });
}

async function fetchParticipants(trialId: string): Promise<MarketTrialParticipant[]> {
  return AppDataSource.getRepository(MarketTrialParticipant).find({
    where: { marketTrialId: trialId },
  });
}

async function notifyAllParticipants(
  trial: MarketTrial,
  type: NotificationType,
  title: string,
  message: string,
  actorId?: string,
): Promise<void> {
  const participants = await fetchParticipants(trial.id);
  if (participants.length === 0) return;

  await Promise.allSettled(
    participants.map((p) =>
      safeCreate({
        type,
        userId: p.participantId,
        title,
        message,
        trial,
        deepLink: publicDeepLink(trial.id),
        participantId: p.participantId,
        actorId,
      }),
    ),
  );
}

export const marketTrialNotification = {
  /**
   * 공급자 신청 완료 → 공급자 본인에게 접수 확인 알림
   * Hook: MarketTrialController.submitTrial 의 SUBMITTED 전환 직후
   */
  async onSubmitted(trial: MarketTrial): Promise<void> {
    await safeCreate({
      type: 'market_trial.submitted',
      userId: trial.supplierId,
      title: '유통참여형 펀딩 신청이 접수되었습니다',
      message: `${trial.title}\n운영자 검토를 기다리고 있습니다.`,
      trial,
      deepLink: supplierDeepLink(trial.id),
    });
  },

  /**
   * 운영자 승인 → 공급자에게 모집 시작 알림
   * Hook: marketTrialOperatorController.approve1st 의 RECRUITING 전환 직후
   */
  async onApproved(trial: MarketTrial, actorId?: string): Promise<void> {
    await safeCreate({
      type: 'market_trial.approved',
      userId: trial.supplierId,
      title: '유통참여형 펀딩이 승인되었습니다',
      message: `${trial.title}\n모집이 시작되었습니다.`,
      trial,
      deepLink: supplierDeepLink(trial.id),
      actorId,
    });
  },

  /**
   * 운영자 반려 → 공급자에게 반려 사유 알림
   * Hook: marketTrialOperatorController.reject1st 의 CLOSED 전환 직후
   */
  async onRejected(trial: MarketTrial, reason?: string | null, actorId?: string): Promise<void> {
    const reasonText = reason && reason.trim().length > 0
      ? `사유: ${reason}`
      : '운영자 검토에서 반려되었습니다.';
    await safeCreate({
      type: 'market_trial.rejected',
      userId: trial.supplierId,
      title: '유통참여형 펀딩이 반려되었습니다',
      message: `${trial.title}\n${reasonText}`,
      trial,
      deepLink: supplierDeepLink(trial.id),
      actorId,
    });
  },

  /**
   * 참여자 join → 본인에게 참여 등록 확인 알림
   * Hook: MarketTrialController.joinTrial 의 participant insert 직후
   */
  async onJoined(trial: MarketTrial, participantUserId: string): Promise<void> {
    await safeCreate({
      type: 'market_trial.joined',
      userId: participantUserId,
      title: '유통참여형 펀딩 참여가 완료되었습니다',
      message: `${trial.title}\n참여가 등록되었습니다.`,
      trial,
      deepLink: publicDeepLink(trial.id),
      participantId: participantUserId,
      actorId: participantUserId,
    });
  },

  /**
   * 모집 결과 (성공: DEVELOPMENT 진입 / 실패: CLOSED 전환) → 공급자 + 모든 참여자
   * Hook A: market-trial-lifecycle.job 의 cron 자동 전환 직후 (atomic UPDATE 성공 1회만)
   * Hook B: marketTrialOperatorController.updateTrialStatus 의 RECRUITING → DEVELOPMENT 직후
   *         (cron 외에 운영자 수동 조기-종료 케이스가 있을 경우)
   */
  async onRecruitingResult(trialId: string, success: boolean, actorId?: string): Promise<void> {
    const trial = await fetchTrial(trialId);
    if (!trial) {
      logger.warn('[MarketTrialNotification] onRecruitingResult: trial not found', { trialId });
      return;
    }

    const type: NotificationType = success
      ? 'market_trial.recruiting_success'
      : 'market_trial.recruiting_failed';

    const supplierTitle = success
      ? '유통참여형 펀딩 모집이 성공했습니다'
      : '유통참여형 펀딩 모집이 종료되었습니다';
    const supplierMessage = success
      ? `${trial.title}\n다음 단계로 진행됩니다.`
      : `${trial.title}\n목표에 도달하지 못해 모집이 종료되었습니다.`;

    const participantTitle = success
      ? '참여하신 유통참여형 펀딩 모집이 성공했습니다'
      : '참여하신 유통참여형 펀딩 모집이 종료되었습니다';
    const participantMessage = success
      ? `${trial.title}\n진행 상황을 확인해 보세요.`
      : `${trial.title}\n목표에 도달하지 못해 모집이 종료되었습니다.`;

    await Promise.allSettled([
      safeCreate({
        type,
        userId: trial.supplierId,
        title: supplierTitle,
        message: supplierMessage,
        trial,
        deepLink: supplierDeepLink(trial.id),
        actorId,
      }),
      notifyAllParticipants(trial, type, participantTitle, participantMessage, actorId),
    ]);
  },

  /**
   * OUTCOME_CONFIRMING 진입 → 모든 참여자에게 결과 확인 단계 시작 알림
   * Hook: marketTrialOperatorController.updateTrialStatus 의 DEVELOPMENT → OUTCOME_CONFIRMING 직후
   */
  async onOutcomeConfirming(trialId: string, actorId?: string): Promise<void> {
    const trial = await fetchTrial(trialId);
    if (!trial) {
      logger.warn('[MarketTrialNotification] onOutcomeConfirming: trial not found', { trialId });
      return;
    }
    await notifyAllParticipants(
      trial,
      'market_trial.outcome_confirming',
      '결과 확인 단계가 시작되었습니다',
      `${trial.title}\n참여 후속 절차를 확인해 주세요.`,
      actorId,
    );
  },

  /**
   * FULFILLED 진입 → 공급자 + 모든 참여자에게 최종 완료 알림
   * Hook: marketTrialOperatorController.updateTrialStatus 의 OUTCOME_CONFIRMING → FULFILLED 직후
   */
  async onFulfilled(trialId: string, actorId?: string): Promise<void> {
    const trial = await fetchTrial(trialId);
    if (!trial) {
      logger.warn('[MarketTrialNotification] onFulfilled: trial not found', { trialId });
      return;
    }
    await Promise.allSettled([
      safeCreate({
        type: 'market_trial.fulfilled',
        userId: trial.supplierId,
        title: '유통참여형 펀딩이 완료되었습니다',
        message: `${trial.title}\n수고하셨습니다.`,
        trial,
        deepLink: supplierDeepLink(trial.id),
        actorId,
      }),
      notifyAllParticipants(
        trial,
        'market_trial.fulfilled',
        '참여하신 유통참여형 펀딩이 완료되었습니다',
        `${trial.title}\n수고하셨습니다.`,
        actorId,
      ),
    ]);
  },
};
