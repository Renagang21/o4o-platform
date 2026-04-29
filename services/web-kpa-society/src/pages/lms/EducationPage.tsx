/**
 * EducationPage - KPA /lms HUB
 *
 * WO-O4O-LMS-HUB-TEMPLATE-FOUNDATION-V1
 * WO-KPA-LMS-INSTRUCTOR-ENTRY-CTA-AND-PROFILE-FIX-V1: 강사 신청/심사중/강의등록 CTA 추가
 *
 * LmsHubTemplate + kpa config.
 * 강사 소유 강의 수정/종료 액션은 KPA-specific renderRowActions로 주입.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { RowActionMenu, type RowActionItem } from '@o4o/ui';
import { lmsApi } from '../../api';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { qualificationApi, type MemberQualification } from '../../api/qualification';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import type { Course } from '../../types';

// ─── Course type adapter ─────────────────────────────────────────────────────

function mapCourse(c: Course): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    lessonCount: c.lessonCount,
    status: c.status,
    instructorName: (c as any).instructor?.name || c.instructorName || undefined,
    instructorId: (c as any).instructor?.id || undefined,
    tags: c.tags,
    createdAt: (c as any).createdAt,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

// ─── Instructor CTA ──────────────────────────────────────────────────────────

function InstructorHeaderAction({ isInstructor, qualStatus }: {
  isInstructor: boolean;
  qualStatus: 'idle' | 'pending' | 'approved' | 'rejected';
}) {
  const navigate = useNavigate();

  if (isInstructor) {
    return (
      <button
        style={ctaStyles.primaryBtn}
        onClick={() => navigate('/instructor/courses/new')}
      >
        + 강의 등록
      </button>
    );
  }

  if (qualStatus === 'pending') {
    return (
      <div style={ctaStyles.pendingWrap}>
        <span style={ctaStyles.pendingBadge}>강사 신청 심사 중</span>
        <button
          style={ctaStyles.linkBtn}
          onClick={() => navigate('/mypage/qualifications')}
        >
          상태 확인 →
        </button>
      </div>
    );
  }

  return (
    <div style={ctaStyles.applyWrap}>
      <button
        style={ctaStyles.secondaryBtn}
        onClick={() => navigate('/mypage/qualifications')}
      >
        강사 신청
      </button>
      <p style={ctaStyles.hint}>승인까지 1~2일 소요될 수 있습니다.</p>
    </div>
  );
}

const ctaStyles: Record<string, React.CSSProperties> = {
  primaryBtn: {
    padding: '8px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    padding: '8px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  pendingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pendingBadge: {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '20px',
  },
  linkBtn: {
    padding: '0',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2563eb',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  applyWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  hint: {
    margin: 0,
    fontSize: '11px',
    color: '#94a3b8',
  },
};

// ─── Page Component ──────────────────────────────────────────────────────────

export function EducationPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [qualStatus, setQualStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');

  const isInstructor = user?.roles?.includes('lms:instructor') ?? false;

  useEffect(() => {
    if (!isAuthenticated || isInstructor) return;
    (async () => {
      try {
        const res = await qualificationApi.getMyQualifications();
        const lmsQual = res.data.data?.find((q: MemberQualification) => q.qualification_type === 'lms_creator');
        if (lmsQual) setQualStatus(lmsQual.status);
      } catch {
        // 조회 실패 시 idle 유지
      }
    })();
  }, [isAuthenticated, isInstructor]);

  const config: LmsHubConfig = {
    serviceKey: 'kpa-society',
    heroTitle: '강의',
    heroDesc: '보수교육, 온라인 세미나, 실무 강의',
    courseDetailPath: (id) => `/lms/course/${id}`,
    headerAction: isAuthenticated
      ? <InstructorHeaderAction isInstructor={isInstructor} qualStatus={qualStatus} />
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
        total: pag?.totalItems ?? pag?.total,
      };
    },

    renderRowActions: (course, reload) => {
      const isOwner = !!(user && course.instructorId === user.id);
      if (!isOwner) return null;

      const actions: RowActionItem[] = [
        {
          key: 'edit',
          label: '수정',
          onClick: () => navigate(`/instructor/courses/${course.id}/edit`),
        },
        {
          key: 'delete',
          label: '강의 종료',
          variant: 'danger',
          onClick: async () => {
            try {
              await lmsInstructorApi.deleteCourse(course.id);
              toast.success('강의가 종료 처리되었습니다');
              reload();
            } catch {
              toast.error('처리에 실패했습니다');
            }
          },
          confirm: {
            title: '강의 종료',
            message: '이 강의를 종료(보관) 처리하시겠습니까?',
            variant: 'danger',
          },
        },
      ];

      return <RowActionMenu actions={actions} />;
    },
  };

  return <LmsHubTemplate config={config} />;
}

export default EducationPage;
