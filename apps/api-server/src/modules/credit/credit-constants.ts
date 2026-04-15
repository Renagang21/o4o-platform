/**
 * Credit Reward Constants
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Centralized credit amounts for LMS events.
 * Separated for future operator-configurable settings.
 */

export const CREDIT_REWARDS = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 20,
  COURSE_COMPLETE: 50,
} as const;

export const CREDIT_DESCRIPTIONS = {
  LESSON_COMPLETE: '레슨 완료 보상',
  QUIZ_PASS: '퀴즈 통과 보상',
  COURSE_COMPLETE: '코스 완료 보상',
} as const;
