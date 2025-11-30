import { DataSource, Repository } from 'typeorm';
import { Groupbuy, GroupbuyStatus } from '../entities/Groupbuy.js';
import { GroupbuyParticipant, ParticipantStatus } from '../entities/GroupbuyParticipant.js';

/**
 * Organization-Dropshipping Service
 *
 * Provides integration between organization-core and dropshipping-core.
 * Manages organization-scoped groupbuy campaigns and participant tracking.
 */
export class OrganizationDropshippingService {
  private groupbuyRepository: Repository<Groupbuy>;
  private participantRepository: Repository<GroupbuyParticipant>;

  constructor(private dataSource: DataSource) {
    this.groupbuyRepository = dataSource.getRepository(Groupbuy);
    this.participantRepository = dataSource.getRepository(GroupbuyParticipant);
  }

  /**
   * Create a new groupbuy campaign for an organization
   */
  async createGroupbuy(data: {
    organizationId: string;
    productId: string;
    name: string;
    description?: string;
    groupPrice: number;
    regularPrice?: number;
    minQuantity: number;
    maxQuantity?: number;
    startDate: Date;
    endDate: Date;
    deadline?: Date;
    createdBy: string;
    terms?: string;
  }): Promise<Groupbuy> {
    const groupbuy = this.groupbuyRepository.create({
      ...data,
      status: GroupbuyStatus.DRAFT,
      currentQuantity: 0,
      participantCount: 0,
    });

    return await this.groupbuyRepository.save(groupbuy);
  }

  /**
   * Activate a groupbuy campaign
   */
  async activateGroupbuy(groupbuyId: string): Promise<Groupbuy> {
    const groupbuy = await this.groupbuyRepository.findOne({
      where: { id: groupbuyId },
    });

    if (!groupbuy) {
      throw new Error('Groupbuy not found');
    }

    groupbuy.status = GroupbuyStatus.ACTIVE;
    return await this.groupbuyRepository.save(groupbuy);
  }

  /**
   * Get active groupbuys for an organization
   */
  async getActiveGroupbuys(organizationId: string): Promise<Groupbuy[]> {
    const now = new Date();

    return await this.groupbuyRepository.find({
      where: {
        organizationId,
        status: GroupbuyStatus.ACTIVE,
      },
      order: {
        startDate: 'DESC',
      },
    });
  }

  /**
   * Get all groupbuys for an organization
   */
  async getOrganizationGroupbuys(
    organizationId: string,
    status?: GroupbuyStatus
  ): Promise<Groupbuy[]> {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    return await this.groupbuyRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Join a groupbuy campaign
   */
  async joinGroupbuy(data: {
    groupbuyId: string;
    userId: string;
    quantity: number;
  }): Promise<GroupbuyParticipant> {
    // Check if groupbuy exists and is active
    const groupbuy = await this.groupbuyRepository.findOne({
      where: { id: data.groupbuyId },
    });

    if (!groupbuy) {
      throw new Error('Groupbuy not found');
    }

    if (!groupbuy.canJoin()) {
      throw new Error('Cannot join this groupbuy');
    }

    // Check if user already joined
    const existing = await this.participantRepository.findOne({
      where: {
        groupbuyId: data.groupbuyId,
        userId: data.userId,
      },
    });

    if (existing) {
      throw new Error('Already joined this groupbuy');
    }

    // Create participant
    const participant = this.participantRepository.create({
      groupbuyId: data.groupbuyId,
      userId: data.userId,
      quantity: data.quantity,
      unitPrice: groupbuy.groupPrice,
      totalAmount: groupbuy.groupPrice * data.quantity,
      status: ParticipantStatus.PENDING,
    });

    const saved = await this.participantRepository.save(participant);

    // Update groupbuy stats
    groupbuy.addParticipant(data.quantity);
    await this.groupbuyRepository.save(groupbuy);

    return saved;
  }

  /**
   * Cancel participation
   */
  async cancelParticipation(participantId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['groupbuy'],
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    if (!participant.canCancel()) {
      throw new Error('Cannot cancel this participation');
    }

    const groupbuy = await this.groupbuyRepository.findOne({
      where: { id: participant.groupbuyId },
    });

    if (groupbuy) {
      groupbuy.removeParticipant(participant.quantity);
      await this.groupbuyRepository.save(groupbuy);
    }

    participant.cancel();
    await this.participantRepository.save(participant);
  }

  /**
   * Get participants for a groupbuy
   */
  async getGroupbuyParticipants(groupbuyId: string): Promise<GroupbuyParticipant[]> {
    return await this.participantRepository.find({
      where: { groupbuyId },
      order: {
        joinedAt: 'ASC',
      },
    });
  }

  /**
   * Get user's participations in an organization
   */
  async getUserParticipations(
    userId: string,
    organizationId: string
  ): Promise<GroupbuyParticipant[]> {
    return await this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.groupbuy', 'groupbuy')
      .where('participant.userId = :userId', { userId })
      .andWhere('groupbuy.organizationId = :organizationId', { organizationId })
      .orderBy('participant.joinedAt', 'DESC')
      .getMany();
  }

  /**
   * Complete a groupbuy (called when goal is met and deadline passed)
   */
  async completeGroupbuy(groupbuyId: string): Promise<Groupbuy> {
    const groupbuy = await this.groupbuyRepository.findOne({
      where: { id: groupbuyId },
    });

    if (!groupbuy) {
      throw new Error('Groupbuy not found');
    }

    groupbuy.complete();
    return await this.groupbuyRepository.save(groupbuy);
  }

  /**
   * Cancel a groupbuy
   */
  async cancelGroupbuy(groupbuyId: string): Promise<Groupbuy> {
    const groupbuy = await this.groupbuyRepository.findOne({
      where: { id: groupbuyId },
    });

    if (!groupbuy) {
      throw new Error('Groupbuy not found');
    }

    groupbuy.cancel();
    return await this.groupbuyRepository.save(groupbuy);
  }
}
