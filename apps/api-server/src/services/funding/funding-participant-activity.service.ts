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

/** Stage/result notifications target current participants, with no change to retained membership records. */
export function readCurrentFundingParticipantIds(
  db: DataSource,
  trialId: string,
): Promise<Array<{ participantId: string }>> {
  return db.query(
    `SELECT "participantId" FROM market_trial_participants WHERE "marketTrialId"=$1
    AND NOT COALESCE(("offlineState"->>'withdrawn')::boolean,false)`,
    [trialId],
  );
}
