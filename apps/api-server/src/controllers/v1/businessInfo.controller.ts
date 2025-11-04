import { Request, Response } from 'express';
import AppDataSource from '../../database/connection.js';
import { BusinessInfo, BusinessType, BusinessSize, Industry } from '../../entities/BusinessInfo.js';
import { User } from '../../entities/User.js';
import { UserActivityLog, ActivityType } from '../../entities/UserActivityLog.js';
import { validate } from 'class-validator';

export class BusinessInfoController {
  private static businessInfoRepository = AppDataSource.getRepository(BusinessInfo);
  private static userRepository = AppDataSource.getRepository(User);
  private static activityRepository = AppDataSource.getRepository(UserActivityLog);

  static async getBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;

      const user = await BusinessInfoController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const businessInfo = await BusinessInfoController.businessInfoRepository.findOne({
        where: { userId },
        relations: ['user']
      });

      if (!businessInfo) {
        res.status(404).json({
          success: false,
          message: 'Business information not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: businessInfo.id,
          userId: businessInfo.userId,
          businessName: businessInfo.businessName,
          tradingName: businessInfo.tradingName,
          description: businessInfo.description,
          businessType: businessInfo.businessType,
          businessTypeDisplay: businessInfo.getBusinessTypeDisplayName(),
          industry: businessInfo.industry,
          industryDisplay: businessInfo.getIndustryDisplayName(),
          businessSize: businessInfo.businessSize,
          businessSizeDisplay: businessInfo.getBusinessSizeDisplayName(),
          address: businessInfo.address,
          billingAddress: businessInfo.billingAddress,
          contact: businessInfo.contact,
          financials: businessInfo.financials,
          legal: businessInfo.legal,
          services: businessInfo.services,
          markets: businessInfo.markets,
          timezone: businessInfo.timezone,
          currency: businessInfo.currency,
          language: businessInfo.language,
          isVerified: businessInfo.isVerified,
          verifiedAt: businessInfo.verifiedAt,
          verifiedBy: businessInfo.verifiedBy,
          verificationNotes: businessInfo.verificationNotes,
          socialMedia: businessInfo.socialMedia,
          certifications: businessInfo.certifications,
          licenses: businessInfo.licenses,
          fullBusinessName: businessInfo.getFullBusinessName(),
          formattedAddress: businessInfo.getFormattedAddress(),
          isComplete: businessInfo.isComplete(),
          completionPercentage: businessInfo.getCompletionPercentage(),
          createdAt: businessInfo.createdAt,
          updatedAt: businessInfo.updatedAt
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async createBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const currentUser = (req as any).user;

      // Check if user exists
      const user = await BusinessInfoController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if business info already exists
      const existingBusinessInfo = await BusinessInfoController.businessInfoRepository.findOne({
        where: { userId }
      });

      if (existingBusinessInfo) {
        res.status(409).json({
          success: false,
          message: 'Business information already exists for this user'
        });
        return;
      }

      // Create business info
      const businessInfoData = {
        userId,
        businessName: req.body.businessName,
        tradingName: req.body.tradingName,
        description: req.body.description,
        businessType: req.body.businessType,
        industry: req.body.industry,
        businessSize: req.body.businessSize,
        address: req.body.address,
        billingAddress: req.body.billingAddress,
        contact: req.body.contact,
        financials: req.body.financials,
        legal: req.body.legal,
        services: req.body.services,
        markets: req.body.markets,
        timezone: req.body.timezone,
        currency: req.body.currency,
        language: req.body.language,
        socialMedia: req.body.socialMedia,
        certifications: req.body.certifications,
        licenses: req.body.licenses
      };

      const businessInfo = BusinessInfoController.businessInfoRepository.create(businessInfoData);

      const errors = await validate(businessInfo);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const savedBusinessInfo = await BusinessInfoController.businessInfoRepository.save(businessInfo);

      // Log the activity
      const activityData = UserActivityLog.createProfileUpdateActivity(
        userId,
        ['business_info_created'],
        currentUser.id,
        { businessName: savedBusinessInfo.businessName }
      );

      const activity = BusinessInfoController.activityRepository.create(activityData);
      await BusinessInfoController.activityRepository.save(activity);

      res.status(201).json({
        success: true,
        data: {
          id: savedBusinessInfo.id,
          businessName: savedBusinessInfo.businessName,
          completionPercentage: savedBusinessInfo.getCompletionPercentage(),
          isComplete: savedBusinessInfo.isComplete(),
          createdAt: savedBusinessInfo.createdAt
        },
        message: 'Business information created successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const currentUser = (req as any).user;

      const businessInfo = await BusinessInfoController.businessInfoRepository.findOne({
        where: { userId }
      });

      if (!businessInfo) {
        res.status(404).json({
          success: false,
          message: 'Business information not found'
        });
        return;
      }

      // Track changed fields
      const changedFields: string[] = [];
      const updatableFields = [
        'businessName', 'tradingName', 'description', 'businessType', 'industry', 
        'businessSize', 'address', 'billingAddress', 'contact', 'financials', 
        'legal', 'services', 'markets', 'timezone', 'currency', 'language',
        'socialMedia', 'certifications', 'licenses'
      ];

      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          const oldValue = (businessInfo as any)[field];
          const newValue = req.body[field];
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push(field);
            (businessInfo as any)[field] = newValue;
          }
        }
      });

      if (changedFields.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            id: businessInfo.id,
            message: 'No changes detected'
          }
        });
        return;
      }

      const errors = await validate(businessInfo);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const savedBusinessInfo = await BusinessInfoController.businessInfoRepository.save(businessInfo);

      // Log the activity
      const activityData = UserActivityLog.createProfileUpdateActivity(
        userId,
        changedFields.map(field => `business_${field}`),
        currentUser.id,
        { 
          businessName: savedBusinessInfo.businessName,
          changedFields 
        }
      );

      const activity = BusinessInfoController.activityRepository.create(activityData);
      await BusinessInfoController.activityRepository.save(activity);

      res.status(200).json({
        success: true,
        data: {
          id: savedBusinessInfo.id,
          businessName: savedBusinessInfo.businessName,
          completionPercentage: savedBusinessInfo.getCompletionPercentage(),
          isComplete: savedBusinessInfo.isComplete(),
          changedFields,
          updatedAt: savedBusinessInfo.updatedAt
        },
        message: 'Business information updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async deleteBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const currentUser = (req as any).user;

      const businessInfo = await BusinessInfoController.businessInfoRepository.findOne({
        where: { userId }
      });

      if (!businessInfo) {
        res.status(404).json({
          success: false,
          message: 'Business information not found'
        });
        return;
      }

      const businessName = businessInfo.businessName;
      await BusinessInfoController.businessInfoRepository.remove(businessInfo);

      // Log the activity
      const activityData = UserActivityLog.createProfileUpdateActivity(
        userId,
        ['business_info_deleted'],
        currentUser.id,
        { deletedBusinessName: businessName }
      );

      const activity = BusinessInfoController.activityRepository.create(activityData);
      await BusinessInfoController.activityRepository.save(activity);

      res.status(200).json({
        success: true,
        message: 'Business information deleted successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async verifyBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { verificationNotes } = req.body;
      const currentUser = (req as any).user;

      const businessInfo = await BusinessInfoController.businessInfoRepository.findOne({
        where: { userId }
      });

      if (!businessInfo) {
        res.status(404).json({
          success: false,
          message: 'Business information not found'
        });
        return;
      }

      businessInfo.isVerified = true;
      businessInfo.verifiedAt = new Date();
      businessInfo.verifiedBy = currentUser.id;
      businessInfo.verificationNotes = verificationNotes;

      await BusinessInfoController.businessInfoRepository.save(businessInfo);

      // Log the activity
      const activityData = UserActivityLog.createAdminApprovalActivity(
        userId,
        currentUser.id,
        `Business information verified: ${businessInfo.businessName}`
      );

      const activity = BusinessInfoController.activityRepository.create(activityData);
      await BusinessInfoController.activityRepository.save(activity);

      res.status(200).json({
        success: true,
        data: {
          id: businessInfo.id,
          isVerified: businessInfo.isVerified,
          verifiedAt: businessInfo.verifiedAt,
          verifiedBy: businessInfo.verifiedBy
        },
        message: 'Business information verified successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes = Object.values(BusinessType).map(type => ({
        value: type,
        label: type.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }));

      res.status(200).json({
        success: true,
        data: businessTypes
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getBusinessSizes(req: Request, res: Response): Promise<void> {
    try {
      const businessSizes = Object.values(BusinessSize).map(size => ({
        value: size,
        label: size.charAt(0).toUpperCase() + size.slice(1) + 
               (size === BusinessSize.MICRO ? ' (1-9 employees)' :
                size === BusinessSize.SMALL ? ' (10-49 employees)' :
                size === BusinessSize.MEDIUM ? ' (50-249 employees)' :
                size === BusinessSize.LARGE ? ' (250-999 employees)' :
                size === BusinessSize.ENTERPRISE ? ' (1000+ employees)' : '')
      }));

      res.status(200).json({
        success: true,
        data: businessSizes
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getIndustries(req: Request, res: Response): Promise<void> {
    try {
      const industries = Object.values(Industry).map(industry => ({
        value: industry,
        label: industry === Industry.FOOD_BEVERAGE ? 'Food & Beverage' :
               industry.split('_').map(word => 
                 word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
               ).join(' ')
      }));

      res.status(200).json({
        success: true,
        data: industries
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getBusinessStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Business info statistics
      const totalBusinessInfo = await BusinessInfoController.businessInfoRepository.count();
      const verifiedBusinessInfo = await BusinessInfoController.businessInfoRepository.count({
        where: { isVerified: true }
      });
      
      // Distribution by business type
      const businessTypeStats = await Promise.all(
        Object.values(BusinessType).map(async (type) => ({
          type,
          count: await BusinessInfoController.businessInfoRepository.count({ where: { businessType: type } }),
          label: type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
        }))
      );

      // Distribution by industry
      const industryStats = await Promise.all(
        Object.values(Industry).map(async (industry) => ({
          industry,
          count: await BusinessInfoController.businessInfoRepository.count({ where: { industry } }),
          label: industry === Industry.FOOD_BEVERAGE ? 'Food & Beverage' :
                 industry.split('_').map(word => 
                   word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                 ).join(' ')
        }))
      );

      // Distribution by business size
      const businessSizeStats = await Promise.all(
        Object.values(BusinessSize).map(async (size) => ({
          size,
          count: await BusinessInfoController.businessInfoRepository.count({ where: { businessSize: size } }),
          label: size.charAt(0).toUpperCase() + size.slice(1)
        }))
      );

      // Completion statistics
      const businessInfos = await BusinessInfoController.businessInfoRepository.find();
      const completionStats = businessInfos.reduce((acc, info) => {
        const percentage = info.getCompletionPercentage();
        if (percentage === 100) acc.complete++;
        else if (percentage >= 75) acc.mostlyComplete++;
        else if (percentage >= 50) acc.partiallyComplete++;
        else acc.incomplete++;
        return acc;
      }, { complete: 0, mostlyComplete: 0, partiallyComplete: 0, incomplete: 0 });

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalBusinessInfo,
            verifiedBusinessInfo,
            verificationRate: totalBusinessInfo > 0 ? 
              Math.round((verifiedBusinessInfo / totalBusinessInfo) * 100) : 0
          },
          businessTypes: businessTypeStats.filter(stat => stat.count > 0),
          industries: industryStats.filter(stat => stat.count > 0),
          businessSizes: businessSizeStats.filter(stat => stat.count > 0),
          completion: completionStats
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}