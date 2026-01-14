/**
 * Forum Board Configuration
 * 
 * Work Order: WO-NETURE-TEST-SECTIONS-V1
 * 
 * 게시판 정의:
 * - test-feedback: 테스트 의견 (댓글 가능, 사용자 작성 가능)
 * - service-update: 서비스 업데이트 (댓글 불가, 운영자 전용)
 */

export interface ForumBoard {
    id: string;
    name: string;
    slug: string;
    description: string;
    allowComments: boolean;
    allowUserPosts: boolean;
    sortOrder: 'latest' | 'popular';
}

export const FORUM_BOARDS: Record<string, ForumBoard> = {
    'test-feedback': {
        id: 'test-feedback',
        name: '테스트 의견',
        slug: 'test-feedback',
        description: '서비스 개선을 위한 의견을 자유롭게 남겨주세요',
        allowComments: true,
        allowUserPosts: true,
        sortOrder: 'latest',
    },
    'service-update': {
        id: 'service-update',
        name: '서비스 업데이트',
        slug: 'service-update',
        description: '최근 개선 사항과 새로운 기능 안내',
        allowComments: false,
        allowUserPosts: false, // 운영자 전용
        sortOrder: 'latest',
    },
};

export function getForumBoard(slug: string): ForumBoard | undefined {
    return FORUM_BOARDS[slug];
}

export function getAllForumBoards(): ForumBoard[] {
    return Object.values(FORUM_BOARDS);
}
