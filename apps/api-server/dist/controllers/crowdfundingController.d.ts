/**
 * 크라우드펀딩 API 컨트롤러
 */
import { Response } from 'express';
import type { AuthRequest } from '../types/auth';
export declare class CrowdfundingController {
    /**
     * 프로젝트 생성
     */
    createProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 수정
     */
    updateProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 리워드 생성
     */
    createReward(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 승인 (관리자)
     */
    approveProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 거절 (관리자)
     */
    rejectProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 후원하기
     */
    createBacking(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 결제 확인
     */
    confirmPayment(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 업데이트 작성
     */
    createProjectUpdate(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 목록 조회
     */
    getProjects(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 상세 조회
     */
    getProjectDetails(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 크리에이터 대시보드
     */
    getCreatorDashboard(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 후원자 대시보드
     */
    getBackerDashboard(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 펀딩 종료 (수동 - 관리자)
     */
    endFunding(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 승인 대기 프로젝트 목록 (관리자)
     */
    getPendingProjects(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 ID로 조회 (별칭 메서드)
     */
    getProjectById(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 대시보드 통계 조회
     */
    getDashboardStats(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 후원하기
     */
    backProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 참여 (후원) - alias
     */
    joinProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 참여 취소
     */
    cancelParticipation(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 참여 상태 조회
     */
    getParticipationStatus(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 삭제
     */
    deleteProject(req: AuthRequest, res: Response): Promise<void>;
    /**
     * 프로젝트 상태 업데이트
     */
    updateProjectStatus(req: AuthRequest, res: Response): Promise<void>;
}
export declare const crowdfundingController: CrowdfundingController;
//# sourceMappingURL=crowdfundingController.d.ts.map