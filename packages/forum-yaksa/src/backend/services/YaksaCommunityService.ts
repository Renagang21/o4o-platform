import { Repository } from 'typeorm';
import { YaksaCommunity, CommunityType } from '../entities/YaksaCommunity.js';
import { YaksaCommunityMember, CommunityMemberRole } from '../entities/YaksaCommunityMember.js';
import type { ForumPost } from '@o4o/forum-core';
import { normalizeContent } from '@o4o/forum-core';

/**
 * YaksaCommunityService
 *
 * Handles Yaksa community management including:
 * - Community creation and management
 * - Membership management
 * - Community feeds
 */
export class YaksaCommunityService {
  private communityRepository: Repository<YaksaCommunity>;
  private memberRepository: Repository<YaksaCommunityMember>;
  private forumPostRepository: Repository<ForumPost>;

  constructor(
    communityRepository: Repository<YaksaCommunity>,
    memberRepository: Repository<YaksaCommunityMember>,
    forumPostRepository: Repository<ForumPost>
  ) {
    this.communityRepository = communityRepository;
    this.memberRepository = memberRepository;
    this.forumPostRepository = forumPostRepository;
  }

  /**
   * Ensure GLOBAL community exists
   * Creates one if it doesn't exist, returns existing one if it does
   */
  async ensureGlobalCommunity(): Promise<YaksaCommunity> {
    // Check if GLOBAL community already exists
    const existingGlobal = await this.communityRepository.findOne({
      where: { type: CommunityType.GLOBAL },
    });

    if (existingGlobal) {
      return existingGlobal;
    }

    // Create GLOBAL community
    // Note: GLOBAL community doesn't have a specific owner
    const globalCommunity = this.communityRepository.create({
      name: '전체 약사 커뮤니티',
      description: '모든 약사가 참여하는 전체 커뮤니티입니다',
      type: CommunityType.GLOBAL,
      ownerUserId: '00000000-0000-0000-0000-000000000000', // System user ID
      metadata: {
        isSystem: true,
        autoCreated: true,
      },
    });

    return await this.communityRepository.save(globalCommunity);
  }

  /**
   * Create a new community
   */
  async createCommunity(data: {
    name: string;
    description?: string;
    type: CommunityType;
    ownerUserId: string;
    metadata?: Record<string, unknown>;
  }): Promise<YaksaCommunity> {
    // Create community
    const community = this.communityRepository.create({
      name: data.name,
      description: data.description,
      type: data.type,
      ownerUserId: data.ownerUserId,
      metadata: data.metadata,
    });

    const savedCommunity = await this.communityRepository.save(community);

    // Add owner as member with OWNER role
    const ownerMember = this.memberRepository.create({
      communityId: savedCommunity.id,
      userId: data.ownerUserId,
      role: CommunityMemberRole.OWNER,
    });

    await this.memberRepository.save(ownerMember);

    return savedCommunity;
  }

  /**
   * Get community by ID
   */
  async getCommunity(communityId: string): Promise<YaksaCommunity | null> {
    return await this.communityRepository.findOne({
      where: { id: communityId },
    });
  }

  /**
   * List communities where user is a member
   * Also includes GLOBAL community (everyone can see it)
   * Also ensures GLOBAL community exists (lazy initialization)
   */
  async listMyCommunities(userId: string): Promise<YaksaCommunity[]> {
    // Ensure GLOBAL community exists
    const globalCommunity = await this.ensureGlobalCommunity();

    const memberships = await this.memberRepository.find({
      where: { userId },
    });

    const communityIds = memberships.map(m => m.communityId);

    // Get user's communities
    let userCommunities: YaksaCommunity[] = [];
    if (communityIds.length > 0) {
      userCommunities = await this.communityRepository.findByIds(communityIds);
    }

    // Check if GLOBAL community is already in the list
    const hasGlobal = userCommunities.some(c => c.id === globalCommunity.id);

    // Add GLOBAL community if not already included
    if (!hasGlobal) {
      userCommunities.unshift(globalCommunity); // Add at the beginning
    }

    return userCommunities;
  }

  /**
   * Get unified feed from all communities where user is a member
   * This is used for the dashboard view
   */
  async getAllCommunityFeed(userId: string, options?: {
    limit?: number;
    offset?: number;
    communityType?: CommunityType;
  }): Promise<ForumPost[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const communityType = options?.communityType;

    // Get user's communities
    const communities = await this.listMyCommunities(userId);

    if (communities.length === 0) {
      return [];
    }

    const communityIds = communities
      .filter(c => !communityType || c.type === communityType)
      .map(c => c.id);

    if (communityIds.length === 0) {
      return [];
    }

    // Check if user is admin/owner of any community
    const userRoles = await Promise.all(
      communityIds.map(id => this.getUserRole(id, userId))
    );
    const isAdminOrOwnerInAny = userRoles.some(
      role => role === CommunityMemberRole.ADMIN || role === CommunityMemberRole.OWNER
    );

    // Query all posts from user's communities
    const queryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where("post.metadata->'yaksa'->>'communityId' IN (:...communityIds)", { communityIds });

    // Filter by status based on user role
    if (!isAdminOrOwnerInAny) {
      // Regular members only see published posts
      queryBuilder.andWhere("post.status = :status", { status: 'publish' });
    }
    // Admins/owners see all posts (no status filter)

    const posts = await queryBuilder
      .orderBy("CASE WHEN post.metadata->'yaksa'->>'pinned' = 'true' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy("CASE WHEN post.metadata->'yaksa'->>'isAnnouncement' = 'true' THEN 1 ELSE 2 END", 'ASC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return posts;
  }

  /**
   * List communities by type (e.g., branch communities)
   */
  async listCommunitiesByType(type: CommunityType): Promise<YaksaCommunity[]> {
    return await this.communityRepository.find({
      where: { type },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Join a community
   */
  async joinCommunity(data: {
    communityId: string;
    userId: string;
    role?: CommunityMemberRole;
  }): Promise<YaksaCommunityMember> {
    // Check if already a member
    const existing = await this.memberRepository.findOne({
      where: {
        communityId: data.communityId,
        userId: data.userId,
      },
    });

    if (existing) {
      throw new Error('Already a member of this community');
    }

    // Create membership
    const member = this.memberRepository.create({
      communityId: data.communityId,
      userId: data.userId,
      role: data.role || CommunityMemberRole.MEMBER,
    });

    return await this.memberRepository.save(member);
  }

  /**
   * Leave a community
   */
  async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: {
        communityId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Not a member of this community');
    }

    // Prevent owner from leaving
    if (member.role === CommunityMemberRole.OWNER) {
      throw new Error('Community owner cannot leave. Transfer ownership first.');
    }

    await this.memberRepository.remove(member);
  }

  /**
   * Get community members
   */
  async getCommunityMembers(communityId: string): Promise<YaksaCommunityMember[]> {
    return await this.memberRepository.find({
      where: { communityId },
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * Get community feed
   *
   * Fetches forum posts that belong to this Yaksa community
   * Posts are identified by metadata.yaksa.communityId
   * Pinned posts appear first, then sorted by creation date
   * Admins/owners can see pending posts, members see only published posts
   */
  async getCommunityFeed(communityId: string, options?: {
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<ForumPost[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const userId = options?.userId;

    // Verify community exists
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
    });

    if (!community) {
      throw new Error('Community not found');
    }

    // Check if user is admin or owner
    let isAdminOrOwner = false;
    if (userId) {
      const userRole = await this.getUserRole(communityId, userId);
      isAdminOrOwner = userRole === CommunityMemberRole.ADMIN || userRole === CommunityMemberRole.OWNER;
    }

    // Query forum posts with metadata filter
    // TypeORM query builder with JSONB filter
    // Sort: pinned (0), announcements (1), regular (2), then by creation date
    const queryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where("post.metadata->'yaksa'->>'communityId' = :communityId", { communityId });

    // Filter by status based on user role
    if (!isAdminOrOwner) {
      // Regular members only see published posts
      queryBuilder.andWhere("post.status = :status", { status: 'publish' });
    }
    // Admins/owners see all posts (no status filter)

    const posts = await queryBuilder
      .orderBy("CASE WHEN post.metadata->'yaksa'->>'pinned' = 'true' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy("CASE WHEN post.metadata->'yaksa'->>'isAnnouncement' = 'true' THEN 1 ELSE 2 END", 'ASC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return posts;
  }

  /**
   * Create a post in a community
   *
   * This wraps the forum-core post creation and adds Yaksa community metadata
   * If community requires approval, post status will be 'pending'
   * Announcements can only be created by admins/owners
   */
  async createCommunityPost(data: {
    communityId: string;
    userId: string;
    title: string;
    content: string;
    categoryId: string;
    type?: string;
    tags?: string[];
    isAnnouncement?: boolean;
  }): Promise<ForumPost> {
    // Verify community exists and user is a member
    const community = await this.communityRepository.findOne({
      where: { id: data.communityId },
    });

    if (!community) {
      throw new Error('Community not found');
    }

    const isMember = await this.isMember(data.communityId, data.userId);
    if (!isMember) {
      throw new Error('You must be a member of this community to create posts');
    }

    // Check if user can create announcements
    if (data.isAnnouncement) {
      const userRole = await this.getUserRole(data.communityId, data.userId);
      if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
        throw new Error('Only admins and owners can create announcements');
      }
    }

    // Determine post status based on requireApproval setting
    const status = community.requireApproval ? 'pending' : 'publish';
    const publishedAt = community.requireApproval ? null : new Date();

    // Create the forum post with Yaksa metadata
    // Normalize content to Block[] format
    const normalizedContent = normalizeContent(data.content);

    const post = this.forumPostRepository.create({
      title: data.title,
      content: normalizedContent,
      authorId: data.userId,
      categoryId: data.categoryId,
      type: data.type as any || 'discussion',
      tags: data.tags,
      status: status as any,
      slug: this.generateSlug(data.title),
      metadata: {
        extensions: {
          yaksa: {
            communityId: data.communityId,
            isAnnouncement: data.isAnnouncement || false,
          },
        },
      },
      publishedAt: publishedAt as any,
    });

    const savedPost = await this.forumPostRepository.save(post);
    return savedPost;
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200) + '-' + Date.now();
  }

  /**
   * Check if user is member of community
   */
  async isMember(communityId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: {
        communityId,
        userId,
      },
    });

    return !!member;
  }

  /**
   * Get user's role in community
   */
  async getUserRole(communityId: string, userId: string): Promise<CommunityMemberRole | null> {
    const member = await this.memberRepository.findOne({
      where: {
        communityId,
        userId,
      },
    });

    return member?.role || null;
  }

  /**
   * Pin a post in a community
   * Only admins and owners can pin posts
   */
  async pinPost(postId: string, userId: string): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Extract community ID from metadata
    const metadata = post.metadata as any;
    const communityId = metadata?.yaksa?.communityId;
    if (!communityId) {
      throw new Error('Post is not associated with a community');
    }

    // Check if user is admin or owner
    const userRole = await this.getUserRole(communityId, userId);
    if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
      throw new Error('Only admins and owners can pin posts');
    }

    // Update metadata to set pinned = true
    post.metadata = {
      ...metadata,
      yaksa: {
        ...(metadata.yaksa || {}),
        pinned: true,
      },
    } as any;

    return await this.forumPostRepository.save(post);
  }

  /**
   * Unpin a post in a community
   * Only admins and owners can unpin posts
   */
  async unpinPost(postId: string, userId: string): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Extract community ID from metadata
    const metadata = post.metadata as any;
    const communityId = metadata?.yaksa?.communityId;
    if (!communityId) {
      throw new Error('Post is not associated with a community');
    }

    // Check if user is admin or owner
    const userRole = await this.getUserRole(communityId, userId);
    if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
      throw new Error('Only admins and owners can unpin posts');
    }

    // Update metadata to set pinned = false
    post.metadata = {
      ...metadata,
      yaksa: {
        ...(metadata.yaksa || {}),
        pinned: false,
      },
    } as any;

    return await this.forumPostRepository.save(post);
  }

  /**
   * Approve a pending post in a community
   * Only admins and owners can approve posts
   */
  async approvePost(postId: string, userId: string): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Extract community ID from metadata
    const metadata = post.metadata as any;
    const communityId = metadata?.yaksa?.communityId;
    if (!communityId) {
      throw new Error('Post is not associated with a community');
    }

    // Check if user is admin or owner
    const userRole = await this.getUserRole(communityId, userId);
    if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
      throw new Error('Only admins and owners can approve posts');
    }

    // Change status from pending to publish
    post.status = 'publish' as any;
    post.publishedAt = new Date() as any;

    return await this.forumPostRepository.save(post);
  }

  /**
   * Set a post as announcement in a community
   * Only admins and owners can mark posts as announcements
   */
  async setAnnouncement(postId: string, userId: string): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Extract community ID from metadata
    const metadata = post.metadata as any;
    const communityId = metadata?.yaksa?.communityId;
    if (!communityId) {
      throw new Error('Post is not associated with a community');
    }

    // Check if user is admin or owner
    const userRole = await this.getUserRole(communityId, userId);
    if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
      throw new Error('Only admins and owners can set announcements');
    }

    // Update metadata to set isAnnouncement = true
    post.metadata = {
      ...metadata,
      yaksa: {
        ...(metadata.yaksa || {}),
        isAnnouncement: true,
      },
    } as any;

    return await this.forumPostRepository.save(post);
  }

  /**
   * Unset a post as announcement in a community
   * Only admins and owners can unmark posts as announcements
   */
  async unsetAnnouncement(postId: string, userId: string): Promise<ForumPost> {
    const post = await this.forumPostRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Extract community ID from metadata
    const metadata = post.metadata as any;
    const communityId = metadata?.yaksa?.communityId;
    if (!communityId) {
      throw new Error('Post is not associated with a community');
    }

    // Check if user is admin or owner
    const userRole = await this.getUserRole(communityId, userId);
    if (userRole !== CommunityMemberRole.ADMIN && userRole !== CommunityMemberRole.OWNER) {
      throw new Error('Only admins and owners can unset announcements');
    }

    // Update metadata to set isAnnouncement = false
    post.metadata = {
      ...metadata,
      yaksa: {
        ...(metadata.yaksa || {}),
        isAnnouncement: false,
      },
    } as any;

    return await this.forumPostRepository.save(post);
  }
}
