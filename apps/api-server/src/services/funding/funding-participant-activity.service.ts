import type { DataSource } from "typeorm";

/** Keep history rows while separating current participation from financial records. */
export function readFundingParticipantActivity(
  db: DataSource,
  trialId: string,
): Promise<
  Array<{
    rewardType: string | null;
    rewardStatus: string;
    settlementStatus: string;
    withdrawn: boolean;
  }>
> {
  return db.query(
    `SELECT p."rewardType",p."rewardStatus",COALESCE(p."settlementStatus",'pending') AS "settlementStatus",
    COALESCE((p."offlineState"->>'withdrawn')::boolean,false) AS withdrawn
    FROM market_trial_participants p WHERE p."marketTrialId"=$1`,
    [trialId],
  );
}
