export const PUBLIC_READ_KEY = 'o4oCommunityPublicReadV1';

/** Applicant-controlled metadata cannot designate public content. */
export function withoutPublicReadDesignation(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;
  const result = { ...metadata };
  delete result[PUBLIC_READ_KEY];
  return result;
}
