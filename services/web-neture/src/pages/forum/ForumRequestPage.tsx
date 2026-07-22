/**
 * ForumRequestPage — 포럼 개설 신청 (Neture · /forum 일반 진입점)
 *
 * WO-O4O-NETURE-FORUM-CREATION-REQUEST-ENTRY-ALIGN-KPA-V1
 * KPA(/forum/request) 정렬. 공통 ForumRequestForm(@o4o/shared-space-ui) +
 * createForumCategoryRequest(serviceCode='neture') 재사용 — 공급자 전용
 * /supplier/forum/request-category 와 동일 도메인 로직이나, 일반 로그인 회원이 /forum 에서
 * 신청할 수 있도록 back/success 경로를 /forum 으로 정렬한다.
 *   ⚠ /supplier/my-forum 은 <SupplierRoute> 가드 → 일반 회원 데드엔드 회피 위해 사용하지 않음.
 *   (Neture 는 일반 회원용 신청 상태 페이지 부재 — 후속 WO 대상)
 */
import { useNavigate } from 'react-router-dom';
import { ForumRequestForm, type ForumRequestFormPayload } from '@o4o/shared-space-ui';
import { createForumCategoryRequest } from '@/services/forumApi';

export default function ForumRequestPage() {
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
      onSuccess={() => setTimeout(() => navigate('/forum'), 3000)}
      backTo="/forum"
      backLabel="포럼으로 돌아가기"
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
          <br />포럼 홈으로 이동합니다...
        </>
      )}
      theme="emerald"
      tagPlaceholder="예: o4o, 상품제안, 파트너협업"
    />
  );
}
