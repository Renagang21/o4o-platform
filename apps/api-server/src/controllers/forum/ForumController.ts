import type { Request, Response } from 'express';
import { ForumPostController } from './ForumPostController.js';
import { ForumCategoryController } from './ForumCategoryController.js';
import { ForumCommentController } from './ForumCommentController.js';
import { ForumModerationController } from './ForumModerationController.js';

/**
 * ForumController — Backward-compatible composition wrapper.
 *
 * Delegates every handler to the corresponding sub-controller.
 * Kept so that existing consumers (kpa.routes, glycopharm.routes,
 * forum.routes) can continue to `new ForumController()` without changes.
 *
 * @see ForumPostController
 * @see ForumCategoryController
 * @see ForumCommentController
 * @see ForumModerationController
 */
export class ForumController {
  private posts = new ForumPostController();
  private categories = new ForumCategoryController();
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

  // ---- Categories ----
  listCategories = (req: Request, res: Response) => this.categories.listCategories(req, res);
  getCategory = (req: Request, res: Response) => this.categories.getCategory(req, res);
  createCategory = (req: Request, res: Response) => this.categories.createCategory(req, res);
  updateCategory = (req: Request, res: Response) => this.categories.updateCategory(req, res);
  deleteCategory = (req: Request, res: Response) => this.categories.deleteCategory(req, res);
  getPopularForums = (req: Request, res: Response) => this.categories.getPopularForums(req, res);
  // ---- Owner Category APIs (WO-MY-CATEGORIES-API-V1 / WO-FORUM-OWNER-BASIC-EDIT-V1) ----
  listMyCategories = (req: Request, res: Response) => this.categories.listMyCategories(req, res);
  updateMyCategory = (req: Request, res: Response) => this.categories.updateMyCategory(req, res);

  // ---- Delete Request (WO-O4O-FORUM-DELETE-REQUEST-V1) ----
  requestDeleteCategory = (req: Request, res: Response) => this.categories.requestDeleteCategory(req, res);

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
