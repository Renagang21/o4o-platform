import { Router } from 'express';
import { 
  createPost, 
  getArchiveData,
  getPostTypeSchema,
  createPostType,
  updatePost,
  deletePost,
  getPostById,
  getUserStats,
  getUserAvailablePostTypes
} from '../../controllers/post-creation.js';

const router: Router = Router();

// 🆕 Post Creation (UAGBFormsBlock에서 호출)
router.post('/create', createPost);

// 🆕 Archive Data (UAGBArchiveBlock에서 호출)  
router.post('/archive', getArchiveData);

// 🆕 Post Type 관리
router.get('/post-types/:slug/schema', getPostTypeSchema);
router.post('/post-types', createPostType);
router.get('/post-types', getUserAvailablePostTypes);

// 🆕 개별 Post 관리 (UAGBContentManagerBlock용)
router.get('/posts/:id', getPostById);
router.put('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);

// 🆕 User 통계 (UAGBUserDashboardBlock용)
router.get('/user/:userId/stats', getUserStats);

export default router;