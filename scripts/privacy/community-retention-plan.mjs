/** Design-stage, read-only planner. Not imported by API/jobs; never deletes data. */
const KST = 9 * 60 * 60 * 1000;

function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return date.toISOString() === canonical ? date : null;
}

/** Calendar anniversary in Asia/Seoul. Feb 29 -> March 1 in a non-leap year. */
export function retentionAnniversary(createdAt, years) {
  const created = instant(createdAt);
  if (!created || ![1, 2].includes(years)) throw new TypeError('Valid UTC timestamp and 1 or 2 calendar years required');
  const local = new Date(created.getTime() + KST);
  return new Date(Date.UTC(local.getUTCFullYear() + years, local.getUTCMonth(), local.getUTCDate(),
    local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) - KST).toISOString();
}

/**
 * The caller must supply independently reviewed system classification/evidence.
 * A row's action/reason or a guessed system size does not prove a legal basis.
 * Unknown classifications are review items, never authority for infinite storage.
 */
export function planCommunityRetention({ createdAt, now, classification, legalBasis, hold }) {
  const created = instant(createdAt);
  const current = instant(now);
  if (!created || !current || created > current) return { decision: 'review', code: 'INVALID_ANCHOR' };
  if (!['calendar-one-year', 'statutory-two-years'].includes(classification)) {
    return { decision: 'review', code: 'CLASSIFICATION_REQUIRED' };
  }
  if (classification === 'statutory-two-years' && !legalBasis?.trim()) {
    return { decision: 'review', code: 'LEGAL_BASIS_REQUIRED' };
  }
  const expiresAt = retentionAnniversary(createdAt, classification === 'statutory-two-years' ? 2 : 1);
  if (hold) {
    const until = instant(hold.until);
    const reviewAt = instant(hold.reviewAt);
    if (!hold.basis?.trim() || !hold.owner?.trim() || !reviewAt || reviewAt <= current ||
        (!until && !hold.endEvent?.trim()) || (hold.until && !until)) {
      return { decision: 'review', code: 'HOLD_REVIEW_REQUIRED', expiresAt };
    }
    // Ending a hold does not cancel the independently applicable baseline period.
    if (!hold.ended && (!until || current < until)) return { decision: 'retain-minimum', expiresAt, reviewAt: hold.reviewAt };
  }
  return { decision: current.toISOString() >= expiresAt ? 'expire-history-only' : 'retain-minimum', expiresAt };
}

/** Proposed completion contract; no request handler or deletion worker is implemented. */
export function evaluateErasureCompletion({ manifestVerified, databaseVerified, sessionsVerified, personalFiles, unresolvedReferences, legalRecordsSeparated }) {
  if (manifestVerified !== true || databaseVerified !== true || sessionsVerified !== true || legalRecordsSeparated !== true ||
      !Array.isArray(personalFiles) || !Array.isArray(unresolvedReferences) || unresolvedReferences.length ||
      personalFiles.some(file => !file || !['deleted', 'already-absent'].includes(file.status))) {
    return { state: 'incomplete', erased: false };
  }
  return { state: 'completed', erased: true };
}
