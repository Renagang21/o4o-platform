import { Router } from 'express';
import { CrowdfundingController } from '../controllers/CrowdfundingController';
import { authenticateToken } from '../middleware/auth';
import { roleRequired } from '../middleware/roleRequired';

const router = Router();
const crowdfundingController = new CrowdfundingController();

// 프로젝트 관련 라우트 (인증 필요)
router.use(authenticateToken);

// 공통 라우트 (모든 로그인 사용자)
router.get('/projects', crowdfundingController.getProjects.bind(crowdfundingController));
router.get('/projects/:id', crowdfundingController.getProjectById.bind(crowdfundingController));
router.get('/dashboard/stats', crowdfundingController.getDashboardStats.bind(crowdfundingController));

// 참여 관련 (Business/Affiliate 사용자만)
router.post('/projects/:id/join', roleRequired(['business', 'affiliate']), crowdfundingController.joinProject.bind(crowdfundingController));
router.post('/projects/:id/cancel', roleRequired(['business', 'affiliate']), crowdfundingController.cancelParticipation.bind(crowdfundingController));
router.get('/projects/:id/participation-status', crowdfundingController.getParticipationStatus.bind(crowdfundingController));

// 프로젝트 생성/수정/삭제 (Business 사용자만 - 제품 개발사)
router.post('/projects', roleRequired(['business']), crowdfundingController.createProject.bind(crowdfundingController));
router.put('/projects/:id', roleRequired(['business']), crowdfundingController.updateProject.bind(crowdfundingController));
router.delete('/projects/:id', roleRequired(['business']), crowdfundingController.deleteProject.bind(crowdfundingController));

// 관리자 전용 라우트
router.patch('/projects/:id/status', roleRequired(['admin']), crowdfundingController.updateProjectStatus.bind(crowdfundingController));

export { router as crowdfundingSimpleRoutes };