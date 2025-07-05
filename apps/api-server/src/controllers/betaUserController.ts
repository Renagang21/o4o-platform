import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { betaUserService, BetaUserRegistrationData, BetaFeedbackData, BetaUserSearchOptions, BetaFeedbackSearchOptions } from '../services/betaUserService';
import { BetaUserStatus, BetaUserType, InterestArea } from '../entities/BetaUser';
import { BetaFeedback, FeedbackType, FeedbackStatus, FeedbackPriority, SignageFeature } from '../entities/BetaFeedback';
import { FeedbackConversation, ConversationMessage, ConversationStatus, MessageType, ParticipantRole } from '../entities/FeedbackConversation';
import { User } from '../entities/User';
import { AppDataSource } from '../database/connection';
import { realtimeFeedbackService } from '../main';

export class BetaUserController {
  // Beta User Registration (Public endpoint)
  async registerBetaUser(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const registrationData: BetaUserRegistrationData = {
        email: req.body.email,
        name: req.body.name,
        phone: req.body.phone,
        company: req.body.company,
        jobTitle: req.body.jobTitle,
        type: req.body.type || BetaUserType.INDIVIDUAL,
        interestArea: req.body.interestArea || InterestArea.OTHER,
        useCase: req.body.useCase,
        expectations: req.body.expectations,
        interestedFeatures: req.body.interestedFeatures,
        referralSource: req.body.referralSource,
        utmSource: req.body.utmSource,
        utmMedium: req.body.utmMedium,
        utmCampaign: req.body.utmCampaign
      };

      // Capture additional metadata
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        source: 'web_registration'
      };

      const betaUser = await betaUserService.registerBetaUser(registrationData, metadata);

      res.status(201).json({
        success: true,
        message: 'Successfully registered for beta program! We will review your application and contact you soon.',
        data: {
          id: betaUser.id,
          email: betaUser.email,
          name: betaUser.name,
          status: betaUser.status,
          type: betaUser.type,
          interestArea: betaUser.interestArea,
          createdAt: betaUser.createdAt
        }
      });
    } catch (error) {
      console.error('Beta user registration error:', error);
      
      if (error instanceof Error && error.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'This email is already registered for the beta program'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Failed to register for beta program'
        }
      });
    }
  }

  // Check registration status (Public endpoint)
  async checkRegistrationStatus(req: Request, res: Response) {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required'
          }
        });
      }

      const betaUser = await betaUserService.getBetaUserByEmail(email);
      
      if (!betaUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Email not found in beta program'
          }
        });
      }

      res.json({
        success: true,
        data: {
          status: betaUser.status,
          registeredAt: betaUser.createdAt,
          approvedAt: betaUser.approvedAt,
          canProvideFeedback: betaUser.canProvideFeedback(),
          feedbackCount: betaUser.feedbackCount
        }
      });
    } catch (error) {
      console.error('Check registration status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check registration status'
        }
      });
    }
  }

  // Submit feedback (Semi-public: requires beta user email verification)
  async submitFeedback(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { betaUserEmail } = req.body;
      
      // Find beta user by email
      const betaUser = await betaUserService.getBetaUserByEmail(betaUserEmail);
      if (!betaUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Beta user not found. Please register for the beta program first.'
          }
        });
      }

      if (!betaUser.canProvideFeedback()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not eligible to provide feedback in your current status.'
          }
        });
      }

      const feedbackData: BetaFeedbackData = {
        type: req.body.type,
        title: req.body.title,
        description: req.body.description,
        reproductionSteps: req.body.reproductionSteps,
        expectedBehavior: req.body.expectedBehavior,
        actualBehavior: req.body.actualBehavior,
        feature: req.body.feature,
        priority: req.body.priority || FeedbackPriority.MEDIUM,
        contactEmail: req.body.contactEmail || betaUser.email,
        browserInfo: req.get('User-Agent'),
        deviceType: req.body.deviceType,
        screenResolution: req.body.screenResolution,
        currentUrl: req.body.currentUrl,
        rating: req.body.rating,
        additionalComments: req.body.additionalComments,
        attachments: req.body.attachments,
        screenshots: req.body.screenshots
      };

      const feedback = await betaUserService.submitFeedback(betaUser.id, feedbackData);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully! Thank you for helping us improve.',
        data: {
          id: feedback.id,
          type: feedback.type,
          title: feedback.title,
          status: feedback.status,
          priority: feedback.priority,
          createdAt: feedback.createdAt
        }
      });
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSION_ERROR',
          message: 'Failed to submit feedback'
        }
      });
    }
  }

  // Admin endpoints (require authentication)
  
  async getBetaUsers(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const searchOptions: BetaUserSearchOptions = {
        query: req.query.search as string,
        status: req.query.status as BetaUserStatus,
        type: req.query.type as BetaUserType,
        interestArea: req.query.interestArea as InterestArea,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy: req.query.sortBy as any || 'latest',
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC',
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const result = await betaUserService.getBetaUsers(searchOptions);

      res.json({
        success: true,
        data: result,
        meta: {
          searchOptions,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get beta users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch beta users'
        }
      });
    }
  }

  async getBetaUserById(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const betaUser = await betaUserService.getBetaUserById(id);
      
      if (!betaUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Beta user not found'
          }
        });
      }

      res.json({
        success: true,
        data: betaUser
      });
    } catch (error) {
      console.error('Get beta user by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch beta user'
        }
      });
    }
  }

  async approveBetaUser(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { notes } = req.body;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      const betaUser = await betaUserService.approveBetaUser(id, user.id, notes);

      res.json({
        success: true,
        message: 'Beta user approved successfully',
        data: betaUser
      });
    } catch (error) {
      console.error('Approve beta user error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Beta user not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVAL_ERROR',
          message: 'Failed to approve beta user'
        }
      });
    }
  }

  async updateBetaUserStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      if (!Object.values(BetaUserStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status value'
          }
        });
      }

      const betaUser = await betaUserService.updateBetaUserStatus(id, status);

      res.json({
        success: true,
        message: 'Beta user status updated successfully',
        data: betaUser
      });
    } catch (error) {
      console.error('Update beta user status error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Beta user not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update beta user status'
        }
      });
    }
  }

  // Feedback management endpoints

  async getFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const searchOptions: BetaFeedbackSearchOptions = {
        query: req.query.search as string,
        type: req.query.type as FeedbackType,
        status: req.query.status as FeedbackStatus,
        priority: req.query.priority as FeedbackPriority,
        feature: req.query.feature as SignageFeature,
        betaUserId: req.query.betaUserId as string,
        assignedTo: req.query.assignedTo as string,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy: req.query.sortBy as any || 'latest',
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC',
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const result = await betaUserService.getFeedback(searchOptions);

      res.json({
        success: true,
        data: result,
        meta: {
          searchOptions,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch feedback'
        }
      });
    }
  }

  async getFeedbackById(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const feedback = await betaUserService.getFeedbackById(id);
      
      if (!feedback) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      res.json({
        success: true,
        data: feedback
      });
    } catch (error) {
      console.error('Get feedback by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch feedback'
        }
      });
    }
  }

  async assignFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { assigneeId } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const feedback = await betaUserService.assignFeedback(id, assigneeId);

      res.json({
        success: true,
        message: 'Feedback assigned successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Assign feedback error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_ERROR',
          message: 'Failed to assign feedback'
        }
      });
    }
  }

  async respondToFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { response } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      if (!response || response.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Response is required'
          }
        });
      }

      const feedback = await betaUserService.respondToFeedback(id, response, user.id);

      res.json({
        success: true,
        message: 'Response submitted successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Respond to feedback error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      if (error instanceof Error && error.message.includes('cannot be responded')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'RESPONSE_ERROR',
          message: 'Failed to submit response'
        }
      });
    }
  }

  async updateFeedbackStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      if (!Object.values(FeedbackStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status value'
          }
        });
      }

      const feedback = await betaUserService.updateFeedbackStatus(id, status, user.id);

      res.json({
        success: true,
        message: 'Feedback status updated successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Update feedback status error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update feedback status'
        }
      });
    }
  }

  async updateFeedbackPriority(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { priority } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      if (!Object.values(FeedbackPriority).includes(priority)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid priority value'
          }
        });
      }

      const feedback = await betaUserService.updateFeedbackPriority(id, priority);

      res.json({
        success: true,
        message: 'Feedback priority updated successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Update feedback priority error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update feedback priority'
        }
      });
    }
  }

  // Analytics endpoints

  async getBetaAnalytics(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      const analytics = await betaUserService.getBetaAnalytics();

      res.json({
        success: true,
        data: analytics,
        meta: {
          generatedAt: new Date(),
          generatedBy: user.id
        }
      });
    } catch (error) {
      console.error('Get beta analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to fetch beta analytics'
        }
      });
    }
  }

  async getHighPriorityFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const feedback = await betaUserService.getHighPriorityFeedback();

      res.json({
        success: true,
        data: { feedback },
        meta: {
          count: feedback.length,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get high priority feedback error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch high priority feedback'
        }
      });
    }
  }

  async getUnassignedFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const feedback = await betaUserService.getUnassignedFeedback();

      res.json({
        success: true,
        data: { feedback },
        meta: {
          count: feedback.length,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get unassigned feedback error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch unassigned feedback'
        }
      });
    }
  }

  // Real-time conversation methods
  async createConversation(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const { feedbackId, betaUserId, title } = req.body;

      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
      
      const conversation = conversationRepo.create({
        feedbackId,
        betaUserId,
        title,
        status: ConversationStatus.ACTIVE,
        assignedTo: user.id
      });

      await conversationRepo.save(conversation);

      res.status(201).json({
        success: true,
        data: { conversation }
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create conversation'
        }
      });
    }
  }

  async getConversation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
      const conversation = await conversationRepo.findOne({
        where: { id },
        relations: ['feedback', 'betaUser', 'messages', 'assignee']
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

      // Check access permissions
      const hasAccess = ['admin', 'manager'].includes(user.role) || 
                       conversation.assignedTo === user.id;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      res.json({
        success: true,
        data: { conversation }
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch conversation'
        }
      });
    }
  }

  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const { id: conversationId } = req.params;
      const { content, messageType = MessageType.TEXT } = req.body;
      const user = req.user as User;

      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
      const messageRepo = AppDataSource.getRepository(ConversationMessage);

      const conversation = await conversationRepo.findOne({
        where: { id: conversationId },
        relations: ['feedback', 'betaUser']
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

      // Create message
      const message = messageRepo.create({
        conversationId,
        senderId: user.id,
        senderRole: ParticipantRole.ADMIN,
        senderName: user.name,
        messageType,
        content,
        metadata: {
          delivered: true,
          deliveredAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      await messageRepo.save(message);

      // Update conversation
      conversation.updateLastAdminResponse();
      await conversationRepo.save(conversation);

      res.status(201).json({
        success: true,
        data: { message }
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send message'
        }
      });
    }
  }

  async updateConversationStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user as User;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
      const conversation = await conversationRepo.findOne({ where: { id } });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          }
        });
      }

      conversation.status = status;
      await conversationRepo.save(conversation);

      res.json({
        success: true,
        data: { conversation }
      });
    } catch (error) {
      console.error('Update conversation status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update conversation status'
        }
      });
    }
  }

  async getUserConversations(req: AuthRequest, res: Response) {
    try {
      const { betaUserId } = req.params;
      const user = req.user as User;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
      const conversations = await conversationRepo.find({
        where: { betaUserId },
        relations: ['feedback', 'betaUser'],
        order: { createdAt: 'DESC' }
      });

      res.json({
        success: true,
        data: { conversations },
        meta: {
          count: conversations.length
        }
      });
    } catch (error) {
      console.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user conversations'
        }
      });
    }
  }

  // Real-time feedback methods
  async startLiveSupport(req: Request, res: Response) {
    try {
      const { id: feedbackId } = req.params;
      const { betaUserEmail } = req.body;

      const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
      const feedback = await feedbackRepo.findOne({
        where: { id: feedbackId },
        relations: ['betaUser']
      });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      // Verify beta user email
      if (feedback.betaUser?.email !== betaUserEmail) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Email does not match feedback submitter'
          }
        });
      }

      feedback.startLiveSupport();
      await feedbackRepo.save(feedback);

      // Notify admins via WebSocket
      await realtimeFeedbackService.notifyNewFeedback(feedback);

      res.json({
        success: true,
        data: { feedback },
        message: 'Live support started'
      });
    } catch (error) {
      console.error('Start live support error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start live support'
        }
      });
    }
  }

  async markFeedbackViewed(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
      const feedback = await feedbackRepo.findOne({ where: { id } });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feedback not found'
          }
        });
      }

      feedback.markAsViewed(user.id);
      await feedbackRepo.save(feedback);

      res.json({
        success: true,
        data: { feedback }
      });
    } catch (error) {
      console.error('Mark feedback viewed error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark feedback as viewed'
        }
      });
    }
  }

  async getRealtimeStats(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
      const conversationRepo = AppDataSource.getRepository(FeedbackConversation);

      const [
        totalFeedback,
        pendingFeedback,
        activeFeedback,
        criticalFeedback,
        activeConversations,
        needsAttentionFeedback
      ] = await Promise.all([
        feedbackRepo.count(),
        feedbackRepo.count({ where: { status: FeedbackStatus.PENDING } }),
        feedbackRepo.count({ where: { isLive: true } }),
        feedbackRepo.count({ where: { priority: FeedbackPriority.CRITICAL } }),
        conversationRepo.count({ where: { status: ConversationStatus.ACTIVE } }),
        feedbackRepo.count({ where: { needsImmediateAttention: true } })
      ]);

      const stats = {
        totalFeedback,
        pendingFeedback,
        activeFeedback,
        criticalFeedback,
        activeConversations,
        needsAttentionFeedback,
        connectedAdmins: realtimeFeedbackService.getConnectedAdmins().length,
        connectedUsers: realtimeFeedbackService.getConnectedUsers().length,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get realtime stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch realtime stats'
        }
      });
    }
  }

  async getPendingNotifications(req: AuthRequest, res: Response) {
    try {
      const user = req.user as User;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin or manager access required'
          }
        });
      }

      // Get recent high-priority feedback that needs attention
      const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
      const recentFeedback = await feedbackRepo.find({
        where: [
          { needsImmediateAttention: true },
          { priority: FeedbackPriority.CRITICAL },
          { isLive: true }
        ],
        relations: ['betaUser'],
        order: { createdAt: 'DESC' },
        take: 50
      });

      const notifications = recentFeedback.map(feedback => ({
        id: `feedback_${feedback.id}`,
        type: feedback.isLive ? 'urgent_feedback' : 'new_feedback',
        title: feedback.isLive ? 'Live Support Request' : 'High Priority Feedback',
        message: `${feedback.type.replace('_', ' ')} from ${feedback.betaUser?.name || 'Unknown User'}: ${feedback.title}`,
        data: { feedbackId: feedback.id },
        timestamp: feedback.createdAt.toISOString(),
        priority: feedback.priority === FeedbackPriority.CRITICAL ? 'critical' : 'high',
        feedbackId: feedback.id
      }));

      res.json({
        success: true,
        data: { notifications },
        meta: {
          count: notifications.length
        }
      });
    } catch (error) {
      console.error('Get pending notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending notifications'
        }
      });
    }
  }
}

// Validation middleware
export const betaUserRegistrationValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('type').optional().isIn(Object.values(BetaUserType)).withMessage('Invalid user type'),
  body('interestArea').optional().isIn(Object.values(InterestArea)).withMessage('Invalid interest area'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone number too long'),
  body('company').optional().isLength({ max: 100 }).withMessage('Company name too long'),
  body('jobTitle').optional().isLength({ max: 100 }).withMessage('Job title too long'),
  body('useCase').optional().isLength({ max: 1000 }).withMessage('Use case too long'),
  body('expectations').optional().isLength({ max: 1000 }).withMessage('Expectations too long')
];

export const feedbackSubmissionValidation = [
  body('betaUserEmail').isEmail().withMessage('Valid beta user email is required'),
  body('type').isIn(Object.values(FeedbackType)).withMessage('Invalid feedback type'),
  body('title').isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('priority').optional().isIn(Object.values(FeedbackPriority)).withMessage('Invalid priority'),
  body('feature').optional().isIn(Object.values(SignageFeature)).withMessage('Invalid feature'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('reproductionSteps').optional().isLength({ max: 2000 }).withMessage('Reproduction steps too long'),
  body('expectedBehavior').optional().isLength({ max: 1000 }).withMessage('Expected behavior too long'),
  body('actualBehavior').optional().isLength({ max: 1000 }).withMessage('Actual behavior too long'),
  body('additionalComments').optional().isLength({ max: 1000 }).withMessage('Additional comments too long')
];

export const betaUserController = new BetaUserController();