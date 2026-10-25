/** Optional applicant-supplied text, kept separate from review reasons and public course profiles. */
export class InvalidInstructorProfile extends Error {
  readonly code = 'INVALID_INSTRUCTOR_PROFILE';
}
export function normalizeInstructorProfile(input: unknown): { bio: string | null; expertise: string | null } {
  if (input != null && (typeof input !== 'object' || Array.isArray(input))) throw new InvalidInstructorProfile('강사 신청 정보를 확인해 주세요.');
  const source = (input ?? {}) as Record<string, unknown>;
  const text = (key: 'bio' | 'expertise', limit: number): string | null => {
    const value = source[key];
    if (value == null) return null;
    if (typeof value !== 'string' || value.includes('\0') || value.trim().length > limit)
      throw new InvalidInstructorProfile(`${key === 'bio' ? '강사 소개' : '전문 분야'}는 ${limit}자 이내의 글로 입력해 주세요.`);
    return value.trim() || null;
  };
  return { bio: text('bio', 3000), expertise: text('expertise', 1000) };
}
