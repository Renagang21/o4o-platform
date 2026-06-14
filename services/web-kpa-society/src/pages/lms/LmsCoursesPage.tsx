/**
 * LmsCoursesPage - 강의 Hub (/lms)
 *
 * WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1:
 * - 자체 raw <table> → 공통 LmsHubTemplate(@o4o/shared-space-ui)로 수렴.
 *   3서비스(KPA/GP/KCos) /lms 목록 hub 를 단일 테이블 템플릿으로 정렬.
 * - KPA 고유 요소는 config 로 주입:
 *     headerAction       → InstructorHeaderAction(강사 등록/신청 CTA)
 *     renderCta          → 동적 수강 CTA(공개=바로 보기 / 비로그인=로그인 후 수강)
 *     renderRowActions   → 강사 본인 강의 수정/종료(RowActionMenu)
 *     LmsHubCourse.visibility/requiresApproval/isPaid → 공개·회원제 배지
 * - store library takeaway(자료함 가져가기)는 WO-...-TAKEAWAY-REMOVAL-V1 에서 삭제됨 — 재도입 금지.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { RowActionMenu } from '@o4o/ui';
import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { lmsApi } from '../../api';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { qualificationApi, type MemberQualification } from '../../api/qualification';
import { useAuth } from '../../contexts';
import type { Course } from '../../types';

type QualStatus = 'idle' | 'pending' | 'approved' | 'rejected';

// ─── Instructor CTA (WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1) ───────────────────

function InstructorHeaderAction({ isInstructor, qualStatus, navigate }: {
  isInstructor: boolean;
  qualStatus: QualStatus;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (isInstructor) {
    return (
      <button style={instructorCtaStyles.primaryBtn} onClick={() => navigate('/instructor/courses/new')}>
        + 강의 등록
      </button>
    );
  }
  if (qualStatus === 'pending') {
    return (
      <div style={instructorCtaStyles.pendingWrap}>
        <span style={instructorCtaStyles.pendingBadge}>강사 신청 심사 중</span>
        <button style={instructorCtaStyles.linkBtn} onClick={() => navigate('/mypage/qualifications')}>
          상태 확인 →
        </button>
      </div>
    );
  }
  return (
    <div style={instructorCtaStyles.applyWrap}>
      <button style={instructorCtaStyles.secondaryBtn} onClick={() => navigate('/mypage/qualifications')}>
        강사 신청
      </button>
      <p style={instructorCtaStyles.hint}>승인까지 1~2일 소요될 수 있습니다.</p>
    </div>
  );
}

// ─── Course → LmsHubCourse adapter ──────────────────────────────────────────

function mapCourse(c: Course): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    status: c.status,
    lessonCount: c.lessonCount,
    category: c.category,
    instructorName: c.instructor?.name || c.instructorName || undefined,
    instructorId: c.instructor?.id || undefined,
    tags: c.tags,
    // WO-...-HUBTEMPLATE-ALIGNMENT-V1: 공개/회원제 배지 (visibility 지정 시 유형 컬럼 렌더)
    visibility: c.visibility === 'public' ? 'public' : 'members',
    requiresApproval: c.requiresApproval,
    isPaid: c.isPaid,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function LmsCoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [qualStatus, setQualStatus] = useState<QualStatus>('idle');

  const isAuthenticated = !!user;
  const isInstructor = user?.roles?.includes('lms:instructor') ?? false;
  const userId = user?.id;

  // WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: 강사 신청 자격 조회
  useEffect(() => {
    if (!isAuthenticated || isInstructor) return;
    (async () => {
      try {
        const res = await qualificationApi.getMyQualifications();
        const lmsQual = res.data.data?.find((q: MemberQualification) => q.qualification_type === 'lms_creator');
        if (lmsQual) setQualStatus(lmsQual.status);
      } catch {}
    })();
  }, [isAuthenticated, isInstructor]);

  // config 는 안정적 참조여야 한다(LmsHubTemplate loadCourses useCallback 의존 → 무한 리로드 방지).
  const config = useMemo<LmsHubConfig>(() => ({
    serviceKey: 'kpa-society',
    accent: '#2563EB',
    heroTitle: '강의',
    heroDesc: '공개 강의와 회원 전용 강의를 탐색하세요',
    courseDetailPath: (id) => `/lms/course/${id}`,

    headerAction: isAuthenticated
      ? <InstructorHeaderAction isInstructor={isInstructor} qualStatus={qualStatus} navigate={navigate} />
      : undefined,

    fetchCourses: async (params) => {
      const res = await lmsApi.getCourses({
        status: 'published',
        search: params.search,
        page: params.page,
        limit: params.limit,
      });
      const pag = (res as any).pagination;
      return {
        data: (res.data || []).map(mapCourse),
        totalPages: pag?.totalPages || (res as any).totalPages || 1,
      };
    },

    // 동적 수강 CTA: 공개=바로 보기 / 로그인=수강하기 / 비로그인 회원제=로그인 후 수강
    renderCta: (course) => {
      const isPublic = course.visibility === 'public';
      const detailPath = `/lms/course/${course.id}`;
      const label = isPublic ? '바로 보기' : isAuthenticated ? '수강하기' : '로그인 후 수강';
      const to = isAuthenticated || isPublic ? detailPath : '/login';
      const state = (!isAuthenticated && !isPublic) ? { from: detailPath } : undefined;
      return <Link to={to} state={state} style={ctaLinkStyle}>{label}</Link>;
    },

    // 강사 본인 강의 수정/종료 (store library takeaway 아님 — 유지)
    renderRowActions: (course, reload) => {
      const isOwnCourse = isInstructor && !!userId && course.instructorId === userId;
      if (!isOwnCourse) return null;
      return (
        <RowActionMenu
          actions={[
            { key: 'edit', label: '수정', onClick: () => navigate(`/instructor/courses/${course.id}/edit`) },
            {
              key: 'delete', label: '강의 종료', variant: 'danger',
              onClick: async () => {
                try {
                  await lmsInstructorApi.deleteCourse(course.id);
                  toast.success('강의가 종료 처리되었습니다');
                  reload();
                } catch { toast.error('처리에 실패했습니다'); }
              },
              confirm: { title: '강의 종료', message: '이 강의를 종료(보관) 처리하시겠습니까?', variant: 'danger' },
            },
          ]}
        />
      );
    },
  }), [isAuthenticated, isInstructor, qualStatus, userId, navigate]);

  return <LmsHubTemplate config={config} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ctaLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 12px',
  backgroundColor: '#5b21b6',
  color: '#fff',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

// WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: 강사 CTA 스타일
const instructorCtaStyles: Record<string, React.CSSProperties> = {
  primaryBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 600,
    color: '#ffffff', backgroundColor: '#2563eb',
    border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 600,
    color: '#2563eb', backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  pendingWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  pendingBadge: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    color: '#92400e', backgroundColor: '#fef3c7',
    border: '1px solid #fde68a', borderRadius: '20px',
  },
  linkBtn: {
    padding: '0', fontSize: '13px', fontWeight: 500,
    color: '#2563eb', background: 'transparent', border: 'none',
    cursor: 'pointer', textDecoration: 'underline',
  },
  applyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  hint: { margin: 0, fontSize: '11px', color: '#94a3b8' },
};
