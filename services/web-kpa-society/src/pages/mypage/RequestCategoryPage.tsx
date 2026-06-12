/**
 * RequestCategoryPage - 포럼 개설 신청 (KPA Society)
 *
 * WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1
 * 공통 ForumRequestForm(@o4o/shared-space-ui) 기반. KPA 는 forumType(open/closed)을
 * showForumType opt-in 으로 유지. serviceCode/API client/navigate 는 본 wrapper 가 담당.
 */
import { useNavigate } from 'react-router-dom';
import { ForumRequestForm, type ForumRequestFormPayload } from '@o4o/shared-space-ui';
import { forumRequestApi } from '../../api/forum';

export default function RequestCategoryPage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: ForumRequestFormPayload) => {
    const res = await forumRequestApi.create({
      name: payload.name,
      description: payload.description,
      reason: payload.reason || undefined,
      forumType: payload.forumType,
      tags: payload.tags,
    });
    return { success: res.success, error: res.error };
  };

  return (
    <ForumRequestForm
      onSubmit={handleSubmit}
      onSuccess={() => setTimeout(() => navigate('/mypage/my-requests?entityType=forum_category'), 3000)}
      backTo="/forum"
      title="새 포럼 신청"
      description={(
        <>
          원하시는 포럼이 없으신가요? 새 포럼 개설을 신청해 주세요.
          <br />관리자 검토 후 승인되면 포럼이 생성됩니다.
        </>
      )}
      successMessage={(
        <>
          관리자 검토 후 결과를 알려드리겠습니다.
          <br />내 신청에서 진행 상태를 확인할 수 있습니다.
        </>
      )}
      showForumType
      theme="blue"
      tagPlaceholder="예: 약국경영, 마케팅, 복약상담"
    />
  );
}
