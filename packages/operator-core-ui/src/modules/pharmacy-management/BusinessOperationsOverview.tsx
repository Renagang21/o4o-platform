import { CooperationOperationsOverview } from '../CooperationOperationsOverview';
import type { InboxClient } from '../OperatorInbox';
import type { SemiFranchise } from './api';

/** Pharmacy-unit business adapter. Personal cooperative membership uses its own host adapter. */
export function BusinessOperationsOverview({ business, client, accountKey, forumHref, homeEditorHref }: Readonly<{
  business: SemiFranchise;
  client: InboxClient;
  accountKey: string;
  forumHref: string;
  homeEditorHref?: string;
}>) {
  const key = encodeURIComponent(business.key);
  const base = `/operator/semi-franchises?key=${key}`;
  const inbox = `/operator/inbox/business/${key}`;
  const tabs: Record<string, string> = { members: 'memberships', contents: 'contents', proposals: 'proposals', events: 'events', recruitments: 'recruitments' };
  return <CooperationOperationsOverview client={client} scopeKey={`${accountKey}:${business.key}`}
    endpoint={`/operator-inbox/business/${key}`} inboxHref={inbox}
    taskHref={task => tabs[task] ? `${base}&tab=${tabs[task]}` : undefined}
    areas={[
      { title: '공지', description: '회원에게 전할 안내를 참여자 게시판의 공지로 게시합니다.', links: [{ label: '회원 게시판 공지 관리', href: forumHref }, ...(homeEditorHref ? [{ label: '공개 홈 편집', href: homeEditorHref }] : [])] },
      { title: '자료', description: '등재 요청을 검토하고 게시·보관합니다. 원본을 수정해도 약국이 만든 사본은 유지됩니다.', links: [{ label: '자료 검토·게시', href: `${base}&tab=contents` }] },
      { title: '참여 사업', description: '공급 제안·이벤트 상품·모집 조건을 각각 검토합니다. 모집 조건의 노출 승인은 참여 약국 승인과 별개입니다.', links: [{ label: '공급 제안', href: `${base}&tab=proposals` }, { label: '이벤트 상품', href: `${base}&tab=events` }, { label: '모집 조건', href: `${base}&tab=recruitments` }] },
      { title: '지원', description: '접수·확인 중·답변 완료·종료 상태와 알림 전달 결과를 관리합니다.', links: [{ label: '문의 처리', href: inbox }] },
      { title: '회원·운영 설정', description: '이 사업의 약국 가입 신청과 진열·현장 요구·약관을 관리합니다.', links: [{ label: '약국 가입 신청', href: `${base}&tab=memberships` }, { label: '사업 설정', href: `${base}&tab=settings` }] },
    ]} />;
}
