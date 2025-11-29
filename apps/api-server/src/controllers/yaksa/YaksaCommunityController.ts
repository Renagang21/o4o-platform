import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { YaksaCommunity, YaksaCommunityMember, YaksaCommunityService } from '@o4o-apps/forum-yaksa';
import { ForumPost } from '@o4o-apps/forum';

export class YaksaCommunityController {
  private communityService: YaksaCommunityService;

  constructor() {
    const communityRepository = AppDataSource.getRepository(YaksaCommunity);
    const memberRepository = AppDataSource.getRepository(YaksaCommunityMember);
    const forumPostRepository = AppDataSource.getRepository(ForumPost);
    this.communityService = new YaksaCommunityService(
      communityRepository,
      memberRepository,
      forumPostRepository
    );
  }

  /**
   * GET /yaksa/forum/communities/mine
   * List communities where the current user is a member
   */
  async listMyCommunities(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const communities = await this.communityService.listMyCommunities(userId);

      res.json({
        success: true,
        data: communities,
        count: communities.length,
      });
    } catch (error: any) {
      console.error('Error listing my communities:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list communities',
      });
    }
  }

  /**
   * GET /yaksa/forum/communities/:id
   * Get community details
   */
  async getCommunity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const community = await this.communityService.getCommunity(id);

      if (!community) {
        res.status(404).json({
          success: false,
          error: 'Community not found',
        });
        return;
      }

      res.json({
        success: true,
        data: community,
      });
    } catch (error: any) {
      console.error('Error getting community:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get community',
      });
    }
  }

  /**
   * GET /yaksa/forum/communities/:id/feed
   * Get community feed (posts in this community)
   */
  async getCommunityFeed(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if community exists
      const community = await this.communityService.getCommunity(id);

      if (!community) {
        res.status(404).json({
          success: false,
          error: 'Community not found',
        });
        return;
      }

      // Check if user is a member (for non-GLOBAL communities)
      if (community.type !== 'global') {
        const isMember = await this.communityService.isMember(id, userId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'You must be a member of this community to view its feed',
          });
          return;
        }
      }

      const feed = await this.communityService.getCommunityFeed(id, { limit, offset, userId });

      res.json({
        success: true,
        data: feed,
        count: feed.length,
        pagination: {
          limit,
          offset,
          hasMore: feed.length === limit,
        },
      });
    } catch (error: any) {
      console.error('Error getting community feed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get community feed',
      });
    }
  }

  /**
   * POST /yaksa/forum/communities
   * Create a new community
   */
  async createCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, description, type, metadata } = req.body;

      if (!name || !type) {
        res.status(400).json({
          success: false,
          error: 'Name and type are required',
        });
        return;
      }

      const community = await this.communityService.createCommunity({
        name,
        description,
        type,
        ownerUserId: userId,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: community,
        message: 'Community created successfully',
      });
    } catch (error: any) {
      console.error('Error creating community:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create community',
      });
    }
  }

  /**
   * POST /yaksa/forum/communities/:id/join
   * Join a community
   */
  async joinCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const member = await this.communityService.joinCommunity({
        communityId: id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: member,
        message: 'Joined community successfully',
      });
    } catch (error: any) {
      console.error('Error joining community:', error);

      if (error.message === 'Already a member of this community') {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to join community',
      });
    }
  }

  /**
   * POST /yaksa/forum/communities/:id/leave
   * Leave a community
   */
  async leaveCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.communityService.leaveCommunity(id, userId);

      res.json({
        success: true,
        message: 'Left community successfully',
      });
    } catch (error: any) {
      console.error('Error leaving community:', error);

      if (error.message.includes('owner cannot leave')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to leave community',
      });
    }
  }

  /**
   * GET /yaksa/forum/communities/:id/members
   * Get community members
   */
  async getCommunityMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const members = await this.communityService.getCommunityMembers(id);

      res.json({
        success: true,
        data: members,
        count: members.length,
      });
    } catch (error: any) {
      console.error('Error getting community members:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get community members',
      });
    }
  }

  /**
   * POST /yaksa/forum/communities/:id/posts
   * Create a new post in the community
   */
  async createCommunityPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id: communityId } = req.params;
      const { title, content, categoryId, type, tags, isAnnouncement } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!title || !content || !categoryId) {
        res.status(400).json({
          success: false,
          error: 'Title, content, and categoryId are required',
        });
        return;
      }

      const post = await this.communityService.createCommunityPost({
        communityId,
        userId,
        title,
        content,
        categoryId,
        type,
        tags,
        isAnnouncement,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });
    } catch (error: any) {
      console.error('Error creating community post:', error);

      if (error.message.includes('member')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create post',
      });
    }
  }

  /**
   * POST /yaksa/forum/posts/:postId/pin
   * Pin a post in a community
   */
  async pinPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const post = await this.communityService.pinPost(postId, userId);

      res.json({
        success: true,
        data: post,
        message: 'Post pinned successfully',
      });
    } catch (error: any) {
      console.error('Error pinning post:', error);

      if (error.message.includes('Only admins')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not associated')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to pin post',
      });
    }
  }

  /**
   * POST /yaksa/forum/posts/:postId/unpin
   * Unpin a post in a community
   */
  async unpinPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const post = await this.communityService.unpinPost(postId, userId);

      res.json({
        success: true,
        data: post,
        message: 'Post unpinned successfully',
      });
    } catch (error: any) {
      console.error('Error unpinning post:', error);

      if (error.message.includes('Only admins')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not associated')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to unpin post',
      });
    }
  }

  /**
   * POST /yaksa/forum/posts/:postId/approve
   * Approve a pending post in a community
   */
  async approvePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const post = await this.communityService.approvePost(postId, userId);

      res.json({
        success: true,
        data: post,
        message: 'Post approved successfully',
      });
    } catch (error: any) {
      console.error('Error approving post:', error);

      if (error.message.includes('Only admins')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not associated')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve post',
      });
    }
  }

  /**
   * POST /yaksa/forum/posts/:postId/set-announcement
   * Set a post as announcement
   */
  async setAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const post = await this.communityService.setAnnouncement(postId, userId);

      res.json({
        success: true,
        data: post,
        message: 'Post set as announcement successfully',
      });
    } catch (error: any) {
      console.error('Error setting announcement:', error);

      if (error.message.includes('Only admins')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not associated')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set announcement',
      });
    }
  }

  /**
   * POST /yaksa/forum/posts/:postId/unset-announcement
   * Unset a post as announcement
   */
  async unsetAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { postId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const post = await this.communityService.unsetAnnouncement(postId, userId);

      res.json({
        success: true,
        data: post,
        message: 'Post unset as announcement successfully',
      });
    } catch (error: any) {
      console.error('Error unsetting announcement:', error);

      if (error.message.includes('Only admins')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('not associated')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to unset announcement',
      });
    }
  }
}
