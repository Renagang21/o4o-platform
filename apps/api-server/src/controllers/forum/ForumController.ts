import type { Request, Response } from 'express';
import { ForumPostController } from './ForumPostController.js';
import { ForumDirectoryController } from './ForumDirectoryController.js';
import { ForumCommentController } from './ForumCommentController.js';
import { ForumModerationController } from './ForumModerationController.js';

/**
 * ForumController — Backward-compatible composition wrapper.
 *
 * Delegates every handler to the corresponding sub-controller.
 * Kept so that existing consumers (kpa.routes, glycopharm.routes,
 * forum.routes) can continue to `new ForumController()` without changes.
 *
 * WO-O4O-FORUM-NAMING-CLEANUP-V1: ForumCategoryController → ForumDirectoryController
 *
 * @see ForumPostController
 * @see ForumDirectoryController
 * @see ForumCommentController
 * @see ForumModerationController
 */
export class ForumController {
  private posts = new ForumPostController();
  private forums = new ForumDirectoryController();
  private comments = new ForumCommentController();
  private moderation = new ForumModerationController();

  // ---- Health / Utility ----
  health = (req: Request, res: Response) => this.moderation.health(req, res);
  getIconSamples = (req: Request, res: Response) => this.moderation.getIconSamples(req, res);

  // ---- Posts ----
  listPosts = (req: Request, res: Response) => this.posts.listPosts(req, res);
  getPost = (req: Request, res: Response) => this.posts.getPost(req, res);
  createPost = (req: Request, res: Response) => this.posts.createPost(req, res);
  updatePost = (req: Request, res: Response) => this.posts.updatePost(req, res);
  deletePost = (req: Request, res: Response) => this.posts.deletePost(req, res);
  toggleLike = (req: Request, res: Response) => this.posts.toggleLike(req, res);

  // ---- Forum Directory (formerly Categories) ----
  listForums = (req: Request, res: Response) => this.forums.listForums(req, res);
  getForum = (req: Request, res: Response) => this.forums.getForum(req, res);
  createForum = (req: Request, res: Response) => this.forums.createForum(req, res);
  updateForum = (req: Request, res: Response) => this.forums.updateForum(req, res);
  deleteForum = (req: Request, res: Response) => this.forums.deleteForum(req, res);
  getPopularForums = (req: Request, res: Response) => this.forums.getPopularForums(req, res);
  // ---- Owner Forum APIs (WO-MY-CATEGORIES-API-V1 / WO-FORUM-OWNER-BASIC-EDIT-V1) ----
  listMyForums = (req: Request, res: Response) => this.forums.listMyForums(req, res);
  updateMyForum = (req: Request, res: Response) => this.forums.updateMyForum(req, res);

  // ---- Delete Request (WO-O4O-FORUM-DELETE-REQUEST-V1) ----
  requestDeleteForum = (req: Request, res: Response) => this.forums.requestDeleteForum(req, res);

  // ---- Comments ----
  listComments = (req: Request, res: Response) => this.comments.listComments(req, res);
  createComment = (req: Request, res: Response) => this.comments.createComment(req, res);
  updateComment = (req: Request, res: Response) => this.comments.updateComment(req, res);
  deleteComment = (req: Request, res: Response) => this.comments.deleteComment(req, res);

  // ---- Moderation / Stats ----
  getStats = (req: Request, res: Response) => this.moderation.getStats(req, res);
  getModerationQueue = (req: Request, res: Response) => this.moderation.getModerationQueue(req, res);
  moderateContent = (req: Request, res: Response) => this.moderation.moderateContent(req, res);
}

export default ForumController;
