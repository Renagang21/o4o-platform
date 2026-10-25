import type { DataSource } from "typeorm";
import { ActionLog } from "@o4o/action-log-core";
import { FundingError } from "./funding-workspace.service.js";

export class FundingRewardRecordService {
  constructor(private readonly ds: DataSource) {}
  async update(
    trialId: string,
    participantId: string,
    actorId: string,
    rewardStatus: string,
  ) {
    if (!["pending", "fulfilled"].includes(rewardStatus))
      throw new FundingError(
        400,
        "INVALID_REWARD_STATUS",
        "이행 상태를 확인해 주세요.",
      );
    return await this.ds.transaction(async (manager) => {
      const [before] = await manager.query(
        'SELECT id, "rewardStatus" FROM market_trial_participants WHERE id = $1 AND "marketTrialId" = $2 FOR UPDATE',
        [participantId, trialId],
      );
      if (!before)
        throw new FundingError(
          404,
          "PARTICIPANT_NOT_FOUND",
          "이 펀딩의 참여자를 찾을 수 없습니다.",
        );
      const [after] = await manager.query(
        `WITH updated AS (UPDATE market_trial_participants SET "rewardStatus" = $1, "updatedAt" = now()
        WHERE id = $2 AND "marketTrialId" = $3 RETURNING id, "rewardType", "rewardStatus", "createdAt") SELECT * FROM updated`,
        [rewardStatus, participantId, trialId],
      );
      const meta: NonNullable<ActionLog["meta"]> = {
        trialId,
        participantId,
        beforeStatus: before.rewardStatus,
        afterStatus: after.rewardStatus,
      };
      await manager
        .getRepository(ActionLog)
        .insert({
          service_key: "neture",
          user_id: actorId,
          organization_id: null,
          action_key: "neture.operator.market_trial_reward_change",
          source: "manual",
          status: "success",
          meta,
        });
      return after;
    });
  }
}
