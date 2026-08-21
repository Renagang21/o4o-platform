/**
 * RequestForumPage — 포럼 개설 신청 (PharmacyHub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5 (P0)
 * 공통 ForumRequestForm(@o4o/shared-space-ui) 기반. serviceCode/API client/navigate 만 wrapper 담당.
 * PH 는 forumType 미사용(showForumType 생략) — KPA 전용 옵션을 새로 채택하지 않는다.
 */
import { useNavigate } from 'react-router-dom';
import { ForumRequestForm, type ForumRequestFormPayload } from '@o4o/shared-space-ui';
import { createPharmacyHubForumCategoryRequest } from '../../services/forumApi';

export default function RequestForumPage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: ForumRequestFormPayload) => {
    const res = await createPharmacyHubForumCategoryRequest({
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
      onSuccess={() => setTimeout(() => navigate('/forum/my-dashboard'), 3000)}
      backTo="/forum/my-dashboard"
      backLabel="내 포럼으로 돌아가기"
      title="새 포럼 신청"
      description={(
        <>
          원하시는 포럼이 없나요? 새 포럼을 신청해주세요.
          <br />운영자 검토 후 승인되면 포럼이 생성됩니다.
        </>
      )}
      successMessage={(
        <>
          운영자 검토 후 결과를 알려드리겠습니다.
          <br />내 포럼 페이지로 이동합니다...
        </>
      )}
      theme="emerald"
      tagPlaceholder="예: 약국운영, 복약상담, 재고관리"
    />
  );
}
