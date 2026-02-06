/**
 * Migration: SeedKpaTestPostsComments
 *
 * WO-KPA-SOCIETY-DATA-SEED-V1.2 — Phase 3
 *
 * Creates 42 posts (7 per forum) and ~24 comments across 6 KPA forums.
 *
 * Access rules enforced:
 * - Open forums (accessLevel: all): any logged-in user can post
 * - Membership forums (accessLevel: member): only active members
 * - yaksa10-12 (pending) do NOT write in membership forums
 * - yaksa31-65 (본회 소속) do NOT write in KPA-c membership forum (종로구 전용)
 *
 * Idempotent: slug-based duplicate check
 * down(): deletes by fixed UUID arrays
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// Forum category UUIDs from Phase 2
const FORUM = {
  KPA_A_OPEN:       'f0000000-0a00-4000-f000-000000000001',
  KPA_A_MEMBERSHIP: 'f0000000-0a00-4000-f000-000000000002',
  KPA_B_OPEN:       'f0000000-0a00-4000-f000-000000000003',
  KPA_B_MEMBERSHIP: 'f0000000-0a00-4000-f000-000000000004',
  KPA_C_OPEN:       'f0000000-0a00-4000-f000-000000000005',
  KPA_C_MEMBERSHIP: 'f0000000-0a00-4000-f000-000000000006',
};

function postId(n: number): string {
  return `b0000000-0a00-4000-b000-${n.toString().padStart(12, '0')}`;
}

function commentId(n: number): string {
  return `c0000000-0a00-4000-c000-${n.toString().padStart(12, '0')}`;
}

function blockContent(text: string): string {
  return JSON.stringify([{ type: 'paragraph', data: { text } }]);
}

interface PostDef {
  id: string;
  forumId: string;
  authorEmail: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  type: string;
  isPinned: boolean;
}

interface CommentDef {
  id: string;
  postId: string;
  authorEmail: string;
  content: string;
}

// ============================================================================
// 42 Posts (7 per forum)
// ============================================================================

const POSTS: PostDef[] = [
  // ── KPA-a Open: 약국 운영 정보 나눔 (accessLevel: all) ──
  { id: postId(1), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '약국 인테리어 변경 시 주의사항', content: blockContent('약국 인테리어를 변경할 때 알아두면 좋은 사항들을 정리했습니다. 동선 설계, 조명, 진열대 배치 등 실무 경험을 공유합니다.'),
    excerpt: '약국 인테리어 변경 시 동선, 조명, 진열대 배치 주의사항', slug: 'kpa-a-pharmacy-interior-tips', type: 'discussion', isPinned: false },
  { id: postId(2), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa03@o4o.com',
    title: '2024년 약국 경영 트렌드 분석', content: blockContent('올해 약국 경영 트렌드를 분석해 봤습니다. 비대면 상담, 건강기능식품 매출 비중 변화 등 주요 변화를 살펴봅니다.'),
    excerpt: '2024년 약국 경영 주요 트렌드 분석', slug: 'kpa-a-pharmacy-trend-2024', type: 'discussion', isPinned: false },
  { id: postId(3), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa05@o4o.com',
    title: '건강기능식품 진열 노하우 공유', content: blockContent('건강기능식품 진열에 대한 실무 노하우를 공유합니다. 카테고리별 분류, 시즌별 전환, POP 활용 등을 다룹니다.'),
    excerpt: '건강기능식품 진열 카테고리별 분류 및 시즌별 전환 노하우', slug: 'kpa-a-supplement-display-tips', type: 'guide', isPinned: false },
  { id: postId(4), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa16@o4o.com',
    title: '약국 운영 중 겪는 어려움은?', content: blockContent('개국 후 약국 운영하면서 겪는 어려움이 있으시면 공유해 주세요. 함께 해결 방법을 찾아봅시다.'),
    excerpt: '약국 운영 중 겪는 어려움 공유', slug: 'kpa-a-pharmacy-challenges', type: 'question', isPinned: false },
  { id: postId(5), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa31@o4o.com',
    title: '근무약사가 본 약국 현장 이야기', content: blockContent('근무약사 입장에서 바라본 약국 현장의 다양한 이야기를 공유합니다.'),
    excerpt: '근무약사 시점의 약국 현장 이야기', slug: 'kpa-a-working-pharmacist-story', type: 'discussion', isPinned: false },
  { id: postId(6), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa41@o4o.com',
    title: '산업약사의 약국 방문 관찰기', content: blockContent('산업약사로서 여러 약국을 방문하며 느낀 점을 공유합니다. 약국과 제약회사 간 협력 방안도 논의해 봅시다.'),
    excerpt: '산업약사의 약국 방문 관찰기', slug: 'kpa-a-industry-pharmacist-visit', type: 'discussion', isPinned: false },
  { id: postId(7), forumId: FORUM.KPA_A_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '[공지] 약국 운영 정보 나눔 게시판 이용 안내', content: blockContent('약국 운영 정보 나눔 게시판 이용 안내입니다. 자유롭게 정보를 공유해 주세요.'),
    excerpt: '게시판 이용 안내', slug: 'kpa-a-open-forum-notice', type: 'announcement', isPinned: true },

  // ── KPA-a Membership: 개국약사 실무 토론방 (accessLevel: member) ──
  // Authors: active members only (NOT yaksa10-12 pending)
  { id: postId(8), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa02@o4o.com',
    title: '처방전 조제 시 유의사항 정리', content: blockContent('처방전 조제 시 주의해야 할 사항들을 정리했습니다. 특히 고위험 의약품 조제 시 확인 사항을 중점적으로 다룹니다.'),
    excerpt: '처방전 조제 시 유의사항 정리', slug: 'kpa-a-prescription-tips', type: 'discussion', isPinned: false },
  { id: postId(9), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa04@o4o.com',
    title: '의약품 재고관리 시스템 추천 부탁드립니다', content: blockContent('약국 재고관리 시스템을 교체하려고 합니다. 사용 중인 시스템 추천 부탁드립니다.'),
    excerpt: '약국 재고관리 시스템 추천 요청', slug: 'kpa-a-inventory-system-recommend', type: 'question', isPinned: false },
  { id: postId(10), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa06@o4o.com',
    title: '약국 직원 관리 노하우', content: blockContent('약국 직원 채용부터 교육, 관리까지의 노하우를 공유합니다.'),
    excerpt: '약국 직원 채용/교육/관리 노하우', slug: 'kpa-a-staff-management', type: 'discussion', isPinned: false },
  { id: postId(11), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa08@o4o.com',
    title: '건강보험 청구 실무 가이드', content: blockContent('건강보험 청구 실무에 대한 가이드입니다. 청구 시 자주 발생하는 오류와 해결 방법을 안내합니다.'),
    excerpt: '건강보험 청구 실무 가이드', slug: 'kpa-a-insurance-claim-guide', type: 'guide', isPinned: false },
  { id: postId(12), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa09@o4o.com',
    title: '약사 보수교육 후기 공유', content: blockContent('최근 다녀온 약사 보수교육 후기를 공유합니다. 교육 내용과 실무 적용 방안을 정리했습니다.'),
    excerpt: '약사 보수교육 후기', slug: 'kpa-a-continuing-edu-review', type: 'discussion', isPinned: false },
  { id: postId(13), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa03@o4o.com',
    title: '개국 초기 필수 준비사항 체크리스트', content: blockContent('개국을 준비하는 약사를 위한 필수 준비사항 체크리스트입니다.'),
    excerpt: '개국 준비 필수 체크리스트', slug: 'kpa-a-opening-checklist', type: 'guide', isPinned: false },
  { id: postId(14), forumId: FORUM.KPA_A_MEMBERSHIP, authorEmail: 'yaksa02@o4o.com',
    title: '[공지] 실무 토론방 이용 안내', content: blockContent('개국약사 실무 토론방 이용 안내입니다. 회원 전용 게시판으로, 승인된 회원만 글을 작성할 수 있습니다.'),
    excerpt: '실무 토론방 이용 안내', slug: 'kpa-a-membership-forum-notice', type: 'announcement', isPinned: true },

  // ── KPA-b Open: 지역 약사 소식 공유 (accessLevel: all, org: 서울특별시약사회) ──
  { id: postId(15), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '서울 지역 약사 모임 안내', content: blockContent('서울 지역 약사 모임 일정을 안내합니다. 관심 있는 분들의 참여를 기다립니다.'),
    excerpt: '서울 지역 약사 모임 일정 안내', slug: 'kpa-b-seoul-meeting-info', type: 'discussion', isPinned: false },
  { id: postId(16), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa16@o4o.com',
    title: '강남 지역 약국 현황 업데이트', content: blockContent('강남 지역 약국 현황을 업데이트합니다. 신규 개국 및 폐업 현황을 공유합니다.'),
    excerpt: '강남 지역 약국 현황 업데이트', slug: 'kpa-b-gangnam-pharmacy-status', type: 'discussion', isPinned: false },
  { id: postId(17), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa31@o4o.com',
    title: '지역 약사회 행사 후기', content: blockContent('최근 지역 약사회 행사에 다녀온 후기를 공유합니다.'),
    excerpt: '지역 약사회 행사 후기', slug: 'kpa-b-local-event-review', type: 'discussion', isPinned: false },
  { id: postId(18), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa02@o4o.com',
    title: '지역 약사 소식 - 정책 변경 안내', content: blockContent('지역 약사들에게 영향을 주는 정책 변경 사항을 안내합니다.'),
    excerpt: '약사 관련 정책 변경 안내', slug: 'kpa-b-policy-change-notice', type: 'announcement', isPinned: false },
  { id: postId(19), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa17@o4o.com',
    title: '약국 근처 주차 문제 해결 방안', content: blockContent('약국 주변 주차 문제로 고객 불편이 있는데, 해결 방안이 있을까요?'),
    excerpt: '약국 주차 문제 해결 방안 논의', slug: 'kpa-b-parking-issue', type: 'question', isPinned: false },
  { id: postId(20), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa41@o4o.com',
    title: '지역 약사 네트워킹 제안', content: blockContent('지역 약사 간 네트워킹 활성화를 위한 제안입니다.'),
    excerpt: '지역 약사 네트워킹 제안', slug: 'kpa-b-networking-proposal', type: 'discussion', isPinned: false },
  { id: postId(21), forumId: FORUM.KPA_B_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '[공지] 지역 약사 소식 게시판 안내', content: blockContent('지역 약사 소식을 공유하는 게시판입니다. 지역 관련 소식과 정보를 자유롭게 나눠주세요.'),
    excerpt: '지역 약사 소식 게시판 안내', slug: 'kpa-b-open-forum-notice', type: 'announcement', isPinned: true },

  // ── KPA-b Membership: 지역 약사회 내부 논의 (accessLevel: member, org: 서울특별시약사회) ──
  // Authors: active members only
  { id: postId(22), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa02@o4o.com',
    title: '지역 약사회 운영 방향 논의', content: blockContent('지역 약사회 운영 방향에 대해 회원 여러분의 의견을 듣고 싶습니다.'),
    excerpt: '지역 약사회 운영 방향 논의', slug: 'kpa-b-branch-direction', type: 'discussion', isPinned: false },
  { id: postId(23), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa04@o4o.com',
    title: '회비 사용 내역 투명 공개 제안', content: blockContent('약사회 회비 사용 내역을 투명하게 공개하자는 제안입니다.'),
    excerpt: '회비 사용 내역 투명 공개 제안', slug: 'kpa-b-fee-transparency', type: 'discussion', isPinned: false },
  { id: postId(24), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa06@o4o.com',
    title: '약사 복지 개선 아이디어', content: blockContent('지역 약사회 차원에서 약사 복지를 개선할 수 있는 아이디어를 논의합니다.'),
    excerpt: '약사 복지 개선 아이디어', slug: 'kpa-b-welfare-improvement', type: 'discussion', isPinned: false },
  { id: postId(25), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa08@o4o.com',
    title: '교육 프로그램 개선 의견 수렴', content: blockContent('약사 교육 프로그램 개선을 위한 의견을 수렴합니다.'),
    excerpt: '교육 프로그램 개선 의견', slug: 'kpa-b-education-feedback', type: 'question', isPinned: false },
  { id: postId(26), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa03@o4o.com',
    title: '신입 회원 환영 및 안내', content: blockContent('지역 약사회에 새로 가입하신 회원을 환영합니다. 활동 안내를 드립니다.'),
    excerpt: '신입 회원 환영 및 활동 안내', slug: 'kpa-b-welcome-new-members', type: 'discussion', isPinned: false },
  { id: postId(27), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa05@o4o.com',
    title: '정기총회 안건 사전 논의', content: blockContent('다음 정기총회에서 논의할 안건을 사전에 검토합니다.'),
    excerpt: '정기총회 안건 사전 논의', slug: 'kpa-b-general-meeting-agenda', type: 'discussion', isPinned: false },
  { id: postId(28), forumId: FORUM.KPA_B_MEMBERSHIP, authorEmail: 'yaksa02@o4o.com',
    title: '[공지] 내부 논의 게시판 이용 규칙', content: blockContent('지역 약사회 내부 논의 게시판 이용 규칙 안내입니다. 회원 전용이며, 비밀 유지를 부탁드립니다.'),
    excerpt: '내부 논의 게시판 이용 규칙', slug: 'kpa-b-membership-forum-notice', type: 'announcement', isPinned: true },

  // ── KPA-c Open: 분회 활동 소식 게시판 (accessLevel: all, org: 종로구약사회) ──
  { id: postId(29), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '종로구약사회 봉사활동 후기', content: blockContent('지난주 진행한 종로구약사회 봉사활동 후기를 공유합니다.'),
    excerpt: '종로구약사회 봉사활동 후기', slug: 'kpa-c-volunteer-review', type: 'discussion', isPinned: false },
  { id: postId(30), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa02@o4o.com',
    title: '분회 정기 모임 일정 공유', content: blockContent('다음 분회 정기 모임 일정을 공유합니다. 많은 참석 부탁드립니다.'),
    excerpt: '분회 정기 모임 일정', slug: 'kpa-c-regular-meeting-schedule', type: 'discussion', isPinned: false },
  { id: postId(31), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa03@o4o.com',
    title: '종로 지역 약국 소식', content: blockContent('종로 지역 약국 관련 최신 소식을 공유합니다.'),
    excerpt: '종로 지역 약국 최신 소식', slug: 'kpa-c-jongno-pharmacy-news', type: 'discussion', isPinned: false },
  { id: postId(32), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa05@o4o.com',
    title: '분회 체육대회 참가 안내', content: blockContent('분회 체육대회 참가 안내입니다. 회원과 가족 모두 참여 가능합니다.'),
    excerpt: '분회 체육대회 참가 안내', slug: 'kpa-c-sports-event', type: 'announcement', isPinned: false },
  { id: postId(33), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa07@o4o.com',
    title: '분회 회원 간 약품 교환 제안', content: blockContent('분회 회원 간 유통기한 임박 약품 교환 시스템을 만들면 어떨까요?'),
    excerpt: '약품 교환 시스템 제안', slug: 'kpa-c-medicine-exchange', type: 'question', isPinned: false },
  { id: postId(34), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa08@o4o.com',
    title: '종로구 건강 캠페인 참여 요청', content: blockContent('종로구청과 함께하는 건강 캠페인에 참여를 요청합니다.'),
    excerpt: '종로구 건강 캠페인 참여 요청', slug: 'kpa-c-health-campaign', type: 'discussion', isPinned: false },
  { id: postId(35), forumId: FORUM.KPA_C_OPEN, authorEmail: 'yaksa01@o4o.com',
    title: '[공지] 분회 활동 소식 게시판 안내', content: blockContent('분회 활동 소식을 공유하는 게시판입니다. 분회 관련 소식을 자유롭게 나눠주세요.'),
    excerpt: '분회 활동 소식 게시판 안내', slug: 'kpa-c-open-forum-notice', type: 'announcement', isPinned: true },

  // ── KPA-c Membership: 분회 운영진 전용 토론 (accessLevel: member, org: 종로구약사회) ──
  // Authors: active 종로구 members only (yaksa01-09, NOT 10-12 pending)
  { id: postId(36), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa01@o4o.com',
    title: '분회 예산 집행 현황 보고', content: blockContent('이번 분기 분회 예산 집행 현황을 보고합니다.'),
    excerpt: '분회 예산 집행 현황', slug: 'kpa-c-budget-report', type: 'discussion', isPinned: false },
  { id: postId(37), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa02@o4o.com',
    title: '운영진 회의 안건 정리', content: blockContent('다음 운영진 회의에서 논의할 안건을 정리합니다.'),
    excerpt: '운영진 회의 안건', slug: 'kpa-c-admin-meeting-agenda', type: 'discussion', isPinned: false },
  { id: postId(38), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa03@o4o.com',
    title: '신규 회원 승인 심사 기준 논의', content: blockContent('신규 회원 승인 심사 기준에 대해 운영진 간 논의가 필요합니다.'),
    excerpt: '신규 회원 승인 심사 기준', slug: 'kpa-c-member-approval-criteria', type: 'discussion', isPinned: false },
  { id: postId(39), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa04@o4o.com',
    title: '분회 행사 기획 아이디어', content: blockContent('다음 분기 분회 행사 기획 아이디어를 공유해 주세요.'),
    excerpt: '분회 행사 기획 아이디어', slug: 'kpa-c-event-planning', type: 'question', isPinned: false },
  { id: postId(40), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa05@o4o.com',
    title: '분회 홈페이지 개선 제안', content: blockContent('분회 홈페이지 개선 사항을 제안합니다.'),
    excerpt: '분회 홈페이지 개선 제안', slug: 'kpa-c-website-improvement', type: 'discussion', isPinned: false },
  { id: postId(41), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa06@o4o.com',
    title: '운영진 역할 분담 재조정', content: blockContent('운영진 역할 분담을 재조정하는 것에 대한 의견을 나눕니다.'),
    excerpt: '운영진 역할 분담 재조정', slug: 'kpa-c-role-adjustment', type: 'discussion', isPinned: false },
  { id: postId(42), forumId: FORUM.KPA_C_MEMBERSHIP, authorEmail: 'yaksa01@o4o.com',
    title: '[공지] 운영진 전용 토론 이용 안내', content: blockContent('분회 운영진 전용 토론 공간 이용 안내입니다. 운영진만 접근 가능합니다.'),
    excerpt: '운영진 전용 토론 이용 안내', slug: 'kpa-c-membership-forum-notice', type: 'announcement', isPinned: true },
];

// ============================================================================
// 24 Comments (4 per forum)
// ============================================================================

const COMMENTS: CommentDef[] = [
  // KPA-a Open comments
  { id: commentId(1), postId: postId(1), authorEmail: 'yaksa03@o4o.com',
    content: '좋은 정보 감사합니다. 인테리어 업체 추천도 부탁드려요.' },
  { id: commentId(2), postId: postId(1), authorEmail: 'yaksa16@o4o.com',
    content: '저도 최근 리모델링했는데, LED 조명이 약품 보관에 유리하더라고요.' },
  { id: commentId(3), postId: postId(4), authorEmail: 'yaksa05@o4o.com',
    content: '인력 채용이 가장 큰 어려움입니다. 좋은 약사 구하기가 어려워요.' },
  { id: commentId(4), postId: postId(2), authorEmail: 'yaksa31@o4o.com',
    content: '건강기능식품 매출 비중이 정말 많이 늘었습니다. 공감합니다.' },

  // KPA-a Membership comments (only active members)
  { id: commentId(5), postId: postId(8), authorEmail: 'yaksa04@o4o.com',
    content: '고위험 의약품 체크리스트 문서로 정리해 주시면 좋겠습니다.' },
  { id: commentId(6), postId: postId(9), authorEmail: 'yaksa06@o4o.com',
    content: '저는 팜잇 시스템을 사용 중인데, 만족도가 높습니다.' },
  { id: commentId(7), postId: postId(9), authorEmail: 'yaksa08@o4o.com',
    content: '팜잇 외에 유비케어도 좋습니다. 비용 비교해 보세요.' },
  { id: commentId(8), postId: postId(11), authorEmail: 'yaksa02@o4o.com',
    content: '건강보험 청구 시 자주 발생하는 오류 목록이 정말 유용합니다.' },

  // KPA-b Open comments
  { id: commentId(9), postId: postId(15), authorEmail: 'yaksa16@o4o.com',
    content: '참석하고 싶습니다. 정확한 장소를 알려주세요.' },
  { id: commentId(10), postId: postId(16), authorEmail: 'yaksa01@o4o.com',
    content: '강남 쪽 신규 약국이 많이 늘었네요. 경쟁이 치열해질 것 같습니다.' },
  { id: commentId(11), postId: postId(19), authorEmail: 'yaksa17@o4o.com',
    content: '저희 약국은 인근 주차장과 제휴해서 해결했습니다.' },
  { id: commentId(12), postId: postId(15), authorEmail: 'yaksa31@o4o.com',
    content: '좋은 기회네요. 가능하면 참석하겠습니다.' },

  // KPA-b Membership comments (active members only)
  { id: commentId(13), postId: postId(22), authorEmail: 'yaksa04@o4o.com',
    content: '운영 방향에 대해 온라인 설문조사를 진행하면 어떨까요?' },
  { id: commentId(14), postId: postId(23), authorEmail: 'yaksa06@o4o.com',
    content: '투명 공개에 전적으로 찬성합니다. 분기별 보고가 좋겠습니다.' },
  { id: commentId(15), postId: postId(25), authorEmail: 'yaksa08@o4o.com',
    content: '온라인 강의 플랫폼 도입도 검토해 보면 좋겠습니다.' },
  { id: commentId(16), postId: postId(22), authorEmail: 'yaksa09@o4o.com',
    content: '회원 의견 수렴 절차를 정기화하자는 의견에 동의합니다.' },

  // KPA-c Open comments
  { id: commentId(17), postId: postId(29), authorEmail: 'yaksa02@o4o.com',
    content: '봉사활동 사진도 공유해 주시면 좋겠습니다!' },
  { id: commentId(18), postId: postId(33), authorEmail: 'yaksa03@o4o.com',
    content: '좋은 아이디어입니다. 약품 교환 앱이 있으면 편리하겠네요.' },
  { id: commentId(19), postId: postId(30), authorEmail: 'yaksa05@o4o.com',
    content: '일정 확인했습니다. 참석하겠습니다.' },
  { id: commentId(20), postId: postId(34), authorEmail: 'yaksa07@o4o.com',
    content: '건강 캠페인 좋은 취지네요. 적극 참여하겠습니다.' },

  // KPA-c Membership comments (active 종로구 members only)
  { id: commentId(21), postId: postId(36), authorEmail: 'yaksa02@o4o.com',
    content: '예산 집행 잔액이 충분한지 확인 부탁드립니다.' },
  { id: commentId(22), postId: postId(38), authorEmail: 'yaksa04@o4o.com',
    content: '심사 기준을 명확히 문서화하는 것이 필요합니다.' },
  { id: commentId(23), postId: postId(37), authorEmail: 'yaksa05@o4o.com',
    content: '회의 안건에 봉사활동 계획도 추가 부탁드립니다.' },
  { id: commentId(24), postId: postId(39), authorEmail: 'yaksa06@o4o.com',
    content: '약국 탐방 이벤트는 어떨까요? 회원 간 친목 도모에 좋을 것 같습니다.' },
];

export class SeedKpaTestPostsComments20260207300000 implements MigrationInterface {
  name = 'SeedKpaTestPostsComments20260207300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] KPA Posts & Comments - Starting...');

    // Check tables exist
    const hasPostTable = await queryRunner.hasTable('forum_post');
    const hasCommentTable = await queryRunner.hasTable('forum_comment');
    if (!hasPostTable || !hasCommentTable) {
      console.log('[SEED] forum_post or forum_comment table does not exist, skipping');
      return;
    }

    // Build email→userId cache
    const emailSet = new Set<string>();
    for (const p of POSTS) emailSet.add(p.authorEmail);
    for (const c of COMMENTS) emailSet.add(c.authorEmail);

    const userMap = new Map<string, string>();
    for (const email of emailSet) {
      const result = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`, [email]
      );
      if (result.length > 0) {
        userMap.set(email, result[0].id);
      }
    }

    // Step 1: Insert posts
    let createdPosts = 0;
    for (const post of POSTS) {
      const authorId = userMap.get(post.authorEmail);
      if (!authorId) {
        console.log(`[SEED] User not found: ${post.authorEmail}, skipping post`);
        continue;
      }

      const existing = await queryRunner.query(
        `SELECT id FROM forum_post WHERE slug = $1`, [post.slug]
      );
      if (existing.length > 0) {
        console.log(`[SEED] Post already exists: ${post.slug}, skipping`);
        continue;
      }

      await queryRunner.query(`
        INSERT INTO forum_post (
          "id", "title", "slug", "content", "excerpt",
          "type", "status", "categoryId", "author_id",
          "isPinned", "isLocked", "allowComments",
          "viewCount", "commentCount", "likeCount",
          "published_at", "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, 'publish', $7, $8,
          $9, false, true,
          0, 0, 0,
          NOW(), NOW(), NOW()
        )
      `, [
        post.id,
        post.title,
        post.slug,
        post.content,
        post.excerpt,
        post.type,
        post.forumId,
        authorId,
        post.isPinned,
      ]);
      createdPosts++;
    }
    console.log(`[SEED] Posts created: ${createdPosts} / ${POSTS.length}`);

    // Step 2: Insert comments
    let createdComments = 0;
    for (const comment of COMMENTS) {
      const authorId = userMap.get(comment.authorEmail);
      if (!authorId) {
        console.log(`[SEED] User not found: ${comment.authorEmail}, skipping comment`);
        continue;
      }

      const existing = await queryRunner.query(
        `SELECT id FROM forum_comment WHERE id = $1`, [comment.id]
      );
      if (existing.length > 0) continue;

      await queryRunner.query(`
        INSERT INTO forum_comment (
          "id", "postId", "author_id", "content",
          "status", "likeCount", "replyCount", "isEdited",
          "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, $4,
          'publish', 0, 0, false,
          NOW(), NOW()
        )
      `, [
        comment.id,
        comment.postId,
        authorId,
        comment.content,
      ]);
      createdComments++;
    }
    console.log(`[SEED] Comments created: ${createdComments} / ${COMMENTS.length}`);

    // Step 3: Update commentCount on posts
    const commentCountMap = new Map<string, number>();
    for (const c of COMMENTS) {
      commentCountMap.set(c.postId, (commentCountMap.get(c.postId) || 0) + 1);
    }
    for (const [pId, count] of commentCountMap) {
      await queryRunner.query(
        `UPDATE forum_post SET "commentCount" = $1 WHERE id = $2`,
        [count, pId]
      );
    }

    // Step 4: Update postCount on categories
    const postCountMap = new Map<string, number>();
    for (const p of POSTS) {
      postCountMap.set(p.forumId, (postCountMap.get(p.forumId) || 0) + 1);
    }
    for (const [fId, count] of postCountMap) {
      await queryRunner.query(
        `UPDATE forum_category SET "postCount" = "postCount" + $1 WHERE id = $2`,
        [count, fId]
      );
    }

    // Step 5: Summary
    console.log('');
    console.log('=== KPA Posts & Comments Seed Complete ===');
    console.log(`  Posts: ${createdPosts}`);
    console.log(`  Comments: ${createdComments}`);
    console.log('');
    console.log('  Per forum:');
    console.log('    KPA-a Open:       7 posts, 4 comments');
    console.log('    KPA-a Membership: 7 posts, 4 comments');
    console.log('    KPA-b Open:       7 posts, 4 comments');
    console.log('    KPA-b Membership: 7 posts, 4 comments');
    console.log('    KPA-c Open:       7 posts, 4 comments');
    console.log('    KPA-c Membership: 7 posts, 4 comments');
    console.log('');
    console.log('  Access rules enforced:');
    console.log('    - yaksa10-12 (pending): NOT in membership forums');
    console.log('    - yaksa31-65 (본회): NOT in KPA-c membership forum');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] Cleaning up KPA posts & comments...');

    // 1. Delete comments (by fixed IDs)
    const cIds = COMMENTS.map(c => c.id);
    if (cIds.length > 0) {
      const commentResult = await queryRunner.query(
        `DELETE FROM forum_comment WHERE id = ANY($1::uuid[])`, [cIds]
      );
      console.log(`[SEED] Deleted comments: ${commentResult?.[1] ?? 0}`);
    }

    // 2. Delete posts (by fixed IDs)
    const pIds = POSTS.map(p => p.id);
    if (pIds.length > 0) {
      const postResult = await queryRunner.query(
        `DELETE FROM forum_post WHERE id = ANY($1::uuid[])`, [pIds]
      );
      console.log(`[SEED] Deleted posts: ${postResult?.[1] ?? 0}`);
    }

    // 3. Reset postCount on categories
    const forumIds = Object.values(FORUM);
    for (const fId of forumIds) {
      await queryRunner.query(
        `UPDATE forum_category SET "postCount" = 0 WHERE id = $1`, [fId]
      );
    }

    console.log('[SEED] Posts & comments cleanup complete');
  }
}
