/**
 * requireInstructor Middleware
 *
 * WO-LMS-INSTRUCTOR-ROLE-V1
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: platform:* bypass 제거
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2:
 *   legacy `lms:instructor` 판정과 `kpa:admin` bypass 를 제거하고
 *   Lecture 계약(active lecture membership + `lecture:instructor`)으로 교체한다.
 *   admin/operator 는 강사가 아니다 (WO §6). 판정 엔진은 Foundation guard 재사용.
 */

import { requireLectureInstructor } from './lecture-access.js';

export const requireInstructor = requireLectureInstructor;
