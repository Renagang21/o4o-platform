/**
 * MarketTrialDecisionService
 *
 * Phase 2: Decision (의사 표현) service.
 *
 * Responsibilities:
 * - Submit seller/partner decisions
 * - Check for duplicate decisions
 * - Trigger dropshipping application creation for CONTINUE decisions
 */

import { DataSource, Repository } from 'typeorm';
import {
  MarketTrialDecision,
  DecisionType,
  MarketTrial,
  TrialStatus,
  MarketTrialParticipant,
  ParticipantType,
} from '../entities/index.js';

// Import dropshipping-core entities for application creation
import {
  SellerListing,
  ListingStatus,
  ListingChannel,
  SupplierProductOffer,
  OfferStatus,
  ProductMaster,
} from '@o4o/dropshipping-core';

export interface SellerDecisionDto {
  participantId: string;
  decision: DecisionType;
}

export interface PartnerDecisionDto {
  participantId: string;
  decision: DecisionType;
  sellerIds?: string[]; // Required when decision = CONTINUE
}

export interface DecisionResult {
  decision: MarketTrialDecision;
  applicationsCreated: number;
  applicationIds: string[];
}

export class MarketTrialDecisionService {
  private decisionRepo: Repository<MarketTrialDecision>;
  private trialRepo: Repository<MarketTrial>;
  private participantRepo: Repository<MarketTrialParticipant>;
  private listingRepo: Repository<SellerListing>;
  private offerRepo: Repository<SupplierProductOffer>;
  private productRepo: Repository<ProductMaster>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.decisionRepo = dataSource.getRepository(MarketTrialDecision);
    this.trialRepo = dataSource.getRepository(MarketTrial);
    this.participantRepo = dataSource.getRepository(MarketTrialParticipant);
    this.listingRepo = dataSource.getRepository(SellerListing);
    this.offerRepo = dataSource.getRepository(SupplierProductOffer);
    this.productRepo = dataSource.getRepository(ProductMaster);
  }

  /**
   * Check if participant has already made a decision
   */
  async hasDecisionAlready(trialId: string, participantId: string): Promise<boolean> {
    const existing = await this.decisionRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
      },
    });
    return !!existing;
  }

  /**
   * Validate that trial is in correct status for decision
   */
  private async validateTrialStatus(trialId: string): Promise<MarketTrial> {
    const trial = await this.trialRepo.findOne({ where: { id: trialId } });

    if (!trial) {
      throw new Error('Market Trial not found');
    }

    // Decisions can only be made when trial is in OUTCOME_CONFIRMING status
    if (trial.status !== TrialStatus.OUTCOME_CONFIRMING) {
      throw new Error('Decisions can only be made when trial is in outcome confirming phase');
    }

    return trial;
  }

  /**
   * Validate that participant exists in this trial
   */
  private async validateParticipant(
    trialId: string,
    participantId: string,
    expectedType: ParticipantType
  ): Promise<MarketTrialParticipant> {
    const participant = await this.participantRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
        participantType: expectedType,
      },
    });

    if (!participant) {
      throw new Error(`Participant not found or not a ${expectedType}`);
    }

    return participant;
  }

  /**
   * Find or create offer for trial's product
   */
  private async findOrCreateOffer(trial: MarketTrial): Promise<SupplierProductOffer | null> {
    // Try to find existing offer
    let offer = await this.offerRepo.findOne({
      where: {
        supplierId: trial.supplierId,
        productMasterId: trial.productId,
      },
    });

    if (offer) {
      return offer;
    }

    // Get product info for offer creation
    const product = await this.productRepo.findOne({
      where: { id: trial.productId },
    });

    if (!product) {
      console.warn(`Product ${trial.productId} not found, cannot create offer`);
      return null;
    }

    // Create new offer in ACTIVE status
    offer = this.offerRepo.create({
      supplierId: trial.supplierId,
      productMasterId: trial.productId,
      supplierPrice: trial.trialUnitPrice,
      suggestedRetailPrice: trial.trialUnitPrice * 1.3, // 30% markup suggestion
      stockQuantity: 100, // Default stock
      status: OfferStatus.ACTIVE,
    });

    return await this.offerRepo.save(offer);
  }

  /**
   * Create seller application (listing with DRAFT status)
   */
  private async createSellerApplication(
    trial: MarketTrial,
    sellerId: string,
    offer: SupplierProductOffer
  ): Promise<SellerListing> {
    const listing = this.listingRepo.create({
      sellerId: sellerId,
      offerId: offer.id,
      title: `[Trial] ${trial.title}`,
      sellingPrice: Number(trial.trialUnitPrice) * 1.2, // Default 20% margin
      channel: ListingChannel.CUSTOM,
      status: ListingStatus.DRAFT, // DRAFT = 신청 상태
      metadata: {
        sourceType: 'market_trial',
        marketTrialId: trial.id,
        createdFrom: 'market_trial_decision',
      },
    });

    return await this.listingRepo.save(listing);
  }

  /**
   * Submit seller decision
   */
  async submitSellerDecision(trialId: string, dto: SellerDecisionDto): Promise<DecisionResult> {
    // Validate trial status
    const trial = await this.validateTrialStatus(trialId);

    // Validate participant
    await this.validateParticipant(trialId, dto.participantId, ParticipantType.SELLER);

    // Check for duplicate decision
    if (await this.hasDecisionAlready(trialId, dto.participantId)) {
      throw new Error('Decision already submitted');
    }

    // Use transaction for atomicity
    return await this.dataSource.transaction(async (manager) => {
      const decisionRepo = manager.getRepository(MarketTrialDecision);
      const listingRepo = manager.getRepository(SellerListing);

      // Create decision record
      const decision = decisionRepo.create({
        marketTrialId: trialId,
        participantId: dto.participantId,
        participantType: ParticipantType.SELLER,
        decision: dto.decision,
        selectedSellerIds: null,
      });

      const savedDecision = await decisionRepo.save(decision);

      const applicationIds: string[] = [];

      // If CONTINUE, create application in dropshipping-core
      if (dto.decision === DecisionType.CONTINUE) {
        const offer = await this.findOrCreateOffer(trial);

        if (offer) {
          const listing = listingRepo.create({
            sellerId: dto.participantId,
            offerId: offer.id,
            title: `[Trial] ${trial.title}`,
            sellingPrice: Number(trial.trialUnitPrice) * 1.2,
            channel: ListingChannel.CUSTOM,
            status: ListingStatus.DRAFT,
            metadata: {
              sourceType: 'market_trial',
              marketTrialId: trial.id,
              createdFrom: 'market_trial_decision',
            },
          });

          const savedListing = await listingRepo.save(listing);
          applicationIds.push(savedListing.id);
        }
      }

      return {
        decision: savedDecision,
        applicationsCreated: applicationIds.length,
        applicationIds,
      };
    });
  }

  /**
   * Submit partner decision
   */
  async submitPartnerDecision(trialId: string, dto: PartnerDecisionDto): Promise<DecisionResult> {
    // Validate trial status
    const trial = await this.validateTrialStatus(trialId);

    // Validate participant
    await this.validateParticipant(trialId, dto.participantId, ParticipantType.PARTNER);

    // Check for duplicate decision
    if (await this.hasDecisionAlready(trialId, dto.participantId)) {
      throw new Error('Decision already submitted');
    }

    // For CONTINUE, sellerIds is required
    if (dto.decision === DecisionType.CONTINUE) {
      if (!dto.sellerIds || dto.sellerIds.length === 0) {
        throw new Error('sellerIds required when decision is CONTINUE');
      }
    }

    // Use transaction for atomicity
    return await this.dataSource.transaction(async (manager) => {
      const decisionRepo = manager.getRepository(MarketTrialDecision);
      const listingRepo = manager.getRepository(SellerListing);

      // Create decision record
      const decision = decisionRepo.create({
        marketTrialId: trialId,
        participantId: dto.participantId,
        participantType: ParticipantType.PARTNER,
        decision: dto.decision,
        selectedSellerIds: dto.sellerIds ? JSON.stringify(dto.sellerIds) : null,
      });

      const savedDecision = await decisionRepo.save(decision);

      const applicationIds: string[] = [];

      // If CONTINUE, create applications for each selected seller
      if (dto.decision === DecisionType.CONTINUE && dto.sellerIds) {
        const offer = await this.findOrCreateOffer(trial);

        if (offer) {
          for (const sellerId of dto.sellerIds) {
            const listing = listingRepo.create({
              sellerId: sellerId,
              offerId: offer.id,
              title: `[Trial] ${trial.title}`,
              sellingPrice: Number(trial.trialUnitPrice) * 1.2,
              channel: ListingChannel.CUSTOM,
              status: ListingStatus.DRAFT,
              metadata: {
                sourceType: 'market_trial',
                marketTrialId: trial.id,
                partnerId: dto.participantId,
                createdFrom: 'market_trial_partner_decision',
              },
            });

            const savedListing = await listingRepo.save(listing);
            applicationIds.push(savedListing.id);
          }
        }
      }

      return {
        decision: savedDecision,
        applicationsCreated: applicationIds.length,
        applicationIds,
      };
    });
  }

  /**
   * Get decision by trial and participant
   */
  async getDecision(trialId: string, participantId: string): Promise<MarketTrialDecision | null> {
    return await this.decisionRepo.findOne({
      where: {
        marketTrialId: trialId,
        participantId: participantId,
      },
    });
  }

  /**
   * Get all decisions for a trial
   */
  async getDecisionsByTrial(trialId: string): Promise<MarketTrialDecision[]> {
    return await this.decisionRepo.find({
      where: { marketTrialId: trialId },
      order: { createdAt: 'DESC' },
    });
  }
}
