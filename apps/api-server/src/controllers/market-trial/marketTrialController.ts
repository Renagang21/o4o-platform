/**
 * Market Trial Controller
 *
 * Phase L-1: Market Trial API
 *
 * @package Phase L-1 - Market Trial
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { v4 as uuidv4 } from 'uuid';

// Types - WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 통합
// Note: TrialStatus is defined locally to avoid full @o4o/market-trial import
// which causes entity initialization issues in bundled runtime.
// Keep in sync with packages/market-trial/src/entities/MarketTrial.entity.ts

/** Trial 상태 - WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 */
enum TrialStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  RECRUITING = 'recruiting',
  DEVELOPMENT = 'development',
  OUTCOME_CONFIRMING = 'outcome_confirming',
  FULFILLED = 'fulfilled',
  CLOSED = 'closed',
}

type TrialEligibleRole = 'partner' | 'seller';
type RewardType = 'cash' | 'product';
type RewardStatus = 'pending' | 'fulfilled';

/** Trial 참여 가능 상태 목록 */
const JOINABLE_STATUSES: TrialStatus[] = [
  TrialStatus.RECRUITING,
];

/** Trial 종료 상태 목록 */
const CLOSED_STATUSES: TrialStatus[] = [
  TrialStatus.FULFILLED,
  TrialStatus.CLOSED,
];

/** Trial Outcome Snapshot - 결과 약속 정보 */
interface TrialOutcomeSnapshot {
  expectedType: 'product' | 'cash';
  description: string;
  quantity?: number;
  note?: string;
}

interface MarketTrialDTO {
  id: string;
  title: string;
  description: string;
  supplierId: string;
  supplierName?: string;
  eligibleRoles: TrialEligibleRole[];
  rewardOptions: RewardType[];
  cashRewardAmount?: number;
  productRewardDescription?: string;
  status: TrialStatus;
  outcomeSnapshot?: TrialOutcomeSnapshot;
  maxParticipants?: number;
  currentParticipants: number;
  deadline?: string;
  createdAt: string;
}

interface TrialParticipation {
  id: string;
  trialId: string;
  participantId: string;
  participantName?: string;
  role: TrialEligibleRole;
  rewardType: RewardType;
  rewardStatus: RewardStatus;
  joinedAt: string;
}

// In-memory store for Phase L-1 MVP
const trialsStore: Map<string, MarketTrialDTO> = new Map();
export const participationsStore: Map<string, TrialParticipation[]> = new Map();

// Initialize with sample data
function initSampleTrials() {
  if (trialsStore.size > 0) return;

  const sampleTrials: MarketTrialDTO[] = [
    {
      id: uuidv4(),
      title: '신제품 스킨케어 라인 체험단',
      description:
        '2024년 봄 출시 예정인 신규 스킨케어 라인의 시장 반응을 테스트합니다. 파트너/셀러분들의 솔직한 피드백을 받고자 합니다.\n\n참여 방법:\n1. Trial에 참여 신청\n2. 제품 수령 후 2주간 사용\n3. 간단한 피드백 제출\n\n피드백 내용은 제품 개선에 활용됩니다.',
      supplierId: 'supplier-1',
      supplierName: '코스메틱 브랜드 A',
      eligibleRoles: ['partner', 'seller'],
      rewardOptions: ['cash', 'product'],
      cashRewardAmount: 50000,
      productRewardDescription: '정품 스킨케어 세트 (150,000원 상당)',
      status: TrialStatus.RECRUITING,
      outcomeSnapshot: {
        expectedType: 'product',
        description: '정품 스킨케어 세트 (150,000원 상당)',
      },
      maxParticipants: 50,
      currentParticipants: 23,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '건강기능식품 브랜드 인지도 조사',
      description:
        '새로운 건강기능식품 브랜드의 시장 진입 전략 수립을 위한 조사입니다.\n\n참여 내용:\n- 간단한 설문조사 참여 (10분 소요)\n- 제품 컨셉 평가\n\n파트너/셀러분들의 전문적인 의견을 구합니다.',
      supplierId: 'supplier-2',
      supplierName: '헬스케어 브랜드 B',
      eligibleRoles: ['partner'],
      rewardOptions: ['cash'],
      cashRewardAmount: 30000,
      status: TrialStatus.RECRUITING,
      outcomeSnapshot: {
        expectedType: 'cash',
        description: '30,000원 현금 보상',
      },
      currentParticipants: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '프리미엄 뷰티 디바이스 테스트',
      description:
        '고급 뷰티 디바이스의 사용성 테스트입니다. 제품 제공으로만 보상이 가능합니다.',
      supplierId: 'supplier-3',
      supplierName: '테크뷰티 브랜드 C',
      eligibleRoles: ['seller'],
      rewardOptions: ['product'],
      productRewardDescription: '프리미엄 뷰티 디바이스 (500,000원 상당)',
      status: TrialStatus.RECRUITING,
      outcomeSnapshot: {
        expectedType: 'product',
        description: '프리미엄 뷰티 디바이스 (500,000원 상당)',
      },
      maxParticipants: 10,
      currentParticipants: 8,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: '[마감] 여름 한정판 선케어 체험',
      description: '이미 마감된 Trial입니다.',
      supplierId: 'supplier-1',
      supplierName: '코스메틱 브랜드 A',
      eligibleRoles: ['partner', 'seller'],
      rewardOptions: ['cash', 'product'],
      status: TrialStatus.CLOSED,
      currentParticipants: 30,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  sampleTrials.forEach((trial) => {
    trialsStore.set(trial.id, trial);
    participationsStore.set(trial.id, []);
  });
}

// Initialize sample data
initSampleTrials();

export class MarketTrialController {
  /**
   * GET /api/market-trial
   * Trial 목록 조회
   */
  static async getTrials(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;

      let trials = Array.from(trialsStore.values());

      // Filter by status - 새 enum 기반 필터링
      if (status === 'open' || status === 'recruiting') {
        trials = trials.filter((t) => JOINABLE_STATUSES.includes(t.status));
      } else if (status === 'closed') {
        trials = trials.filter((t) => CLOSED_STATUSES.includes(t.status));
      } else if (status && Object.values(TrialStatus).includes(status as TrialStatus)) {
        trials = trials.filter((t) => t.status === status);
      }

      // Sort by createdAt desc
      trials.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({
        success: true,
        data: trials,
      });
    } catch (error) {
      console.error('Get trials error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trials',
      });
    }
  }

  /**
   * GET /api/market-trial/:id
   * Trial 상세 조회
   */
  static async getTrialById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const trial = trialsStore.get(id);

      if (!trial) {
        return res.status(404).json({
          success: false,
          message: 'Trial not found',
        });
      }

      res.json({
        success: true,
        data: trial,
      });
    } catch (error) {
      console.error('Get trial error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trial',
      });
    }
  }

  /**
   * GET /api/market-trial/:id/participation
   * 현재 사용자의 참여 정보 조회
   */
  static async getParticipation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const participations = participationsStore.get(id) || [];
      const participation = participations.find(
        (p) => p.participantId === userId
      );

      res.json({
        success: true,
        data: participation || null,
      });
    } catch (error) {
      console.error('Get participation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get participation',
      });
    }
  }

  /**
   * POST /api/market-trial/:id/join
   * Trial 참여 (보상 선택 포함)
   */
  static async joinTrial(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rewardType } = req.body;
      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name || 'User';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate rewardType
      if (!rewardType || !['cash', 'product'].includes(rewardType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward type. Must be "cash" or "product".',
        });
      }

      // Get trial
      const trial = trialsStore.get(id);
      if (!trial) {
        return res.status(404).json({
          success: false,
          message: 'Trial not found',
        });
      }

      // Check if trial is joinable (recruiting status)
      if (!JOINABLE_STATUSES.includes(trial.status)) {
        return res.status(400).json({
          success: false,
          message: 'Trial is not accepting participants',
        });
      }

      // Check if max participants reached
      if (
        trial.maxParticipants &&
        trial.currentParticipants >= trial.maxParticipants
      ) {
        return res.status(400).json({
          success: false,
          message: 'Trial has reached maximum participants',
        });
      }

      // Check if reward type is available
      if (!trial.rewardOptions.includes(rewardType)) {
        return res.status(400).json({
          success: false,
          message: `Reward type "${rewardType}" is not available for this trial`,
        });
      }

      // Check if already participated
      const participations = participationsStore.get(id) || [];
      const existingParticipation = participations.find(
        (p) => p.participantId === userId
      );

      if (existingParticipation) {
        return res.status(400).json({
          success: false,
          message: 'Already participated in this trial',
        });
      }

      // Create participation
      const participation: TrialParticipation = {
        id: uuidv4(),
        trialId: id,
        participantId: userId,
        participantName: userName,
        role: 'partner', // TODO: Get actual role from user
        rewardType: rewardType as RewardType,
        rewardStatus: 'pending',
        joinedAt: new Date().toISOString(),
      };

      // Save participation
      participations.push(participation);
      participationsStore.set(id, participations);

      // Update trial participant count
      trial.currentParticipants = participations.length;
      trialsStore.set(id, trial);

      res.status(201).json({
        success: true,
        data: participation,
        message: 'Successfully joined the trial',
      });
    } catch (error) {
      console.error('Join trial error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join trial',
      });
    }
  }
}
