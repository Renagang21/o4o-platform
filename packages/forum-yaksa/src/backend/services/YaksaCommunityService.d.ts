import { Repository } from 'typeorm';
import { YaksaCommunity, CommunityType } from '../entities/YaksaCommunity.js';
import { YaksaCommunityMember, CommunityMemberRole } from '../entities/YaksaCommunityMember.js';
import type { ForumPost } from '@o4o-apps/forum';
/**
 * YaksaCommunityService
 *
 * Handles Yaksa community management including:
 * - Community creation and management
 * - Membership management
 * - Community feeds
 */
export declare class YaksaCommunityService {
    private communityRepository;
    private memberRepository;
    private forumPostRepository;
    constructor(communityRepository: Repository<YaksaCommunity>, memberRepository: Repository<YaksaCommunityMember>, forumPostRepository: Repository<ForumPost>);
    /**
     * Ensure GLOBAL community exists
     * Creates one if it doesn't exist, returns existing one if it does
     */
    ensureGlobalCommunity(): Promise<YaksaCommunity>;
    /**
     * Create a new community
     */
    createCommunity(data: {
        name: string;
        description?: string;
        type: CommunityType;
        ownerUserId: string;
        metadata?: Record<string, unknown>;
    }): Promise<YaksaCommunity>;
    /**
     * Get community by ID
     */
    getCommunity(communityId: string): Promise<YaksaCommunity | null>;
    /**
     * List communities where user is a member
     * Also includes GLOBAL community (everyone can see it)
     * Also ensures GLOBAL community exists (lazy initialization)
     */
    listMyCommunities(userId: string): Promise<YaksaCommunity[]>;
    /**
     * Get unified feed from all communities where user is a member
     * This is used for the dashboard view
     */
    getAllCommunityFeed(userId: string, options?: {
        limit?: number;
        offset?: number;
        communityType?: CommunityType;
    }): Promise<ForumPost[]>;
    /**
     * List communities by type (e.g., branch communities)
     */
    listCommunitiesByType(type: CommunityType): Promise<YaksaCommunity[]>;
    /**
     * Join a community
     */
    joinCommunity(data: {
        communityId: string;
        userId: string;
        role?: CommunityMemberRole;
    }): Promise<YaksaCommunityMember>;
    /**
     * Leave a community
     */
    leaveCommunity(communityId: string, userId: string): Promise<void>;
    /**
     * Get community members
     */
    getCommunityMembers(communityId: string): Promise<YaksaCommunityMember[]>;
    /**
     * Get community feed
     *
     * Fetches forum posts that belong to this Yaksa community
     * Posts are identified by metadata.yaksa.communityId
     * Pinned posts appear first, then sorted by creation date
     * Admins/owners can see pending posts, members see only published posts
     */
    getCommunityFeed(communityId: string, options?: {
        limit?: number;
        offset?: number;
        userId?: string;
    }): Promise<ForumPost[]>;
    /**
     * Create a post in a community
     *
     * This wraps the forum-core post creation and adds Yaksa community metadata
     * If community requires approval, post status will be 'pending'
     * Announcements can only be created by admins/owners
     */
    createCommunityPost(data: {
        communityId: string;
        userId: string;
        title: string;
        content: string;
        categoryId: string;
        type?: string;
        tags?: string[];
        isAnnouncement?: boolean;
    }): Promise<ForumPost>;
    /**
     * Generate URL-friendly slug from title
     */
    private generateSlug;
    /**
     * Check if user is member of community
     */
    isMember(communityId: string, userId: string): Promise<boolean>;
    /**
     * Get user's role in community
     */
    getUserRole(communityId: string, userId: string): Promise<CommunityMemberRole | null>;
    /**
     * Pin a post in a community
     * Only admins and owners can pin posts
     */
    pinPost(postId: string, userId: string): Promise<ForumPost>;
    /**
     * Unpin a post in a community
     * Only admins and owners can unpin posts
     */
    unpinPost(postId: string, userId: string): Promise<ForumPost>;
    /**
     * Approve a pending post in a community
     * Only admins and owners can approve posts
     */
    approvePost(postId: string, userId: string): Promise<ForumPost>;
    /**
     * Set a post as announcement in a community
     * Only admins and owners can mark posts as announcements
     */
    setAnnouncement(postId: string, userId: string): Promise<ForumPost>;
    /**
     * Unset a post as announcement in a community
     * Only admins and owners can unmark posts as announcements
     */
    unsetAnnouncement(postId: string, userId: string): Promise<ForumPost>;
}
//# sourceMappingURL=YaksaCommunityService.d.ts.map