/**
 * RequestCategoryPage - 포럼 개설 신청 (GlycoPharm)
 *
 * WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1
 * 공통 ForumRequestForm(@o4o/shared-space-ui) 기반. serviceCode/API client/navigate 는
 * 본 wrapper 가 담당. GP 는 forumType 미사용(showForumType 생략).
 */
import { useNavigate } from 'react-router-dom';
import { ForumRequestForm, type ForumRequestFormPayload } from '@o4o/shared-space-ui';
import { forumRequestApi } from '@/services/api';

export default function RequestCategoryPage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: ForumRequestFormPayload) => {
    const res = await forumRequestApi.create({
      name: payload.name,
      description: payload.description,
      reason: payload.reason || undefined,
      tags: payload.tags,
    });
    if ((res as any)?.error) {
      const err = (res as any).error;
      return { success: false, error: err?.message || err?.code || '신청에 실패했습니다.' };
    }
    return { success: true };
  };

  return (
    <ForumRequestForm
      onSubmit={handleSubmit}
      onSuccess={() => setTimeout(() => navigate('/forum/my-requests'), 3000)}
      backTo="/forum"
      title="새 포럼 신청"
      description={(
        <>
          원하시는 포럼이 없나요? 새 포럼을 신청해주세요.
          <br />관리자 검토 후 승인되면 포럼이 생성됩니다.
        </>
      )}
      submitLabel="신청하기"
      theme="primary"
      tagPlaceholder="예: 혈당관리, 약국경영, 복약상담"
    />
  );
}
