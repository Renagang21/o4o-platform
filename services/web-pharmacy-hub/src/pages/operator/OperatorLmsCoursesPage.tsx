/**
 * OperatorLmsCoursesPage — Pharmacy-Hub 운영자 강의 관리 (thin wrapper)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#95)
 *
 * 화면 본체는 공통 `OperatorLmsCoursesManager`(@o4o/operator-core-ui) — KPA/GP/KCos 가
 * 이미 쓰는 그 화면이다. PH 차이는 API adapter 하나뿐이고, 상태 전이·액션 정책은 불변이다.
 * backend 는 공통 `/api/v1/lms/operator/courses/*` 이며 allowlist 만 확장했다.
 */

import { OperatorLmsCoursesManager } from '@o4o/operator-core-ui';
import { lmsApi } from '../../api/lms';

export default function OperatorLmsCoursesPage() {
  return (
    <OperatorLmsCoursesManager
      config={{
        detailLinkLabel: '강의 페이지 이동',
        // PH 의 학습자 강의 상세 경로는 `/education/course/:id` 다 (KPA `/lms/course/:id` 와 다르다).
        detailPath: (id) => `/education/course/${id}`,
        api: {
          list: (p) => lmsApi.operatorGetCourses(p),
          approve: (id) => lmsApi.operatorApproveCourse(id),
          reject: (id, reason) => lmsApi.operatorRejectCourse(id, reason),
          unpublish: (id) => lmsApi.operatorUnpublishCourse(id),
          archive: (id) => lmsApi.operatorArchiveCourse(id),
          hardDelete: (id) => lmsApi.operatorHardDeleteCourse(id),
        },
      }}
    />
  );
}
