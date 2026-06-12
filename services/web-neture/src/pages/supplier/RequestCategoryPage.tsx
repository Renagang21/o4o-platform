/**
 * RequestCategoryPage - 포럼 개설 신청 (Neture · supplier-facing)
 *
 * WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1
 * 공통 ForumRequestForm(@o4o/shared-space-ui) 기반. supplier-facing route/redirect 유지.
 * serviceCode/API client/navigate 는 본 wrapper 가 담당. Neture 는 forumType 미사용.
 */
import { useNavigate } from 'react-router-dom';
import { ForumRequestForm, type ForumRequestFormPayload } from '@o4o/shared-space-ui';
import { createForumCategoryRequest } from '@/services/forumApi';

export default function RequestCategoryPage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: ForumRequestFormPayload) => {
    const res = await createForumCategoryRequest({
      name: payload.name,
      description: payload.description,
      reason: payload.reason || undefined,
      tags: payload.tags,
    });
    return { success: res.success, error: res.error };
  };

  return (
    <ForumRequestForm
      onSubmit={handleSubmit}
      onSuccess={() => setTimeout(() => navigate('/supplier/my-forum'), 3000)}
      backTo="/supplier/my-forum"
      backLabel="내 포럼으로 돌아가기"
      title="새 포럼 신청"
      description={(
        <>
          원하시는 포럼이 없나요? 새 포럼을 신청해주세요.
          <br />관리자 검토 후 승인되면 포럼이 생성됩니다.
        </>
      )}
      successMessage={(
        <>
          관리자 검토 후 결과를 알려드리겠습니다.
          <br />내 포럼 페이지로 이동합니다...
        </>
      )}
      theme="emerald"
      tagPlaceholder="예: 공급정보, 상품제안, 파트너협업"
    />
  );
}
